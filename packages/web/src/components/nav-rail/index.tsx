'use client';

/**
 * NavRail — the destinations of a product down one side, folded to icons when
 * the screen is narrow or the work needs the room.
 *
 * ```tsx
 * <NavRail aria-label="Main">
 *   <NavRail.Header>
 *     <NavRail.Brand icon={<LayersIcon />}>Meridian</NavRail.Brand>
 *     <NavRail.Trigger />
 *   </NavRail.Header>
 *   <NavRail.Group label="Workspace">
 *     <NavRail.Item href="/" active icon={<HomeIcon />}>Overview</NavRail.Item>
 *     <NavRail.Item href="/inbox" icon={<InboxIcon />}>
 *       Inbox <NavRail.Badge>12</NavRail.Badge>
 *     </NavRail.Item>
 *   </NavRail.Group>
 *   <NavRail.Footer>…</NavRail.Footer>
 * </NavRail>
 * ```
 *
 * ## One pill, and it travels
 *
 * The chosen destination sits on a tonal pill in the primary colour, with a
 * short accent on its leading edge. There is one pill for the whole rail, not
 * one per group, so it crosses the gap between groups when the choice does:
 * going from Inbox to Settings reads as one move down the rail rather than as
 * one row dimming while another lights.
 *
 * The pill is placed by measuring the active row in a layout effect, and kept
 * on it with a `ResizeObserver` and a `MutationObserver` as the rail changes
 * width, a label wraps or the active item changes. It is measured before paint
 * and does not animate on the first placement, so a page never opens with the
 * pill sliding in from the corner. With reduced motion the travel is skipped
 * and it is simply there.
 *
 * ## Folded, it is still a rail
 *
 * Collapsed, the rows become 40px icon squares. The active pill becomes the
 * square, the group labels become dividers, and a badge becomes a dot on the
 * corner of its icon rather than disappearing with the label. The rail's width
 * follows the state, so an app can put it in a flex row and let the content
 * take the room it gives up.
 *
 * A folded item keeps its accessible name through `label` (or its text
 * children when they are plain text), and shows the same name in a small
 * flyout on hover and focus. The visible label is `aria-hidden` while folded,
 * so a screen reader hears the row once rather than twice.
 *
 * ## Two weights
 *
 * `variant="tonal"`, the default, keeps the current place as a quiet primary
 * tint with a short accent bar — the right volume for a rail that is part of
 * the app's chrome and is on screen the whole time. `variant="solid"` fills the
 * row with the primary colour and sets its text in `primary-foreground`, the
 * same weight Tabs, Toolbar and Inspector give their chosen item, for an app
 * that wants the rail to speak as loudly as the rest of the collection. The
 * choice applies folded as well: the icon square and the count dot follow it.
 *
 * ## The keyboard
 *
 * Every row is an ordinary tab stop, so Tab walks the rail the way it walks
 * the rest of the page. Once focus is on a row, Up and Down move it, wrapping
 * at the ends and stepping over disabled rows; Home and End go to the first and
 * last. `NavRail.Trigger` is a button and says whether the rail is open with
 * `aria-expanded`.
 *
 * ## It does not collapse itself
 *
 * There is no viewport-width breakpoint here. Choosing a width on the client
 * after hydration makes a server-rendered page jump, and choosing one on the
 * server guesses the reader's window. The rail is controlled or uncontrolled
 * by `collapsed`, so the app decides, and can pass a media query or a stored
 * preference without the component having an opinion about either.
 */
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';
import { indicatorBox, isRovingKey, railWidth, rovingIndex, textOf } from './rail';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

/** How loudly the active row is drawn: a quiet tint, or the primary fill. */
export type NavRailVariant = 'tonal' | 'solid';

/** One curve for the width, the pill and the labels, so they move as one thing. */
const EASE = 'ease-[cubic-bezier(0.32,0.72,0,1)]';

