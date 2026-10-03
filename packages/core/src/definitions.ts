/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Codec } from "./codec";
import type { Prettify } from "./util";

/** Paths that do not emit any data emit null */
export type NoData = null;
/** Paths must emit data that's either null or a map of strings to data */
export type ValidData = NoData | Record<string, unknown>;
/** Merge two data; nulls are ignored */
export type MergeData<L extends ValidData, R extends ValidData> = Prettify<
  L extends null ? (R extends null ? null : R) : R extends null ? L : L & R
>;
/** Merge a set of data types */
export type MergeDatas<Ds extends ValidData[]> = Ds extends []
  ? null
  : Ds extends [
        infer D extends ValidData,
        infer D2 extends ValidData,
        ...infer Rest extends ValidData[],
      ]
    ? MergeDatas<[MergeData<D, D2>, ...Rest]>
    : Ds[0];

export interface Path<
  Pathname extends string = string,
  Data extends ValidData = any,
> {
  readonly repr: Pathname;
  readonly segments: Segment[];
  readonly make: (data: Data) => string;
  readonly match: (str: string) => MatchResult<Data>;
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
}

interface SegmentBase<
  Type extends string,
  Repr extends string,
  Data extends ValidData,
  Optional extends boolean,
> {
  /**
   * The type of the segment
   */
  readonly type: Type;

  /**
   * The number of dynamic data captures produced by this segment.
   */
  readonly captures: number;

  readonly optional: Optional;

  readonly repr: Repr;

  _data: Data;
}

export interface TextSegment<
  Text extends string,
  Optional extends boolean,
> extends SegmentBase<"text", Text, null, Optional> {
  text: Text;
  caseSensitive?: boolean;
}

export interface DataSegment<
  Repr extends string,
  Data extends ValidData,
  Optional extends boolean,
> extends SegmentBase<"data", Repr, Data, Optional> {
  codec: Codec<Data>;
}

export type Segment<
  Repr extends string = string,
  T extends ValidData = any,
  Optional extends boolean = any,
> = TextSegment<Repr, Optional> | DataSegment<Repr, T, Optional>;

export type DataOfPath<P extends Path> = P["_data"];
export type ReadableRepresentationOfPath<P extends Path> = P["repr"];

export type ConstPath<P extends string = string> = Path<P, NoData>;
export type ParametricPath<
  P extends string = string,
  Data extends Record<string, unknown> = Record<string, unknown>,
> = Path<P, Data>;

export type MatchFailure = { ok: false };
export type MatchSuccess<D extends ValidData = ValidData> = {
  ok: true;
  data: D;
  remaining: string;
  captures: number;
};
export type MatchSuccessForPath<P extends Path> = MatchSuccess<DataOfPath<P>>;
export type MatchResult<D extends ValidData = ValidData> =
  | MatchFailure
  | MatchSuccess<D>;
export type MatchResultForPath<P extends Path> = MatchResult<DataOfPath<P>>;

export type TypeIndicator<T extends string> = `[${T}]`;
export type StringTypeIndicator = TypeIndicator<"string">;
