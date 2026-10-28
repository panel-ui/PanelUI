'use client';

/**
 * Slider — a number chosen by dragging along a track, with its name and its
 * value written inside the track.
 *
 * ```tsx
 * <Slider label="Opacity" defaultValue={64} format={{ style: 'unit', unit: 'percent' }} />
 *
 * <Slider variant="line" label="Zoom" min={10} max={400} defaultValue={100}>
 *   <Slider.Step by={-10} aria-label="Zoom out"><MinusIcon /></Slider.Step>
 *   <Slider.Step by={10} aria-label="Zoom in"><PlusIcon /></Slider.Step>
 * </Slider>
 * ```
 *
 * ## The track is the label
 *
 * In a panel of settings, a column of sliders each with a label above and a
 * number beside is three things to line up per row. The `fill` slider puts
 * the name at the start of the track and the value at its end, so a row is
 * one bar the height of a button, and a stack of them reads as a table.
 *
 * ## It moves the way the hand does
 *
 * A press away from the handle glides the fill there on a curve with a
 * little overshoot; a drag follows the pointer exactly, with nothing
 * easing behind it. Pulled past either end, the track stretches a few
 * pixels towards the pointer and springs back on release, so the end of
 * the range is felt rather than hit.
 *
 * ## Two weights
 *
 * `fill` is the slider for a settings panel. `line` is a thin track with a
 * round knob, for a toolbar, where a zoom or a scrubber sits between two
 * buttons: `Slider.Step` is that button, and it moves the value by `by`.
 *
 * `origin="center"` fills from the middle out, for a value that can go
 * either way from nothing: exposure, a balance, a pitch shift.
 */
import { Slider as BaseSlider } from '@base-ui/react/slider';
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';

export type SliderVariant = 'fill' | 'line';
export type SliderSize = 'sm' | 'md' | 'lg';
export type SliderColor = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'destructive';

/** A glide with a little overshoot, for a press. A drag turns it off. */
const GLIDE = 'duration-[420ms] ease-[cubic-bezier(0.3,1.3,0.45,1)]';
/** How far the track gives past an end, at most, in pixels. */
const STRETCH = 8;
/** How far the pointer has to travel before a press counts as a drag. */
const DRAG_SLOP = 3;
/** Steps are marked when there are this many or fewer. */
const MAX_TICKS = 12;

