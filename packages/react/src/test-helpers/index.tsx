import { BrowserHistory } from "@micro-router/history";
import type { ReactNode } from "react";
import { render } from "vitest-browser-react";
import { Navigator } from "../navigator";
import { NavigatorProvider } from "../provider";

export const renderWithNavigator = async (
  node: ReactNode,
  initialPath?: string,
) => {
  const history = new BrowserHistory();
  const navigator = new Navigator(history);
  if (initialPath) {
    navigator.replace(initialPath);
  } else {
    navigator.replace("/");
  }
  const tree = (
    <NavigatorProvider navigator={navigator}>{node}</NavigatorProvider>
  );
  const page = await render(tree);
  const rerender = () => page.rerender(tree);

  return { page, navigator, rerender };
};
