'use client';

/**
 * Micro — a pill that holds one small reading or one small control.
 *
 * ```tsx
 * <Micro>
 *   <Micro.Text value="48.2k" label="views · 7 days" />
 *   <Micro.Spark values={[3, 5, 4, 6, 7, 6, 9]} />
 *   <Micro.Delta value={12} />
 * </Micro>
 *
 * <Micro>
 *   <Micro.Label>Speed</Micro.Label>
 *   <Micro.Stepper value={speed} onValueChange={setSpeed} min={0.5} max={2} step={0.25} />
 * </Micro>
 * ```
 *
 * ## What it is for
 *
 * The readings and controls that sit around a piece of work rather than in a
 * form: a count with its trend, a percentage, a timecode with play and skip,
 * a speed, which track is playing, how far a render has got. Each is one pill
 * of the same height and the same surface, so a row of them reads as one
 * strip of instruments, and any one of them can stand alone in a toolbar or a
 * card's corner.
 *
 * ## Parts, not presets
 *
 * A pill is put together from parts in the order they are written: text, a
 * spark of bars, a ring, a change, round buttons, a segmented choice, a
 * stepper, a progress of ticks, a switch, a key cap, faces, a field. The pill
 * pulls its padding in at an end that starts or finishes with a round button,
 * so the button's circle sits concentric with the pill's.
 *
 * ## Small motion, once
 *
 * Bars rise when the spark first shows, the ring sweeps to its value, digits
 * roll in the stepper, the segment marker slides, ticks fill as progress is
 * made and the pulse glyph beats. Each moves only when its value changes, and
 * not at all when reduced motion is asked for.
 *
 * ## Tones
 *
 * Bars, rings, ticks and the pulse are drawn in the text's colour unless a
 * `tone` says otherwise: `info`, `success`, `warning` or `destructive`, from
 * the theme. Use a tone for what a reading means, not to decorate it.
 */
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ComponentProps, KeyboardEvent, ReactNode } from 'react';
import { tv } from 'tailwind-variants';
import { RollingNumber } from '../rolling-number';
import { Switch, type SwitchProps } from '../switch';

export type MicroTone = 'default' | 'info' | 'success' | 'warning' | 'destructive';
export type MicroSize = 'sm' | 'md';

const TONE: Record<MicroTone, string> = {
  default: 'var(--foreground)',
  info: 'var(--info)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  destructive: 'var(--destructive)',
};

const TONE_TEXT: Record<MicroTone, string> = {
  default: 'text-foreground',
  info: 'text-info-foreground',
  success: 'text-success-foreground',
  warning: 'text-warning-foreground',
  destructive: 'text-destructive-foreground',
};

const EASE = 'ease-[cubic-bezier(0.23,1,0.32,1)]';

