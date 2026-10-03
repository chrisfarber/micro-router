import { type Prism, type DecodeResult, prism, mapPrism } from "./prism";

/**
 * A Codec can decode structured data from a string and
 * encode structured data into a string
 */
export type Codec<T> = Prism<string, T>;

/**
 * Construct a Codec from the supplied decode and encode functions.
 */
/* @__NO_SIDE_EFFECTS__ */
export const codec = <T>(
  decode: (text: string) => DecodeResult<T>,
  encode: (value: T) => string,
): Codec<T> => prism(decode, encode);

/* @__NO_SIDE_EFFECTS__ */
export const mapCodec = <F, T>(
  codec: Codec<F>,
  mapper: Prism<F, T>,
): Codec<T> => mapPrism(codec, mapper);
