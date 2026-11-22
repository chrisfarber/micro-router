import { afterEach, describe, expect, it, onTestFinished } from "vitest";
import { BrowserHistory } from "./browser";

describe("BrowserHistory", () => {
  const original = window.location.href;
  afterEach(() => {
    window.history.replaceState(null, "", original);
  });

  const observed = (history: BrowserHistory) => {
    const seen: string[] = [];
    const stop = history.observe(l => {
      seen.push(l.pathname + l.hash);
    });
    onTestFinished(stop);
    return seen;
  };

  /**
   * Waits for the `hashchange` to `hash`. The browser fires it after the
   * navigation, so this gives any late `popstate` a chance to arrive before we
   * check what was reported.
   */
  const hashchanges = () => {
    const hashes: string[] = [];
    const listener = (e: HashChangeEvent) => {
      hashes.push(new URL(e.newURL).hash);
    };
    window.addEventListener("hashchange", listener);
    onTestFinished(() => {
      window.removeEventListener("hashchange", listener);
    });
    return async (hash: string) => {
      await expect.poll(() => hashes).toContain(hash);
      await new Promise(resolve => setTimeout(resolve, 50));
    };
  };

  it("does not report its own pushes and replaces, even of a hash", async () => {
    const history = new BrowserHistory();
    const seen = observed(history);
    const settled = hashchanges();

    history.push("#one");
    history.replace("#two");
    history.push("#two");
    history.push("/elsewhere");
    history.replace("/elsewhere#three");
    expect(window.location.pathname + window.location.hash).toBe(
      "/elsewhere#three",
    );
    await settled("#two");
    expect(seen).toEqual([]);
  });

  it("reports a hash navigation it didn't make, once", async () => {
    const history = new BrowserHistory();
    const seen = observed(history);
    const settled = hashchanges();

    const anchor = document.createElement("a");
    anchor.href = "#section";
    document.body.append(anchor);
    try {
      anchor.click();
    } finally {
      anchor.remove();
    }
    await settled("#section");
    expect(seen).toEqual([window.location.pathname + "#section"]);
  });

  it("reports a hash navigation made by another BrowserHistory", async () => {
    const history = new BrowserHistory();
    const seen = observed(history);
    const settled = hashchanges();

    new BrowserHistory().push("#section");
    await settled("#section");
    expect(seen).toEqual([window.location.pathname + "#section"]);
  });

  it("reports going back", async () => {
    const history = new BrowserHistory();
    const seen = observed(history);
    const here = window.location.pathname;

    history.push("#a");
    history.push("/elsewhere");
    history.go(-1);
    await expect.poll(() => seen).toEqual([here + "#a"]);
  });
});
