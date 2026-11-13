# Notes

- Prior knowledge: none claimed ("let's say I don't know anything"). Define every term on first use.
- The course lives in `lessons/` in the repo and is committed with the code.
- Preference (after lesson 2): lessons felt too short. Make each lesson longer (about 25-30 minutes), combining
  topics rather than splitting them.
- Plan from lesson 3 on: 3 refresh token, `_rf` cookie, rotation and reuse detection (API side) · 4 the web side:
  `useSession`, `createSessionLink` retry, sign-out and the blacklist, route guards and the reload flash.
- Lesson 4 topic to raise (sign-out): `SessionService.end` blacklists the raw access token string; OWASP's JWT cheat sheet warns
  that raw-token (or its hash) denylist keys are unsafe because JWTs are malleable. Real finding, not yet fixed.
