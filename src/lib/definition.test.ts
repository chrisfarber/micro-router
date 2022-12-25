import { describe, expect, it } from "vitest";
import { concat, stringParam, text } from "./definition";

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
      const combined = concat(text("stuff"), stringParam("foo"));
      const path: typeof combined.path = "stuff:foo";
      expect(combined.path).toEqual(path);
    });
  });
  it("can construct simple routes", () => {});

  describe("stringParam", () => {
    it("parses text", () => {
      const param = stringParam("bluey");
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

    it("errors", () => {
      const param = stringParam("finn");
      expect(param.match("/nope")).toEqual({
        error: true,
      });
    });
  });
});
