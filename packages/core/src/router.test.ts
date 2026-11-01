import { describe, expect, it } from "vitest";
import { codec } from "./codec";
import type { MatchSuccess, Path } from "./definitions";
import { path } from "./path";
import { number } from "./number";
import { regexp } from "./regexp";
import { router } from "./router";
import { dataSegment } from "./segment";
import { string } from "./string";
import { textEnum, textSegments } from "./text";

describe("router", () => {
  describe(".dispatch()", () => {
    it("executes only the best matching handler", () => {
      const UsersPath = path("users");
      const UserByIdPath = path(UsersPath, string("id"));
      const UserSettingsPath = path(UserByIdPath, "settings");

      const fires: number[] = [];
      const r = router()
        .onPrefix(UsersPath, () => {
          fires.push(0);
          return 0;
        })
        .onPrefix(UserByIdPath, () => {
          fires.push(1);
          return 1;
        })
        .onPrefix(UserSettingsPath, () => {
          fires.push(2);
          return 2;
        });

      // All three paths should match against this input:
      const out = r.dispatch("/users/42/settings");

      // Yet only the best match was fired
      expect(fires).toEqual([2]);

      // And dispatch yields its return value:
      expect(out).toEqual(2);
    });

    it("returns null if nothing matches", () => {
      const r = router().on(path("/a"), () => true);
      let out = r.dispatch("/b");

      expect(out).toEqual(null);

      // prove that typescript could have allowed null:
      out = null;
      // and types allow that out could have been true:
      out = true;
    });
  });

  describe(".exhaustive()", () => {
    it("throws an Error when no paths match", () => {
      const r = router()
        .on(path("/knock/knock"), () => "who's there?")
        .exhaustive();

      expect(r.dispatch("/knock/knock")).toEqual("who's there?");
      expect(() => r.dispatch("uhhh")).toThrow(
        `router had no handler matching`,
      );
    });
  });

  describe(".default()", () => {
    it("receives the dispatched input", () => {
      const r = router<string>()
        .on(path("a"), () => "a")
        .default(input => `missing: ${input}`);

      expect(r.dispatch("/nope")).toEqual("missing: /nope");
    });

    it("is not called when a route matches", () => {
      let calls = 0;
      const make = (trieOnly: boolean) => {
        const r = router()
          .on(path("static"), () => "static")
          .on(path("data", string("id")), () => "data")
          .default(() => {
            calls += 1;
            return "default";
          });
        return trieOnly
          ? r.on(path(textSegments("X", { caseSensitive: true })), () => "x")
          : r;
      };
      for (const r of [make(false), make(true)]) {
        expect(r.dispatch("/static")).toEqual("static");
        expect(r.dispatch("/data/1")).toEqual("data");
      }
      expect(calls).toBe(0);
    });

    it("is called when input continues past a route", () => {
      const exact = router()
        .on(path("users"), () => "users")
        .default(() => "default");
      expect(exact.dispatch("/users/extra")).toEqual("default");

      const prefixed = router()
        .onPrefix(path("users"), () => "users")
        .default(() => "default");
      expect(prefixed.dispatch("/users/extra")).toEqual("users");
    });

    it("yields a default and narrows the type", () => {
      const r = router()
        .on(path("hello"), () => "hello" as const)
        .default(() => "goodbye" as const);

      expect(r.dispatch("/hello")).toEqual("hello");

      let bye = r.dispatch("/unknown");
      expect(bye).toEqual("goodbye");
      // @ts-expect-error should be statically known to be `"hello" | "goodbye"`
      bye = "disallowed";
      // but this should be permissible:
      bye = "hello";
      // @ts-expect-error and we know the return is not nullable
      bye = null;
    });
  });

  describe(".exhaustive() and .default() together", () => {
    it("uses whichever was called last", () => {
      const thenExhaustive = router()
        .on(path("a"), () => "a")
        .default(() => "default")
        .exhaustive();
      expect(() => thenExhaustive.dispatch("/b")).toThrow(
        "router had no handler matching",
      );

      const thenDefault = router()
        .on(path("a"), () => "a")
        .exhaustive()
        .default(() => "default");
      expect(thenDefault.dispatch("/b")).toEqual("default");
    });

    it("throws for partial matches when matching exactly", () => {
      const r = router()
        .on(path("users"), () => "users")
        .exhaustive();

      expect(() => r.dispatch("/users/extra")).toThrow(
        `router had no handler matching: "/users/extra"`,
      );
      expect(r.dispatch("/users/")).toEqual("users");
    });
  });

  describe("result type", () => {
    it("can be restricted to a defined type", () => {
      const r = router<"a" | "b">()
        .on(path("a"), () => "a")
        .on(path("b"), () => "b")
        // @ts-expect-error return type of "c" is not allowed
        .on(path("c"), () => "c");

      expect(r.dispatch("/a")).toEqual("a");
    });
  });

  describe("exact vs prefix matching", () => {
    it("only matches exact paths by default", () => {
      const r = router()
        .on(path("/users"), () => "users")
        .on(path("/users", string("id")), () => "userById");

      expect(r.dispatch("/users")).toEqual("users");
      expect(r.dispatch("/users/42")).toEqual("userById");

      // Partial match is filtered out
      expect(r.dispatch("/users/42/settings")).toEqual(null);
    });

    it("allows trailing slashes in exact match mode", () => {
      const r = router()
        .on(path("/users"), () => "users")
        .on(path("/users", string("id")), () => "userById");

      // Trailing slashes are treated as exact matches
      expect(r.dispatch("/users/")).toEqual("users");
      expect(r.dispatch("/users/42/")).toEqual("userById");
    });

    it("gives prefix routes the rest of the input", () => {
      const r = router()
        .onPrefix(path("/users"), ({ rest }) => ["users", rest])
        .onPrefix(path("/users", string("id")), ({ data, rest }) => [
          data.id,
          rest,
        ]);

      expect(r.dispatch("/users")).toEqual(["users", []]);
      expect(r.dispatch("/users/")).toEqual(["users", []]);
      expect(r.dispatch("/users/42/")).toEqual(["42", []]);
      expect(r.dispatch("/users/42/settings/a")).toEqual([
        "42",
        ["settings", "a"],
      ]);
      // empty segments are skipped
      expect(r.dispatch("/users/42//settings//")).toEqual(["42", ["settings"]]);
    });

    it("prefers an exact route over a prefix route for the same path", () => {
      const r = router()
        .onPrefix(path("/users"), () => "prefix")
        .on(path("/users"), () => "exact");

      expect(r.dispatch("/users")).toEqual("exact");
      expect(r.dispatch("/users/")).toEqual("exact");
      expect(r.dispatch("/users//")).toEqual("exact");
      expect(r.dispatch("/users/42")).toEqual("prefix");
    });

    it("doesn't let an exact route match longer input", () => {
      const r = router()
        .on(path("/users", string("id")), () => "user")
        .onPrefix(path("/"), () => "fallback");

      expect(r.dispatch("/users/42")).toEqual("user");
      expect(r.dispatch("/users/42/settings")).toEqual("fallback");
    });
  });

  describe("match results passed to handlers", () => {
    const pick = ({ ok: _, ...match }: MatchSuccess) => match;

    it("reports no data for an exact static match", () => {
      const r = router().on(path("users"), pick);

      expect(r.dispatch("/users")).toEqual({
        data: null,
        exact: true,
        rest: [],
        captures: 0,
      });
    });

    it("collects data and captures from every level of the path", () => {
      const r = router()
        .on(path("users"), pick)
        .on(path("users", string("userId"), "posts", string("postId")), pick);

      const expected = {
        data: { userId: "u1", postId: "p9" },
        exact: true,
        rest: [],
        captures: 2,
      };
      expect(r.dispatch("/users/u1/posts/p9")).toEqual(expected);
      expect(r.dispatch("/USERS/u1/Posts/p9")).toEqual(expected);
    });

    it("reports the rest and data for prefix matches", () => {
      const r = router()
        .onPrefix(path("users", string("userId")), pick)
        .onPrefix(path("users", string("userId"), "posts"), pick);

      expect(r.dispatch("/users/u1/posts")).toEqual({
        data: { userId: "u1" },
        captures: 1,
        exact: true,
        rest: [],
      });
      expect(r.dispatch("/users/u1/extra/bits")).toEqual({
        data: { userId: "u1" },
        captures: 1,
        exact: false,
        rest: ["extra", "bits"],
      });
      expect(r.dispatch("/users/u1/posts/x/")).toEqual({
        data: { userId: "u1" },
        captures: 1,
        exact: false,
        rest: ["x"],
      });
    });

    it("reports the same match as the path", () => {
      const Users = path("users", string("id"));
      const r = router().onPrefix(Users, m => m);

      for (const input of ["/users/1", "/users/1/", "/users/1/posts"]) {
        expect([input, r.dispatch(input)]).toEqual([input, Users.match(input)]);
      }
    });

    it("does not merge data from a losing route into the winner", () => {
      const r = router()
        .on(path("u", string("id"), string("b")), m => ["idB", m.data])
        .on(path("u", string("name"), "b"), m => ["nameB", m.data]);

      // Both match exactly; the route with fewer captures wins
      expect(r.dispatch("/u/1/b")).toEqual(["nameB", { name: "1" }]);
    });

    it("does not merge data from a shorter prefix match into the winner", () => {
      const r = router()
        .onPrefix(path("u", string("id")), m => ["id", m.data])
        .on(path("u", string("name"), "posts"), m => ["namePosts", m.data]);

      expect(r.dispatch("/u/1/posts")).toEqual(["namePosts", { name: "1" }]);
    });
  });

  describe("ranking", () => {
    type Route<T> = [Path, T] | [Path, T, "prefix"];
    const register = <T>(r: ReturnType<typeof router>, route: Route<T>) =>
      route[2]
        ? r.onPrefix(route[0], () => route[1])
        : r.on(route[0], () => route[1]);
    /** dispatch `input` with `a` and `b` registered in both orders */
    const both = <T>(a: Route<T>, b: Route<T>, input: string) => [
      register(register(router(), a), b).dispatch(input),
      register(register(router(), b), a).dispatch(input),
    ];

    it("prefers the match that consumes the most input", () => {
      expect(
        both(
          [path("a", string("x"), string("y")), "long"],
          [path("a", "b"), "short", "prefix"],
          "/a/b/c",
        ),
      ).toEqual(["long", "long"]);
    });

    it("prefers fewer captures when matches consume the same input", () => {
      expect(
        both(
          [path("users", "all"), "static"],
          [path("users", string("id")), "dynamic"],
          "/users/all",
        ),
      ).toEqual(["static", "static"]);

      expect(
        both(
          [path("u", string("a"), "b"), "one"],
          [path("u", string("a"), string("b")), "two"],
          "/u/x/b",
        ),
      ).toEqual(["one", "one"]);
    });

    it("uses each segment's capture count", () => {
      const noCaptures = regexp("x", /\d+/, { captures: 0 });
      const twoCaptures = regexp("x", /\d+/, { captures: 2 });
      expect(
        both(
          [path("n", noCaptures), "regexp"],
          [path("n", string("s")), "string"],
          "/n/1",
        ),
      ).toEqual(["regexp", "regexp"]);
      expect(
        both(
          [path("n", twoCaptures), "regexp"],
          [path("n", string("s")), "string"],
          "/n/1",
        ),
      ).toEqual(["string", "string"]);
    });

    it("counts textEnum as a capture", () => {
      expect(
        both(
          [path("lang", "en"), "text"],
          [path("lang", textEnum({ key: "l", options: ["en"] })), "enum"],
          "/lang/en",
        ),
      ).toEqual(["text", "text"]);
    });

    it("prefers text over data when captures are equal", () => {
      const free = regexp("x", /all/, { captures: 0 });
      expect(
        both(
          [path("users", "all"), "text"],
          [path("users", free), "data"],
          "/users/all",
        ),
      ).toEqual(["text", "text"]);
    });

    it("prefers the first registered data segment on a full tie", () => {
      expect(
        both(
          [path("x", number("n")), "number"],
          [path("x", string("s")), "string"],
          "/x/1",
        ),
      ).toEqual(["number", "string"]);
      expect(
        both(
          [path("x", textEnum({ key: "l", options: ["en"] })), "enum"],
          [path("x", string("s")), "string"],
          "/x/en",
        ),
      ).toEqual(["enum", "string"]);
    });

    it("prefers an exact match over a prefix route that consumes the same input", () => {
      expect(
        both(
          [path("files"), "exact"],
          [path("files"), "prefix", "prefix"],
          "/files/",
        ),
      ).toEqual(["exact", "exact"]);
      // even when the exact match has more captures
      expect(
        both(
          [path("files", string("name")), "exact"],
          [path("files", "readme"), "prefix", "prefix"],
          "/files/readme",
        ),
      ).toEqual(["exact", "exact"]);
    });

    it("prefers a deeper route over a prefix route", () => {
      expect(
        both(
          [path("files", "readme"), "exact"],
          [path("files"), "prefix", "prefix"],
          "/files/readme",
        ),
      ).toEqual(["exact", "exact"]);
      expect(
        both(
          [path("files", "docs"), "deep", "prefix"],
          [path("files"), "shallow", "prefix"],
          "/files/docs/a",
        ),
      ).toEqual(["deep", "deep"]);
    });

    it("prefers fewer captures between prefix routes that consume the same input", () => {
      expect(
        both(
          [path("files", "docs"), "static", "prefix"],
          [path("files", string("dir")), "dynamic", "prefix"],
          "/files/docs/a",
        ),
      ).toEqual(["static", "static"]);
    });

    it("falls back to a prefix route when a deeper route fails", () => {
      expect(
        both(
          [path("files", "docs", "readme"), "exact"],
          [path("files"), "prefix", "prefix"],
          "/files/docs/other",
        ),
      ).toEqual(["prefix", "prefix"]);
    });

    it("falls back to a dynamic route when the static one fails deeper", () => {
      expect(
        both(
          [path("users", "all", "settings"), "static"],
          [path("users", string("id"), "posts"), "dynamic"],
          "/users/all/posts",
        ),
      ).toEqual(["dynamic", "dynamic"]);
    });
  });

  describe("static routes", () => {
    // Registering any case-sensitive text disables the static fast path, so a
    // router with this route always walks the trie.
    const NeverPath = path(
      textSegments("never-matched", { caseSensitive: true }),
    );

    const star = dataSegment({
      repr: "*",
      captures: 0,
      codec: codec(
        () => ({ ok: true, data: null }),
        () => "",
      ),
    });

    const routes = (trieOnly: boolean, prefixes: boolean) => {
      let r = router()
        .on(path(), m => ["root", m])
        .on(path("users"), m => ["users", m])
        .on(path("users/all"), m => ["all", m])
        .on(path("users", string("id")), m => ["id", m])
        .on(path("static", star), m => ["star", m])
        .on(path("static/index.html"), m => ["index", m]);
      if (prefixes) {
        r = r
          .onPrefix(path(), m => ["root*", m])
          .onPrefix(path("users"), m => ["users*", m]);
      }
      return trieOnly ? r.on(NeverPath, () => ["never", null]) : r;
    };

    const inputs = [
      "",
      "/",
      "//",
      "/users",
      "/users/",
      "/users//",
      "//users",
      "users",
      "/USERS",
      "/Users/All/",
      "/users/all",
      "/users/42",
      "/static/index.html",
      "/static/other.html",
      "/nope",
      "/users/all/extra",
    ];

    for (const prefixes of [false, true]) {
      it(`dispatches like the trie (prefixes: ${String(prefixes)})`, () => {
        const fast = routes(false, prefixes);
        const trie = routes(true, prefixes);
        for (const input of inputs) {
          expect([input, fast.dispatch(input)]).toEqual([
            input,
            trie.dispatch(input),
          ]);
        }
      });
    }

    it("prefers the first registered handler for a path", () => {
      const r = router()
        .on(path("users"), () => 0)
        .on(path("USERS"), () => 1);

      expect(r.dispatch("/users")).toEqual(0);
    });

    it("prefers case-sensitive text over case-insensitive text", () => {
      const Users = textSegments("Users", { caseSensitive: true });
      const r = router()
        .on(path("users"), () => "insensitive")
        .on(path(Users), () => "sensitive");

      expect(r.dispatch("/Users")).toEqual("sensitive");
      expect(r.dispatch("/users")).toEqual("insensitive");
    });
  });
});
