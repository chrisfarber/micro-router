export type { INavigator } from "./navigator";
export { Navigator } from "./navigator";

export { NavigatorProvider, useNavigator } from "./provider";

export type { PathMatchOpts } from "./hooks";
export { useLocation, usePathMatch } from "./hooks";

export type { RouteSwitchOpts, RouteComponent } from "./route";
export { routeSwitch, route, match } from "./route";

export type {
  LinkProps,
  LinkBaseProps,
  LinkDataProps,
  PathDataCanBeInlineLinkProps,
} from "./link";
export { useClientSideNavigation, Link } from "./link";
