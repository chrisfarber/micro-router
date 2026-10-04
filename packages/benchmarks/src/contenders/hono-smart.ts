import { RegExpRouter } from "hono/router/reg-exp-router";
import { SmartRouter } from "hono/router/smart-router";
import { TrieRouter } from "hono/router/trie-router";
import { honoContender } from "./hono.ts";

/**
 * Hono's default router. On its first match it tries the much faster
 * RegExpRouter, which compiles every route into one regular expression, and
 * falls back to TrieRouter for route sets that RegExpRouter can't express
 * (such as a static segment and a param in the same position, as in
 * `/users/new` and `/users/:userId`).
 */
export default honoContender(
  "hono SmartRouter",
  () => new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] }),
  true,
);
