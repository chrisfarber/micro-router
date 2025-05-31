/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

export type NoParams = null;
export type ValidParams = NoParams | Record<string, unknown> | string | number;
export interface Path<
  Pathname extends string = string,
  Params extends ValidParams = any,
> {
  readonly path: Pathname;
  readonly _params: Params;
  match(input: string): MatchResult<Params>;
  make(params: Params): string;
}

export type ParamsOf<P extends Path> = P["_params"];
export type PathOf<P extends Path> = P["path"];

export type MatchError = {
  readonly error: true;
  readonly description?: string;
};
export type MatchSuccess<P = any> = {
  readonly error: false;
  readonly params: P;
  readonly remaining: string;
};
export type MatchResult<P = any> = MatchError | MatchSuccess<P>;

const makeError = (descr?: string): MatchError =>
  descr ? { error: true, description: descr } : { error: true };

type StripLeadingSlash<S extends string> = S extends `/${infer R}`
  ? StripLeadingSlash<R>
  : S;
type LeadingSlash<S extends string> = `/${StripLeadingSlash<S>}`;

export type ConstPath<P extends string = string> = Path<P, NoParams>;
export type ParametricPath<
  P extends string = string,
  Params extends Record<string, unknown> = Record<string, unknown>,
> = Path<P, Params>;

export type TypeIndicator<T extends string> = `[${T}]`;
export type StringTypeIndicator = TypeIndicator<"string">;

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
  return (input: string): boolean =>
    input.substring(0, toMatch.length).toLocaleLowerCase() === toMatch;
};

/**
 * A primitive that will succeed if the path being matched against starts with the provided `text`.
 * Any additional text in the input string will not affect the match.
 */
