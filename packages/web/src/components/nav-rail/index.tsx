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
 * ## Nested destinations
 *
 * A destination can own a child list with `NavRail.Sub`. The parent stays an
 * ordinary row — a link when it has an `href` — and the list is indented under
 * it, with a disclosure button that says whether it is open. Zoomed in, the
 * child rows are part of the rail's single pill and its arrow-key order; when
 * the child that is active is folded away inside a closed list, the parent
 * holds the pill so the rail still shows a place.
 *
 * Folded, the same list becomes a flyout to the side of the rail, opened by
 * hover or focus and kept out of the rail's clipping so a narrow column can
 * still show names. The parent is not the flyout's trigger in the sense a menu
 * is: the child rows are links in a real `<ul>`, and the button beside the
 * parent is a disclosure with `aria-expanded` and `aria-controls`. One level is
 * supported; a child list is not meant to contain another `NavRail.Sub`, and
 * deeper trees are the caller's own component.
 *
 * The open state is the parent's, not the rail's: `NavRail.Sub` takes
 * `defaultOpen`, or `open` and `onOpenChange` when the app holds it, and it
 * does not change when the rail folds. An open list becomes a pinned flyout
 * folded, and hover opens one without changing that state.
 *
 * ## Two weights
 *
 * `variant="tonal"`, the default, keeps the current place as a quiet primary
 * tint with a short accent bar — the right volume for a rail that is part of
 * the app's chrome and is on screen the whole time. `variant="solid"` fills the
 * row with the primary colour and sets its text in `primary-foreground`, the
 * same weight Tabs, Toolbar and Inspector give their chosen item, for an app
 * that wants the rail to speak as loudly as the rest of the collection. The
 * choice applies folded as well: the icon square, the count dot and the active
 * child in a flyout follow it.
 *
 * ## The keyboard
 *
 * Every row is an ordinary tab stop, so Tab walks the rail the way it walks
 * the rest of the page. Once focus is on a row, Up and Down move it, wrapping
 * at the ends and stepping over disabled rows; Home and End go to the first and
 * last visible row, skipping children hidden in a closed list. On a parent,
 * Right opens a closed list or steps into an open one, Left closes it, and
 * Escape closes it wherever focus is inside it. `NavRail.Trigger` is a button
 * and says whether the rail is open with `aria-expanded`.
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
import { indicatorBox, isRovingKey, railWidth, rovingRow, activeRowIndex, subKeyAction, textOf, type RailRowState } from './rail';

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
      'data-[holding]:text-foreground data-[holding]:hover:bg-foreground/[0.03]',
      'data-solid-active:text-primary-foreground! data-solid-active:hover:bg-transparent',
      'data-[holding]:data-solid-active:text-primary-foreground!',
      'data-disabled:pointer-events-none data-disabled:opacity-40',
      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
      'data-[icons-only]:justify-center data-[icons-only]:gap-0 data-[icons-only]:px-0',
      'data-[nested]:h-9 data-[nested]:text-[13px]',
      // A child in a flyout has no pill behind it, so it carries its own
      // active weight: the same tint, ring and solid fill the rail gives the
      // row it draws the pill over.
      'data-[flyout]:data-active:bg-primary/[0.12] data-[flyout]:data-active:ring-1 data-[flyout]:data-active:ring-primary/20 data-[flyout]:data-active:ring-inset',
      'data-[flyout]:data-solid-active:bg-primary data-[flyout]:data-solid-active:ring-0',
    ],
    icon: [
      'flex size-5 shrink-0 items-center justify-center text-muted-foreground',
      'transition-colors duration-150 group-hover/item:text-foreground group-data-[active]/item:text-primary',
      'group-data-[solid-active]/item:text-primary-foreground!',
      'group-data-[nested]/item:[&_svg]:size-4',
      // The parent of the active child is tinted rather than pilled: it is a
      // sign that the current page is under it, not a second current place.
      'group-data-[child-active]/item:text-primary',
      '[&_svg]:pointer-events-none [&_svg]:size-[18px]',
    ],
    label: [
      'min-w-0 max-w-full flex-1 truncate whitespace-nowrap',
      `transition-[opacity,translate,max-width] duration-300 ${EASE} motion-reduce:transition-none`,
      'group-data-[icons-only]/item:max-w-0 group-data-[icons-only]/item:-translate-x-1 group-data-[icons-only]/item:pointer-events-none group-data-[icons-only]/item:opacity-0',
    ],
    badges: [
      'pointer-events-none ms-auto flex shrink-0 items-center gap-1',
      'group-data-[icons-only]/item:absolute group-data-[icons-only]/item:end-0.5 group-data-[icons-only]/item:top-0.5 group-data-[icons-only]/item:ms-0',
      'group-data-[icons-only]/item:[&>*+*]:hidden',
    ],
    badge: [
      'inline-flex h-5 min-w-5 shrink-0 items-center justify-center overflow-hidden rounded-full px-1.5',
      'bg-foreground/[0.07] text-[11px] font-medium text-muted-foreground tabular-nums',
      'transition-colors duration-150 group-data-[active]/item:bg-primary/15 group-data-[active]/item:text-foreground',
      'group-data-[solid-active]/item:bg-primary-foreground/20! group-data-[solid-active]/item:text-primary-foreground!',
      'group-data-[icons-only]/item:group-data-[solid-active]/item:bg-primary-foreground!',
      // Folded, the count is a dot: the label is gone and a number would have
      // nowhere to sit, but the fact that something is waiting still reads.
      'group-data-[icons-only]/item:size-2 group-data-[icons-only]/item:min-w-0 group-data-[icons-only]/item:bg-primary group-data-[icons-only]/item:p-0 group-data-[icons-only]/item:text-[0px] group-data-[icons-only]/item:text-transparent',
    ],
    tooltip: [
      'pointer-events-none absolute start-[calc(100%+0.5rem)] top-1/2 z-50 origin-left -translate-y-1/2 scale-95',
      'rounded-md bg-foreground px-2 py-1 text-xs font-medium whitespace-nowrap text-background opacity-0 shadow-md',
      'transition-[opacity,scale] duration-150 group-hover/item:scale-100 group-hover/item:opacity-100',
      'group-focus-visible/item:scale-100 group-focus-visible/item:opacity-100 motion-reduce:transition-none',
    ],
    // A parent and its child list. The wrapper is what the flyout is positioned
    // against, and what hover and focus are read from.
    branch: 'group/branch relative flex w-full flex-col',
    toggle: [
      'absolute end-1 top-5 z-20 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground/70 outline-none',
      'transition-[opacity,background-color,color,scale] duration-150 hover:bg-foreground/[0.06] hover:text-foreground',
      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:scale-95 motion-reduce:transition-none',
      // Folded, the whole row is an icon square: the disclosure becomes a
      // small corner caret that appears with the row or on focus, so it does
      // not fight the count dot for the same corner.
      'group-data-[collapsed]/nav-rail:bottom-0.5 group-data-[collapsed]/nav-rail:end-0.5 group-data-[collapsed]/nav-rail:top-auto group-data-[collapsed]/nav-rail:size-4 group-data-[collapsed]/nav-rail:translate-y-0 group-data-[collapsed]/nav-rail:opacity-0',
      'group-data-[collapsed]/nav-rail:group-hover/branch:opacity-100 group-data-[collapsed]/nav-rail:focus-visible:opacity-100 group-data-[collapsed]/nav-rail:data-[open]:opacity-100',
      'group-data-[solid-active]/branch:text-primary-foreground/80',
    ],
    chevron: `size-3.5 shrink-0 opacity-70 transition-transform duration-200 ${EASE} motion-reduce:transition-none`,
    descendantDot: 'size-1.5 shrink-0 rounded-full bg-primary group-data-[icons-only]/item:hidden',
    // Inline, the list unfolds by grid rows so its height travels rather than
    // popping. Folded, the same element becomes the flyout beside the rail,
    // with the tooltip's fade and scale.
    sub: [
      'grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-200',
      `${EASE} motion-reduce:transition-none`,
      'data-[open]:grid-rows-[1fr] data-[open]:opacity-100',
      'group-data-[collapsed]/nav-rail:pointer-events-none group-data-[collapsed]/nav-rail:absolute group-data-[collapsed]/nav-rail:start-full group-data-[collapsed]/nav-rail:top-0 group-data-[collapsed]/nav-rail:z-50 group-data-[collapsed]/nav-rail:grid-rows-[1fr] group-data-[collapsed]/nav-rail:origin-left group-data-[collapsed]/nav-rail:scale-95 group-data-[collapsed]/nav-rail:ps-2 group-data-[collapsed]/nav-rail:opacity-0 group-data-[collapsed]/nav-rail:transition-[opacity,scale] group-data-[collapsed]/nav-rail:duration-150',
      'group-data-[collapsed]/nav-rail:data-[visible]:pointer-events-auto group-data-[collapsed]/nav-rail:data-[visible]:scale-100 group-data-[collapsed]/nav-rail:data-[visible]:opacity-100',
    ],
    subPanel: [
      'min-h-0 overflow-hidden',
      // The flyout's own surface, kept on the inner element so the outer one
      // can stay the transition and arrow-key container.
      'group-data-[collapsed]/nav-rail:min-w-52 group-data-[collapsed]/nav-rail:overflow-visible group-data-[collapsed]/nav-rail:rounded-xl group-data-[collapsed]/nav-rail:border group-data-[collapsed]/nav-rail:border-border group-data-[collapsed]/nav-rail:bg-popover group-data-[collapsed]/nav-rail:p-1 group-data-[collapsed]/nav-rail:text-popover-foreground group-data-[collapsed]/nav-rail:shadow-lg',
    ],
    subList: [
      'flex flex-col gap-0.5',
      // The indent and the rule are what make a child read as subordinate
      // rather than as a row that happens to be smaller.
      'ms-2.5 border-s border-border/60 ps-2',
      'group-data-[collapsed]/nav-rail:ms-0 group-data-[collapsed]/nav-rail:border-s-0 group-data-[collapsed]/nav-rail:ps-0',
    ],
    subEntry: 'flex w-full min-w-0',
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

