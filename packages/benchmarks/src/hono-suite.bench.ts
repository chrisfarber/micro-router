/**
 * A port of Hono's router benchmark
 * (https://hono.dev/docs/concepts/benchmarks): a small API's worth of routes,
 * with each request timed on its own.
 *
 * micro-router has no multi-segment wildcard, so it serves `/static/*` with a
 * single-segment one; that's all the wildcard request needs.
 */
import { bench, do_not_optimize, group, run, summary } from "mitata";
import { checkDispatcher } from "./check.ts";
import { contenders } from "./contenders/index.ts";
import { honoRequests, honoRoutes } from "./routes.ts";

const dispatchers = contenders.map(contender => {
  const { dispatch } = contender.prepare(honoRoutes)();
  checkDispatcher(contender, { dispatch }, honoRequests, ["/user/unknown"]);
  return { name: contender.name, dispatch };
});

for (const { label, method, url } of honoRequests) {
  group(`${label}: ${method} ${url}`, () => {
    summary(() => {
      for (const { name, dispatch } of dispatchers) {
        bench(name, () => {
          do_not_optimize(dispatch(method, url));
        });
      }
    });
  });
}

group("all together", () => {
  summary(() => {
    for (const { name, dispatch } of dispatchers) {
      bench(name, () => {
        for (const { method, url } of honoRequests) {
          do_not_optimize(dispatch(method, url));
        }
      });
    }
  });
});

await run();
