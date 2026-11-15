# Reads tokens; not yet sure an edited payload is rejected

Lesson 2: all correct except practice Q2 (an attacker edits `userId` in their own token). The learner can decode a
token and read its claims, but did not yet connect "the signature is computed over the payload" to "any edit makes
the token invalid, so the caller becomes a guest".

**Evidence:** self-reported quiz result.

**Implications:** open lesson 3 with that idea in a new form (extending `exp` instead of changing `userId`), and lean
on it when explaining refresh tokens: they are trusted for the same reason. Lesson 1's Q4 concept was answered
correctly in lesson 2's warm-up.
