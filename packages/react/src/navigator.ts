import type { ConstPath, DataOfPath, Path } from "@micro-router/core";
import type { History, Location } from "@micro-router/history";

/** @inline */
type Listener = (l: Location) => void;
/** @inline */
type StopListening = () => void;

export interface INavigator {
  /**
   * Start listening and responding to history events.
   * `<NavigatorProvider>` will call this automatically.
   */
  start(): void;
  /**
   * Stop listening to history events.
   * `<NavigatorProvider>` will call this automatically
   * when it is unmounted.
   */
  stop(): void;

  get location(): Location;

  go(offset: number): void;

  push(path: string | ConstPath): void;
  push<P extends Path>(path: P, params: DataOfPath<P>): void;

  replace(path: string | ConstPath): void;
  replace<P extends Path>(path: P, params: DataOfPath<P>): void;
}

export class Navigator implements INavigator {
  constructor(private history: History) {
    this._location = Object.freeze(history.location);
  }

  private _stop: StopListening | null = null;
  start() {
    this.stop();
    this._stop = this.history.observe(l => {
      this._observe(l);
    });
  }

  stop() {
    this._stop?.();
    this._stop = null;
  }

  private _location: Location;
  private listeners = new Set<Listener>();

  get location(): Location {
    return this._location;
  }

  listen(f: Listener): StopListening {
    this.listeners.add(f);
    return () => {
      this.listeners.delete(f);
    };
  }

  go(offset: number): void {
    this.history.go(offset);
    this.updateAndNotify();
  }

  push(path: string | Path, params?: unknown): void {
    const target = typeof path === "string" ? path : path.make(params || {});
    if (target === this.currentLocationString()) {
      return;
    }
    this.history.push(target);
    this.updateAndNotify();
  }

  private currentLocationString(): string {
    const loc = this._location;
    return loc.pathname + loc.search + loc.hash;
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
    this._location = Object.freeze(this.history.location);
    this.notify();
  }

  private _observe(l: Location) {
    this._location = Object.freeze(l);
    this.notify();
  }
}
