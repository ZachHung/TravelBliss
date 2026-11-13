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

## Wisdom (Communities)

- [OWASP Slack](https://owasp.org/slack/invite) (`#cheatsheets` and general channels)
  Practitioners who write the cheat sheets. Use for: "is this design safe?" questions after lesson 3.

## Gaps

- JWT structure and validation (lesson 2): use RFC 7519 and the OWASP JSON Web Token cheat sheet, still to be
  read and added.
- Refresh tokens and cookies (lesson 3): RFC 6749 §1.5, MDN `Set-Cookie`, OWASP Session Management cheat sheet.
