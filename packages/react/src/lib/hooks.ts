import { useEffect, useState } from "react";
import { useNavigator } from "./provider";
import type { Navigator } from "./navigator";

export const useLocation = () => {
  const navigator: Navigator = useNavigator() as Navigator;
  const [location, setLocation] = useState(navigator.location);
  useEffect(
    () =>
      navigator.listen(loc => {
        setLocation(loc);
      }),
    [navigator],
  );
  return location;
};
