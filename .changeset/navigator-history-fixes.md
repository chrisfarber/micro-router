---
"@micro-router/history": patch
"@micro-router/react": minor
---

Breaking: `start()` and `stop()` have been removed from `INavigator` and
`Navigator`. A navigator now observes its history while anything is listening to
it, and stops when the last listener does, so `<NavigatorProvider>` no longer
manages it, and a navigator can be shared between providers or used outside of
react. While nothing is listening, `navigator.location` reads the history
directly.

`BrowserHistory` navigates natively when only the hash changes, so links and
pushes to `#section` scroll to the target, update `:target`, and fire
`hashchange`; going to the hash you're already on scrolls to it again without
adding an entry. Like `pushState`, these aren't reported to `observe()`, which
reports only the changes a history didn't make itself. `MemoryHistory` resolves
relative paths against the current location, like a browser, and notifies its
observers on `go()`. `Navigator.go()` no longer notifies listeners before the
history has actually moved, and the navigator no longer notifies when the
location didn't change. `push()` resolves its target before skipping duplicates,
so relative or unnormalized URLs for the current location no longer add entries.
