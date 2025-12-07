import { concat } from "./concat";
import type {
  ConstPath,
  DataOfPath,
  LeadingSlash,
  NoData,
  Path,
} from "./definitions";
import { segment } from "./segment";
import { matchText } from "./text";

type TextSegments<T extends string> = ConstPath<LeadingSlash<T>>;
/**
 * A path that matches on complete segments of the input text.
 *
 * This path will fail to match if there is any extra text at the end of the last matching path segment.
 *
 * @param path A URL fragment, optionally beginning with a leading slash. The slash will be inferred if not.
 */
/* @__NO_SIDE_EFFECTS__ */
export const textSegments = <T extends string>(path: T): TextSegments<T> => {
  // although kind of elegant, if this proves to be a performance bottleneck, I should refactor this
  // to simply be a single text match + a check that we've consumed the end of the current segment.
  return concat(
    ...path
      .split("/")
      .filter(part => part !== "")
      .map(part => segment(matchText(part))),
  ) as TextSegments<T>;
};

type PathOrText = Path | string;
type PathOrTextToPath<P extends PathOrText> = P extends string
  ? Path<LeadingSlash<P>, NoData>
  : P;
type DataOfPT<P extends PathOrText> = DataOfPath<PathOrTextToPath<P>>;
type CombinedPath<Ps extends PathOrText[]> = Ps extends [
  infer P extends PathOrText,
  infer P2 extends PathOrText,
  ...infer Rest extends PathOrText[],
]
  ? CombinedPath<
      [
        Path<
          `${PathOrTextToPath<P>["path"]}${PathOrTextToPath<P2>["path"]}`,
          DataOfPT<P> extends NoData
            ? DataOfPT<P2>
            : DataOfPT<P2> extends NoData
              ? DataOfPT<P>
              : {
                  [K in
                    | keyof DataOfPT<P>
                    | keyof DataOfPT<P2>]: K extends keyof DataOfPT<P2>
                    ? DataOfPT<P2>[K]
                    : K extends keyof DataOfPT<P>
                      ? DataOfPT<P>[K]
                      : never;
                }
        >,
        ...Rest,
      ]
    >
  : PathOrTextToPath<Ps[0]>;

/**
 * Define a Path by combining the individual input `paths` in order.
 *
 * This is the recommended way to construct paths.
 *
 * The inputs can be other paths or literal strings. Any literal strings provided will be converted into
 * paths by use of the `textSegments` path constructor.
 */
/* @__NO_SIDE_EFFECTS__ */
export const path = <Ps extends PathOrText[]>(
  ...paths: Ps
): CombinedPath<Ps> => {
  if (paths.length < 1) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
    return undefined as any;
  }
  return concat(
    ...paths.map(part => {
      if (typeof part === "string") {
        return textSegments(part);
      }
      return part;
    }),
  ) as CombinedPath<Ps>;
};
