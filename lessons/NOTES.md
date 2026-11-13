# Notes

- Prior knowledge: none claimed ("let's say I don't know anything"). Define every term on first use.
- The course lives in `lessons/` in the repo and is committed with the code.
- Preference (after lesson 2): lessons felt too short. Make each lesson longer (about 25-30 minutes), combining
  topics rather than splitting them.
- Plan from lesson 3 on: 3 refresh token, `_rf` cookie, rotation and reuse detection (API side) · 4 the web side:
  `useSession`, `createSessionLink` retry, sign-out and the blacklist, route guards and the reload flash.
- Blacklist keyed on the raw token (OWASP JWT warning): tested 2026-11-14, `jsonwebtoken` rejects re-spelled HS256
  signatures, so it is a hardening point, not a live hole. Taught as such in lesson 4.
- After lesson 4: grill-with-docs session on fixing gaps A (sign-out/password change scope), B (two-tab refresh race)
  and C (role-gated field + expired token → no refresh). Record decisions as ADRs / glossary terms.
