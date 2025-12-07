import type { DataOfPath, Path } from "@micro-router/core";
import {
  type MouseEvent,
  type PropsWithChildren,
  useCallback,
  useMemo,
} from "react";
import { useNavigator } from "./provider";

type ParamsPropFor<P extends Path | string> = P extends Path
  ? DataOfPath<P> extends Record<string, unknown>
    ? { params: DataOfPath<P> }
    : unknown
  : unknown;

type BaseProps<P extends Path | string> = PropsWithChildren<{ to: P }>;

export type LinkProps<P extends Path | string> = BaseProps<P> &
  ParamsPropFor<P>;

export const Link = <P extends Path | string>(props: LinkProps<P>) => {
  const { to: path, children } = props;
  const { params } = props as unknown as { params: unknown };
  const nav = useNavigator();
  const href: string = useMemo(() => {
    if (typeof path === "string") {
      return path;
    }
    return path.make(params ?? {});
  }, [path, params]);
  const onClick = useCallback(
    (e: MouseEvent) => {
      const defaulting = !e.defaultPrevented;
      const leftClick = e.button === 0;
      const modifiers = e.metaKey || e.altKey || e.ctrlKey || e.shiftKey;
      if (defaulting && leftClick && !modifiers) {
        e.preventDefault();
        nav.push(href);
      }
    },
    [href, nav],
  );
  return (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  );
};
