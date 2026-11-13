# Notes

- Prior knowledge: none claimed ("let's say I don't know anything"). Define every term on first use.
- The course lives in `lessons/` in the repo and is committed with the code.
- Planned sequence (adjust to records): 1 two questions and the pipeline · 2 inside the access token (JWT) ·
  3 access vs refresh token, the `_rf` cookie · 4 refresh rotation and reuse detection · 5 the web side
  (`useSession`, `createSessionLink`, retry) · 6 sign-out and the blacklist · 7 route guards and the reload flash.
- Lesson 6 topic to raise: `SessionService.end` blacklists the raw access token string; OWASP's JWT cheat sheet warns
  that raw-token (or its hash) denylist keys are unsafe because JWTs are malleable. Real finding, not yet fixed.
