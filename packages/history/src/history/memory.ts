import type { History, Location } from "../types";

const DEFAULT_LOCATION: Location = {
  pathname: "/",
  hash: "",
  search: "",
};

/** Like a browser, a relative path is resolved against the current location. */
const parsePath = (path: string, from: Location): Location => {
  const base = new URL(from.pathname + from.search + from.hash, "http://base");
  const url = new URL(path, base);
  return {
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
  };
};

const parsePathOrLoc = (
  pathOrLoc: string | Location,
  from: Location,
): Location => {
  if (typeof pathOrLoc === "string") return parsePath(pathOrLoc, from);
  return pathOrLoc;
};

export class MemoryHistory implements History {
  history: Location[] = [DEFAULT_LOCATION];
  index = 0;

  get location() {
    return this.history[this.index] ?? DEFAULT_LOCATION;
  }

  private observers = new Set<(location: Location) => void>();

  /**
   * Like a browser, observers are notified when `go()` changes the location,
   * but not on `push()` or `replace()`. Unlike a browser, this is synchronous.
   */
  go(offset: number): void {
    const desired = this.index + offset;
    const index = Math.max(0, Math.min(this.history.length - 1, desired));
    if (index === this.index) return;
    this.index = index;
    const { location } = this;
    this.observers.forEach(o => {
      o(location);
    });
  }

  push(pathOrLoc: string | Location): void {
    this.history.splice(this.index + 1);
    this.history.push(parsePathOrLoc(pathOrLoc, this.location));
    this.index = this.history.length - 1;
  }

  replace(pathOrLoc: string | Location): void {
    this.history[this.index] = parsePathOrLoc(pathOrLoc, this.location);
  }

  observe(handler: (location: Location) => void): () => void {
    const observer = (l: Location) => {
      handler(l);
    };
    this.observers.add(observer);
    return () => {
      this.observers.delete(observer);
    };
  }
}
