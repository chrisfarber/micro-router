/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

export type NoData = null;
export type ValidData = NoData | Record<string, unknown> | string | number;
export interface Path<
  Pathname extends string = string,
  Data extends ValidData = any,
> {
  readonly path: Pathname;
  readonly _data: Data;

  /**
   * The number of dynamic data captures in this path pattern.
   *
   * Static paths have 0 captures (e.g., `path("/message/inbox")`)
   * Dynamic paths have 1+ captures (e.g., `path("/users", string("id"))` has 1)
   *
   * This is useful for route specificity comparison:
   * When multiple routes match the same input with equal remaining text,
   * the route with fewer captures should be preferred as it is more specific.
   *
   * @example
   * ```typescript
   * const static = path("/message/inbox");        // captures: 0
   * const dynamic = path("/message", string("id")); // captures: 1
   *
   * // Both match "/message/inbox", but static route should win
   * // because it has fewer captures (more specific)
   * ```
   */
  readonly captures: number;

  /**
   * Attempts to match this path pattern against the input string.
   *
   * @param input - The URL path to match against
   * @returns A MatchResult indicating success or failure with extracted data
   */
  match(input: string): MatchResult<Data>;

  /**
   * Generates a URL path from the provided data.
   *
   * @param data - The data to use for generating the path
   * @returns The generated URL path string
   */
  make(data: Data): string;
}

export type DataOf<P extends Path> = P["_data"];
export type PathOf<P extends Path> = P["path"];

export type MatchFailure = {
  readonly ok: false;
  readonly cause?: Error;
};
export type MatchSuccess<P = any> = {
  readonly ok: true;
  readonly data: P;
  readonly remaining: string;
};
export type MatchResult<P = any> = MatchFailure | MatchSuccess<P>;

/* @__NO_SIDE_EFFECTS__ */
export const makePath = <Pathname extends string, Data extends ValidData>(
  path: Pathname,
  match: (input: string) => MatchResult<Data>,
  make: (data: Data) => string,
  captures: number,
): Path<Pathname, Data> => ({
  _data: null as any,
  path,
  match,
  make,
  captures,
});

/* @__NO_SIDE_EFFECTS__ */
export const makeFailure = (cause?: Error): MatchFailure => ({
  ok: false,
  cause,
});

type StripLeadingSlash<S extends string> = S extends `/${infer R}`
  ? StripLeadingSlash<R>
  : S;
type LeadingSlash<S extends string> = `/${StripLeadingSlash<S>}`;

export type ConstPath<P extends string = string> = Path<P, NoData>;
export type ParametricPath<
  P extends string = string,
  Data extends Record<string, unknown> = Record<string, unknown>,
> = Path<P, Data>;

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
/* @__NO_SIDE_EFFECTS__ */
export const matchText = <T extends string>(
  text: T,
  options?: TextOptions,
): ConstPath<T> => {
  const caseSensitive = options?.caseSensitive;
  const matchFn = (
    caseSensitive ? matchTextCaseSensitive : matchTextCaseInsensitive
  )(text);
  return makePath(
    text,
    input => {
      if (matchFn(input)) {
        return {
          ok: true,
          data: null,
          remaining: input.substring(text.length),
        };
      } else {
        return makeFailure(new Error(`expected "${text}", found: "${input}"`));
      }
    },
    () => text,
    0, // captures
  );
};

/**
 * Combine an array of string literals into a single string literal, separated by the provided separator.
 */
export type JoinStringTypes<
  Vs extends readonly string[],
  Sep extends string,
> = Vs extends readonly [
  infer A extends string,
  infer B extends string,
  ...infer Rest extends string[],
]
  ? JoinStringTypes<[`${A}${Sep}${B}`, ...Rest], Sep>
  : Vs extends [infer A extends string]
    ? A
    : "";

/**
 * A primitive that will succeed if the path being matched against is exactly one of the provided string literals.
 * The data will be the matched string value.
 */
