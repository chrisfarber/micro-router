/**
 * Decoding happens in two stages:
 *
 * 1. `decodePath` decodes an entire path once, before it is matched. It uses
 *    `decodeURI`, which leaves reserved characters (like `%2F`) encoded, so
 *    that the path still splits into the same segments.
 * 2. `decodeSegment` finishes decoding a single segment, right before its
 *    text is handed to a codec.
 *
 * A literal `%` is protected through stage 1 by escaping `%25` as `%2525`, so
 * that it's only decoded once, by stage 2. That also makes `decodePath`
 * idempotent.
 */

const percentEscapes = /(?:%[0-9A-Fa-f]{2})+/g;

/**
 * Apply `decoder`, decoding whatever is valid in `text` if it can't decode all
 * of it.
 */
const tryDecode = (text: string, decoder: (text: string) => string): string => {
  try {
    return decoder(text);
  } catch {
    return text.replace(percentEscapes, match => {
      try {
        return decoder(match);
      } catch {
        return match;
      }
    });
  }
};

/**
 * Stage 1: decode every escape in `path` except for reserved characters.
 */
export const decodePath = (path: string): string =>
  tryDecode(
    path.includes("%25") ? path.replaceAll("%25", "%2525") : path,
    decodeURI,
  );

/**
 * Stage 2: fully decode one segment of a path decoded by `decodePath`. Returns
 * `null` if the segment contains invalid escapes.
 */
export const decodeSegment = (segment: string): string | null => {
  if (!segment.includes("%")) return segment;
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
};

/**
 * Stage 2 for the input that a prefix match leaves behind: fully decode each
 * of `parts`, starting at `from`, skipping empty parts. Returns `null` if any
 * part contains invalid escapes.
 */
export const decodeRest = (
  parts: string[],
  from: number,
  encoded: boolean,
): string[] | null => {
  const rest: string[] = [];
  for (let i = from; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    const text = encoded ? decodeSegment(part) : part;
    if (text === null) return null;
    rest.push(text);
  }
  return rest;
};

// every character that `encodeURIComponent` would escape
const needsEncoding = /[^A-Za-z0-9\-_.!~*'()]/;

/**
 * Encode text for use as a single path segment.
 */
export const encodeSegment = (text: string): string =>
  needsEncoding.test(text) ? encodeURIComponent(text) : text;
