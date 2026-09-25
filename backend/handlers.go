package main

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	"k8s.io/apimachinery/pkg/util/validation"
	"k8s.io/client-go/kubernetes"
)

const defaultK8sCluster = "main"

type server struct {
	kube    kubernetes.Interface
	everest *everestClient
}

type instanceRef struct {
	k8sCluster string
	namespace  string
	name       string
}

// userToken returns the caller's token. X-Everest-User is the spec'd header;
// until the host sets it, the proxy forwards the user's Authorization header.
func userToken(r *http.Request) (string, error) {
	if v := r.Header.Get("X-Everest-User"); v != "" {
		return v, nil
	}
	if token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer "); ok && token != "" {
		return token, nil
	}
	return "", &statusError{status: http.StatusUnauthorized, message: "missing auth token"}
}

func parseInstanceRef(r *http.Request) (instanceRef, error) {
	q := r.URL.Query()
	ref := instanceRef{
		k8sCluster: q.Get("k8sCluster"),
		namespace:  q.Get("namespace"),
		name:       q.Get("instance"),
	}
	if ref.k8sCluster == "" {
		ref.k8sCluster = defaultK8sCluster
	}
	if len(validation.IsDNS1123Subdomain(ref.k8sCluster)) > 0 {
		return ref, badRequest("invalid k8sCluster")
	}
	if len(validation.IsDNS1123Label(ref.namespace)) > 0 {
		return ref, badRequest("invalid namespace")
	}
	if len(validation.IsDNS1123Subdomain(ref.name)) > 0 {
		return ref, badRequest("invalid instance")
	}
	return ref, nil
}

// authorize resolves the target instance as the calling user.
func (s *server) authorize(r *http.Request) (instanceRef, *instance, error) {
	token, err := userToken(r)
	if err != nil {
		return instanceRef{}, nil, err
	}
	ref, err := parseInstanceRef(r)
	if err != nil {
		return ref, nil, err
	}
	in, err := s.everest.getInstance(r.Context(), token, ref)
	if err != nil {
		return ref, nil, err
	}
	return ref, in, nil
}

// GET /api/components?k8sCluster=&namespace=&instance=
func (s *server) handleComponents(w http.ResponseWriter, r *http.Request) {
	ref, in, err := s.authorize(r)
	if err != nil {
		writeError(w, err)
		return
	}
	pods, err := instancePods(r.Context(), s.kube, ref.namespace, ref.name, in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, toComponents(pods))
}

// GET /api/components/{pod}/logs?k8sCluster=&namespace=&instance=&container=&follow=&previous=&tailLines=
func (s *server) handleLogs(w http.ResponseWriter, r *http.Request) {
	podName := r.PathValue("pod")
	if len(validation.IsDNS1123Subdomain(podName)) > 0 {
		writeError(w, badRequest("invalid pod"))
		return
	}
	ref, in, err := s.authorize(r)
	if err != nil {
		writeError(w, err)
		return
	}
	pod, err := instancePod(r.Context(), s.kube, ref.namespace, ref.name, podName, in)
	if err != nil {
		writeError(w, err)
		return
	}
	opts, err := buildPodLogOptions(r.URL.Query(), pod)
	if err != nil {
		writeError(w, err)
		return
	}
	stream, err := s.kube.CoreV1().Pods(ref.namespace).GetLogs(pod.Name, opts).Stream(r.Context())
	if err != nil {
		log.Printf("open log stream %s/%s: %v", ref.namespace, pod.Name, err)
		writeError(w, &statusError{status: http.StatusBadGateway, message: "failed to open log stream"})
		return
	}
	defer stream.Close()
	streamToResponse(r.Context(), w, stream)
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("writeJSON error: %v", err)
	}
}

func writeError(w http.ResponseWriter, err error) {
	status := http.StatusInternalServerError
	msg := "internal error"
	var se *statusError
	if errors.As(err, &se) {
		status, msg = se.status, se.message
	} else {
		log.Printf("request failed: %v", err)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
