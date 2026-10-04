import type { Contender } from "./contender.ts";
import microRouter from "./micro-router.ts";
import honoTrie from "./hono-trie.ts";
import honoSmart from "./hono-smart.ts";

export const contenders: Contender[] = [microRouter, honoTrie, honoSmart];
