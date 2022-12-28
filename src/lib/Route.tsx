import { FC, ReactElement, useMemo } from "react";
import { MatchResult, Path } from "./definition";
import { useLocation } from "./hooks";

type RouteProps<P extends Path> = {
  path: P;
  component: FC<P["_params"]>;
  exact?: boolean;
};

const exactMatch = (m: MatchResult<unknown>): boolean => {
  if (!m.error) {
    return m.remaining === "" || m.remaining === "/";
  }
  return false;
};

export const Route = <P extends Path>({
  path,
  component: Child,
  exact,
}: RouteProps<P>): ReactElement | null => {
  const loc = useLocation();
  const [matches, params] = useMemo(() => {
    const match = path.match(loc.pathname);
    if (match.error || (exact && !exactMatch(match))) {
      return [false, null];
    }
    return [true, match.params];
  }, [loc, path, exact]);

  if (matches) {
    return <Child {...params} />;
  }
  return null;
};
