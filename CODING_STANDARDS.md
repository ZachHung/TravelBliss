# Coding standards

Judgement calls a reviewer checks in a diff. Anything mechanical (formatting, imports, `../` paths, type-only imports
in decorated API files) is enforced by `pnpm test` and does not belong here.

## Catch narrowly

Catch the error you expect, by class or code, and rethrow everything else. A broad `catch` that returns a default
(`false`, `undefined`, `[]`) turns an outage into a wrong answer and hides it from the log: the auth checker once
reported a Postgres outage as "access denied".

In the API, an error a client should react to is a `BaseException` with an `ErrorCode`; everything else propagates
and is logged as unexpected (`docs/adr/0002-api-logging.md`).

## Derive, don't copy

Compute a value from its source during render. Copying query data or props into `useState` through `useEffect` lags
one render behind, and anything that branches on it (route guards, the header) acts on the stale value in that gap: it
caused the sign-in flash on reload. When a derived value needs an override, keep the override as its own small state
(`isSignedOut`) and derive from both.