const microVariants = tv({
  slots: {
    root: [
      'group/micro inline-flex shrink-0 items-center rounded-full bg-card text-sm text-foreground shadow-xs ring-1 ring-foreground/[0.07]',
      'dark:bg-[color-mix(in_oklab,var(--card),white_3%)] dark:ring-foreground/[0.06]',
      // An end that is a round button is pulled in, so its circle sits concentric with the pill.
      'has-[>[data-slot=micro-button]:first-child]:ps-[var(--micro-inset)] has-[>[data-slot=micro-segments]:first-child]:ps-[var(--micro-inset)]',
      'has-[>[data-slot=micro-button]:last-child]:pe-[var(--micro-inset)] has-[>[data-slot=micro-segments]:last-child]:pe-[var(--micro-inset)]',
      'has-[>[data-slot=micro-kbd]:last-child]:pe-[var(--micro-inset)] has-[>[data-slot=micro-switch]:last-child]:pe-[calc(var(--micro-inset)+0.125rem)]',
      'has-[>[data-slot=micro-ring]:first-child]:ps-[var(--micro-inset)] has-[>[data-slot=micro-faces]:first-child]:ps-[var(--micro-inset)]',
    ],
    text: 'flex min-w-0 flex-col leading-tight',
    value: 'truncate font-medium tabular-nums tracking-[-0.01em]',
    label: 'truncate text-xs text-muted-foreground',
    plain: 'shrink-0 text-muted-foreground',
    mono: 'shrink-0 font-mono tabular-nums tracking-tight',
    spark: 'flex shrink-0 items-end gap-[2px]',
    bar: [
      'w-[3px] origin-bottom rounded-full bg-foreground/20',
      `transition-[scale,background-color,height] duration-500 ${EASE} starting:scale-y-0 motion-reduce:transition-none`,
    ],
    ring: 'relative inline-flex shrink-0 items-center justify-center',
    delta: 'inline-flex shrink-0 items-center gap-0.5 text-xs font-medium tabular-nums [&_svg]:size-3',
    button: [
      'inline-flex shrink-0 items-center justify-center rounded-full bg-muted text-foreground outline-none',
      'transition-[background-color,scale,color] duration-150 hover:bg-foreground/10 active:scale-90',
      'focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40',
      'aria-pressed:bg-foreground aria-pressed:text-background',
      'motion-reduce:transition-none [&_svg]:size-4 [&_svg]:shrink-0',
    ],
    ghost: 'bg-transparent hover:bg-muted',
    separator: 'h-5 w-px shrink-0 bg-border',
    segments: 'relative isolate flex shrink-0 items-center',
    segmentMarker: [
      'absolute inset-y-0 -z-10 rounded-full bg-muted shadow-xs ring-1 ring-foreground/[0.06]',
      `transition-[left,width] duration-300 ${EASE} motion-reduce:transition-none`,
    ],
    segment: [
      'relative inline-flex h-full shrink-0 items-center justify-center rounded-full px-3.5 text-sm text-muted-foreground outline-none',
      'transition-colors duration-200 hover:text-foreground aria-checked:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
      '[&_svg]:size-4',
    ],
    stepper: 'flex shrink-0 items-center gap-1.5',
    stepperValue: 'min-w-[3.25ch] text-center font-mono text-sm tabular-nums',
    progress: 'flex min-w-0 flex-col gap-1.5',
    progressHead: 'flex items-baseline gap-2 leading-none',
    ticks: 'flex items-center gap-[3px]',
    tick: [
      'h-1 w-3 shrink-0 rounded-full bg-foreground/12',
      `transition-[background-color,width] duration-500 ${EASE} motion-reduce:transition-none`,
    ],
    kbd: 'inline-flex h-7 shrink-0 items-center rounded-full bg-muted px-2.5 font-mono text-xs text-muted-foreground ring-1 ring-foreground/[0.06]',
    faces: 'flex shrink-0 items-center -space-x-2',
    face: [
      // Opaque, so where two overlap one sits in front and nothing shows
      // through; the muted token is translucent and cannot be used here.
      'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full text-[0.625rem] font-semibold text-muted-foreground ring-2 ring-card',
      'bg-[color-mix(in_oklab,var(--muted-foreground)_16%,var(--card))] dark:bg-[color-mix(in_oklab,var(--muted-foreground)_24%,var(--card))]',
      'dark:ring-[color-mix(in_oklab,var(--card),white_3%)] [&_img]:size-full [&_img]:object-cover',
    ],
    input: 'h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground',
    pulse:
      'shrink-0 [&_path]:[stroke-dasharray:40] [&_path]:animate-[micro-pulse_1.6s_ease-in-out_infinite] motion-reduce:[&_path]:animate-none',
  },
  variants: {
    size: {
      sm: { root: 'h-10 gap-2.5 px-3.5 [--micro-inset:0.25rem]', button: 'size-8', segments: 'h-8' },
      md: { root: 'h-12 gap-3 px-4 [--micro-inset:0.375rem]', button: 'size-9', segments: 'h-9' },
    },
  },
  defaultVariants: { size: 'md' },
});

const SizeContext = createContext<MicroSize>('md');

export interface MicroProps extends ComponentProps<'div'> {
  /** `sm` is 40px tall, `md` 48px. Default `md`. */
  size?: MicroSize;
}

/** The pill. Put the parts in it in the order they read. */
function MicroRoot({ size = 'md', className, ...props }: MicroProps) {
  return (
    <SizeContext.Provider value={size}>
      <div data-slot="micro" data-size={size} className={microVariants({ size }).root({ className })} {...props} />
    </SizeContext.Provider>
  );
}
MicroRoot.displayName = 'Micro';

export interface MicroTextProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** The reading, on the first line: "48.2k", "68%". */
  value?: ReactNode;
  /** What it is, on the second line, muted: "views · 7 days". */
  label?: ReactNode;
}

/** A value over a muted line saying what it is. */
function MicroText({ value, label, className, ...props }: MicroTextProps) {
  const slots = microVariants();
  return (
    <span data-slot="micro-text" className={slots.text({ className })} {...props}>
      {value != null ? <span className={slots.value()}>{value}</span> : null}
      {label != null ? <span className={slots.label()}>{label}</span> : null}
    </span>
  );
}
MicroText.displayName = 'Micro.Text';

