/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Codec } from "./codec";
import type {
  MatchSuccess,
  MatchSuccessForPath,
  Path,
  ValidData,
} from "./definitions";
import { decodePath, decodeSegment } from "./encoding";
import type { DecodeResult } from "./prism";

export type RouteHandler<P extends Path = Path, R = unknown> = (
  result: MatchSuccessForPath<P>,
) => R;

type DefaultHandler<R> = (input: string) => R;

const exhaustiveDefault: DefaultHandler<any> = (input: string) => {
  throw new Error(`router had no handler matching: "${input}"`);
};

const nullDefault: DefaultHandler<null> = () => null;

export type RouterOpts = {
  /**
   * Whether to allow partial matches (where the path doesn't consume the
   * entire input string).
   *
   * When `false`, only paths that fully consume the input will be considered.
   * When `true`, paths that leave remaining characters can still match.
   *
   * @default false
   */
  partialMatch?: boolean;
};

export type DispatchOpts = {
  /**
   * Whether to allow partial matches for this specific dispatch call.
   * Overrides the router-level `partialMatch` setting if provided.
   */
  partialMatch?: boolean;
};

type DataChild = { codec: Codec<any>; node: Node };

type Node = {
  /** case-sensitive texts */
  sText: Map<string, Node>;
  /** case insensitive texts */
  text: Map<string, Node>;
  data: DataChild[];
  /** the handler that ends at this node */
  handler: RouteHandler | null;
  captures: number;
};

const emptyNode = (): Node => ({
  sText: new Map(),
  text: new Map(),
  data: [],
  handler: null,
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
  constructor(opts?: RouterOpts) {
    const { partialMatch = false } = opts ?? {};
    this.#partialMatch = partialMatch;
    this.#static = new Map();
  }

  #partialMatch: boolean;
  #defaultHandler: DefaultHandler<any> = nullDefault;
  #root: Node = emptyNode();
  /**
   * Handlers for routes made only of case-insensitive text, keyed by their
   * lowercased url. `null` when the fast path is disabled.
   */
  #static: Map<string, RouteHandler> | null;

  on<P extends Path>(path: P, handler: RouteHandler<P, any>): this {
    let node: Node = this.#root;
    let captures = 0;
    let staticKey: string | null = "";
    for (const segment of path.segments) {
      switch (segment.type) {
        case "text": {
          if (segment.caseSensitive) {
            node = getNode(node.sText, segment.text);
            // The trie prefers case-sensitive text over case-insensitive
            // text, which the static map can't express.
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
    node.handler ||= handler as RouteHandler;
    if (this.#static && staticKey !== null) {
      staticKey ||= "/";
      if (!this.#static.has(staticKey)) {
        this.#static.set(staticKey, handler as RouteHandler);
      }
    }
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

  dispatch(input: string, opts?: DispatchOpts): any {
    const encoded = input.includes("%");
    const path = encoded ? decodePath(input) : input;
    if (this.#static) {
      const res = dispatchStatic(this.#static, path);
      if (res !== notFound) return res;
    }

    const partialMatch = opts?.partialMatch ?? this.#partialMatch;

    const state = new Dispatcher(partialMatch, path, encoded);
    state.dispatch(this.#root, 0, 0, 0, 0);
    if (state.handler) {
      return state.handler(state.match());
    }
    return this.#defaultHandler(input);
  }
}

const notFound = /* @__PURE__ */ Symbol("notFound");

const dispatchStatic = (
  routes: Map<string, RouteHandler>,
  input: string,
): unknown => {
  const len = input.length;
  const trailingSlash = len > 1 && input.charCodeAt(len - 1) === 47; /* / */
  const key = trailingSlash ? input.slice(0, -1) : input;
  const handler = routes.get(key);
  if (!handler) return notFound;
  return handler({
    ok: true,
    data: null,
    captures: 0,
    remaining: key === "/" ? input : trailingSlash ? "/" : "",
  });
};

class Dispatcher {
  partial: boolean;
  url: string;
  parts: string[];
  consumed: number;
  captures: number;
  handler: RouteHandler | null;
  dataStack: ValidData[];
  matchData: ValidData[];
  encoded: boolean;

  constructor(partial: boolean, url: string, encoded: boolean) {
    this.partial = partial;
    this.url = url;
    this.encoded = encoded;
    // slicing strings is surprisingly expensive in Fastly Compute;
    // on the whole, eagerly splitting the entire input string is the
    // best balance of performance
    this.parts = url.split("/");
    this.consumed = 0;
    this.captures = 0;
    this.handler = null;
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
    if (node.handler && (this.partial || input === undefined)) {
      this.consider(node.handler, depth, node.captures, start);
    }
    if (input === undefined) return;
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

  consider(
    handler: RouteHandler,
    depth: number,
    captures: number,
    len: number,
  ) {
    if (
      !this.handler ||
      len > this.consumed ||
      (len === this.consumed && captures < this.captures)
    ) {
      this.consumed = len;
      this.captures = captures;
      this.handler = handler;
      this.matchData = this.dataStack.slice(0, depth);
    }
  }

  /** The result for the best match. Only valid once `handler` is set. */
  match(): MatchSuccess {
    const matchData = this.matchData;
    const { captures, consumed } = this;
    const remaining = this.url.length - consumed;
    let data: ValidData = null;
    for (let i = 0; i < matchData.length; i++) {
      const d = matchData[i];
      if (d) data = Object.assign(data ?? {}, d);
    }
    return {
      ok: true,
      captures,
      remaining: remaining > 0 ? this.url.slice(-remaining) : "",
      data,
    };
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
   * is considered to be the best possible match to the input.
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
   * will determine the one registered path that best matches the input, using
   * the strategy determined by the provided `comparator`.
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
   * @param opts Optional dispatch configuration to override router-level settings
   */
  dispatch(
    input: string,
    opts?: DispatchOpts,
  ): Exhaustive extends true ? Result : Result | null;
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
export const router = <Result = never>(
  opts?: RouterOpts,
): Router<Result, [Result] extends [never] ? false : true> => {
  return new RouterBuilder(opts);
};
