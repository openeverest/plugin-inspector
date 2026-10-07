package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/kubernetes/fake"
)

const validToken = "good-token"

func testPod(name, instanceName string) *corev1.Pod {
	return &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: "db",
			UID:       types.UID(name + "-uid"),
			Labels:    map[string]string{instanceLabel: instanceName, componentLabel: "engine"},
		},
		Spec: corev1.PodSpec{
			NodeName:   "node-a",
			Containers: []corev1.Container{{Name: "mongod"}, {Name: "backup-agent"}},
		},
		Status: corev1.PodStatus{
			Phase: corev1.PodRunning,
			ContainerStatuses: []corev1.ContainerStatus{
				{Name: "mongod", Ready: true, RestartCount: 1, State: corev1.ContainerState{Running: &corev1.ContainerStateRunning{}}},
				{Name: "backup-agent", RestartCount: 2, State: corev1.ContainerState{Waiting: &corev1.ContainerStateWaiting{}}},
			},
		},
	}
}

// everestPod is a pod the provider labelled for the runtime's status.components.
func everestPod(name, instanceName, component string) *corev1.Pod {
	pod := testPod(name, instanceName)
	pod.Labels[everestInstanceLabel] = instanceName
	pod.Labels[everestComponentLabel] = component
	return pod
}

var (
	engineComponent = instanceComponent{Name: "engine", Selector: "core.openeverest.io/component=engine,core.openeverest.io/instance=mydb"}
	proxyComponent  = instanceComponent{Name: "proxy", Selector: "core.openeverest.io/component=proxy,core.openeverest.io/instance=mydb"}
)

// fakeEverest serves GET instance for "db/mydb" with the given status.components
// and rejects any token other than validToken.
func fakeEverest(t *testing.T, components []instanceComponent) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer "+validToken {
			w.WriteHeader(http.StatusForbidden)
			return
		}
		if r.URL.Path != "/v1/clusters/main/namespaces/db/instances/mydb" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status": map[string]any{"components": components},
		})
	}))
	t.Cleanup(srv.Close)
	return srv
}

func newTestMux(t *testing.T, components []instanceComponent, objects ...runtime.Object) *http.ServeMux {
	t.Helper()
	kube := fake.NewClientset(objects...)
	return newMux(&server{kube: kube, everest: newEverestClient(fakeEverest(t, components).URL)})
}

func doRequest(mux *http.ServeMux, path string, query url.Values, token string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, path+"?"+query.Encode(), nil)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	return rec
}

func instanceQuery(extra map[string]string) url.Values {
	q := url.Values{"namespace": {"db"}, "instance": {"mydb"}}
	for k, v := range extra {
		q.Set(k, v)
	}
	return q
}

func decodeComponents(t *testing.T, rec *httptest.ResponseRecorder) []component {
	t.Helper()
	var got []component
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	return got
}

func TestComponentsAuthorization(t *testing.T) {
	mux := newTestMux(t, nil, testPod("mydb-0", "mydb"))

	cases := []struct {
		name   string
		query  url.Values
		token  string
		status int
	}{
		{"missing token", instanceQuery(nil), "", http.StatusUnauthorized},
		{"everest denies", instanceQuery(nil), "other", http.StatusForbidden},
		{"unknown instance", url.Values{"namespace": {"db"}, "instance": {"other"}}, validToken, http.StatusNotFound},
		{"invalid namespace", url.Values{"namespace": {"../x"}, "instance": {"mydb"}}, validToken, http.StatusBadRequest},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := doRequest(mux, "/api/components", tc.query, tc.token)
			if rec.Code != tc.status {
				t.Fatalf("status = %d, want %d", rec.Code, tc.status)
			}
		})
	}
}

