---
"@micro-router/core": patch
---

`MatchFailure` now declares the fields of `MatchSuccess` as absent, so a
`MatchResult` can be destructured, as in `const { ok, data } = path.match(url)`,
with `ok` narrowing the rest. At runtime a failure is still `{ ok: false }`.
