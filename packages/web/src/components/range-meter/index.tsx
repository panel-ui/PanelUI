'use client';

/**
 * RangeMeter — where a reading sits between its lowest and its highest, on a
 * ruler of ticks that rises under the value.
 *
 * ```tsx
 * <RangeMeter.Label>Response time</RangeMeter.Label>
 * <RangeMeter min={80} max={600} value={time} onValueChange={setTime} marker={300} />
 * <RangeMeter.Scale start="80 ms" end="600 ms" />
 * ```
 *
 * ## The ruler swells where the reading is
 *
 * The track is a row of ticks. The ones up to the reading are lit, and the
 * ticks round the reading stand taller, falling away on either side, so the
 * value is a rise in the ruler and not a knob sitting on a line. Dragging
 * moves the rise along, and the ticks it leaves settle back behind it.
 *
 * ## The number rides above
 *
 * The value is written in a tag over the rise, so the place on the ruler and
 * the figure are one thing to read. The tag is hung from the point it marks
 * in proportion to how far along that point is: from its left edge at the low
 * end, its middle half way, its right edge at the high end. It is always over
 * the reading and never outside the ruler.
 *
 * ## A reading or a control
 *
 * With `onValueChange` it is a slider: drag it, or use the arrow keys. Without
 * it, the same drawing is a meter that shows a value and cannot be moved.
 * Either way a screen reader is given the value and the range it is in.
 *
 * ## The colour is the theme's
 *
 * `color` names one of the theme's roles. Changing it as the value crosses a
 * threshold is how a meter says the reading has gone from fine to not.
 */
