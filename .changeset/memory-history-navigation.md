---
"@micro-router/history": patch
"@micro-router/react": patch
---

`MemoryHistory` now behaves like a browser after going back: pushing discards
the forward entries, and replacing changes the current entry instead of the last
one. `INavigator` now includes `listen()`, which `useLocation()` already
required, so custom navigators must implement it.
