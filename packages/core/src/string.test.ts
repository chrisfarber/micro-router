import { describe, expect, it } from "vitest";
import { string, matchString } from "./string";

describe("string", () => {
  it("parses text", () => {
    const param = string("bluey");
    const m1 = param.match("hello-there");
    expect(m1).toEqual({
      ok: true,
      data: { bluey: "hello-there" },
      remaining: "",
      captures: 1,
    });

    const m2 = param.match("hello49/other-stuff");
    expect(m2).toEqual({
      ok: true,
      data: { bluey: "hello49" },
      remaining: "/other-stuff",
      captures: 1,
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

  it("has 1 capture", () => {
    expect(string("id").captures).toBe(1);
  });
});

describe("matchString", () => {
  it("has 1 capture", () => {
    expect(matchString.captures).toBe(1);
  });
});
