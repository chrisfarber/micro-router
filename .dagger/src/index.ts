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
    const pnpmCache = dag.cacheVolume("pnpm-store");
    const nodeCache = dag.cacheVolume("node");
    return dag
      .container()
      .from("node:24")
      .withEnvVariable("CI", "true")
      .withExec(["npx", "playwright@1.57.0", "install", "--with-deps"])
      .withDirectory("/src", this.source)
      .withWorkdir("/src")
      .withMountedCache("/root/.cache/node", nodeCache)
      .withMountedCache("/root/.local/share/pnpm/store", pnpmCache)
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
