import {
  type ConstPath,
  makeFailure,
  makePath,
  type Path,
} from "./definitions";
import { keyAs } from "./key-as";
import { segment } from "./segment";

export type MatchTextOptions = {
  /** defaults to false */
  caseSensitive?: boolean;
};

const matchTextCaseSensitive =
  (text: string) =>
  (input: string): boolean =>
    input.startsWith(text);

const matchTextCaseInsensitive = (text: string) => {
  const toMatch = text.toLocaleLowerCase();
  return (input: string): boolean =>
    input.substring(0, toMatch.length).toLocaleLowerCase() === toMatch;
};

/**
 * A primitive that will succeed if the path being matched against starts with the provided `text`.
 * Any additional text in the input string will not affect the match.
 */
/* @__NO_SIDE_EFFECTS__ */
export const matchText = <T extends string>(
  text: T,
  options?: MatchTextOptions,
): ConstPath<T> => {
  const caseSensitive = options?.caseSensitive;
  const matchFn = (
    caseSensitive ? matchTextCaseSensitive : matchTextCaseInsensitive
  )(text);
  return makePath(
    text,
    input => {
      if (matchFn(input)) {
        return {
          ok: true,
          data: null,
          remaining: input.substring(text.length),
          captures: 0,
        };
      } else {
        return makeFailure(new Error(`expected "${text}", found: "${input}"`));
      }
    },
    () => text,
    0, // captures
  );
};

/**
 * Combine an array of string literals into a single string literal, separated by the provided separator.
 */
export type JoinStringTypes<
  Vs extends readonly string[],
  Sep extends string,
> = Vs extends readonly [
  infer A extends string,
  infer B extends string,
  ...infer Rest extends string[],
]
  ? JoinStringTypes<[`${A}${Sep}${B}`, ...Rest], Sep>
  : Vs extends [infer A extends string]
    ? A
    : "";

/**
 * A primitive that will succeed if the path being matched against is exactly one of the provided string literals.
 * The data will be the matched string value.
 */
/* @__NO_SIDE_EFFECTS__ */
export function matchTextEnum<const T extends readonly string[]>(
  ...values: T
): Path<`(${JoinStringTypes<T, "|">})`, T[number]> {
  const set = new Set(values);
  const pathStr = `(${values.join("|")})` as `(${JoinStringTypes<T, "|">})`;
  const captures = 1;
  return makePath(
    pathStr,
    input => {
      for (const v of set) {
        if (input.startsWith(v)) {
          return {
            ok: true,
            data: v as T[number],
            remaining: input.substring(v.length),
            captures,
          };
        }
      }
      return makeFailure(
        new Error(`expected one of [${values.join(", ")}], found: "${input}"`),
      );
    },
    data => {
      if (!set.has(data)) {
        throw new Error(
          `Invalid value for matchTextEnum: ${data}. Allowed: [${values.join(", ")}].`,
        );
      }
      return data;
    },
    captures,
  );
}

/**
 * Matches a single path segment against a set of allowed string literals.
 * Returns params as { [key]: value } if matched.
 *
 * Example:
 *   const color = textEnum({ key: "color", options: ["red", "blue", "green"] });
 *   color.match("/red") // { success: true, params: { color: "red" }, ... }
 */
export function textEnum<
  const K extends string,
  const T extends readonly string[],
>(args: { key: K; options: T }) {
  return segment(keyAs(args.key, matchTextEnum(...args.options)));
}
