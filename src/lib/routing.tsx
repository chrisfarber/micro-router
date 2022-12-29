import { FC, ReactElement, useMemo } from "react";
import { MatchResult, ParamsOf, Path } from "./definition";
import { useLocation } from "./hooks";

const exactMatch = (m: MatchResult<unknown>): boolean => {
  if (!m.error) {
    return m.remaining === "" || m.remaining === "/";
  }
  return false;
};

export type PathMatchOpts = { exact?: boolean };
const usePathMatch = <P extends Path>(path: P, opts?: PathMatchOpts): [true, ParamsOf<P>] | [false, null] => {
  const { exact } = opts ?? {};
  const loc = useLocation();
  const [matches, params] = useMemo(() => {
    const match = path.match(loc.pathname);
    if (match.error || (exact && !exactMatch(match))) {
      return [false, null];
    }
    return [true, match.params];
  }, [loc, path, exact]);
  return [matches, params];
};

type RouteComponentProps = {
  /** If true, the Route will not render its content if there is any remaining text at the end of the match */
  exact?: boolean;
};
export type RouteComponent<P extends Path = Path> = {
  path: P;
  Matched: FC<ParamsOf<P>>;
} & FC<RouteComponentProps>;

/**
 * Construct a Route Component for a path.
 *
 * A Route component will render its content if its associated path matches the current URL.
 * Optionally, the route component can accept the `exact` prop.
 *
 * @param path the path that must match in order to display the route's content
 * @param Route a function component that will receive the extracted params as its props
 * @returns the new Route Component
 */
export const route = <P extends Path>(
  path: P,
  render: (params: ParamsOf<P>) => ReactElement | null,
): RouteComponent<P> => {
  const Matched: FC<ParamsOf<P>> = render;
  Matched.displayName = `Match: ${path.path}`;

  const Outer: FC<RouteComponentProps> = props => {
    const { exact } = props;
    const [match, params] = usePathMatch(path, { exact });
    if (!match) return null;
    return <Matched {...params} />;
  };
  Outer.displayName = `Route: ${path.path}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Route: RouteComponent<P> = Outer as any;
  Route.path = path;
  Route.Matched = Matched;
  return Route;
};

/**
 * Build a Component that will choose the best match among your input Routes.
 *
 * The best match is considered to be the one that has the least unmatched text at the end of
 * the browser's actual path.
 *
 * @param routes The Route components you'd like this component to match against
 * @returns A new React component
 */
export const routeSwitch = <Routes extends RouteComponent[]>(...routes: Routes): FC => {
  const RouteSwitch: FC = () => {
    const loc = useLocation();
    const { pathname } = loc;
    const route = useMemo(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let best: { Route: RouteComponent; remaining: number; params: any } | null = null;
      for (const Route of routes) {
        const { path } = Route;
        const res = path.match(pathname);
        if (res.error) continue;
        const remaining = res.remaining.length;
        if (!best || best.remaining > remaining) {
          best = { Route, remaining, params: res.params };
        }
        if (exactMatch(res)) break;
      }
      return best ? <best.Route.Matched {...best.params} /> : null;
    }, [pathname]);
    return route;
  };
  RouteSwitch.displayName = `RouteSwitch of ${routes.length} routes`;
  return RouteSwitch;
};
