import { FC, PropsWithChildren } from "react";

export {};
console.log("hi");

export const Foo: FC<PropsWithChildren> = ({ children }) => (
  <div>hi. {children}</div>
);
