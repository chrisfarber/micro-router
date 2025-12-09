import {
  type DataOfPath,
  isExactMatch,
  type MatchComparator,
  type Path,
  router,
} from "@micro-router/core";
import { type FC, type ReactNode } from "react";
import { useLocation, usePathMatch } from "./hooks";

export type Route<P extends Path = Path> = {
  path: P;
  Matched: FC<DataOfPath<P>>;
  exact: boolean;
} & FC;

type BuildRouteOpts<P extends Path> = {
  path: P;
  render: FC<DataOfPath<P>>;
  exact: boolean;
};

const buildRoute = <P extends Path>({
  path,
  render,
  exact,
}: BuildRouteOpts<P>): Route<P> => {
  const Matched: FC<DataOfPath<P>> = render;
  Matched.displayName = `Matched: ${path.path}`;

  const Outer: FC = () => {
    const [match, params] = usePathMatch(path, { exact });
    if (!match) return null;
    return <Matched {...params} />;
  };
  Outer.displayName = `${exact ? "Route" : "Match"}: ${path.path}`;

  const Matcher = Outer as Route<P>;
  Matcher.path = path;
  Matcher.Matched = Matched;
  Matcher.exact = exact;
  return Matcher;
};

/**
 * Build a route component for a path.
 *
 * The route component will only render its children when the provided path is
 * an exact match for the current path.
 *
 * To decide between a list of route or match components, use `routeSwitch`.
 */
export const route = <P extends Path>(
  path: P,
  render: FC<DataOfPath<P>>,
): Route<P> => buildRoute({ path, render, exact: true });

/**
 * Build a match component for a path.
 *
 * The match component will only render its children when the provided path
 * matches the current URL, regardless of whether it's an exact match.
 *
 * To decide between a list of route or match components, use `routeSwitch`.
 */
export const match = <P extends Path>(
  path: P,
  render: FC<DataOfPath<P>>,
): Route<P> => buildRoute({ path, render, exact: false });

export type RouteConfig = {
  route: Route;
};

export type RouteSwitchOpts = {
  routes: Route[];
  comparator?: MatchComparator;
  fallback?: ReactNode;
};
/**
 * Construct a component that selects and renders the best matching route from a
 * list of Route or Match components.
 *
 * Unlike rendering multiple Match components that would each independently
 * check if they match, `routeSwitch` uses the router to intelligently select
 * the single best match based on specificity and path depth. This ensures only
 * one route component is rendered at a time.
 *
 * @param of - Array of PathMatchComponents (created with `match()`) to choose from
 * @param fallback - Optional ReactNode to render when no routes match (e.g., a 404 page)
 * @returns A React component that renders the best matching route
 *
 * @example
 * ```tsx
 * const HomeRoute = route(path("/"), () => <h1>Home</h1>);
 * const AboutRoute = route(path("/about"), () => <h1>About</h1>);
 * const NotFound = () => <h1>404 Not Found</h1>;
 *
 * const AppRouter = routeSwitch({
 *   of: [HomeRoute, AboutRoute],
 *   fallback: <NotFound />
 * });
 *
 * function App() {
 *   return <AppRouter />;
 * }
 * ```
 */
export const routeSwitch = ({
  routes,
  comparator,
  fallback,
}: RouteSwitchOpts): FC => {
  const matches = router<ReactNode>({ partialMatch: true, comparator }).default(
    () => fallback,
  );
  for (const MatchComponent of routes) {
    matches.on(MatchComponent.path, match => {
      if (MatchComponent.exact && !isExactMatch(match)) {
        return fallback;
      }
      return <MatchComponent.Matched {...match.data} />;
    });
  }

  const RouteSwitch: FC = () => {
    const loc = useLocation();
    return matches.dispatch(loc.pathname);
  };
  RouteSwitch.displayName = `RouteSwitch of ${routes.length.toFixed(0)} routes`;

  return RouteSwitch;
};