/* @__NO_SIDE_EFFECTS__ */
export function matchTextEnum<const T extends readonly string[]>(
  ...values: T
): Path<`(${JoinStringTypes<T, "|">})`, T[number]> {
  const set = new Set(values);
  const pathStr = `(${values.join("|")})` as `(${JoinStringTypes<T, "|">})`;
  return makePath(
    pathStr,
    input => {
      for (const v of set) {
        if (input.startsWith(v)) {
          return {
            ok: true,
            data: v as T[number],
            remaining: input.substring(v.length),
          };
        }
      }
      return makeFailure(
        new Error(`expected one of [${values.join(", ")}], found: "${input}"`),
      );
    },
    data => {
      if (!set.has(data)) {
        throw new Error(
          `Invalid value for matchTextEnum: ${data}. Allowed: [${values.join(", ")}].`,
        );
      }
      return data;
    },
    1, // captures - extracts which literal matched
  );
}

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
/* @__NO_SIDE_EFFECTS__ */
export const matchRegexp = <P extends string = StringTypeIndicator>({
  regexp,
  path: key,
}: MatchRegexpOpts<P>): Path<P, string> => {
  return makePath(
    key ?? ("[string]" as any),
    input => {
      const res = input.match(regexp);
      if (!res) {
        return makeFailure(
          new Error(`regexp (${regexp.source}) did not match: "${input}"`),
        );
      }
      const [_, str, rest] = res;
      if (str === undefined || rest === undefined) {
        return makeFailure(
          new Error(
            `regexp ${regexp.source} failed to yield two capture groups from: "${input}"`,
          ),
        );
      }
      return {
        ok: true,
        data: str,
        remaining: rest,
      };
    },
    s => s,
    1, // captures
  );
};

type Isomorphism<L, R> = {
  to: (left: L) => R;
  from: (right: R) => L;
};

export type MappedPath<P extends Path, To extends ValidData> = Path<
  PathOf<P>,
  To
>;

