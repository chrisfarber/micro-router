import { describe, expect, it } from "vitest";
import { matchText, matchTextEnum, textEnum } from "./text";

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
      captures: 0,
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

  it("has zero captures", () => {
    expect(matchText("hello").captures).toBe(0);
  });
});

describe("matchTextEnum", () => {
  it("matches and errors as expected", () => {
    const nums = matchTextEnum("one", "two", "three");
    expect(nums.match("one")).toEqual({
      ok: true,
      data: "one",
      remaining: "",
      captures: 1,
    });

    expect(nums.match("twoooo")).toEqual({
      ok: true,
      data: "two",
      remaining: "ooo",
      captures: 1,
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

  it("has 1 capture", () => {
    expect(matchTextEnum("red", "blue", "green").captures).toBe(1);
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
      captures: 1,
    });
    expect(color.match("/blue/other")).toEqual({
      ok: true,
      data: { color: "blue" },
      remaining: "/other",
      captures: 1,
    });
    expect(color.match("/green")).toEqual({
      ok: true,
      data: { color: "green" },
      remaining: "",
      captures: 1,
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

  it("has 1 capture", () => {
    expect(
      textEnum({ key: "color", options: ["red", "blue", "green"] }).captures,
    ).toBe(1);
  });
});
