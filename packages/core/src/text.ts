import { codec } from "./codec";
import type { DataSegment, TextSegment } from "./definitions";
import { keyBy, type DecodeResult } from "./prism";
import { dataSegment } from "./segment";
import { make, type Join, type Keyed } from "./util";

type SplitText<
  S extends string,
  Optional extends boolean,
  Acc extends TextSegment<string, Optional>[] = [],
> = S extends `${infer L}/${infer R}`
  ? SplitText<
      R,
      Optional,
      L extends "" ? Acc : [...Acc, TextSegment<L, Optional>]
    >
  : S extends ""
    ? Acc
    : [...Acc, TextSegment<S, Optional>];

export type TextSegments<
  S extends string,
  Optional extends boolean = false,
> = SplitText<S, Optional>;

export type TextSegmentsOptions<Optional extends boolean = false> = {
  caseSensitive?: boolean;
  optional?: Optional;
};

/**
 * Build text segments from a literal string.
 */
/* @__NO_SIDE_EFFECTS__ */
export const textSegments = <
  Text extends string,
  Optional extends boolean = false,
>(
  text: Text,
  options?: TextSegmentsOptions<Optional>,
): TextSegments<Text, Optional> => {
  const caseSensitive = options?.caseSensitive ?? false;
  const optional = (options?.optional ?? false) as Optional;
  const out: TextSegment<string, Optional>[] = [];
  for (const segment of text.split("/")) {
    if (segment) {
      out.push(
        make({
          type: "text",
          captures: 0,
          optional,
          repr: segment,
          text: segment,
          caseSensitive,
        }),
      );
    }
  }
  return out as TextSegments<Text, Optional>;
};

type TextEnumRepr<
  K extends string,
  Opts extends string[],
> = `:${K}(${Join<Opts, "|">})`;

/* @__NO_SIDE_EFFECTS__ */
export const textEnum = <K extends string, const Opts extends string[]>(opts: {
  key: K;
  options: Opts;
  caseSensitive?: boolean;
}): DataSegment<TextEnumRepr<K, Opts>, Keyed<K, Opts[number]>, false> => {
  const { key, caseSensitive, options } = opts;
  let decode: (str: string) => DecodeResult<Opts[number]>;
  const encode = (str: string) => str;
  if (caseSensitive) {
    const optionSet = new Set(options);
    decode = (str): DecodeResult<string> =>
      optionSet.has(str) ? { ok: true, data: str } : { ok: false };
  } else {
    const optionSet = new Map(options.map(o => [o.toLocaleLowerCase(), o]));
    decode = (str: string): DecodeResult<Opts[number]> => {
      const res = optionSet.get(str.toLocaleLowerCase());
      if (res) {
        return { ok: true, data: res };
      }
      return { ok: false };
    };
  }

  return dataSegment({
    repr: `:${key}(${options.join("|")})` as TextEnumRepr<K, Opts>,
    codec: keyBy(key, codec(decode, encode)),
  });
};

export const caseInsensitiveEqual = (l: string, r: string): boolean =>
  l.toLocaleLowerCase() === r.toLocaleLowerCase();

export const textEqual = (
  l: string,
  r: string,
  caseSensitive?: boolean,
): boolean => (caseSensitive ? l === r : caseInsensitiveEqual(l, r));
