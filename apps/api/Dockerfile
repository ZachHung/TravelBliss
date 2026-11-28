# Build from the repo root: docker build -f apps/api/Dockerfile .
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /repo
# The download layer needs only what resolving reads, so it stays cached (images.yml's build cache) until the
# lockfile, the workspace settings or the pnpm version changes. Not a cache mount: the store must be in the layer
# for CI's cache to keep it, and the offline install below reads it from there.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch
COPY . .
RUN pnpm install --offline --frozen-lockfile
RUN pnpm --filter @travelbliss/api build
# Copies the API's "files" plus its production node_modules, without the rest of the workspace
RUN pnpm deploy --filter @travelbliss/api --prod --legacy /app

FROM base
COPY --from=build /app /app
WORKDIR /app
# The commit this image was built from, reported by GET /health (#201); images.yml passes it, a local build reports "dev"
ARG GIT_SHA
ENV GIT_SHA=$GIT_SHA
CMD ["node", "dist/index.js"]
