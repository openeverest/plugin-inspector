package main

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	discoveryv1 "k8s.io/api/discovery/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/utils/ptr"
)

func testService(name string, selector map[string]string, mutate func(*corev1.Service)) *corev1.Service {
	svc := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: "db"},
		Spec: corev1.ServiceSpec{
			Type:      corev1.ServiceTypeClusterIP,
			ClusterIP: "10.0.0.1",
			Selector:  selector,
			Ports:     []corev1.ServicePort{{Protocol: corev1.ProtocolTCP, Port: 27017, TargetPort: intstr.FromInt32(27017)}},
		},
	}
	if mutate != nil {
		mutate(svc)
	}
	return svc
}

func testEndpointSlice(service string, ready map[string]*bool) *discoveryv1.EndpointSlice {
	slice := &discoveryv1.EndpointSlice{
		ObjectMeta: metav1.ObjectMeta{
			Name:      service + "-abc",
			Namespace: "db",
			Labels:    map[string]string{discoveryv1.LabelServiceName: service},
		},
	}
	for pod, r := range ready {
		slice.Endpoints = append(slice.Endpoints, discoveryv1.Endpoint{
			Conditions: discoveryv1.EndpointConditions{Ready: r},
			TargetRef:  &corev1.ObjectReference{Kind: "Pod", Name: pod},
		})
	}
	return slice
}

func decodeServices(t *testing.T, body []byte) []service {
	t.Helper()
	var got []service
	require.NoError(t, json.Unmarshal(body, &got))
	return got
}

func TestServices(t *testing.T) {
	proxyPods := map[string]string{everestComponentLabel: "proxy"}
	mux := newTestMux(t, []instanceComponent{engineComponent, proxyComponent},
		everestPod("mydb-0", "mydb", "engine"),
		everestPod("mydb-proxy-0", "mydb", "proxy"),
		everestPod("mydb-proxy-1", "mydb", "proxy"),
		everestPod("other-proxy-0", "other", "proxy"),
		testService("mydb-proxy", proxyPods, func(s *corev1.Service) {
			s.Spec.Ports[0].TargetPort = intstr.FromString("mongos")
		}),
		testService("mydb-rs", map[string]string{everestComponentLabel: "engine"}, func(s *corev1.Service) {
			s.Spec.ClusterIP = corev1.ClusterIPNone
		}),
		testService("mydb-external", proxyPods, func(s *corev1.Service) {
			s.Spec.Type = corev1.ServiceTypeLoadBalancer
			s.Status.LoadBalancer.Ingress = []corev1.LoadBalancerIngress{{Hostname: "db.example.com"}}
		}),
		testService("unrelated", map[string]string{"app": "web"}, nil),
		testService("manual-endpoints", nil, nil),
		testEndpointSlice("mydb-proxy", map[string]*bool{"mydb-proxy-0": ptr.To(true), "mydb-proxy-1": ptr.To(false)}),
		testEndpointSlice("mydb-rs", map[string]*bool{"mydb-0": nil}),
	)

	rec := doRequest(mux, "/api/services", instanceQuery(nil), validToken)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	got := decodeServices(t, rec.Body.Bytes())
	require.Len(t, got, 3, "only Services selecting the instance's pods")

	external, proxy, rs := got[0], got[1], got[2]
	assert.Equal(t, "mydb-external", external.Name)
	assert.Equal(t, "LoadBalancer", external.Type)
	assert.Equal(t, []string{"db.example.com"}, external.ExternalAddresses)
	assert.Equal(t, []servicePod{{Name: "mydb-proxy-0"}, {Name: "mydb-proxy-1"}}, external.Pods, "no endpoints yet")

	assert.Equal(t, "mydb-proxy", proxy.Name)
	assert.Equal(t, "10.0.0.1", proxy.ClusterIP)
	assert.False(t, proxy.Headless)
	assert.Empty(t, proxy.ExternalAddresses)
	assert.Equal(t, []servicePort{{Protocol: "TCP", Port: 27017, TargetPort: "mongos"}}, proxy.Ports)
	assert.Equal(t, []servicePod{{Name: "mydb-proxy-0", Ready: true}, {Name: "mydb-proxy-1", Ready: false}}, proxy.Pods,
		"selects only this instance's pods")

	assert.Equal(t, "mydb-rs", rs.Name)
	assert.True(t, rs.Headless)
	assert.Empty(t, rs.ClusterIP)
	assert.Equal(t, []servicePort{{Protocol: "TCP", Port: 27017}}, rs.Ports, "target port equal to the port is omitted")
	assert.Equal(t, []servicePod{{Name: "mydb-0", Ready: true}}, rs.Pods, "unknown readiness counts as ready")
}

func TestServicesReturnsEmptyListBeforeAnyServiceExists(t *testing.T) {
	mux := newTestMux(t, []instanceComponent{engineComponent}, everestPod("mydb-0", "mydb", "engine"))

	rec := doRequest(mux, "/api/services", instanceQuery(nil), validToken)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	assert.JSONEq(t, "[]", rec.Body.String())
}

func TestServicesRequiresAuthorization(t *testing.T) {
	mux := newTestMux(t, nil, testPod("mydb-0", "mydb"))

	rec := doRequest(mux, "/api/services", instanceQuery(nil), "")

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}
