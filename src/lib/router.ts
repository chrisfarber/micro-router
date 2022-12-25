import { History, Location } from "./history";

type Listener = (l: Location) => void;
type StopListening = () => void;
export class Router {
  constructor(private history: History) {
    history.observe(l => this._observe(l));
    this._location = Object.freeze(history.location);
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
    this._location = Object.freeze(this.history.location);
    this.notify();
  }
}
