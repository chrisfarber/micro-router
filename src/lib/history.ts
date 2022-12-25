export interface Location {
  pathname: string;
  hash: string;
  search: string;
  // unsure whether it makes sense to expose these:
  // host: string;
  // hostname: string;
  // href: string;
  // origin: string;
  // port: string;
  // protocol: string;
}

export interface History {
  get location(): Location;
  /** Subscribe to location updates. Returns a cancel fn that can be invoked to stop observing. */
  observe(handler: (location: Location) => void): () => void;

  go(idx: number): void;
  replace(pathOrLocation: string | Location): void;
  push(pathOrLocation: string | Location): void;
}
