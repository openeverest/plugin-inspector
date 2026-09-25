package main

import (
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

// dist/main.js is copied from the frontend build during the Docker build.
//
//go:embed dist/main.js
var distFS embed.FS

var (
	bundleData    []byte
	bundleDataErr error
	bundleETag    string
	bundleOnce    sync.Once
)

func loadBundle() {
	bundleData, bundleDataErr = distFS.ReadFile("dist/main.js")
	if bundleDataErr == nil {
		sum := sha256.Sum256(bundleData)
		bundleETag = `"` + hex.EncodeToString(sum[:]) + `"`
	}
}

// GET /main.js — stable URL, so revalidate via a content ETag instead of a hashed filename.
func handleBundle(w http.ResponseWriter, r *http.Request) {
	bundleOnce.Do(loadBundle)
	if bundleDataErr != nil {
		http.Error(w, "bundle not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/javascript")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("ETag", bundleETag)
	if r.Header.Get("If-None-Match") == bundleETag {
		w.WriteHeader(http.StatusNotModified)
		return
	}
	_, _ = w.Write(bundleData)
}

func handleHealthz(w http.ResponseWriter, _ *http.Request) {
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
}

func kubeConfig() (*rest.Config, error) {
	if cfg, err := rest.InClusterConfig(); err == nil {
		return cfg, nil
	}
	// Local development outside the cluster.
	rules := clientcmd.NewDefaultClientConfigLoadingRules()
	return clientcmd.NewNonInteractiveDeferredLoadingClientConfig(rules, &clientcmd.ConfigOverrides{}).ClientConfig()
}

func newMux(s *server) *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /main.js", handleBundle)
	mux.HandleFunc("GET /healthz", handleHealthz)
	mux.HandleFunc("GET /api/components", s.handleComponents)
	mux.HandleFunc("GET /api/components/{pod}/logs", s.handleLogs)
	return mux
}

func listenPort() string {
	if p := os.Getenv("PORT"); p != "" {
		return p
	}
	return "8080"
}

func main() {
	cfg, err := kubeConfig()
	if err != nil {
		log.Fatalf("kubernetes config: %v", err)
	}
	kube, err := kubernetes.NewForConfig(cfg)
	if err != nil {
		log.Fatalf("kubernetes client: %v", err)
	}

	s := &server{kube: kube, everest: newEverestClient(everestAPIURL())}
	srv := &http.Server{
		Addr:              ":" + listenPort(),
		Handler:           newMux(s),
		ReadHeaderTimeout: 5 * time.Second,
		// No WriteTimeout: followed log streams are long-lived.
		IdleTimeout: 120 * time.Second,
	}

	log.Printf("plugin-inspector backend listening on %s (everest API: %s)", srv.Addr, s.everest.baseURL)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal(fmt.Errorf("server error: %w", err))
	}
}
