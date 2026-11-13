# Glossary

Terms used in code, issues and reviews. Prefer these over synonyms.

## Session

Who is signed in, for one browser. On the web it is the `src/session/` module (`useSession()`); on the API it is
`SessionService`, which turns an `Authorization: Bearer` header into the **signed-in user** once per request.
_Avoid_: auth, auth context, login state.

## Signed-in user

The `User` a request or a page acts as. The API loads it once per request in `SessionService.authenticate` and puts it
on the context (`ctx.auth.user`); the web exposes it as `useSession().user`. Undefined means a **guest**.

## Guest

Someone without a valid session. Route guards send guests from protected pages to sign-in.

## Error code

A value of `errors[].extensions.code`, defined once in the API's `ErrorCode` enum and published in `schema.graphql`.
The web imports the generated `ErrorCode` and maps codes to form fields. Expected errors carry one of these codes;
see `docs/adr/0002-api-logging.md` for how expected and unexpected errors are logged.

## Valid-from

The per-user time (`sessionsValidFrom:<userId>` in Redis) before which every token of that user is revoked. Set when
the user's other sessions must end, e.g. after a password change. See `docs/adr/0003-session-revocation.md`.
_Avoid_: token version, logout-all timestamp.

## Idle timeout / absolute timeout

The two limits on a remembered session. Idle (`API_REFRESH_EXPIRED`): ends after that long without a refresh. Absolute
(`API_SESSION_MAX_AGE`): ends that long after sign-in (`auth_time`), however active. The refresh cookie, token and
Redis key all expire at the earlier of the two. See `docs/adr/0004-session-lifetime.md`.
