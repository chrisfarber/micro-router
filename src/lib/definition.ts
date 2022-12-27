/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
export interface Path<Pathname extends string = any, Params extends Record<never, never> = any> {
  readonly path: Pathname;
  readonly _params: Params;
  match(input: string): MatchResult<Params>;
  make(params: Params): string;
}

type ParamsOf<P extends Path> = P["_params"];
type PathOf<P extends Path> = P["path"];

type MatchError = { readonly error: true; readonly description?: string };
type MatchSuccess<P> = { readonly error: false; readonly params: P; readonly remaining: string };
type MatchResult<P> = MatchError | MatchSuccess<P>;

const makeError = (descr?: string): MatchError =>
  descr ? { error: true, description: descr } : { error: true };

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
        return makeError(`expected "${text}", found: "${input}"`);
      }
    },
    make() {
      return text;
    },
  };
};

type StringPath<K extends string> = Path<`:${K}`, Record<K, string>>;
/** A Path that consumes the input text into a param.
 * This matching occurs greedily; you can expect it to consume the entire path.
 * Therefore, you probably want to use the segment wrapped version instead, `string`.
 */
export const parseString = <K extends string>(key: K): StringPath<K> => {
  return {
    _params: null as any,
    path: `:${key}`,
    match(input) {
      if (input.length < 1) {
        return makeError(`parseString for :${key} expected a non-empty input`);
      }
      return {
        error: false,
        params: { [key]: input } as Record<K, string>,
        remaining: "",
      };
    },
    make(params) {
      return params[key];
    },
  };
};

const numberRegexp = /^(\d*\.?\d+)(.*)$/;
type NumberPath<K extends string> = Path<`:${K}`, Record<K, number>>;
/**
 * A path that succeeds if it can parse the beginning of the input as a base 10 number.
 *
 * Not greedy, unlike `parseString`. It is incompatible with leading slashes, however,
 * so you'll almost certainly want to wrap this in a segment or use the `number` Path.
 */
export const parseNumber = <K extends string>(key: K): NumberPath<K> => ({
  _params: null as any,
  path: `:${key}`,
  match(input) {
    const res = input.match(numberRegexp);
    if (!res) {
      return makeError(`input did not appear to be a number: "${input}"`);
    }
    const [_, nStr, rest] = res;
    if (nStr === undefined || rest === undefined) {
      return makeError("numberRegexp failed");
    }
    const num = Number(nStr);
    if (isNaN(num)) {
      return makeError(`parsed as NaN: "${nStr}"`);
    }
    return {
      error: false,
      params: { [key]: num } as Record<K, number>,
      remaining: rest,
    };
  },
  make(params) {
    return `${params[key]}`;
  },
});

type Segment<P extends Path> = Path<`/${P["path"]}`, P["_params"]>;
const segmentRegexp = /^\/?([^/]*)($|\/.*)/;
export const segment = <P extends Path>(inner: P): Segment<P> => {
  return {
    _params: null as any,
    path: `/${inner.path}` as any,
    match(input) {
      const res = input.match(segmentRegexp);
      if (!res) {
        return makeError(`input did not appear to be a path segment: "${input}"`);
      }
      const [_, str, rest] = res;
      if (str === undefined || rest === undefined) {
        return makeError(`segment regexp failed`);
      }
      const innerMatch = inner.match(str);
      if (innerMatch.error) {
        return innerMatch;
      }
      if (innerMatch.remaining !== "") {
        return makeError(
          `segment text "${str}" matched the inner path, but had unused input "${innerMatch.remaining}"`,
        );
      }
      return { ...innerMatch, remaining: rest };
    },
    make(params) {
      return `/${inner.make(params)}`;
    },
  };
};

/**
 * A Path that, when matching, will consume the entire first path segment as a string and
 * capture it as the key `key` of Params.
 */
export const string = <K extends string>(key: K) => segment(parseString(key));
/**
 * A Path that will consume the entire first path segment and parse it as a number, capturing
 * it as the key `key` of Params.
 */
export const number = <K extends string>(key: K) => segment(parseNumber(key));

type ConcatenatedPaths<Ps extends Path[]> = Ps extends [
  infer P extends Path,
  infer P2 extends Path,
  ...infer Rest extends Path[],
]
  ? ConcatenatedPaths<[Path<`${P["path"]}${P2["path"]}`, P["_params"] & P2["_params"]>, ...Rest]>
  : Ps[0];
/**
 * Combine two Path definitions with no separator.
 * You probably want to use `path` instead.
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
type PathOrTextToPath<P extends PathOrText> = P extends string ? TextSegments<P> : P;
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

/**
 * Define a Path by combining the individual input `paths` in order.
 *
 * This is the recommended way to construct paths.
 *
 * The inputs can be other paths or literal strings. Any literal strings provided will be converted into
 * paths by use of the `textSegments` path constructor.
 */
export const path = <Ps extends PathOrText[]>(...paths: Ps): SegmentedPath<Ps> => {
  if (paths.length < 1) return undefined as any;
  return concat(
    ...paths.map(part => {
      if (typeof part === "string") {
        return textSegments(part);
      }
      return part;
    }),
  ) as SegmentedPath<Ps>;
};
