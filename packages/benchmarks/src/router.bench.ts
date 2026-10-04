/**
 * Every contender, routing a realistic app at several sizes: building the
 * router, dispatching urls that match, and dispatching urls that don't.
 */
import { bench, do_not_optimize, group, run, summary } from "mitata";
import { checkDispatcher } from "./check.ts";
import { contenders } from "./contenders/index.ts";
import { appMissUrls, appRoutes, sampleUrls } from "./routes.ts";

/** Extra route units per app size; see `appRoutes`. */
const scales = [0, 8, 32, 128];

// Every size dispatches the same number of urls, so results are comparable
// across sizes: only the number of registered routes changes.
const SAMPLE = 64;

const apps = scales.map(scale => {
  const routes = appRoutes(scale);
  const misses = appMissUrls(scale);
  const hits = sampleUrls(routes, SAMPLE);
  return {
    label: `${String(routes.length)} routes`,
    misses,
    hits,
    contenders: contenders.map(contender => {
      const build = contender.prepare(routes);
      const { dispatch } = build();
      checkDispatcher(contender, { dispatch }, routes, misses);
      return { name: contender.name, build, dispatch };
    }),
  };
});

for (const app of apps) {
  group(`construct a router: ${app.label}`, () => {
    summary(() => {
      for (const { name, build } of app.contenders) {
        bench(name, () => {
          do_not_optimize(build());
        });
      }
    });
  });
}

for (const { label, hits, contenders } of apps) {
  group(`dispatch ${String(SAMPLE)} matching urls: ${label}`, () => {
    summary(() => {
      for (const { name, dispatch } of contenders) {
        bench(name, () => {
          for (const url of hits) {
            do_not_optimize(dispatch("GET", url));
          }
        });
      }
    });
  });
}

for (const { label, misses, contenders } of apps) {
  group(`dispatch ${String(misses.length)} non-matching urls: ${label}`, () => {
    summary(() => {
      for (const { name, dispatch } of contenders) {
        bench(name, () => {
          for (const url of misses) {
            do_not_optimize(dispatch("GET", url));
          }
        });
      }
    });
  });
}

await run();
