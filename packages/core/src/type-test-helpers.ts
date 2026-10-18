/* oxlint-disable typescript/no-unnecessary-type-parameters -- these type parameters exist only to drive compile-time assertions */

/** Strict type equality; distinguishes `any`, `unknown`, and intersections. */
export type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

/** Fails to compile unless the type argument is `true`. */
export const expectTrue = <_T extends true>() => {};
