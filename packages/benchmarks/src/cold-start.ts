/**
 * Measures startup cost: everything an app does with a router before the JIT
 * has had a chance to optimize anything. mitata can't measure this (it warms up
 * and then runs a function many times), so each sample is a fresh process.
 *
 * Usage: node cold-start.ts [runs]
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const child = fileURLToPath(new URL("./cold-start-child.ts", import.meta.url));
const runs = Number(process.argv[2] ?? "40");
const WARMUP_RUNS = 3; // discarded; they mostly warm the OS file cache
const scales = [0, 128];
/** Modules in `./contenders`, each run in its own process. */
const contenders = ["micro-router", "hono-trie", "hono-smart"];

type Sample = Record<string, number>;

const sample = (contender: string, scale: number): Sample => {
  const res = spawnSync(process.execPath, [child, contender, String(scale)], {
    encoding: "utf8",
  });
  if (res.status !== 0) {
    throw new Error(`cold start child failed:\n${res.stderr}`);
  }
  return JSON.parse(res.stdout) as Sample;
};

const percentile = (sorted: number[], p: number) =>
  sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? NaN;

const ms = (n: number) => `${n.toFixed(3)} ms`;

for (const scale of scales) {
  for (let i = 0; i < WARMUP_RUNS; i++) {
    for (const contender of contenders) sample(contender, scale);
  }
  // Interleave the contenders, so that drift over the run affects them all.
  const samples = new Map<string, Sample[]>(contenders.map(c => [c, []]));
  for (let i = 0; i < runs; i++) {
    for (const contender of contenders) {
      samples.get(contender)?.push(sample(contender, scale));
    }
  }

  const routes = scale === 0 ? "app" : `app + ${String(scale)} units`;
  console.log(`\ncold start, ${routes} (${String(runs)} runs; median, p95)`);
  const phases = Object.keys(samples.get(contenders[0] ?? "")?.[0] ?? {});
  console.table(
    Object.fromEntries(
      phases.map(phase => [
        phase,
        Object.fromEntries(
          contenders.map(contender => {
            const sorted = (samples.get(contender) ?? [])
              .map(s => s[phase] ?? NaN)
              .sort((a, b) => a - b);
            return [
              contender,
              `${ms(percentile(sorted, 0.5))}, ${ms(percentile(sorted, 0.95))}`,
            ];
          }),
        ),
      ]),
    ),
  );
}
