# 1. One repo for web and API: pnpm workspace + Turborepo

Date: 2026-11-13. Status: accepted.

## Context

The web client (`TravelBliss`) and the GraphQL API (`TravelBliss-API`) lived in separate repos. Web codegen fetched
`schema.graphql` from the API repo's `main` over HTTP, so an API change and the client change it needed could not
land together, and the client could silently build against a stale schema. Tooling had drifted too (eslint 8 vs 9,
TS 5.9 vs 6, two prettier configs, two env conventions, the API had no CI).

## Decision

- One repo with `apps/web` (`@travelbliss/web`) and `apps/api` (`@travelbliss/api`) in a pnpm workspace. The API
  history was kept with `git subtree add`. No shared `packages/*` until real shared code exists.
- Turborepo runs tasks with caching. `@travelbliss/api#schema` emits `schema.graphql` without a database, and
  `@travelbliss/web#codegen` depends on it. The schema stays committed; CI fails when it is stale.
- One ESLint flat config, one prettier config and one TypeScript version for both apps. Runtime dependencies stay
  per app (for example graphql 16 in the API and 17 in web) until upgraded deliberately.
- One set of root env files with Vite's precedence, read by both apps. Web variables use `VITE_`, API variables
  use `API_`.
- Deploys stay independent. The API image is built from the repo root with `pnpm deploy`. The deploy target is
  still open.
- CI caches `.turbo` with `actions/cache` instead of a remote cache, so no account or secret is needed.

## Consequences

- Schema and client changes ship in one PR, and type errors from API changes show up in CI.
- Every API file was reformatted and relinted once to match the shared configs.
- `consistent-type-imports` must not touch decorated API files, because decorator metadata needs runtime imports.
  The ESLint config tells typescript-eslint about decorator metadata so the rule skips those files.
