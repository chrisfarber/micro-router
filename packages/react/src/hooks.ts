import { useMemo, useSyncExternalStore } from "react";
import type { Navigator } from "./navigator";
import { useNavigator } from "./provider";
import type { Path, DataOfPath } from "@micro-router/core";
import { isExactMatch } from "@micro-router/core";

export const useLocation = () => {
  const navigator: Navigator = useNavigator() as Navigator;
  return useSyncExternalStore(
    cb => navigator.listen(cb),
    () => navigator.location,
  );
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
    if (!match.ok || (exact && !isExactMatch(match))) {
      return [false, null];
    }
    return [true, match.data];
  }, [loc, path, exact]);
  return [matches, data];
};
