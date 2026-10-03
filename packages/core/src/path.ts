import type {
  DataOfPath,
  MatchResultForPath,
  MatchSuccess,
  Path,
  Segment,
  ValidData,
} from "./definitions";
import { decodePath, decodeSegment, encodeSegment } from "./encoding";
import type { DecodeResult } from "./prism";
import { textEqual, textSegments, type TextSegments } from "./text";
import { make, type Prettify, type StripLeadingSlash } from "./util";

type PathInput = Segment | Segment[] | string | Path;
type PathInputs = PathInput[];

type JoinRepr<L extends string, R extends string> = R extends ""
  ? L
  : L extends ""
    ? R
    : `${L}/${R}`;

type MergeData<Acc, D> = D extends null ? Acc : Acc extends null ? D : Acc & D;

type Build<
  Is extends PathInputs,
  Repr extends string = "",
  Data = null,
> = Is extends [infer I, ...infer Rest extends PathInputs]
  ? I extends string
    ? Build<[...TextSegments<I>, ...Rest], Repr, Data>
    : I extends Segment | Path
      ? Build<
          Rest,
          JoinRepr<Repr, StripLeadingSlash<I["repr"]>>,
          MergeData<Data, I["_data"]>
        >
      : I extends Segment[]
        ? Build<[...I, ...Rest], Repr, Data>
        : never
  : {
      repr: Repr extends "" ? "/" : `/${Repr}`;
      data: Data extends null ? null : Prettify<Data>;
    };

const isPath = (maybePath: unknown): maybePath is Path =>
  typeof maybePath === "object" &&
  maybePath !== null &&
  "segments" in maybePath &&
  Array.isArray(maybePath.segments);

/* @__NO_SIDE_EFFECTS__ */
export const path = <const Inputs extends PathInputs>(
  ...parts: Inputs
): Path<Build<Inputs>["repr"], Build<Inputs>["data"]> => {
  let path = "";
  let captures = 0;
  const segments: Segment[] = parts.flatMap(input => {
    if (typeof input === "string") {
      return textSegments(input);
    }
    if (isPath(input)) {
      return input.segments;
    }
    return input;
  });
  for (const segment of segments) {
    path = `${path}/${segment.repr}`;
    captures += segment.captures;
  }
  if (!path) path = "/";
  const texts = segments.map(segment =>
    segment.type === "text" ? `/${encodeSegment(segment.text)}` : "",
  );
  const p: Path = make({
    repr: path,
    captures,
    segments,
    make: data => makeSegments(segments, texts, data),
    match: str => matchPath(p, str),
  });
  // oxlint-disable-next-line typescript/no-unsafe-return
  return p as Path<Build<Inputs>["repr"]>;
};

const makeSegments = (
  segments: Segment[],
  texts: string[],
  data: unknown,
): string => {
  if (segments.length === 0) {
    return "/";
  }
  let out = "";
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (!segment) continue;
    switch (segment.type) {
      case "text": {
        out += texts[i] ?? "";
        break;
      }
      case "data": {
        out += `/${encodeSegment(segment.codec.encode(data))}`;
        break;
      }
      default:
        segment satisfies never;
    }
  }
  return out;
};

const matchPath = <P extends Path>(
  path: P,
  input: string,
): MatchResultForPath<P> => {
  // only a path containing escapes needs to be decoded
  const encoded = input.includes("%");
  const pathString = encoded ? decodePath(input) : input;
  const len = pathString.length;
  let pos = 0;
  let data: ValidData = null;
  if (path.segments.length === 0) {
    if (pathString[pos] === "/") pos++;
    if (pos < len && pathString[pos] !== "/") {
      return { ok: false };
    }
  }
  for (const segment of path.segments) {
    while (pos < len && pathString[pos] === "/") pos++;
    if (pos >= len) {
      return { ok: false };
    }
    let end = pathString.indexOf("/", pos);
    if (end === -1) end = len;
    const part = pathString.slice(pos, end);
    pos = end;
    switch (segment.type) {
      case "text": {
        if (!textEqual(part, segment.text, segment.caseSensitive)) {
          // only escapes of reserved characters survive decodePath
          const decoded =
            encoded && part.includes("%") ? decodeSegment(part) : null;
          if (
            decoded === null ||
            !textEqual(decoded, segment.text, segment.caseSensitive)
          ) {
            return { ok: false };
          }
        }
        break;
      }
      case "data": {
        const text = encoded ? decodeSegment(part) : part;
        if (text === null) {
          return { ok: false };
        }
        const decoded: DecodeResult<ValidData> = segment.codec.decode(text);
        if (!decoded.ok) {
          return { ok: false };
        }
        // oxlint-disable-next-line unicorn/no-useless-fallback-in-spread -- tsc rejects spreading the ValidData union without it
        data = { ...(data ?? {}), ...decoded.data };
        break;
      }
      default:
        segment satisfies never;
    }
  }

  return {
    ok: true,
    data,
    remaining: pathString.slice(pos),
    captures: path.captures,
  };
};
/**

 * A match is considered `exact` when it consumes the entire input of a URL string,
 * or if there's a single `"/"` remaining at the end.
 */
export const isExactMatch = (match: MatchSuccess): boolean => {
  return match.remaining === "" || match.remaining === "/";
};
