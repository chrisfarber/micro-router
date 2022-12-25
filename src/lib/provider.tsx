import { createContext, FC, PropsWithChildren, useContext } from "react";
import { History } from "./history";

const RouterContext = createContext<History | null>(null);

export const useRouter = (): History => {
  const router = useContext(RouterContext);
  if (!router) {
    throw new Error("No router was provided. Provide one using <RouterProvider>.");
  }
  return router;
};

export const RouterProvider: FC<PropsWithChildren<{ router: History }>> = ({ router, children }) => (
  <RouterContext.Provider value={router}>{children}</RouterContext.Provider>
);
