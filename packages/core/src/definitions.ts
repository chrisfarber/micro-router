/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */

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

export type DataOfPath<P extends Path> = P["_data"];
export type ReadableRepresentationOfPath<P extends Path> = P["path"];

export type MatchFailure = {
  readonly ok: false;
  readonly cause?: Error;
};
export type MatchSuccess<Data = any> = {
  readonly ok: true;
  readonly data: Data;
  readonly remaining: string;
  readonly captures: number;
};
export type MatchResult<P = any> = MatchFailure | MatchSuccess<P>;

export type MatchSuccessForPath<P extends Path> = MatchSuccess<DataOfPath<P>>;

export type StripLeadingSlash<S extends string> = S extends `/${infer R}`
  ? StripLeadingSlash<R>
  : S;
export type LeadingSlash<S extends string> = `/${StripLeadingSlash<S>}`;

export type ConstPath<P extends string = string> = Path<P, NoData>;
export type ParametricPath<
  P extends string = string,
  Data extends Record<string, unknown> = Record<string, unknown>,
> = Path<P, Data>;

export type TypeIndicator<T extends string> = `[${T}]`;
export type StringTypeIndicator = TypeIndicator<"string">;

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
