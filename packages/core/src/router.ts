/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Codec } from "./codec";
import type { DataOfPath, Path, ValidData } from "./definitions";
import { decodePath, decodeRest, decodeSegment } from "./encoding";
import type { DecodeResult } from "./prism";

/** The match given to a handler registered with `.on()`. */
export type RouteMatch<P extends Path = Path> = {
  ok: true;
  data: DataOfPath<P>;
  captures: number;
};

/** The match given to a handler registered with `.onPrefix()`. */
export type PrefixMatch<P extends Path = Path> = RouteMatch<P> & {
  /**
   * The decoded segments of the input that follow the path. Empty segments
   * are skipped.
   */
  rest: string[];
};

export type RouteHandler<P extends Path = Path, R = unknown> = (
  result: RouteMatch<P>,
) => R;

export type PrefixRouteHandler<P extends Path = Path, R = unknown> = (
  result: PrefixMatch<P>,
) => R;

type AnyHandler = (result: any) => unknown;

type DefaultHandler<R> = (input: string) => R;

const exhaustiveDefault: DefaultHandler<any> = (input: string) => {
  throw new Error(`router had no handler matching: "${input}"`);
};

const nullDefault: DefaultHandler<null> = () => null;

type DataChild = { codec: Codec<any>; node: Node };

type Node = {
  /** case-sensitive texts */
  sText: Map<string, Node>;
  /** case insensitive texts */
  text: Map<string, Node>;
  data: DataChild[];
  /** the handler for a route that ends at this node */
  route: AnyHandler | null;
  /** the handler for a prefix route that ends at this node */
  prefix: AnyHandler | null;
  captures: number;
};

const emptyNode = (): Node => ({
  sText: new Map(),
  text: new Map(),
  data: [],
  route: null,
  prefix: null,
  captures: 0,
});

const getNode = <K>(map: Map<K, Node>, key: K): Node => {
  let node = map.get(key);
  if (!node) {
    node = emptyNode();
    map.set(key, node);
  }
  return node;
};

const getDataNode = (parent: Node, codec: Codec<any>): Node => {
  const existing = parent.data.find(child => child.codec === codec);
  if (existing) return existing.node;
  const node = emptyNode();
  parent.data.push({ codec, node });
  return node;
};

class RouterBuilder {
  #defaultHandler: DefaultHandler<any> = nullDefault;
  #root: Node = emptyNode();
  /**
   * Handlers for routes made only of case-insensitive text, keyed by their
   * lowercased url. `null` when the fast path is disabled.
   */
  #static: Map<string, AnyHandler> | null = new Map();

