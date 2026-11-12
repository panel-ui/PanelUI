'use client';

/**
 * TableOfContents — the sections of a long page, as a quiet rail that says
 * which one you are reading.
 *
 * ```tsx
 * <TableOfContents defaultValue="install" offset={80}>
 *   <TableOfContents.Title>On this page</TableOfContents.Title>
 *   <TableOfContents.List>
 *     <TableOfContents.Item value="install">
 *       <TableOfContents.Link href="#install">Install</TableOfContents.Link>
 *     </TableOfContents.Item>
 *     <TableOfContents.Item value="configure" depth={1}>
 *       <TableOfContents.Link href="#configure">Configure</TableOfContents.Link>
 *     </TableOfContents.Item>
 *   </TableOfContents.List>
 * </TableOfContents>
 * ```
 *
 * ## One mark, and it moves
 *
 * The list sits against a hairline the height of the page's sections, and one
 * short segment in the primary colour travels to the section being read. The
 * links themselves stay muted until they are current, so the rail is what the
 * eye catches and the words are what it finds when it arrives.
 *
 * ## Or a line that follows the outline
 *
 * `variant="contour"` draws the rail as a path that steps in with each level
 * and bends back out, so the outline's shape is in the line itself. Instead of
 * one segment it lights every section on screen, from the one at the reading
 * line to the last heading in view, with a dot on the end it is moving
 * towards. It suits a long page with deep nesting, where a reader wants to see
 * how much of the outline the screen is showing.
 *
 * ## It knows where you are
 *
 * With no `value` given, the component watches the elements its links point at
 * with an `IntersectionObserver` and keeps the active section at the reading
 * line — the top of the viewport, `offset` pixels down. Give it a `root` and it
 * watches inside that scroller instead, for a panel that scrolls on its own.
 * Pass `value` and the scroll spy stands aside: the caller decides.
 *
 * ## The links are ordinary links
 *
 * Every link is an anchor with a real `href`, so the browser's own scroll,
 * history and middle-click behaviour all work, and a router's `Link` can take
 * its place through `render`. The active one carries `aria-current="location"`.
 * The rail and its moving segment are drawn in pseudo-elements, so nothing
 * decorative is announced.
 */
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent as ReactMouseEvent,
  type Ref,
  type RefObject,
} from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';
import {
  contourPath,
  contourWidth,
  hashTarget,
  sectionAt,
  sectionsInView,
  type ContourRow,
  type TocSection,
} from './spy';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

/** One curve for the segment, so a jump reads as one movement rather than two. */
const EASE = 'ease-[cubic-bezier(0.3,0.7,0.1,1)]';
/** How far each step of `depth` indents a row. */
const DEPTH_STEP = 12;
/** Where the first level starts, clear of the rail. */
const INDENT = 16;
/** How far the contour line steps in for each level. */
const CONTOUR_STEP = 10;
/** Half the height of a contour bend, centred on the boundary between rows. */
const CONTOUR_BEND = 5;

