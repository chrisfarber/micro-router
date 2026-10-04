/**
 * One cold start: import a contender (and so its library), define an app's
 * routes, build a router, and dispatch a handful of urls, timing each phase.
 * Run by `cold-start.ts` in a fresh process each time, so that none of this
 * code has been optimized yet.
 *
 * Usage: node cold-start-child.ts <contender module> <scale>
 */
import type { Contender } from "./contenders/contender.ts";

const [module = "micro-router", scaleArg = "0"] = process.argv.slice(2);
const scale = Number(scaleArg);
const DISPATCHES = 10;

// Not timed: the route suite is plain data, with no imports.
const { appRoutes, sampleUrls } = await import("./routes.ts");

const t0 = performance.now();
const { default: contender } = (await import(`./contenders/${module}.ts`)) as {
  default: Contender;
};
const t1 = performance.now();
const routes = appRoutes(scale);
const t1b = performance.now();
const build = contender.prepare(routes);
const t2 = performance.now();
const { dispatch } = build();
const t3 = performance.now();

const [first = "/", ...rest] = sampleUrls(routes, DISPATCHES);
const t4 = performance.now();
const results = [dispatch("GET", first)];
const t5 = performance.now();
for (const url of rest) {
  results.push(dispatch("GET", url));
}
const t6 = performance.now();

if (results.some(r => r === null)) {
  throw new Error("a sampled url failed to dispatch");
}

process.stdout.write(
  JSON.stringify({
    import: t1 - t0,
    defineRoutes: t2 - t1b,
    buildRouter: t3 - t2,
    firstDispatch: t5 - t4,
    [`next ${String(rest.length)} dispatches`]: t6 - t5,
    total: t1 - t0 + (t3 - t1b) + (t6 - t4),
  }),
);
