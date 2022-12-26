/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
export interface Path<Pathname extends string = any, Params extends Record<never, never> = any> {
  path: Pathname;
  _params: Params;
  match(input: string): MatchResult<Params>;
  make(params: Params): string;
}

type ParamsOf<R extends Path> = R["_params"];

type MatchError = { error: true; description?: string };
type MatchSuccess<P> = { error: false; params: P; remaining: string };
type MatchResult<P> = MatchError | MatchSuccess<P>;

type SubPath<Path extends string, Sub extends string> = `${LeadingSlash<Path>}${LeadingSlash<Sub>}`;
type PathOf<R extends Path> = R["path"];

type StripLeadingSlash<S extends string> = S extends `/${infer R}` ? StripLeadingSlash<R> : S;
type LeadingSlash<S extends string> = `/${StripLeadingSlash<S>}`;

type ConstPath<P extends string> = Path<P, Record<never, never>>;
export const text = <T extends string>(text: T): ConstPath<T> => {
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
export const stringParam = <K extends string>(key: K): Path<`:${K}`, Record<K, string>> => {
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

type SegmentContaining<P extends Path> = P["path"] extends `${any}/${any}`
  ? never
  : Path<`/${P["path"]}`, P["_params"]>;
export const segment = <R extends Path>(
  inner: R extends Path<`${any}/${any}`, any> ? never : R,
): SegmentContaining<R> => {
  return undefined as any;
};

type SegmentedText<T extends string> = ConstPath<LeadingSlash<T>>;
/**
 * Declare a Path that matches several
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

type ConcatenatedPaths<Ps extends Path[]> = Ps extends [
  infer P extends Path,
  infer P2 extends Path,
  ...infer Rest extends Path[],
]
  ? ConcatenatedPaths<[Path<`${P["path"]}${P2["path"]}`, P["_params"] & P2["_params"]>, ...Rest]>
  : Ps[0];
/**
 * Combine two Path definitions with no separator.
 */
export const concat = <Rs extends Path[]>(...parts: Rs): ConcatenatedPaths<Rs> => {
  const path: Path<any, any> = {
    _params: null as any,
    path: parts.map(r => r.path).join("") as any,
    match(input: string) {
      let remaining = input;
      let params: Record<string, any> = {};
      for (const r of parts) {
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
      return parts.map(r => r.make(params)).join("");
    },
  };

  return path as any;
};

type PathOrText = Path | string;
type PathOrTextToPath<P extends PathOrText> = P extends string ? ConstPath<LeadingSlash<P>> : P;
type NormParamsBeforeMerge<P> = P;
type SegmentedPath<Ps extends PathOrText[]> = Ps extends [
  infer P extends PathOrText,
  infer P2 extends PathOrText,
  ...infer Rest extends PathOrText[],
]
  ? SegmentedPath<
      [
        Path<
          `${PathOrTextToPath<P>["path"]}${PathOrTextToPath<P2>["path"]}`,
          NormParamsBeforeMerge<PathOrTextToPath<P>["_params"]> &
            NormParamsBeforeMerge<PathOrTextToPath<P2>["_params"]>
        >,
        ...Rest,
      ]
    >
  : PathOrTextToPath<Ps[0]>;

export const path = <Rs extends PathOrText[]>(...paths: Rs): SegmentedPath<Rs> => {
  // TODO implement
  return undefined as any;
};
