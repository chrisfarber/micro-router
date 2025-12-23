import { MemoryHistory } from "@micro-router/history";
import { describe, expect, it } from "vitest";
import { Navigator } from "./navigator";

describe("Navigator", () => {
  describe("push", () => {
    it("pushes a new location to history", () => {
      const history = new MemoryHistory();
      const navigator = new Navigator(history);

      navigator.push("/page-one");
      expect(navigator.location.pathname).toBe("/page-one");
      expect(history.history).toHaveLength(2);

      navigator.push("/page-two");
      expect(navigator.location.pathname).toBe("/page-two");
      expect(history.history).toHaveLength(3);
    });

    it("does not push duplicate entries for the same pathname", () => {
      const history = new MemoryHistory();
      const navigator = new Navigator(history);

      navigator.push("/page-one");
      expect(history.history).toHaveLength(2);

      navigator.push("/page-one");
      expect(history.history).toHaveLength(2);
      expect(navigator.location.pathname).toBe("/page-one");
    });

    it("does not push duplicate entries when pathname and search match", () => {
      const history = new MemoryHistory();
      const navigator = new Navigator(history);

      navigator.push("/search?q=test");
      expect(history.history).toHaveLength(2);

      navigator.push("/search?q=test");
      expect(history.history).toHaveLength(2);
    });

    it("pushes when search differs", () => {
      const history = new MemoryHistory();
      const navigator = new Navigator(history);

      navigator.push("/search?q=foo");
      expect(history.history).toHaveLength(2);

      navigator.push("/search?q=bar");
      expect(history.history).toHaveLength(3);
    });

    it("does not push duplicate entries when pathname and hash match", () => {
      const history = new MemoryHistory();
      const navigator = new Navigator(history);

      navigator.push("/page#section");
      expect(history.history).toHaveLength(2);

      navigator.push("/page#section");
      expect(history.history).toHaveLength(2);
    });

    it("pushes when hash differs", () => {
      const history = new MemoryHistory();
      const navigator = new Navigator(history);

      navigator.push("/page#section-1");
      expect(history.history).toHaveLength(2);

      navigator.push("/page#section-2");
      expect(history.history).toHaveLength(3);
    });

    it("does not push duplicate when full URL matches (pathname + search + hash)", () => {
      const history = new MemoryHistory();
      const navigator = new Navigator(history);

      navigator.push("/page?q=test#section");
      expect(history.history).toHaveLength(2);

      navigator.push("/page?q=test#section");
      expect(history.history).toHaveLength(2);
    });

    it("pushes when any part of URL differs", () => {
      const history = new MemoryHistory();
      const navigator = new Navigator(history);

      navigator.push("/page?q=test#section");
      expect(history.history).toHaveLength(2);

      // Different pathname
      navigator.push("/other?q=test#section");
      expect(history.history).toHaveLength(3);

      // Different search
      navigator.push("/other?q=different#section");
      expect(history.history).toHaveLength(4);

      // Different hash
      navigator.push("/other?q=different#other");
      expect(history.history).toHaveLength(5);
    });
  });
});
