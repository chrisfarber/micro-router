import type { Router } from "hono/router";
import type { Contender } from "./contender.ts";

/**
 * Hono's routers return every route that matches (so that middleware can run
 * too), in registration order, with params either as an object or as indexes
 * into a shared "stash". Hono's own benchmark stops at `match()`; this goes on
 * to take the first match and materialize its params, so that the work is
 * comparable to a micro-router dispatch.
 *
 * @param compile Some of Hono's routers compile their matcher lazily, on the
 * first `match()`. Pass `true` to force that while building, so that
 * construction benchmarks include it.
 */
export const honoContender = (
  name: string,
  createRouter: () => Router<string>,
  compile = false,
): Contender => ({
  name,
  prepare: routes => () => {
    const r = createRouter();
    for (const { method, name, pattern } of routes) {
      r.add(method, pattern, name);
    }
    if (compile) r.match("GET", "/");
    return {
      dispatch: (method, url) => {
        const [matches, stash] = r.match(method, url);
        const first = matches[0];
        if (!first) return null;
        const [name, params] = first;
        if (!stash) {
          return { name, data: params as Record<string, string> };
        }
        const data: Record<string, string> = {};
        for (const key in params) {
          data[key] = stash[params[key] as number] ?? "";
        }
        return { name, data };
      },
    };
  },
});
