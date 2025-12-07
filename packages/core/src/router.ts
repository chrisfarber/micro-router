/* eslint-disable @typescript-eslint/no-explicit-any */

import type { DataOfPath, MatchSuccess, Path } from "./definitions";

type MatchSuccessForPath<P extends Path> = MatchSuccess<DataOfPath<P>>;
type RouteHandler<P extends Path = Path, R = unknown> = (
  result: MatchSuccessForPath<P>,
) => R;
type HandlerPair<P extends Path = Path, R = unknown> = [P, RouteHandler<P, R>];

/**
 * When multiple paths match a given URL string, a MatchComparator is used
 * to preferentially select one of the matches.
 *
 * A comparator should return:
 * - `-1` if `a` is a more desirable match than `b`
 * - `1` if `b` is a more desirable match than `a`
 * - `0` if they can't be differentiated
 */
export type MatchComparator = (a: MatchSuccess, b: MatchSuccess) => number;

/**
 * A `MatchComparator` that prefers matches that consumed more of the input URL
 * string.
 */
export const longestMatchComparator: MatchComparator = (a, b) => {
  const al = a.remaining.length;
  const bl = b.remaining.length;
  if (al < bl) {
    return -1;
  }
  if (al === bl) {
    return 0;
  }
  return 1;
};

/**
 * A `MatchComparator` that tries to intelligently choose the best match.
 *
 * It will prefer matches that consume the most of the input URL string.
 * However, as a tie breaker, it will also consider the number of dynamic
 * captures and preferentially choose the result with _fewer_ captures.
 *
 * For example, consider these two paths:
 * 1. `path("/users/all")`
 * 2. `path("users", string("id"))`
 *
 * Both paths will result in a successful match for the input string
 * `"/users/all"`, but the first path will be considered a better match.
 */
export const bestMatchComparator: MatchComparator = (a, b) => {
  const {
    remaining: { length: al },
    captures: ac,
  } = a;
  const {
    remaining: { length: bl },
    captures: bc,
  } = b;

  if (al < bl) {
    return -1;
  }
  if (al === bl) {
    if (ac < bc) {
      return -1;
    }
    if (ac === bc) {
      return 0;
    }
  }
  return 1;
};

type DefaultHandler<R> = (input: string) => R;

const exhaustiveDefault: DefaultHandler<any> = (input: string) => {
  throw new Error(`router had no handler matching: "${input}"`);
};

const nullDefault: DefaultHandler<null> = () => null;

export type RouterOpts = {
  /**
   * When multiple paths match a dispatched input, the comparator is used
   * to determine which match should be considered the "best" match.
   *
   * @default `bestMatchComparator`
   */
  comparator?: MatchComparator;
};

class RouterBuilder {
  constructor(opts?: RouterOpts) {
    const { comparator = bestMatchComparator } = opts ?? {};
    this.#comparator = comparator;
  }

  #comparator: MatchComparator;
  #handlers: HandlerPair<Path, any>[] = [];
  #defaultHandler: DefaultHandler<any> = nullDefault;

  on<P extends Path>(path: P, handler: RouteHandler<P, any>): this {
    this.#handlers.push([path, handler as RouteHandler<Path, any>]);
    return this;
  }

  default(handler: DefaultHandler<any>): this {
    this.#defaultHandler = handler;
    return this;
  }

  exhaustive(): this {
    this.#defaultHandler = exhaustiveDefault;
    return this;
  }

  dispatch(input: string): any {
    let best: [MatchSuccess, RouteHandler<any, any>] | null = null;
    for (const [path, handler] of this.#handlers) {
      const result = path.match(input);
      if (result.ok) {
        if (!best || this.#comparator(best[0], result) > 0)
          best = [result, handler];
      }
    }
    if (best) {
      return best[1](best[0]);
    }
    return this.#defaultHandler(input);
  }
}

export type Router<
  Result = never,
  KnownResult extends boolean = false,
  Exhaustive extends boolean = false,
> = {
  /**
   * Register a handler with the router. When input is dispatched to
   * the router, the provided handler will be invoked iff the provided path
   * is considered to be the best possible match to the input.
   *
   * @param path will be matched against input that is provided via
   * `.dispatch()`
   * @param handler will be invoked iff the provided path is considered to be
   * the best match.
   */
  on<
    P extends Path,
    Handler extends KnownResult extends true
      ? RouteHandler<P, Result>
      : RouteHandler<P, any>,
  >(
    path: P,
    handler: Handler,
  ): Router<
    KnownResult extends true ? Result : Result | ReturnType<Handler>,
    KnownResult,
    Exhaustive
  >;

  /**
   * Provide a handler to the router that will compute a default value when
   * none of its registered paths match the input being dispatched.
   */
  default<
    DefaultHandler extends KnownResult extends true ? () => Result : () => any,
  >(
    f: DefaultHandler,
  ): Router<
    KnownResult extends true ? Result : Result | ReturnType<DefaultHandler>,
    KnownResult,
    true
  >;

  /**
   * Calling this method will cause the router to throw an Error when none
   * of its registered paths match the input being dispatched.
   */
  exhaustive(): Router<Result, KnownResult, true>;

  /**
   * Matches all of this router's registered paths against the provided input string.
   *
   * If at least one registered path matches the input string, this method
   * will determine the one registered path that best matches the input, using
   * the strategy determined by the provided `comparator`.
   *
   * Only the handler for the best matching path will be called. Its return value,
   * if any, will be returned from this method.
   *
   * If no paths match, but a default handler has been supplied, that handler
   * will be called and its return value will be returned.
   *
   * If no paths match, but `.exhaustive()` has been called, then this method
   * will throw an exception.
   *
   * Otherwise, `null` will be returned.
   */
  dispatch(input: string): Exhaustive extends true ? Result : Result | null;
};

/**
 * Construct a Router.
 *
 * Routers may be used for side effects or for computing values. In either case,
 * a `Result` type may be provided. When provided, the router will ensure that
 * handlers' return values match the provided `Result` type. Otherwise, handlers
 * will be allowed to return any type of data; the router's `.dispatch()` method
 * will then indicate all of the possible types that could be returned.
 *
 * Routers are inherently mutable, but, should only be used in a builder style.
 * This allows the type system to collect information about the various handlers.
 */
/* @__NO_SIDE_EFFECTS__ */
export const router = <Result = never>(
  opts?: RouterOpts,
): Router<Result, [Result] extends [never] ? false : true> => {
  return new RouterBuilder(opts);
};
