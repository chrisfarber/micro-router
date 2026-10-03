import { path } from "./path";
import { regexp } from "./regexp";
import { type Equal, expectTrue } from "./type-test-helpers";

const raw = path(regexp("name", /[a-z]+/));
expectTrue<Equal<(typeof raw)["repr"], "/:name[regexp]">>();
expectTrue<Equal<(typeof raw)["_data"], { name: string }>>();

const mapped = path(
  regexp("n", /\d+/, {
    codec: {
      decode: m => ({ ok: true, data: Number(m[0]) }),
      encode: n => String(n),
    },
  }),
);
expectTrue<Equal<(typeof mapped)["_data"], { n: number }>>();
