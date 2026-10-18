import { describe, expect, it } from "vitest";
import { decodePath, decodeSegment, encodeSegment } from "./encoding";
import { path } from "./path";
import { router } from "./router";
import { string } from "./string";

describe("decodePath", () => {
  it("decodes escapes of unreserved characters", () => {
    expect(decodePath("/caf%C3%A9/a%20b")).toEqual("/café/a b");
  });

  it("leaves escapes of reserved characters encoded", () => {
    expect(decodePath("/a%2Fb/c%3Fd%23e%26f")).toEqual("/a%2Fb/c%3Fd%23e%26f");
  });

  it("leaves a literal % encoded", () => {
    expect(decodePath("/100%25")).toEqual("/100%25");
  });

  it("is idempotent", () => {
    for (const input of ["/caf%C3%A9", "/a%2Fb", "/100%25", "/%2525"]) {
      const once = decodePath(input);
      expect([input, decodePath(once)]).toEqual([input, once]);
    }
  });

  it("decodes what it can around invalid escapes", () => {
    expect(decodePath("/a%20b/%E0%A4%A/%zz")).toEqual("/a b/%E0%A4%A/%zz");
  });
});

describe("decodeSegment", () => {
  it("decodes reserved characters", () => {
    expect(decodeSegment("a%2Fb%3F")).toEqual("a/b?");
    expect(decodeSegment("100%25")).toEqual("100%");
  });

  it("returns null for invalid escapes", () => {
    expect(decodeSegment("%E0%A4%A")).toBeNull();
  });
});

describe("encodeSegment", () => {
  it("escapes everything that could change the meaning of a path", () => {
    expect(encodeSegment("a/b?c#d%e f")).toEqual("a%2Fb%3Fc%23d%25e%20f");
  });
});

describe("percent-encoding in paths", () => {
  const File = path("files", string("name"));

  const values = [
    "plain",
    "a b",
    "café",
    "a/b",
    "what?",
    "#1",
    "100%",
    "%25",
    "a&b=c",
    "日本語",
  ];

  it("round trips data that needs encoding", () => {
    for (const name of values) {
      const made = File.make({ name });
      expect([name, File.match(made)]).toEqual([
        name,
        { ok: true, data: { name }, remaining: "", captures: 1 },
      ]);
    }
  });

  it("round trips data through a router", () => {
    const r = router().on(File, m => m.data.name);
    for (const name of values) {
      expect([name, r.dispatch(File.make({ name }))]).toEqual([name, name]);
    }
  });

  it("keeps an encoded slash inside its segment", () => {
    expect(File.make({ name: "a/b" })).toEqual("/files/a%2Fb");
    expect(File.match("/files/a%2Fb")).toMatchObject({
      ok: true,
      data: { name: "a/b" },
    });
  });

  it("decodes a literal % only once", () => {
    expect(File.match("/files/%2525")).toMatchObject({
      ok: true,
      data: { name: "%25" },
    });
  });

  it("fails to match data with invalid escapes", () => {
    expect(File.match("/files/%E0%A4%A")).toEqual({ ok: false });
    expect(
      router()
        .on(File, () => "hit")
        .dispatch("/files/%E0%A4%A"),
    ).toBe(null);
  });

  it("matches text in encoded and literal form", () => {
    const Cafe = path("café", "a&b");
    const r = router().on(Cafe, () => "hit");
    for (const input of [
      "/café/a&b",
      "/caf%C3%A9/a%26b",
      "/CAF%C3%89/A%26B",
      Cafe.make(null),
    ]) {
      expect([input, Cafe.match(input).ok]).toEqual([input, true]);
      expect([input, r.dispatch(input)]).toEqual([input, "hit"]);
    }
    expect(Cafe.make(null)).toEqual("/caf%C3%A9/a%26b");
  });

  it("reports remaining input that can be dispatched again", () => {
    const outer = router({ partialMatch: true }).on(
      path("files"),
      m => m.remaining,
    );
    const inner = router().on(path(string("name")), m => m.data.name);

    const remaining = outer.dispatch("/files/100%25%20off") as string;
    expect(inner.dispatch(remaining)).toEqual("100% off");
  });

  it("passes the original input to the default handler", () => {
    const r = router().default(input => input);
    expect(r.dispatch("/caf%C3%A9")).toEqual("/caf%C3%A9");
  });
});