const tableOfContentsVariants = tv({
  slots: {
    root: 'flex min-w-0 flex-col gap-2',
    title: 'text-xs font-medium tracking-wider text-muted-foreground uppercase',
    list: [
      'relative m-0 flex list-none flex-col p-0',
      // The rail is the height of the list; the segment is the height of the
      // current row. Both are pseudo-elements, so the `<ol>` keeps only list
      // items as children and nothing decorative reaches a screen reader.
      "before:pointer-events-none before:absolute before:inset-y-0 before:start-0 before:w-px before:bg-border before:content-['']",
      "after:pointer-events-none after:absolute after:start-0 after:w-0.5 after:rounded-full after:bg-primary after:content-['']",
      'after:top-(--toc-indicator-top,0px) after:h-(--toc-indicator-height,0px)',
      // Hidden until it has been measured, so it never slides in from the
      // top of the list on first paint. Once placed, only its position and
      // height animate; appearing is instant.
      'after:opacity-0 data-ready:after:opacity-100',
      `data-ready:after:transition-[top,height] data-ready:after:duration-200 ${EASE} motion-reduce:after:transition-none`,
    ],
    item: 'min-w-0',
    link: [
      'block rounded-sm py-1 text-sm text-muted-foreground outline-none',
      'transition-colors duration-150 hover:text-foreground motion-reduce:transition-none',
      'focus-visible:ring-2 focus-visible:ring-ring',
    ],
    // An identifier in a row, such as a prop name. It takes the row's colour,
    // so it lights with the rest of the row.
    code: 'rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs',
    contour: 'pointer-events-none absolute inset-y-0 start-0 overflow-visible rtl:-scale-x-100',
    contourLit: [
      'pointer-events-none absolute inset-y-0 start-0 overflow-visible rtl:-scale-x-100',
      // Cut down to the lit stretch. Only the cut moves, so the path itself is
      // never redrawn while the reader scrolls.
      '[clip-path:inset(var(--toc-lit-top,0px)_-4px_calc(100%_-_var(--toc-lit-bottom,0px))_-4px)]',
      'opacity-0 group-data-ready/toc:opacity-100',
      `group-data-ready/toc:transition-[clip-path] group-data-ready/toc:duration-300 ${EASE} motion-reduce:transition-none`,
    ],
    contourDot: [
      'pointer-events-none absolute start-0 top-0 size-[5px] rounded-full bg-foreground',
      'translate-x-(--toc-dot-x,0px) translate-y-(--toc-dot-y,0px) rtl:-translate-x-(--toc-dot-x,0px)',
      'opacity-0 group-data-ready/toc:opacity-100',
      `group-data-ready/toc:transition-transform group-data-ready/toc:duration-300 ${EASE} motion-reduce:transition-none`,
    ],
  },
  variants: {
    variant: {
      rail: {
        link: 'data-active:font-medium data-active:text-foreground',
      },
      contour: {
        // The line is the decoration here, so the list draws no rail of its
        // own and every section in view reads in the foreground colour.
        list: 'group/toc before:hidden after:hidden',
        link: 'data-lit:text-foreground',
      },
    },
  },
  defaultVariants: { variant: 'rail' },
});

/** How the list marks where the reader is. */
export type TableOfContentsVariant = 'rail' | 'contour';

interface TableOfContentsContextValue {
  /** The section being read, or `undefined` while nothing is active. */
  value: string | undefined;
  /** Makes a section active, from a link press or from the scroll spy. */
  select: (value: string) => void;
  /**
   * Scrolls the root to a section's element and holds the mark on it until
   * the scroll ends. Returns `false` when there is no root to scroll, so the
   * browser's own jump is left to happen.
   */
  jump: (id: string, value: string, moveFocus: boolean) => boolean;
  /** How the list marks where the reader is. */
  variant: TableOfContentsVariant;
  /**
   * Every section on screen, in page order, starting with the active one.
   * Only the contour lights more than one.
   */
  lit: readonly string[];
}

const TableOfContentsContext = createContext<TableOfContentsContextValue | null>(null);

interface TableOfContentsItemContextValue {
  /** The section this row stands for. */
  value: string;
  /** How far the row is indented. */
  depth: number;
}

const TableOfContentsItemContext = createContext<TableOfContentsItemContextValue | null>(null);

function useTableOfContents(component: string): TableOfContentsContextValue {
  const context = useContext(TableOfContentsContext);
  if (!context) {
    throw new Error(`${component} must be used within a <TableOfContents>`);
  }
  return context;
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * One ref callback that sets every ref given, skipping the missing ones.
 *
 * A callback ref may return a cleanup (React 19); each is collected and
 * returned so React can run it on detach instead of it being dropped.
 */
function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): (node: T | null) => (() => void) | void {
  return (node) => {
    const cleanups: (() => void)[] = [];
    const cleanupOwners = new Set<unknown>();
    for (const ref of refs) {
      if (typeof ref === 'function') {
        const cleanup = ref(node);
        if (typeof cleanup === 'function') {
          cleanups.push(cleanup);
          cleanupOwners.add(ref);
        }
      } else if (ref) {
        (ref as { current: T | null }).current = node;
      }
    }
    if (cleanups.length === 0) return undefined;
    // Once a cleanup is returned React calls it instead of calling the ref
    // again with null, so the detach every other ref expects happens here.
    return () => {
      for (const cleanup of cleanups) cleanup();
      for (const ref of refs) {
        if (typeof ref === 'function') {
          if (!cleanupOwners.has(ref)) ref(null);
        } else if (ref) {
          (ref as { current: T | null }).current = null;
        }
      }
    };
  };
}

