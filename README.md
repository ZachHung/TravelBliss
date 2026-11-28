# TravelBliss

TravelBliss is a passenger rail booking service. This monorepo holds both halves, managed with a
[pnpm workspace](https://pnpm.io/workspaces) and [Turborepo](https://turborepo.com/):

| Package            | Path       | Stack                                                                   |
| ------------------ | ---------- | ----------------------------------------------------------------------- |
| `@travelbliss/web` | `apps/web` | React 19, React Router 8, Mantine 9, Apollo Client 4, Vite 8, Storybook |
| `@travelbliss/api` | `apps/api` | Apollo Server 5, type-graphql, TypeORM (Postgres), Redis, inversify     |

The web app talks to the API over GraphQL. `apps/api/schema.graphql` is generated from the API's resolvers and
feeds the web app's typed documents, so a schema change and its client fix land in the same PR.

## Getting started

Requirements: Node.js 22 (see `.nvmrc`) and pnpm 12 (`corepack enable` picks the right version).

```sh
pnpm install
cp .env.example .env.local   # then fill it in
pnpm dev:local               # Postgres and Redis in docker, migrations, then API on :8000 and web on :5173
```

`pnpm dev:local` starts both containers, waits until they are healthy, applies migrations and runs the apps with
`.env.local`. Stop the apps with `pnpm dev:stop` and the containers with `pnpm dev:local:down` (data is kept). Plain
`pnpm dev` runs the apps against containers that are already up.

There is no hosted development environment (ADR 0006): the one hosted environment is production. If you still have a
`.env.development` from before, delete it: `pnpm dev` would otherwise let it override `.env.local` for the web app.

### Environment variables

Env files live at the repo root, one per environment, and only `.env.example` is committed (it lists every
variable):

| File              | Used by                                                              |
| ----------------- | -------------------------------------------------------------------- |
| `.env.local`      | `pnpm dev`, `pnpm dev:local` and `apps/api/infra/docker-compose.yml` |
| `.env.e2e`        | `pnpm e2e` (committed: dummy values for its throwaway stack)         |
| `.env.production` | the VM only, written by Terraform (`infra/oracle`, ADR 0006)         |

The API loads exactly `.env.${NODE_ENV}` (`.env.local` when unset). `pnpm dev` and `pnpm dev:local` set `NODE_ENV=local`;
the API itself refuses to start without it, so a misconfigured host never acts as a local machine. Web variables start with `VITE_` (the
only ones that reach the browser). API variables start with `API_`.

## Scripts

Run from the repo root. Turbo caches every task except `dev` and `format:check`. In a terminal, turbo opens its TUI (one pane per task:
arrow keys to switch, `/` to search); without one (CI, piped output) it prints plain logs. `pnpm test` always prints
plain logs so a failure stays in your scrollback.

| Script           | Description                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| `pnpm dev`       | Start the API and the Vite dev server.                                                          |
| `pnpm dev:local` | Same, against Postgres and Redis in docker using `.env.local`. `dev:local:down` stops them.     |
| `pnpm test`      | Everything CI runs: typecheck, lint, tests, build and prettier, one task at a time.             |
| `pnpm e2e`       | Browser test (Playwright) on its own docker stack, removed afterwards. Runs beside `dev:local`. |
| `pnpm build`     | Build both apps into their `dist/`.                                                             |
| `pnpm typecheck` | Run `tsc --noEmit` in both apps.                                                                |
| `pnpm lint`      | Run ESLint (and Stylelint for web).                                                             |
| `pnpm format`    | Fix formatting and auto-fixable lint problems.                                                  |

First e2e run on a machine: `pnpm --filter @travelbliss/web exec playwright install --with-deps chromium` (the
system libraries need `sudo`).

Per-app scripts run with `pnpm --filter <package> <script>`, for example `pnpm --filter @travelbliss/web storybook`
or `pnpm --filter @travelbliss/api migration:generate`.

### GraphQL types

`turbo` runs `@travelbliss/api#schema` (writes `apps/api/schema.graphql` without needing a database) before
`@travelbliss/web#codegen` (writes `apps/web/generated/`). Commit the updated `schema.graphql`; CI fails when it is
stale. Set `GRAPHQL_SCHEMA` to point web codegen at another file or URL.

## API

### Project structure

```
apps/api/src/
  modules/<name>/   one folder per module: resolver, service, repository, entity, inputs, exceptions, tests
  core/             inversify container, auth checker and error-logging middlewares, shared base classes
  config/           Postgres data source, Redis client, logger
  migration/        TypeORM migrations (generated)
  schema.ts         writes schema.graphql without a database (`pnpm --filter @travelbliss/api schema`)
```

### Migrations

TypeORM commands build the API first, so they always see the current entities. They use the env file for
`NODE_ENV` (`.env.local` by default, so the docker Postgres from `pnpm dev:local` must be up):

```sh
pnpm --filter @travelbliss/api migration:generate   # after changing an entity
pnpm --filter @travelbliss/api migration:up
pnpm --filter @travelbliss/api migration:down
```

### Testing

Service tests run in Node with fakes for Redis and repositories. `apps/api/vitest.setup.ts` loads `reflect-metadata` and
sets fixed test env values. Coverage thresholds in `apps/api/vite.config.ts` are set to the current numbers, so CI
fails if coverage drops; raise them as tests are added.

### Logging

Logs go to stdout only: JSON lines in production, colorized lines in development, level from `API_LOG_LEVEL`. Each
GraphQL operation logs one line (`operationName`, `durationMs`, `userId`, `outcome`, `correlationId`):

- `warn` for expected errors (thrown on purpose, such as a wrong password)
- `error` with the stack for anything else; in production clients only see `Internal server error`

Every response has an `x-correlation-id` header and every GraphQL error carries `extensions.correlationId`: search the
logs for it to find the real cause. See `docs/adr/0002-api-logging.md`.

### Docker

`apps/api/infra/docker-compose.yml` reads the root `.env.local`. The API container is in the `serve` profile, so plain
`up` starts only Postgres and Redis. `pnpm e2e` runs a second copy of it from `.env.e2e`, on other ports, and removes it
afterwards.

```sh
pnpm --filter @travelbliss/api docker:local:up    # Postgres + Redis only (what `pnpm dev:local` uses)
pnpm --filter @travelbliss/api docker:serve:up    # API image + Postgres + Redis
docker build -f apps/api/Dockerfile .             # API image alone, from the repo root
```

## Web app

### Project structure

```
apps/web/src/
  components/   reusable UI, each with its tests and stories
  graphql/      queries and mutations
  hooks/        custom hooks, GraphQL hooks in hooks/graphql
  layouts/      page shells
  pages/        route components
  routes/       router and route guards (PublicRoute, ProtectedRoute)
  session/      who is signed in: SessionProvider, useSession, createSessionLink
  validations/  zod schema helpers
apps/web/test-utils/  render() with Mantine, Apollo MockedProvider and an optional router
```

Authentication lives in `src/session/`. Use `useSession()` → `{ user, signIn, signOut, isSigningIn }`; nothing else
about tokens leaks out. `createSessionLink` (in the Apollo client) keeps the access token in memory, sends it as a Bearer
header, and on `UNAUTHENTICATED` calls `refreshToken` once with the HttpOnly `<API_COOKIE_NAME>_rf` cookie and retries.
`SessionProvider` shows a loader until the first "who am I" request settles.

### Testing

Use `render` from `@test-utils`. It wraps the UI in Mantine and Apollo's `MockedProvider`; pass `mocks` to stub
GraphQL operations and `route` to render inside a `MemoryRouter`:

```tsx
render(<SignInPage />, { route: '/sign-in', mocks: [loginMock] });
```

Coverage thresholds are enforced in `apps/web/vite.config.ts`.
