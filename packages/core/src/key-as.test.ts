import { describe, expect, it } from "vitest";
import { keyAs } from "./key-as";
import { path } from "./path";
import { string, matchString } from "./string";
import { matchText } from "./text";

describe("keyAs", () => {
  it("computes the path description", () => {
    const p = keyAs("stuff", path("a", string("b")));

    const descr: (typeof p)["path"] = ":stuff[/a/:b]";
    expect(p.path).toEqual(descr);
  });

  it("preserves captures", () => {
    const keyed = keyAs("name", matchString);
    const noCaptures = keyAs("null", matchText("hi"));
    expect(keyed.captures).toBe(1);
    expect(noCaptures.captures).toBe(0);
  });
});
