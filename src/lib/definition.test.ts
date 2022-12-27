import { describe, expect, it } from "vitest";
import { concat, path, segment, string, text, textSegments } from "./definition";

describe("Route Definition", () => {
  describe("text", () => {
    it("matches strings", () => {
      const part = text("hello");
      const nomatch = part.match("fooey");
      expect(nomatch.error).toBeTruthy();

      const match = part.match("hellothere");
      expect(match).toEqual({
        error: false,
        params: {},
        remaining: "there",
      });

      expect(part.make({})).toEqual("hello");
    });

    it("is case insensitive by default", () => {
      const lc = text("lowercase");
      const uc = text("LOWERCASE");

      expect(lc.match("lowerCASE").error).toBeFalsy();
      expect(uc.match("lowerCASE").error).toBeFalsy();
      expect(uc.match("UPPERCASEuppercase").error).toBeTruthy();
    });

    it("can be made case sensitive", () => {
      const uc = text("LOWERCASE", { caseSensitive: true });
      expect(uc.match("LOWERCASE").error).toBeFalsy();
      expect(uc.match("lowercaselowercase").error).toBeTruthy();
      expect(uc.match("UPPERCASE").error).toBeTruthy();
    });
  });
  describe("concat", () => {
    const combined = concat(text("hello"), text("there"));
    it("combines simple text", () => {
      const result = combined.match("hellotherefriend");
      expect(result).toEqual({
        error: false,
        params: {},
        remaining: "friend",
      });
    });

    it("makes a compound string", () => {
      expect(combined.make({})).toEqual("hellothere");
    });

    it("reports the part that errored", () => {
      expect(combined.match("other stuff")).toEqual({
        error: true,
        description: `expected "hello", found: "other stuff"`,
      });
      expect(combined.match("hellostuff")).toEqual({
        error: true,
        description: `expected "there", found: "stuff"`,
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
  it("can construct simple routes", () => {});

  describe("string", () => {
    it("parses text", () => {
      const param = string("bluey");
      const m1 = param.match("hello-there");
      expect(m1).toEqual({
        error: false,
        params: { bluey: "hello-there" },
        remaining: "",
      });

      const m2 = param.match("hello49/other-stuff");
      expect(m2).toEqual({
        error: false,
        params: { bluey: "hello49" },
        remaining: "/other-stuff",
      });
    });

    it("does not read past a path separator", () => {
      const param = string("finn");
      expect(param.match("yep/nope")).toMatchInlineSnapshot(`
        {
          "error": false,
          "params": {
            "finn": "yep",
          },
          "remaining": "/nope",
        }
      `);
    });
  });

  describe("segment", () => {
    it("succeeds if the segment is entirely consumed by the inner path", () => {
      const s = segment(text("this-works"));
      expect(s).toBeDefined();
      expect(s.match("this-works")).toMatchInlineSnapshot(`
        {
          "error": false,
          "params": {},
          "remaining": "",
        }
      `);

      expect(s.match("this-works")).toMatchInlineSnapshot(`
        {
          "error": false,
          "params": {},
          "remaining": "",
        }
      `);
      expect(s.match("this-work")).toMatchInlineSnapshot(`
        {
          "description": "expected \\"this-works\\", found: \\"this-work\\"",
          "error": true,
        }
      `);
      expect(s.match("/this-works")).toMatchInlineSnapshot(`
        {
          "error": false,
          "params": {},
          "remaining": "",
        }
      `);
      expect(s.match("/this-works/")).toMatchInlineSnapshot(`
        {
          "error": false,
          "params": {},
          "remaining": "/",
        }
      `);
      expect(s.match("/this-works-oops")).toMatchInlineSnapshot(`
        {
          "description": "segment text \\"this-works-oops\\" matched the inner path, but had unused input \\"-oops\\"",
          "error": true,
        }
      `);

      expect(s.match("/this-works/too")).toEqual({
        error: false,
        params: {},
        remaining: "/too",
      });

      const description: typeof s["path"] = "/this-works";
      expect(s.path).toEqual(description);
    });
  });

  describe("textSegments", () => {
    it("generates the correct runtime description", () => {
      const p = textSegments("a/b/c/d");
      const expected: typeof p["path"] = "/a/b/c/d";
      expect(p.path).toEqual(expected);
    });

    it("matches on entire path segments", () => {
      // Thanks to Ira for the test data contribution:
      const path = textSegments("/bird-seed/tap-shoes/glittery-shoes/candy/spicy-chips/speaker/");
      expect(path.match("/bird-seed").error).toBeTruthy();
      expect(path.match("/bird-seed/tap-shoes/glittery-shoes/candy/spicy-chips/speaker/").error).toBeFalsy();
      expect(path.match("bird-seed/tap-shoes/glittery-shoes/candy/spicy-chips/speaker").error).toBeFalsy();
      expect(
        path.match("/bird-seed/tap-shoes/glittery-shoes/candy/spicy-chips/speaker-easy").error,
      ).toBeTruthy();
    });
  });

  describe("a complex concat", () => {
    const path = concat(textSegments("/hello"), string("person"), textSegments("/from"), string("from"));
    it("generates with params", () => {
      expect(path.make({ from: "bob", person: "alice" })).toEqual("/hello/alice/from/bob");

      expect(path.match("/hello/alice/from/bob")).toEqual({
        error: false,
        params: {
          from: "bob",
          person: "alice",
        },
        remaining: "",
      });
    });
  });

  describe("path", () => {
    it("defines successfully", () => {
      const blank = path();
      expect(blank).toBeUndefined();

      const notBlank = path("l/hello");
      expect(notBlank).toBeDefined();
    });

    it("matches and generates on a complex example", () => {
      const p = path(path("a", "/b", string("c")), "d/e", string("f"));
      const descr: typeof p["path"] = "/a/b/:c/d/e/:f";
      expect(p.path).toEqual(descr);

      expect(p.make({ c: "sea", f: "eph" })).toEqual("/a/b/sea/d/e/eph");
      const match = p.match("/a/B/SEE/d/E/FFFFF");
      expect(match).toMatchInlineSnapshot(`
        {
          "error": false,
          "params": {
            "c": "SEE",
            "f": "FFFFF",
          },
          "remaining": "",
        }
      `);
    });
  });
});
