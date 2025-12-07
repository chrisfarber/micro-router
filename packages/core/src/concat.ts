/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  type DataOfPath,
  makePath,
  type NoData,
  type Path,
} from "./definitions";

type MergeData<L, R> = L extends NoData ? R : R extends NoData ? L : R & L;

type ConcatenatedPaths<Ps extends Path[]> = Ps extends [
  infer P extends Path,
  infer P2 extends Path,
  ...infer Rest extends Path[],
]
  ? ConcatenatedPaths<
      [
        Path<
          `${P["path"]}${P2["path"]}`,
          MergeData<DataOfPath<P>, DataOfPath<P2>>
        >,
        ...Rest,
      ]
    >
  : Ps[0];

/**
 * Combine many Path definitions with no separator.
 * Succeeds if all inner Paths succeed.
 * You probably want to use `path` instead.
 */
/* @__NO_SIDE_EFFECTS__ */
export const concat = <Ps extends Path[]>(
  ...parts: Ps
): ConcatenatedPaths<Ps> => {
  const captures = parts.reduce((sum, p) => sum + p.captures, 0);
  return makePath(
    parts.map(r => r.path).join("") as any,
    input => {
      let remaining = input;
      let data: null | Record<string, any> = null;
      for (const p of parts) {
        const matched = p.match(remaining);
        if (!matched.ok) {
          return matched;
        }
        remaining = matched.remaining;
        if (matched.data !== null) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data = { ...(data ?? {}), ...matched.data };
        }
      }
      return { ok: true, data: data, remaining, captures };
    },
    data => {
      return parts.map(r => r.make(data)).join("");
    },
    captures,
  ) as ConcatenatedPaths<Ps>;
};
