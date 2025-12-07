/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import {
  type StringTypeIndicator,
  type Path,
  makePath,
  makeFailure,
} from "./definitions";

export type MatchRegexpOpts<K extends string> = {
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
  const captures = 1;
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
        captures,
      };
    },
    s => s,
    captures,
  );
};
