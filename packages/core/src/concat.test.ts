import { describe, expect, it } from "vitest";
import { concat } from "./concat";
import { matchText } from "./text";
import { string } from "./string";
import { textSegments } from "./path";

describe("concat", () => {
  const combined = concat(matchText("hello"), matchText("there"));

  it("combines simple text", () => {
    const result = combined.match("hellotherefriend");
    expect(result).toEqual({
      ok: true,
      data: null,
      remaining: "friend",
      captures: 0,
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

  it("sums captures", () => {
    expect(concat(matchText("hello"), matchText("there")).captures).toBe(0);
    expect(concat(matchText("hello"), string("name")).captures).toBe(1);
    expect(concat(string("first"), string("last")).captures).toBe(2);
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
      captures: 2,
    });
  });
});
