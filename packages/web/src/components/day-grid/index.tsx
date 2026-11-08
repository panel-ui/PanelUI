'use client';

/**
 * DayGrid — a run of days as a field of dots, each sized by how much happened
 * on it.
 *
 * ```tsx
 * <DayGrid cells={days} columns={7} />
 * <DayGrid.Legend />
 * ```
 *
 * ## Size carries the amount, not only shade
 *
 * A day is level 0 to 4, and its dot grows with the level: a speck for a day
 * with nothing on it, a full disc for the busiest. The period reads the way a
 * halftone print does, heavy where a lot happened and thin where little did,
 * and it still reads for someone who cannot tell two shades of one colour
 * apart.
 *
 * ## The pointer is a lens
 *
 * Dots swell as the pointer comes near and settle as it leaves, so the day
 * under the pointer is the largest thing on the grid and its neighbours lean
 * towards it. The day's `label` is shown in a tag above it. The lens changes
 * nothing about what the grid says; it is there to make one day easy to
 * single out among forty.
 *
 * ## Days you can ask about
 *
 * Pass `onValueChange` and each day becomes a button. The grid then behaves as
 * one control to the keyboard: a single Tab stop, with the arrow keys moving
 * between days, so forty days are not forty presses of Tab.
 */
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

/** How much happened on a day: 0 is nothing, 4 is the most. */
export type DayLevel = 0 | 1 | 2 | 3 | 4;

/** Which of the theme's roles the dots are drawn in. */
export type DayGridColor = 'primary' | 'info' | 'success' | 'warning' | 'destructive';

export interface DayCell {
  level: DayLevel;
  /** What the day is, for the tag and a screen reader: "14 May, 6 commits". */
  label?: string;
}

/** How many days have something on them, and how many there are. */
export interface DayGridSummaryCounts {
  /** Days whose level is above 0. */
  active: number;
  /** Every day in the grid. */
  total: number;
}

