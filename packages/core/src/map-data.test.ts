import { describe, expect, it } from "vitest";
import { mapData } from "./map-data";
import { string } from "./string";
import { path } from "./path";

describe("mapData", () => {
  it("fails if the isomorphism throws an exception", () => {
    const p = mapData(string("a"), {
      to(left) {
        if (left.a === "bad") {
          throw new Error("bad input");
        }
        return { a: left.a.split("").reverse().join("") };
      },
      from(right) {
        return { a: right.a.split("").reverse().join("") };
      },
    });
    const matchErr = p.match("/bad");
    expect(matchErr).toMatchObject({
      ok: false,
      cause: new Error("bad input"),
    });

    expect(p.match("/olleh")).toMatchObject({
      ok: true,
      data: {
        a: "hello",
      },
      remaining: "",
    });

    expect(p.make({ a: "wtf" })).toEqual("/ftw");
  });

  it("preserves captures", () => {
    const mappedOne = mapData(string("id"), {
      to: data => ({ id: data.id.toUpperCase() }),
      from: data => ({ id: data.id.toLowerCase() }),
    });
    expect(mappedOne.captures).toBe(1);

    const mappedTwo = mapData(path(string("a"), string("b")), {
      to: data => `${data.a},${data.b}`,
      from: data => {
        const [a, b] = data.split(",");
        if (!a || !b) {
          throw new Error("oh no");
        }
        return { a, b };
      },
    });
    expect(mappedTwo.captures).toBe(2);
  });
});
