package main

import (
	"encoding/json"
	"net/http"
	"testing"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
)

func pendingPod() *corev1.Pod {
	pod := testPod("mydb-2", "mydb")
	pod.Status = corev1.PodStatus{
		Phase: corev1.PodPending,
		Conditions: []corev1.PodCondition{{
			Type:    corev1.PodScheduled,
			Status:  corev1.ConditionFalse,
			Reason:  "Unschedulable",
			Message: "0/3 nodes are available: 3 Insufficient memory.",
		}},
	}
	pod.Spec.Containers[0].Resources.Requests = corev1.ResourceList{corev1.ResourceMemory: resource.MustParse("64Gi")}
	return pod
}

func podEventFor(name string, uid types.UID, reason string, last time.Time) *corev1.Event {
	return &corev1.Event{
		ObjectMeta:     metav1.ObjectMeta{Name: name + "." + reason, Namespace: "db"},
		InvolvedObject: corev1.ObjectReference{Kind: "Pod", Name: name, UID: uid},
		Type:           corev1.EventTypeWarning,
		Reason:         reason,
		Message:        reason + " happened",
		Count:          3,
		LastTimestamp:  metav1.NewTime(last),
		Source:         corev1.EventSource{Component: "default-scheduler"},
	}
}

func TestDescribePendingPod(t *testing.T) {
	now := time.Now()
	mux := newTestMux(t, nil,
		pendingPod(),
		testPod("mydb-0", "mydb"),
		podEventFor("mydb-2", "mydb-2-uid", "FailedScheduling", now),
		podEventFor("mydb-2", "mydb-2-uid", "Pulling", now.Add(-time.Minute)),
		podEventFor("mydb-2", "old-uid", "Killing", now),
		podEventFor("mydb-0", "mydb-0-uid", "Started", now),
	)

	rec := doRequest(mux, "/api/components/mydb-2/describe", instanceQuery(nil), validToken)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d: %s", rec.Code, rec.Body)
	}
	var got podDescription
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatal(err)
	}

	if got.Reason != "Unschedulable" || len(got.Conditions) != 1 || got.Conditions[0].Message == "" {
		t.Fatalf("scheduling failure not surfaced: %+v", got)
	}
	if len(got.Containers) != 2 || got.Containers[0].Requests["memory"] != "64Gi" {
		t.Fatalf("containers must come from the spec when no status exists yet: %+v", got.Containers)
	}
	if got.Containers[0].State.Status != "Waiting" {
		t.Fatalf("uncreated container state = %q, want Waiting", got.Containers[0].State.Status)
	}
	if len(got.Events) != 2 || got.Events[0].Reason != "Pulling" || got.Events[1].Reason != "FailedScheduling" {
		t.Fatalf("events must be this pod's (by UID), oldest first: %+v", got.Events)
	}
	if got.Events[1].Count != 3 || got.Events[1].Source != "default-scheduler" {
		t.Fatalf("unexpected event mapping: %+v", got.Events[1])
	}
}

func TestDescribeRejectsForeignPod(t *testing.T) {
	mux := newTestMux(t, nil, testPod("other-0", "other"))

	rec := doRequest(mux, "/api/components/other-0/describe", instanceQuery(nil), validToken)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
}

func TestComponentReasons(t *testing.T) {
	crashing := testPod("mydb-0", "mydb")
	crashing.Status.ContainerStatuses[1].State = corev1.ContainerState{
		Waiting: &corev1.ContainerStateWaiting{Reason: "CrashLoopBackOff"},
	}

	cases := []struct {
		name string
		pod  *corev1.Pod
		want string
	}{
		{"unschedulable", pendingPod(), "Unschedulable"},
		{"stuck container", crashing, "CrashLoopBackOff"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := toComponent(*tc.pod).Reason; got != tc.want {
				t.Fatalf("reason = %q, want %q", got, tc.want)
			}
		})
	}
	if got := toComponent(*crashing).Containers[1].Reason; got != "CrashLoopBackOff" {
		t.Fatalf("container reason = %q", got)
	}
}