interface NavRailSubContextValue {
  /** Whether the child list is logically open. */
  open: boolean;
  /** Whether it is drawn: open inline, or showing as a flyout. */
  visible: boolean;
  /** The id of the `<ul>`, for the disclosure's `aria-controls`. */
  listId: string;
  /** The parent's accessible name, used to name the list. */
  name?: string;
  /** Whether the rail is folded, so the children live in a flyout. */
  folded: boolean;
  /** Opens or closes the list from the parent row. */
  toggle(): void;
}

const NavRailSubContext = createContext<NavRailSubContextValue | null>(null);

/** True for an item drawn inside a child list, so it is indented and quieter. */
const NavRailNestedContext = createContext(false);

/** True for an item drawn inside a folded flyout, where it keeps its label. */
const NavRailFlyoutContext = createContext(false);

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Sets `inert` on an element while it is out of sight.
 *
 * Passed as a prop, a boolean would be written differently by different React
 * versions; set on the node, it is the attribute the browser reads.
 */
function useInert<T extends HTMLElement>(inert: boolean) {
  const ref = useRef<T>(null);
  useIsomorphicLayoutEffect(() => {
    ref.current?.toggleAttribute('inert', inert);
  }, [inert]);
  return ref;
}

/**
 * Whether a `NavRail.Sub`'s direct children include the active destination.
 *
 * Only the elements the caller passes are read: a child drawn by a wrapper
 * component cannot be seen here, and the parent simply goes without its
 * secondary marker. One level is the supported shape.
 */