export const text = <T extends string>(
  text: T,
  options?: TextOptions,
): ConstPath<T> => {
  const caseSensitive = options?.caseSensitive;
  const match = (
    caseSensitive ? matchTextCaseSensitive : matchTextCaseInsensitive
  )(text);
  return {
    _params: null as any,
    path: text,
    match(input) {
      if (match(input)) {
        return {
          error: false,
          params: null,
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

type MatchRegexpOpts<K extends string> = {
  regexp: RegExp;
  path?: K;
};
/**
 * A path that will succeed if the provided regexp matches.
 *
 * The regexp must capture two groups:
 * - the first group will be extracted as the string params
 * - the second must be the remainder of the input path to process
 */
export const matchRegexp = <P extends string = StringTypeIndicator>({
  regexp,
  path: key,
}: MatchRegexpOpts<P>): Path<P, string> => {
  return {
    _params: null as any,
    path: key ?? ("[string]" as any),
    match(input) {
      const res = input.match(regexp);
      if (!res) {
        return makeError(`regexp (${regexp.source}) did not match: "${input}"`);
      }
      const [_, str, rest] = res;
      if (str === undefined || rest === undefined) {
        return makeError(
          `regexp ${regexp.source} failed to yield two capture groups from: "${input}"`,
        );
      }
      return {
        error: false,
        params: str,
        remaining: rest,
      };
    },
    make: s => s,
  };
};

type Isomorphism<L, R> = {
  to: (left: L) => R;
  from: (right: R) => L;
};

export type MappedPath<P extends Path, To extends ValidParams> = Path<
  PathOf<P>,
  To
>;

export const mapParams = <P extends Path, R extends ValidParams>(
  path: P,
  iso: Isomorphism<ParamsOf<P>, R>,
): MappedPath<P, R> => {
  return {
    path: path.path,
    _params: null as any,
    match: input => {
      const res = path.match(input);
      if (res.error) {
        return res;
      }
      try {
        return {
          ...res,
          params: iso.to(res.params),
        };
      } catch (e) {
        return {
          error: true,
          // TODO consider adding a cause field to the MatchError type
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          description: `${e}`,
        };
      }
    },
    make: params => path.make(iso.from(params)),
  } satisfies MappedPath<P, R>;
};

type WrapTypeIndicator<P extends string> =
  P extends TypeIndicator<infer T>
    ? T extends "string"
      ? ""
      : P
    : TypeIndicator<P>;
const typeIndicatorRegexp = /^\[?([^[\]]+)\]?$/;
const wrap = (s: string): string => {
  if (s === "[string]") return "";
  const res = s.match(typeIndicatorRegexp);
  if (!res) return `[${s}]`;
  const [_, match] = res;
  return `[${match ?? ""}]`;
};

type Keyed<K extends string, P extends string> = `:${K}${WrapTypeIndicator<P>}`;
export const keyAs = <K extends string, P extends Path>(
  key: K,
  path: P,
): Path<Keyed<K, PathOf<P>>, { [key in K]: ParamsOf<P> }> => {
  const pathStr = `:${key}${wrap(path.path)}` as const;
  return {
    ...mapParams(path, { to: p => ({ [key]: p }), from: p => p[key] }),
    path: pathStr as any,
    _params: null as any,
  } as Path<any>;
};

/**
 * A Path that consumes the input text into a param.
 * This matching occurs greedily; you can expect it to consume the entire path.
 * Therefore, you probably want to use the segment wrapped version instead, `string`.
 */
export const parseString: Path<StringTypeIndicator, string> = matchRegexp({
  regexp: /^(.+)($)/,
});

/**
 * A path that succeeds if it can parse the beginning of the input as a base 10 number.
 *
 * Not greedy, unlike `parseString`. It is incompatible with leading slashes, however,
 * so you'll almost certainly want to wrap this in a segment or use the `number` Path.
 */
export const parseNumber: Path<TypeIndicator<"number">, number> = mapParams(
  matchRegexp({
    path: "[number]" as const,
    regexp: /^(\d*\.?\d+)(.*)$/,
  }),
  {
    to(left) {
      const num = Number(left);
      if (isNaN(num)) {
        throw new Error(`input parsed as NaN: "${left}"`);
      }
      return num;
    },
    from(right) {
      return right.toString();
    },
  },
);

type Segment<P extends Path> = Path<LeadingSlash<P["path"]>, P["_params"]>;
/**
 * A segment considers the contents between the start of the string (ignoring any initial path
 * separator) and the first encountered path separator ("/").
 *
 * The resulting Path will fail if the inner path does not consume the entire first path segment, or
 * if the first path segment is empty. Otherwise, it succeeds if the inner Path succeeds.
 */
export const segment = <P extends Path>(inner: P): Segment<P> =>
  mapParams(
    matchRegexp({
      path: `/${inner.path}` as LeadingSlash<PathOf<P>>,
      regexp: /^\/?([^/]*)($|\/.*)/,
    }),
    {
      to(left) {
        const innerMatch = inner.match(left);
        if (innerMatch.error) {
          throw new Error(innerMatch.description ?? "??");
        }
        if (innerMatch.remaining !== "") {
          throw new Error(
            `segment text "${left}" matched the inner path, but had unused input "${innerMatch.remaining}"`,
          );
        }
        return innerMatch.params;
      },
      from: right => `/${inner.make(right)}`,
    },
  );

/**
 * A Path that, when matching, will consume a path segment as a string and capture it as the key
 * `key` of Params.
 */
export const string = <K extends string>(key: K) =>
  segment(keyAs(key, parseString));
/**
 * A Path that will consume a path segment and parse it as a number, capturing it as the key `key`
 * of Params.
 */
export const number = <K extends string>(key: K) =>
  segment(keyAs(key, parseNumber));

type MergeParams<L, R> = L extends NoParams
  ? R
  : R extends NoParams
    ? L
    : R & L;
type ConcatenatedPaths<Ps extends Path[]> = Ps extends [
  infer P extends Path,
  infer P2 extends Path,
  ...infer Rest extends Path[],
]
  ? ConcatenatedPaths<
      [
        Path<
          `${P["path"]}${P2["path"]}`,
          MergeParams<ParamsOf<P>, ParamsOf<P2>>
        >,
        ...Rest,
      ]
    >
  : Ps[0];
/**
 * Combine many Path definitions with no separator.
 * Succeeds if all inner Paths succeed.
 * You probably want to use `path` instead.
 */
export const concat = <Ps extends Path[]>(
  ...parts: Ps
): ConcatenatedPaths<Ps> => {
  const path = {
    _params: null as any,
    path: parts.map(r => r.path).join("") as any,
    match(input: string) {
      let remaining = input;
      let params: null | Record<string, any> = null;
      for (const p of parts) {
        const matched = p.match(remaining);
        if (matched.error) {
          return matched;
        }
        remaining = matched.remaining;
        if (matched.params !== null) {
          params = { ...(params ?? {}), ...matched.params };
        }
      }
      return { error: false, params, remaining };
    },
    make(params) {
      return parts.map(r => r.make(params)).join("");
    },
  } as ConcatenatedPaths<Ps>;

  return path;
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
  ) as TextSegments<T>;
};

type PathOrText = Path | string;
type PathOrTextToPath<P extends PathOrText> = P extends string
  ? TextSegments<P>
  : P;
type ParamsOfPT<P extends PathOrText> = ParamsOf<PathOrTextToPath<P>>;
type CombinedPath<Ps extends PathOrText[]> = Ps extends [
  infer P extends PathOrText,
  infer P2 extends PathOrText,
  ...infer Rest extends PathOrText[],
]
  ? CombinedPath<
      [
        Path<
          `${PathOrTextToPath<P>["path"]}${PathOrTextToPath<P2>["path"]}`,
          ParamsOfPT<P> extends NoParams
            ? ParamsOfPT<P2>
            : ParamsOfPT<P2> extends NoParams
              ? ParamsOfPT<P>
              : {
                  [K in
                    | keyof ParamsOfPT<P>
                    | keyof ParamsOfPT<P2>]: K extends keyof ParamsOfPT<P2>
                    ? ParamsOfPT<P2>[K]
                    : K extends keyof ParamsOfPT<P>
                      ? ParamsOfPT<P>[K]
                      : never;
                }
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
export const path = <Ps extends PathOrText[]>(
  ...paths: Ps
): CombinedPath<Ps> => {
  if (paths.length < 1) return undefined as any;
  return concat(
    ...paths.map(part => {
      if (typeof part === "string") {
        return textSegments(part);
      }
      return part;
    }),
  ) as CombinedPath<Ps>;
};
