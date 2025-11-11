import {
  dag,
  Container,
  Directory,
  object,
  func,
  argument,
} from "@dagger.io/dagger";

@object()
export class MicroRouter {
  source: Directory;

  constructor(
    @argument({
      defaultPath: ".",
      ignore: [
        "node_modules",
        "**/node_modules",
        ".turbo",
        ".dagger",
        ".claude",
        ".git",
        ".jj",
        "packages/**/dist",
      ],
    })
    source: Directory,
  ) {
    this.source = source;
  }

  @func()
  container(): Container {
    return dag
      .container()
      .from("node:24")
      .withDirectory("/src", this.source)
      .withWorkdir("/src")
      .withExec(["corepack", "enable"])
      .withExec(["pnpm", "install", "--frozen-lockfile"]);
  }

  @func()
  buildAndTest(): Container {
    return this.container()
      .withExec(["pnpm", "turbo", "build"])
      .withExec(["pnpm", "turbo", "typecheck"])
      .withExec(["pnpm", "turbo", "lint"])
      .withExec(["pnpm", "turbo", "test"]);
  }
}
