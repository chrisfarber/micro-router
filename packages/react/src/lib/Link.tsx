/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  type MouseEvent,
  type PropsWithChildren,
  useCallback,
  useMemo,
} from "react";
import type { ParamsOf, Path } from "@micro-router/core";
import { useNavigator } from "./provider";

type ParamsPropFor<P extends Path | string> = P extends Path
  ? ParamsOf<P> extends Record<string, unknown>
    ? { params: ParamsOf<P> }
    : unknown
  : unknown;

type BaseProps<P extends Path | string> = PropsWithChildren<{ to: P }>;

export type LinkProps<P extends Path | string> = BaseProps<P> &
  ParamsPropFor<P>;

export const Link = <P extends Path | string>(props: LinkProps<P>) => {
  const { to: path, children } = props;
  const { params } = props as any;
  const nav = useNavigator();
  const href: string = useMemo(() => {
    if (typeof path === "string") {
      return path;
    }
    return path.make(params ?? {});
  }, [path, params]);
  const onClick = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      nav.push(href);
    },
    [href, nav],
  );
  return (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  );
};
