# OpenEverest Inspector Plugin

A generic plugin for [OpenEverest](https://github.com/openeverest/openeverest) that adds an
**Inspector** tab to database cluster detail pages, allowing users to:

- See the pods behind an instance as a diagram or a table, with status, readiness,
  restarts and node placement
- Stream or tail container logs
- Describe a pod: containers, conditions and events, similar to `kubectl describe`

Works with any provider: pods are found through the selectors reported in the
instance's `status.components`, falling back to the `app.kubernetes.io/instance` label.

## Install with Helm

```bash
helm upgrade plugin-inspector oci://ghcr.io/openeverest/charts/plugin-inspector \
  -n everest-system --install
```

## Uninstall

```bash
helm uninstall plugin-inspector -n everest-system
```

## How it works

```text
Browser → GET /v1/clusters/{cluster}/plugins/{name}/api/components?...
         ↓ (host validates session, forwards the user's JWT)
Backend → GET instance from the OpenEverest API as the user (enforces RBAC)
         ↓
Backend → list/get pods, logs and events with its own ServiceAccount
         ↓
Browser ← JSON / log stream
```

A user can only see pods of instances they are allowed to read. The backend
reads Kubernetes with its own ServiceAccount, so it only sees the cluster it is
installed in.

## Configuration (`values.yaml`)

| Key | Description | Default |
|-----|-------------|---------|
| `image.repository` | Container image | `ghcr.io/openeverest/plugin-inspector` |
| `image.tag` | Image tag | chart `appVersion` |
| `plugin.enabled` | Enable/disable the plugin | `true` |
| `everestAPIURL` | OpenEverest API URL | discovered in-cluster when empty |

## Development

Requires Node.js 22+, Go 1.25+, Docker, Helm 3, k3d and Tilt.

```sh
npm install
make test     # backend and frontend tests
make dev-up   # k3d cluster + Tilt dev environment
```

## License

Apache-2.0
