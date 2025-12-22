import { MemoryHistory } from "@micro-router/history";
import type { ReactNode } from "react";
import { render } from "vitest-browser-react";
import { Navigator } from "../navigator";
import { NavigatorProvider } from "../provider";

export const memoryNavigator = (initialPath: string = "/") => {
  const history = new MemoryHistory();
  const navigator = new Navigator(history);
  navigator.replace(initialPath);
  return navigator;
};

export const renderWithNavigator = async (
  node: ReactNode,
  initialPath?: string,
) => {
  /**
   * Even though we are running our tests in a real browser, we are using
   * a fake for the history API.
   *
   * Why? Well, apparently too many history events in too short of a time will
   * cause WebKit to throw a "SecurityError"
   */
  const navigator = memoryNavigator(initialPath);
  const tree = (
    <NavigatorProvider navigator={navigator}>{node}</NavigatorProvider>
  );
  const page = await render(tree);
  const rerender = () => page.rerender(tree);

  return { page, navigator, rerender };
};
