import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useNavigator } from "./provider";
import type { Path, DataOfPath } from "@micro-router/core";

export const useLocation = () => {
  const navigator = useNavigator();
  // React resubscribes whenever this function changes, so keep it stable.
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
  const loc = useLocation();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const [matches, data] = useMemo(() => {
    const match = path.match(loc.pathname);
    if (!match.ok || (exact && !match.exact)) {
      return [false, null];
    }
    return [true, match.data];
  }, [loc, path, exact]);
  return [matches, data];
};
