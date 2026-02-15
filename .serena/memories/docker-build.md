# Docker Build

The Dockerfile is at `docker/Dockerfile`. It uses `../` relative paths for COPY commands, so build with `-f` from the project root:

```bash
podman build -f docker/Dockerfile -t guzzler-test .
```

The build:
1. Installs deps (`npm i`)
2. Runs codegen (`npm run codegen --workspaces --if-present`)
3. Builds (`npm run build`)
4. Runs tests (`npm run test`)
5. Prunes dev deps
6. Creates slim image with just server + domain + mongodb + utils + webui dist
7. Runs a minimal smoke test
8. Serves on port 8080
