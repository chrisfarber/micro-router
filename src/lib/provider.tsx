import { createContext, FC, PropsWithChildren } from "react";
import { Router } from "./router";

const RouterContext = createContext<Router | null>(null);

export const RouterProvider: FC<PropsWithChildren<{ router: Router }>> = ({ router, children }) => (
  <RouterContext.Provider value={router}>{children}</RouterContext.Provider>
);
