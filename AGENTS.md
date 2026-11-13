# TravelBliss

Monorepo for TravelBliss, a passenger rail booking service. pnpm workspace + Turborepo.

- `apps/web` (`@travelbliss/web`): React, Vite, Mantine, Apollo Client.
- `apps/api` (`@travelbliss/api`): GraphQL API with Apollo Server, type-graphql, TypeORM/Postgres, Redis.

## Commands

- Package manager: pnpm. Run tasks from the root through turbo: `pnpm test` is the full gate (typecheck, lint, vitest, build, prettier). `pnpm typecheck` for a quick check.
- One app only: `pnpm turbo run <task> --filter @travelbliss/<app>`.
- Changing API resolvers or types regenerates `apps/api/schema.graphql`; commit it with the web changes it needs.

## Conventions

- One root `eslint.config.js` and prettier config for both apps.
- Env vars live in root `.env*` files: `VITE_*` for web, `API_*` for the API. Add new ones to `.env.example`.
- The API relies on decorator metadata: never turn an import used in a decorated class into `import type`.

## Agent skills

- Issue tracker: [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md) (GitHub Issues via `gh`)
- Triage labels: [docs/agents/triage-labels.md](docs/agents/triage-labels.md)
- Domain docs: [docs/agents/domain.md](docs/agents/domain.md) (single-context)
