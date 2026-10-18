import type { Codec } from "./codec";
import type { ValidData, DataSegment, Segment } from "./definitions";
import { make } from "./util";

/* @__NO_SIDE_EFFECTS__ */
export const dataSegment = <
  Repr extends string,
  Data extends ValidData,
  Optional extends boolean = false,
>(opts: {
  repr: Repr;
  captures?: number;
  optional?: Optional;
  codec: Codec<Data>;
}): DataSegment<Repr, Data, Optional> =>
  make({
    type: "data",
    repr: opts.repr,
    captures: opts.captures ?? 1,
    codec: opts.codec,
    optional: (opts.optional ?? false) as Optional,
  });

/**
 * Derive an optional segment from the provided segment.
 */
/* @__NO_SIDE_EFFECTS__ */
export const optional = <Repr extends string, T extends ValidData>(
  segment: Segment<Repr, T, boolean>,
): Segment<Repr, T, true> => ({
  ...segment,
  optional: true,
});
