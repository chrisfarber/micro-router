# @micro-router/core

## 0.1.0

### Minor Changes

- b8969f6: add a router that can be used to dispatch on paths

### Patch Changes

- 951caab: redefine the match result type
- 52d46b8: emit typescript declaration maps
- 24a54dc: renaming path combinators for consistency
- b3468bd: add enumSegment combinator
- 2cf366b: better result type when calling path() on a single string
- 4dfa3a4: add isExactMatch()
- 722c1a2: better tree-shaking
- 77a1fa7: path() with no arguments returns Path<"/", NoData> instead of
  undefined.

## 0.0.1

### Patch Changes

- 7e75bb5: initial release