const dayGridVariants = tv({
  slots: {
    root: 'relative grid w-full gap-1',
    // The cell is the target and keeps its size. Only the dot inside it grows.
    cell: 'relative flex aspect-square w-full items-center justify-center rounded-full outline-none',
    /*
     * One scale made of three parts: how big the level is, how near the
     * pointer is, and whether the grid has arrived yet. Kept as variables so
     * each can change without a class changing.
     */
    dot: 'block size-full rounded-full [scale:calc(var(--pu-size)*(1+var(--pu-lens,0)*0.5)*var(--pu-in,1))] transition-[scale,box-shadow] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none',
    tag: 'pointer-events-none absolute z-20 whitespace-nowrap rounded-lg bg-foreground px-2 py-1 text-xs font-medium text-background shadow-lg',
    legend: 'flex items-center gap-1.5 text-xs text-muted-foreground',
    // One row per day, matching the grid's own rows, so each name sits level with its days.
    weekdays: 'grid gap-1 text-xs leading-none text-muted-foreground',
    weekday: 'flex items-center',
    // The picked day, written out under the grid.
    caption: 'flex flex-col gap-0.5',
    title: 'text-sm font-medium',
    description: 'text-sm text-muted-foreground',
    swatch: 'flex size-4 items-center justify-center',
  },
  variants: {
    /*
     * The colour is written to one variable and every dot reads it. The legend
     * is a sibling of the grid, not a child, so it takes the same variant.
     */
    color: {
      primary: { root: '[--pu-color:var(--primary)]', legend: '[--pu-color:var(--primary)]' },
      info: { root: '[--pu-color:var(--info)]', legend: '[--pu-color:var(--info)]' },
      success: { root: '[--pu-color:var(--success)]', legend: '[--pu-color:var(--success)]' },
      warning: { root: '[--pu-color:var(--warning)]', legend: '[--pu-color:var(--warning)]' },
      destructive: {
        root: '[--pu-color:var(--destructive)]',
        legend: '[--pu-color:var(--destructive)]',
      },
    },
    level: {
      0: { dot: 'bg-muted-foreground/30 [--pu-size:0.2]' },
      1: { dot: 'bg-[color-mix(in_oklab,var(--pu-color)_45%,transparent)] [--pu-size:0.42]' },
      2: { dot: 'bg-[color-mix(in_oklab,var(--pu-color)_65%,transparent)] [--pu-size:0.6]' },
      3: { dot: 'bg-[color-mix(in_oklab,var(--pu-color)_85%,transparent)] [--pu-size:0.8]' },
      // The busiest days carry a little light of their own.
      4: {
        dot: 'bg-[var(--pu-color)] shadow-[0_0_14px_color-mix(in_oklab,var(--pu-color)_45%,transparent)] [--pu-size:1]',
      },
    },
    interactive: {
      true: {
        cell: 'cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      },
    },
    selected: {
      true: { cell: 'ring-2 ring-foreground ring-offset-2 ring-offset-background' },
    },
  },
});

const LEVELS = [0, 1, 2, 3, 4] as const;

/** How far the lens reaches, in cells. */
const LENS_REACH = 2.4;
/** Milliseconds between one diagonal of dots arriving and the next. */
const STAGGER = 22;

export interface DayGridProps extends Omit<ComponentProps<'div'>, 'children' | 'onChange' | 'color'> {
  /** The days, in order. They fill the grid row by row. */
  cells: DayCell[];
  /** Cells per row. Seven makes each row a week. */
  columns?: number;
  /**
   * Cells per column. Giving this fills the grid column by column, and
   * `columns` is ignored. Seven makes each column a week, which lays a long
   * period out wide and short.
   */
  rows?: number;
  /**
   * Empty slots before the first day, for a period that starts partway
   * through the first row or column. Use it when a month does not begin on
   * the first day of the week: `rows={7}` with `offset={4}` leaves four slots
   * in the first column and puts the first day on a Friday. The offset is not
   * a day: it holds space only, so it is left out of the summary and never
   * becomes a button.
   */
  offset?: number;
  /** Which of the theme's roles the dots are drawn in. */
  color?: DayGridColor;
  /** The index of the selected day, when the caller holds it. */
  value?: number | null;
  /**
   * Called with the index of a day when it is pressed. Passing this makes the
   * days buttons; without it the grid is a picture.
   */
  onValueChange?: (index: number) => void;
  /** Set to `false` for dots that hold still under the pointer. */
  lens?: boolean;
  /** What a screen reader calls the grid. */
  label?: string;
  /**
   * The sentence a screen reader says for the whole grid, written in the
   * reader's language. It is given `active`, the days with something on them,
   * and `total`, every day in the grid. Without it the grid says the same
   * thing in English.
   */
  summary?: (counts: DayGridSummaryCounts) => string;
}

function DayGridRoot({
  cells,
  columns = 7,
  rows: perColumn,
  offset = 0,
  color = 'primary',
  value = null,
  onValueChange,
  lens = true,
  label = 'Activity',
  summary: formatSummary,
  className,
  style,
  onPointerMove,
  onPointerLeave,
  render,
  ...props
}: DayGridProps & RenderProp<'div'>) {
  const slots = dayGridVariants({ color });
  const root = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLElement | null)[]>([]);
  const frame = useRef(0);
  const interactive = onValueChange !== undefined;
  // The day whose tag is showing: the one under the pointer, or with focus.
  const [pointed, setPointed] = useState<number | null>(null);
  // The dots start at nothing and arrive along the diagonals.
  const [arrived, setArrived] = useState<'no' | 'arriving' | 'yes'>('no');

  // Which way the days run: along each row, or down each column.
  const byColumn = perColumn !== undefined;
  // Empty slots before the first day. They take a place in the grid and in the
  // entrance, but they are not days: the summary counts only `cells`.
  const lead = Number.isFinite(offset) ? Math.max(0, Math.trunc(offset)) : 0;
  const total = cells.length + lead;
  const across = byColumn ? Math.ceil(total / Math.max(1, perColumn)) : columns;
  const rows = byColumn ? Math.max(1, perColumn) : Math.ceil(total / Math.max(1, columns));

  useEffect(() => {
    const start = requestAnimationFrame(() => setArrived('arriving'));
    // Once the last diagonal is in, the delays come off. Left on, they would
    // hold every dot back from the lens by its own share of the stagger.
    const settle = setTimeout(() => setArrived('yes'), (rows + across) * STAGGER + 450);
    return () => {
      cancelAnimationFrame(start);
      clearTimeout(settle);
    };
  }, [rows, across]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const summary = useMemo(() => {
    const counts = { active: cells.filter((cell) => cell.level > 0).length, total: cells.length };
    // Written here even when the caller supplies a sentence, so a formatter in
    // another language is handed the counts instead of walking the days again.
    return formatSummary
      ? formatSummary(counts)
      : `${label}: something on ${counts.active} of ${counts.total} days.`;
  }, [cells, label, formatSummary]);

  const moveLens = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    // A finger covers what a lens would show, and has no hover to end it.
    if (event.pointerType === 'touch') return;
    const still = !lens || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const { clientX, clientY } = event;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      let nearest: number | null = null;
      let best = Infinity;
      nodes.current.forEach((node, index) => {
        if (!node) return;
        const box = node.getBoundingClientRect();
        const distance = Math.hypot(clientX - (box.left + box.width / 2), clientY - (box.top + box.height / 2));
        if (!still) {
          const near = Math.max(0, 1 - distance / (box.width * LENS_REACH));
          // Eased, so the swell has a soft edge and a round top.
          node.style.setProperty('--pu-lens', (near * near * (3 - 2 * near)).toFixed(3));
        }
        if (distance < best && distance < box.width * 0.75) {
          best = distance;
          nearest = index;
        }
      });
      setPointed(nearest);
    });
  };

  const leave = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event);
    cancelAnimationFrame(frame.current);
    for (const node of nodes.current) node?.style.removeProperty('--pu-lens');
    setPointed(null);
  };

  const layout = byColumn
    ? {
        gridTemplateRows: `repeat(${rows}, auto)`,
        gridAutoFlow: 'column' as const,
        gridAutoColumns: 'minmax(0, 1fr)',
        ...style,
      }
    : { gridTemplateColumns: `repeat(${across}, minmax(0, 1fr))`, ...style };

  /** Where a dot is in its entrance, as the styles that put it there. */
  const dotStyle = (index: number): CSSProperties | undefined => {
    if (arrived === 'yes') return undefined;
    // The offset takes part in the diagonals, so the stagger follows what is
    // on screen rather than starting at the top-left of the grid.
    const position = lead + index;
    const diagonal = byColumn
      ? Math.floor(position / rows) + (position % rows)
      : Math.floor(position / across) + (position % across);
    return {
      ['--pu-in' as string]: arrived === 'no' ? 0 : 1,
      transitionDelay: `${diagonal * STAGGER}ms`,
      transitionDuration: '420ms',
    };
  };

  const tag = (() => {
    if (pointed === null) return null;
    const text = cells[pointed]?.label;
    const node = nodes.current[pointed];
    const box = root.current;
    if (!text || !node || !box) return null;
    const centre = node.offsetLeft + node.offsetWidth / 2;
    // Hung from whichever side keeps it inside the grid.
    const share = centre / box.offsetWidth;
    const shift = share < 0.25 ? '-12%' : share > 0.75 ? '-88%' : '-50%';
    return (
      <span
        aria-hidden="true"
        className={slots.tag()}
        style={{ left: centre, top: node.offsetTop - 6, translate: `${shift} -100%` }}
      >
        {text}
      </span>
    );
  })();


  // The offset is drawn as empty grid items, so the first day starts after
  // them whichever way the grid fills. They are hidden from assistive
  // technology, and the summary already counts days rather than slots.
  const leadSlots =
    lead > 0
      ? Array.from({ length: lead }, (_, index) => <span key={`lead-${index}`} aria-hidden="true" />)
      : null;

  // One Tab stop for the grid: the selected day, or the first.
  const focusable = value !== null && value >= 0 && value < cells.length ? value : 0;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const moves: Record<string, number> = {
      // One day along a row, or one whole column when the days run downwards.
      ArrowLeft: (rtl ? 1 : -1) * (byColumn ? rows : 1),
      ArrowRight: (rtl ? -1 : 1) * (byColumn ? rows : 1),
      ArrowUp: byColumn ? -1 : -across,
      ArrowDown: byColumn ? 1 : across,
    };
    let next: number | undefined;
    if (event.key in moves) next = index + (moves[event.key] ?? 0);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = cells.length - 1;
    if (next === undefined || next < 0 || next >= cells.length) return;
    event.preventDefault();
    nodes.current[next]?.focus();
    onValueChange?.(next);
  };

  // Called before the branch below, so a prop that changes later cannot change the hook count.
  const rendered = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        ref: root,
        role: 'group',
        'aria-label': summary,
        className: slots.root({ className }),
        style: layout,
        onPointerMove: moveLens,
        onPointerLeave: leave,
        children: (
          <>
            {leadSlots}
            {cells.map((cell, index) => {
              const part = dayGridVariants({
                level: cell.level,
                interactive: true,
                selected: value === index,
              });
              return (
                <button
                  key={index}
                  ref={(node) => {
                    nodes.current[index] = node;
                  }}
                  type="button"
                  aria-label={cell.label ?? `Day ${index + 1}, level ${cell.level} of 4`}
                  aria-pressed={value === index}
                  tabIndex={index === focusable ? 0 : -1}
                  onClick={() => onValueChange?.(index)}
                  onKeyDown={(event) => onKeyDown(event, index)}
                  onFocus={(event) => {
                    // Only for focus that came from the keyboard: a click focuses
                    // too, and the pointer is already showing that day's tag.
                    if (event.currentTarget.matches(':focus-visible')) setPointed(index);
                  }}
                  onBlur={() => setPointed((current) => (current === index ? null : current))}
                  className={part.cell()}
                >
                  <span className={part.dot()} style={dotStyle(index)} />
                </button>
              );
            })}
            {tag}
          </>
        ),
      },
      props
    ),
  });
  if (!interactive) {
    return (
      <div
        ref={root}
        role="img"
        aria-label={summary}
        className={slots.root({ className })}
        style={layout}
        onPointerMove={moveLens}
        onPointerLeave={leave}
        {...props}
      >
        {leadSlots}
        {cells.map((cell, index) => {
          const part = dayGridVariants({ level: cell.level });
          return (
            <span
              key={index}
              ref={(node) => {
                nodes.current[index] = node;
              }}
              className={part.cell()}
            >
              <span className={part.dot()} style={dotStyle(index)} />
            </span>
          );
        })}
        {tag}
      </div>
    );
  }
  return rendered;
}
DayGridRoot.displayName = 'DayGrid';

