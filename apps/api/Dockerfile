# Build from the repo root: docker build -f apps/api/Dockerfile .
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY . /repo
WORKDIR /repo
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @travelbliss/api build
# Copies the API's "files" plus its production node_modules, without the rest of the workspace
RUN pnpm deploy --filter @travelbliss/api --prod --legacy /app

FROM base
COPY --from=build /app /app
WORKDIR /app
CMD ["pnpm", "start"]
