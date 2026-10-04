import assert from "node:assert/strict";
import type { Request } from "./routes.ts";
import type { Contender, Dispatcher } from "./contenders/contender.ts";

/**
 * Fails loudly unless every request dispatches to its route with the expected
 * params, and every miss dispatches nowhere. Benchmarks run this first, so
 * they never time a contender that gets the wrong answer.
 */
export const checkDispatcher = (
  contender: Contender,
  dispatcher: Dispatcher,
  requests: Request[],
  misses: string[] = [],
) => {
  for (const { method, url, name, data } of requests) {
    const message = `${contender.name}: ${method} ${url}`;
    const match = dispatcher.dispatch(method, url);
    assert.ok(match, `${message} didn't match`);
    assert.equal(match.name, name, message);
    // Contenders report "no params" differently, and some build params on
    // null-prototype objects; compare plain copies.
    assert.deepEqual({ ...match.data }, { ...data }, message);
  }
  for (const url of misses) {
    assert.equal(
      dispatcher.dispatch("GET", url),
      null,
      `${contender.name}: GET ${url} should not match`,
    );
  }
};
