import { describe, expect, it } from "vitest";
import { path } from "./path";
import { number, matchNumber } from "./number";

describe("number", () => {
  it("parses numbers", () => {
    const p = path(number("price"));
    expect(p.match("/19.99/")).toMatchObject({
      ok: true,
      data: {
        price: 19.99,
      },
      remaining: "/",
    });

    const desc: (typeof p)["repr"] = "/:price[number]";
    expect(p.repr).toEqual(desc);

    expect(p.make({ price: 100 })).toEqual("/100");
    expect(p.make({ price: 100.0 })).toEqual("/100");
    expect(p.make({ price: 4.2 })).toEqual("/4.2");
  });

  it("fails on segments that aren't entirely a number", () => {
    const p = path(number("price"));
    expect(p.match("/19.99abc").ok).toBe(false);
    expect(p.match("/abc").ok).toBe(false);
    expect(p.match("/1.2.3").ok).toBe(false);
  });

  it("has 1 capture", () => {
    expect(number("count").captures).toBe(1);
  });

  it("round trips every finite number", () => {
    const p = path(number("n"));
    for (const n of [0, 1, -1, 4.2, -0.5, 0.5, 1e21, -1e21, 1e-7, 2 ** 53]) {
      expect([n, p.match(p.make({ n }))]).toMatchObject([
        n,
        { ok: true, data: { n }, remaining: "" },
      ]);
    }
  });

  it("makes -0 as 0", () => {
    expect(path(number("n")).make({ n: -0 })).toEqual("/0");
  });

  it("throws when making a non-finite number", () => {
    const p = path(number("n"));
    expect(() => p.make({ n: NaN })).toThrow();
    expect(() => p.make({ n: Infinity })).toThrow();
    expect(() => p.make({ n: -Infinity })).toThrow();
  });
});

describe("matchNumber", () => {
  it("decodes and encodes numbers", () => {
    expect(matchNumber.decode(".5")).toEqual({ ok: true, data: 0.5 });
    expect(matchNumber.decode("42")).toEqual({ ok: true, data: 42 });
    expect(matchNumber.decode("")).toEqual({ ok: false });
    expect(matchNumber.encode(42)).toEqual("42");
  });

  it("accepts negative and exponent forms", () => {
    expect(matchNumber.decode("-3")).toEqual({ ok: true, data: -3 });
    expect(matchNumber.decode("1e+21")).toEqual({ ok: true, data: 1e21 });
    expect(matchNumber.decode("1E-7")).toEqual({ ok: true, data: 1e-7 });
    expect(matchNumber.decode("5.")).toEqual({ ok: true, data: 5 });
  });

  it("rejects non-numbers and non-finite numbers", () => {
    for (const text of [
      "-",
      ".",
      "e5",
      "1e",
      "+1",
      "1.2.3",
      "0x10",
      " 1",
      "NaN",
      "Infinity",
      "1e999",
    ]) {
      expect([text, matchNumber.decode(text)]).toEqual([text, { ok: false }]);
    }
  });
});
