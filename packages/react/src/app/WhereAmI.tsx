import { useLocation } from "../lib/hooks";

export const WhereAmI = () => {
  const loc = useLocation();
  return <p>You are at: {JSON.stringify(loc, null, 2)}</p>;
};
