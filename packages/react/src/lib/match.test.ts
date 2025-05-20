import { path, string } from "@micro-router/core";
import { describe, expect, it } from "vitest";
import { bestMatch, match } from "./match";

describe("bestMatch", () => {
  it("picks the component with the least unmatched text", () => {
    const components = [
      match(path("/something"), () => null),
      match(path("/something/else"), () => null),
      match(path("/something", string("id")), () => null),

      match(path("/something", string("id"), "else"), () => null),
    ];

    expect(typeof bestMatch({ of: components })).toEqual("function");
  });
});
