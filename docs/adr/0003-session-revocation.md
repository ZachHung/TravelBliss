# 3. Session revocation: valid-from per user, one refreshing tab at a time

Date: 2026-11-14. Status: accepted.

## Context

The auth course (`lessons/0004`) surfaced three gaps. Changing the password ended no other session, so a stolen
session survived it. Two tabs refreshing at the same moment spent the same refresh token, which reuse detection
(`SessionService.refresh`) cannot tell from theft, so it signed the user out everywhere. And a guest on a role-gated
field got `UNAUTHORIZED`, which the web session link never answers with a refresh.

## Decision

- **Valid-from timestamp.** Each user has a Redis key `sessionsValidFrom:<userId>` (unix seconds). Tokens issued
  before it are revoked: `authenticate` checks access tokens (in the same `MGET` as the blacklist), `refresh` checks
  refresh tokens. `SessionService.endOtherSessions` sets it, deletes the user's refresh tokens and re-issues tokens
  for the current device. `changePasswordUser` uses it and returns `UserTokens`.
  - Chosen over blacklisting each access token, which the server never records.
  - JWT `iat` has one-second resolution: a token issued in the same second as the change survives.
- **One refreshing tab at a time, in the browser.** The web refresh runs inside a Web Lock
  (`travelbliss-session-refresh`), so a second tab refreshes with the cookie the first received.
  - Chosen over a server-side grace window for reused tokens, which would weaken reuse detection against a real thief
    during that window.
- **Guests are always `UNAUTHENTICATED`.** The auth checker throws it for any guest; `UNAUTHORIZED` means only a
  known caller without the role. Fixes the cause in the API instead of widening which codes the web link refreshes on.

## Consequences

- One more Redis read per authenticated request, folded into the existing blacklist lookup.
- "Sign out everywhere" is now a call to `endOtherSessions`; no mutation exposes it yet.
- Lessons 1–4 describe the pre-fix behaviour at commit `ad727f6`; they note the changes where the rules moved.
