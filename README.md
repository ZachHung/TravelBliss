# TravelBliss

Web client for TravelBliss, a passenger rail booking service. Built with React, Vite and Mantine, talking to the
[TravelBliss API](https://github.com/ZachHung/TravelBliss-API) over GraphQL.

## Stack

- [React 19](https://react.dev/) and [React Router 8](https://reactrouter.com/) (data router, lazy routes)
- [Mantine 9](https://mantine.dev/) UI with CSS modules and [PostCSS preset](https://mantine.dev/styles/postcss-preset)
- [Apollo Client 4](https://www.apollographql.com/docs/react) with [GraphQL Code Generator](https://the-guild.dev/graphql/codegen) typed documents
- Forms with `@mantine/form` and [zod 4](https://zod.dev/) validation
- [Vite 8](https://vite.dev/), TypeScript, [pnpm](https://pnpm.io/)
- Tests with [Vitest](https://vitest.dev/) and Testing Library, components in [Storybook 10](https://storybook.js.org/)
- ESLint, Stylelint and Prettier, run on commit through Husky and lint-staged

## Getting started

Requirements: Node.js 22 or newer (see `.nvmrc`) and pnpm 10 (`corepack enable` picks the right version).

```sh
pnpm install            # also runs `pnpm codegen`
cp .env.example .env    # then point VITE_GRAPHQL_URI at a running API
pnpm start:dev
```

### Environment variables

| Name               | Description                  |
| ------------------ | ---------------------------- |
| `VITE_GRAPHQL_URI` | URL of the GraphQL endpoint. |

### GraphQL types

Operations live in `src/graphql/**` and are typed by `pnpm codegen`, which writes to `generated/` (git-ignored) and
runs after every install. The schema is fetched from the API repository. To work offline or against another branch,
point `GRAPHQL_SCHEMA` at a local file or URL:

```sh
GRAPHQL_SCHEMA=../TravelBliss-API/schema.graphql pnpm codegen
```

## Scripts

| Script                               | Description                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------- |
| `pnpm start:dev`                     | Start the Vite dev server.                                                  |
| `pnpm build`                         | Typecheck and create a production build in `dist/`.                         |
| `pnpm preview`                       | Serve the production build locally.                                         |
| `pnpm test`                          | Everything CI runs: typecheck, prettier, lint, vitest with coverage, build. |
| `pnpm vitest` / `pnpm vitest:watch`  | Run the unit tests once or in watch mode.                                   |
| `pnpm typecheck`                     | Run `tsc --noEmit`.                                                         |
| `pnpm lint`                          | Run ESLint and Stylelint.                                                   |
| `pnpm format`                        | Fix formatting and auto-fixable lint problems.                              |
| `pnpm storybook` / `storybook:build` | Run or build Storybook.                                                     |
| `pnpm codegen`                       | Regenerate GraphQL types.                                                   |

## Project structure

```
src/
  components/   reusable UI, each with its tests and stories
  contexts/     React contexts (AuthProvider)
  graphql/      queries and mutations
  hooks/        custom hooks, GraphQL hooks in hooks/graphql
  layouts/      page shells
  pages/        route components
  routes/       router and route guards (PublicRoute, ProtectedRoute)
  validations/  zod schema helpers
test-utils/     render() with Mantine, Apollo MockedProvider and an optional router
```

Authentication uses an HTTP-only cookie (`credentials: 'include'`); `AuthProvider` loads the current user with the
`GetMe` query and exposes login and logout through `useAuth`.

## Testing

Use `render` from `@test-utils`. It wraps the UI in Mantine and Apollo's `MockedProvider`; pass `mocks` to stub
GraphQL operations and `route` to render inside a `MemoryRouter`:

```tsx
render(<SignInPage />, { route: '/sign-in', mocks: [loginMock] });
```

Coverage thresholds are enforced in `vite.config.ts`.
