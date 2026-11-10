import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useNavigator } from "./provider";
import type { MatchResultForPath, Path } from "@micro-router/core";

export const useLocation = () => {
  const navigator = useNavigator();
  const subscribe = useCallback(
    (onChange: () => void) => navigator.listen(onChange),
    [navigator],
  );
  return useSyncExternalStore(subscribe, () => navigator.location);
};

export type PathMatchOpts = { exact?: boolean };
/**
 * Match a path against the current location's pathname, like `path.match()`.
 * With `exact`, a match that doesn't consume the entire pathname is reported
 * as `{ ok: false }`.
 */
export const usePathMatch = <P extends Path>(
  path: P,
  opts?: PathMatchOpts,
): MatchResultForPath<P> => {
  const { exact } = opts ?? {};
  const { pathname } = useLocation();
  return useMemo(() => {
    const match = path.match(pathname);
    return match.ok && exact && !match.exact ? { ok: false } : match;
  }, [pathname, path, exact]);
};
