import { FC, useMemo } from "react";
import { MatchResult, ParamsOf, Path } from "./definition";
import { useLocation } from "./hooks";

const exactMatch = (m: MatchResult<unknown>): boolean => {
  if (!m.error) {
    return m.remaining === "" || m.remaining === "/";
  }
  return false;
};

const usePathMatch = <P extends Path>(path: P, exact?: boolean): [true, ParamsOf<P>] | [false, null] => {
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

export type RouteComponent<P extends Path = Path> = {
  path: P;
  Matched: FC<ParamsOf<P>>;
} & FC;

export const route = <P extends Path>(path: P, Route: FC<ParamsOf<P>>): RouteComponent<P> => {
  const Inner: FC = () => {
    const [match, params] = usePathMatch(path);
    if (!match) return null;
    return <Route {...params} />;
  };
  Inner.displayName = `Route: ${path.path}`;
  Route.displayName = `Match: ${path.path}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Rend: RouteComponent<P> = Inner as any;
  Rend.path = path;
  Rend.Matched = Route;
  return Rend;
};

export const routeSwitch = <Routes extends RouteComponent[]>(...routes: Routes): FC => {
  const RouteSwitch: FC = () => {
    const loc = useLocation();
    const { pathname } = loc;
    const Route = useMemo(() => {
      let best: { Route: RouteComponent; remaining: number } | null = null;
      for (const Route of routes) {
        const { path } = Route;
        const res = path.match(pathname);
        if (res.error) continue;
        if (exactMatch(res)) {
          return Route;
        }
        const remaining = res.remaining.length;
        if (!best || best.remaining > remaining) {
          best = { Route, remaining };
        }
      }
      return best?.Route ?? null;
    }, [pathname]);
    if (Route) return <Route />;
    return null;
  };
  RouteSwitch.displayName = "RouteSwitch";
  return RouteSwitch;
};
