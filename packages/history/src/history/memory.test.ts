import { describe, it, expect, beforeEach } from "vitest";
import { MemoryHistory } from "./memory";
import type { Location } from "../types";

const DEFAULT_LOCATION: Location = {
  pathname: "/",
  hash: "",
  search: "",
};

describe("MemoryHistory", () => {
  let history: MemoryHistory;

  beforeEach(() => {
    history = new MemoryHistory();
  });

  it("should initialize with default location", () => {
    expect(history.location).toEqual(DEFAULT_LOCATION);
    expect(history.index).toBe(0);
  });

  it("should push new locations and update index", () => {
    history.push("/foo");
    expect(history.location.pathname).toBe("/foo");
    expect(history.index).toBe(1);
    history.push("/bar");
    expect(history.location.pathname).toBe("/bar");
    expect(history.index).toBe(2);
  });

  it("should go back and forward in history", () => {
    history.push("/foo");
    history.push("/bar");
    history.go(-1);
    expect(history.location.pathname).toBe("/foo");
    history.go(-1);
    expect(history.location.pathname).toBe("/");
    history.go(1);
    expect(history.location.pathname).toBe("/foo");
    history.go(10);
    expect(history.location.pathname).toBe("/bar");
  });

  it("should replace the current location", () => {
    history.push("/foo");
    history.replace("/baz");
    expect(history.location.pathname).toBe("/baz");
    expect(history.index).toBe(1);
  });

  it("should not go below 0 or above history length", () => {
    history.go(-10);
    expect(history.index).toBe(0);
    history.push("/foo");
    history.go(10);
    expect(history.index).toBe(history.history.length - 1);
  });

  it("should discard forward entries when pushing after going back", () => {
    history.push("/foo");
    history.push("/bar");
    history.go(-1);
    history.push("/baz");
    expect(history.location.pathname).toBe("/baz");
    expect(history.history.map(l => l.pathname)).toEqual(["/", "/foo", "/baz"]);
    history.go(1);
    expect(history.location.pathname).toBe("/baz");
    history.go(-1);
    expect(history.location.pathname).toBe("/foo");
  });

  it("should replace the current location after going back", () => {
    history.push("/foo");
    history.push("/bar");
    history.go(-1);
    history.replace("/baz");
    expect(history.location.pathname).toBe("/baz");
    expect(history.index).toBe(1);
    history.go(1);
    expect(history.location.pathname).toBe("/bar");
  });

  it("notifies observers when go changes the location", () => {
    const seen: string[] = [];
    const stop = history.observe(l => {
      seen.push(l.pathname);
    });
    history.push("/foo");
    history.replace("/bar");
    expect(seen).toEqual([]);

    history.go(-1);
    history.go(-1); // already at the start: no change, no notification
    history.go(1);
    expect(seen).toEqual(["/", "/bar"]);

    stop();
    history.go(-1);
    expect(seen).toEqual(["/", "/bar"]);
  });

  it("resolves relative paths against the current location", () => {
    history.push("/users/1?tab=posts");
    history.push("#top");
    expect(history.location).toEqual({
      pathname: "/users/1",
      search: "?tab=posts",
      hash: "#top",
    });
    history.push("2");
    expect(history.location.pathname).toBe("/users/2");
    history.replace("?tab=likes");
    expect(history.location).toEqual({
      pathname: "/users/2",
      search: "?tab=likes",
      hash: "",
    });
  });
});