  /**
   * Find the node for `path`, creating it if needed. Also returns the key for
   * the static fast path, or `null` if the path can't use it.
   *
   * This _does not_ register a handler; you must do so yourself by mutating
   * the node.
   */
  #lookup(path: Path): [Node, string | null] {
    let node: Node = this.#root;
    let captures = 0;
    let staticKey: string | null = "";
    for (const segment of path.segments) {
      switch (segment.type) {
        case "text": {
          if (segment.caseSensitive) {
            node = getNode(node.sText, segment.text);
            // Once we are concerned with case sensitive routes, we have
            // to disable the static hashmap lookup optimization:
            this.#static = null;
          } else {
            const text = segment.text.toLowerCase();
            node = getNode(node.text, text);
            if (staticKey !== null) staticKey += `/${text}`;
          }
          break;
        }
        case "data": {
          node = getDataNode(node, segment.codec);
          staticKey = null;
          break;
        }
        default:
          segment satisfies never;
      }
      captures += segment.captures;
      node.captures = captures;
    }
    return [node, staticKey];
  }

  on(path: Path, handler: AnyHandler): this {
    const [node, key] = this.#lookup(path);
    node.route ||= handler;
    let staticKey = key;
    if (this.#static && staticKey !== null) {
      staticKey ||= "/";
      if (!this.#static.has(staticKey)) {
        this.#static.set(staticKey, handler);
      }
    }
    return this;
  }

  onPrefix(path: Path, handler: AnyHandler): this {
    const [node] = this.#lookup(path);
    node.prefix ||= handler;
    return this;
  }

  default(handler: DefaultHandler<any>): this {
    this.#defaultHandler = handler;
    return this;
  }

  exhaustive(): this {
    this.#defaultHandler = exhaustiveDefault;
    return this;
  }

  dispatch(input: string): any {
    const encoded = input.includes("%");
    const path = encoded ? decodePath(input) : input;
    if (this.#static) {
      const res = dispatchStatic(this.#static, path);
      if (res !== notFound) return res;
    }

    const state = new Dispatcher(path, encoded);
    state.dispatch(this.#root, 0, 0, 0, 0);
    if (state.handler) {
      return state.handler(state.match());
    }
    return this.#defaultHandler(input);
  }
}

const notFound = /* @__PURE__ */ Symbol("notFound");

const dispatchStatic = (
  routes: Map<string, AnyHandler>,
  input: string,
): unknown => {
  const len = input.length;
  const trailingSlash = len > 1 && input.charCodeAt(len - 1) === 47; /* / */
  const key = trailingSlash ? input.slice(0, -1) : input;
  const handler = routes.get(key);
  if (!handler) return notFound;
  return handler({ ok: true, data: null, captures: 0 });
};

// When two routes consume the same input, an exact route beats a prefix route.
const PREFIX = 0;
const EXACT = 1;

class Dispatcher {
  url: string;
  parts: string[];
  encoded: boolean;
  consumed: number;
  kind: number;
  captures: number;
  handler: AnyHandler | null;
  rest: string[] | null;
  dataStack: ValidData[];
  matchData: ValidData[];

  constructor(url: string, encoded: boolean) {
    this.url = url;
    this.encoded = encoded;
    // slicing strings is surprisingly expensive in Fastly Compute;
    // on the whole, eagerly splitting the entire input string is the
    // best balance of performance
    this.parts = url.split("/");
    this.consumed = 0;
    this.kind = EXACT;
    this.captures = 0;
    this.handler = null;
    this.rest = null;
    this.dataStack = [];
    this.matchData = [];
  }

  dispatch(
    node: Node,
    index: number,
    offset: number,
    start: number,
    depth: number,
  ) {
    const parts = this.parts;
    let input = parts[index];
    while (input === "") {
      index += 1;
      offset += 1;
      input = parts[index];
    }

    this.dataStack[depth] = null;
    if (input === undefined) {
      if (node.route) {
        this.consider(node.route, depth, node.captures, start, EXACT, null);
      }
    } else {
      this.descend(node, input, index, offset, depth);
    }
    // Considered after the children, so that a better match that was already
    // found saves decoding the rest.
    if (node.prefix && this.isBetter(start, PREFIX, node.captures)) {
      const rest = decodeRest(parts, index, this.encoded);
      if (rest) {
        this.consider(node.prefix, depth, node.captures, start, PREFIX, rest);
      }
    }
  }

  descend(
    node: Node,
    input: string,
    index: number,
    offset: number,
    depth: number,
  ) {
    const end = offset + input.length;
    const next = index + 1;

    const encoded = this.encoded;
    let uriDecoded: string | null | undefined;
    if (node.sText.size > 0) {
      let caseSensitiveChild = node.sText.get(input);
      if (!caseSensitiveChild && encoded && input.includes("%")) {
        uriDecoded ??= decodeSegment(input);
        if (uriDecoded !== null)
          caseSensitiveChild = node.sText.get(uriDecoded);
      }
      if (caseSensitiveChild) {
        this.dispatch(caseSensitiveChild, next, end + 1, end, depth + 1);
      }
    }
    if (node.text.size > 0) {
      let insensitiveChild =
        node.text.get(input) ?? node.text.get(input.toLowerCase());
      if (!insensitiveChild && encoded && input.includes("%")) {
        uriDecoded ??= decodeSegment(input);
        if (uriDecoded !== null)
          insensitiveChild = node.text.get(uriDecoded.toLowerCase());
      }
      if (insensitiveChild) {
        this.dispatch(insensitiveChild, next, end + 1, end, depth + 1);
      }
    }
    const dataChild = node.data;
    if (dataChild.length === 0) return;
    if (encoded) {
      uriDecoded ??= decodeSegment(input);
      if (uriDecoded === null) return;
    } else {
      uriDecoded = input;
    }
    for (let i = 0; i < dataChild.length; i++) {
      const child = dataChild[i];
      if (!child) continue;
      const decoded: DecodeResult<ValidData> = child.codec.decode(uriDecoded);
      if (decoded.ok) {
        this.dataStack[depth] = decoded.data;
        this.dispatch(child.node, next, end + 1, end, depth + 1);
      }
    }
  }

  /**
   * Whether a match that consumed `len` characters would beat the best match
   * so far: the match that consumed the most input wins, then an exact match
   * beats a prefix route, then the match with fewer captures wins.
   */
  isBetter(len: number, kind: number, captures: number): boolean {
    if (!this.handler || len > this.consumed) return true;
    if (len < this.consumed) return false;
    if (kind !== this.kind) return kind > this.kind;
    return captures < this.captures;
  }

  consider(
    handler: AnyHandler,
    depth: number,
    captures: number,
    len: number,
    kind: number,
    rest: string[] | null,
  ) {
    if (!this.isBetter(len, kind, captures)) return;
    this.consumed = len;
    this.kind = kind;
    this.captures = captures;
    this.handler = handler;
    this.rest = rest;
    this.matchData = this.dataStack.slice(0, depth);
  }

  /** The result for the best match. Only valid once `handler` is set. */
  match(): RouteMatch | PrefixMatch {
    const matchData = this.matchData;
    let data: ValidData = null;
    for (let i = 0; i < matchData.length; i++) {
      const d = matchData[i];
      if (d) data = Object.assign(data ?? {}, d);
    }
    const { captures, rest } = this;
    return rest
      ? { ok: true, data, captures, rest }
      : { ok: true, data, captures };
  }
}

export type Router<
  Result = never,
  KnownResult extends boolean = false,
  Exhaustive extends boolean = false,
> = {
  /**
   * Register a handler with the router. When input is dispatched to
   * the router, the provided handler will be invoked iff the provided path
   * matches the entire input, and is considered to be the best possible match
   * to it.
   *
   * @param path will be matched against input that is provided via
   * `.dispatch()`
   * @param handler will be invoked iff the provided path is considered to be
   * the best match.
   */
  on<
    P extends Path,
    Handler extends (KnownResult extends true
      ? RouteHandler<P, Result>
      : RouteHandler<P, any>),
  >(
    path: P,
    handler: Handler,
  ): Router<
    KnownResult extends true ? Result : Result | ReturnType<Handler>,
    KnownResult,
    Exhaustive
  >;

  /**
   * Register a prefix handler with the router: one that matches any input
   * that starts with the provided path, including the path itself. The
   * handler receives the rest of the input as decoded segments.
   *
   * When a route registered with `.on()` matches the same input, it is
   * preferred over a prefix route; otherwise, whichever route matches the most
   * input wins.
   *
   * @param path will be matched against the start of input that is provided
   * via `.dispatch()`
   * @param handler will be invoked iff the provided path is considered to be
   * the best match.
   */
  onPrefix<
    P extends Path,
    Handler extends (KnownResult extends true
      ? PrefixRouteHandler<P, Result>
      : PrefixRouteHandler<P, any>),
  >(
    path: P,
    handler: Handler,
  ): Router<
    KnownResult extends true ? Result : Result | ReturnType<Handler>,
    KnownResult,
    Exhaustive
  >;

  /**
   * Provide a handler to the router that will compute a default value when
   * none of its registered paths match the input being dispatched.
   *
   * The handler receives the input that was dispatched.
   */
  default<
    DefaultHandler extends (KnownResult extends true
      ? (input: string) => Result
      : (input: string) => any),
  >(
    f: DefaultHandler,
  ): Router<
    KnownResult extends true ? Result : Result | ReturnType<DefaultHandler>,
    KnownResult,
    true
  >;

  /**
   * Calling this method will cause the router to throw an Error when none
   * of its registered paths match the input being dispatched.
   */
  exhaustive(): Router<Result, KnownResult, true>;

  /**
   * Matches all of this router's registered paths against the provided input string.
   *
   * If at least one registered path matches the input string, this method
   * will determine the one registered path that best matches the input.
   *
   * Only the handler for the best matching path will be called. Its return value,
   * if any, will be returned from this method.
   *
   * If no paths match, but a default handler has been supplied, that handler
   * will be called and its return value will be returned.
   *
   * If no paths match, but `.exhaustive()` has been called, then this method
   * will throw an exception.
   *
   * Otherwise, `null` will be returned.
   *
   * @param input The input string to match against registered paths
   */
  dispatch(input: string): Exhaustive extends true ? Result : Result | null;
};

/**
 * Construct a router.
 *
 * Routers may be used for side effects or for computing values. In either case,
 * a `Result` type may be provided. When provided, the router will ensure that
 * handlers' return values match the provided `Result` type. Otherwise, handlers
 * will be allowed to return any type of data; the router's `.dispatch()` method
 * will then indicate all of the possible types that could be returned.
 */
export const router = <Result = never>(): Router<
  Result,
  [Result] extends [never] ? false : true
> => {
  return new RouterBuilder();
};
