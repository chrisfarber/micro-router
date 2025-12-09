import { type DataOfPath, type Path } from "@micro-router/core";
import {
  useCallback,
  useMemo,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type PropsWithChildren,
  type RefObject,
} from "react";
import { useNavigator } from "./provider";

const EXPLICIT_DATA_PROP_KEY = "data";
type ExplicitDataPropKey = typeof EXPLICIT_DATA_PROP_KEY;

const FORWARDED_PROPS = [
  "className",
  "tabIndex",
] as const satisfies (keyof AnchorHTMLAttributes<unknown>)[];
type ForwardedPropKeys = (typeof FORWARDED_PROPS)[number];
type ForwardedProps = Pick<AnchorHTMLAttributes<unknown>, ForwardedPropKeys>;

type LinkBaseProps<P extends Path | string> = PropsWithChildren<
  { to: P; ref?: RefObject<HTMLAnchorElement> } & ForwardedProps
>;

type IntrinsicProps = {
  [k in keyof LinkBaseProps<string> as k extends ForwardedPropKeys
    ? never
    : k]: LinkBaseProps<string>[k];
};
type IntrinsicPropKeys = keyof IntrinsicProps;

type PathFrom<P extends Path | string> = P extends Path
  ? P
  : Path<string, null>;

type DataOf<P extends Path | string> = DataOfPath<PathFrom<P>>;
type NeverDataOf<P extends Path | string> = { [K in keyof DataOf<P>]?: never };

type ConflictingDataKeys =
  | ExplicitDataPropKey
  | IntrinsicPropKeys
  | ForwardedPropKeys;

type PathDataCanBeInlineProps<D> =
  D extends Record<string, unknown>
    ? keyof D & ConflictingDataKeys extends never
      ? true
      : false
    : false;

type KeyedDataProp<P extends Path | string> = Record<
  ExplicitDataPropKey,
  DataOf<P>
>;
type NeverKeyedDataProp = { [k in ExplicitDataPropKey]?: never };

type DataPropsFor<P extends Path | string> =
  DataOf<P> extends null
    ? object
    : PathDataCanBeInlineProps<DataOf<P>> extends true
      ? (DataOf<P> & NeverKeyedDataProp) | (KeyedDataProp<P> & NeverDataOf<P>)
      : KeyedDataProp<P>;

export type LinkProps<P extends Path | string> = LinkBaseProps<P> &
  DataPropsFor<P>;

const pathToString = (path: string | Path, data: unknown): string => {
  if (typeof path === "string") {
    return path;
  }
  return path.make(data);
};

/**
 * Render an `<a>` tag that links to the provided path with client-side
 * navigation.
 *
 * This component will require the data for the desired path to be provided
 * so that the actual URL can be constructed.
 *
 * If the data is an object whose keys do not conflict with the normal props
 * of the `<Link>` component, then they will be expected as inline props:
 *
 * ```tsx
 *  <Link to={MessagePath} messageId="123">...</Link>
 * ```
 *
 * Otherwise, the types will prohibit this approach and you will be required
 * to provide a `data` prop:
 *
 * ```tsx
 * <Link to={MessageRefPath} data={{messageId: "123", ref: "not-a-react-ref"}}>
 * ```
 */
export const Link = <P extends Path | string>(props: LinkProps<P>) => {
  const { to: path, children } = props as LinkBaseProps<P>;

  /**
   * types should have guaranteed that if our props at all conflict with the
   * path's data keys, then its data must be passed in under the `data` prop,
   * instead of specifying the data inline with our props.
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, react-hooks/refs
  const data: DataOf<P> = props[EXPLICIT_DATA_PROP_KEY] ?? props;
  const nav = useNavigator();
  // eslint-disable-next-line react-hooks/refs
  const href: string = useMemo(() => pathToString(path, data), [path, data]);
  const anchorProps = useMemo(() => {
    const anchorProps: Record<string, unknown> = {};
    for (const toForward of FORWARDED_PROPS) {
      // eslint-disable-next-line react-hooks/refs
      anchorProps[toForward] = props[toForward];
    }
    // eslint-disable-next-line react-hooks/refs
    anchorProps["ref"] = props.ref;
    return anchorProps;
  }, [props]);
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
    <a {...anchorProps} href={href} onClick={onClick}>
      {children}
    </a>
  );
};
