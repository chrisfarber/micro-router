import type { ConstPath, DataOfPath, Path } from "@micro-router/core";
import type { History, Location } from "@micro-router/history";

/** @inline */
type Listener = (l: Location) => void;
/** @inline */
type StopListening = () => void;

export interface INavigator {
  /**
   * The current location. The same object is returned until the location
   * changes, so that it can be used as a snapshot.
   */
  get location(): Location;

  /**
   * Subscribe to location changes. Returns a function that stops listening.
   */
  listen(listener: Listener): StopListening;

  go(offset: number): void;

  push(path: string | ConstPath): void;
  push<P extends Path>(path: P, params: DataOfPath<P>): void;

  replace(path: string | ConstPath): void;
  replace<P extends Path>(path: P, params: DataOfPath<P>): void;
}

const locationString = (l: Location): string => l.pathname + l.search + l.hash;

/**
 * Navigates a `History`, and tells listeners when the location changes.
 *
 * The navigator observes its history only while something is listening, so
 * that once every listener has stopped, nothing holds on to the navigator.
 */
export class Navigator implements INavigator {
  constructor(private history: History) {
    this._location = Object.freeze(history.location);
  }

  private _location: Location;
  private listeners = new Set<Listener>();
  private _unobserve: (() => void) | null = null;

  get location(): Location {
    // Nothing tells us about changes while nobody is listening, so check.
    if (!this._unobserve) this._observe(this.history.location);
    return this._location;
  }

  listen(f: Listener): StopListening {
    // wrap, so that listening twice with the same function is two listeners
    const listener: Listener = l => {
      f(l);
    };
    this.listeners.add(listener);
    if (!this._unobserve) {
      this._unobserve = this.history.observe(l => {
        this._observe(l);
      });
      // the history may have changed while nobody was listening
      this._observe(this.history.location);
    }
    return () => {
      if (!this.listeners.delete(listener)) return;
      if (this.listeners.size === 0) {
        this._unobserve?.();
        this._unobserve = null;
      }
    };
  }

  /**
   * Like `history.go()`. The location changes when the history reports it,
   * which in a browser is asynchronous.
   */
  go(offset: number): void {
    this.history.go(offset);
  }

  push(path: string | Path, params?: unknown): void {
    const target = typeof path === "string" ? path : path.make(params || {});
    if (this.isCurrentLocation(target)) {
      // Going to the hash you're on doesn't add an entry, but a browser
      // history still scrolls to it again.
      if (new URL(target, "http://base").hash !== "") {
        this.history.replace(target);
        this.updateAndNotify();
      }
      return;
    }
    this.history.push(target);
    this.updateAndNotify();
  }

  private currentLocationString(): string {
    return locationString(this._location);
  }

  /** Whether `target`, resolved against the current location, is the same. */
  private isCurrentLocation(target: string): boolean {
    const base = new URL(this.currentLocationString(), "http://base");
    const url = new URL(target, base);
    return (
      url.origin === base.origin &&
      url.pathname + url.search + url.hash === this.currentLocationString()
    );
  }

  replace(path: string | Path, params?: unknown): void {
    if (typeof path === "string") {
      this.history.replace(path);
    } else {
      this.history.replace(path.make(params || {}));
    }
    this.updateAndNotify();
  }

  private notify() {
    this.listeners.forEach(l => {
      l(this._location);
    });
  }

  private updateAndNotify() {
    this._observe(this.history.location);
  }

  /**
   * Adopt `l` as the location, and notify listeners if it changed. An
   * unchanged location keeps the same object, so that it's a stable snapshot.
   */
  private _observe(l: Location) {
    if (locationString(l) === this.currentLocationString()) return;
    this._location = Object.freeze(l);
    this.notify();
  }
}
