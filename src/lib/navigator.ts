import { History, Location } from "./history";

type Listener = (l: Location) => void;
type StopListening = () => void;

export class Navigator {
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

  private notify() {
    this.listeners.forEach(l => l(this._location));
  }

  private _observe(l: Location) {
    this._location = Object.freeze(l);
    this.notify();
  }
}
