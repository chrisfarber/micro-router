/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConstPath, ParamsOf, Path } from "./definition";
import { History, Location } from "./history";

type Listener = (l: Location) => void;
type StopListening = () => void;

export interface INavigator {
  get location(): Location;

  go(offset: number): void;

  push(path: string): void;
  push<P extends ConstPath>(path: P): void;
  push<P extends Path>(path: P, params: ParamsOf<P>): void;

  replace(path: string): void;
  replace<P extends ConstPath>(path: P): void;
  replace<P extends Path>(path: P, params: ParamsOf<P>): void;
}

export class Navigator implements INavigator {
  constructor(private history: History) {
    this._location = Object.freeze(history.location);
  }

  private _stop: StopListening | null = null;
  start() {
    this.stop();
    this._stop = this.history.observe(l => this._observe(l));
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
    if (typeof path === "string") {
      this.history.push(path);
    } else {
      this.history.push(path.make(params || {}));
    }
    this.updateAndNotify();
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
    this.listeners.forEach(l => l(this._location));
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
