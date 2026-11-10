import type { History, Location } from "../types";

const DEFAULT_LOCATION: Location = {
  pathname: "/",
  hash: "",
  search: "",
};

const parsePath = (path: string): Location => {
  const url = new URL(path, "http://base");
  return {
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
  };
};

const parsePathOrLoc = (pathOrLoc: string | Location): Location => {
  if (typeof pathOrLoc === "string") return parsePath(pathOrLoc);
  return pathOrLoc;
};

export class MemoryHistory implements History {
  history: Location[] = [DEFAULT_LOCATION];
  index = 0;

  get location() {
    return this.history[this.index] ?? DEFAULT_LOCATION;
  }

  go(offset: number): void {
    const desired = this.index + offset;
    this.index = Math.max(0, Math.min(this.history.length - 1, desired));
  }

  push(pathOrLoc: string | Location): void {
    // like a browser, pushing after going back discards the forward entries
    this.history.splice(this.index + 1);
    this.history.push(parsePathOrLoc(pathOrLoc));
    this.index = this.history.length - 1;
  }

  replace(pathOrLoc: string | Location): void {
    this.history[this.index] = parsePathOrLoc(pathOrLoc);
  }

  observe(): () => void {
    return () => {};
  }
}
