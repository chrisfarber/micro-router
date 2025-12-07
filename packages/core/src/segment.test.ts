import { describe, expect, it } from "vitest";
import { segment } from "./segment";
import { matchText, matchTextEnum } from "./text";
import { matchString } from "./string";
import { matchNumber } from "./number";
import { keyAs } from "./key-as";
import { concat } from "./concat";
import { string } from "./string";

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
      captures: 0,
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

  it("preserves captures", () => {
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
