package main

import (
	"context"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/client-go/kubernetes"
)

const (
	instanceLabel  = "app.kubernetes.io/instance"
	componentLabel = "app.kubernetes.io/component"
)

var errPodNotInInstance = &statusError{status: http.StatusNotFound, message: "pod not found in instance"}

type container struct {
	Name     string `json:"name"`
	Started  string `json:"started,omitempty"`
	Ready    bool   `json:"ready"`
	Restarts int32  `json:"restarts"`
	Status   string `json:"status"`
	Reason   string `json:"reason,omitempty"`
}

type component struct {
	Name       string      `json:"name"`
	Type       string      `json:"type"`
	Status     string      `json:"status"`
	Reason     string      `json:"reason,omitempty"`
	NodeName   string      `json:"nodeName,omitempty"`
	Started    string      `json:"started,omitempty"`
	Restarts   int32       `json:"restarts"`
	Ready      string      `json:"ready"`
	Containers []container `json:"containers"`
}

// instancePods returns the pods backing an instance. Providers that report
// status.components[].podRefs are authoritative; otherwise fall back to the
// conventional operator label.
func instancePods(ctx context.Context, kube kubernetes.Interface, namespace, name string, in *instance) ([]corev1.Pod, error) {
	refs := in.podRefNames()
	if len(refs) == 0 {
		list, err := kube.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{
			LabelSelector: labels.SelectorFromSet(labels.Set{instanceLabel: name}).String(),
		})
		if err != nil {
			return nil, fmt.Errorf("list pods: %w", err)
		}
		return list.Items, nil
	}

	pods := make([]corev1.Pod, 0, len(refs))
	for _, ref := range refs {
		pod, err := kube.CoreV1().Pods(namespace).Get(ctx, ref, metav1.GetOptions{})
		if apierrors.IsNotFound(err) {
			continue
		}
		if err != nil {
			return nil, fmt.Errorf("get pod %s: %w", ref, err)
		}
		pods = append(pods, *pod)
	}
	return pods, nil
}

// instancePod returns a single pod, but only if it belongs to the instance, so a
// caller who can read one instance can't read logs of other pods in the namespace.
func instancePod(ctx context.Context, kube kubernetes.Interface, namespace, name, podName string, in *instance) (*corev1.Pod, error) {
	refs := in.podRefNames()
	if len(refs) > 0 && !slices.Contains(refs, podName) {
		return nil, errPodNotInInstance
	}
	pod, err := kube.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		return nil, errPodNotInInstance
	}
	if err != nil {
		return nil, fmt.Errorf("get pod %s: %w", podName, err)
	}
	if len(refs) == 0 && pod.Labels[instanceLabel] != name {
		return nil, errPodNotInInstance
	}
	return pod, nil
}

func toComponents(pods []corev1.Pod) []component {
	res := make([]component, 0, len(pods))
	for _, pod := range pods {
		res = append(res, toComponent(pod))
	}
	slices.SortFunc(res, func(a, b component) int { return strings.Compare(a.Name, b.Name) })
	return res
}

func toComponent(pod corev1.Pod) component {
	var restarts int32
	ready := 0
	containers := make([]container, 0, len(pod.Status.ContainerStatuses))
	for _, cs := range pod.Status.ContainerStatuses {
		restarts += cs.RestartCount
		if cs.Ready {
			ready++
		}
		c := container{Name: cs.Name, Ready: cs.Ready, Restarts: cs.RestartCount}
		switch {
		case cs.State.Running != nil:
			c.Status = "Running"
			c.Started = formatTime(cs.State.Running.StartedAt)
		case cs.State.Waiting != nil:
			c.Status = "Waiting"
			c.Reason = cs.State.Waiting.Reason
		case cs.State.Terminated != nil:
			c.Status = "Terminated"
			c.Reason = cs.State.Terminated.Reason
		}
		containers = append(containers, c)
	}

	comp := component{
		Name:       pod.Name,
		Type:       pod.Labels[componentLabel],
		Status:     string(pod.Status.Phase),
		Reason:     podReason(pod),
		NodeName:   pod.Spec.NodeName,
		Restarts:   restarts,
		Ready:      fmt.Sprintf("%d/%d", ready, len(pod.Status.ContainerStatuses)),
		Containers: containers,
	}
	if pod.Status.StartTime != nil {
		comp.Started = formatTime(*pod.Status.StartTime)
	}
	return comp
}

// podReason is the one-word "why" kubectl shows in its STATUS column: an explicit
// pod reason (e.g. Evicted), an unschedulable pod, or the first stuck container.
func podReason(pod corev1.Pod) string {
	if pod.Status.Reason != "" {
		return pod.Status.Reason
	}
	for _, cond := range pod.Status.Conditions {
		if cond.Type == corev1.PodScheduled && cond.Status == corev1.ConditionFalse && cond.Reason != "" {
			return cond.Reason
		}
	}
	for _, cs := range slices.Concat(pod.Status.InitContainerStatuses, pod.Status.ContainerStatuses) {
		if cs.State.Waiting != nil && cs.State.Waiting.Reason != "" {
			return cs.State.Waiting.Reason
		}
	}
	return ""
}

func formatTime(t metav1.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.UTC().Format(time.RFC3339)
}
