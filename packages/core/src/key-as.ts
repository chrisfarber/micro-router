/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { mapData } from "./map-data";
import type {
  TypeIndicator,
  Path,
  ReadableRepresentationOfPath,
  DataOfPath,
} from "./definitions";

type WrapTypeIndicator<P extends string> =
  P extends TypeIndicator<infer T>
    ? T extends "string"
      ? ""
      : P
    : TypeIndicator<P>;
const typeIndicatorRegexp = /^\[?([^[\]]+)\]?$/;
const wrap = (s: string): string => {
  if (s === "[string]") return "";
  const res = s.match(typeIndicatorRegexp);
  if (!res) return `[${s}]`;
  const [_, match] = res;
  return `[${match ?? ""}]`;
};

type Keyed<K extends string, P extends string> = `:${K}${WrapTypeIndicator<P>}`;
/**
 * Creates a new Path that maps the params of the given `path` to an object with a single key.
 *
 * This is useful for assigning a name to a path parameter, so that the matched value is returned
 * as an object with the specified key, rather than as a raw value.
 *
 * For example, `keyAs("id", parseNumber)` will produce a Path that matches a number and returns
 * `{ id: number }` as params.
 *
 * @param key The name to assign to the matched parameter.
 * @param path The Path whose params will be wrapped under the given key.
 * @returns A new Path with params as an object keyed by `key`.
 */
/* @__NO_SIDE_EFFECTS__ */
export const keyAs = <K extends string, P extends Path>(
  key: K,
  path: P,
): Path<
  Keyed<K, ReadableRepresentationOfPath<P>>,
  { [key in K]: DataOfPath<P> }
> => {
  const pathStr = `:${key}${wrap(path.path)}` as const;
  return {
    ...mapData(path, { to: p => ({ [key]: p }), from: p => p[key] }),
    path: pathStr as any,
  } as Path<any>;
};