function subHasActive(sub: ReactElement): boolean {
  const children = (sub.props as { children?: ReactNode }).children;
  return Children.toArray(children).some(
    (child) => isValidElement(child) && (child.props as { active?: boolean }).active === true
  );
}

/**
 * Reads a row's state for focus movement and the pill.
 *
 * A child in a folded flyout is not part of the rail's own order: the flyout
 * has its own reading order when focus is inside it, and the pill stays on the
 * parent in the rail.
 */
function railRowState(row: HTMLElement, collapsed: boolean): RailRowState {
  const branch = row.closest<HTMLElement>('[data-slot="nav-rail-branch"]');
  const owns = branch !== null && row.parentElement === branch;
  const sub = owns ? branch.querySelector<HTMLElement>(':scope > [data-slot="nav-rail-sub"]') : null;
  const container = row.closest<HTMLElement>('[data-slot="nav-rail-sub"]');
  const hidden = container ? collapsed || !container.hasAttribute('data-open') : false;
  return {
    active: row.hasAttribute('data-active'),
    disabled: row.getAttribute('aria-disabled') === 'true' || row.hasAttribute('disabled'),
    hidden,
    branch: owns,
    expanded: sub?.hasAttribute('data-open') ?? false,
    childActive: row.hasAttribute('data-child-active'),
    nested: container !== null,
  };
}

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
  // Written after commit, so a render React throws away never leaves its
  // values behind for the next click to read.
  useIsomorphicLayoutEffect(() => {
    live.current = { collapsed, controlled: collapsedProp !== undefined, onCollapsedChange };
  });

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
    const place = () => {
      if (!live) return;
      const rows = [...box.querySelectorAll<HTMLElement>('[data-slot="nav-rail-item"]')];
      const index = activeRowIndex(rows.map((row) => railRowState(row, collapsed)));
      const active = index === null ? null : rows[index];
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
      box
        .querySelectorAll<HTMLElement>('[data-slot="nav-rail-item"]')
        .forEach((row) => observer.observe(row));
      // A child list opening changes the height of the rows below it without
      // changing any row's own box, so the list itself is measured too.
      box
        .querySelectorAll<HTMLElement>('[data-slot="nav-rail-sub"]')
        .forEach((sub) => observer.observe(sub));
    };

    observe();
    place();

    // Which row is active, and whether a child list is open, are attributes on
    // children rather than props of the rail, so a mutation is what tells the
    // pill to follow. Adding or removing rows is observed for the same reason.
    const mutations = new MutationObserver(() => {
      observe();
      place();
    });
    mutations.observe(box, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-active', 'data-open'],
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
  }, [collapsed]);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented) return;
    // A chord belongs to the browser or the system: Cmd+ArrowUp, Ctrl+Home.
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const host = root.current;
    if (!host) return;

    const rows = [...host.querySelectorAll<HTMLElement>('[data-slot="nav-rail-item"]')];
    const toggle = target.closest<HTMLElement>('[data-slot="nav-rail-item-toggle"]');
    // The disclosure sits beside the row rather than inside it, since a link
    // cannot contain a button. Keyboard actions on it belong to the row it
    // belongs to.
    const row =
      target.closest<HTMLElement>('[data-slot="nav-rail-item"]') ??
      (toggle
        ? (toggle
            .closest<HTMLElement>('[data-slot="nav-rail-branch"]')
            ?.querySelector<HTMLElement>(':scope > [data-slot="nav-rail-item"]') ?? null)
        : null);
    if (!row) return;
    const current = rows.indexOf(row);
    if (current < 0) return;

    const states = rows.map((each) => railRowState(each, collapsed));
    const branch = row.closest<HTMLElement>('[data-slot="nav-rail-branch"]');
    const owns = branch !== null && row.parentElement === branch;
    const sub = owns ? branch.querySelector<HTMLElement>(':scope > [data-slot="nav-rail-sub"]') : null;

    // Right, Left and Escape act on the child list before the arrow keys do.
    // The child list opens towards the inline end, which is the left in a
    // right-to-left page, so the keys that open and close it swap with it.
    const rtl = getComputedStyle(host).direction === 'rtl';
    const key =
      rtl && event.key === 'ArrowLeft'
        ? 'ArrowRight'
        : rtl && event.key === 'ArrowRight'
          ? 'ArrowLeft'
          : event.key;
    const action = subKeyAction(key, states[current]!);
    if (action) {
      event.preventDefault();
      if (action === 'open') {
        branch?.dispatchEvent(new Event('nav-rail-sub-open'));
        // The list renders immediately, but its `inert` comes off in the
        // layout effect that follows, so focus waits one frame.
        window.requestAnimationFrame(() => {
          sub?.querySelector<HTMLElement>('[data-slot="nav-rail-item"]')?.focus();
        });
      } else if (action === 'enter') {
        sub?.querySelector<HTMLElement>('[data-slot="nav-rail-item"]')?.focus();
      } else {
        // A child closes the list it sits in and puts focus back on the row
        // that owns it; a parent closes its own list and keeps focus.
        const container = states[current]!.nested
          ? row.closest<HTMLElement>('[data-slot="nav-rail-sub"]')
          : null;
        const owner = container ? container.parentElement : branch;
        owner?.dispatchEvent(new Event('nav-rail-sub-close'));
        if (container) {
          owner?.querySelector<HTMLElement>(':scope > [data-slot="nav-rail-item"]')?.focus();
        }
      }
      return;
    }

    if (!isRovingKey(event.key)) return;

    // Folded, a child list is a flyout with its own reading order: focus inside
    // one moves within it, and focus on the rail moves over the top-level rows.
    const inside = row.closest<HTMLElement>('[data-slot="nav-rail-sub"]');
    const scoped =
      collapsed && inside
        ? states.map((state, index) => ({
            ...state,
            hidden: rows[index]!.closest('[data-slot="nav-rail-sub"]') !== inside,
          }))
        : states;
    const next = rovingRow(event.key, current, scoped);
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
        // Folded, the name is only in the label, and a plain `div` may not
        // carry one. As an image it can, and its hidden children add nothing.
        role: collapsed && name && href === undefined ? 'img' : undefined,
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

