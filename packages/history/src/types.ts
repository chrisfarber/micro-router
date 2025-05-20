export interface Location {
  readonly pathname: string;
  readonly hash: string;
  readonly search: string;

  // unsure yet whether it makes sense to expose these:
  // host: string;
  // hostname: string;
  // href: string;
  // origin: string;
  // port: string;
  // protocol: string;
}

/**
 * The History interface abstracts away all necessary interface with the browser. It is **not**
 * meant to be use directly. Instead, use the navigator.
 */
export interface History {
  get location(): Location;
  /** Subscribe to location updates. Returns a cancel fn that can be invoked to stop observing. */
  observe(handler: (location: Location) => void): () => void;

  go(idx: number): void;
  replace(pathOrLocation: string | Location): void;
  push(pathOrLocation: string | Location): void;
}
