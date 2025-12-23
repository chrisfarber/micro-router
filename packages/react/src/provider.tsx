import { BrowserHistory } from "@micro-router/history";
import {
  createContext,
  type FC,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { type INavigator, Navigator } from "./navigator";

const NavigatorContext = createContext<INavigator | null>(null);

/**
 * Retrieve the navigator from the `<NavigatorProvider>`'s
 * react context.
 */
export const useNavigator = (): INavigator => {
  const navigator = useContext(NavigatorContext);
  if (!navigator) {
    throw new Error(
      "No navigator was provided. Provide one using <NavigatorProvider>.",
    );
  }
  return navigator;
};

/**
 * Provides a navigator via a react context.
 *
 * You may provide your own navigator. If you do not, a navigator will be
 * constructed for you using `BrowserHistory`.
 */
export const NavigatorProvider: FC<
  PropsWithChildren<{ navigator?: INavigator }>
> = ({ navigator, children }) => {
  const nav = useMemo(
    () => navigator ?? new Navigator(new BrowserHistory()),
    [navigator],
  );
  useEffect(() => {
    nav.start();
    return () => {
      nav.stop();
    };
  }, [nav]);
  return (
    <NavigatorContext.Provider value={nav}>
      {children}
    </NavigatorContext.Provider>
  );
};