export interface MicroLabelProps extends ComponentProps<'span'> {}

/** A word on one line, muted: "Speed", "credits". */
function MicroLabel({ className, ...props }: MicroLabelProps) {
  return <span data-slot="micro-label" className={microVariants().plain({ className })} {...props} />;
}
MicroLabel.displayName = 'Micro.Label';

export interface MicroMonoProps extends ComponentProps<'span'> {
  /** `muted` for the second half of a pair, like a duration after the time played. */
  muted?: boolean;
}

/** A reading in mono figures, for times and counts that change in place: "00:14". */
function MicroMono({ muted, className, ...props }: MicroMonoProps) {
  return (
    <span
      data-slot="micro-mono"
      className={microVariants().mono({ className: [muted && 'text-muted-foreground/70', className] })}
      {...props}
    />
  );
}
MicroMono.displayName = 'Micro.Mono';

export interface MicroSparkProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** The values, oldest first. The last is drawn in the tone. */
  values: readonly number[];
  /** The colour of the last bar. Default `default`, the text's colour. */
  tone?: MicroTone;
  /** How tall the tallest bar is, in px. Default `20`. */
  height?: number;
}

/** A run of thin bars, the newest in the tone. They rise when first shown. */
function MicroSpark({ values, tone = 'default', height = 20, className, ...props }: MicroSparkProps) {
  const slots = microVariants();
  const max = Math.max(...values, 1);
  return (
    <span
      data-slot="micro-spark"
      aria-hidden="true"
      className={slots.spark({ className })}
      style={{ height }}
      {...props}
    >
      {values.map((value, index) => (
        <span
          key={index}
          className={slots.bar()}
          style={{
            height: `${Math.max(12, (value / max) * 100)}%`,
            transitionDelay: `${index * 30}ms`,
            background: index === values.length - 1 ? TONE[tone] : undefined,
          }}
        />
      ))}
    </span>
  );
}
MicroSpark.displayName = 'Micro.Spark';

export interface MicroRingProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** How full it is, from 0 to 100. */
  value: number;
  /** The arc's colour. Default `default`. */
  tone?: MicroTone;
  /** Its diameter, in px. Default `32`, or `26` in a small pill. */
  diameter?: number;
  /** What a screen reader says it is: "lip-sync". It is read with the value. */
  label?: string;
}

