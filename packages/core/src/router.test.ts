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
      const r = router()
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
    it("chooses the path ignoring captures", () => {
      const r = router({ comparator: longestMatchComparator })
        .on(path("/users/all", string("here")), () => 0)
        .on(path("/users/all/around"), () => 1)
        .on(path("/users", string("id"), string("action")), () => 2);

      expect(r.dispatch("/users/all/around")).toEqual(0);
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
});
