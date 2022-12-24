import { Router } from "../router";

const DEFAULT_PATH = "/";

export class MemoryRouter implements Router {
  history: string[] = [DEFAULT_PATH];
  index = 0;

  get location() {
    return this.history[this.index] ?? DEFAULT_PATH;
  }

  go(idx: number): void {}

  push(pathOrUrl: string): void {
    this.history.push(pathOrUrl);
  }

  replace(pathOrUrl: string): void {
    if (this.history.length === 0) {
      this.history.push(pathOrUrl);
    } else {
      this.history[this.history.length] = pathOrUrl;
    }
  }
}
