/**
 * Builds the benchmark app twice, once interpreted and once with AOT
 * compilation, serves each locally with `fastly compute serve` (Viceroy), and
 * prints a table of the results.
 *
 * Every request is a fresh instance, so each measurement is repeated across
 * several requests and the median is reported.
 *
 * Usage: node scripts/bench.ts [--iterations=N] [--repeats=N] [--only=interpreted|aot]
 */
import { execFileSync, spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";

/** A result from the app's `/` endpoint. */
type LoopResult = {
  contender: string;
  label: string;
  ms: number;
  iterations: number;
};

/** A result from the app's `/first` endpoint. */
type FirstResult = {
  contender: string;
  label: string;
  ms: number;
};

/** request label → contender → samples in ns */
type Samples = Map<string, Map<string, number[]>>;

const { values: args } = parseArgs({
  options: {
    iterations: { type: "string", default: "2000" },
    repeats: { type: "string", default: "5" },
    only: { type: "string" },
  },
});
const iterations = Number(args.iterations);
const repeats = Number(args.repeats);

const variants = [
  { name: "interpreted", script: "build:wasm", wasm: "bin/main.wasm" },
  { name: "aot", script: "build:wasm:aot", wasm: "bin/main-aot.wasm" },
].filter(({ name }) => !args.only || args.only === name);

const addr = "127.0.0.1:7676";

/** Fetches one of the app's endpoints; each returns JSON of type `T`. */
const get = async <T>(path: string): Promise<T> => {
  const res = await fetch(`http://${addr}${path}`);
  if (!res.ok) {
    throw new Error(`${path}: ${String(res.status)} ${await res.text()}`);
  }
  return (await res.json()) as T;
};

const waitForServer = async () => {
  for (let i = 0; i < 120; i++) {
    try {
      return await get<string[]>("/contenders");
    } catch {
      await sleep(500);
    }
  }
  throw new Error("server didn't start");
};

const median = (xs: number[]) => {
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? NaN;
};

const formatNs = (ns: number) =>
  ns >= 10_000 ? `${(ns / 1000).toFixed(1)} µs` : `${ns.toFixed(0)} ns`;

/** Prints one row per request, one column per contender. */
const printTable = (title: string, contenders: string[], samples: Samples) => {
  console.log(`\n${title}`);
  const rows = [["request", ...contenders]];
  for (const [label, byContender] of samples) {
    rows.push([
      label,
      ...contenders.map(c => formatNs(median(byContender.get(c) ?? []))),
    ]);
  }
  const widths = (rows[0] ?? []).map((_, i) =>
    Math.max(...rows.map(r => r[i]?.length ?? 0)),
  );
  for (const row of rows) {
    console.log(
      row
        .map((cell, i) =>
          i === 0 ? cell.padEnd(widths[i] ?? 0) : cell.padStart(widths[i] ?? 0),
        )
        .join("   "),
    );
  }
};

const addSample = (
  samples: Samples,
  label: string,
  contender: string,
  ns: number,
) => {
  let byContender = samples.get(label);
  if (!byContender) {
    samples.set(label, (byContender = new Map<string, number[]>()));
  }
  let list = byContender.get(contender);
  if (!list) byContender.set(contender, (list = []));
  list.push(ns);
};

for (const variant of variants) {
  console.log(`\n=== ${variant.name}: building ${variant.wasm} ===`);
  execFileSync("pnpm", ["run", variant.script], { stdio: "inherit" });

  const server = spawn(
    "fastly",
    [
      "compute",
      "serve",
      "--skip-build",
      `--file=${variant.wasm}`,
      `--addr=${addr}`,
    ],
    { stdio: "ignore", detached: true },
  );
  try {
    const contenders = await waitForServer();

    const loops: Samples = new Map();
    for (let r = 0; r < repeats; r++) {
      for (const { contender, label, ms, iterations: n } of await get<
        LoopResult[]
      >(`/?iterations=${String(iterations)}`)) {
        addSample(loops, label, contender, (ms * 1e6) / n);
      }
    }
    printTable(
      `${variant.name}: per dispatch, after ${String(iterations)} in a loop (median of ${String(repeats)} requests)`,
      contenders,
      loops,
    );

    const first: Samples = new Map();
    for (let r = 0; r < repeats; r++) {
      for (let i = 0; i < contenders.length; i++) {
        for (const { contender, label, ms } of await get<FirstResult[]>(
          `/first?contender=${String(i)}`,
        )) {
          addSample(first, label, contender, ms * 1e6);
        }
      }
    }
    printTable(
      `${variant.name}: first dispatch of each request in a fresh instance (median of ${String(repeats)} requests)`,
      contenders,
      first,
    );
  } finally {
    // `fastly compute serve` starts Viceroy as a child; stop the whole group.
    process.kill(-(server.pid ?? 0), "SIGTERM");
    await sleep(500);
  }
}
