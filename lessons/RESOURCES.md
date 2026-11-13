# TravelBliss sign-in resources

## Knowledge

- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
  Defines authorization vs authentication, deny-by-default, check on every request. Use for: lesson 1, any
  "who may do what" design question.
- [RFC 6750: Bearer Token Usage](https://www.rfc-editor.org/rfc/rfc6750)
  The standard for `Authorization: Bearer`; §1.2 defines bearer tokens. Use for: how tokens travel, why a stolen
  token is enough.
- [MDN: HTTP authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Authentication)
  The `Authorization` header and 401 vs 403. Use for: mapping GraphQL error codes to plain HTTP.
- [type-graphql: Authorization](https://typegraphql.com/docs/authorization.html)
  `@Authorized`, the auth checker and its arguments. Use for: stop 2 of the pipeline. Does not say which error a
  denial throws; the [library source](https://github.com/MichalLytek/type-graphql/blob/v2.0.0-beta.3/src/helpers/auth-middleware.ts)
  does.
- The TravelBliss code itself (`apps/api/src/modules/session`, `apps/web/src/session`) and
  `docs/adr/0002-api-logging.md`. Use for: every lesson; the course teaches this system, not auth in general.

- [RFC 7519: JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519)
  The JWT format (§3), `exp`/`iat` claims (§4.1), NumericDate (§2). Use for: lesson 2, exact token semantics.
- [OWASP JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html)
  Signed JWTs are not confidential; `alg: none`; denylists. Use for: lesson 2, and lesson 6 (its warning against
  keying a denylist on the raw token applies to TravelBliss's blacklist).
- [jsonwebtoken README](https://github.com/auth0/node-jsonwebtoken#readme)
  `sign` defaults (HS256, adds `iat`), `verify` errors, `decode` does not verify. Use for: what our code calls.

- [RFC 6749 §1.5: Refresh Token](https://www.rfc-editor.org/rfc/rfc6749#section-1.5)
  What a refresh token is and that it never goes to resource servers. Use for: why there are two tokens.
- [RFC 9700: OAuth 2.0 Security Best Current Practice, §4.14](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14)
  Refresh token rotation and reuse detection. Use for: lesson 3, any change to `SessionService.refresh`.
- [MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)
  `HttpOnly`, `Secure`, `SameSite`, `Max-Age`. Use for: the `_rf` cookie's attributes.

## Wisdom (Communities)

- [OWASP Slack](https://owasp.org/slack/invite) (`#cheatsheets` and general channels)
  Practitioners who write the cheat sheets. Use for: "is this design safe?" questions after lesson 3.

## Gaps

- Web-side session handling (lesson 4): Apollo Client link docs (`ErrorLink`, `SetContextLink`), React Router
  docs on navigation and redirects.
