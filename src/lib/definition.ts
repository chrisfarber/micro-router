/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
export interface Path<Pathname extends string = any, Params extends Record<never, never> = any> {
  path: Pathname;
  _params: Params;
  match(input: string): MatchResult<Params>;
  make(params: Params): string;
}

type ParamsOf<P extends Path> = P["_params"];
type PathOf<P extends Path> = P["path"];

type MatchError = { error: true; description?: string };
type MatchSuccess<P> = { error: false; params: P; remaining: string };
type MatchResult<P> = MatchError | MatchSuccess<P>;

type StripLeadingSlash<S extends string> = S extends `/${infer R}` ? StripLeadingSlash<R> : S;
type LeadingSlash<S extends string> = `/${StripLeadingSlash<S>}`;

type ConstPath<P extends string> = Path<P, Record<never, never>>;

type TextOptions = {
  /** defaults to false */
  caseSensitive?: boolean;
};

const matchTextCaseSensitive =
  (text: string) =>
  (input: string): boolean =>
    input.startsWith(text);

const matchTextCaseInsensitive = (text: string) => {
  const toMatch = text.toLocaleLowerCase();
  return (input: string): boolean => {
    return input.substring(0, toMatch.length).toLocaleLowerCase() === toMatch;
  };
};

/** A primitive that will succeed if the path being matched against starts with the provided `text`.
 * Any additional text in the input string will not affect the match.
 */
export const text = <T extends string>(text: T, options?: TextOptions): ConstPath<T> => {
  const caseSensitive = options?.caseSensitive;
  const match = (caseSensitive ? matchTextCaseSensitive : matchTextCaseInsensitive)(text);
  return {
    _params: null as any,
    path: text,
    match(input) {
      if (match(input)) {
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
        // TODO figure out why vite build complains about this:
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        remaining: input.substring(found!.length),
      };
    },
    make(params) {
      return params[key];
    },
  };
};

const segmentRegexp = /^\/?([^/]*)($|\/.*)/;
export const segment = <P extends Path>(
  inner: P extends Path<`${any}/${any}`, any> ? never : P,
): Path<`/${P["path"]}`, P["_params"]> => {
  return {
    _params: null as any,
    path: `/${inner.path}` as any,
    match(input) {
      const res = input.match(segmentRegexp);
      if (!res) {
        return { error: true, description: `input did not appear to be a path segment: "${input}"` };
      }
      const [_, str, rest] = res;
      if (str === undefined || rest === undefined) {
        return { error: true, description: `segment regexp failed` };
      }
      const innerMatch = inner.match(str);
      if (innerMatch.error) {
        return innerMatch;
      }
      if (innerMatch.remaining !== "") {
        return {
          error: true,
          description: `segment text "${str}" matched the inner path, but had unused input "${innerMatch.remaining}"`,
        };
      }
      return { ...innerMatch, remaining: rest };
    },
    make(params) {
      return `/${inner.make(params)}`;
    },
  };
};

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

  return path as ConcatenatedPaths<Rs>;
};

type TextSegments<T extends string> = ConstPath<LeadingSlash<T>>;
/**
 * A path that matches on complete segments of the input text.
 *
 * This path will fail to match if there is any extra text at the end of the last matching path segment.
 *
 * @param path A URL fragment, optionally beginning with a leading slash. The slash will be inferred if not.
 * @returns
 */
export const textSegments = <T extends string>(path: T): TextSegments<T> => {
  // although kind of elegant, if this proves to be a performance bottleneck, I should refactor this
  // to simply be a single text match + a check that we've consumed the end of the current segment.
  return concat(
    ...path
      .split("/")
      .filter(part => part !== "")
      .map(part => segment(text(part))),
  ) as Path;
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