export interface TableOfContentsProps
  extends Omit<ComponentProps<'nav'>, 'className' | 'defaultValue' | 'onChange'> {
  /** The active section, when the caller holds it. The scroll spy stands aside. */
  value?: string;
  /** The section active at first, when the caller does not hold it. */
  defaultValue?: string;
  /** Called with a section's `value` when a link is pressed or the spy moves on. */
  onValueChange?: (value: string) => void;
  /**
   * Watch the page and keep the active section at the reading line. On by
   * default when uncontrolled; pass `false` to leave the active section alone,
   * or `true` with `value` to report scroll position without holding state.
   */
  observe?: boolean;
  /**
   * How far below the top of the scroll viewport counts as the reading line,
   * in pixels. Raise it to clear a sticky header.
   */
  offset?: number;
  /**
   * The element that scrolls, when the page is not what scrolls. A section
   * inside a panel needs the panel here; the viewport is the default.
   */
  root?: HTMLElement | null | RefObject<HTMLElement | null>;
  /**
   * How the list marks where the reader is. `rail` is a hairline with one
   * segment on the active section. `contour` is a line that steps in and out
   * with each level and lights every section on screen. Default `rail`.
   */
  variant?: TableOfContentsVariant;
  /** Classes for the `<nav>`. */
  className?: string;
}

/**
 * Holds the active section and, when uncontrolled, keeps it in step with the
 * page. Its `<nav>` is the landmark a screen reader jumps to.
 */
