/* eslint-disable @typescript-eslint/no-explicit-any */
import { codec } from "./codec";
import type { DataSegment, TypeIndicator } from "./definitions";
import { keyBy, type DecodeResult } from "./prism";
import { dataSegment } from "./segment";
import { type Keyed } from "./util";

/**
 * Converts between the match of a regexp against a path segment and
 * structured data.
 *
 * `decode` receives the result of matching the regexp against the segment's
 * text, so it can inspect capture groups. `encode` must produce the text of
 * the path segment.
 */
export type RegexpCodec<T> = {
  decode: (match: RegExpExecArray) => DecodeResult<T>;
  encode: (data: T) => string;
};

export type RegexpOptions = {
  /**
   * The number of captures this segment contributes to its path.
   *
   * @default 1
   */
  captures?: number;
};

export type RegexpCodecOptions<T> = RegexpOptions & {
  /**
   * Transforms the regexp match into the segment's data.
   */
  codec: RegexpCodec<T>;
  /**
   * By default, the regexp must match the entire text of the path segment.
   * When `true`, the regexp may match any portion of the segment's text.
   *
   * @default false
   */
  unanchored?: boolean;
};

type RegexpSegment<K extends string, T> = DataSegment<
  `:${K}${TypeIndicator<"regexp">}`,
  Keyed<K, T>,
  false
>;

/**
 * Construct a path segment that matches the provided `regexp`, capturing the
 * matched text under `key`.
 *
 * The regexp must match the segment's entire text. Stateful regexps (with the
 * `g` or `y` flags) are not supported.
 */
export function regexp<K extends string>(
  key: K,
  regexp: RegExp,
  options?: RegexpOptions,
): RegexpSegment<K, string>;
/**
 * Construct a path segment that matches the provided `regexp`, using the
 * provided `codec` to transform the match into the data captured under `key`.
 *
 * Unless `unanchored` is `true`, the regexp must match the segment's entire
 * text. Stateful regexps (with the `g` or `y` flags) are not supported.
 */
export function regexp<K extends string, T>(
  key: K,
  regexp: RegExp,
  options: RegexpCodecOptions<T>,
): RegexpSegment<K, T>;
/* @__NO_SIDE_EFFECTS__ */
export function regexp(
  key: string,
  regexp: RegExp,
  options?: Partial<RegexpCodecOptions<unknown>>,
): DataSegment<any, any, false> {
  if (regexp.global || regexp.sticky) {
    throw new Error(
      `regexp() does not support the "g" or "y" flags: ${String(regexp)}`,
    );
  }
  const inner = options?.codec;
  const unanchored = options?.unanchored ?? false;
  if (unanchored && !inner) {
    throw new Error("regexp() requires a codec when unanchored is true");
  }
  const compiled = unanchored
    ? regexp
    : new RegExp(`^(?:${regexp.source})$`, regexp.flags);
  return dataSegment({
    repr: `:${key}[regexp]`,
    captures: options?.captures ?? 1,
    codec: keyBy(
      key,
      codec<unknown>(
        text => {
          const match = compiled.exec(text);
          if (!match) return { ok: false };
          if (inner) return inner.decode(match);
          return { ok: true, data: match[0] };
        },
        data => (inner ? inner.encode(data) : (data as string)),
      ),
    ),
  });
}
