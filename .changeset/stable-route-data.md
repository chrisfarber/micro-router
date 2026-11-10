---
"@micro-router/react": patch
---

Route components and `usePathMatch()` now keep the same `data` object when only
the search or hash changes, and `routeSwitch()` no longer rebuilds it when its
parent re-renders. Effects that depend on `data`, and `memo()` route components,
no longer rerun for those changes.
