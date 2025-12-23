import {
  makeFailure,
  makePath,
  type Path,
  type ReadableRepresentationOfPath,
  type ValidData,
  type DataOfPath,
} from "./definitions";

export type Isomorphism<L, R> = {
  to: (left: L) => R;
  from: (right: R) => L;
};

export type MappedPath<P extends Path, To extends ValidData> = Path<
  ReadableRepresentationOfPath<P>,
  To
>;

/* @__NO_SIDE_EFFECTS__ */
export const mapData = <P extends Path, R extends ValidData>(
  path: P,
  iso: Isomorphism<DataOfPath<P>, R>,
): MappedPath<P, R> => {
  return makePath<ReadableRepresentationOfPath<P>, R>(
    path.path,
    input => {
      const res = path.match(input);
      if (!res.ok) {
        return res;
      }
      try {
        return {
          ...res,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          data: iso.to(res.data),
        };
      } catch (e) {
        return makeFailure(e instanceof Error ? e : new Error(String(e)));
      }
    },
    data => path.make(iso.from(data)),
    path.captures,
  );
};
