import {
  type DataOfPath,
  type MatchSuccessForPath,
  type Path,
  router,
} from "@micro-router/core";
import { type ComponentType, type FC, type ReactNode } from "react";
import { useLocation, usePathMatch } from "./hooks";

/**
 * A component that renders the content of a route. It receives the data
 * parsed from the path via the `data` prop.
 *
 * @inline
 */
type DataComponent<P extends Path> = ComponentType<{ data: DataOfPath<P> }>;

export type RouteComponent<P extends Path = Path> = {
  path: P;
  /**
   * The component to render when the current URL matches the provided path
   */
  Matched: DataComponent<P>;
  exact: boolean;
} & FC;

type BuildRouteOpts<P extends Path> = {
  path: P;
  Matched: DataComponent<P>;
  exact: boolean;
};

/* @__NO_SIDE_EFFECTS__ */
const buildRoute = <P extends Path>({
  path,
  Matched,
  exact,
}: BuildRouteOpts<P>): RouteComponent<P> => {
  const Outer: FC = () => {
    const [match, data] = usePathMatch(path, { exact });
    if (!match) return null;
    return <Matched data={data} />;
  };
  Outer.displayName = `${exact ? "Route" : "Match"}: ${path.repr}`;

  const Matcher = Outer as RouteComponent<P>;
  Matcher.path = path;
  Matcher.Matched = Matched;
  Matcher.exact = exact;
  return Matcher;
};

/**
 * Build a route component for a path.
 *
 * The route component will only render `component` when the provided path is
 * an exact match for the current path. `component` receives the path's data as
 * its `data` prop. It can be any kind of component, including one made with
 * `lazy()` or `memo()`.
 *
 * To decide between a list of route or match components, use `routeSwitch`.
 */
/* @__NO_SIDE_EFFECTS__ */
export const route = <P extends Path>(
  path: P,
  component: DataComponent<P>,
): RouteComponent<P> => buildRoute({ path, Matched: component, exact: true });

/**
 * Build a match component for a path.
 *
 * The match component will only render `component` when the provided path
 * matches the current URL, regardless of whether it's an exact match.
 * `component` receives the path's data as its `data` prop. It can be any kind
 * of component, including one made with `lazy()` or `memo()`.
 *
 * To decide between a list of route or match components, use `routeSwitch`.
 */
/* @__NO_SIDE_EFFECTS__ */
export const match = <P extends Path>(
  path: P,
  component: DataComponent<P>,
): RouteComponent<P> => buildRoute({ path, Matched: component, exact: false });

/** @inline */
export type RouteSwitchOpts = {
  routes: RouteComponent[];
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
 * @returns A React component that renders its best matching route
 *
 * @example
 * ```tsx
 * const HomeRoute = route(path("/"), () => <h1>Home</h1>);
 * const AboutRoute = route(path("/about"), () => <h1>About</h1>);
 * const NotFound = () => <h1>404 Not Found</h1>;
 *
 * const AppRoutes = routeSwitch({
 *   routes: [HomeRoute, AboutRoute],
 *   fallback: <NotFound />
 * });
 *
 * function App() {
 *   return (
 *     <NavigatorProvider>
 *       <AppRoutes />
 *     </NavigatorProvider>
 *   );
 * }
 * ```
 */
/* @__NO_SIDE_EFFECTS__ */
export const routeSwitch = ({ routes, fallback }: RouteSwitchOpts): FC => {
  const matcher = router<ReactNode>().default(() => fallback);
  for (const { path, exact, Matched } of routes) {
    const render = ({ data }: MatchSuccessForPath<Path>) => (
      <Matched data={data} />
    );
    if (exact) {
      matcher.on(path, render);
    } else {
      matcher.onPrefix(path, render);
    }
  }

  const RouteSwitch: FC = () => {
    const loc = useLocation();
    return matcher.dispatch(loc.pathname);
  };
  RouteSwitch.displayName = `RouteSwitch of ${routes.length.toFixed(0)} routes`;

  return RouteSwitch;
};
