'use client';

/**
 * BarPicker — a short run of values as columns of lights, one column picked.
 *
 * ```tsx
 * <BarPicker data={week} value={day} onValueChange={setDay} />
 * ```
 *
 * ## A column is a stack of lights
 *
 * Each value is drawn as a column of segments, lit from the bottom up to the
 * value, the way a level meter shows loudness. The unlit segments stay as
 * faint outlines of themselves, so every column is the same height and how
 * full it is can be judged against its own top without an axis.
 *
 * ## The picked column is the bright one
 *
 * It is lit at full strength with a glow on its highest segment, and it is
 * wider than the others. The rest are the same colour, held back. Picking
 * another column lights it from the bottom, one segment after the next.
 *
 * ## A choice, not a chart
 *
 * It behaves like a row of radio buttons. Exactly one column is picked, and
 * the arrow keys walk along the row. The figure for the picked column is
 * yours to show beside it, large: a column of eight lights cannot be read to
 * the unit, but one number can.
 */
import { useEffect, useRef, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export interface BarPickerBar {
  /** Written under the column: "Mon", "W3". Keep it to a few characters. */
  label: ReactNode;
  value: number;
  /** The long form, for a screen reader: "Monday". Defaults to the label. */
  name?: string;
}

/** Which of the theme's roles the lights are drawn in. */
export type BarPickerColor = 'primary' | 'info' | 'success' | 'warning' | 'destructive';

const barPickerVariants = tv({
  slots: {
    root: 'flex w-full items-end gap-1.5',
    column:
      'group flex min-w-0 cursor-pointer flex-col items-stretch gap-2.5 rounded-lg outline-none transition-[flex-grow] duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background motion-reduce:transition-none',
    // Stacked from the bottom, so the first segment in the markup is the
    // lowest light.
    stack: 'flex h-28 flex-col-reverse gap-[3px]',
    segment:
      'min-h-0 flex-1 rounded-[5px] transition-[background-color,box-shadow,opacity] duration-300 motion-reduce:transition-none',
    label: 'truncate text-center text-xs text-muted-foreground transition-colors',
  },
  variants: {
    color: {
      primary: { root: '[--pu-color:var(--primary)]' },
      info: { root: '[--pu-color:var(--info)]' },
      success: { root: '[--pu-color:var(--success)]' },
      warning: { root: '[--pu-color:var(--warning)]' },
      destructive: { root: '[--pu-color:var(--destructive)]' },
    },
    selected: {
      true: { column: 'flex-[1.5]', label: 'font-medium text-foreground' },
      false: { column: 'flex-1' },
    },
    /** What one segment is doing. */
    light: {
      off: { segment: 'bg-muted' },
      // Lit in a column that is not picked: the colour, held back.
      dim: {
        segment:
          'bg-[color-mix(in_oklab,var(--pu-color)_26%,transparent)] group-hover:bg-[color-mix(in_oklab,var(--pu-color)_48%,transparent)]',
      },
      on: { segment: 'bg-[var(--pu-color)]' },
      // The highest light of the picked column.
      peak: {
        segment: 'bg-[var(--pu-color)] shadow-[0_0_16px_color-mix(in_oklab,var(--pu-color)_65%,transparent)]',
      },
    },
  },
});

export interface BarPickerProps extends Omit<
  ComponentProps<'div'>,
  'children' | 'onChange' | 'defaultValue' | 'color'
> {
  /** The columns, left to right. */
  data: BarPickerBar[];
  /** The value a fully lit column stands for. Defaults to the largest in `data`. */
  max?: number;
  /** The index of the picked column, when the caller holds it. */
  value?: number;
  /** The index picked to begin with, when the caller does not hold it. */
  defaultValue?: number;
  /** Called with the index of a column when it is picked. */
  onValueChange?: (index: number) => void;
  /** How many lights a column is made of. */
  segments?: number;
  /** Which of the theme's roles the lights are drawn in. */
  color?: BarPickerColor;
  /** Writes a value for a screen reader: "17 deploys". */
  formatValue?: (value: number) => string;
  /** What a screen reader calls the row. */
  label?: string;
}

/** Milliseconds between one light of a column coming on and the next. */
const STAGGER = 32;

export function BarPicker({
  data,
  max,
  value,
  defaultValue = 0,
  onValueChange,
  segments = 8,
  color = 'primary',
  formatValue = (bar) => String(bar),
  label = 'Values',
  className,
  render,
  ...props
}: BarPickerProps & RenderProp<'div'>) {
  const slots = barPickerVariants({ color });
  const [internal, setInternal] = useState(defaultValue);
  const picked = clampIndex(value ?? internal, data.length);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  // The columns start dark and light up once mounted, so they are seen
  // arriving.
  const [lit, setLit] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setLit(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const count = Math.max(1, Math.round(segments));
  const ceiling = max ?? Math.max(1, ...data.map((bar) => bar.value));

  const pick = (index: number) => {
    if (value === undefined) setInternal(index);
    onValueChange?.(index);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const forward = rtl ? -1 : 1;
    const moves: Record<string, number> = {
      ArrowLeft: index - forward,
      ArrowRight: index + forward,
      ArrowDown: index - 1,
      ArrowUp: index + 1,
      Home: 0,
      End: data.length - 1,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    // Round the ends, as a radio group does.
    const next = (target + data.length) % data.length;
    refs.current[next]?.focus();
    pick(next);
  };

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        role: 'radiogroup',
        'aria-label': label,
        className: slots.root({ className }),
        children: (
          <>
            {data.map((bar, index) => {
              const selected = index === picked;
              const part = barPickerVariants({ selected });
              const name = bar.name ?? (typeof bar.label === 'string' ? bar.label : `Bar ${index + 1}`);
              // How many lights the value reaches. Any value above zero lights at
              // least one, so a small value is a mark and not an empty column.
              const share = Math.min(1, Math.max(0, bar.value / ceiling));
              const reached = !lit || bar.value <= 0 ? 0 : Math.max(1, Math.round(share * count));
              return (
                <button
                  key={index}
                  ref={(node) => {
                    refs.current[index] = node;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${name}: ${formatValue(bar.value)}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => pick(index)}
                  onKeyDown={(event) => onKeyDown(event, index)}
                  className={part.column()}
                >
                  <span className={slots.stack()}>
                    {Array.from({ length: count }, (_, level) => {
                      const on = level < reached;
                      const light = !on ? 'off' : !selected ? 'dim' : level === reached - 1 ? 'peak' : 'on';
                      return (
                        <span
                          key={level}
                          className={barPickerVariants({ light }).segment()}
                          style={{
                            // Bottom first, so a column is seen filling upwards.
                            transitionDelay: on ? `${level * STAGGER}ms` : undefined,
                            // The picked column brightens towards its top.
                            opacity:
                              light === 'on' ? Number((0.5 + 0.5 * ((level + 1) / reached)).toFixed(3)) : undefined,
                          }}
                        />
                      );
                    })}
                  </span>
                  <span aria-hidden="true" className={part.label()}>
                    {bar.label}
                  </span>
                </button>
              );
            })}
          </>
        ),
      },
      props
    ),
  });
}
BarPicker.displayName = 'BarPicker';

function clampIndex(index: number, length: number): number {
  if (length === 0) return 0;
  return Math.min(length - 1, Math.max(0, index));
}
