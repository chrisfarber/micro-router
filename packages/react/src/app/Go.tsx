import { useCallback, type MouseEvent } from "react";
import { useNavigator } from "../lib";

export const Go = ({ offset, title }: { offset: number; title: string }) => {
  const nav = useNavigator();
  const onClick = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      nav.go(offset);
    },
    [nav, offset],
  );
  return (
    <a href="#" onClick={onClick}>
      {title}
    </a>
  );
};
