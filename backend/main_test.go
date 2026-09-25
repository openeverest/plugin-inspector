package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

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

// fakeEverest serves GET instance for "db/mydb" with the given podRefs and
// rejects any token other than validToken.
func fakeEverest(t *testing.T, podRefs []string) *httptest.Server {
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
		refs := make([]map[string]string, 0, len(podRefs))
		for _, name := range podRefs {
			refs = append(refs, map[string]string{"name": name})
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status": map[string]any{"components": []map[string]any{{"podRefs": refs}}},
		})
	}))
	t.Cleanup(srv.Close)
	return srv
}

func newTestMux(t *testing.T, podRefs []string, objects ...runtime.Object) *http.ServeMux {
	t.Helper()
	kube := fake.NewClientset(objects...)
	return newMux(&server{kube: kube, everest: newEverestClient(fakeEverest(t, podRefs).URL)})
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

func TestComponentsUsesPodRefsWhenReported(t *testing.T) {
	// mydb-1 carries the instance label but isn't in podRefs, so it must be ignored.
	mux := newTestMux(t, []string{"mydb-0", "gone-0"}, testPod("mydb-0", "mydb"), testPod("mydb-1", "mydb"))

	rec := doRequest(mux, "/api/components", instanceQuery(nil), validToken)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d: %s", rec.Code, rec.Body)
	}
	got := decodeComponents(t, rec)
	if len(got) != 1 || got[0].Name != "mydb-0" {
		t.Fatalf("components = %+v, want only mydb-0", got)
	}
	c := got[0]
	if c.Ready != "1/2" || c.Restarts != 3 || c.Type != "engine" || c.NodeName != "node-a" {
		t.Fatalf("unexpected mapping: %+v", c)
	}
	if c.Containers[0].Status != "Running" || c.Containers[1].Status != "Waiting" {
		t.Fatalf("unexpected container statuses: %+v", c.Containers)
	}
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
	pods := []runtime.Object{testPod("mydb-0", "mydb"), testPod("mydb-1", "mydb"), testPod("other-0", "other")}

	cases := []struct {
		name    string
		podRefs []string
		pod     string
		extra   map[string]string
		status  int
	}{
		{"label fallback", nil, "mydb-0", nil, http.StatusOK},
		{"explicit container", nil, "mydb-0", map[string]string{"container": "backup-agent", "follow": "true"}, http.StatusOK},
		{"pod of another instance", nil, "other-0", nil, http.StatusNotFound},
		{"labelled pod outside podRefs", []string{"mydb-0"}, "mydb-1", nil, http.StatusNotFound},
		{"missing pod", nil, "mydb-9", nil, http.StatusNotFound},
		{"unknown container", nil, "mydb-0", map[string]string{"container": "nope"}, http.StatusBadRequest},
		{"tailLines too large", nil, "mydb-0", map[string]string{"tailLines": "10001"}, http.StatusBadRequest},
		{"invalid follow", nil, "mydb-0", map[string]string{"follow": "maybe"}, http.StatusBadRequest},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			mux := newTestMux(t, tc.podRefs, pods...)
			rec := doRequest(mux, "/api/components/"+tc.pod+"/logs", instanceQuery(tc.extra), validToken)
			if rec.Code != tc.status {
				t.Fatalf("status = %d, want %d: %s", rec.Code, tc.status, rec.Body)
			}
			if tc.status == http.StatusOK && rec.Header().Get("Content-Type") != "text/plain; charset=utf-8" {
				t.Fatalf("content type = %q", rec.Header().Get("Content-Type"))
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
