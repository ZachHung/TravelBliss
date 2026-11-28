# Build from the repo root: docker build -f apps/web/Dockerfile .
FROM node:26-slim AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . /repo
WORKDIR /repo
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter @travelbliss/web...
# Codegen reads the committed apps/api/schema.graphql, so the API need not be built here.
# Same origin as the API (ADR 0006): Caddy below proxies /graphql to it.
RUN pnpm --filter @travelbliss/web codegen && VITE_GRAPHQL_URI=/graphql pnpm --filter @travelbliss/web build

FROM caddy:2.11.9-alpine
COPY apps/web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/web/dist /srv
