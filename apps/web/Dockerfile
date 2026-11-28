# Build from the repo root: docker build -f apps/web/Dockerfile .
FROM node:22-slim AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /repo
# The download layer needs only what resolving reads, so it stays cached (images.yml's build cache) until the
# lockfile, the workspace settings or the pnpm version changes. Not a cache mount: the store must be in the layer
# for CI's cache to keep it, and the offline install below reads it from there.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch
COPY . .
RUN pnpm install --offline --frozen-lockfile --filter @travelbliss/web...
# Codegen reads the committed apps/api/schema.graphql, so the API need not be built here.
# Same origin as the API (ADR 0006): Caddy below proxies /graphql to it.
RUN pnpm --filter @travelbliss/web codegen && VITE_GRAPHQL_URI=/graphql pnpm --filter @travelbliss/web build

FROM caddy:2.11.9-alpine
COPY apps/web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/web/dist /srv