/* @__NO_SIDE_EFFECTS__ */
export const mapData = <P extends Path, R extends ValidData>(
  path: P,
  iso: Isomorphism<DataOf<P>, R>,
): MappedPath<P, R> => {
  return makePath<PathOf<P>, R>(
    path.path,
    input => {
      const res = path.match(input);
      if (!res.ok) {
        return res;
      }
      try {
        return {
          ...res,
          data: iso.to(res.data),
        };
      } catch (e) {
        return makeFailure(e instanceof Error ? e : new Error(String(e)));
      }
    },
    data => path.make(iso.from(data)),
    path.captures, // preserve captures
  );
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
/**
 * Creates a new Path that maps the params of the given `path` to an object with a single key.
 *
 * This is useful for assigning a name to a path parameter, so that the matched value is returned
 * as an object with the specified key, rather than as a raw value.
 *
 * For example, `keyAs("id", parseNumber)` will produce a Path that matches a number and returns
 * `{ id: number }` as params.
 *
 * @param key The name to assign to the matched parameter.
 * @param path The Path whose params will be wrapped under the given key.
 * @returns A new Path with params as an object keyed by `key`.
 */
/* @__NO_SIDE_EFFECTS__ */
export const keyAs = <K extends string, P extends Path>(
  key: K,
  path: P,
): Path<Keyed<K, PathOf<P>>, { [key in K]: DataOf<P> }> => {
  const pathStr = `:${key}${wrap(path.path)}` as const;
  return {
    ...mapData(path, { to: p => ({ [key]: p }), from: p => p[key] }),
    path: pathStr as any,
  } as Path<any>;
};

/**
 * A Path that consumes the input text into a data.
 * This matching occurs greedily; you can expect it to consume the entire path.
 * Therefore, you probably want to use the segment wrapped version instead, `string`.
 */
/* @__NO_SIDE_EFFECTS__ */
export const matchString: Path<StringTypeIndicator, string> = matchRegexp({
  regexp: /^(.+)($)/,
});

/**
 * A path that succeeds if it can parse the beginning of the input as a base 10 number.
 *
 * Not greedy, unlike `parseString`. It is incompatible with leading slashes, however,
 * so you'll almost certainly want to wrap this in a segment or use the `number` Path.
 */
/* @__NO_SIDE_EFFECTS__ */
export const matchNumber: Path<TypeIndicator<"number">, number> = mapData(
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

const ensureLeadingSlash = <S extends string>(s: S): LeadingSlash<S> => {
  if (s.startsWith("/")) {
    return s as LeadingSlash<S>;
  }
  return `/${s}` as LeadingSlash<S>;
};

type Segment<P extends Path> = Path<LeadingSlash<P["path"]>, P["_data"]>;
/**
 * A segment considers the contents between the start of the string (ignoring any initial path
 * separator) and the first encountered path separator ("/").
 *
 * The resulting Path will fail if the inner path does not consume the entire first path segment, or
 * if the first path segment is empty. Otherwise, it succeeds if the inner Path succeeds.
 */
/* @__NO_SIDE_EFFECTS__ */
export const segment = <P extends Path>(inner: P): Segment<P> => {
  const mapped = mapData(
    matchRegexp({
      path: ensureLeadingSlash(inner.path) as LeadingSlash<PathOf<P>>,
      regexp: /^\/?([^/]*)($|\/.*)/,
    }),
    {
      to(left) {
        const innerMatch = inner.match(left);
        if (!innerMatch.ok) {
          throw innerMatch.cause ?? new Error("??");
        }
        if (innerMatch.remaining !== "") {
          throw new Error(
            `segment text "${left}" matched the inner path, but had unused input "${innerMatch.remaining}"`,
          );
        }
        return innerMatch.data;
      },
      from: right => `/${inner.make(right)}`,
    },
  );
  // Override captures to match inner path, not the regexp
  return { ...mapped, captures: inner.captures };
};

/**
 * A Path that, when matching, will consume a path segment as a string and capture it as the key
 * `key` of Data.
 */
/* @__NO_SIDE_EFFECTS__ */
export const string = <K extends string>(key: K) =>
  segment(keyAs(key, matchString));
/**
 * A Path that will consume a path segment and parse it as a number, capturing it as the key `key`
 * of Data.
 */
/* @__NO_SIDE_EFFECTS__ */
export const number = <K extends string>(key: K) =>
  segment(keyAs(key, matchNumber));

type MergeData<L, R> = L extends NoData ? R : R extends NoData ? L : R & L;
type MergeParams<L, R> = L extends NoData ? R : R extends NoData ? L : R & L;
/**
 * Matches a single path segment against a set of allowed string literals.
 * Returns params as { [key]: value } if matched.
 *
 * Example:
 *   const color = textEnum({ key: "color", options: ["red", "blue", "green"] });
 *   color.match("/red") // { success: true, params: { color: "red" }, ... }
 */
export function textEnum<
  const K extends string,
  const T extends readonly string[],
>(args: { key: K; options: T }) {
  return segment(keyAs(args.key, matchTextEnum(...args.options)));
}
type ConcatenatedPaths<Ps extends Path[]> = Ps extends [
  infer P extends Path,
  infer P2 extends Path,
  ...infer Rest extends Path[],
]
  ? ConcatenatedPaths<
      [
        Path<`${P["path"]}${P2["path"]}`, MergeData<DataOf<P>, DataOf<P2>>>,
        ...Rest,
      ]
    >
  : Ps[0];
/**
 * Combine many Path definitions with no separator.
 * Succeeds if all inner Paths succeed.
 * You probably want to use `path` instead.
 */
/* @__NO_SIDE_EFFECTS__ */
export const concat = <Ps extends Path[]>(
  ...parts: Ps
): ConcatenatedPaths<Ps> => {
  const totalCaptures = parts.reduce((sum, p) => sum + p.captures, 0);
  return makePath(
    parts.map(r => r.path).join("") as any,
    input => {
      let remaining = input;
      let data: null | Record<string, any> = null;
      for (const p of parts) {
        const matched = p.match(remaining);
        if (!matched.ok) {
          return matched;
        }
        remaining = matched.remaining;
        if (matched.data !== null) {
          data = { ...(data ?? {}), ...matched.data };
        }
      }
      return { ok: true, data: data, remaining };
    },
    data => {
      return parts.map(r => r.make(data)).join("");
    },
    totalCaptures, // sum of all captures
  ) as ConcatenatedPaths<Ps>;
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
/* @__NO_SIDE_EFFECTS__ */
export const textSegments = <T extends string>(path: T): TextSegments<T> => {
  // although kind of elegant, if this proves to be a performance bottleneck, I should refactor this
  // to simply be a single text match + a check that we've consumed the end of the current segment.
  return concat(
    ...path
      .split("/")
      .filter(part => part !== "")
      .map(part => segment(matchText(part))),
  ) as TextSegments<T>;
};

type PathOrText = Path | string;
type PathOrTextToPath<P extends PathOrText> = P extends string
  ? Path<LeadingSlash<P>, NoData>
  : P;
type DataOfPT<P extends PathOrText> = DataOf<PathOrTextToPath<P>>;
type CombinedPath<Ps extends PathOrText[]> = Ps extends [
  infer P extends PathOrText,
  infer P2 extends PathOrText,
  ...infer Rest extends PathOrText[],
]
  ? CombinedPath<
      [
        Path<
          `${PathOrTextToPath<P>["path"]}${PathOrTextToPath<P2>["path"]}`,
          DataOfPT<P> extends NoData
            ? DataOfPT<P2>
            : DataOfPT<P2> extends NoData
              ? DataOfPT<P>
              : {
                  [K in
                    | keyof DataOfPT<P>
                    | keyof DataOfPT<P2>]: K extends keyof DataOfPT<P2>
                    ? DataOfPT<P2>[K]
                    : K extends keyof DataOfPT<P>
                      ? DataOfPT<P>[K]
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
/* @__NO_SIDE_EFFECTS__ */
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