/** A ring that sweeps to its value. */
function MicroRing({ value, tone = 'default', diameter, label, className, ...props }: MicroRingProps) {
  const size = useContext(SizeContext);
  const d = diameter ?? (size === 'sm' ? 26 : 32);
  const stroke = d > 28 ? 3.5 : 3;
  const r = (d - stroke) / 2;
  const length = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, value));
  // Starts empty, then sweeps to the value on the next frame.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(clamped));
    return () => cancelAnimationFrame(frame);
  }, [clamped]);
  return (
    <span
      data-slot="micro-ring"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={label}
      className={microVariants().ring({ className })}
      style={{ width: d, height: d }}
      {...props}
    >
      <svg viewBox={`0 0 ${d} ${d}`} width={d} height={d} className="-rotate-90" aria-hidden="true">
        <circle
          cx={d / 2}
          cy={d / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.12"
          strokeWidth={stroke}
        />
        <circle
          cx={d / 2}
          cy={d / 2}
          r={r}
          fill="none"
          stroke={TONE[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(length * shown) / 100} ${length}`}
          className="transition-[stroke-dasharray] duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
        />
      </svg>
    </span>
  );
}
MicroRing.displayName = 'Micro.Ring';

export interface MicroDeltaProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** The change, as a number: `12` for +12%. */
  value: number;
  /** What follows the number. Default `%`. */
  unit?: string;
  /** Its colour. Default `success` when up, `destructive` when down, muted when flat. */
  tone?: MicroTone;
  /** Draw a fall as good, as for latency or cost. Swaps the default tones. */
  inverted?: boolean;
}

/** A change with its sign and an arrow, coloured for whether it is good. */
function MicroDelta({ value, unit = '%', tone, inverted, className, ...props }: MicroDeltaProps) {
  const good = inverted ? value < 0 : value > 0;
  const resolved: MicroTone = tone ?? (value === 0 ? 'default' : good ? 'success' : 'destructive');
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return (
    <span
      data-slot="micro-delta"
      className={microVariants().delta({
        className: [value === 0 && !tone ? 'text-muted-foreground' : TONE_TEXT[resolved], className],
      })}
      {...props}
    >
      {value !== 0 ? (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={value < 0 ? 'rotate-180' : undefined}
        >
          <path d="M12 19V5M6 11l6-6 6 6" />
        </svg>
      ) : null}
      {sign}
      {Math.abs(value)}
      {unit}
    </span>
  );
}
MicroDelta.displayName = 'Micro.Delta';

export interface MicroButtonProps extends ComponentProps<'button'> {
  /** `solid` sits on a filled circle; `ghost` shows its circle only when pointed at. Default `solid`. */
  variant?: 'solid' | 'ghost';
}

/**
 * A round button. At either end of the pill it is pulled in to sit
 * concentric with it. Give it an `aria-label` when it holds only a glyph;
 * `aria-pressed` fills it.
 */
function MicroButton({ variant = 'solid', className, type = 'button', ...props }: MicroButtonProps) {
  const size = useContext(SizeContext);
  const slots = microVariants({ size });
  return (
    <button
      type={type}
      data-slot="micro-button"
      className={slots.button({ className: [variant === 'ghost' && slots.ghost(), className] })}
      {...props}
    />
  );
}
MicroButton.displayName = 'Micro.Button';

export interface MicroSeparatorProps extends ComponentProps<'span'> {}

/** A short upright rule between two groups. */
function MicroSeparator({ className, ...props }: MicroSeparatorProps) {
  return (
    <span
      data-slot="micro-separator"
      aria-hidden="true"
      className={microVariants().separator({ className })}
      {...props}
    />
  );
}
MicroSeparator.displayName = 'Micro.Separator';

interface SegmentsContextValue {
  value: string;
  select: (value: string) => void;
  register: (value: string, element: HTMLButtonElement | null) => void;
}

const SegmentsContext = createContext<SegmentsContextValue | null>(null);

export interface MicroSegmentsProps extends Omit<ComponentProps<'div'>, 'onChange' | 'defaultValue'> {
  /** The chosen segment's `value`, when the caller holds it. */
  value?: string;
  /** The segment chosen first, when the caller does not hold it. */
  defaultValue?: string;
  /** Called with the new segment's `value`. */
  onValueChange?: (value: string) => void;
  /** What a screen reader calls the choice: "Track". */
  'aria-label'?: string;
}

/** A choice of a few, with a marker that slides to the chosen one. */
function MicroSegments({ value, defaultValue, onValueChange, className, children, ...props }: MicroSegmentsProps) {
  const size = useContext(SizeContext);
  const slots = microVariants({ size });
  const [inner, setInner] = useState(defaultValue ?? '');
  const current = value ?? inner;
  const elements = useRef(new Map<string, HTMLButtonElement>());
  const [marker, setMarker] = useState<{ left: number; width: number } | null>(null);
  const [moved, setMoved] = useState(false);

  const select = (next: string) => {
    if (value === undefined) setInner(next);
    onValueChange?.(next);
    setMoved(true);
  };

  useLayoutEffect(() => {
    const element = elements.current.get(current);
    if (element) setMarker({ left: element.offsetLeft, width: element.offsetWidth });
  }, [current, children]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = Array.from(elements.current.keys());
    const index = keys.indexOf(current);
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (!step || keys.length === 0) return;
    event.preventDefault();
    const direction =
      getComputedStyle(event.currentTarget).direction === 'rtl' &&
      event.key.startsWith('Arrow') &&
      (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
        ? -step
        : step;
    const next = keys[(index + direction + keys.length) % keys.length]!;
    select(next);
    elements.current.get(next)?.focus();
  };

  return (
    <SegmentsContext.Provider
      value={{
        value: current,
        select,
        register: (key, element) => {
          if (element) elements.current.set(key, element);
          else elements.current.delete(key);
        },
      }}
    >
      <div
        data-slot="micro-segments"
        role="radiogroup"
        onKeyDown={onKeyDown}
        className={slots.segments({ className })}
        {...props}
      >
        {marker ? (
          <span
            aria-hidden="true"
            className={slots.segmentMarker({ className: moved ? undefined : 'transition-none' })}
            style={{ left: marker.left, width: marker.width }}
          />
        ) : null}
        {children}
      </div>
    </SegmentsContext.Provider>
  );
}
MicroSegments.displayName = 'Micro.Segments';

export interface MicroSegmentProps extends Omit<ComponentProps<'button'>, 'value'> {
  /** What choosing it sets. */
  value: string;
}

/** One choice in `Micro.Segments`. */
function MicroSegment({ value, className, onClick, ...props }: MicroSegmentProps) {
  const context = useContext(SegmentsContext);
  if (!context) throw new Error('Micro.Segment must be inside Micro.Segments.');
  const checked = context.value === value;
  return (
    <button
      ref={(element) => context.register(value, element)}
      type="button"
      role="radio"
      aria-checked={checked}
      tabIndex={checked ? 0 : -1}
      data-slot="micro-segment"
      className={microVariants().segment({ className })}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) context.select(value);
      }}
      {...props}
    />
  );
}
MicroSegment.displayName = 'Micro.Segment';

export interface MicroStepperProps extends Omit<ComponentProps<'div'>, 'onChange' | 'defaultValue'> {
  /** The number, when the caller holds it. */
  value?: number;
  /** The number to start at, when the caller does not hold it. Default `min`. */
  defaultValue?: number;
  /** Called with the new number. */
  onValueChange?: (value: number) => void;
  /** The lowest it goes. Default `0`. */
  min?: number;
  /** The highest it goes. Default `100`. */
  max?: number;
  /** How far one press moves it. Default `1`. */
  step?: number;
  /** How it is written, passed to `Intl.NumberFormat`. */
  format?: Intl.NumberFormatOptions;
  /** Written after the number: `×`, ` px`. */
  suffix?: string;
  /** What a screen reader calls it: "Playback speed". */
  label?: string;
}

/** A number between a minus and a plus, its digits rolling as it changes. Arrow keys move it too. */
function MicroStepper({
  value,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  format,
  suffix,
  label,
  className,
  ...props
}: MicroStepperProps) {
  const size = useContext(SizeContext);
  const slots = microVariants({ size });
  const [inner, setInner] = useState(defaultValue ?? min);
  const current = value ?? inner;
  const set = (next: number) => {
    const clamped = Math.min(max, Math.max(min, Math.round(next / step) * step));
    const fixed = Number(clamped.toFixed(6));
    if (fixed === current) return;
    if (value === undefined) setInner(fixed);
    onValueChange?.(fixed);
  };
  const decimals = (String(step).split('.')[1] ?? '').length;
  return (
    <div
      data-slot="micro-stepper"
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={current}
      aria-valuetext={`${current}${suffix ?? ''}`}
      onKeyDown={(event) => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowRight') set(current + step);
        else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') set(current - step);
        else if (event.key === 'Home') set(min);
        else if (event.key === 'End') set(max);
        else return;
        event.preventDefault();
      }}
      className={slots.stepper({
        className: ['rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring', className],
      })}
      {...props}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Less"
        disabled={current <= min}
        onClick={() => set(current - step)}
        className={slots.button()}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M6 12h12" />
        </svg>
      </button>
      <span className={slots.stepperValue()}>
        <RollingNumber
          value={current}
          format={format ?? { minimumFractionDigits: decimals, maximumFractionDigits: decimals }}
        />
        {suffix}
      </span>
      <button
        type="button"
        tabIndex={-1}
        aria-label="More"
        disabled={current >= max}
        onClick={() => set(current + step)}
        className={slots.button()}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M12 6v12M6 12h12" />
        </svg>
      </button>
    </div>
  );
}
MicroStepper.displayName = 'Micro.Stepper';

export interface MicroProgressProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** How many are done. */
  value: number;
  /** How many there are. One tick each, up to 16; past that the ticks stand for a share each. */
  max: number;
  /** What is being done: "Rendering". */
  label?: ReactNode;
  /** The ticks' colour when done. Default `default`. */
  tone?: MicroTone;
}

/** A label with a count over a row of ticks that fill as the work is done. */
function MicroProgress({ value, max, label, tone = 'default', className, ...props }: MicroProgressProps) {
  const slots = microVariants();
  const count = Math.min(max, 16);
  const filled = Math.round((Math.min(value, max) / Math.max(max, 1)) * count);
  return (
    <div
      data-slot="micro-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={typeof label === 'string' ? label : undefined}
      className={slots.progress({ className })}
      {...props}
    >
      {label != null ? (
        <span className={slots.progressHead()}>
          <span className="text-sm font-medium">{label}</span>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {value}/{max}
          </span>
        </span>
      ) : null}
      <span className={slots.ticks()} aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <span
            key={index}
            className={slots.tick({
              className: index === filled && filled < count ? 'w-4 bg-foreground/35' : undefined,
            })}
            style={index < filled ? { background: TONE[tone] } : undefined}
          />
        ))}
      </span>
    </div>
  );
}
MicroProgress.displayName = 'Micro.Progress';

export interface MicroSwitchProps extends Omit<SwitchProps, 'size'> {}

/** A switch sized for the pill. Put a `Micro.Text` beside it for what it turns on. */
function MicroSwitch({ className, ...props }: MicroSwitchProps) {
  const size = useContext(SizeContext);
  return (
    <span data-slot="micro-switch" className="inline-flex shrink-0">
      <Switch size={size === 'sm' ? 'sm' : 'md'} className={className} {...props} />
    </span>
  );
}
MicroSwitch.displayName = 'Micro.Switch';

export interface MicroKbdProps extends ComponentProps<'kbd'> {}

/** A key or a chord in a cap: "⌘K". */
function MicroKbd({ className, ...props }: MicroKbdProps) {
  return <kbd data-slot="micro-kbd" className={microVariants().kbd({ className })} {...props} />;
}
MicroKbd.displayName = 'Micro.Kbd';

export interface MicroFace {
  /** Who it is: gives the initials and what a screen reader reads. */
  name: string;
  /** A picture. Without it, the initials show. */
  src?: string;
}

export interface MicroFacesProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** The people, in order. Four show; the rest are counted. */
  people: readonly MicroFace[];
}

/** Overlapping faces, such as who approved or who is here. */
function MicroFaces({ people, className, ...props }: MicroFacesProps) {
  const size = useContext(SizeContext);
  const slots = microVariants();
  const shown = people.slice(0, 4);
  const rest = people.length - shown.length;
  const d = size === 'sm' ? 'size-7' : 'size-8';
  return (
    <span
      data-slot="micro-faces"
      role="img"
      aria-label={people.map((person) => person.name).join(', ')}
      className={slots.faces({ className })}
      {...props}
    >
      {shown.map((person) => (
        <span key={person.name} className={slots.face({ className: d })}>
          {person.src ? (
            <img src={person.src} alt="" />
          ) : (
            person.name
              .split(/\s+/)
              .map((part) => part[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
          )}
        </span>
      ))}
      {rest > 0 ? <span className={slots.face({ className: d })}>+{rest}</span> : null}
    </span>
  );
}
MicroFaces.displayName = 'Micro.Faces';

export interface MicroInputProps extends ComponentProps<'input'> {}

/** A bare field that takes the pill's remaining width. Give it an `aria-label`. */
function MicroInput({ className, ...props }: MicroInputProps) {
  return <input data-slot="micro-input" className={microVariants().input({ className })} {...props} />;
}
MicroInput.displayName = 'Micro.Input';

export interface MicroPulseProps extends Omit<ComponentProps<'svg'>, 'children'> {
  /** Its colour. Default `default`. */
  tone?: MicroTone;
  /** Whether it beats. Default `true`. */
  live?: boolean;
}

/** A heartbeat line, beating while `live`, for a reading taken continuously. */
function MicroPulse({ tone = 'default', live = true, className, style, ...props }: MicroPulseProps) {
  return (
    <svg
      data-slot="micro-pulse"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill="none"
      stroke={TONE[tone]}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={microVariants().pulse({ className: [!live && '[&_path]:animate-none', className] })}
      style={style}
      {...props}
    >
      <style>{'@keyframes micro-pulse{0%{stroke-dashoffset:40}45%,100%{stroke-dashoffset:0}}'}</style>
      <path d="M2 12h4l2.5-6 4 12 3-9 1.5 3H22" />
    </svg>
  );
}
MicroPulse.displayName = 'Micro.Pulse';

export const Micro = Object.assign(MicroRoot, {
  Text: MicroText,
  Label: MicroLabel,
  Mono: MicroMono,
  Spark: MicroSpark,
  Ring: MicroRing,
  Delta: MicroDelta,
  Button: MicroButton,
  Separator: MicroSeparator,
  Segments: MicroSegments,
  Segment: MicroSegment,
  Stepper: MicroStepper,
  Progress: MicroProgress,
  Switch: MicroSwitch,
  Kbd: MicroKbd,
  Faces: MicroFaces,
  Input: MicroInput,
  Pulse: MicroPulse,
});

export {
  MicroText,
  MicroLabel,
  MicroMono,
  MicroSpark,
  MicroRing,
  MicroDelta,
  MicroButton,
  MicroSeparator,
  MicroSegments,
  MicroSegment,
  MicroStepper,
  MicroProgress,
  MicroSwitch,
  MicroKbd,
  MicroFaces,
  MicroInput,
  MicroPulse,
};
