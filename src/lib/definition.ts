export interface Route<Path extends string, Params extends Record<string, unknown>> {
  _path: Path;
  _params: Params;
}