export interface DayGridLegendProps extends Omit<ComponentProps<'div'>, 'children' | 'color'> {
  /** The same role the grid is drawn in. */
  color?: DayGridColor;
  /** The word at the quiet end of the scale. */
  less?: ReactNode;
  /** The word at the busy end of the scale. */
  more?: ReactNode;
}

/** The five sizes, quietest to busiest, with a word at each end. */
function DayGridLegend({
  color = 'primary',
  less = 'Less',
  more = 'More',
  className,
  render,
  ...props
}: DayGridLegendProps & RenderProp<'div'>) {
  const slots = dayGridVariants({ color });
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        className: slots.legend({ className }),
        children: (
          <>
            <span>{less}</span>
            {LEVELS.map((level) => (
              <span key={level} aria-hidden="true" className={slots.swatch()}>
                <span className={dayGridVariants({ level }).dot({ className: 'shadow-none' })} />
              </span>
            ))}
            <span>{more}</span>
          </>
        ),
      },
      props
    ),
  });
}
DayGridLegend.displayName = 'DayGrid.Legend';

export interface DayGridWeekdaysProps extends Omit<ComponentProps<'div'>, 'children'> {
  /**
   * The name written beside each row, first row first. An empty string leaves
   * a row unnamed. Default Monday to Sunday with every other name left out.
   */
  labels?: string[];
}