const sliderVariants = tv({
  slots: {
    root: 'group/slider relative flex w-full min-w-0 items-center gap-1.5 data-disabled:opacity-50',
    control: [
      'relative min-w-0 flex-1 cursor-pointer touch-none select-none outline-none',
      'transition-[margin] duration-500 ease-[cubic-bezier(0.3,1.4,0.4,1)] data-stretching:duration-0',
      'data-disabled:cursor-not-allowed motion-reduce:transition-none',
    ],
    track: 'absolute overflow-hidden',
    fill: [
      'absolute inset-y-0 start-(--slider-start) w-(--slider-span)',
      `transition-[inset-inline-start,width] ${GLIDE} group-data-moving/slider:duration-0 motion-reduce:transition-none`,
    ],
    tick: 'pointer-events-none absolute -translate-x-1/2 rtl:translate-x-1/2',
    center: 'pointer-events-none absolute inset-y-1.5 start-1/2 w-px -translate-x-1/2 bg-foreground/20 rtl:translate-x-1/2',
    handle: [
      'pointer-events-none absolute top-1/2 start-(--slider-at) -translate-y-1/2',
      `transition-[inset-inline-start,height,width,background-color,scale] ${GLIDE} group-data-moving/slider:duration-0 motion-reduce:transition-none`,
    ],
    // Base UI's thumb carries the keyboard and the screen reader. It is
    // invisible: the handle above is what is seen.
    thumb: 'pointer-events-none size-px opacity-0',
    text: 'pointer-events-none absolute inset-0 flex items-center justify-between gap-3 px-3',
    label: 'truncate text-muted-foreground',
    value: 'shrink-0 tabular-nums text-foreground',
    step: [
      'inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none',
      'transition-[color,background-color,scale] duration-150 hover:bg-foreground/[0.06] hover:text-foreground active:scale-90',
      'focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40',
      '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
    ],
  },
  variants: {
    variant: {
      fill: {
        control: 'h-(--slider-h) rounded-[10px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
        track: 'inset-0 rounded-[inherit] bg-muted',
        fill: 'bg-(--slider-fill)',
        // A notch on the top and bottom edges at every step, like the marks
        // on a rule: the text runs between them and never crosses one.
        tick: [
          'inset-y-0 w-px',
          'bg-[linear-gradient(to_bottom,var(--slider-notch)_0_5px,transparent_5px_calc(100%-5px),var(--slider-notch)_calc(100%-5px))]',
          '[--slider-notch:color-mix(in_oklab,var(--foreground)_22%,transparent)]',
        ],
        handle: [
          'h-[calc(var(--slider-h)*0.44)] w-[3px] -translate-x-[calc(100%+5px)] rounded-full bg-(--slider-mark) opacity-60 rtl:translate-x-[calc(100%+5px)]',
          // On the fill's starting edge (a range's lower end, or below the
          // middle) it sits just inside the fill the other way.
          'data-[edge=start]:translate-x-[5px] rtl:data-[edge=start]:-translate-x-[5px]',
          'group-hover/slider:h-[calc(var(--slider-h)*0.56)] group-hover/slider:opacity-100 group-data-moving/slider:h-[calc(var(--slider-h)*0.56)] group-data-moving/slider:opacity-100',
          'group-data-disabled/slider:opacity-40',
          // Where it would cross the name or the value, it steps out of the way:
          // the edge of the fill still says where the value is.
          'data-crowded:opacity-0 group-hover/slider:data-crowded:opacity-0 group-data-moving/slider:data-crowded:opacity-0',
        ],
        text: 'text-(length:--slider-text) font-medium',
      },
      line: {
        control: 'h-6 rounded-full',
        track: 'inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-foreground/15',
        fill: 'rounded-full bg-(--slider-mark)',
        tick: 'top-1/2 size-[3px] -translate-y-1/2 rounded-full bg-background/70',
        handle: [
          'size-4 -translate-x-1/2 rounded-full border-2 border-(--slider-mark) bg-background shadow-[0_1px_3px_rgb(0_0_0/0.2)] rtl:translate-x-1/2',
          'group-hover/slider:scale-110 group-data-moving/slider:scale-125',
          'group-has-[:focus-visible]/slider:ring-2 group-has-[:focus-visible]/slider:ring-ring group-has-[:focus-visible]/slider:ring-offset-2 group-has-[:focus-visible]/slider:ring-offset-background',
        ],
      },
    },
    color: {
      neutral: { root: '[--slider-fill:color-mix(in_oklab,var(--foreground)_11%,transparent)] [--slider-mark:var(--foreground)]' },
      primary: { root: '[--slider-fill:color-mix(in_oklab,var(--primary)_24%,transparent)] [--slider-mark:var(--primary)]' },
      info: { root: '[--slider-fill:color-mix(in_oklab,var(--info)_26%,transparent)] [--slider-mark:var(--info)]' },
      success: { root: '[--slider-fill:color-mix(in_oklab,var(--success)_26%,transparent)] [--slider-mark:var(--success)]' },
      warning: { root: '[--slider-fill:color-mix(in_oklab,var(--warning)_28%,transparent)] [--slider-mark:var(--warning)]' },
      destructive: {
        root: '[--slider-fill:color-mix(in_oklab,var(--destructive)_24%,transparent)] [--slider-mark:var(--destructive)]',
      },
    },
    size: {
      sm: { root: '[--slider-h:1.75rem] [--slider-text:12px]' },
      md: { root: '[--slider-h:2rem] [--slider-text:13px]' },
      lg: { root: '[--slider-h:2.5rem] [--slider-text:14px]' },
    },
  },
  compoundVariants: [
    // The line's fill is drawn solid, so a neutral one is the foreground itself.
    { variant: 'line', color: 'neutral', className: { fill: 'bg-foreground' } },
  ],
  defaultVariants: { variant: 'fill', color: 'neutral', size: 'md' },
});

type SliderValue = number | number[];

interface SliderContextValue {
  nudge(by: number): void;
  atMin: boolean;
  atMax: boolean;
  disabled: boolean;
}

const SliderContext = createContext<SliderContextValue | null>(null);

