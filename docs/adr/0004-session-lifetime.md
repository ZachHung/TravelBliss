# 4. Session lifetime: one expiry, a 30-day idle timeout and a 90-day absolute cap

Date: 2026-11-14. Status: accepted.

## Context

The refresh cookie had a hardcoded `maxAge` of 30 days while the refresh token inside it was signed for
`API_REFRESH_EXPIRED` (6 months), and its Redis key lived as long. The browser enforced 30 days for honest users, but
a copied cookie value stayed valid on the server for 6 months. And because every refresh issues a new token with a
full lifetime, an active session (or a stolen one kept in use) never ended.

## Decision

- **One expiry.** The cookie's `expires` is the refresh token's `exp`, and its Redis key expires at the same moment.
  No separate cookie lifetime.
- **Idle timeout** `API_REFRESH_EXPIRED`, default `30d`: a remembered session with no refresh for that long ends.
- **Absolute timeout** `API_SESSION_MAX_AGE`, default `90d`: the refresh token carries `auth_time` (when the user
  actually signed in, as in OpenID Connect Core §2) through every rotation, and its `exp` is capped at
  `auth_time + API_SESSION_MAX_AGE`. OWASP Session Management: an absolute timeout limits how long a hijacked session
  stays usable, since a thief can keep refreshing.
- Tokens issued before this change have no `auth_time`; they count from their own `iat`.

## Consequences

- Users who sign in with Remember Me sign in again at least every 90 days, and after 30 idle days.
- Signing in again, or changing the password (`endOtherSessions`), starts a new session with a fresh `auth_time`.
- Existing env files must add `API_SESSION_MAX_AGE`; the API fails loudly on a missing or malformed duration.
