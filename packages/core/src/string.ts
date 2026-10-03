import { codec } from "./codec";
import { dataSegment } from "./segment";
import type { DataSegment } from "./definitions";
import { type Keyed } from "./util";

/**
 * Construct a path segment that matches any string and captures it
 * under the provided `key`.
 */
/* @__NO_SIDE_EFFECTS__ */
export const string = <K extends string>(
  key: K,
): DataSegment<`:${K}`, Keyed<K, string>, false> =>
  dataSegment({
    repr: `:${key}`,
    codec: codec(
      text => {
        const data = {} as Keyed<K, string>;
        data[key] = text;
        return { ok: true, data };
      },
      data => data[key],
    ),
  });
