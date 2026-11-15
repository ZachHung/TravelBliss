# Can predict request outcomes; trips on role-gated fields for guests

Lesson 1 quiz: 6 of 7. The learner separates authentication from authorization and predicts data vs
`UNAUTHENTICATED` vs `UNAUTHORIZED` for signed-in users, guests, logged-out tokens and open mutations.

**Evidence:** quiz answers, self-reported.

**Implications:** the one miss was Q4 (a guest calling `allUser` gets `UNAUTHORIZED`): the likely misconception is that
the error code describes the caller rather than the field's rule. Re-test it by spaced retrieval at the start of
lesson 2 before building on it. Mission confirmed as written.
