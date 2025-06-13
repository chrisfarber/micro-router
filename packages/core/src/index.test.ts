import { describe, expect, it } from "vitest";
import {
  concat,
  keyAs,
  mapData,
  number,
  parseNumber,
  path,
  segment,
  string,
  text,
  textEnum,
  textSegments,
  enumSegment,
  parseString,
} from ".";

describe("Path Definition", () => {
  describe("primitives", () => {
    describe("text", () => {
      it("matches strings", () => {
        const part = text("hello");
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
        const lc = text("lowercase");
        const uc = text("LOWERCASE");

        expect(lc.match("lowerCASE").ok).toBeTruthy();
        expect(uc.match("lowerCASE").ok).toBeTruthy();
        expect(uc.match("UPPERCASEuppercase").ok).toBeFalsy();
      });

      it("can be made case sensitive", () => {
        const uc = text("LOWERCASE", { caseSensitive: true });
        expect(uc.match("LOWERCASE").ok).toBeTruthy();
        expect(uc.match("lowercaselowercase").ok).toBeFalsy();
        expect(uc.match("UPPERCASE").ok).toBeFalsy();
      });
    });

    describe("textEnum", () => {
      it("matches and errors as expected", () => {
        const nums = textEnum("one", "two", "three");
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
        const nums = textEnum("one", "two", "three");
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        expect(() => nums.make("four" as any)).toThrowError(
          "Invalid value for textEnum: four",
        );
      });

      it("makes a valid path description", () => {
        const nums = textEnum("one", "two", "three");
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

    describe("enumSegment", () => {
      it("matches allowed values as a segment and returns keyed params", () => {
        const color = enumSegment({
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
        const color = enumSegment({
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
        const color = enumSegment({
          key: "color",
          options: ["red", "blue", "green"],
        });
        const desc: (typeof color)["path"] = "/:color[(red|blue|green)]";
        expect(color.path).toEqual(desc);
      });

      it("generates a path from params", () => {
        const color = enumSegment({
          key: "color",
          options: ["red", "blue", "green"],
        });
        expect(color.make({ color: "red" })).toEqual("/red");
        expect(color.make({ color: "blue" })).toEqual("/blue");
      });

      it("throws if making a path with an invalid value", () => {
        const color = enumSegment({
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
    const combined = concat(text("hello"), text("there"));
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
      const combined = concat(text("stuff"), string("foo"));
      // ensure the expected value matches the type:
      const path: typeof combined.path = "stuff/:foo";
      // ensure the runtime value matches the expected value:
      expect(combined.path).toEqual(path);
    });
  });

  describe("segment", () => {
    it("succeeds if the segment is entirely consumed by the inner path", () => {
      const s = segment(text("this-works"));
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
      const p = segment(segment(segment(keyAs("foo", parseNumber))));
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
      const p = segment(parseString);

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
    it("generates with data", () => {
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
});
