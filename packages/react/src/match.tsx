import { type FC, type ReactElement, type ReactNode, useMemo } from "react";
import type {
  MatchResult,
  MatchSuccess,
  DataOf,
  Path,
} from "@micro-router/core";
import { useLocation } from "./hooks";

const exactMatch = (m: MatchResult<unknown>): boolean => {
  if (m.ok) {
    return m.remaining === "" || m.remaining === "/";
  }
  return false;
};

export type PathMatchOpts = { exact?: boolean };
const usePathMatch = <P extends Path>(
  path: P,
  opts?: PathMatchOpts,
): [true, DataOf<P>] | [false, null] => {
  const { exact } = opts ?? {};
  const loc = useLocation();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const [matches, data] = useMemo(() => {
    const match = path.match(loc.pathname);
    if (!match.ok || (exact && !exactMatch(match))) {
      return [false, null];
    }
    return [true, match.data];
  }, [loc, path, exact]);
  return [matches, data];
};

type MatchComponentProps = {
  /** If true, the content will not be rendered if there is any remaining text at the end of the match */
  exact?: boolean;
  /**
   * If children are provided, the Match component will not render its normal content. Instead, it will
   * render the children that were passed in.
   */
  children?: ReactNode;
};
export type PathMatchComponent<P extends Path = Path> = {
  path: P;
  Matched: FC<DataOf<P>>;
} & FC<MatchComponentProps>;

/**
 * Construct a Match Component for a path.
 *
 * A match component will render its content if its associated path matches the current URL.
 * Optionally, the component can accept the `exact` prop.
 *
 * @param path the path that must match in order to display the content
 * @param render a function component that will receive the extracted params as its props
 * @returns the new Match Component
 */
export const match = <P extends Path>(
  path: P,
  render: (params: DataOf<P>) => ReactElement | null,
): PathMatchComponent<P> => {
  const Matched: FC<DataOf<P>> = render;
  Matched.displayName = `Match: ${path.path}`;

  const Outer: FC<MatchComponentProps> = props => {
    const { exact } = props;
    const [match, params] = usePathMatch(path, { exact });
    if (!match) return null;
    return props.children ? <>{props.children}</> : <Matched {...params} />;
  };
  Outer.displayName = `Path: ${path.path}`;

  const Matcher = Outer as PathMatchComponent<P>;
  Matcher.path = path;
  Matcher.Matched = Matched;
  return Matcher;
};

export type BestMatchOpts<Matches extends PathMatchComponent[]> = {
  of: Matches;
  exact?: boolean;
  fallback?: ReactElement;
};
/**
 * Build a React Component that, when rendered, will choose the best match among the provided
 * MatchComponents and render it.
 *
 * The best match is considered to be the one that has the least unmatched text at the end of the
 * browser's actual path.
 */
export const bestMatch = <Matches extends PathMatchComponent[]>({
  of,
  exact,
  fallback,
}: BestMatchOpts<Matches>): FC => {
  const BestMatch: FC = () => {
    const loc = useLocation();
    const { pathname } = loc;
    const matched = useMemo(() => {
      let best: { Match: PathMatchComponent; result: MatchSuccess } | null =
        null;
      for (const Match of of) {
        const { path } = Match;
        const result = path.match(pathname);
        if (!result.ok) continue;
        const remaining = result.remaining.length;
        if (!best || best.result.remaining.length > remaining) {
          best = { Match, result };
        }
        // If we found an exact match, stop processing the remaining MatchComponents:
        if (exactMatch(result)) break;
      }
      if (!best || (exact && !exactMatch(best.result))) {
        return fallback ?? null;
      } else {
        return <best.Match.Matched {...best.result.data} />;
      }
    }, [pathname]);
    return matched;
  };
  BestMatch.displayName = `${exact ? "Exact" : "Best"} match of ${of.length.toFixed(0)}`;
  return BestMatch;
};
