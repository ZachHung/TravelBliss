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

Requirements: Node.js 22 (see `.nvmrc`) and pnpm 10 (`corepack enable` picks the right version).

```sh
pnpm install
cp .env.example .env.development   # fill in Postgres, Redis and secrets
pnpm --filter @travelbliss/api migration:up
pnpm dev                           # API on :8000, web on :5173
```

To run Postgres and Redis locally instead of hosted ones, put local values in `.env.development.local` (it overrides `.env.development`) and start them with
`pnpm --filter @travelbliss/api docker:local:up`.

### Environment variables

Both apps read one set of env files at the repo root, with Vite's precedence:
`.env.[mode].local` > `.env.[mode]` > `.env.local` > `.env`. Only `.env.example` is committed, and it lists every
variable. Web variables start with `VITE_` (the only ones that reach the browser). API variables start with `API_`.

## Scripts

Run from the repo root. Turbo caches every task except `dev` and `format:check`.

| Script           | Description                                                               |
| ---------------- | ------------------------------------------------------------------------- |
| `pnpm dev`       | Start the API and the Vite dev server.                                    |
| `pnpm test`      | Everything CI runs: typecheck, lint, tests, build and the prettier check. |
| `pnpm build`     | Build both apps into their `dist/`.                                       |
| `pnpm typecheck` | Run `tsc --noEmit` in both apps.                                          |
| `pnpm lint`      | Run ESLint (and Stylelint for web).                                       |
| `pnpm format`    | Fix formatting and auto-fixable lint problems.                            |

Per-app scripts run with `pnpm --filter <package> <script>`, for example `pnpm --filter @travelbliss/web storybook`
or `pnpm --filter @travelbliss/api migration:generate`.

### GraphQL types

`turbo` runs `@travelbliss/api#schema` (writes `apps/api/schema.graphql` without needing a database) before
`@travelbliss/web#codegen` (writes `apps/web/generated/`). Commit the updated `schema.graphql`; CI fails when it is
stale. Set `GRAPHQL_SCHEMA` to point web codegen at another file or URL.

### API Docker image

```sh
docker build -f apps/api/Dockerfile .                         # from the repo root
pnpm --filter @travelbliss/api docker:serve:up               # API + Postgres + Redis
```

## Web app

### Project structure

```
apps/web/src/
  components/   reusable UI, each with its tests and stories
  contexts/     React contexts (AuthProvider)
  graphql/      queries and mutations
  hooks/        custom hooks, GraphQL hooks in hooks/graphql
  layouts/      page shells
  pages/        route components
  routes/       router and route guards (PublicRoute, ProtectedRoute)
  validations/  zod schema helpers
apps/web/test-utils/  render() with Mantine, Apollo MockedProvider and an optional router
```

Authentication uses an HTTP-only cookie (`credentials: 'include'`); `AuthProvider` loads the current user with the
`GetMe` query and exposes login and logout through `useAuth`.

### Testing

Use `render` from `@test-utils`. It wraps the UI in Mantine and Apollo's `MockedProvider`; pass `mocks` to stub
GraphQL operations and `route` to render inside a `MemoryRouter`:

```tsx
render(<SignInPage />, { route: '/sign-in', mocks: [loginMock] });
```

Coverage thresholds are enforced in `apps/web/vite.config.ts`.
