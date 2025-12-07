import { segment } from "./segment";
import { keyAs } from "./key-as";
import { mapData } from "./map-data";
import type { Path, TypeIndicator } from "./definitions";
import { matchRegexp } from "./regexp";

/**
 * A path that succeeds if it can parse the beginning of the input as a base 10 number.
 *
 * Not greedy, unlike `matchString`. It is incompatible with leading slashes, however,
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

/**
 * A Path that will consume a path segment and parse it as a number, capturing it as the key `key`
 * of Data.
 */
/* @__NO_SIDE_EFFECTS__ */
export const number = <K extends string>(key: K) =>
  segment(keyAs(key, matchNumber));
