---
"@micro-router/core": minor
"@micro-router/react": minor
---

Rebuild the router as a trie. This required re-tooling the structure of the core
package quite a bit; it's now no longer based around parser combinators.
Instead, path segments are promoted to a first-class concept, and the path()
constructor builds objects that retain a list of their individual segments. This
allows the router to build a trie data structure. Adding paths to a router is
now slightly more expensive, as we maintain the trie instead of simply appending
paths to an array, however the speedup at dispatch time is very significant.
Despite the significance of this change, the DSL for constructing routes remains
_mostly_ the same.

Additionally, URL encoding is now handled properly.

There are some breaking changes:

- `Path.path` is now `Path.repr`
- Several segment constructors have had breaking changes to their APIs; path(),
  string(), and number() should behave as they did before, but, most other
  segment constructors have had breaking changes.
- The router no longer accepts `partialMatch`, either when it's constructed or
  when dispatching. Instead, register a route with `.onPrefix()` to have it
  match any input that starts with its path; its handler receives the rest of
  the input, decoded, as `rest: string[]`. Routes registered with `.on()` only
  match the entire input, and are preferred over a prefix route that matches the
  same input.
- Match results report `exact: boolean` and `rest: string[]` instead of
  `remaining: string`, and `isExactMatch()` has been removed. A match is exact
  when it consumes the entire input, which leaves `rest` empty; that includes a
  prefix route matching its own path.
- Router handlers now receive a `MatchSuccess`, the same type that
  `Path.match()` returns. The `RouteMatch` type has been removed.
- The root path, `path()`, is now a prefix of every path, like any other path.
- `route()` and `match()` now give their component the path's data as a single
  `data` prop, instead of as individual props: `({ data }) => ...`. A path
  without data passes `null`, not `{}`. Any kind of component works, including
  `lazy()`, `memo()` and class components, and data can be named `key`.
- `RouteComponent.Matched` is now the component that was given to `route()` or
  `match()`.
- Route components also receive `exact` and `rest`, so a `match()` component can
  see the rest of the pathname. `RouteProps<P>` types a route component's props.
- `usePathMatch()` now returns the same `MatchResult` as `path.match()`, which
  can be destructured, instead of a `[matched, data]` tuple.
- `<Link>` takes a path's data only through its `data` prop, not as inline
  props. In exchange, it accepts every attribute of an `<a>` except `href`,
  including `onClick`, `target` and callback refs, and a new `replace` prop.
  Links to other origins, `mailto:` links, and anchors with a `target` or
  `download` are now left to the browser. `useClientSideNavigation()` takes the
  same `{ to, data, replace }` object. The `LinkBaseProps`, `LinkDataProps` and
  `PathDataCanBeInlineLinkProps` types have been removed.
- `<Link>` now sets `aria-current="page"` when it links to the current page, by
  an exact match of the pathname, unless `aria-current` is given explicitly.