/**
 * Pulls the badges and the child list out of an item's children.
 *
 * A badge sits beside the label and a `NavRail.Sub` becomes the row's own
 * child list; everything else is the label, which is free to truncate.
 */
function splitItemChildren(children: ReactNode): {
  label: ReactNode;
  badges: ReactElement[];
  sub?: ReactElement;
} {
  const parts = Children.toArray(children);
  const label: ReactNode[] = [];
  const badges: ReactElement[] = [];
  let sub: ReactElement | undefined;
  for (const part of parts) {
    if (isValidElement(part) && part.type === NavRailBadge) badges.push(part);
    else if (isValidElement(part) && part.type === NavRailSub) sub ??= part;
    else label.push(part);
  }
  return { label: label.length === 1 ? label[0] : label, badges, sub };
}

export interface NavRailItemProps extends Omit<ComponentProps<'a'>, 'href' | 'className' | 'children'> {
  /** Where it goes. With it the row is an anchor; without it, a button. */
  href?: string;
  /** Whether this is the page the reader is on. Sets `aria-current="page"` and lights the pill. */
  active?: boolean;
  /** Draws the row unavailable: it cannot be chosen, and the arrow keys step over it. */
  disabled?: boolean;
  /** The mark before the label: what remains, with the label, when the rail folds. */
  icon?: ReactNode;
  /**
   * What a screen reader calls the row once the label is folded away, and what
   * the folded tooltip shows. Taken from text children when they are plain text.
   */
  label?: string;
  className?: string;
  children?: ReactNode;
}

