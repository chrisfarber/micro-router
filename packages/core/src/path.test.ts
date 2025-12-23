import { describe, expect, it } from "vitest";
import { number } from "./number";
import { path, textSegments } from "./path";
import { string } from "./string";

describe("textSegments", () => {
  it("generates the correct runtime description", () => {
    const p = textSegments("a/b/c/d");
    const expected: (typeof p)["path"] = "/a/b/c/d";
    expect(p.path).toEqual(expected);
  });

  it("matches on entire path segments", () => {
    // Thanks to Ira for the test data contribution:
    const pathDef = textSegments(
      "/bird-seed/tap-shoes/glittery-shoes/candy/spicy-chips/speaker/",
    );
    expect(pathDef.match("/bird-seed").ok).toBeFalsy();
    expect(
      pathDef.match(
        "/bird-seed/tap-shoes/glittery-shoes/candy/spicy-chips/speaker/",
      ).ok,
    ).toBeTruthy();
    expect(
      pathDef.match(
        "bird-seed/tap-shoes/glittery-shoes/candy/spicy-chips/speaker",
      ).ok,
    ).toBeTruthy();
    expect(
      pathDef.match(
        "/bird-seed/tap-shoes/glittery-shoes/candy/spicy-chips/speaker-easy",
      ).ok,
    ).toBeFalsy();
  });

  it("has 0 captures", () => {
    expect(textSegments("/users/inbox").captures).toBe(0);
  });
});

describe("path", () => {
  it("defines successfully", () => {
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    const blank = path();
    expect(blank).toBeUndefined();

    const notBlank = path("l/hello");
    expect(notBlank).toBeDefined();
    expect(notBlank.match("/l/hello/bye").ok).toBeTruthy();
  });

  it("generates a single slash for a root path", () => {
    const root = path("/");
    expect(root.make(null)).toEqual("/");
  });

  it("matches and generates on a complex example", () => {
    const p = path(path("a", "/b", string("c")), "d/e", string("f"));
    const descr: (typeof p)["path"] = "/a/b/:c/d/e/:f";
    expect(p.path).toEqual(descr);

    expect(p.make({ c: "sea", f: "eph" })).toEqual("/a/b/sea/d/e/eph");
    const match = p.match("/a/B/SEE/d/E/FFFFF/geee");
    expect(match).toMatchObject({
      ok: true,
      data: {
        c: "SEE",
        f: "FFFFF",
      },
      remaining: "/geee",
    });
  });
});

describe("captures", () => {
  it("path with only static segments", () => {
    expect(path("/message/inbox").captures).toBe(0);
  });

  describe("composed paths sum captures", () => {
    it("path sums captures", () => {
      expect(path("/users", string("id")).captures).toBe(1);
      expect(
        path("/posts", string("id"), "/comments", number("cid")).captures,
      ).toBe(2);
      expect(path("/message/inbox").captures).toBe(0);
    });

    it("complex composition", () => {
      const route = path(
        "/users",
        string("userId"),
        "/posts",
        number("postId"),
        "/comments",
        string("commentId"),
      );
      expect(route.captures).toBe(3);
    });
  });
});