/**
 * The days of the week down the side of a grid that runs a week to a column.
 * Put it beside the grid, in a row with it. Hidden from screen readers, which
 * are given each day's own label.
 */
function DayGridWeekdays({
  labels = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'],
  className,
  style,
  render,
  ...props
}: DayGridWeekdaysProps & RenderProp<'div'>) {
  const slots = dayGridVariants();
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'aria-hidden': 'true',
        'data-slot': 'day-grid-weekdays',
        className: slots.weekdays({ className }),
        style: { gridTemplateRows: `repeat(${labels.length}, minmax(0, 1fr))`, ...style },
        children: (
          <>
            {labels.map((day, index) => (
              <span key={index} className={slots.weekday()}>
                {day}
              </span>
            ))}
          </>
        ),
      },
      props
    ),
  });
}
DayGridWeekdays.displayName = 'DayGrid.Weekdays';

export interface DayGridCaptionProps extends ComponentProps<'div'> {}

/**
 * What the picked day holds, written out beside the grid: a `DayGrid.Title`
 * over a `DayGrid.Description`. Read out politely each time the pick changes.
 */
function DayGridCaption({ className, render, ...props }: DayGridCaptionProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      { 'aria-live': 'polite', 'data-slot': 'day-grid-caption', className: dayGridVariants().caption({ className }) },
      props
    ),
  });
}
DayGridCaption.displayName = 'DayGrid.Caption';

export interface DayGridTitleProps extends ComponentProps<'p'> {}

/** The picked day's figure: "17 merged". */
function DayGridTitle({ className, render, ...props }: DayGridTitleProps & RenderProp<'p'>) {
  return useRender({
    defaultTagName: 'p',
    render,
    props: mergeProps({ 'data-slot': 'day-grid-title', className: dayGridVariants().title({ className }) }, props),
  });
}
DayGridTitle.displayName = 'DayGrid.Title';

export interface DayGridDescriptionProps extends ComponentProps<'p'> {}

/** The picked day's date, quieter, under its figure. */
function DayGridDescription({ className, render, ...props }: DayGridDescriptionProps & RenderProp<'p'>) {
  return useRender({
    defaultTagName: 'p',
    render,
    props: mergeProps(
      { 'data-slot': 'day-grid-description', className: dayGridVariants().description({ className }) },
      props
    ),
  });
}
DayGridDescription.displayName = 'DayGrid.Description';

export const DayGrid = Object.assign(DayGridRoot, {
  Legend: DayGridLegend,
  Weekdays: DayGridWeekdays,
  Caption: DayGridCaption,
  Title: DayGridTitle,
  Description: DayGridDescription,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export { DayGridLegend, DayGridWeekdays, DayGridCaption, DayGridTitle, DayGridDescription };
