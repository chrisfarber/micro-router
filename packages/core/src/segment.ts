import { mapData } from "./map-data";
import type {
  LeadingSlash,
  Path,
  ReadableRepresentationOfPath,
} from "./definitions";
import { matchRegexp } from "./regexp";

const ensureLeadingSlash = <S extends string>(s: S): LeadingSlash<S> => {
  if (s.startsWith("/")) {
    return s as LeadingSlash<S>;
  }
  return `/${s}` as LeadingSlash<S>;
};

export type Segment<P extends Path> = Path<LeadingSlash<P["path"]>, P["_data"]>;
/**
 * A segment considers the contents between the start of the string (ignoring any initial path
 * separator) and the first encountered path separator ("/").
 *
 * The resulting Path will fail if the inner path does not consume the entire first path segment, or
 * if the first path segment is empty. Otherwise, it succeeds if the inner Path succeeds.
 */
/* @__NO_SIDE_EFFECTS__ */
export const segment = <P extends Path>(inner: P): Segment<P> => {
  const mapped = mapData(
    matchRegexp({
      path: ensureLeadingSlash(inner.path) as LeadingSlash<
        ReadableRepresentationOfPath<P>
      >,
      regexp: /^\/?([^/]*)($|\/.*)/,
    }),
    {
      to(left) {
        const innerMatch = inner.match(left);
        if (!innerMatch.ok) {
          throw innerMatch.cause ?? new Error("??");
        }
        if (innerMatch.remaining !== "") {
          throw new Error(
            `segment text "${left}" matched the inner path, but had unused input "${innerMatch.remaining}"`,
          );
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return innerMatch.data;
      },
      from: right => `/${inner.make(right)}`,
    },
  );
  return {
    ...mapped,
    captures: inner.captures,
    match: input => {
      const res = mapped.match(input);
      if (!res.ok) {
        return res;
      }
      return { ...res, captures: inner.captures };
    },
  };
};