export interface SliderProps<Value extends SliderValue = number>
  extends Omit<
    BaseSlider.Root.Props<Value>,
    'className' | 'style' | 'format' | 'orientation' | 'children' | 'render' | 'onValueChange' | 'value' | 'defaultValue'
  > {
  /** The value, when the caller holds it. Two numbers make a range with two handles. */
  value?: Value;
  /** The value to start at, when the caller does not hold it. Default `min`. */
  defaultValue?: Value;
  /** Called with the new value while it changes, by a drag, a press, a key or a `Slider.Step`. */
  onValueChange?: (value: Value) => void;
  /** `fill` writes the name and value inside a bar; `line` is a thin track with a knob. Default `fill`. */
  variant?: SliderVariant;
  /**
   * What it sets. Written inside a `fill` slider, and what a screen reader
   * calls either kind.
   */
  label?: string;
  /**
   * How the value is written: number-format options such as
   * `{ style: 'unit', unit: 'percent' }`, or a function from the number to
   * a string for anything else, such as a multiplier written `1.40×`. Also
   * what a screen reader reads.
   */
  format?: Intl.NumberFormatOptions | ((value: number) => string);
  /** Where the fill grows from. `center` fills outwards from the middle of the range. Default `start`. */
  origin?: 'start' | 'center';
  /** The colour of the fill and the handle. `neutral` by default. */
  color?: SliderColor;
  /** Height of a `fill` slider. Default `md`. */
  size?: SliderSize;
  /** Show the value at the end of a `fill` slider. Default true. */
  showValue?: boolean;
  /** Mark every step with a notch. Default: on when there are 12 steps or fewer. */
  ticks?: boolean;
  /** `Slider.Step` buttons. One with a negative `by` stands before the track, a positive one after it. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const toPercent = (value: number, min: number, max: number) => ((clamp(value, min, max) - min) / (max - min)) * 100;
/** Rounds away the float noise that repeated steps leave, such as 0.30000000000000004. */
const tidy = (value: number, step: number) => {
  const decimals = (String(step).split('.')[1] ?? '').length;
  return Number(value.toFixed(Math.min(decimals + 2, 10)));
};

/**
 * A slider. `defaultValue`, or `value` with `onValueChange`; `min`, `max`
 * and `step` as for any range.
 */
function SliderRoot<Value extends SliderValue = number>({
  value: valueProp,
  defaultValue,
  onValueChange,
  variant = 'fill',
  label,
  format,
  origin = 'start',
  color,
  size,
  showValue = true,
  ticks,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  locale,
  children,
  className,
  style,
  ...props
}: SliderProps<Value>) {
  const slots = sliderVariants({ variant, color, size });
  const [inner, setInner] = useState<SliderValue>(() => defaultValue ?? (origin === 'center' ? (min + max) / 2 : min));
  const value = (valueProp ?? inner) as SliderValue;
  const values = Array.isArray(value) ? value : [value];
  const range = values.length > 1;

  const live = useRef({ value, onValueChange, controlled: valueProp !== undefined });
  live.current = { value, onValueChange, controlled: valueProp !== undefined };

  const change = useCallback((next: SliderValue) => {
    if (!live.current.controlled) setInner(next);
    live.current.onValueChange?.(next as Value);
  }, []);

  const write = useMemo(() => {
    if (typeof format === 'function') return format;
    const formatter = new Intl.NumberFormat(locale, format);
    return (number: number) => formatter.format(number);
  }, [format, locale]);

  // The fill: from the start, from the middle, or between two handles.
  const percents = values.map((each) => toPercent(each, min, max));
  const [low, high] = range
    ? [Math.min(...percents), Math.max(...percents)]
    : origin === 'center'
      ? [Math.min(50, percents[0]!), Math.max(50, percents[0]!)]
      : [0, percents[0]!];
  // Which edge of the fill each handle marks: the far one, unless it is a
  // range's lower end or a value below the middle.
  const lowest = range ? percents.indexOf(Math.min(...percents)) : -1;
  const edges = percents.map((percent, at) =>
    range ? (at === lowest ? 'start' : 'end') : origin === 'center' && percent < 50 ? 'start' : 'end'
  );

  const count = (max - min) / step;
  const showTicks = ticks ?? (Number.isInteger(Math.round(count * 1e6) / 1e6) && count >= 2 && count <= MAX_TICKS);

  /*
   * Press, drag and stretch. Base UI moves the value; this watches the same
   * pointer to tell a press from a drag, which decides whether the fill
   * glides, and to measure how far past an end the pointer has gone.
   */
  const control = useRef<HTMLDivElement | null>(null);
  // Held in state as well, because the element can be replaced after
  // hydration, and the measuring below has to follow it to the new one.
  const [controlElement, setControlElement] = useState<HTMLDivElement | null>(null);
  const controlRef = useCallback((element: HTMLDivElement | null) => {
    control.current = element;
    setControlElement(element);
  }, []);
  const root = useRef<HTMLDivElement>(null);
  const [stretch, setStretch] = useState(0);
  const press = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;
    const box = control.current?.getBoundingClientRect();
    if (!box) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const rtl = getComputedStyle(control.current!).direction === 'rtl';
    const move = (next: PointerEvent) => {
      if (Math.hypot(next.clientX - startX, next.clientY - startY) > DRAG_SLOP) {
        root.current?.setAttribute('data-moving', '');
      }
      const past = next.clientX < box.left ? next.clientX - box.left : next.clientX > box.right ? next.clientX - box.right : 0;
      // Eases off, so the further the pointer goes the less the track follows.
      const give = Math.sign(past) * STRETCH * Math.sqrt(Math.min(Math.max(Math.abs(past) - 12, 0) / 200, 1));
      setStretch(rtl ? -give : give);
    };
    const release = () => {
      root.current?.removeAttribute('data-moving');
      setStretch(0);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
  };
  useEffect(() => () => root.current?.removeAttribute('data-moving'), []);

  // Which handles would land on the text, measured where they are going
  // rather than where the glide has them now.
  const labelRef = useRef<HTMLSpanElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const [crowded, setCrowded] = useState<boolean[]>([]);
  const percentKey = percents.map((percent, at) => `${percent}:${edges[at]}`).join(',');
  useIsomorphicLayoutEffect(() => {
    const box = controlElement;
    if (variant !== 'fill' || !box) return;
    const measure = () => {
      const width = box.clientWidth;
      const rtl = getComputedStyle(box).direction === 'rtl';
      // Distances from the start edge, in the direction the text runs.
      const span = (element: HTMLElement | null) => {
        if (!element || !element.textContent) return null;
        const start = rtl ? width - element.offsetLeft - element.offsetWidth : element.offsetLeft;
        return [start - 6, start + element.offsetWidth + 6] as const;
      };
      const zones = [span(labelRef.current), span(valueRef.current)].filter((zone) => zone !== null);
      const next = percentKey.split(',').map((entry) => {
        const [percent, edge] = entry.split(':');
        const x = (Number(percent) / 100) * width;
        const at = edge === 'start' ? Math.min(x, width - 13) + 5 : Math.max(x, 13) - 8;
        return zones.some(([left, right]) => at + 3 > left && at < right);
      });
      setCrowded((last) => (last.length === next.length && last.every((each, i) => each === next[i]) ? last : next));
    };
    measure();
    // The text can change size after the first paint, when a web font or a
    // stylesheet arrives, without the track changing at all.
    const observer = new ResizeObserver(measure);
    for (const element of [box, labelRef.current, valueRef.current]) if (element) observer.observe(element);
    let live = true;
    document.fonts?.ready.then(() => live && measure());
    return () => {
      live = false;
      observer.disconnect();
    };
  }, [variant, percentKey, controlElement]);

  const single = values[0]!;
  const context = useMemo<SliderContextValue>(
    () => ({
      nudge: (by) => {
        if (range) return;
        change(tidy(clamp(single + by, min, max), step));
      },
      atMin: !range && single <= min,
      atMax: !range && single >= max,
      disabled,
    }),
    [range, single, min, max, step, change, disabled]
  );

  const text = range ? values.map(write).join(' – ') : write(single);
  const name = label ?? props['aria-label'];

  return (
    <SliderContext.Provider value={context}>
      <BaseSlider.Root<Value>
        ref={root}
        data-slot="slider"
        data-variant={variant}
        value={value as Value}
        onValueChange={(next) => change(next as SliderValue)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        locale={locale}
        className={slots.root({ className })}
        style={
          {
            ...style,
            '--slider-start': `${low}%`,
            '--slider-span': `${high - low}%`,
          } as CSSProperties
        }
        {...props}
      >
        <BaseSlider.Control
          ref={controlRef}
          data-slot="slider-control"
          data-stretching={stretch !== 0 ? '' : undefined}
          onPointerDown={press}
          className={slots.control()}
          style={{
            marginInlineStart: stretch < 0 ? stretch : 0,
            marginInlineEnd: stretch > 0 ? -stretch : 0,
          }}
        >
          <div data-slot="slider-track" className={slots.track()}>
            <div data-slot="slider-fill" className={slots.fill()} />
            {showTicks
              ? Array.from({ length: Math.round(count) - 1 }, (_, at) => (
                  <span
                    key={at}
                    aria-hidden
                    className={slots.tick()}
                    style={{ insetInlineStart: `${((at + 1) / Math.round(count)) * 100}%` }}
                  />
                ))
              : null}
            {origin === 'center' && !range ? <span aria-hidden className={slots.center()} /> : null}
          </div>
          {values.map((each, at) => {
            const percent = toPercent(each, min, max);
            const edge = edges[at];
            // The fill's handle sits just inside the fill, so at either end it stays on the track.
            const place =
              variant !== 'fill' ? `${percent}%` : edge === 'start' ? `min(${percent}%, calc(100% - 13px))` : `max(${percent}%, 13px)`;
            return (
              <span
                key={at}
                aria-hidden
                data-slot="slider-handle"
                data-crowded={crowded[at] ? '' : undefined}
                data-edge={variant === 'fill' ? edge : undefined}
                className={slots.handle()}
                style={{ ['--slider-at' as string]: place } as CSSProperties}
              />
            );
          })}
          {variant === 'fill' && (label || showValue) ? (
            <span aria-hidden data-slot="slider-text" className={slots.text()}>
              <span ref={labelRef} className={slots.label()}>
                {label}
              </span>
              {showValue ? (
                <span ref={valueRef} className={slots.value()}>
                  {text}
                </span>
              ) : null}
            </span>
          ) : null}
          {values.map((_, at) => (
            <BaseSlider.Thumb
              key={at}
              index={range ? at : undefined}
              aria-label={range ? `${name ?? 'Value'}, ${at === 0 ? 'start' : 'end'}` : name}
              getAriaValueText={(_formatted, number) => write(number)}
              className={slots.thumb()}
            />
          ))}
        </BaseSlider.Control>
        <SliderSteps>{children}</SliderSteps>
      </BaseSlider.Root>
    </SliderContext.Provider>
  );
}
SliderRoot.displayName = 'Slider';

/** Puts each `Slider.Step` on its side of the track: a step down before, a step up after. */
function SliderSteps({ children }: { children: ReactNode }) {
  const before: ReactNode[] = [];
  const after: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement<SliderStepProps>(child) && typeof child.props.by === 'number' && child.props.by < 0) {
      before.push(child);
    } else {
      after.push(child);
    }
  });
  return (
    <>
      {before.length ? <div className="order-first flex shrink-0 items-center">{before}</div> : null}
      {after.length ? <div className="order-last flex shrink-0 items-center">{after}</div> : null}
    </>
  );
}

export interface SliderStepProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** How much one press moves the value. Negative steps down and sits before the track. */
  by: number;
  /** Usually an icon. Give the button an `aria-label` then. */
  children?: ReactNode;
}

/**
 * A button beside the track that moves the value by `by`: zoom out and zoom
 * in on either side of a zoom slider. It is disabled at the end it moves
 * towards.
 */
function SliderStep({ by, className, disabled, onClick, ...props }: SliderStepProps) {
  const slider = useContext(SliderContext);
  if (!slider) throw new Error('Slider.Step must be used inside a <Slider>.');
  const slots = sliderVariants();
  const stuck = by < 0 ? slider.atMin : slider.atMax;
  return (
    <button
      type="button"
      data-slot="slider-step"
      disabled={disabled || slider.disabled || stuck}
      className={slots.step({ className })}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) slider.nudge(by);
      }}
      {...props}
    />
  );
}
SliderStep.displayName = 'Slider.Step';

export const Slider = Object.assign(SliderRoot, {
  Step: SliderStep,
});

export { SliderStep, sliderVariants };
