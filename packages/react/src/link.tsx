import { type DataOfPath, type Path } from "@micro-router/core";
import {
  useCallback,
  useMemo,
  useSyncExternalStore,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type Ref,
} from "react";
import { useNavigator } from "./provider";

type PathFrom<P extends Path | string> = P extends Path
  ? P
  : Path<string, null>;

type DataOf<P extends Path | string> = DataOfPath<PathFrom<P>>;

/**
 * Where a link goes: a path, or a string for a path without data. A path with
 * data requires its `data`.
 */
export type LinkTarget<P extends Path | string> = {
  to: P;
  /** Replace the current history entry instead of pushing a new one. */
  replace?: boolean;
} & (DataOf<P> extends null ? { data?: null } : { data: DataOf<P> });

export type LinkProps<P extends Path | string> = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> & { ref?: Ref<HTMLAnchorElement> } & LinkTarget<P>;

/** @inline */
type ClientSideNavigation = {
  href: string;
  onClick: (e: MouseEvent) => void;
};

/**
 * Whether a click should be left for the browser to handle: it was already
 * handled, it isn't a plain left click, the anchor opens elsewhere or downloads
 * a file, or the link goes to another origin.
 */
const leftToBrowser = (e: MouseEvent, href: string): boolean => {
  if (e.defaultPrevented || e.button !== 0) return true;
  if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return true;
  const el = e.currentTarget;
  if (el instanceof HTMLAnchorElement) {
    if (el.target !== "" && el.target !== "_self") return true;
    if (el.hasAttribute("download")) return true;
  }
  return new URL(href, window.location.href).origin !== window.location.origin;
};

/**
 * A react hook that, given a link's target, will return a reified href along
 * with an onClick handler that can be used to initiate a client-side
 * navigation.
 *
 * The onClick handler leaves the click to the browser when that's what the user
 * expects: when a modifier key is held, so that the link can open in a new tab
 * or window, when the link goes to another origin, or when the anchor has a
 * `target` or `download` attribute.
 */
export const useClientSideNavigation = <P extends Path | string>(
  target: LinkTarget<P>,
): ClientSideNavigation => {
  const { to, data, replace } = target as {
    to: Path | string;
    data?: unknown;
    replace?: boolean;
  };
  const nav = useNavigator();
  const href = useMemo(
    () => (typeof to === "string" ? to : to.make(data)),
    [to, data],
  );
  const onClick = useCallback(
    (e: MouseEvent) => {
      if (leftToBrowser(e, href)) return;
      e.preventDefault();
      if (replace) {
        nav.replace(href);
      } else {
        nav.push(href);
      }
    },
    [href, nav, replace],
  );

  return { href, onClick };
};

/**
 * Whether `href`, built from `to`, is the current page. Only the pathname is
 * compared, like routes. A path is matched against the location and rebuilt,
 * so that case, trailing slashes and encoding don't matter.
 *
 * The snapshot is only this boolean, so a link re-renders when it becomes or
 * stops being current, and not on every navigation.
 */
const useIsCurrent = (to: Path | string, href: string): boolean => {
  const nav = useNavigator();
  const subscribe = useCallback(
    (onChange: () => void) => nav.listen(onChange),
    [nav],
  );
  const isCurrent = useCallback(() => {
    const { pathname } = nav.location;
    if (typeof to === "string") {
      const base = new URL(pathname, window.location.origin);
      const url = new URL(to, base);
      return url.origin === base.origin && url.pathname === base.pathname;
    }
    const match = to.match(pathname);
    return match.ok && match.exact && to.make(match.data) === href;
  }, [nav, to, href]);
  return useSyncExternalStore(subscribe, isCurrent);
};

/**
 * Render an `<a>` tag that links to the provided path with client-side
 * navigation. It accepts any of the anchor's attributes, except for `href`.
 *
 * A link to the current page gets `aria-current="page"`, unless
 * `aria-current` is given explicitly.
 *
 * A path with data requires its `data`, so that the URL can be built:
 *
 * ```tsx
 * <Link to={MessagePath} data={{ messageId: "123" }}>...</Link>
 * ```
 *
 * An `onClick` handler is called first, and can prevent the navigation with
 * `e.preventDefault()`.
 */
export const Link = <P extends Path | string>(props: LinkProps<P>) => {
  const {
    to,
    data,
    replace,
    onClick,
    "aria-current": ariaCurrent,
    ...anchorProps
  } = props as LinkProps<string> & { to: P; data?: DataOf<P> };
  const navigation = useClientSideNavigation({ to, data, replace });
  const current = useIsCurrent(to, navigation.href);

  return (
    <a
      {...anchorProps}
      aria-current={ariaCurrent ?? (current ? "page" : undefined)}
      href={navigation.href}
      onClick={e => {
        onClick?.(e);
        navigation.onClick(e);
      }}
    />
  );
};
