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

export class BrowserHistory implements History {
  get location() {
    return currentLocation();
  }

  go(idx: number): void {
    window.history.go(idx);
  }

  push(pathOrLoc: string | Location): void {
    window.history.pushState(null, "", path(pathOrLoc));
  }

  replace(pathOrLoc: string | Location): void {
    window.history.replaceState(null, "", path(pathOrLoc));
  }

  observe(handler: (location: Location) => void): () => void {
    const notify = () => {
      handler(currentLocation());
    };
    const popstate = () => {
      notify();
    };
    window.addEventListener("popstate", popstate);
    return () => {
      window.removeEventListener("popstate", popstate);
    };
  }
}
