# plugin-inspector
OpenEverest Generic plugin to show the status, logs and events for various resources

## Development

```sh
npm install
make test
make dev-up
```

The backend reads pods and logs with its own ServiceAccount, so it only sees the
Kubernetes cluster it is installed in.
