package main

import (
	"context"
	"fmt"
	"slices"
	"strconv"
	"strings"

	corev1 "k8s.io/api/core/v1"
	discoveryv1 "k8s.io/api/discovery/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/client-go/kubernetes"
)

type servicePort struct {
	Name       string `json:"name,omitempty"`
	Protocol   string `json:"protocol"`
	Port       int32  `json:"port"`
	TargetPort string `json:"targetPort,omitempty"`
	NodePort   int32  `json:"nodePort,omitempty"`
}

// servicePod is an instance pod a Service selects, and whether it is a ready endpoint.
type servicePod struct {
	Name  string `json:"name"`
	Ready bool   `json:"ready"`
}

type service struct {
	Name              string        `json:"name"`
	Type              string        `json:"type"`
	ClusterIP         string        `json:"clusterIP,omitempty"`
	Headless          bool          `json:"headless"`
	ExternalAddresses []string      `json:"externalAddresses"`
	Ports             []servicePort `json:"ports"`
	Pods              []servicePod  `json:"pods"`
}

// instanceServices returns the Services in the namespace that select any of the
// instance's pods, so it works with whatever Services a provider creates.
func instanceServices(ctx context.Context, kube kubernetes.Interface, namespace string, pods []componentPod) ([]service, error) {
	list, err := kube.CoreV1().Services(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("list services: %w", err)
	}

	// Non-nil so an instance without Services yet encodes as [] rather than null.
	res := []service{}
	var readiness map[string]map[string]bool
	for _, svc := range list.Items {
		selected := selectedPods(svc, pods)
		if len(selected) == 0 {
			continue
		}
		if readiness == nil {
			if readiness, err = endpointReadiness(ctx, kube, namespace); err != nil {
				return nil, err
			}
		}
		res = append(res, toService(svc, selected, readiness[svc.Name]))
	}
	slices.SortFunc(res, func(a, b service) int { return strings.Compare(a.Name, b.Name) })
	return res, nil
}

// selectedPods returns the names of the pods a Service's selector matches. A
// Service without a selector has hand-managed endpoints and selects no pods.
func selectedPods(svc corev1.Service, pods []componentPod) []string {
	if len(svc.Spec.Selector) == 0 {
		return nil
	}
	selector := labels.SelectorFromSet(svc.Spec.Selector)
	var names []string
	for _, p := range pods {
		if selector.Matches(labels.Set(p.pod.Labels)) {
			names = append(names, p.pod.Name)
		}
	}
	return names
}

// endpointReadiness maps each Service to the pods behind its endpoints and
// whether they are ready. A Service can span several EndpointSlices.
func endpointReadiness(ctx context.Context, kube kubernetes.Interface, namespace string) (map[string]map[string]bool, error) {
	list, err := kube.DiscoveryV1().EndpointSlices(namespace).List(ctx, metav1.ListOptions{LabelSelector: discoveryv1.LabelServiceName})
	if err != nil {
		return nil, fmt.Errorf("list endpointslices: %w", err)
	}

	res := make(map[string]map[string]bool)
	for _, slice := range list.Items {
		name := slice.Labels[discoveryv1.LabelServiceName]
		if res[name] == nil {
			res[name] = make(map[string]bool)
		}
		for _, ep := range slice.Endpoints {
			if ep.TargetRef == nil || ep.TargetRef.Kind != "Pod" {
				continue
			}
			// A nil ready condition means unknown, which the API says to treat as ready.
			ready := ep.Conditions.Ready == nil || *ep.Conditions.Ready
			res[name][ep.TargetRef.Name] = res[name][ep.TargetRef.Name] || ready
		}
	}
	return res, nil
}

func toService(svc corev1.Service, selected []string, ready map[string]bool) service {
	headless := svc.Spec.ClusterIP == corev1.ClusterIPNone
	res := service{
		Name:              svc.Name,
		Type:              string(svc.Spec.Type),
		Headless:          headless,
		ExternalAddresses: externalAddresses(svc),
		Ports:             make([]servicePort, 0, len(svc.Spec.Ports)),
		Pods:              make([]servicePod, 0, len(selected)),
	}
	if !headless {
		res.ClusterIP = svc.Spec.ClusterIP
	}
	for _, p := range svc.Spec.Ports {
		port := servicePort{Name: p.Name, Protocol: string(p.Protocol), Port: p.Port, NodePort: p.NodePort}
		if p.TargetPort.String() != "0" && p.TargetPort.String() != strconv.Itoa(int(p.Port)) {
			port.TargetPort = p.TargetPort.String()
		}
		res.Ports = append(res.Ports, port)
	}
	for _, name := range selected {
		res.Pods = append(res.Pods, servicePod{Name: name, Ready: ready[name]})
	}
	return res
}

func externalAddresses(svc corev1.Service) []string {
	addresses := append([]string{}, svc.Spec.ExternalIPs...)
	for _, ingress := range svc.Status.LoadBalancer.Ingress {
		if ingress.Hostname != "" {
			addresses = append(addresses, ingress.Hostname)
		} else if ingress.IP != "" {
			addresses = append(addresses, ingress.IP)
		}
	}
	return addresses
}
