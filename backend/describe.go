package main

import (
	"context"
	"fmt"
	"slices"
	"strings"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/client-go/kubernetes"
)

// podDescription is a curated `kubectl describe pod`. The raw spec is not exposed:
// env values and args may carry credentials the caller isn't allowed to read.
type podDescription struct {
	Name           string                 `json:"name"`
	Namespace      string                 `json:"namespace"`
	Phase          string                 `json:"phase"`
	Reason         string                 `json:"reason,omitempty"`
	Message        string                 `json:"message,omitempty"`
	NodeName       string                 `json:"nodeName,omitempty"`
	PodIP          string                 `json:"podIP,omitempty"`
	QOSClass       string                 `json:"qosClass,omitempty"`
	Started        string                 `json:"started,omitempty"`
	Conditions     []podCondition         `json:"conditions"`
	InitContainers []containerDescription `json:"initContainers"`
	Containers     []containerDescription `json:"containers"`
	Events         []podEvent             `json:"events"`
}

type podCondition struct {
	Type               string `json:"type"`
	Status             string `json:"status"`
	Reason             string `json:"reason,omitempty"`
	Message            string `json:"message,omitempty"`
	LastTransitionTime string `json:"lastTransitionTime,omitempty"`
}

type containerState struct {
	Status   string `json:"status"`
	Reason   string `json:"reason,omitempty"`
	Message  string `json:"message,omitempty"`
	ExitCode *int32 `json:"exitCode,omitempty"`
	Started  string `json:"started,omitempty"`
	Finished string `json:"finished,omitempty"`
}

type containerDescription struct {
	Name            string            `json:"name"`
	Image           string            `json:"image"`
	Ready           bool              `json:"ready"`
	Restarts        int32             `json:"restarts"`
	State           containerState    `json:"state"`
	LastTermination *containerState   `json:"lastTermination,omitempty"`
	Requests        map[string]string `json:"requests,omitempty"`
	Limits          map[string]string `json:"limits,omitempty"`
}

type podEvent struct {
	Type      string `json:"type"`
	Reason    string `json:"reason"`
	Message   string `json:"message"`
	Count     int32  `json:"count"`
	FirstSeen string `json:"firstSeen,omitempty"`
	LastSeen  string `json:"lastSeen,omitempty"`
	Source    string `json:"source,omitempty"`
}

func describePod(ctx context.Context, kube kubernetes.Interface, pod *corev1.Pod) (*podDescription, error) {
	events, err := podEvents(ctx, kube, pod)
	if err != nil {
		return nil, err
	}

	d := &podDescription{
		Name:           pod.Name,
		Namespace:      pod.Namespace,
		Phase:          string(pod.Status.Phase),
		Reason:         podReason(*pod),
		Message:        pod.Status.Message,
		NodeName:       pod.Spec.NodeName,
		PodIP:          pod.Status.PodIP,
		QOSClass:       string(pod.Status.QOSClass),
		Conditions:     make([]podCondition, 0, len(pod.Status.Conditions)),
		InitContainers: describeContainers(pod.Spec.InitContainers, pod.Status.InitContainerStatuses),
		Containers:     describeContainers(pod.Spec.Containers, pod.Status.ContainerStatuses),
		Events:         events,
	}
	if pod.Status.StartTime != nil {
		d.Started = formatTime(*pod.Status.StartTime)
	}
	for _, c := range pod.Status.Conditions {
		d.Conditions = append(d.Conditions, podCondition{
			Type:               string(c.Type),
			Status:             string(c.Status),
			Reason:             c.Reason,
			Message:            c.Message,
			LastTransitionTime: formatTime(c.LastTransitionTime),
		})
	}
	return d, nil
}

