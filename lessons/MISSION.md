# Mission: TravelBliss sign-in (authentication and authorization)

## Why

Own the sign-in code of TravelBliss: change it and debug it with confidence, without relying on an agent to explain
it.

## Success looks like

- Predict, for any request, whether it is answered or rejected, and with which error code.
- Explain what is inside an access token and why the API trusts it.
- Trace sign-in, page reload, token refresh and sign-out through both apps, naming the file at each step.
- Add a new protected field or role-gated feature correctly on the first try.
- Diagnose a broken sign-in (like the redirect and flicker bugs) from logs and the browser alone.

## Constraints

- Starts from zero prior knowledge of auth concepts.
- Lessons are short and grounded in this repo's real code; they live in `lessons/` and are committed.

## Out of scope

- Building an auth system from scratch, OAuth/OpenID Connect providers, and password-hashing internals.
