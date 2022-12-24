import { Router } from "../router";

export class BrowserRouter implements Router {
  get location() {
    return window.location.pathname;
  }

  go(idx: number): void {
    window.history.go(idx);
  }

  push(pathOrUrl: string): void {
    window.history.pushState(null, "", pathOrUrl);
  }

  replace(pathOrUrl: string): void {
    window.history.replaceState(null, "", pathOrUrl);
  }

  observe() {
    window.addEventListener("hashchange", e => {
      console.log("hashch", e);
    });

    window.addEventListener("popstate", e => {
      console.log("popstate", e, this.location);
    });
  }
}