const navRailVariants = tv({
  slots: {
    root: [
      'group/nav-rail relative isolate flex h-full w-(--nav-rail-width) shrink-0 flex-col gap-1 rounded-2xl p-2',
      'bg-muted/50 text-foreground ring-1 ring-foreground/[0.045] dark:bg-muted/40 dark:ring-foreground/[0.08]',
      `transition-[width] duration-300 ${EASE} motion-reduce:transition-none`,
    ],
    header: [
      'flex shrink-0 items-center gap-2 px-0.5 pb-1',
      'group-data-[collapsed]/nav-rail:flex-col group-data-[collapsed]/nav-rail:gap-1 group-data-[collapsed]/nav-rail:pb-0',
    ],
    brand: [
      'group/brand flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] px-1.5 py-1 text-start outline-none',
      'transition-colors duration-150',
      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
      'group-data-[collapsed]/nav-rail:flex-none group-data-[collapsed]/nav-rail:justify-center group-data-[collapsed]/nav-rail:gap-0 group-data-[collapsed]/nav-rail:px-0',
    ],
    brandIcon:
      'flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_img]:size-full [&_img]:rounded-[inherit] [&_img]:object-cover [&_svg]:size-[18px]',
    brandLabel: [
      'min-w-0 max-w-40 truncate text-sm font-semibold tracking-[-0.01em]',
      `transition-[opacity,translate,max-width] duration-300 ${EASE} motion-reduce:transition-none`,
      'group-data-[collapsed]/nav-rail:max-w-0 group-data-[collapsed]/nav-rail:-translate-x-1 group-data-[collapsed]/nav-rail:pointer-events-none group-data-[collapsed]/nav-rail:opacity-0',
    ],
    trigger: [
      'inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none',
      'transition-[background-color,color,scale] duration-150 hover:bg-foreground/[0.06] hover:text-foreground',
      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:scale-95 motion-reduce:transition-none',
    ],
    triggerGlyph: `size-4 transition-transform duration-300 ${EASE} motion-reduce:transition-none`,
    group: 'flex flex-col gap-0.5',
    // The heading and the divider share the row: one fades out as the other
    // fades in, so a group keeps its height folded and open.
    groupLabel: 'relative flex h-7 shrink-0 items-center overflow-hidden px-2.5',
    groupLabelText: [
      'min-w-0 flex-1 truncate text-[10px] font-semibold tracking-[0.09em] text-muted-foreground/70 uppercase',
      'transition-opacity duration-200 motion-reduce:transition-none',
      'group-data-[collapsed]/nav-rail:pointer-events-none group-data-[collapsed]/nav-rail:opacity-0',
    ],
    groupLabelDivider: [
      'pointer-events-none absolute inset-x-2 h-px rounded-full bg-border opacity-0',
      'transition-opacity duration-200 motion-reduce:transition-none',
      'group-data-[collapsed]/nav-rail:opacity-100',
    ],
    item: [
      'group/item relative z-10 flex h-10 w-full shrink-0 cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 text-sm font-medium outline-none select-none',
      'text-muted-foreground transition-colors duration-150 hover:bg-foreground/[0.05] hover:text-foreground',
      'data-active:text-foreground data-active:hover:bg-foreground/[0.03]',
      'data-solid-active:text-primary-foreground! data-solid-active:hover:bg-transparent',
      'data-disabled:pointer-events-none data-disabled:opacity-40',
      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
      'group-data-[collapsed]/nav-rail:justify-center group-data-[collapsed]/nav-rail:gap-0 group-data-[collapsed]/nav-rail:px-0',
    ],
    icon: [
      'flex size-5 shrink-0 items-center justify-center text-muted-foreground',
      'transition-colors duration-150 group-hover/item:text-foreground group-data-[active]/item:text-primary',
      'group-data-[solid-active]/item:text-primary-foreground',
      '[&_svg]:pointer-events-none [&_svg]:size-[18px]',
    ],
    label: [
      'min-w-0 max-w-full flex-1 truncate whitespace-nowrap',
      `transition-[opacity,translate,max-width] duration-300 ${EASE} motion-reduce:transition-none`,
      'group-data-[collapsed]/nav-rail:max-w-0 group-data-[collapsed]/nav-rail:-translate-x-1 group-data-[collapsed]/nav-rail:pointer-events-none group-data-[collapsed]/nav-rail:opacity-0',
    ],
    badges: [
      'pointer-events-none ms-auto flex shrink-0 items-center gap-1',
      'group-data-[collapsed]/nav-rail:absolute group-data-[collapsed]/nav-rail:end-0.5 group-data-[collapsed]/nav-rail:top-0.5 group-data-[collapsed]/nav-rail:ms-0',
      'group-data-[collapsed]/nav-rail:[&>*+*]:hidden',
    ],
    badge: [
      'inline-flex h-5 min-w-5 shrink-0 items-center justify-center overflow-hidden rounded-full px-1.5',
      'bg-foreground/[0.07] text-[11px] font-medium text-muted-foreground tabular-nums',
      'transition-colors duration-150 group-data-[active]/item:bg-primary/15 group-data-[active]/item:text-foreground',
      'group-data-[solid-active]/item:bg-primary-foreground/20! group-data-[solid-active]/item:text-primary-foreground!',
      'group-data-[collapsed]/nav-rail:group-data-[solid-active]/item:bg-primary-foreground!',
      // Folded, the count is a dot: the label is gone and a number would have
      // nowhere to sit, but the fact that something is waiting still reads.
      'group-data-[collapsed]/nav-rail:size-2 group-data-[collapsed]/nav-rail:min-w-0 group-data-[collapsed]/nav-rail:bg-primary group-data-[collapsed]/nav-rail:p-0 group-data-[collapsed]/nav-rail:text-[0px] group-data-[collapsed]/nav-rail:text-transparent',
    ],
    tooltip: [
      'pointer-events-none absolute start-[calc(100%+0.5rem)] top-1/2 z-50 origin-left -translate-y-1/2 scale-95',
      'rounded-md bg-foreground px-2 py-1 text-xs font-medium whitespace-nowrap text-background opacity-0 shadow-md',
      'transition-[opacity,scale] duration-150 group-hover/item:scale-100 group-hover/item:opacity-100',
      'group-focus-visible/item:scale-100 group-focus-visible/item:opacity-100 motion-reduce:transition-none',
    ],
    separator: 'mx-1.5 h-px shrink-0 rounded-full bg-border group-data-[collapsed]/nav-rail:mx-0.5',
    footer: 'mt-auto flex shrink-0 flex-col gap-0.5 pt-1',
    // One pill for the whole rail. The accent is its own small bar so the fill
    // can stay a tint rather than a solid block of colour.
    indicator: [
      'pointer-events-none absolute top-(--indicator-y) left-(--indicator-x) z-0 h-(--indicator-h) w-(--indicator-w) rounded-[10px]',
      'bg-primary/[0.12] opacity-0 ring-1 ring-primary/20 ring-inset',
      'group-data-[variant=solid]/nav-rail:bg-primary group-data-[variant=solid]/nav-rail:ring-0',
      "group-data-[collapsed]/nav-rail:before:hidden group-data-[variant=solid]/nav-rail:before:hidden",
      "before:absolute before:inset-y-2.5 before:start-1 before:w-[3px] before:rounded-full before:bg-primary before:content-['']",
      'data-ready:opacity-100',
      'data-ready:transition-[left,top,width,height] data-ready:duration-300 data-ready:ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
    ],
  },
});

