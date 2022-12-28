import { useEffect, useState } from "react";
import { useNavigator } from "./provider";

export const useLocation = () => {
  const navigator = useNavigator();
  const [location, setLocation] = useState(navigator.location);
  useEffect(() => navigator.listen(loc => setLocation(loc)), [navigator]);
  return location;
};
