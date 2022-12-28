import { createContext, FC, PropsWithChildren, useContext, useEffect, useMemo } from "react";
import { History } from "./history";
import { INavigator, Navigator } from "./navigator";

const NavigatorContext = createContext<Navigator | null>(null);

export const useNavigator = (): INavigator => {
  const navigator = useContext(NavigatorContext);
  if (!navigator) {
    throw new Error("No navigator was provided. Provide one using <NavigatorProvider>.");
  }
  return navigator;
};

export const NavigatorProvider: FC<PropsWithChildren<{ history: History }>> = ({ history, children }) => {
  const navigator = useMemo(() => new Navigator(history), [history]);
  useEffect(() => {
    navigator.start();
    return () => navigator.stop();
  }, [navigator]);
  return <NavigatorContext.Provider value={navigator}>{children}</NavigatorContext.Provider>;
};
