export type {
  ConstPath,
  DataOfPath,
  MatchFailure,
  MatchResult,
  MatchSuccess,
  MatchSuccessForPath,
  NoData,
  Path,
  ValidData,
  LeadingSlash,
  ReadableRepresentationOfPath,
  StringTypeIndicator,
  StripLeadingSlash,
  TypeIndicator,
} from "./definitions";

export { isExactMatch } from "./matches";

export { matchRegexp, type MatchRegexpOpts } from "./regexp";

export { keyAs, type WrapTypeIndicator } from "./key-as";
export { mapData, type Isomorphism, type MappedPath } from "./map-data";
export { segment, type Segment } from "./segment";

export { matchNumber, number } from "./number";
export { matchString, string } from "./string";
export {
  matchText,
  matchTextEnum,
  textEnum,
  type MatchTextOptions,
  type JoinStringTypes,
} from "./text";

export { concat } from "./concat";
export { path, textSegments, type TextSegments } from "./path";

export {
  bestMatchComparator,
  longestMatchComparator,
  router,
  type MatchComparator,
  type RouterOpts,
  type Router,
  type DispatchOpts,
  type RouteHandler,
} from "./router";
