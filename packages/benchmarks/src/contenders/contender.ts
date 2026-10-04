/**
 * A router being benchmarked. Each lives in its own module with a default
 * export, so the cold start benchmark can time importing just one of them.
 */
import type { RouteSpec } from "../routes.ts";

/**
 * What a dispatch reports: the matched route's name, along with the params
 * parsed from the url. Every contender produces the same shape, so they all
 * do comparable work and can be checked against the same expectations.
 *
 * Contenders may report "no params" as either `null` or an empty object.
 */
export type Match = {
  name: string;
  data: Record<string, string> | null;
};

export type Dispatcher = {
  dispatch: (method: string, url: string) => Match | null;
};

export type Contender = {
  name: string;
  /**
   * Translates the route specs into the contender's own route definitions,
   * and returns a function that builds a router from them. Benchmarks time the
   * two steps separately: defining routes is something an app does whether or
   * not it uses a router.
   */
  prepare: (routes: RouteSpec[]) => () => Dispatcher;
};
