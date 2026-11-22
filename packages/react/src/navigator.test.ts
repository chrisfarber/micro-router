import {
  type History,
  type Location,
  MemoryHistory,
} from "@micro-router/history";
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

    it("does not push a target that resolves to the current location", () => {
      const history = new MemoryHistory();
      const navigator = new Navigator(history);

      navigator.push("/a/b");
      expect(history.history).toHaveLength(2);

      navigator.push("b");
      navigator.push("/a/b?");
      navigator.push("./b#");
      expect(history.history).toHaveLength(2);

      navigator.push("#x");
      navigator.push("#x");
      expect(history.history).toHaveLength(3);
      expect(navigator.location.hash).toBe("#x");
    });

    it("does not notify when the location doesn't change", () => {
      const navigator = new Navigator(new MemoryHistory());
      navigator.push("/a#x");
      const seen: string[] = [];
      navigator.listen(l => {
        seen.push(l.pathname + l.hash);
      });

      navigator.push("/a#x");
      navigator.replace("/a#x");
      navigator.push("/a");
      expect(seen).toEqual(["/a"]);
    });
  });

  describe("go", () => {
    /** A history whose `go()` reports the change later, like a browser's. */
    class AsyncHistory implements History {
      memory = new MemoryHistory();
      private pending: number | null = null;
      private handlers = new Set<(l: Location) => void>();
      get location() {
        return this.memory.location;
      }
      observe(handler: (l: Location) => void) {
        this.handlers.add(handler);
        return () => {
          this.handlers.delete(handler);
        };
      }
      go(offset: number) {
        this.pending = offset;
      }
      settle() {
        if (this.pending === null) return;
        this.memory.go(this.pending);
        this.pending = null;
        this.handlers.forEach(h => {
          h(this.location);
        });
      }
      push(p: string) {
        this.memory.push(p);
      }
      replace(p: string) {
        this.memory.replace(p);
      }
    }

    it("only notifies once the history reports the new location", () => {
      const history = new AsyncHistory();
      const navigator = new Navigator(history);
      navigator.push("/next");

      const seen: string[] = [];
      navigator.listen(l => {
        seen.push(l.pathname);
      });

      navigator.go(-1);
      expect(seen).toEqual([]);
      expect(navigator.location.pathname).toBe("/next");

      history.settle();
      expect(seen).toEqual(["/"]);
      expect(navigator.location.pathname).toBe("/");
    });

    it("notifies once with a memory history", () => {
      const history = new MemoryHistory();
      const navigator = new Navigator(history);
      navigator.push("/next");

      const seen: string[] = [];
      navigator.listen(l => {
        seen.push(l.pathname);
      });
      navigator.go(-1);
      expect(seen).toEqual(["/"]);
    });
  });

  describe("observing the history", () => {
    /** A memory history that counts its observers. */
    class CountingHistory extends MemoryHistory {
      active = 0;
      override observe(handler: (l: Location) => void) {
        this.active += 1;
        const stop = super.observe(handler);
        return () => {
          this.active -= 1;
          stop();
        };
      }
    }

    it("observes only while something is listening", () => {
      const history = new CountingHistory();
      const navigator = new Navigator(history);
      expect(history.active).toBe(0);

      const stopA = navigator.listen(() => {});
      const stopB = navigator.listen(() => {});
      expect(history.active).toBe(1);

      stopA();
      expect(history.active).toBe(1);
      stopB();
      expect(history.active).toBe(0);

      navigator.listen(() => {});
      expect(history.active).toBe(1);
    });

    it("ignores stopping the same listener twice", () => {
      const history = new CountingHistory();
      const navigator = new Navigator(history);
      const stopA = navigator.listen(() => {});
      navigator.listen(() => {});

      stopA();
      stopA();
      expect(history.active).toBe(1);
    });

    it("treats listening twice with one function as two listeners", () => {
      const history = new CountingHistory();
      const navigator = new Navigator(history);
      const seen: string[] = [];
      const listener = (l: Location) => {
        seen.push(l.pathname);
      };
      const stopA = navigator.listen(listener);
      navigator.listen(listener);

      stopA();
      expect(history.active).toBe(1);
      navigator.push("/next");
      expect(seen).toEqual(["/next"]);
    });

    it("catches up with the history when something starts listening", () => {
      const history = new MemoryHistory();
      const navigator = new Navigator(history);
      history.push("/elsewhere");

      const seen: string[] = [];
      const stop = navigator.listen(l => {
        seen.push(l.pathname);
      });
      expect(seen).toEqual(["/elsewhere"]);

      stop();
      history.go(-1);
      navigator.listen(l => {
        seen.push(l.pathname);
      });
      expect(seen).toEqual(["/elsewhere", "/"]);
    });

    it("does not notify a new listener when nothing changed", () => {
      const navigator = new Navigator(new MemoryHistory());
      const seen: string[] = [];
      navigator.listen(l => {
        seen.push(l.pathname);
      });
      expect(seen).toEqual([]);
    });

    it("reports the history's location while nobody is listening", () => {
      const history = new MemoryHistory();
      const navigator = new Navigator(history);
      const first = navigator.location;
      expect(navigator.location).toBe(first);

      history.push("/a");
      history.push("/b");
      history.go(-1);
      expect(navigator.location.pathname).toBe("/a");
      expect(navigator.location).toBe(navigator.location);
    });
  });
});
