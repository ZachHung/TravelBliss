# 5. Linked sign-in: server-side code flow, one table of provider ids, never linked by email

Date: 2026-11-15. Status: accepted.

## Context

Users want to sign in with Google or Facebook (a **linked sign-in**, see GLOSSARY). `User` required a password,
email, phone and birthday, none of which a provider is sure to give. The API is GraphQL-only, and every sign-in ends
in `SessionService.start`, which sets the `rf` cookie the web app refreshes from.

## Decision

- **Authorization-code flow on the API, started from GraphQL.** `startLinkedSignIn(provider)` stores the flow
  (`state`, PKCE verifier, and the signed-in user when connecting) in Redis for 10 minutes, sets the `state` in an
  httpOnly cookie scoped to `/auth`, and returns the provider's URL. The provider redirects to
  `GET /auth/:provider/callback`, which checks the cookie against `state`, consumes the flow once (`GETDEL`), signs in
  or connects, and redirects to the web app. The web app's existing refresh on page load turns the new `rf` cookie
  into an access token.
  - A mutation rather than a plain `GET /auth/:provider` link: connecting needs to know the signed-in user, whose
    access token lives in memory and does not travel with a top-level navigation.
  - The cookie binds the flow to the browser that started it: without it, a URL started by an attacker would connect
    the victim's provider account to the attacker's user.
  - Chosen over the providers' browser SDKs posting a token to a mutation: secrets stay server-side and there are no
    third-party scripts.
- **One `SignInProvider` per provider, built on `arctic`.** Each turns a code into a profile (`providerUserId`,
  `email`, `fullName`). A new provider is one file, one entry in `providers/index.ts`, one `SignInProviderName` value
  and one UI entry; the rules live once, in `LinkedSignInService`. A provider is offered only when its credentials are
  set; a fake `DEV` provider is offered only with `NODE_ENV=local`.
  - Chosen over passport, whose Express-session model clashes with JWT plus the `rf` cookie.
- **Matched on the provider's user id, never on email.** Table `linked_sign_in`, unique on
  `(provider, providerUserId)`, many per user.
- **No automatic linking by email.** A first sign-in whose email belongs to an existing user fails with
  `EMAIL_TAKEN_SIGN_IN_TO_LINK`; the user signs in with their password and connects from the account page.
  - Even Google's `email_verified` is not enough: registration here does not verify emails, so whoever registered an
    address first (maybe not its owner) would keep a working password into the account the owner then signs in to.
    Revisit once registration verifies emails.
- **Password, email, phone and birthday become nullable**; the username is generated. A user without a password
  cannot use password sign-in until they set one (`setPassword`), and cannot disconnect their last linked sign-in.
- **Every linked sign-in starts a remembered session**, with the lifetimes of ADR 0004.
- Callback failures redirect to `/sign-in?error=<ErrorCode>`, or `/account?error=<ErrorCode>` when connecting.

## Consequences

- Code that reads `user.password`, `email`, `phoneNumber` or `birthday` must handle `null`; booking must ask for
  what it needs.
- Each provider needs an app registration and the exact callback URL per environment
  (`docs/linked-sign-in-setup.md`).
- The migration's `down` fails while users without these fields exist.
