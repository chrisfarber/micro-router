import { describe, expect, it } from "vitest";
import { concat, text, stringParam } from "./definition";

describe("Route Definition", () => {
  it("can construct a route?", () => {
    const part = text("hello");
    const nomatch = part.match("fooey");
    expect(nomatch.error).to.be.true;

    const match = part.match("hellothere");
    expect(match).toEqual({
      error: false,
      params: {},
      remaining: "there",
    });

    const combined = concat(text("hello"), text("there"));
    const woah = combined.match("hellotherefriend");
    expect(woah).toEqual({
      error: false,
      params: {},
      remaining: "friend",
    });
  });

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
