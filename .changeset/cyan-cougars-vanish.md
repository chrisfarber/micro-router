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
- Several segment constructors have had breaking changes to their APIs;
  path(), string(), and number() should behave as they did before, but,
  most other segment constructors have had breaking changes.
