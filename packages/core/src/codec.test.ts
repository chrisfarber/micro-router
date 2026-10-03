import { describe, expect, it } from "vitest";
import { codec, mapCodec } from "./codec";
import { path } from "./path";
import { keyBy, prism } from "./prism";
import { dataSegment } from "./segment";

const hex = codec<number>(
  text =>
    /^[0-9a-f]+$/i.test(text)
      ? { ok: true, data: parseInt(text, 16) }
      : { ok: false },
  n => n.toString(16),
);

describe("codec", () => {
  it("uses the supplied decode and encode functions", () => {
    expect(hex.decode("ff")).toEqual({ ok: true, data: 255 });
    expect(hex.decode("zz")).toEqual({ ok: false });
    expect(hex.encode(255)).toEqual("ff");
  });
});

describe("mapCodec", () => {
  const byte = mapCodec(
    hex,
    prism<number, { value: number }>(
      n => (n < 256 ? { ok: true, data: { value: n } } : { ok: false }),
      ({ value }) => value,
    ),
  );

  it("decodes through the codec, then the prism", () => {
    expect(byte.decode("10")).toEqual({ ok: true, data: { value: 16 } });
    expect(byte.decode("100")).toEqual({ ok: false });
    expect(byte.decode("zz")).toEqual({ ok: false });
  });

  it("encodes through the prism, then the codec", () => {
    expect(byte.encode({ value: 16 })).toEqual("10");
  });

  it("can back a data segment", () => {
    const p = path(
      "color",
      dataSegment({ repr: ":red", codec: keyBy("red", byte) }),
    );
    expect(p.match("/color/7f")).toMatchObject({
      ok: true,
      data: { red: { value: 127 } },
    });
    expect(p.make({ red: { value: 127 } })).toEqual("/color/7f");
  });
});
