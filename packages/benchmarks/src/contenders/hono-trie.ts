import { TrieRouter } from "hono/router/trie-router";
import { honoContender } from "./hono.ts";

/** The Hono router most similar to micro-router's: a tree of segments. */
export default honoContender("hono TrieRouter", () => new TrieRouter());
