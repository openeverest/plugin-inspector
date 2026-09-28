# plugin-inspector
OpenEverest Generic plugin to show the status, logs and events for various resources

## Development

The frontend links `@openeverest/plugin-sdk` and `@openeverest/plugin-theme` from a sibling
checkout of the core repo (`../openeverest`) until they are published. Build them first:

```sh
(cd ../openeverest/ui && pnpm --filter @openeverest/plugin-sdk --filter @openeverest/plugin-theme build)
npm install
make test
make dev-up
```

The backend reads pods and logs with its own ServiceAccount, so it only sees the
Kubernetes cluster it is installed in.
