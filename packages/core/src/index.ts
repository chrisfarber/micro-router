export type {
  DataOfPath,
  MatchFailure,
  MatchResult,
  MatchSuccess,
  NoData,
  Path,
  ValidData,
  ConstPath,
} from "./definitions";

export { matchRegexp, type MatchRegexpOpts } from "./regexp";

export { keyAs } from "./key-as";
export { mapData } from "./map-data";
export { segment } from "./segment";

export { matchNumber, number } from "./number";
export { matchString, string } from "./string";
export {
  matchText,
  matchTextEnum,
  textEnum,
  type MatchTextOptions,
} from "./text";

export { concat } from "./concat";
export { path, textSegments } from "./path";