/** A small chevron for the row that owns a child list. */
function NavRailChevron({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={[className, open ? 'rotate-90' : undefined].filter(Boolean).join(' ')}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/**
 * One destination: an icon, a label and optionally a `NavRail.Badge` or a
 * `NavRail.Sub` child list. It is an anchor with `href` and a button without
 * one, so a client-side router can draw links and a one-off action can be a
 * button without a second part.
 *
 * With a child list and an `href`, the row stays a link and a separate
 * disclosure button beside it carries `aria-expanded` and `aria-controls`.
 * Without an `href`, the row itself is the disclosure: pressing it opens the
 * list rather than navigating.
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
  const nested = useContext(NavRailNestedContext);
  const inFlyout = useContext(NavRailFlyoutContext);
  // A child list folded into a flyout is back on a wide surface: the children
  // keep their labels even though the rail itself is a column of icons.
  const iconsOnly = collapsed && !inFlyout;
  const { label: labelChildren, badges, sub } = splitItemChildren(children);
  const name = label ?? textOf(labelChildren);
  // Folded, a badge is a dot hidden from assistive technology, so its count
  // joins the row's name instead of going unannounced.
  const badgeText = badges
    .map((badge) => (isValidElement(badge) ? textOf((badge.props as { children?: ReactNode }).children) : undefined))
    .filter((text): text is string => text !== undefined)
    .join(', ');
  const foldedName = name && badgeText ? `${name}, ${badgeText}` : name;
  const { onClick, ...rest } = props;

  const branch = sub !== undefined;
  const rowIsToggle = branch && href === undefined;
  const activeDescendant = sub !== undefined && subHasActive(sub);

  const listId = useId();
  const subProps = sub ? (sub.props as NavRailSubProps) : undefined;
  const [innerOpen, setInnerOpen] = useState(subProps?.defaultOpen ?? false);
  const open = subProps?.open ?? innerOpen;
  // The active destination may be a child that is not drawn: a closed list, or
  // a folded flyout. The parent then holds the pill so the rail still shows a
  // place, and takes the same weight as if it were the active row.
  const holdsPill = activeDescendant && (collapsed || !open);
  const solidActive = variant === 'solid' && (active || holdsPill);
  // Folded, hover and focus show the flyout without changing the open state;
  // Escape dismisses it until focus or the pointer leaves the parent.
  const [dismissed, setDismissed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  const liveSub = useRef({
    open,
    controlled: subProps?.open !== undefined,
    onOpenChange: subProps?.onOpenChange,
  });
  liveSub.current = {
    open,
    controlled: subProps?.open !== undefined,
    onOpenChange: subProps?.onOpenChange,
  };

  const setOpen = useCallback((next: boolean) => {
    if (!liveSub.current.controlled) setInnerOpen(next);
    if (next !== liveSub.current.open) liveSub.current.onOpenChange?.(next);
    if (next) setDismissed(false);
  }, []);
  const toggleSub = useCallback(() => setOpen(!liveSub.current.open), [setOpen]);

  const visible = open || (collapsed && !dismissed && (hovered || focusWithin));
  const subContext = useMemo<NavRailSubContextValue | null>(
    () =>
      branch
        ? { open, visible, listId, name, folded: collapsed, toggle: toggleSub }
        : null,
    [branch, open, visible, listId, name, collapsed, toggleSub]
  );

  // The rail's arrow keys ask the child list to open or close through an event
  // on the branch, so the state stays here where the disclosure button is.
  useEffect(() => {
    const node = container.current;
    if (!node || !branch) return;
    const openSub = () => {
      setDismissed(false);
      setOpen(true);
    };
    const closeSub = () => {
      setOpen(false);
      setDismissed(true);
    };
    node.addEventListener('nav-rail-sub-open', openSub);
    node.addEventListener('nav-rail-sub-close', closeSub);
    return () => {
      node.removeEventListener('nav-rail-sub-open', openSub);
      node.removeEventListener('nav-rail-sub-close', closeSub);
    };
  }, [branch, setOpen]);

  // A pinned flyout is a transient surface: a press anywhere else closes it.
  useEffect(() => {
    if (!branch || !collapsed || !open) return;
    const onPointerDown = (event: PointerEvent) => {
      const node = container.current;
      if (!node) return;
      if (event.target instanceof Node && node.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [branch, collapsed, open, setOpen]);

  const stop = (event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const rowClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (disabled) {
      stop(event);
      return;
    }
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (rowIsToggle) {
      event.preventDefault();
      toggleSub();
    }
  };

  const row = useRender({
    defaultTagName: href === undefined ? 'button' : 'a',
    render,
    props: mergeProps(
      {
        'data-slot': 'nav-rail-item',
        'data-active': active ? '' : undefined,
        'data-solid-active': solidActive ? '' : undefined,
        'data-holding': holdsPill ? '' : undefined,
        'data-disabled': disabled ? '' : undefined,
        'data-icons-only': iconsOnly ? '' : undefined,
        'data-nested': nested ? '' : undefined,
        'data-flyout': inFlyout ? '' : undefined,
        'data-branch': branch ? '' : undefined,
        'data-child-active': activeDescendant ? '' : undefined,
        'aria-current': active ? 'page' : undefined,
        'aria-disabled': disabled || undefined,
        'aria-label': iconsOnly && foldedName ? foldedName : undefined,
        'aria-expanded': rowIsToggle ? open : undefined,
        'aria-controls': rowIsToggle ? listId : undefined,
        href,
        type: href === undefined ? 'button' : undefined,
        disabled: href === undefined ? disabled : undefined,
        tabIndex: disabled ? -1 : undefined,
        onClick: disabled ? stop : branch ? rowClick : onClick,
        className: slots.item({
          className: [branch && !rowIsToggle ? 'pe-9' : undefined, className],
        }),
        children: (
          <>
            {icon ? (
              <span aria-hidden="true" data-slot="nav-rail-icon" className={slots.icon()}>
                {icon}
              </span>
            ) : null}
            {/* A parent whose child is active but has no icon needs a marker of
                its own; with an icon the tint is enough. */}
            {activeDescendant && !icon ? (
              <span aria-hidden="true" data-slot="nav-rail-active-descendant" className={slots.descendantDot()} />
            ) : null}
            <span aria-hidden={iconsOnly || undefined} data-slot="nav-rail-label" className={slots.label()}>
              {labelChildren}
            </span>
            {badges.length > 0 ? (
              <span data-slot="nav-rail-badges" className={slots.badges()}>
                {badges}
              </span>
            ) : null}
            {rowIsToggle ? <NavRailChevron open={open} className={slots.chevron()} /> : null}
            {iconsOnly && name && !branch ? (
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

  if (!branch) return row;

  return (
    <div
      ref={container}
      data-slot="nav-rail-branch"
      data-solid-active={solidActive ? '' : undefined}
      className={slots.branch()}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false);
        setDismissed(false);
      }}
      onFocus={() => setFocusWithin(true)}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) return;
        setFocusWithin(false);
        setDismissed(false);
      }}
    >
      {row}
      {rowIsToggle ? null : (
        <button
          type="button"
          data-slot="nav-rail-item-toggle"
          data-open={open ? '' : undefined}
          aria-expanded={open}
          aria-controls={listId}
          aria-label={name ? `${name} submenu` : 'Submenu'}
          tabIndex={disabled ? -1 : undefined}
          disabled={disabled}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleSub();
          }}
          className={slots.toggle()}
        >
          <NavRailChevron open={open} className={slots.chevron()} />
        </button>
      )}
      {sub ? <NavRailSubContext.Provider value={subContext}>{sub}</NavRailSubContext.Provider> : null}
    </div>
  );
}
NavRailItem.displayName = 'NavRail.Item';