import {
  useCallback,
  useRef,
  type ComponentProps,
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

/** Which of the theme's roles the lit ticks and the tag are drawn in. */
export type RangeMeterColor = 'primary' | 'info' | 'success' | 'warning' | 'destructive';

const rangeMeterVariants = tv({
  slots: {
    // Room above the ruler for the tag, so the tag is inside the control's
    // own box and cannot be clipped by whatever the meter sits in.
    root: 'relative w-full touch-none select-none rounded-lg pt-9 outline-none rtl:[--pu-dir:-1] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background',
    ruler: 'relative flex h-10 items-end justify-between',
    tick: 'w-[3px] rounded-full transition-[height,background-color,opacity,box-shadow] duration-200 ease-out motion-reduce:transition-none',
    marker:
      'pointer-events-none absolute -bottom-2.5 size-1.5 -translate-x-1/2 rotate-45 rounded-[1px] bg-foreground rtl:translate-x-1/2',
    // Siblings of the meter, written beside it rather than inside it.
    label: 'text-sm font-medium',
    scale: 'flex justify-between text-xs text-muted-foreground',
    tag: 'pointer-events-none absolute top-0 flex h-7 items-center gap-1 whitespace-nowrap rounded-full bg-[var(--pu-color)] px-2.5 text-xs font-semibold tabular-nums text-[var(--pu-on-color)] shadow-[0_6px_18px_-4px_color-mix(in_oklab,var(--pu-color)_70%,transparent)] transition-[background-color,box-shadow,scale] duration-200 motion-reduce:transition-none [&_svg]:size-3.5 [&_svg]:shrink-0',
  },
  variants: {
    /*
     * A role and what is written on it. `primary` has a partner in every
     * theme. The status roles are mid-tones, light enough that the theme
     * writes on them in near-black whether the page is light or dark.
     */
    color: {
      primary: { root: '[--pu-color:var(--primary)] [--pu-on-color:var(--primary-foreground)]' },
      info: { root: '[--pu-color:var(--info)] [--pu-on-color:var(--color-neutral-900)]' },
      success: { root: '[--pu-color:var(--success)] [--pu-on-color:var(--color-neutral-900)]' },
      warning: { root: '[--pu-color:var(--warning)] [--pu-on-color:var(--color-neutral-900)]' },
      destructive: {
        root: '[--pu-color:var(--destructive)] [--pu-on-color:var(--color-neutral-900)]',
      },
    },
    lit: {
      true: { tick: 'bg-[var(--pu-color)]' },
      false: { tick: 'bg-muted-foreground/25' },
    },
    // The tick the reading is on, which is the top of the rise.
    crest: {
      true: {
        tick: 'shadow-[0_0_10px_color-mix(in_oklab,var(--pu-color)_70%,transparent)]',
      },
    },
    // The marker hangs under the ruler, and the control makes room for it.
    marked: {
      true: { root: 'pb-4' },
    },
    interactive: {
      true: { root: 'cursor-grab active:cursor-grabbing active:[&_[data-tag]]:scale-110' },
    },
  },
});

export interface RangeMeterProps extends Omit<ComponentProps<'div'>, 'onChange' | 'color'> {
  /** The low end of the ruler. */
  min?: number;
  /** The high end of the ruler. */
  max?: number;
  /** The reading: where the ruler rises and the number written above it. */
  value: number;
  /**
   * Called with the new value as the ruler is dragged or moved with the
   * keyboard. Passing this makes it a slider; without it, it is a meter.
   */
  onValueChange?: (value: number) => void;
  /** How much one arrow key press moves the value, and what a drag snaps to. */
  step?: number;
  /** A value to mark under the ruler, such as a target. */
  marker?: number;
  /** How many ticks the ruler is drawn with. */
  ticks?: number;
  /** Which of the theme's roles the lit ticks and the tag are drawn in. */
  color?: RangeMeterColor;
  /** Writes the number in the tag. Defaults to the value as it is. */
  formatValue?: (value: number) => ReactNode;
  /** What a screen reader calls it. */
  label?: string;
  /** What a screen reader says for the value: "240 milliseconds". */
  valueText?: string;
  /** Drawn in the tag before the number: an icon. */
  children?: ReactNode;
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** How many ticks either side of the reading the rise spreads over. */
const SPREAD = 2.6;
/** A resting tick's height, as a share of the ruler's. */
const REST = 0.34;

function RangeMeterRoot({
  min = 0,
  max = 100,
  value,
  onValueChange,
  step = 1,
  marker,
  ticks = 41,
  color = 'primary',
  formatValue,
  label = 'Reading',
  valueText,
  className,
  children,
  render,
  ...props
}: RangeMeterProps & RenderProp<'div'>) {
  const interactive = onValueChange !== undefined;
  const slots = rangeMeterVariants({ color, interactive, marked: marker !== undefined });
  const ruler = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const count = Math.max(2, Math.round(ticks));
  const span = max - min || 1;
  const share = clamp((value - min) / span, 0, 1);
  // Where the reading falls among the ticks, as a position between two of
  // them, so the rise slides along the ruler and does not hop tick to tick.
  const at = share * (count - 1);
  const crest = Math.round(at);

  // Rounded to the step's own precision, so 0.1 steps do not come back as
  // 0.30000000000000004.
  const places = (String(step).split('.')[1] ?? '').length;
  const settle = useCallback(
    (raw: number) => clamp(Number((Math.round(raw / step) * step).toFixed(places)), min, max),
    [step, places, min, max]
  );

  const fromPointer = useCallback(
    (clientX: number) => {
      const node = ruler.current;
      const box = node?.getBoundingClientRect();
      if (!node || !box || box.width === 0) return;
      const rtl = getComputedStyle(node).direction === 'rtl';
      const along = rtl ? box.right - clientX : clientX - box.left;
      onValueChange?.(settle(min + clamp(along / box.width, 0, 1) * span));
    },
    [min, span, settle, onValueChange]
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
    fromPointer(event.clientX);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragging.current) fromPointer(event.clientX);
  };

  const endDrag = () => {
    dragging.current = false;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const page = Math.max(step, Math.round(span / 10 / step) * step);
    const moves: Record<string, number> = {
      ArrowLeft: value + (rtl ? step : -step),
      ArrowRight: value + (rtl ? -step : step),
      ArrowDown: value - step,
      ArrowUp: value + step,
      PageDown: value - page,
      PageUp: value + page,
      Home: min,
      End: max,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onValueChange(clamp(Number(next.toFixed(places)), min, max));
  };

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        role: interactive ? 'slider' : 'meter',
        'aria-label': label,
        'aria-valuemin': min,
        'aria-valuemax': max,
        'aria-valuenow': value,
        'aria-valuetext': valueText,
        'aria-orientation': interactive ? 'horizontal' : undefined,
        tabIndex: interactive ? 0 : undefined,
        className: slots.root({ className }),
        onPointerDown: onPointerDown,
        onPointerMove: onPointerMove,
        onPointerUp: endDrag,
        onPointerCancel: endDrag,
        onKeyDown: onKeyDown,
        children: (
          <>
            <span
              data-tag=""
              className={slots.tag()}
              style={{
                insetInlineStart: `${(share * 100).toFixed(2)}%`,
                // Hung by the same share of its own width as the point is along the
                // ruler, which keeps it over the point and inside the ends.
                translate: `calc(${share.toFixed(4)} * -100% * var(--pu-dir, 1))`,
              }}
            >
              {children}
              {formatValue ? formatValue(value) : value}
            </span>

            <div ref={ruler} aria-hidden="true" className={slots.ruler()}>
              {Array.from({ length: count }, (_, index) => {
                const distance = (index - at) / SPREAD;
                // A bell: full height at the reading, resting height a few ticks out.
                const rise = Math.exp(-distance * distance);
                const lit = index <= at + 0.001;
                const part = rangeMeterVariants({ lit, crest: index === crest });
                return (
                  <span
                    key={index}
                    className={part.tick()}
                    style={{
                      // Rounded, so the server and the browser write the same
                      // string for it and the page hydrates without a mismatch.
                      height: `${((REST + (1 - REST) * rise) * 100).toFixed(1)}%`,
                      // Lit ticks brighten towards the reading, like a tail behind it.
                      opacity: lit
                        ? Number((0.35 + 0.65 * (crest === 0 ? 1 : Math.min(1, index / crest))).toFixed(3))
                        : undefined,
                    }}
                  />
                );
              })}
              {marker !== undefined ? (
                <span
                  className={slots.marker()}
                  style={{ insetInlineStart: `${(clamp((marker - min) / span, 0, 1) * 100).toFixed(2)}%` }}
                />
              ) : null}
            </div>
          </>
        ),
      },
      props
    ),
  });
}
RangeMeterRoot.displayName = 'RangeMeter';

