import type { History, Location } from "../types";

const currentLocation = (): Location => {
  const { pathname, hash, search } = window.location;
  return { pathname, hash, search };
};

const pathFromLoc = (loc: Location): string => {
  return `${loc.pathname}${loc.search}${loc.hash}`;
};

const path = (loc: string | Location): string =>
  typeof loc === "string" ? loc : pathFromLoc(loc);

/**
 * If the target is the current page with a hash, return the resolved URL
 * as a string.
 */
const isHashOfCurrentPage = (target: string): string | null => {
  const here = window.location;
  const url = new URL(target, here.href);
  const same =
    url.origin === here.origin &&
    url.pathname === here.pathname &&
    url.search === here.search;
  return same && url.hash !== "" ? url.href : null;
};

export class BrowserHistory implements History {
  /**
   * Set while we navigate to a hash ourselves. The browser fires `popstate`
   * for it synchronously, and we don't report our own navigations.
   */
  #navigating = false;

  #navigate(go: () => void): void {
    this.#navigating = true;
    try {
      go();
    } finally {
      this.#navigating = false;
    }
  }

  get location() {
    return currentLocation();
  }

  go(idx: number): void {
    window.history.go(idx);
  }

  push(pathOrLoc: string | Location): void {
    const url = isHashOfCurrentPage(path(pathOrLoc));
    if (url) {
      this.#navigate(() => {
        window.location.assign(url);
      });
    } else {
      window.history.pushState(null, "", path(pathOrLoc));
    }
  }

  replace(pathOrLoc: string | Location): void {
    const url = isHashOfCurrentPage(path(pathOrLoc));
    if (url) {
      this.#navigate(() => {
        window.location.replace(url);
      });
    } else {
      window.history.replaceState(null, "", path(pathOrLoc));
    }
  }

  observe(handler: (location: Location) => void): () => void {
    const notify = () => {
      handler(currentLocation());
    };
    const popstate = () => {
      if (this.#navigating) return;
      notify();
    };
    window.addEventListener("popstate", popstate);
    return () => {
      window.removeEventListener("popstate", popstate);
    };
  }
}