interface NavRailContextValue {
  collapsed: boolean;
  variant: NavRailVariant;
  setCollapsed(next: boolean): void;
  toggle(): void;
}

const NavRailContext = createContext<NavRailContextValue | null>(null);

function useNavRail(part: string): NavRailContextValue {
  const context = useContext(NavRailContext);
  if (!context) throw new Error(`${part} must be used inside a <NavRail>.`);
  return context;
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export interface NavRailProps extends Omit<ComponentProps<'nav'>, 'className'> {
  /** Whether the rail is folded. Pass it with `onCollapsedChange` to hold the state yourself. */
  collapsed?: boolean;
  /** Whether it starts folded, when the caller does not hold it. Default `false`. */
  defaultCollapsed?: boolean;
  /** Called when the rail asks to fold or unfold. */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Its width open, as pixels or any CSS length. Default `15rem`. */
  expandedWidth?: number | string;
  /** Its width folded, as pixels or any CSS length. Default `3.5rem`. */
  collapsedWidth?: number | string;
  /**
   * How loudly the active row is drawn. `tonal` is a quiet primary tint with an
   * accent bar; `solid` is the primary fill and `primary-foreground` text that
   * Tabs, Toolbar and Inspector use. Default `tonal`.
   */
  variant?: NavRailVariant;
  className?: string;
}

/**
 * The rail. It is a `<nav>` landmark, so give it an `aria-label` that says
 * which set of destinations it holds when the page has more than one.
 */
function NavRailRoot({
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  expandedWidth = '15rem',
  collapsedWidth = '3.5rem',
  variant = 'tonal',
  className,
  style,
  children,
  render,
  'aria-label': ariaLabel = 'Navigation',
  ...props
}: NavRailProps & RenderProp<'nav'>) {
  const slots = navRailVariants();
  const [inner, setInner] = useState(defaultCollapsed);
  const collapsed = collapsedProp ?? inner;

  // One live object, so a callback written on the first render still sees the
  // state and handlers from the last one.
  const live = useRef({ collapsed, controlled: collapsedProp !== undefined, onCollapsedChange });
  live.current = { collapsed, controlled: collapsedProp !== undefined, onCollapsedChange };

  const setCollapsed = useCallback((next: boolean) => {
    if (!live.current.controlled) setInner(next);
    if (next !== live.current.collapsed) live.current.onCollapsedChange?.(next);
  }, []);
  const toggle = useCallback(() => setCollapsed(!live.current.collapsed), [setCollapsed]);

  const context = useMemo<NavRailContextValue>(
    () => ({ collapsed, variant, setCollapsed, toggle }),
    [collapsed, variant, setCollapsed, toggle]
  );

  const root = useRef<HTMLElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);

  /*
   * The pill is measured rather than drawn per row: one element, moved onto
   * whichever row is active. Its coordinates are in the rail's scrolling
   * content, so it scrolls with the rows.
   *
   * A resize of the rail or any row, and a change to which row is active, both
   * move it. The first placement is made ready on the next frame, which is
   * what keeps it from animating out of the top-left corner on mount.
   */
  useIsomorphicLayoutEffect(() => {
    const box = root.current;
    const pill = indicator.current;
    if (!box || !pill) return;

    let frame = 0;
    let live = true;
    let rows: HTMLElement[] = [];

    const place = () => {
      if (!live) return;
      const active = box.querySelector<HTMLElement>('[data-slot="nav-rail-item"][data-active]');
      if (!active) {
        pill.removeAttribute('data-ready');
        return;
      }
      const rail = box.getBoundingClientRect();
      const item = active.getBoundingClientRect();
      // The pill is positioned against the rail's padding box, which starts
      // inside its border, if a caller has put one there.
      const next = indicatorBox(
        {
          top: rail.top + box.clientTop,
          left: rail.left + box.clientLeft,
          width: box.clientWidth,
          height: box.clientHeight,
        },
        { top: item.top, left: item.left, width: item.width, height: item.height },
        { x: box.scrollLeft, y: box.scrollTop }
      );
      pill.style.setProperty('--indicator-x', `${next.x}px`);
      pill.style.setProperty('--indicator-y', `${next.y}px`);
      pill.style.setProperty('--indicator-w', `${next.width}px`);
      pill.style.setProperty('--indicator-h', `${next.height}px`);
      if (!pill.hasAttribute('data-ready')) {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          if (live) pill.setAttribute('data-ready', '');
        });
      }
    };

    const observer = new ResizeObserver(place);
    const observe = () => {
      observer.disconnect();
      observer.observe(box);
      rows = [...box.querySelectorAll<HTMLElement>('[data-slot="nav-rail-item"]')];
      rows.forEach((row) => observer.observe(row));
    };

    observe();
    place();

    // Which row is active is an attribute on a child, not a prop of the rail,
    // so a mutation is what tells the pill to follow. Adding or removing rows
    // is observed for the same reason.
    const mutations = new MutationObserver(() => {
      observe();
      place();
    });
    mutations.observe(box, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-active'],
    });

    // A webfont arriving after the first paint changes the width of a label.
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(place).catch(() => {});
    }

    return () => {
      live = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!isRovingKey(event.key) || event.defaultPrevented) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const row = target.closest<HTMLElement>('[data-slot="nav-rail-item"]');
    if (!row) return;
    const host = root.current;
    if (!host) return;

    const rows = [...host.querySelectorAll<HTMLElement>('[data-slot="nav-rail-item"]')];
    const current = rows.indexOf(row);
    if (current < 0) return;
    const disabled = rows.map((each) => each.getAttribute('aria-disabled') === 'true' || each.hasAttribute('disabled'));
    const next = rovingIndex(event.key, current, disabled);
    if (next === null) return;
    event.preventDefault();
    rows[next]?.focus();
  };

  return useRender({
    defaultTagName: 'nav',
    ref: root,
    render,
    props: mergeProps(
      {
        'data-slot': 'nav-rail',
        'data-collapsed': collapsed ? '' : undefined,
        'data-variant': variant,
        'aria-label': ariaLabel,
        className: slots.root({ className }),
        style: {
          ...style,
          '--nav-rail-width': railWidth(collapsed, expandedWidth, collapsedWidth),
        } as CSSProperties,
        onKeyDown,
        children: (
          <>
            <NavRailContext.Provider value={context}>{children}</NavRailContext.Provider>
            <span ref={indicator} aria-hidden="true" data-slot="nav-rail-indicator" className={slots.indicator()} />
          </>
        ),
      },
      props
    ),
  });
}
NavRailRoot.displayName = 'NavRail';