func describeContainers(specs []corev1.Container, statuses []corev1.ContainerStatus) []containerDescription {
	res := make([]containerDescription, 0, len(specs))
	for _, spec := range specs {
		d := containerDescription{
			Name:     spec.Name,
			Image:    spec.Image,
			Requests: quantities(spec.Resources.Requests),
			Limits:   quantities(spec.Resources.Limits),
			// Until the kubelet reports a status the container hasn't been created.
			State: containerState{Status: "Waiting"},
		}
		if i := slices.IndexFunc(statuses, func(s corev1.ContainerStatus) bool { return s.Name == spec.Name }); i >= 0 {
			status := statuses[i]
			d.Ready = status.Ready
			d.Restarts = status.RestartCount
			d.State = describeState(status.State)
			if status.LastTerminationState.Terminated != nil {
				last := describeState(status.LastTerminationState)
				d.LastTermination = &last
			}
		}
		res = append(res, d)
	}
	return res
}

func describeState(s corev1.ContainerState) containerState {
	switch {
	case s.Running != nil:
		return containerState{Status: "Running", Started: formatTime(s.Running.StartedAt)}
	case s.Terminated != nil:
		t := s.Terminated
		exitCode := t.ExitCode
		return containerState{
			Status:   "Terminated",
			Reason:   t.Reason,
			Message:  t.Message,
			ExitCode: &exitCode,
			Started:  formatTime(t.StartedAt),
			Finished: formatTime(t.FinishedAt),
		}
	case s.Waiting != nil:
		return containerState{Status: "Waiting", Reason: s.Waiting.Reason, Message: s.Waiting.Message}
	default:
		return containerState{Status: "Waiting"}
	}
}

func quantities(list corev1.ResourceList) map[string]string {
	if len(list) == 0 {
		return nil
	}
	res := make(map[string]string, len(list))
	for name, q := range list {
		res[string(name)] = q.String()
	}
	return res
}

// podEvents mirrors kubectl describe: events for this exact pod (UID), oldest first.
func podEvents(ctx context.Context, kube kubernetes.Interface, pod *corev1.Pod) ([]podEvent, error) {
	list, err := kube.CoreV1().Events(pod.Namespace).List(ctx, metav1.ListOptions{
		FieldSelector: fields.Set{
			"involvedObject.kind": "Pod",
			"involvedObject.name": pod.Name,
		}.String(),
	})
	if err != nil {
		return nil, fmt.Errorf("list events: %w", err)
	}

	items := make([]corev1.Event, 0, len(list.Items))
	for _, e := range list.Items {
		if e.InvolvedObject.Kind != "Pod" || e.InvolvedObject.Name != pod.Name {
			continue
		}
		// A recreated StatefulSet pod reuses its name; skip its predecessor's events.
		if e.InvolvedObject.UID != "" && e.InvolvedObject.UID != pod.UID {
			continue
		}
		items = append(items, e)
	}
	slices.SortStableFunc(items, func(a, b corev1.Event) int {
		return strings.Compare(eventLastSeen(a), eventLastSeen(b))
	})

	res := make([]podEvent, 0, len(items))
	for _, e := range items {
		res = append(res, podEvent{
			Type:      e.Type,
			Reason:    e.Reason,
			Message:   e.Message,
			Count:     eventCount(e),
			FirstSeen: eventFirstSeen(e),
			LastSeen:  eventLastSeen(e),
			Source:    eventSource(e),
		})
	}
	return res, nil
}

// Events from the events.k8s.io API only set EventTime/Series, the legacy ones
// only First/LastTimestamp and Count.
func eventFirstSeen(e corev1.Event) string {
	if !e.FirstTimestamp.IsZero() {
		return formatTime(e.FirstTimestamp)
	}
	return formatMicroTime(e.EventTime)
}

func eventLastSeen(e corev1.Event) string {
	if e.Series != nil && !e.Series.LastObservedTime.IsZero() {
		return formatMicroTime(e.Series.LastObservedTime)
	}
	if !e.LastTimestamp.IsZero() {
		return formatTime(e.LastTimestamp)
	}
	return eventFirstSeen(e)
}

func eventCount(e corev1.Event) int32 {
	if e.Series != nil {
		return e.Series.Count
	}
	return max(e.Count, 1)
}

func eventSource(e corev1.Event) string {
	if e.ReportingController != "" {
		return e.ReportingController
	}
	return e.Source.Component
}

func formatMicroTime(t metav1.MicroTime) string {
	if t.IsZero() {
		return ""
	}
	return formatTime(metav1.NewTime(t.Time))
}
