# TravelBliss

Monorepo for TravelBliss, a passenger rail booking service. pnpm workspace + Turborepo.

- `apps/web` (`@travelbliss/web`): React, Vite, Mantine, Apollo Client.
- `apps/api` (`@travelbliss/api`): GraphQL API with Apollo Server, type-graphql, TypeORM/Postgres, Redis.

## Commands

- Package manager: pnpm. Run tasks from the root through turbo: `pnpm test` is the full gate (typecheck, lint, vitest, build, prettier). `pnpm typecheck` for a quick check.
- One app only: `pnpm turbo run <task> --filter @travelbliss/<app>`.
- Run locally against docker Postgres/Redis: `pnpm dev:local` (uses root `.env.local`). Stop every dev server you started with `pnpm dev:stop`.
- Changing API resolvers or types regenerates `apps/api/schema.graphql`; commit it with the web changes it needs.

## Conventions

- Env: variable names and which file is used when are in `.env.example`; add new variables there.
- API module: a folder in `apps/api/src/modules/` whose `index.ts` calls `defineModule` (`src/core/module.ts`), plus
  one entry in `src/modules/index.ts`. Inject classes by class, repositories with `@InjectRepository(Entity)`, the
  signed-in user with `@SignedInUser()`.
- Migrations: change the entity, then `pnpm dev:local` and `pnpm --filter @travelbliss/api migration:generate`. Never
  hand-edit a generated migration; the few hand-written ones are in [CODING_STANDARDS.md](CODING_STANDARDS.md).
- Code review: [CODING_STANDARDS.md](CODING_STANDARDS.md).

## Agent skills

- Issue tracker: [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md) (GitHub Issues via `gh`)
- Triage labels: [docs/agents/triage-labels.md](docs/agents/triage-labels.md)
- Domain docs: [docs/agents/domain.md](docs/agents/domain.md) (single-context); terms in [GLOSSARY.md](GLOSSARY.md)