export interface NavRailHeaderProps extends Omit<ComponentProps<'div'>, 'className'> {
  className?: string;
}

/** The top of the rail: usually a brand and the trigger that folds it. */
function NavRailHeader({ className, render, ...props }: NavRailHeaderProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'nav-rail-header', className: navRailVariants().header({ className }) }, props),
  });
}
NavRailHeader.displayName = 'NavRail.Header';

export interface NavRailBrandProps extends Omit<ComponentProps<'a'>, 'href' | 'className'> {
  /** Where it goes. Without it the brand is a plain block rather than a link. */
  href?: string;
  /** The mark beside the name, usually an icon. It is what remains when the rail folds. */
  icon?: ReactNode;
  /**
   * What a screen reader calls the brand once the name is folded away.
   * Taken from text children when they are plain text.
   */
  label?: string;
  className?: string;
}

/** The product's mark and name at the top of the rail. */
function NavRailBrand({ href, icon, label, className, children, render, ...props }: NavRailBrandProps & RenderProp<'a'>) {
  const { collapsed } = useNavRail('NavRail.Brand');
  const slots = navRailVariants();
  const name = label ?? textOf(children);
  return useRender({
    defaultTagName: href === undefined ? 'div' : 'a',
    render,
    props: mergeProps(
      {
        'data-slot': 'nav-rail-brand',
        href,
        'aria-label': collapsed && name ? name : undefined,
        className: slots.brand({
          className: [href !== undefined && 'cursor-pointer hover:bg-foreground/[0.04]', className],
        }),
        children: (
          <>
            {icon ? (
              <span aria-hidden="true" data-slot="nav-rail-brand-icon" className={slots.brandIcon()}>
                {icon}
              </span>
            ) : null}
            <span
              aria-hidden={collapsed || undefined}
              data-slot="nav-rail-brand-label"
              className={slots.brandLabel()}
            >
              {children}
            </span>
          </>
        ),
      },
      props
    ),
  });
}
NavRailBrand.displayName = 'NavRail.Brand';

