import type { Path } from "./definitions";
import { path } from "./path";
import { string } from "./string";
import { type Equal, expectTrue } from "./type-test-helpers";

const ok = path("users", string("a"), string("b"));
expectTrue<Equal<(typeof ok)["repr"], "/users/:a/:b">>();
expectTrue<Equal<(typeof ok)["_data"], { a: string; b: string }>>();

// string inputs after the first keep their literal types
const nested = path(path("/hello"), "there", string("b"));
expectTrue<Equal<(typeof nested)["repr"], "/hello/there/:b">>();

const withArray = path("x", [string("c"), string("d")]);
expectTrue<Equal<(typeof withArray)["repr"], "/x/:c/:d">>();
expectTrue<Equal<(typeof withArray)["_data"], { c: string; d: string }>>();

const generic = <P extends Path>(base: P) => path(base, string("id"));
const fromGeneric = generic(path("users", string("org")));
expectTrue<Equal<(typeof fromGeneric)["repr"], "/users/:org/:id">>();
expectTrue<Equal<(typeof fromGeneric)["_data"], { org: string; id: string }>>();
