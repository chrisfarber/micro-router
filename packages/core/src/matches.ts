import { type MatchResult } from "./definitions";

/**
 * An exact match is one that consumes the entire input string, or where
 * the only remaining unused input is a single trailing `"/"`.
 * @returns `true` if the match is exact
 */
export const isExactMatch = (match: MatchResult<unknown>): boolean => {
  if (match.ok) {
    return match.remaining === "" || match.remaining === "/";
  }
  return false;
};
