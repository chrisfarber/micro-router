/* eslint-disable react-hooks/refs */
import { type DataOfPath, type Path } from "@micro-router/core";
import {
  useCallback,
  useMemo,
  type AnchorHTMLAttributes,
  type AriaAttributes,
  type MouseEvent,
  type PropsWithChildren,
  type RefObject,
} from "react";
import { useNavigator } from "./provider";

const EXPLICIT_DATA_PROP_KEY = "data";
/** @inline */
type ExplicitDataPropKey = typeof EXPLICIT_DATA_PROP_KEY;

const FORWARDED_PROPS = [
  "className",
  "tabIndex",
] as const satisfies (keyof AnchorHTMLAttributes<unknown>)[];
/** @inline */
type ForwardedPropKeys = (typeof FORWARDED_PROPS)[number];
/** @inline */
type DataAttributes = {
  [key: `data-${string}`]: string | number | boolean | undefined;
};
/** @inline */
type ForwardedProps = Pick<AnchorHTMLAttributes<unknown>, ForwardedPropKeys> &
  AriaAttributes &
  DataAttributes;

const shouldForwardProp = (key: string): boolean =>
  (FORWARDED_PROPS as readonly string[]).includes(key) ||
  key.startsWith("aria-") ||
  key.startsWith("data-");

export type LinkBaseProps<P extends Path | string> = PropsWithChildren<
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

/** @inline */
type ConflictingDataKeys =
  | ExplicitDataPropKey
  | IntrinsicPropKeys
  | ForwardedPropKeys;

export type PathDataCanBeInlineLinkProps<D> =
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

export type LinkDataProps<P extends Path | string> =
  DataOf<P> extends null
    ? object
    : PathDataCanBeInlineLinkProps<DataOf<P>> extends true
      ? (DataOf<P> & NeverKeyedDataProp) | (KeyedDataProp<P> & NeverDataOf<P>)
      : KeyedDataProp<P>;

export type LinkProps<P extends Path | string> = LinkBaseProps<P> &
  LinkDataProps<P>;

const pathToString = (path: string | Path, data: unknown): string => {
  if (typeof path === "string") {
    return path;
  }
  return path.make(data);
};

/** @inline */
type ClientSideNavigation = {
  href: string;
  onClick: (e: MouseEvent) => void;
};

/**
 * A react hook that, given a path and its data, will return a reified href
 * along with an onClick handler that can be used to initiate a client-side
 * navigation.
 *
 * The returned onClick handler will check whether any modifier keys are active
 * on the event (shift, meta, ctrl, alt). If so, it will allow the event to
 * bubble. This preserves the ability for the user to intentionally open the
 * link in a new tab or window.
 */
export const useClientSideNavigation = <P extends Path | string>(
  path: P,
  data: DataOf<P>,
): ClientSideNavigation => {
  const nav = useNavigator();
  const href: string = useMemo(() => pathToString(path, data), [path, data]);
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

  return { href, onClick };
};

/**
 * Render an `<a>` tag that links to the provided path with client-side
 * navigation.
 *
 * This component will require the data for the desired path to be provided
 * so that the actual URL can be constructed.
 *
 * If the data is an object whose keys do not conflict with the normal props
 * of the `<Link>` component, then they will be allowed as inline props:
 *
 * ```tsx
 *  <Link to={MessagePath} messageId="123">...</Link>
 * ```
 *
 * Regardless, you are also allowed to specify the path data via a `data` prop:
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const data: DataOf<P> = props[EXPLICIT_DATA_PROP_KEY] ?? props;
  const { href, onClick } = useClientSideNavigation(path, data);

  const anchorProps = useMemo(() => {
    const anchorProps: Record<string, unknown> = {};
    for (const key of Object.keys(props)) {
      if (shouldForwardProp(key)) {
        anchorProps[key] = props[key as keyof typeof props];
      }
    }
    anchorProps["ref"] = props.ref;
    return anchorProps;
  }, [props]);

  return (
    <a {...anchorProps} href={href} onClick={onClick}>
      {children}
    </a>
  );
};