export interface NavRailSubProps extends Omit<ComponentProps<'div'>, 'className' | 'children'> {
  /**
   * Whether the child list is open. Pass it with `onOpenChange` to hold the
   * state yourself; it is separate from the rail's fold.
   */
  open?: boolean;
  /** Whether it starts open when the caller does not hold it. Default `false`. */
  defaultOpen?: boolean;
  /** Called when the parent's disclosure asks to open or close the list. */
  onOpenChange?: (open: boolean) => void;
  /**
   * What a screen reader calls the child list. Defaults to the parent row's
   * name, which is usually the right thing to hear.
   */
  label?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * The child list under a destination: one level of nesting, indented inline
 * when the rail is open and shown as a flyout beside it when the rail is
 * folded. The children are ordinary `NavRail.Item`s, so they carry their own
 * `href`, `active` and icons.
 *
 * The list is a real `<ul>` of links, not a menu: these are destinations, and
 * the parent's disclosure button is what says whether it is open.
 */
function NavRailSub({
  open: _open,
  defaultOpen: _defaultOpen,
  onOpenChange: _onOpenChange,
  label,
  className,
  children,
  render,
  ...props
}: NavRailSubProps & RenderProp<'div'>) {
  const sub = useContext(NavRailSubContext);
  const slots = navRailVariants();
  // Only the parent row reads `open`, `defaultOpen` and `onOpenChange`: it owns
  // the disclosure state, so they are taken here to keep them off the DOM.
  void _open;
  void _defaultOpen;
  void _onOpenChange;
  // Out of sight, the list leaves the tab order and the accessibility tree.
  const ref = useInert<HTMLDivElement>(!sub?.visible);
  if (!sub) throw new Error('NavRail.Sub must be used inside a NavRail.Item.');

  const entries = Children.toArray(children).map((child, index) => (
    <li key={index} data-slot="nav-rail-sub-entry" className={slots.subEntry()}>
      {child}
    </li>
  ));

  return useRender({
    defaultTagName: 'div',
    ref,
    render,
    props: mergeProps(
      {
        'data-slot': 'nav-rail-sub',
        'data-open': sub.open ? '' : undefined,
        'data-visible': sub.visible ? '' : undefined,
        'data-layout': sub.folded ? 'flyout' : 'inline',
        'aria-hidden': sub.visible ? undefined : true,
        className: slots.sub({ className }),
        children: (
          <div data-slot="nav-rail-sub-panel" className={slots.subPanel()}>
            <ul
              id={sub.listId}
              data-slot="nav-rail-sub-list"
              aria-label={label ?? sub.name}
              className={slots.subList()}
            >
              <NavRailNestedContext.Provider value>
                <NavRailFlyoutContext.Provider value={sub.folded}>{entries}</NavRailFlyoutContext.Provider>
              </NavRailNestedContext.Provider>
            </ul>
          </div>
        ),
      },
      props
    ),
  });
}
NavRailSub.displayName = 'NavRail.Sub';

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
  Sub: NavRailSub,
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
  NavRailSub,
  NavRailBadge,
  NavRailSeparator,
  NavRailFooter,
  navRailVariants,
};
