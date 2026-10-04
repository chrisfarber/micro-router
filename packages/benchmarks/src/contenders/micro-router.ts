import {
  mapData,
  matchString,
  path,
  router,
  segment,
  string,
} from "@micro-router/core";
import type { Path, Router } from "@micro-router/core";
import type { Contender, Match } from "./contender.ts";

/**
 * Matches any one url segment, and discards it. micro-router has no
 * multi-segment wildcard; this is as close as it gets to `*`, and is enough
 * for the suites' requests.
 *
 * It still counts as a capture, which only matters for ranking against
 * routes that match the same url; none do in the suites.
 */
const wildcard = mapData(segment(matchString), {
  to: () => null,
  from: () => "",
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
    let current: Path | null = null;
    let prefix = "";
    for (const part of pattern.split("/").filter(part => part)) {
      prefix += `/${part}`;
      let next = prefixes.get(prefix);
      if (!next) {
        // Top-level paths don't extend `root`: `path(path(), "login")` matches
        // only "/", not "/login".
        next = current ? path(current, toSegment(part)) : path(toSegment(part));
        prefixes.set(prefix, next);
      }
      current = next;
    }
    return current ?? root;
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
