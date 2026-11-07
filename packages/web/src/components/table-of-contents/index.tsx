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
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';
import { hashTarget, sectionAt, type TocSection } from './spy';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

/** One curve for the segment, so a jump reads as one movement rather than two. */
const EASE = 'ease-[cubic-bezier(0.3,0.7,0.1,1)]';
/** How far each step of `depth` indents a row. */
const DEPTH_STEP = 12;
/** Where the first level starts, clear of the rail. */
const INDENT = 16;

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
      'data-active:font-medium data-active:text-foreground',
    ],
  },
});

interface TableOfContentsContextValue {
  /** The section being read, or `undefined` while nothing is active. */
  value: string | undefined;
  /** Makes a section active, from a link press or from the scroll spy. */
  select: (value: string) => void;
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
  /** Classes for the `<nav>`. */
  className?: string;
}

/**
 * Holds the active section and, when uncontrolled, keeps it in step with the
 * page. Its `<nav>` is the landmark a screen reader jumps to.
 */
function TableOfContentsRoot({
  value: valueProp,
  defaultValue,
  onValueChange,
  observe,
  offset = 16,
  root,
  className,
  'aria-label': ariaLabel = 'Table of contents',
  children,
  ...props
}: TableOfContentsProps) {
  const [innerValue, setInnerValue] = useState<string | undefined>(defaultValue);
  const controlled = valueProp !== undefined;
  const value = controlled ? valueProp : innerValue;

  // The spy and a press read the value as it is now, not as it was when the
  // effect that owns them was created.
  const currentValue = useRef(value);
  currentValue.current = value;
  const live = useRef({ controlled, onValueChange });
  live.current = { controlled, onValueChange };

  const select = useCallback((next: string) => {
    if (next === currentValue.current) return;
    currentValue.current = next;
    if (!live.current.controlled) setInnerValue(next);
    live.current.onValueChange?.(next);
  }, []);

  const spying = observe ?? !controlled;
  const nav = useRef<HTMLElement>(null);
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

    const line = () => {
      const top = scroller ? scroller.getBoundingClientRect().top : 0;
      return top + Math.max(0, offset);
    };

    const measure = () => {
      const at = line();
      const sections: TocSection[] = targets.map(({ element, value: section }) => {
        const rect = element.getBoundingClientRect();
        return { value: section, top: rect.top, bottom: rect.bottom };
      });
      const next = sectionAt(sections, at);
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

    // The first read is synchronous: a page that opens halfway down should
    // not show the first section until something happens to scroll.
    measure();
    for (const { element } of targets) observer.observe(element);
    return () => observer.disconnect();
  }, [spying, offset, root, select]);

  const context = useMemo(() => ({ value, select }), [value, select]);

  return (
    <TableOfContentsContext.Provider value={context}>
      <nav
        ref={nav}
        data-slot="table-of-contents"
        aria-label={ariaLabel}
        className={tableOfContentsVariants().root({ className })}
        {...props}
      >
        {children}
      </nav>
    </TableOfContentsContext.Provider>
  );
}
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
function TableOfContentsList({ className, children, ...props }: TableOfContentsListProps) {
  const { value } = useTableOfContents('TableOfContents.List');
  const list = useRef<HTMLOListElement>(null);
  const placed = useRef(false);

  useIsomorphicLayoutEffect(() => {
    const box = list.current;
    if (!box) return;

    let frame: number | undefined;
    const place = () => {
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

      if (placed.current) {
        box.setAttribute('data-ready', '');
        return;
      }
      // Shown once it is in place, so the first section does not arrive by
      // sliding down from the top of the list.
      frame = requestAnimationFrame(() => {
        placed.current = true;
        box.setAttribute('data-ready', '');
      });
    };

    place();
    const observer = new ResizeObserver(place);
    observer.observe(box);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [value]);

  return (
    <ol ref={list} data-slot="table-of-contents-list" className={tableOfContentsVariants().list({ className })} {...props}>
      {children}
    </ol>
  );
}
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
  const { value: active } = useTableOfContents('TableOfContents.Item');
  const level = Math.max(0, Math.trunc(depth));
  const indent = INDENT + level * DEPTH_STEP;
  const item = useMemo(() => ({ value, depth: level }), [value, level]);

  return (
    <li
      data-slot="table-of-contents-item"
      data-value={value}
      data-depth={level}
      data-active={active === value ? '' : undefined}
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
 * A link to one section. It is a real anchor, so the browser scrolls, the URL
 * gains the hash and middle-click opens the section in a new tab; `render`
 * lets a router's link take its place. The current one is marked with
 * `aria-current="location"`.
 */
function TableOfContentsLink({
  className,
  render,
  ...props
}: TableOfContentsLinkProps & RenderProp<'a'>) {
  const { value, select } = useTableOfContents('TableOfContents.Link');
  const item = useContext(TableOfContentsItemContext);
  const section = item?.value ?? hashTarget(props.href);
  const active = section !== null && section === value;

  const handleClick = (_event: ReactMouseEvent<HTMLAnchorElement>) => {
    // The browser does the scrolling. The mark moves at once, rather than
    // waiting for the spy to catch up on the way past.
    if (section) select(section);
  };

  return useRender({
    defaultTagName: 'a',
    render,
    props: mergeProps(
      {
        'data-slot': 'table-of-contents-link',
        'data-active': active ? '' : undefined,
        'aria-current': active ? 'location' : undefined,
        className: tableOfContentsVariants().link({ className }),
        onClick: handleClick,
      },
      props
    ),
  });
}
TableOfContentsLink.displayName = 'TableOfContents.Link';

export const TableOfContents = Object.assign(TableOfContentsRoot, {
  Title: TableOfContentsTitle,
  List: TableOfContentsList,
  Item: TableOfContentsItem,
  Link: TableOfContentsLink,
});

export { TableOfContentsTitle, TableOfContentsList, TableOfContentsItem, TableOfContentsLink };
