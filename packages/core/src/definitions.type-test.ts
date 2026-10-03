import type { MergeDatas, MergeData } from "./definitions";
import { type Equal, expectTrue } from "./type-test-helpers";

expectTrue<Equal<MergeDatas<[]>, null>>();
expectTrue<Equal<MergeDatas<[{ a: 1 }]>, { a: 1 }>>();
expectTrue<Equal<MergeDatas<[{ a: 1 }, { b: 2 }]>, { a: 1; b: 2 }>>();
expectTrue<
  Equal<MergeDatas<[{ a: 1 }, { b: 2 }, { c: 3 }]>, { a: 1; b: 2; c: 3 }>
>();
expectTrue<
  Equal<
    MergeDatas<[{ a: 1 }, null, { b: 2 }, null, { c: 3 }]>,
    { a: 1; b: 2; c: 3 }
  >
>();

expectTrue<Equal<MergeData<null, null>, null>>();
expectTrue<Equal<MergeData<{ hello: true }, null>, { hello: true }>>();
expectTrue<Equal<MergeData<null, { hello: false }>, { hello: false }>>();
expectTrue<Equal<MergeData<{ a: 1 }, { b: 2 }>, { a: 1; b: 2 }>>();
