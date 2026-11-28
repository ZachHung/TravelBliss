# TravelBliss

Monorepo for TravelBliss, a passenger rail booking service. pnpm workspace + Turborepo.

- `apps/web` (`@travelbliss/web`): React, Vite, Mantine, Apollo Client.
- `apps/api` (`@travelbliss/api`): GraphQL API with Apollo Server, type-graphql, TypeORM/Postgres, Redis.

## Commands

- Package manager: pnpm 12. Run tasks from the root through turbo: `pnpm test` is the full gate (peers check, typecheck, lint, vitest, build, prettier). `pnpm typecheck` for a quick check. `pnpm run` installs first whenever the lockfile changed, after a pull included; `pnpm clean` removes every `node_modules`.
- One app only: `pnpm turbo run <task> --filter @travelbliss/<app>`. `pnpm --filter @travelbliss/<app> test:ui` opens the vitest UI.
- Run locally against docker Postgres/Redis: `pnpm dev:local` (uses root `.env.local`). Stop every dev server you started with `pnpm dev:stop`.
- Changing API resolvers or types regenerates `apps/api/schema.graphql`; commit it with the web changes it needs.

## Conventions

- Dependencies (settings in `pnpm-workspace.yaml`): a version both apps use lives in `catalog`, and the apps write
  `catalog:`. A dependency with an install script fails `pnpm install` until `allowBuilds` names it; a new peer
  mismatch fails `pnpm test` until it's fixed, or recorded with its reason in `peerDependencyRules`. A version
  published less than a day ago doesn't resolve yet.

- Env: variable names and which file is used when are in `.env.example`; add new variables there.
- API module: a folder in `apps/api/src/modules/` whose `index.ts` calls `defineModule` (`src/core/module.ts`), plus
  one entry in `src/modules/index.ts`. Inject classes by class, repositories with `@InjectRepository(Entity)`, the
  signed-in user with `@SignedInUser()`.
- Migrations: change the entity, then `pnpm dev:local` and `pnpm --filter @travelbliss/api migration:generate`. Never
  hand-edit a generated migration; the few hand-written ones are in [CODING_STANDARDS.md](CODING_STANDARDS.md).
- Deploy (ADR 0006): `infra/oracle/` holds the VM's Terraform, `compose.yml` and `deploy.sh`; `images.yml` and
  `deploy.yml` publish and deploy each green commit on `main`. The live VM ignores Terraform changes: config reaches it
  through each deploy, or by hand over `ssh ubuntu@travelbliss`. Owner setup and troubleshooting: `docs/deploy.md`.
- Code review: [CODING_STANDARDS.md](CODING_STANDARDS.md).

## Agent skills

- Issue tracker: [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md) (GitHub Issues via `gh`)
- Triage labels: [docs/agents/triage-labels.md](docs/agents/triage-labels.md)
- Domain docs: [docs/agents/domain.md](docs/agents/domain.md) (single-context); terms in [GLOSSARY.md](GLOSSARY.md)
