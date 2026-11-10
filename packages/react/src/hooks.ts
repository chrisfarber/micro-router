import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useNavigator } from "./provider";
import type { Path, DataOfPath } from "@micro-router/core";

export const useLocation = () => {
  const navigator = useNavigator();
  const subscribe = useCallback(
    (onChange: () => void) => navigator.listen(onChange),
    [navigator],
  );
  return useSyncExternalStore(subscribe, () => navigator.location);
};

export type PathMatchOpts = { exact?: boolean };
export const usePathMatch = <P extends Path>(
  path: P,
  opts?: PathMatchOpts,
): [true, DataOfPath<P>] | [false, null] => {
  const { exact } = opts ?? {};
  const { pathname } = useLocation();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const [matches, data] = useMemo(() => {
    const match = path.match(pathname);
    if (!match.ok || (exact && !match.exact)) {
      return [false, null];
    }
    return [true, match.data];
  }, [pathname, path, exact]);
  return [matches, data];
};
