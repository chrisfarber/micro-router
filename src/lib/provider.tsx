import { createContext, FC, PropsWithChildren, useContext, useMemo } from "react";
import { History } from "./history";
import { Router } from "./router";

const RouterContext = createContext<Router | null>(null);

export const useRouter = (): Router => {
  const router = useContext(RouterContext);
  if (!router) {
    throw new Error("No router was provided. Provide one using <RouterProvider>.");
  }
  return router;
};

export const RouterProvider: FC<PropsWithChildren<{ history: History }>> = ({ history, children }) => {
  const router = useMemo(() => new Router(history), [history]);
  return <RouterContext.Provider value={router}>{children}</RouterContext.Provider>;
};
