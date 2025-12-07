import { describe, expect, it } from "vitest";
import { number, matchNumber } from "./number";

describe("number", () => {
  it("parses numbers", () => {
    const p = number("price");
    expect(p.match("/19.99/")).toMatchObject({
      ok: true,
      data: {
        price: 19.99,
      },
      remaining: "/",
    });

    const desc: (typeof p)["path"] = "/:price[number]";
    expect(p.path).toEqual(desc);

    expect(p.make({ price: 100 })).toEqual("/100");
    expect(p.make({ price: 100.0 })).toEqual("/100");
    expect(p.make({ price: 4.2 })).toEqual("/4.2");
  });

  it("has 1 capture", () => {
    expect(number("count").captures).toBe(1);
  });
});

describe("matchNumber", () => {
  it("has 1 capture", () => {
    expect(matchNumber.captures).toBe(1);
  });
});
