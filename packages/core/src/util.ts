export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * Remove fields prefixed with an underscore; these fields
 * are meant to be undefined at runtime and exist only as a utility
 * for extracting type information from a complex generic type.
 */
type NonSyntheticFields<T> = {
  [K in keyof T as K extends `_${string}` ? never : K]: T[K];
};
/**
 * Utility to construct a type without supplying its type fields that are not meant
 * to be present at runtime.
 */
export const make = <T>(opts: NonSyntheticFields<T>): T => opts as T;

export type Keyed<K extends string, T> = { [k in K]: T };

export type StripLeadingSlash<S extends string> = S extends `/${infer R}`
  ? StripLeadingSlash<R>
  : S;
export type LeadingSlash<S extends string> = `/${StripLeadingSlash<S>}`;
export type Join<Ts extends string[], Sep extends string> = Ts extends []
  ? ""
  : Ts extends [infer T extends string]
    ? T
    : Ts extends [infer T extends string, ...infer R extends string[]]
      ? `${T}${Sep}${Join<R, Sep>}`
      : never;