const TableOfContentsRoot = forwardRef<HTMLElement, Omit<TableOfContentsProps, 'ref'>>(function TableOfContentsRoot({
  value: valueProp,
  defaultValue,
  onValueChange,
  observe,
  offset = 16,
  root,
  variant = 'rail',
  className,
  'aria-label': ariaLabel = 'Table of contents',
  children,
  ...props
}: Omit<TableOfContentsProps, 'ref'>, forwardedRef) {
  const [innerValue, setInnerValue] = useState<string | undefined>(defaultValue);
  const controlled = valueProp !== undefined;
  const value = controlled ? valueProp : innerValue;

  // The spy and a press read the value as it is now, not as it was when the
  // effect that owns them was created.
  const currentValue = useRef(value);
  const live = useRef({ controlled, onValueChange });
  // Written after commit, so a render React throws away leaves nothing behind.
  useIsomorphicLayoutEffect(() => {
    currentValue.current = value;
    live.current = { controlled, onValueChange };
  });

  // The sections on screen after the active one, for the contour. Held as a
  // joined string so an unchanged set does not re-render the list.
  const [inView, setInView] = useState('');

  const select = useCallback((next: string) => {
    if (next === currentValue.current) return;
    currentValue.current = next;
    if (!live.current.controlled) setInnerValue(next);
    live.current.onValueChange?.(next);
  }, []);

  const spying = observe ?? !controlled;
  const nav = useRef<HTMLElement>(null);
  /*
   * The section a press is scrolling to. While it is set, the spy reports
   * what is on screen but does not move the mark: on the way to a section the
   * line crosses every one before it, and a short section near the end may
   * never reach the line at all.
   */
  const heading = useRef<string | null>(null);
  const jumpFrom = useRef({ root, offset });
  useIsomorphicLayoutEffect(() => {
    jumpFrom.current = { root, offset };
  });

  const jump = useCallback(
    (id: string, next: string, moveFocus: boolean) => {
      const { root: source, offset: gap } = jumpFrom.current;
      const scroller = source && 'current' in source ? source.current : source;
      if (!scroller) return false;
      const target = scroller.ownerDocument.getElementById(id);
      if (!target || !scroller.contains(target)) return false;

      // From the top of the scrollport, inside the border, to the target's
      // top, less the reading line's offset: the target lands on the line.
      const port = scroller.getBoundingClientRect().top + scroller.clientTop;
      const top = scroller.scrollTop + target.getBoundingClientRect().top - port - Math.max(0, gap);
      const reduce = scroller.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;

      heading.current = next;
      select(next);
      let timer = 0;
      const release = () => {
        heading.current = null;
        window.clearTimeout(timer);
        scroller.removeEventListener('scrollend', release);
        for (const type of ['wheel', 'touchstart', 'keydown'] as const) scroller.removeEventListener(type, release);
      };
      scroller.addEventListener('scrollend', release, { once: true });
      // The reader taking over ends the hold at once.
      for (const type of ['wheel', 'touchstart', 'keydown'] as const)
        scroller.addEventListener(type, release, { once: true, passive: true });
      // A scroll that does not move, or a browser without `scrollend`.
      timer = window.setTimeout(release, 1200);
      scroller.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });

      // Followed from the keyboard, focus goes to the section, as the
      // browser's own jump would take it, so Tab carries on from there.
      if (moveFocus) {
        // A section is not a control, so it is focused without a ring round it,
        // as the browser's own jump would leave it; both are put back on blur.
        const outline = target.style.outline;
        const tabbable = target.hasAttribute('tabindex');
        if (!tabbable) target.setAttribute('tabindex', '-1');
        target.style.outline = 'none';
        target.addEventListener(
          'blur',
          () => {
            target.style.outline = outline;
            if (!tabbable) target.removeAttribute('tabindex');
          },
          { once: true }
        );
        target.focus({ preventScroll: true });
      }

      // The hash is the link's address, so it is shareable; replaced, not
      // pushed, so Back leaves the page rather than walking its sections.
      const { location, history } = scroller.ownerDocument.defaultView ?? window;
      if (location.hash !== `#${id}`) history.replaceState(history.state, '', `#${encodeURIComponent(id)}`);
      return true;
    },
    [select]
  );
  // Whether the spy has read the page once. The first read is placement,
  // not a change of section, so it does not call `onValueChange`.
  const placed = useRef(false);

  useEffect(() => {
    if (!spying || typeof window === 'undefined') return;
    const container = nav.current;
    if (!container || typeof IntersectionObserver === 'undefined') return;

    const scroller = root && 'current' in root ? root.current : root;
    const doc = container.ownerDocument;

    /*
     * Every link whose hash names an element in this document. The link's own
     * row says which value to make active: a hash and the item it sits in need
     * not be spelled the same, and the item is what the caller named.
     */
    const targets: { element: Element; value: string }[] = [];
    const seen = new Set<Element>();
    for (const anchor of container.querySelectorAll<HTMLAnchorElement>(
      '[data-slot="table-of-contents-link"]'
    )) {
      const id = hashTarget(anchor.getAttribute('href'));
      const element = id ? doc.getElementById(id) : null;
      if (!element || seen.has(element)) continue;
      const item = anchor.closest<HTMLElement>('[data-slot="table-of-contents-item"]');
      const section = item?.dataset.value;
      if (!section) continue;
      seen.add(element);
      targets.push({ element, value: section });
    }
    if (targets.length === 0) return;

    // The line is measured from the scrollport, inside the scroller's
    // border, which is where a scrolled-to section lands.
    const line = () => {
      const top = scroller ? scroller.getBoundingClientRect().top + scroller.clientTop : 0;
      return top + Math.max(0, offset);
    };
    const atEnd = () => {
      const el = scroller ?? doc.scrollingElement;
      if (!el) return false;
      const room = el.scrollHeight - el.clientHeight;
      return room > 0 && el.scrollTop >= room - 1;
    };
    const floor = () =>
      scroller ? scroller.getBoundingClientRect().bottom : window.innerHeight;

    const measure = () => {
      const at = line();
      const sections: TocSection[] = targets.map(({ element, value: section }) => {
        const rect = element.getBoundingClientRect();
        return { value: section, top: rect.top, bottom: rect.bottom };
      });
      setInView(sectionsInView(sections, at, floor()).join('\n'));
      // A press is on its way somewhere: the mark is already there.
      if (heading.current !== null) return;
      // A pixel of slack, so a section scrolled to the line by a rounded
      // scroll position still counts as reached.
      const next = sectionAt(sections, at + 1, atEnd());
      if (next === undefined) return;
      // The first placement is not a change of section: the page opened where
      // it opened. Every change after it is reported.
      const first = !placed.current;
      placed.current = true;
      if (next === currentValue.current) return;
      if (first) {
        currentValue.current = next;
        if (!live.current.controlled) setInnerValue(next);
        return;
      }
      select(next);
    };

    const observer = new IntersectionObserver(measure, {
      root: scroller ?? null,
      // A section counts as in view once it reaches the reading line, not
      // when it first touches the top edge.
      rootMargin: `${-Math.max(0, offset)}px 0px 0px 0px`,
      threshold: 0,
    });
    // A section is current until the next one reaches the line, which is not
    // an intersection change of its own, so the contour also reads on scroll.
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };
    const scrollTarget: HTMLElement | Window = scroller ?? window;
    if (variant === 'contour') scrollTarget.addEventListener('scroll', onScroll, { passive: true });

    // The first read is synchronous: a page that opens halfway down should
    // not show the first section until something happens to scroll.
    measure();
    for (const { element } of targets) observer.observe(element);
    return () => {
      observer.disconnect();
      scrollTarget.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [spying, offset, root, select, variant]);

  const lit = useMemo(() => {
    if (value === undefined) return [];
    // Without the spy only the active section is known to be on screen.
    const rest = spying && inView ? inView.split('\n') : [];
    return rest[0] === value ? rest : [value, ...rest.filter((each) => each !== value)];
  }, [value, inView, spying]);

  const context = useMemo(() => ({ value, select, jump, variant, lit }), [value, select, jump, variant, lit]);
  const mergedRef = useMemo(() => mergeRefs(nav, forwardedRef), [forwardedRef]);

  return (
    <TableOfContentsContext.Provider value={context}>
      <nav
        data-slot="table-of-contents"
        aria-label={ariaLabel}
        className={tableOfContentsVariants().root({ className })}
        {...props}
        // After the spread, so a caller's ref is joined to ours, not swapped for it.
        ref={mergedRef}
      >
        {children}
      </nav>
    </TableOfContentsContext.Provider>
  );
});
TableOfContentsRoot.displayName = 'TableOfContents';

