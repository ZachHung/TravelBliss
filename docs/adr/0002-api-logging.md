# 2. API logging: stdout, one line per request, expected vs unexpected errors

Date: 2026-11-13. Status: accepted.

## Context

The API logged with winston to `logs/<boot day>.log` and, outside production only, to the console. In a
container that meant production logs were invisible to `docker logs` and lost with the container. The file
format dropped stack traces, the dev/prod formats were swapped, and the file never rotated. The error middleware
logged only `GraphQLError`s, which are mostly expected outcomes (wrong password, signed out), at `error`, while
real failures (database, bugs) were not logged at all. The auth checker turned database failures into "access
denied", and TypeORM printed raw SQL with parameters in production. File logging dates from before the API was
dockerized and was never revisited.

## Decision

- **Stdout only, with winston kept.** Production writes one JSON object per line. Development writes colorized
  single lines. The level comes from `API_LOG_LEVEL` (default `info` in production, `debug` elsewhere). No log
  files.
- **One line per GraphQL operation**, from an Apollo plugin (`apps/api/src/core/logging.ts`). Each line has
  `operationName`, `durationMs`, `userId`, `outcome` and `correlationId`. Variables are never logged, because
  they carry passwords and tokens. Introspection logs at `debug`.
- **Expected vs unexpected errors.** An error is expected when it is a `GraphQLError` thrown on purpose:
  `BaseException`, type-graphql auth and validation errors, and GraphQL parse or validation errors.
  - Expected errors log at `warn` with their code.
  - Anything else is unexpected and logs at `error` with its message and stack.
- **Production masks unexpected errors.** Clients get `Internal server error` with code
  `INTERNAL_SERVER_ERROR`. Expected errors keep their messages, because the web app shows them on form
  fields.
- **Correlation id.** It comes from an incoming `x-correlation-id` header (only if it matches `[\w-]{1,64}`,
  so it can't forge log lines), otherwise a new UUID.
  - It is echoed as a response header, which CORS exposes.
  - Every GraphQL error carries it in `extensions.correlationId`.
- **Introspection and Sandbox** are on outside production only.
- **Redis** logs one `error` when the connection drops and one `info` when it reconnects, not every retry.
- **TypeORM query logging** is off. Database errors reach the log through the plugin.

## Consequences

- A user can report the correlation id from an error, and it finds the exact log line with the real cause.
- The deploy target only needs to collect stdout.
- Database outages now surface as `INTERNAL_SERVER_ERROR` instead of `UNAUTHENTICATED`.
