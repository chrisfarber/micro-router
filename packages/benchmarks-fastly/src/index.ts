/// <reference types="@fastly/js-compute" />

/**
 * The Hono router benchmark (see `@micro-router/benchmarks`), run inside
 * Fastly Compute's JavaScript runtime: SpiderMonkey compiled to WebAssembly,
 * rather than V8.
 *
 * Every request runs in a fresh instance, restored from a snapshot taken
 * after this module's top level ran at build time. So the routers built here
 * cost nothing per request, but nothing is warmed up between requests either.
 *
 * Endpoints:
 * - `/?iterations=N` times N dispatches of each request, per contender.
 * - `/first?contender=I` times the first dispatch of each request for one
 *   contender, in an instance that hasn't dispatched anything yet.
 */
import type { Match } from "@micro-router/benchmarks/src/contenders/contender.ts";
import { contenders } from "@micro-router/benchmarks/src/contenders/index.ts";
import {
  honoRequests,
  honoRoutes,
} from "@micro-router/benchmarks/src/routes.ts";

const dispatchers = contenders.map(contender => ({
  name: contender.name,
  dispatch: contender.prepare(honoRoutes)().dispatch,
}));

const normalizeData = (
  data: Record<string, string> | null,
): Record<string, string> | null =>
  data && Object.keys(data).length > 0 ? data : null;

/**
 * Returns a description of what went wrong, unless the match is the one
 * expected. (`node:assert` isn't available here.)
 */
const checkMatch = (
  match: Match | null,
  { name, data }: (typeof honoRequests)[number],
) => {
  if (!match) return "no match";
  if (match.name !== name) return `matched ${match.name}`;
  const actual = JSON.stringify(normalizeData(match.data));
  const expected = JSON.stringify(normalizeData(data));
  if (actual !== expected) return `data ${actual}, expected ${expected}`;
  return null;
};

const timeLoops = (iterations: number) =>
  dispatchers.flatMap(({ name, dispatch }) =>
    honoRequests.map(request => {
      const { label, method, url } = request;
      const error = checkMatch(dispatch(method, url), request);
      if (error) throw new Error(`${name}: ${method} ${url}: ${error}`);

      let sink = 0;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        if (dispatch(method, url)) sink++;
      }
      const ms = performance.now() - start;
      return { contender: name, label, url, ms, iterations, sink };
    }),
  );

const timeFirst = (index: number) => {
  const dispatcher = dispatchers[index];
  if (!dispatcher) throw new Error(`no contender ${String(index)}`);
  const { name, dispatch } = dispatcher;
  return honoRequests.map(request => {
    const { label, method, url } = request;
    const start = performance.now();
    const match = dispatch(method, url);
    const ms = performance.now() - start;
    const error = checkMatch(match, request);
    if (error) throw new Error(`${name}: ${method} ${url}: ${error}`);
    return { contender: name, label, url, ms };
  });
};

const handle = (request: Request) => {
  const url = new URL(request.url);
  try {
    let body;
    if (url.pathname === "/") {
      const iterations = Number(url.searchParams.get("iterations") ?? 2000);
      body = timeLoops(iterations);
    } else if (url.pathname === "/first") {
      body = timeFirst(Number(url.searchParams.get("contender") ?? 0));
    } else if (url.pathname === "/contenders") {
      body = dispatchers.map(({ name }) => name);
    } else {
      return new Response("not found", { status: 404 });
    }
    return Response.json(body);
  } catch (error) {
    return new Response(String(error), { status: 500 });
  }
};

addEventListener("fetch", event => {
  event.respondWith(handle(event.request));
});