export interface TableOfContentsTitleProps extends Omit<ComponentProps<'p'>, 'className'> {
  /** Classes for the heading. */
  className?: string;
}

/** The small heading above the list, such as "On this page". Optional. */
function TableOfContentsTitle({ className, ...props }: TableOfContentsTitleProps) {
  return (
    <p data-slot="table-of-contents-title" className={tableOfContentsVariants().title({ className })} {...props} />
  );
}
TableOfContentsTitle.displayName = 'TableOfContents.Title';

export interface TableOfContentsListProps extends Omit<ComponentProps<'ol'>, 'className'> {
  /** Classes for the `<ol>`. */
  className?: string;
}

/**
 * The ordered list of sections. It draws the rail and the segment that marks
 * the current one, measured from the active item.
 */
const TableOfContentsList = forwardRef<HTMLOListElement, Omit<TableOfContentsListProps, 'ref'>>(function TableOfContentsList({ className, children, ...props }, forwardedRef) {
  const { value, variant, lit } = useTableOfContents('TableOfContents.List');
  const list = useRef<HTMLOListElement>(null);
  const placed = useRef(false);
  const track = useRef<SVGSVGElement>(null);
  const litLayer = useRef<SVGSVGElement>(null);
  /** Where the lit stretch started last time, to tell which way it moved. */
  const lastStart = useRef<number | null>(null);
  const heading = useRef<'up' | 'down'>('down');
  const litKey = lit.join('\n');

  useIsomorphicLayoutEffect(() => {
    const box = list.current;
    if (!box) return;

    let frame: number | undefined;
    const ready = () => {
      if (placed.current) {
        box.setAttribute('data-ready', '');
        return;
      }
      // Shown once it is in place, so it does not arrive by sliding down
      // from the top of the list.
      frame = requestAnimationFrame(() => {
        placed.current = true;
        box.setAttribute('data-ready', '');
      });
    };

    const placeContour = () => {
      const items = [
        ...box.querySelectorAll<HTMLElement>(':scope > [data-slot="table-of-contents-item"]'),
      ];
      if (items.length === 0) return;
      const boxRect = box.getBoundingClientRect();
      const rows: ContourRow[] = items.map((item) => {
        const rect = item.getBoundingClientRect();
        return {
          top: rect.top - boxRect.top,
          bottom: rect.bottom - boxRect.top,
          depth: Number(item.dataset.depth ?? 0),
        };
      });
      const path = contourPath(rows, CONTOUR_STEP, CONTOUR_BEND);
      const width = `${contourWidth(rows, CONTOUR_STEP)}`;
      for (const svg of [track.current, litLayer.current]) {
        if (!svg) continue;
        svg.setAttribute('width', width);
        svg.firstElementChild?.setAttribute('d', path);
      }

      const indexes = items
        .map((item, index) => (item.hasAttribute('data-lit') ? index : -1))
        .filter((index) => index >= 0);
      if (indexes.length === 0) {
        box.removeAttribute('data-ready');
        return;
      }
      const first = indexes[0]!;
      const last = indexes[indexes.length - 1]!;
      // The dot leads: on the bottom end while the reader moves down the page,
      // on the top end while they move back up.
      if (lastStart.current !== null && first !== lastStart.current) {
        heading.current = first < lastStart.current ? 'up' : 'down';
      }
      lastStart.current = first;
      const top = rows[first]!.top;
      const bottom = rows[last]!.bottom;
      const end = heading.current === 'up' ? rows[first]! : rows[last]!;
      box.style.setProperty('--toc-lit-top', `${top}px`);
      box.style.setProperty('--toc-lit-bottom', `${bottom}px`);
      box.style.setProperty('--toc-dot-x', `${end.depth * CONTOUR_STEP - 2}px`);
      box.style.setProperty(
        '--toc-dot-y',
        `${(heading.current === 'up' ? top : bottom) - 2.5}px`
      );
      ready();
    };

    const place = () => {
      if (variant === 'contour') {
        placeContour();
        return;
      }
      const active = box.querySelector<HTMLElement>(
        '[data-slot="table-of-contents-item"][data-active]'
      );
      if (!active) {
        box.removeAttribute('data-ready');
        return;
      }

      const boxRect = box.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      box.style.setProperty('--toc-indicator-top', `${activeRect.top - boxRect.top}px`);
      box.style.setProperty('--toc-indicator-height', `${activeRect.height}px`);
      ready();
    };

    place();
    const observer = new ResizeObserver(place);
    observer.observe(box);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [value, variant, litKey]);

  const slots = tableOfContentsVariants({ variant });
  const mergedRef = useMemo(() => mergeRefs(list, forwardedRef), [forwardedRef]);

  return (
    <ol
      data-slot="table-of-contents-list"
      data-variant={variant}
      className={slots.list({ className })}
      {...props}
      ref={mergedRef}
    >
      {children}
      {variant === 'contour' ? (
        // Inside the list for positioning, and kept out of it for everyone
        // else: hidden from assistive technology and from the item queries.
        <li aria-hidden="true" role="presentation" data-slot="table-of-contents-contour" className="contents">
          <svg ref={track} className={slots.contour()} height="100%">
            <path fill="none" className="stroke-border" strokeWidth={1} />
          </svg>
          <svg ref={litLayer} className={slots.contourLit()} height="100%">
            <path fill="none" className="stroke-foreground" strokeWidth={1} />
          </svg>
          <span className={slots.contourDot()} />
        </li>
      ) : null}
    </ol>
  );
});
TableOfContentsList.displayName = 'TableOfContents.List';

export interface TableOfContentsItemProps extends Omit<ComponentProps<'li'>, 'className' | 'value'> {
  /** The section this row stands for. Matches the root's `value`. */
  value: string;
  /**
   * How deep the section sits. Each step indents the row and its link, for
   * a section under a section.
   */
  depth?: number;
  /** Classes for the `<li>`. */
  className?: string;
}

/** One section in the list. Holds its `Link` and carries its `depth`. */
function TableOfContentsItem({
  value,
  depth = 0,
  className,
  style,
  children,
  ...props
}: TableOfContentsItemProps) {
  const { value: active, variant, lit } = useTableOfContents('TableOfContents.Item');
  const level = Math.max(0, Math.trunc(depth));
  const indent = INDENT + level * DEPTH_STEP;
  const item = useMemo(() => ({ value, depth: level }), [value, level]);

  return (
    <li
      data-slot="table-of-contents-item"
      data-value={value}
      data-depth={level}
      data-active={active === value ? '' : undefined}
      data-lit={variant === 'contour' && lit.includes(value) ? '' : undefined}
      style={{ ...style, paddingInlineStart: indent }}
      className={tableOfContentsVariants().item({ className })}
      {...props}
    >
      <TableOfContentsItemContext.Provider value={item}>{children}</TableOfContentsItemContext.Provider>
    </li>
  );
}
TableOfContentsItem.displayName = 'TableOfContents.Item';

export interface TableOfContentsLinkProps extends Omit<ComponentProps<'a'>, 'className' | 'href'> {
  /** The section this link jumps to, hash included: `#install`. */
  href: string;
  /** Classes for the `<a>`. */
  className?: string;
}

/**
 * A link to one section. It is a real anchor, so the URL gains the hash and
 * middle-click opens the section in a new tab; `render` lets a router's link
 * take its place. With a `root`, a press scrolls that element to put the
 * section on the reading line; on the page, the browser scrolls. The current
 * one is marked with `aria-current="location"`.
 */
function TableOfContentsLink({
  className,
  render,
  ...props
}: TableOfContentsLinkProps & RenderProp<'a'>) {
  const { value, select, jump, variant, lit } = useTableOfContents('TableOfContents.Link');
  const item = useContext(TableOfContentsItemContext);
  const section = item?.value ?? hashTarget(props.href);
  const active = section !== null && section === value;

  const handleClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    // A click that opens the section somewhere else leaves this page where it
    // is, so the mark stays where it is too.
    const elsewhere =
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.currentTarget.target === '_blank';
    if (elsewhere || !section) return;
    // Inside a scroller, the list scrolls that scroller itself: the browser's
    // jump would scroll the page around it too, and land the section by its
    // `scroll-margin` rather than on the reading line.
    const id = hashTarget(props.href);
    // `detail` is 0 for a press that came from the keyboard.
    if (id && jump(id, section, event.detail === 0)) {
      event.preventDefault();
      return;
    }
    // On the page the browser does the scrolling. The mark moves at once,
    // rather than waiting for the spy to catch up on the way past.
    select(section);
  };

  return useRender({
    defaultTagName: 'a',
    render,
    props: mergeProps(
      {
        'data-slot': 'table-of-contents-link',
        'data-active': active ? '' : undefined,
        'data-lit': variant === 'contour' && section !== null && lit.includes(section) ? '' : undefined,
        'aria-current': active ? 'location' : undefined,
        className: tableOfContentsVariants({ variant }).link({ className }),
        onClick: handleClick,
      },
      props
    ),
  });
}
TableOfContentsLink.displayName = 'TableOfContents.Link';

export interface TableOfContentsCodeProps extends Omit<ComponentProps<'code'>, 'className'> {
  /** Classes for the `<code>`. */
  className?: string;
}

/**
 * An identifier inside a link, such as a prop name under an API heading. It
 * is drawn as a small pill in the link's own colour, so it dims and lights
 * with the row it sits in.
 */
function TableOfContentsCode({ className, ...props }: TableOfContentsCodeProps) {
  return (
    <code data-slot="table-of-contents-code" className={tableOfContentsVariants().code({ className })} {...props} />
  );
}
TableOfContentsCode.displayName = 'TableOfContents.Code';

export const TableOfContents = Object.assign(TableOfContentsRoot, {
  Title: TableOfContentsTitle,
  List: TableOfContentsList,
  Item: TableOfContentsItem,
  Link: TableOfContentsLink,
  Code: TableOfContentsCode,
});

export {
  TableOfContentsTitle,
  TableOfContentsList,
  TableOfContentsItem,
  TableOfContentsLink,
  TableOfContentsCode,
};
