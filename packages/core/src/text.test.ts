import { describe, expect, it } from "vitest";
import { textEnum, textSegments } from "./text";

describe("textSegments", () => {
  it("constructs valid text segments", () => {
    const segments = textSegments("hello/there");
    const [hello] = segments;
    expect(hello).toEqual({
      type: "text",
      captures: 0,
      optional: false,
      repr: "hello",
      text: "hello",
      caseSensitive: false,
    });
  });

  it("strips duplicate, leading, and trailing slashes", () => {
    const segments = textSegments("////hello/////there/////");
    expect(segments.map(s => s.text)).toEqual(["hello", "there"]);
  });

  it("accepts caseSensitive and optional", () => {
    const [hello, there] = textSegments("hello/there", {
      caseSensitive: true,
      optional: true,
    });
    for (const segment of [hello, there]) {
      expect(segment).toMatchObject({ caseSensitive: true, optional: true });
    }
  });
});

describe("textEnum", () => {
  it("has 1 capture", () => {
    expect(textEnum({ key: "lang", options: ["en"] }).captures).toBe(1);
  });

  it("matches case insensitively", () => {
    const lang = textEnum({
      key: "lang",
      options: ["en", "FR", "de"],
    });

    expect(lang.codec.decode("EN")).toEqual({ ok: true, data: { lang: "en" } });
    expect(lang.codec.decode("fr")).toEqual({ ok: true, data: { lang: "FR" } });
    expect(lang.codec.decode("de")).toEqual({ ok: true, data: { lang: "de" } });

    expect(lang.codec.decode("foo")).toEqual({ ok: false });
  });

  it("matches case sensitively", () => {
    const lang = textEnum({
      key: "lang",
      options: ["en", "FR", "de"],
      caseSensitive: true,
    });

    expect(lang.codec.decode("EN")).toEqual({ ok: false });
    expect(lang.codec.decode("fr")).toEqual({ ok: false });
    expect(lang.codec.decode("de")).toEqual({ ok: true, data: { lang: "de" } });

    expect(lang.codec.decode("foo")).toEqual({ ok: false });
  });
});