export interface NavRailTriggerProps extends Omit<ComponentProps<'button'>, 'className'> {
  /** What it is called when the rail is folded and pressing it opens it. Default "Expand navigation". */
  expandLabel?: string;
  /** What it is called when the rail is open and pressing it folds it. Default "Collapse navigation". */
  collapseLabel?: string;
  className?: string;
}

/** Folds and unfolds the rail. It says which it will do, and whether the rail is open. */
function NavRailTrigger({
  expandLabel = 'Expand navigation',
  collapseLabel = 'Collapse navigation',
  className,
  children,
  render,
  ...props
}: NavRailTriggerProps & RenderProp<'button'>) {
  const { collapsed, toggle } = useNavRail('NavRail.Trigger');
  const slots = navRailVariants();
  return useRender({
    defaultTagName: 'button',
    render,
    props: mergeProps(
      {
        'data-slot': 'nav-rail-trigger',
        type: 'button',
        'aria-expanded': !collapsed,
        'aria-label': collapsed ? expandLabel : collapseLabel,
        className: slots.trigger({ className }),
        onClick: toggle,
        children: children ?? (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={slots.triggerGlyph({
              className: collapsed ? 'rotate-180' : undefined,
            })}
          >
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <path d="M9 4v16" />
            <path d="m15.5 9.5-2.5 2.5 2.5 2.5" />
          </svg>
        ),
      },
      props
    ),
  });
}
NavRailTrigger.displayName = 'NavRail.Trigger';

