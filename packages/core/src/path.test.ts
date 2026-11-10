import { describe, expect, it } from "vitest";
import { string } from "./string";
import { path } from "./path";
import { number } from "./number";
import { regexp } from "./regexp";
import { textEnum, textSegments } from "./text";
import type { DataOfPath, Path } from "./definitions";

describe("path", () => {
  it("builds a valid path", () => {
    const p = path("a/b", string("c"), string("d"));
    expect(p.captures).toEqual(2);
    expect(p.repr).toEqual("/a/b/:c/:d");
  });

  it("builds paths from paths", () => {
    const p1 = path("/hello");
    const p2 = path(p1, "there");
    expect(p2.repr).toEqual("/hello/there");
    const p3 = path(p2, string("name"));
    expect(p3.repr).toEqual("/hello/there/:name");
  });

  it("empty paths", () => {
    const empty = path();
    expect(empty.repr).toEqual("/");

    const emptyString = path("");
    expect(emptyString.repr).toEqual("/");
  });

  it("empty paths with slashes", () => {
    const p1 = path("/");
    expect(p1.repr).toEqual("/");
    expect(p1.segments).toHaveLength(0);

    const p2 = path("///");
    expect(p2.repr).toEqual("/");
    expect(p2.segments).toHaveLength(0);

    const p3 = path("/", "/", "//");
    expect(p3.repr).toEqual("/");
    expect(p3.segments).toHaveLength(0);
  });
});

describe("Path.make()", () => {
  it("constructs string representations of basic paths", () => {
    expect(path().make(null)).toEqual("/");
    expect(path("hello", "there").make(null)).toEqual("/hello/there");
    expect(path("a", "").make(null)).toEqual("/a");
    expect(path(string("foo")).make({ foo: "bar" })).toEqual("/bar");
    expect(path("café").make(null)).toEqual("/caf%C3%A9");
  });
});

describe("Path.match()", () => {
  it("can be destructured, and narrows on ok", () => {
    const Users = path("users", string("id"));

    const { ok, data, exact, rest } = Users.match("/users/1/extra");
    if (!ok) throw new Error("expected a match");
    const id: string = data.id;
    const isExact: boolean = exact;
    const remaining: string[] = rest;
    expect([id, isExact, remaining]).toEqual(["1", false, ["extra"]]);

    // a failure is still just { ok: false } at runtime
    const failure = Users.match("/nope");
    expect(failure).toEqual({ ok: false });
    expect(failure.data).toBeUndefined();
  });

  it("matches text", () => {
    const p = path("alpha", "bravo");
    expect(p.match("/alpha")).toEqual({ ok: false });
    expect(p.match("/alpha/bravo")).toEqual({
      ok: true,
      data: null,
      exact: true,
      rest: [],
      captures: 0,
    });
    expect(p.match("/alpha/bravo/")).toEqual({
      ok: true,
      data: null,
      exact: true,
      rest: [],
      captures: 0,
    });
    expect(p.match("/alpha/bravo/charlie//delta/")).toEqual({
      ok: true,
      data: null,
      exact: false,
      rest: ["charlie", "delta"],
      captures: 0,
    });
    expect(p.match("/not/good")).toEqual({ ok: false });
  });

  it("matches the root path", () => {
    const root = { ok: true, data: null, captures: 0 };
    const exact = { ...root, exact: true, rest: [] };
    expect(path().match("/")).toEqual(exact);
    expect(path().match("")).toEqual(exact);
    expect(path().match("//")).toEqual(exact);
    // like any other path, the root path is a prefix of longer input
    expect(path().match("/foo")).toEqual({
      ...root,
      exact: false,
      rest: ["foo"],
    });
  });

  it("extracts data", () => {
    const p = path(string("left"), "and", string("right"));
    expect(p.match("/there/and/back")).toEqual({
      ok: true,
      data: { left: "there", right: "back" },
      exact: true,
      rest: [],
      captures: 2,
    });
  });
});

describe("make/match round trips", () => {
  const roundTrip = <P extends Path>(p: P, data: DataOfPath<P>) => {
    const made = p.make(data);
    expect([made, p.match(made)]).toEqual([
      made,
      { ok: true, data, exact: true, rest: [], captures: p.captures },
    ]);
    return made;
  };

  it("round trips static paths", () => {
    expect(roundTrip(path(), null)).toEqual("/");
    expect(roundTrip(path("a/b", "c"), null)).toEqual("/a/b/c");
  });

  it("round trips case-sensitive text", () => {
    const p = path(textSegments("Admin", { caseSensitive: true }));
    expect(roundTrip(p, null)).toEqual("/Admin");
    expect(p.match("/admin")).toEqual({ ok: false });
  });

  it("round trips every built-in data segment together", () => {
    const version = regexp("version", /v(\d+)/, {
      codec: {
        decode: m => ({ ok: true, data: Number(m[1]) }),
        encode: (v: number) => `v${String(v)}`,
      },
    });
    const p = path(
      "api",
      version,
      textEnum({ key: "lang", options: ["en", "fr"] }),
      "users",
      string("userId"),
      "posts",
      number("postId"),
      regexp("slug", /[a-z-]+/),
    );
    expect(
      roundTrip(p, {
        version: 2,
        lang: "fr",
        userId: "u1",
        postId: 42,
        slug: "hello-world",
      }),
    ).toEqual("/api/v2/fr/users/u1/posts/42/hello-world");
  });

  it("round trips paths built from paths", () => {
    const users = path("users");
    const user = path(users, string("id"));
    const post = path(user, "posts", number("postId"));
    expect(roundTrip(post, { id: "a", postId: 1 })).toEqual("/users/a/posts/1");
  });

  it("round trips paths built from arrays of segments", () => {
    const p = path("x", [string("a"), number("b")]);
    expect(roundTrip(p, { a: "q", b: 3 })).toEqual("/x/q/3");
  });
});