func TestComponentsUsesSelectorsWhenReported(t *testing.T) {
	// mydb-9 only carries the operator label, so it belongs to no component.
	mux := newTestMux(t, []instanceComponent{engineComponent, proxyComponent},
		everestPod("mydb-0", "mydb", "engine"), everestPod("mydb-proxy-0", "mydb", "proxy"), testPod("mydb-9", "mydb"))

	rec := doRequest(mux, "/api/components", instanceQuery(nil), validToken)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	got := decodeComponents(t, rec)
	require.Len(t, got, 2)
	assert.Equal(t, "mydb-0", got[0].Name)
	assert.Equal(t, "engine", got[0].Type)
	assert.Equal(t, "1/2", got[0].Ready)
	assert.Equal(t, int32(3), got[0].Restarts)
	assert.Equal(t, "node-a", got[0].NodeName)
	assert.Equal(t, "Running", got[0].Containers[0].Status)
	assert.Equal(t, "Waiting", got[0].Containers[1].Status)
	assert.Equal(t, "mydb-proxy-0", got[1].Name)
	assert.Equal(t, "proxy", got[1].Type)
}

func TestComponentsNarrowsSelectorsToTheInstance(t *testing.T) {
	broad := instanceComponent{Name: "engine", Selector: "core.openeverest.io/component=engine"}
	mux := newTestMux(t, []instanceComponent{broad}, everestPod("mydb-0", "mydb", "engine"), everestPod("other-0", "other", "engine"))

	rec := doRequest(mux, "/api/components", instanceQuery(nil), validToken)

	got := decodeComponents(t, rec)
	require.Len(t, got, 1)
	assert.Equal(t, "mydb-0", got[0].Name)
}

func TestComponentsFallsBackToInstanceLabel(t *testing.T) {
	mux := newTestMux(t, nil, testPod("mydb-1", "mydb"), testPod("mydb-0", "mydb"), testPod("other-0", "other"))

	rec := doRequest(mux, "/api/components", instanceQuery(nil), validToken)
	got := decodeComponents(t, rec)
	if len(got) != 2 || got[0].Name != "mydb-0" || got[1].Name != "mydb-1" {
		t.Fatalf("components = %+v, want sorted mydb-0, mydb-1", got)
	}
}

func TestLogs(t *testing.T) {
	pods := []runtime.Object{testPod("mydb-0", "mydb"), testPod("mydb-1", "mydb"), testPod("other-0", "other"), everestPod("mydb-2", "mydb", "engine")}
	engine := []instanceComponent{engineComponent}

	cases := []struct {
		name       string
		components []instanceComponent
		pod        string
		extra      map[string]string
		status     int
	}{
		{"label fallback", nil, "mydb-0", nil, http.StatusOK},
		{"explicit container", nil, "mydb-0", map[string]string{"container": "backup-agent", "follow": "true"}, http.StatusOK},
		{"pod of another instance", nil, "other-0", nil, http.StatusNotFound},
		{"pod of a component", engine, "mydb-2", nil, http.StatusOK},
		{"labelled pod outside the components", engine, "mydb-1", nil, http.StatusNotFound},
		{"missing pod", nil, "mydb-9", nil, http.StatusNotFound},
		{"unknown container", nil, "mydb-0", map[string]string{"container": "nope"}, http.StatusBadRequest},
		{"tailLines too large", nil, "mydb-0", map[string]string{"tailLines": "10001"}, http.StatusBadRequest},
		{"invalid follow", nil, "mydb-0", map[string]string{"follow": "maybe"}, http.StatusBadRequest},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			mux := newTestMux(t, tc.components, pods...)

			rec := doRequest(mux, "/api/components/"+tc.pod+"/logs", instanceQuery(tc.extra), validToken)

			require.Equal(t, tc.status, rec.Code, rec.Body.String())
			if tc.status == http.StatusOK {
				assert.Equal(t, "text/plain; charset=utf-8", rec.Header().Get("Content-Type"))
			}
		})
	}
}

func TestBuildPodLogOptionsDefaults(t *testing.T) {
	pod := testPod("mydb-0", "mydb")

	opts, err := buildPodLogOptions(url.Values{}, pod)
	if err != nil {
		t.Fatal(err)
	}
	if opts.Container != "mongod" || opts.TailLines == nil || *opts.TailLines != defaultTailLines {
		t.Fatalf("unexpected defaults: %+v", opts)
	}

	opts, err = buildPodLogOptions(url.Values{"follow": {"true"}}, pod)
	if err != nil {
		t.Fatal(err)
	}
	if opts.TailLines != nil {
		t.Fatalf("follow must not default tailLines, got %d", *opts.TailLines)
	}
}