export interface NavRailGroupProps extends Omit<ComponentProps<'div'>, 'className'> {
  /**
   * The heading over the group. Open, it is a small uppercase label; folded,
   * it becomes a divider and stays available to a screen reader as the group's
   * name.
   */
  label?: ReactNode;
  className?: string;
}

/**
 * A set of destinations under one heading: the workspace, the account, the
 * things you can do to it. The heading is optional.
 */
function NavRailGroup({ label, className, children, render, ...props }: NavRailGroupProps & RenderProp<'div'>) {
  const slots = navRailVariants();
  const labelId = useId();
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'nav-rail-group',
        role: label ? 'group' : undefined,
        'aria-labelledby': label ? labelId : undefined,
        className: slots.group({ className }),
        children: (
          <>
            {label ? (
              <div data-slot="nav-rail-group-label" className={slots.groupLabel()}>
                <span
                  id={labelId}
                  className={slots.groupLabelText()}
                >
                  {label}
                </span>
                <span aria-hidden="true" className={slots.groupLabelDivider()} />
              </div>
            ) : null}
            {children}
          </>
        ),
      },
      props
    ),
  });
}
NavRailGroup.displayName = 'NavRail.Group';

/** The count in a nav rail: a number beside the label, a dot on the icon when folded. */
function NavRailBadge({ className, children, render, ...props }: NavRailBadgeProps & RenderProp<'span'>) {
  const { collapsed } = useNavRail('NavRail.Badge');
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps(
      {
        'data-slot': 'nav-rail-badge',
        'aria-hidden': collapsed || undefined,
        className: navRailVariants().badge({ className }),
        children,
      },
      props
    ),
  });
}

export interface NavRailBadgeProps extends Omit<ComponentProps<'span'>, 'className'> {
  className?: string;
}

/** Pulls the badges out of an item's children so the label can truncate on its own. */
function splitBadges(children: ReactNode): { label: ReactNode; badges: ReactElement[] } {
  const parts = Children.toArray(children);
  const label: ReactNode[] = [];
  const badges: ReactElement[] = [];
  for (const part of parts) {
    if (isValidElement(part) && part.type === NavRailBadge) badges.push(part);
    else label.push(part);
  }
  return { label: label.length === 1 ? label[0] : label, badges };
}

