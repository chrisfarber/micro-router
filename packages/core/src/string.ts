import { keyAs } from "./key-as";
import type { Path, StringTypeIndicator } from "./definitions";
import { matchRegexp } from "./regexp";
import { segment } from "./segment";

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
 * A Path that, when matching, will consume a path segment as a string and capture it as the key
 * `key` of Data.
 */
/* @__NO_SIDE_EFFECTS__ */
export const string = <K extends string>(key: K) =>
  segment(keyAs(key, matchString));
