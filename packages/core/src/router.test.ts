import { describe, expect, it } from "vitest";
import { path } from "./path";
import { bestMatchComparator, longestMatchComparator, router } from "./router";
import { string } from "./string";

describe("router", () => {
  describe(".dispatch()", () => {
    it("executes only the best matching handler", () => {
      const UsersPath = path("users");
      const UserByIdPath = path(UsersPath, string("id"));
      const UserSettingsPath = path(UserByIdPath, "settings");

      const fires: number[] = [];
      const r = router({ partialMatch: true })
        .on(UsersPath, () => {
          fires.push(0);
          return 0;
        })
        .on(UserByIdPath, () => {
          fires.push(1);
          return 1;
        })
        .on(UserSettingsPath, () => {
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

  describe("with bestMatchComparator", () => {
    it("chooses the path with fewest captures", () => {
      const r = router({ comparator: bestMatchComparator })
        .on(path("/users/all", string("here")), () => 0)
        .on(path("/users/all/around"), () => 1)
        .on(path("/users", string("id"), string("action")), () => 2);

      expect(r.dispatch("/users/all/around")).toEqual(1);
    });
  });

  describe("with longestMatchComparator", () => {
    it("returns null when no exact match exists (default)", () => {
      const r = router({ comparator: longestMatchComparator })
        .on(path("/users"), () => 0)
        .on(path("/users", string("id")), () => 1);

      // With exact match only, neither path matches "/users/42/settings"
      expect(r.dispatch("/users/42/settings")).toEqual(null);
    });

    it("chooses the path with longest match when partial matches allowed", () => {
      const r = router({
        comparator: longestMatchComparator,
        partialMatch: true,
      })
        .on(path("/users"), () => 0)
        .on(path("/users", string("id")), () => 1);

      // path 0 matches "/users" with remaining "/42/settings"
      // path 1 matches "/users/42" with remaining "/settings"
      // longestMatchComparator prefers shorter remaining, so path 1 wins
      expect(r.dispatch("/users/42/settings")).toEqual(1);
    });

  });

  describe(".exhaustive()", () => {
    it("throws an Error when no paths match", () => {
      const r = router()
        .on(path("/knock/knock"), () => "who's there?")
        .exhaustive();

      expect(r.dispatch("/knock/knock")).toEqual("who's there?");
      expect(() => r.dispatch("uhhh")).toThrowError(
        `router had no handler matching`,
      );
    });
  });

  describe(".default()", () => {
    it("yields a default and narrows the type", () => {
      const r = router()
        .on(path("hello"), () => "hello" as const)
        .default(() => "goodbye" as const);

      expect(r.dispatch("/hello")).toEqual("hello");

      let bye = r.dispatch("/unknown");
      expect(bye).toEqual("goodbye");
      // @ts-expect-error should be statically known to be `"hello" | "goodbye"`
      bye = "i defy your expectations";
      // but this should be permissible:
      bye = "hello";
      // @ts-expect-error and we know the return is not nullable
      bye = null;
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

  describe("exact vs partial matching", () => {
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

    it("preserves trailing slash in remaining for partial matches", () => {
      const r = router({ partialMatch: true })
        .on(path("/users"), result => ({
          name: "users",
          remaining: result.remaining,
        }))
        .on(path("/users", string("id")), result => ({
          name: "user",
          id: result.data.id,
          remaining: result.remaining,
        }));

      // Trailing slash is preserved in remaining for inspection
      const result1 = r.dispatch("/users/");
      expect(result1).toEqual({ name: "users", remaining: "/" });

      const result2 = r.dispatch("/users/42/");
      expect(result2).toEqual({ name: "user", id: "42", remaining: "/" });
    });

    it("allows partial matches when configured at router level", () => {
      const r = router({ partialMatch: true })
        .on(path("/users"), () => "users")
        .on(path("/users", string("id")), () => "usersById");

      expect(r.dispatch("/users")).toEqual("users");
      expect(r.dispatch("/users/42")).toEqual("usersById");

      // Now partial match is allowed
      expect(r.dispatch("/users/42/settings")).toEqual("usersById");
    });

    it("allows dispatch-time override from partial to exact", () => {
      const r = router({ partialMatch: true })
        .on(path("/users"), () => "users")
        .on(path("/users", string("id")), () => "user");

      expect(r.dispatch("/users/42/settings")).toEqual("user");
      expect(r.dispatch("/users/42/settings", { partialMatch: false })).toEqual(
        null,
      );
    });
  });
});