export interface NavRailItemProps extends Omit<ComponentProps<'a'>, 'href' | 'className' | 'children'> {
  /** Where it goes. With it the row is an anchor; without it, a button. */
  href?: string;
  /** Whether this is the page the reader is on. Sets `aria-current="page"` and lights the pill. */
  active?: boolean;
  /** Whether it can be chosen. A folded disabled row is also skipped by the arrow keys. */
  disabled?: boolean;
  /** The mark before the label: what remains, with the label, when the rail folds. */
  icon?: ReactNode;
  /**
   * What a screen reader calls the row once the label is folded away, and what
   * the folded flyout shows. Taken from text children when they are plain text.
   */
  label?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * One destination: an icon, a label and optionally a `NavRail.Badge`. It is an
 * anchor with `href` and a button without one, so a client-side router can
 * draw links and a one-off action can be a button without a second part.
 */
function NavRailItem({
  href,
  active = false,
  disabled = false,
  icon,
  label,
  className,
  children,
  render,
  ...props
}: NavRailItemProps & RenderProp<'a'>) {
  const { collapsed, variant } = useNavRail('NavRail.Item');
  const slots = navRailVariants();
  const { label: labelChildren, badges } = splitBadges(children);
  const name = label ?? textOf(labelChildren);
  const { onClick, ...rest } = props;

  const stop = (event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return useRender({
    defaultTagName: href === undefined ? 'button' : 'a',
    render,
    props: mergeProps(
      {
        'data-slot': 'nav-rail-item',
        'data-active': active ? '' : undefined,
        'data-solid-active': active && variant === 'solid' ? '' : undefined,
        'data-disabled': disabled ? '' : undefined,
        'aria-current': active ? 'page' : undefined,
        'aria-disabled': disabled || undefined,
        'aria-label': collapsed && name ? name : undefined,
        href,
        type: href === undefined ? 'button' : undefined,
        disabled: href === undefined ? disabled : undefined,
        tabIndex: disabled ? -1 : undefined,
        onClick: disabled ? stop : onClick,
        className: slots.item({ className }),
        children: (
          <>
            {icon ? (
              <span aria-hidden="true" data-slot="nav-rail-icon" className={slots.icon()}>
                {icon}
              </span>
            ) : null}
            <span aria-hidden={collapsed || undefined} data-slot="nav-rail-label" className={slots.label()}>
              {labelChildren}
            </span>
            {badges.length > 0 ? (
              <span data-slot="nav-rail-badges" className={slots.badges()}>
                {badges}
              </span>
            ) : null}
            {collapsed && name ? (
              <span aria-hidden="true" data-slot="nav-rail-tooltip" className={slots.tooltip()}>
                {name}
              </span>
            ) : null}
          </>
        ),
      },
      rest
    ),
  });
}
NavRailItem.displayName = 'NavRail.Item';

export interface NavRailSeparatorProps extends Omit<ComponentProps<'div'>, 'className'> {
  className?: string;
}

/** A rule between groups of destinations that belong apart. */
function NavRailSeparator({ className, render, ...props }: NavRailSeparatorProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'nav-rail-separator',
        role: 'separator',
        'aria-orientation': 'horizontal',
        className: navRailVariants().separator({ className }),
      },
      props
    ),
  });
}
NavRailSeparator.displayName = 'NavRail.Separator';

export interface NavRailFooterProps extends Omit<ComponentProps<'div'>, 'className'> {
  className?: string;
}

/** The bottom of the rail: account, settings, help, held against the floor. */
function NavRailFooter({ className, render, ...props }: NavRailFooterProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'nav-rail-footer', className: navRailVariants().footer({ className }) }, props),
  });
}
NavRailFooter.displayName = 'NavRail.Footer';

export const NavRail = Object.assign(NavRailRoot, {
  Header: NavRailHeader,
  Brand: NavRailBrand,
  Trigger: NavRailTrigger,
  Group: NavRailGroup,
  Item: NavRailItem,
  Badge: NavRailBadge,
  Separator: NavRailSeparator,
  Footer: NavRailFooter,
});

export {
  NavRailHeader,
  NavRailBrand,
  NavRailTrigger,
  NavRailGroup,
  NavRailItem,
  NavRailBadge,
  NavRailSeparator,
  NavRailFooter,
  navRailVariants,
};
