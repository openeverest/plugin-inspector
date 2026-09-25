package main

import (
	"context"
	"errors"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"

	corev1 "k8s.io/api/core/v1"
)

const (
	defaultTailLines int64 = 200
	maxTailLines     int64 = 10000
	logReadBuffer          = 32 * 1024
)

func badRequest(msg string) error {
	return &statusError{status: http.StatusBadRequest, message: msg}
}

func buildPodLogOptions(q url.Values, pod *corev1.Pod) (*corev1.PodLogOptions, error) {
	opts := &corev1.PodLogOptions{}

	containerName := q.Get("container")
	if containerName == "" {
		if len(pod.Spec.Containers) == 0 {
			return nil, badRequest("pod has no containers")
		}
		containerName = pod.Spec.Containers[0].Name
	} else if !hasContainer(pod, containerName) {
		return nil, badRequest("unknown container")
	}
	opts.Container = containerName

	var err error
	if opts.Follow, err = parseBool(q, "follow"); err != nil {
		return nil, err
	}
	if opts.Previous, err = parseBool(q, "previous"); err != nil {
		return nil, err
	}

	if raw := q.Get("tailLines"); raw != "" {
		n, err := strconv.ParseInt(raw, 10, 64)
		if err != nil || n < 1 || n > maxTailLines {
			return nil, badRequest("tailLines must be between 1 and 10000")
		}
		opts.TailLines = &n
	} else if !opts.Follow {
		n := defaultTailLines
		opts.TailLines = &n
	}

	return opts, nil
}

func hasContainer(pod *corev1.Pod, name string) bool {
	for _, c := range pod.Spec.Containers {
		if c.Name == name {
			return true
		}
	}
	for _, c := range pod.Spec.InitContainers {
		if c.Name == name {
			return true
		}
	}
	return false
}

func parseBool(q url.Values, key string) (bool, error) {
	raw := q.Get(key)
	if raw == "" {
		return false, nil
	}
	v, err := strconv.ParseBool(raw)
	if err != nil {
		return false, badRequest(key + " must be a boolean")
	}
	return v, nil
}

// streamToResponse copies the log stream to the client, flushing every chunk so
// followed logs show up immediately through the host reverse proxy.
func streamToResponse(ctx context.Context, w http.ResponseWriter, stream io.Reader) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusOK)

	rc := http.NewResponseController(w)
	buf := make([]byte, logReadBuffer)
	for ctx.Err() == nil {
		n, err := stream.Read(buf)
		if n > 0 {
			if _, werr := w.Write(buf[:n]); werr != nil {
				return
			}
			_ = rc.Flush()
		}
		if err != nil {
			if !errors.Is(err, io.EOF) && ctx.Err() == nil {
				log.Printf("log stream read error: %v", err)
			}
			return
		}
	}
}
