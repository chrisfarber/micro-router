import { codec, type Codec } from "./codec";
import { dataSegment } from "./segment";
import type { DataSegment, TypeIndicator } from "./definitions";
import { keyBy } from "./prism";
import { type Keyed } from "./util";

// Accepts every string that `Number.prototype.toString()` yields for a
// finite number, e.g. "-4.2", ".5", or "1e+21".
const numberRegexp = /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;

/**
 * A codec that parses an entire path segment as a finite base 10 number.
 *
 * Encoding a non-finite number (`NaN` or `±Infinity`) throws.
 */
export const matchNumber: Codec<number> = codec<number>(
  text => {
    if (!numberRegexp.test(text)) return { ok: false };
    const data = Number(text);
    if (!Number.isFinite(data)) return { ok: false };
    return { ok: true, data };
  },
  data => {
    if (!Number.isFinite(data)) {
      throw new Error(
        `number() cannot encode non-finite value: ${String(data)}`,
      );
    }
    return data.toString();
  },
);

/**
 * A path segment that will parse its contents as a number, capturing it as the key `key`
 * of Data.
 */
/* @__NO_SIDE_EFFECTS__ */
export const number = <K extends string>(
  key: K,
): DataSegment<`:${K}${TypeIndicator<"number">}`, Keyed<K, number>, false> =>
  dataSegment({
    repr: `:${key}[number]`,
    codec: keyBy(key, matchNumber),
  });