export interface RangeMeterLabelProps extends ComponentProps<'p'> {}

/**
 * The meter's name, written over it. The meter's own `label` is what a screen
 * reader says; this is what everyone else reads.
 */
function RangeMeterLabel({ className, render, ...props }: RangeMeterLabelProps & RenderProp<'p'>) {
  return useRender({
    defaultTagName: 'p',
    render,
    props: mergeProps(
      { 'data-slot': 'range-meter-label', className: rangeMeterVariants().label({ className }) },
      props
    ),
  });
}
RangeMeterLabel.displayName = 'RangeMeter.Label';

export interface RangeMeterScaleProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** The word or figure at the low end. */
  start: ReactNode;
  /** The word or figure at the high end. */
  end: ReactNode;
}

/** What the two ends of the ruler stand for, written under it at either side. */
function RangeMeterScale({ start, end, className, render, ...props }: RangeMeterScaleProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'range-meter-scale',
        className: rangeMeterVariants().scale({ className }),
        children: (
          <>
            <span>{start}</span>
            <span>{end}</span>
          </>
        ),
      },
      props
    ),
  });
}
RangeMeterScale.displayName = 'RangeMeter.Scale';

export const RangeMeter = Object.assign(RangeMeterRoot, {
  Label: RangeMeterLabel,
  Scale: RangeMeterScale,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export { RangeMeterLabel, RangeMeterScale };
