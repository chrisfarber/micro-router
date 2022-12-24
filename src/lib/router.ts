export interface Router {
  replace(pathOrUrl: string): void;
  push(pathOrUrl: string): void;

  go(idx: number): void;
  get location(): string;
}
