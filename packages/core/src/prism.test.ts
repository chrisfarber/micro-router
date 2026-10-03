import { describe, expect, it } from "vitest";
import {
  type DecodeResult,
  identityPrism,
  keyBy,
  mapPrism,
  prism,
} from "./prism";

const fail = { ok: false } as const;

const parseIntPrism = prism<string, number>(
  s => (/^\d+$/.test(s) ? { ok: true, data: Number(s) } : fail),
  n => String(n),
);

const evenPrism = prism<number, number>(
  (n): DecodeResult<number> => (n % 2 === 0 ? { ok: true, data: n } : fail),
  n => n,
);

describe("prism", () => {
  it("uses the supplied decode and encode functions", () => {
    expect(parseIntPrism.decode("12")).toEqual({ ok: true, data: 12 });
    expect(parseIntPrism.decode("x")).toEqual(fail);
    expect(parseIntPrism.encode(12)).toEqual("12");
  });
});

describe("identityPrism", () => {
  it("passes values through unchanged", () => {
    const id = identityPrism<{ a: number }>();
    const value = { a: 1 };
    const decoded = id.decode(value);
    expect(decoded).toEqual({ ok: true, data: value });
    expect(decoded.ok && decoded.data).toBe(value);
    expect(id.encode(value)).toBe(value);
  });
});

describe("mapPrism", () => {
  const evenInt = mapPrism(parseIntPrism, evenPrism);

  it("decodes through both prisms in order", () => {
    expect(evenInt.decode("4")).toEqual({ ok: true, data: 4 });
  });

  it("fails if the left prism fails", () => {
    let rightCalled = false;
    const spy = mapPrism(
      parseIntPrism,
      prism<number, number>(
        n => {
          rightCalled = true;
          return { ok: true, data: n };
        },
        n => n,
      ),
    );
    expect(spy.decode("x")).toEqual(fail);
    expect(rightCalled).toBe(false);
  });

  it("fails if the right prism fails", () => {
    expect(evenInt.decode("3")).toEqual(fail);
  });

  it("encodes through both prisms in reverse order", () => {
    const wrapped = mapPrism(
      prism<string, string>(
        s => ({ ok: true, data: s }),
        s => `<${s}>`,
      ),
      prism<string, number>(
        s => ({ ok: true, data: Number(s) }),
        n => `#${String(n)}`,
      ),
    );
    expect(wrapped.encode(7)).toEqual("<#7>");
  });

  it("is identity when mapped with identityPrism", () => {
    const left = mapPrism(identityPrism<string>(), parseIntPrism);
    const right = mapPrism(parseIntPrism, identityPrism<number>());
    for (const p of [left, right]) {
      expect(p.decode("5")).toEqual({ ok: true, data: 5 });
      expect(p.decode("x")).toEqual(fail);
      expect(p.encode(5)).toEqual("5");
    }
  });
});

describe("keyBy", () => {
  const keyed = keyBy("count", parseIntPrism);

  it("nests decoded data under the key", () => {
    expect(keyed.decode("3")).toEqual({ ok: true, data: { count: 3 } });
  });

  it("propagates decode failures", () => {
    expect(keyed.decode("x")).toEqual(fail);
  });

  it("encodes the value at the key", () => {
    expect(keyed.encode({ count: 9 })).toEqual("9");
  });

  it("creates a new object for each decode", () => {
    const a = keyed.decode("1");
    const b = keyed.decode("1");
    expect(a.ok && b.ok && a.data !== b.data).toBe(true);
  });
});
