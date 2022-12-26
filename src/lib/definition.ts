/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
export interface Route<Path extends string = any, Params extends Record<never, never> = any> {
  path: Path;
  _params: Params;
  match(input: string): MatchResult<Params>;
  make(params: Params): string;
}

type ParamsOf<R extends Route> = R["_params"];

type MatchError = { error: true; description?: string };
type MatchSuccess<P> = { error: false; params: P; remaining: string };
type MatchResult<P> = MatchError | MatchSuccess<P>;

type SubPath<Path extends string, Sub extends string> = `${LeadingSlash<Path>}${LeadingSlash<Sub>}`;
type PathOf<R extends Route> = R["path"];

type StripLeadingSlash<S extends string> = S extends `/${infer R}` ? StripLeadingSlash<R> : S;
type LeadingSlash<S extends string> = `/${StripLeadingSlash<S>}`;

type TextRoute<P extends string> = Route<P, Record<never, never>>;
export const text = <T extends string>(text: T): Route<T, Record<never, never>> => {
  return {
    _params: null as any,
    path: text,
    match(input) {
      if (input.startsWith(text)) {
        return {
          error: false,
          params: {},
          remaining: input.substring(text.length),
        };
      } else {
        return {
          error: true,
          description: `expected "${text}", found: "${input}"`,
        };
      }
    },
    make() {
      return text;
    },
  };
};

// TODO this regexp is broken
const stringParamRegexp = /^[0-9A-Za-z_\\-]+/;
/** Matches the input text until one of the following characters are encountered: "/?#". Extracts
 * the value into the supplied params. */
export const stringParam = <K extends string>(key: K): Route<`:${K}`, Record<K, string>> => {
  return {
    _params: null as any,
    path: `:${key}`,
    match(input) {
      const match = input.match(stringParamRegexp);
      if (!match) {
        return {
          error: true,
          description: `expected to find string param ":${key}", found: "${input}"`,
        };
      }
      const [found] = match;
      return {
        error: false,
        params: { [key]: found } as Record<K, string>,
        remaining: input.substring(found.length),
      };
    },
    make(params) {
      return params[key];
    },
  };
};

type SegmentContaining<R extends Route> = R["path"] extends `${any}/${any}`
  ? never
  : Route<`/${R["path"]}`, R["_params"]>;
export const segment = <R extends Route>(
  inner: R extends Route<`${any}/${any}`, any> ? never : R,
): SegmentContaining<R> => {
  return undefined as any;
};

type SegmentedText<T extends string> = TextRoute<LeadingSlash<T>>;
/**
 * Declare a Route that matches several
 * @param path A URL fragment, optionally beginning with a leading slash. The slash will be inferred if not.
 * @returns
 */
export const segmentedText = <T extends string>(path: T): SegmentedText<T> => {
  return text(
    `/${path
      .split("/")
      .filter(part => part !== "")
      .join("/")}`,
  ) as any;
};

const wat = segmentedText("hello/there");

type ConcatenatedRoutes<Rs extends Route[]> = Rs extends [
  infer R extends Route,
  infer R2 extends Route,
  ...infer Rest extends Route[],
]
  ? ConcatenatedRoutes<[Route<`${R["path"]}${R2["path"]}`, R["_params"] & R2["_params"]>, ...Rest]>
  : Rs[0];
export const concat = <Rs extends Route[]>(...routes: Rs): ConcatenatedRoutes<Rs> => {
  const route: Route<any, any> = {
    _params: null as any,
    path: routes.map(r => r.path).join("") as any,
    match(input: string) {
      let remaining = input;
      let params: Record<string, any> = {};
      for (const r of routes) {
        const matched = r.match(remaining);
        if (matched.error) {
          return matched;
        }
        remaining = matched.remaining;
        params = { ...params, ...matched.params };
      }
      return { error: false, params, remaining };
    },
    make(params) {
      return routes.map(r => r.make(params)).join("");
    },
  };

  return route as any;
};

type RouteOrText = Route | string;
type RouteOrTextToRoute<R extends RouteOrText> = R extends string ? TextRoute<LeadingSlash<R>> : R;
type NormParamsBeforeMerge<P> = P;
type PathConcatenatedRoutes<Rs extends RouteOrText[]> = Rs extends [
  infer R extends RouteOrText,
  infer R2 extends RouteOrText,
  ...infer Rest extends RouteOrText[],
]
  ? PathConcatenatedRoutes<
      [
        Route<
          `${RouteOrTextToRoute<R>["path"]}${RouteOrTextToRoute<R2>["path"]}`,
          NormParamsBeforeMerge<RouteOrTextToRoute<R>["_params"]> &
            NormParamsBeforeMerge<RouteOrTextToRoute<R2>["_params"]>
        >,
        ...Rest,
      ]
    >
  : RouteOrTextToRoute<Rs[0]>;

export const path = <Rs extends RouteOrText[]>(...routes: Rs): PathConcatenatedRoutes<Rs> => {
  // TODO implement
  return undefined as any;
};
