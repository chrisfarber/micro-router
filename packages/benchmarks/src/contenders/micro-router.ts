import { codec, dataSegment, path, router, string } from "@micro-router/core";
import type { Path, Router } from "@micro-router/core";
import type { Contender, Match } from "./contender.ts";

/**
 * Matches any one url segment without capturing it. micro-router matches one
 * url segment per path segment, so it has no multi-segment wildcard; this is
 * as close as it gets to `*`, and is enough for the suites' requests.
 */
const wildcard = dataSegment({
  repr: "*",
  captures: 0,
  codec: codec(
    () => ({ ok: true, data: null }),
    () => "",
  ),
});

const toSegment = (part: string) =>
  part === "*" ? wildcard : part.startsWith(":") ? string(part.slice(1)) : part;

/**
 * Returns a function that builds a path from a pattern the way an app would:
 * by composing it from the path of its parent, e.g. `/orgs/:orgId/members` is
 * `path(Org, "members")`. Every prefix is built once and shared, so routes
 * under a common prefix share its segments, and so its nodes in the router.
 */
const pathBuilder = (): ((pattern: string) => Path) => {
  const root: Path = path();
  const prefixes = new Map<string, Path>();
  return pattern => {
    let current = root;
    let prefix = "";
    for (const part of pattern.split("/").filter(part => part)) {
      prefix += `/${part}`;
      let next = prefixes.get(prefix);
      if (!next) {
        next = path(current, toSegment(part));
        prefixes.set(prefix, next);
      }
      current = next;
    }
    return current;
  };
};

/**
 * micro-router matches paths only, so this keeps one router per method and
 * picks the router first. That's how method-aware routers like Hono's organize
 * their trees anyway.
 */
const contender: Contender = {
  name: "micro-router",
  prepare: routes => {
    const toPath = pathBuilder();
    const defs = routes.map(route => ({
      ...route,
      path: toPath(route.pattern),
    }));
    return () => {
      const routers = new Map<string, Router<Match, true>>();
      for (const { method, name, path } of defs) {
        const r = routers.get(method) ?? router();
        routers.set(
          method,
          r.on(path, ({ data }) => ({
            name,
            // Paths built from patterns are untyped; these hold string params.
            data: data as Match["data"],
          })),
        );
      }
      return {
        dispatch: (method, url) => routers.get(method)?.dispatch(url) ?? null,
      };
    };
  },
};

export default contender;
