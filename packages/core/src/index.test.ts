import { describe, expect, it } from "vitest";
import {
  concat,
  keyAs,
  mapData,
  number,
  matchNumber,
  path,
  segment,
  string,
  matchText,
  matchTextEnum,
  textSegments,
  textEnum,
  matchString,
} from ".";

describe("Path Definition", () => {
  describe("primitives", () => {
    describe("matchText", () => {
      it("matches strings", () => {
        const part = matchText("hello");
        const nomatch = part.match("fooey");
        expect(nomatch.ok).toBeFalsy();

        const match = part.match("hellothere");
        expect(match).toEqual({
          ok: true,
          data: null,
          remaining: "there",
        });

        expect(part.make(null)).toEqual("hello");
      });

      it("is case insensitive by default", () => {
        const lc = matchText("lowercase");
        const uc = matchText("LOWERCASE");

        expect(lc.match("lowerCASE").ok).toBeTruthy();
        expect(uc.match("lowerCASE").ok).toBeTruthy();
        expect(uc.match("UPPERCASEuppercase").ok).toBeFalsy();
      });

      it("can be made case sensitive", () => {
        const uc = matchText("LOWERCASE", { caseSensitive: true });
        expect(uc.match("LOWERCASE").ok).toBeTruthy();
        expect(uc.match("lowercaselowercase").ok).toBeFalsy();
        expect(uc.match("UPPERCASE").ok).toBeFalsy();
      });
    });

    describe("matchTextEnum", () => {
      it("matches and errors as expected", () => {
        const nums = matchTextEnum("one", "two", "three");
        expect(nums.match("one")).toEqual({
          ok: true,
          data: "one",
          remaining: "",
        });

        expect(nums.match("twoooo")).toEqual({
          ok: true,
          data: "two",
          remaining: "ooo",
        });

        expect(nums.match("through")).toMatchObject({
          ok: false,
        });
      });

      it("errors when provided a string that is not one of its options", () => {
        const nums = matchTextEnum("one", "two", "three");
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        expect(() => nums.make("four" as any)).toThrowError(
          "Invalid value for matchTextEnum: four",
        );
      });

      it("makes a valid path description", () => {
        const nums = matchTextEnum("one", "two", "three");
        expect(nums.path).toEqual("(one|two|three)");
      });
    });

    describe("string", () => {
      it("parses text", () => {
        const param = string("bluey");
        const m1 = param.match("hello-there");
        expect(m1).toEqual({
          ok: true,
          data: { bluey: "hello-there" },
          remaining: "",
        });

        const m2 = param.match("hello49/other-stuff");
        expect(m2).toEqual({
          ok: true,
          data: { bluey: "hello49" },
          remaining: "/other-stuff",
        });
      });

      it("does not read past a path separator", () => {
        const param = string("finn");
        expect(param.match("yep/nope")).toMatchObject({
          ok: true,
          data: {
            finn: "yep",
          },
          remaining: "/nope",
        });
      });
    });

    describe("number", () => {
      it("parses numbers", () => {
        const p = number("price");
        expect(p.match("/19.99/")).toMatchObject({
          ok: true,
          data: {
            price: 19.99,
          },
          remaining: "/",
        });

        const desc: (typeof p)["path"] = "/:price[number]";
        expect(p.path).toEqual(desc);

        expect(p.make({ price: 100 })).toEqual("/100");
        expect(p.make({ price: 100.0 })).toEqual("/100");
        expect(p.make({ price: 4.2 })).toEqual("/4.2");
      });
    });

    describe("textEnum", () => {
      it("matches allowed values as a segment and returns keyed params", () => {
        const color = textEnum({
          key: "color",
          options: ["red", "blue", "green"],
        });
        expect(color.match("/red")).toEqual({
          ok: true,
          data: { color: "red" },
          remaining: "",
        });
        expect(color.match("/blue/other")).toEqual({
          ok: true,
          data: { color: "blue" },
          remaining: "/other",
        });
        expect(color.match("/green")).toEqual({
          ok: true,
          data: { color: "green" },
          remaining: "",
        });
      });

      it("does not match disallowed values", () => {
        const color = textEnum({
          key: "color",
          options: ["red", "blue", "green"],
        });
        expect(color.match("/yellow")).toMatchObject({
          ok: false,
        });
        expect(color.match("/")).toMatchObject({
          ok: false,
        });
      });

      it("makes a valid path description", () => {
        const color = textEnum({
          key: "color",
          options: ["red", "blue", "green"],
        });
        const desc: (typeof color)["path"] = "/:color[(red|blue|green)]";
        expect(color.path).toEqual(desc);
      });

      it("generates a path from params", () => {
        const color = textEnum({
          key: "color",
          options: ["red", "blue", "green"],
        });
        expect(color.make({ color: "red" })).toEqual("/red");
        expect(color.make({ color: "blue" })).toEqual("/blue");
      });

      it("throws if making a path with an invalid value", () => {
        const color = textEnum({
          key: "color",
          options: ["red", "blue", "green"],
        });
        // @ts-expect-error intentionally providing a disallowed input
        expect(() => color.make({ color: "yellow" })).toThrow();
      });
    });
  });

  describe("mapData", () => {
    it("fails if the isomorphism throws an exception", () => {
      const p = mapData(string("a"), {
        to(left) {
          if (left.a === "bad") {
            throw new Error("bad input");
          }
          return { a: left.a.split("").reverse().join("") };
        },
        from(right) {
          return { a: right.a.split("").reverse().join("") };
        },
      });
      const matchErr = p.match("/bad");
      expect(matchErr).toMatchObject({
        ok: false,
        cause: new Error("bad input"),
      });

      expect(p.match("/olleh")).toMatchObject({
        ok: true,
        data: {
          a: "hello",
        },
        remaining: "",
      });

      expect(p.make({ a: "wtf" })).toEqual("/ftw");
    });
  });

  describe("keyAs", () => {
    it("computes the path description", () => {
      const p = keyAs("stuff", path("a", string("b")));

      const descr: (typeof p)["path"] = ":stuff[/a/:b]";
      expect(p.path).toEqual(descr);
    });
  });

  describe("concat", () => {
    const combined = concat(matchText("hello"), matchText("there"));
    it("combines simple text", () => {
      const result = combined.match("hellotherefriend");
      expect(result).toEqual({
        ok: true,
        data: null,
        remaining: "friend",
      });
    });

    it("makes a compound string", () => {
      expect(combined.make(null)).toEqual("hellothere");
    });

    it("reports the part that errored", () => {
      expect(combined.match("other stuff")).toMatchObject({
        ok: false,
        cause: new Error('expected "hello", found: "other stuff"'),
      });
      expect(combined.match("hellostuff")).toMatchObject({
        ok: false,
        cause: new Error('expected "there", found: "stuff"'),
      });
    });

    it("constructs a valid path at runtime", () => {
      const combined = concat(matchText("stuff"), string("foo"));
      // ensure the expected value matches the type:
      const path: typeof combined.path = "stuff/:foo";
      // ensure the runtime value matches the expected value:
      expect(combined.path).toEqual(path);
    });
  });

  describe("segment", () => {
    it("succeeds if the segment is entirely consumed by the inner path", () => {
      const s = segment(matchText("this-works"));
      expect(s).toBeDefined();
      expect(s.match("this-works")).toMatchObject({
        ok: true,
        data: null,
        remaining: "",
      });

      expect(s.match("this-works")).toMatchObject({
        ok: true,
        data: null,
        remaining: "",
      });
      expect(s.match("this-work")).toMatchObject({
        cause: new Error('expected "this-works", found: "this-work"'),
        ok: false,
      });
      expect(s.match("/this-works")).toMatchObject({
        ok: true,
        data: null,
        remaining: "",
      });
      expect(s.match("/this-works/")).toMatchObject({
        ok: true,
        data: null,
        remaining: "/",
      });
      expect(s.match("/this-works-oops")).toMatchObject({
        cause: new Error(
          'segment text "this-works-oops" matched the inner path, but had unused input "-oops"',
        ),
        ok: false,
      });

      expect(s.match("/this-works/too")).toEqual({
        ok: true,
        data: null,
        remaining: "/too",
      });

      const description: (typeof s)["path"] = "/this-works";
      expect(s.path).toEqual(description);
    });

    it("can be nested", () => {
      const p = segment(segment(segment(keyAs("foo", matchNumber))));
      const descr: (typeof p)["path"] = "/:foo[number]";
      expect(descr).toEqual(p.path);

      expect(p.match("42")).toMatchObject({
        ok: true,
        data: {
          foo: 42,
        },
        remaining: "",
      });
    });

    it("doesn't need slashes", () => {
      const p = segment(matchString);

      expect(p.match("hello")).toMatchObject({
        ok: true,
        data: "hello",
        remaining: "",
      });
    });
  });

  describe("textSegments", () => {
    it("generates the correct runtime description", () => {
      const p = textSegments("a/b/c/d");
      const expected: (typeof p)["path"] = "/a/b/c/d";
      expect(p.path).toEqual(expected);
    });

    it("matches on entire path segments", () => {
      // Thanks to Ira for the test data contribution:
      const path = textSegments(
        "/bird-seed/tap-shoes/glittery-shoes/candy/spicy-chips/speaker/",
      );
      expect(path.match("/bird-seed").ok).toBeFalsy();
      expect(
        path.match(
          "/bird-seed/tap-shoes/glittery-shoes/candy/spicy-chips/speaker/",
        ).ok,
      ).toBeTruthy();
      expect(
        path.match(
          "bird-seed/tap-shoes/glittery-shoes/candy/spicy-chips/speaker",
        ).ok,
      ).toBeTruthy();
      expect(
        path.match(
          "/bird-seed/tap-shoes/glittery-shoes/candy/spicy-chips/speaker-easy",
        ).ok,
      ).toBeFalsy();
    });
  });

  describe("a complex concat", () => {
    const path = concat(
      textSegments("/hello"),
      string("person"),
      textSegments("/from"),
      string("from"),
    );
    it("generates with params", () => {
      expect(path.make({ from: "bob", person: "alice" })).toEqual(
        "/hello/alice/from/bob",
      );

      expect(path.match("/hello/alice/from/bob")).toEqual({
        ok: true,
        data: {
          from: "bob",
          person: "alice",
        },
        remaining: "",
      });
    });
  });

  describe("path", () => {
    it("defines successfully", () => {
      // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
      const blank = path();
      expect(blank).toBeUndefined();

      const notBlank = path("l/hello");
      expect(notBlank).toBeDefined();
      expect(notBlank.match("/l/hello/bye").ok).toBeTruthy();
    });

    it("matches and generates on a complex example", () => {
      const p = path(path("a", "/b", string("c")), "d/e", string("f"));
      const descr: (typeof p)["path"] = "/a/b/:c/d/e/:f";
      expect(p.path).toEqual(descr);

      expect(p.make({ c: "sea", f: "eph" })).toEqual("/a/b/sea/d/e/eph");
      const match = p.match("/a/B/SEE/d/E/FFFFF/geee");
      expect(match).toMatchObject({
        ok: true,
        data: {
          c: "SEE",
          f: "FFFFF",
        },
        remaining: "/geee",
      });
    });
  });

  describe("captures", () => {
    describe("static paths have 0 captures", () => {
      it("matchText", () => {
        expect(matchText("hello").captures).toBe(0);
      });

      it("textSegments", () => {
        expect(textSegments("/users/inbox").captures).toBe(0);
      });

      it("path with only static segments", () => {
        expect(path("/message/inbox").captures).toBe(0);
      });
    });

    describe("dynamic paths have captures", () => {
      it("matchString", () => {
        expect(matchString.captures).toBe(1);
      });

      it("matchNumber", () => {
        expect(matchNumber.captures).toBe(1);
      });

      it("matchTextEnum", () => {
        expect(matchTextEnum("red", "blue", "green").captures).toBe(1);
      });

      it("string(key)", () => {
        expect(string("id").captures).toBe(1);
      });

      it("number(key)", () => {
        expect(number("count").captures).toBe(1);
      });

      it("textEnum", () => {
        expect(
          textEnum({ key: "color", options: ["red", "blue", "green"] })
            .captures,
        ).toBe(1);
      });
    });

    describe("composed paths sum captures", () => {
      it("concat sums captures", () => {
        expect(concat(matchText("hello"), matchText("there")).captures).toBe(0);
        expect(concat(matchText("hello"), string("name")).captures).toBe(1);
        expect(concat(string("first"), string("last")).captures).toBe(2);
      });

      it("path sums captures", () => {
        expect(path("/users", string("id")).captures).toBe(1);
        expect(
          path("/posts", string("id"), "/comments", number("cid")).captures,
        ).toBe(2);
        expect(path("/message/inbox").captures).toBe(0);
      });

      it("complex composition", () => {
        const route = path(
          "/users",
          string("userId"),
          "/posts",
          number("postId"),
          "/comments",
          string("commentId"),
        );
        expect(route.captures).toBe(3);
      });
    });

    describe("transformations preserve captures", () => {
      it("mapData preserves captures", () => {
        const mappedOne = mapData(string("id"), {
          to: data => ({ id: data.id.toUpperCase() }),
          from: data => ({ id: data.id.toLowerCase() }),
        });
        expect(mappedOne.captures).toBe(1);

        const mappedTwo = mapData(path(string("a"), string("b")), {
          to: data => `${data.a},${data.b}`,
          from: data => {
            const [a, b] = data.split(",");
            if (!a || !b) {
              throw new Error("oh no");
            }
            return { a, b };
          },
        });
        expect(mappedTwo.captures).toBe(2);
      });

      it("keyAs preserves captures", () => {
        const keyed = keyAs("name", matchString);
        const noCaptures = keyAs("null", matchText("hi"));
        expect(keyed.captures).toBe(1);
        expect(noCaptures.captures).toBe(0);
      });

      it("segment preserves captures", () => {
        const segmented = segment(matchText("hello"));
        expect(segmented.captures).toBe(0);

        const segmented2 = segment(
          concat(
            keyAs("say", matchTextEnum("hello", "goodbye")),
            matchText("_"),
            string("to"),
          ),
        );
        expect(segmented2.captures).toEqual(2);
      });
    });
  });
});
