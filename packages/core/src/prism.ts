import { make, type Keyed } from "./util";

/**
 * A Prism is an Isomorphism between two shapes of data, where the conversion
 * from the Encoded -> Decoded shape may fail
 */
export type Prism<E, D> = {
  decode: (encoded: E) => DecodeResult<D>;
  encode: (decoded: D) => E;
  _encoded: E;
  _decoded: D;
};

export type DecodeResult<D> = { ok: true; data: D } | { ok: false };

/**
 * Construct a prism using the supplied decode and encode functions.
 */
/* @__NO_SIDE_EFFECTS__ */
export const prism = <E, D>(
  decode: (encoded: E) => DecodeResult<D>,
  encode: (decoded: D) => E,
): Prism<E, D> =>
  make({
    decode: decode,
    encode: encode,
  });

/* @__NO_SIDE_EFFECTS__ */
export const mapPrism = <F, I, T>(
  left: Prism<F, I>,
  right: Prism<I, T>,
): Prism<F, T> =>
  prism<F, T>(
    input => {
      const v = left.decode(input);
      if (!v.ok) {
        return v;
      }
      return right.decode(v.data);
    },
    value => {
      return left.encode(right.encode(value));
    },
  );

/**
 * Construct a prism that does not transform its data
 */
/* @__NO_SIDE_EFFECTS__ */
export const identityPrism = <T>(): Prism<T, T> =>
  prism(
    v => ({ ok: true, data: v }),
    v => v,
  );

/**
 * Derive a prism that will nest the decoded data of another prism under the
 * specified key
 */
/* @__NO_SIDE_EFFECTS__ */
export const keyBy = <K extends string, E, D>(
  key: K,
  inner: Prism<E, D>,
): Prism<E, Keyed<K, D>> =>
  prism(
    input => {
      const v = inner.decode(input);
      if (!v.ok) return v;
      // Assigning to an empty object is several times faster in V8 than a
      // computed-key literal (`{ [key]: v }`).
      const data = {} as Keyed<K, D>;
      data[key] = v.data;
      return { ok: true, data };
    },
    v => inner.encode(v[key]),
  );
