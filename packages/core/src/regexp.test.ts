import { describe, expect, it } from "vitest";
import { path } from "./path";
import { regexp } from "./regexp";
import { router } from "./router";

describe("regexp", () => {
  it("captures the matched text", () => {
    const p = path("files", regexp("name", /[a-z]+\.txt/));
    expect(p.repr).toEqual("/files/:name[regexp]");
    expect(p.match("/files/notes.txt")).toMatchObject({
      ok: true,
      data: { name: "notes.txt" },
      remaining: "",
    });
    expect(p.make({ name: "todo.txt" })).toEqual("/files/todo.txt");
  });

  it("requires the entire segment to match by default", () => {
    const p = path(regexp("id", /\d+/));
    expect(p.match("/123").ok).toBe(true);
    expect(p.match("/abc123").ok).toBe(false);
    expect(p.match("/123abc").ok).toBe(false);
  });

  it("finds a full match through alternation", () => {
    const p = path(regexp("v", /a|ab/));
    expect(p.match("/ab")).toMatchObject({ ok: true, data: { v: "ab" } });
  });

  it("respects regexp flags", () => {
    const p = path(regexp("v", /abc/i));
    expect(p.match("/ABC")).toMatchObject({ ok: true, data: { v: "ABC" } });
  });

  it("throws on stateful regexps", () => {
    expect(() => regexp("v", /a/g)).toThrow();
    expect(() => regexp("v", /a/y)).toThrow();
  });

  it("transforms matches with a codec", () => {
    const version = regexp("version", /v(\d+)\.(\d+)/, {
      codec: {
        decode: m => ({
          ok: true,
          data: { major: Number(m[1]), minor: Number(m[2]) },
        }),
        encode: ({ major, minor }) => `v${String(major)}.${String(minor)}`,
      },
    });
    const p = path("api", version);
    expect(p.match("/api/v2.10")).toMatchObject({
      ok: true,
      data: { version: { major: 2, minor: 10 } },
    });
    expect(p.make({ version: { major: 1, minor: 0 } })).toEqual("/api/v1.0");
  });

  it("fails when the codec fails to decode", () => {
    const p = path(
      regexp("n", /\d+/, {
        codec: {
          decode: m => {
            const n = Number(m[0]);
            return n < 10 ? { ok: true, data: n } : { ok: false };
          },
          encode: n => String(n),
        },
      }),
    );
    expect(p.match("/5")).toMatchObject({ ok: true, data: { n: 5 } });
    expect(p.match("/50").ok).toBe(false);
  });

  it("matches part of a segment when unanchored", () => {
    const p = path(
      regexp("id", /\d+/, {
        unanchored: true,
        codec: {
          decode: m => ({ ok: true, data: m[0] }),
          encode: id => `item-${id}`,
        },
      }),
    );
    expect(p.match("/item-42")).toMatchObject({
      ok: true,
      data: { id: "42" },
    });
    expect(p.make({ id: "7" })).toEqual("/item-7");
  });

  it("throws when unanchored without a codec", () => {
    expect(() =>
      // @ts-expect-error a codec is required when unanchored
      regexp("id", /\d+/, { unanchored: true }),
    ).toThrow();
  });

  it("has 1 capture by default", () => {
    expect(regexp("v", /a/).captures).toBe(1);
  });

  it("accepts a capture count", () => {
    const seg = regexp("v", /a/, { captures: 0 });
    expect(seg.captures).toBe(0);
    expect(path("x", seg).captures).toBe(0);
  });

  it("works in a router", () => {
    const r = router<string>()
      .on(path("posts", regexp("slug", /[a-z-]+/)), ({ data }) => data.slug)
      .on(path("posts", regexp("id", /\d+/)), ({ data }) => `#${data.id}`);
    expect(r.dispatch("/posts/hello-world")).toEqual("hello-world");
    expect(r.dispatch("/posts/12")).toEqual("#12");
    expect(r.dispatch("/posts/Nope")).toBeNull();
  });
});
