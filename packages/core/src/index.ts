export type {
  NoData,
  ValidData,
  Path,
  ConstPath,
  ParametricPath,
  DataOfPath,
  Segment,
  TextSegment,
  DataSegment,
  ReadableRepresentationOfPath,
  MatchResult,
  MatchSuccess,
  MatchSuccessForPath,
  MatchFailure,
  MatchResultForPath,
  TypeIndicator,
  StringTypeIndicator,
} from "./definitions";

export type { LeadingSlash, StripLeadingSlash } from "./util";

export { path, isExactMatch } from "./path";
export { dataSegment, optional } from "./segment";
export {
  textSegments,
  textEnum,
  type TextSegments,
  type TextSegmentsOptions,
} from "./text";
export { string } from "./string";
export { matchNumber, number } from "./number";
export {
  regexp,
  type RegexpCodec,
  type RegexpOptions,
  type RegexpCodecOptions,
} from "./regexp";

export { type Prism, prism, mapPrism, identityPrism, keyBy } from "./prism";

export { type Codec, codec, mapCodec } from "./codec";

export {
  type Router,
  type RouterOpts,
  type DispatchOpts,
  type RouteHandler,
  router,
} from "./router";
