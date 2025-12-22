import { number, path } from "@micro-router/core";
import { describe, expect, it } from "vitest";
import { renderHook } from "vitest-browser-react";
import { useLocation, usePathMatch } from "./hooks";
import { NavigatorProvider } from "./provider";
import { memoryNavigator } from "./test-helpers";

describe("useLocation", () => {
  it("returns the current location", async () => {
    const navigator = memoryNavigator("/some/path");
    const hook = await renderHook(() => useLocation(), {
      wrapper: ({ children }) => (
        <NavigatorProvider navigator={navigator}>{children}</NavigatorProvider>
      ),
    });

    expect(hook.result.current.pathname).toEqual("/some/path");
  });

  it("updates when navigation occurs", async () => {
    const navigator = memoryNavigator("/initial");
    const hook = await renderHook(() => useLocation(), {
      wrapper: ({ children }) => (
        <NavigatorProvider navigator={navigator}>{children}</NavigatorProvider>
      ),
    });

    expect(hook.result.current.pathname).toEqual("/initial");

    await hook.act(() => {
      navigator.push("/updated");
    });
    expect(hook.result.current.pathname).toEqual("/updated");

    await hook.act(() => {
      navigator.push("/another");
    });
    expect(hook.result.current.pathname).toEqual("/another");
  });

  it("updates when using replace", async () => {
    const navigator = memoryNavigator("/start");
    const hook = await renderHook(() => useLocation(), {
      wrapper: ({ children }) => (
        <NavigatorProvider navigator={navigator}>{children}</NavigatorProvider>
      ),
    });

    expect(hook.result.current.pathname).toEqual("/start");

    await hook.act(() => {
      navigator.replace("/replaced");
    });
    expect(hook.result.current.pathname).toEqual("/replaced");
  });
});

describe("usePathMatch", () => {
  const UserPath = path("users", number("userId"));

  it("returns [true, data] when path matches exactly", async () => {
    const navigator = memoryNavigator("/users/42");
    const hook = await renderHook(() => usePathMatch(UserPath), {
      wrapper: ({ children }) => (
        <NavigatorProvider navigator={navigator}>{children}</NavigatorProvider>
      ),
    });

    expect(hook.result.current).toEqual([true, { userId: 42 }]);
  });

  it("returns [true, data] for partial match by default", async () => {
    const navigator = memoryNavigator("/users/42/settings");
    const hook = await renderHook(() => usePathMatch(UserPath), {
      wrapper: ({ children }) => (
        <NavigatorProvider navigator={navigator}>{children}</NavigatorProvider>
      ),
    });

    expect(hook.result.current).toEqual([true, { userId: 42 }]);
  });

  it("returns [false, null] when path does not match", async () => {
    const navigator = memoryNavigator("/other/path");
    const hook = await renderHook(() => usePathMatch(UserPath), {
      wrapper: ({ children }) => (
        <NavigatorProvider navigator={navigator}>{children}</NavigatorProvider>
      ),
    });

    expect(hook.result.current).toEqual([false, null]);
  });

  it("returns [false, null] for partial match when exact is true", async () => {
    const navigator = memoryNavigator("/users/42/settings");
    const hook = await renderHook(
      () => usePathMatch(UserPath, { exact: true }),
      {
        wrapper: ({ children }) => (
          <NavigatorProvider navigator={navigator}>
            {children}
          </NavigatorProvider>
        ),
      },
    );

    expect(hook.result.current).toEqual([false, null]);
  });

  it("returns [true, data] for exact match when exact is true", async () => {
    const navigator = memoryNavigator("/users/42");
    const hook = await renderHook(
      () => usePathMatch(UserPath, { exact: true }),
      {
        wrapper: ({ children }) => (
          <NavigatorProvider navigator={navigator}>
            {children}
          </NavigatorProvider>
        ),
      },
    );

    expect(hook.result.current).toEqual([true, { userId: 42 }]);
  });

  it("updates when navigation occurs", async () => {
    const navigator = memoryNavigator("/users/1");
    const hook = await renderHook(() => usePathMatch(UserPath), {
      wrapper: ({ children }) => (
        <NavigatorProvider navigator={navigator}>{children}</NavigatorProvider>
      ),
    });

    expect(hook.result.current).toEqual([true, { userId: 1 }]);

    await hook.act(() => {
      navigator.push("/users/999");
    });
    expect(hook.result.current).toEqual([true, { userId: 999 }]);

    await hook.act(() => {
      navigator.push("/other");
    });
    expect(hook.result.current).toEqual([false, null]);
  });
});
