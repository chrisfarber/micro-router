import { number, path } from "@micro-router/core";
import { describe, expect, it } from "vitest";
import { renderHook } from "vitest-browser-react";
import { useLocation, usePathMatch } from "./hooks";
import type { INavigator } from "./navigator";
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

describe("useLocation with a custom navigator", () => {
  it("works with any INavigator, not only the Navigator class", async () => {
    const real = memoryNavigator("/initial");
    const custom: INavigator = {
      get location() {
        return real.location;
      },
      listen: listener => real.listen(listener),
      go: offset => {
        real.go(offset);
      },
      push: (target: string) => {
        real.push(target);
      },
      replace: (target: string) => {
        real.replace(target);
      },
    };
    const hook = await renderHook(() => useLocation(), {
      wrapper: ({ children }) => (
        <NavigatorProvider navigator={custom}>{children}</NavigatorProvider>
      ),
    });

    expect(hook.result.current.pathname).toEqual("/initial");
    await hook.act(() => {
      custom.push("/next");
    });
    expect(hook.result.current.pathname).toEqual("/next");
  });
});

describe("useLocation subscriptions", () => {
  it("subscribes once, not on every render", async () => {
    const real = memoryNavigator("/initial");
    let subscriptions = 0;
    const counting: INavigator = {
      get location() {
        return real.location;
      },
      listen: listener => {
        subscriptions += 1;
        return real.listen(listener);
      },
      go: offset => {
        real.go(offset);
      },
      push: (target: string) => {
        real.push(target);
      },
      replace: (target: string) => {
        real.replace(target);
      },
    };
    const hook = await renderHook(() => useLocation(), {
      wrapper: ({ children }) => (
        <NavigatorProvider navigator={counting}>{children}</NavigatorProvider>
      ),
    });
    const afterMount = subscriptions;

    for (const target of ["/a", "/b", "/c"]) {
      await hook.act(() => {
        counting.push(target);
      });
      expect(hook.result.current.pathname).toEqual(target);
    }
    expect(subscriptions).toEqual(afterMount);
  });
});

describe("usePathMatch", () => {
  const UserPath = path("users", number("userId"));

  it("returns the match when the path matches exactly", async () => {
    const navigator = memoryNavigator("/users/42");
    const hook = await renderHook(() => usePathMatch(UserPath), {
      wrapper: ({ children }) => (
        <NavigatorProvider navigator={navigator}>{children}</NavigatorProvider>
      ),
    });

    expect(hook.result.current).toEqual({
      ok: true,
      data: { userId: 42 },
      exact: true,
      rest: [],
      captures: 1,
    });
  });

  it("can be destructured", async () => {
    const navigator = memoryNavigator("/users/42/settings");
    const hook = await renderHook(
      () => {
        const { ok, data, rest } = usePathMatch(UserPath);
        if (!ok) return null;
        const userId: number = data.userId;
        return { userId, rest };
      },
      {
        wrapper: ({ children }) => (
          <NavigatorProvider navigator={navigator}>
            {children}
          </NavigatorProvider>
        ),
      },
    );

    expect(hook.result.current).toEqual({ userId: 42, rest: ["settings"] });
  });

  it("keeps the same match across hash and query changes", async () => {
    const navigator = memoryNavigator("/users/42");
    const hook = await renderHook(() => usePathMatch(UserPath), {
      wrapper: ({ children }) => (
        <NavigatorProvider navigator={navigator}>{children}</NavigatorProvider>
      ),
    });
    const first = hook.result.current;

    await hook.act(() => {
      navigator.push("/users/42#comments");
    });
    expect(hook.result.current).toBe(first);

    await hook.act(() => {
      navigator.push("/users/42?tab=posts");
    });
    expect(hook.result.current).toBe(first);

    await hook.act(() => {
      navigator.push("/users/7");
    });
    expect(hook.result.current).toMatchObject({
      ok: true,
      data: { userId: 7 },
    });
  });

  it("returns a partial match by default", async () => {
    const navigator = memoryNavigator("/users/42/settings");
    const hook = await renderHook(() => usePathMatch(UserPath), {
      wrapper: ({ children }) => (
        <NavigatorProvider navigator={navigator}>{children}</NavigatorProvider>
      ),
    });

    expect(hook.result.current).toEqual({
      ok: true,
      data: { userId: 42 },
      exact: false,
      rest: ["settings"],
      captures: 1,
    });
  });

  it("returns { ok: false } when the path does not match", async () => {
    const navigator = memoryNavigator("/other/path");
    const hook = await renderHook(() => usePathMatch(UserPath), {
      wrapper: ({ children }) => (
        <NavigatorProvider navigator={navigator}>{children}</NavigatorProvider>
      ),
    });

    expect(hook.result.current).toEqual({ ok: false });
  });

  it("returns { ok: false } for a partial match when exact is true", async () => {
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

    expect(hook.result.current).toEqual({ ok: false });
  });

  it("returns the match for an exact match when exact is true", async () => {
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

    expect(hook.result.current).toEqual({
      ok: true,
      data: { userId: 42 },
      exact: true,
      rest: [],
      captures: 1,
    });
  });

  it("updates when navigation occurs", async () => {
    const navigator = memoryNavigator("/users/1");
    const hook = await renderHook(() => usePathMatch(UserPath), {
      wrapper: ({ children }) => (
        <NavigatorProvider navigator={navigator}>{children}</NavigatorProvider>
      ),
    });

    expect(hook.result.current).toMatchObject({
      ok: true,
      data: { userId: 1 },
    });

    await hook.act(() => {
      navigator.push("/users/999");
    });
    expect(hook.result.current).toMatchObject({
      ok: true,
      data: { userId: 999 },
    });

    await hook.act(() => {
      navigator.push("/other");
    });
    expect(hook.result.current).toEqual({ ok: false });
  });
});
