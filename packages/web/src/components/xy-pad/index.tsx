'use client';

/**
 * XYPad — two numbers set with one drag: a point moved across a field.
 *
 * ```tsx
 * <XYPad label="Framing" defaultValue={{ x: 0.2, y: -0.1 }}>
 *   <XYPad.Value />
 * </XYPad>
 * ```
 *
 * ## Two values that belong together
 *
 * A position, a pan, a balance between two pairs of things: values that the
 * hand thinks of as one place are set as one place. Two sliders would make
 * the reader find a point by turning two knobs in turn.
 *
 * ## The field reads like a chart
 *
 * A grid of dots marks the steps, two hairlines mark zero on each axis, and
 * two fainter lines run through the handle to the edges, so where it stands
 * can be read against both axes at once. While it is held, four brackets
 * close round it.
 *
 * ## Joystick and trail
 *
 * `snapBack` makes it a joystick: it springs back to the centre when let go,
 * for a value that only means something while it is held, such as a pan
 * speed. `trail` draws the last moves as a fading line, for a value whose
 * path matters as much as where it ends.
 */
import {
  createContext,
  useCallback,
  useContext,
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

export type XYPadColor = 'primary' | 'info' | 'success' | 'warning' | 'destructive';

export interface XYPadPoint {
  x: number;
  y: number;
}

/** How many moves the trail remembers. */
const TRAIL = 28;

const xyPadVariants = tv({
  slots: {
    root: 'group/pad flex w-full flex-col gap-2 data-disabled:opacity-50',
    field: [
      'relative w-full cursor-crosshair touch-none overflow-hidden rounded-2xl bg-muted outline-none select-none',
      'aspect-(--pad-aspect) ring-1 ring-inset ring-foreground/[0.04]',
      'group-data-disabled/pad:cursor-not-allowed',
    ],
    // Positions are laid out on a plane set in from the field's edge, so a
    // point at the very end of a range still shows whole.
    plane: 'absolute inset-3',
    dots: 'pointer-events-none absolute inset-0 size-full overflow-visible text-foreground [&_circle]:transition-[r,fill-opacity] [&_circle]:duration-150 motion-reduce:[&_circle]:transition-none',
    axis: 'pointer-events-none absolute bg-foreground/15',
    guide: [
      'pointer-events-none absolute bg-(--pad-mark) opacity-20',
      'transition-[left,top] duration-[520ms] ease-[cubic-bezier(0.3,1.35,0.4,1)] group-data-dragging/pad:duration-0 motion-reduce:transition-none',
    ],
    trail: 'pointer-events-none absolute inset-0 size-full overflow-visible',
    handle: [
      'absolute top-(--pad-y) left-(--pad-x) z-10 size-[18px] -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full outline-none',
      'border-[2.5px] border-(--pad-mark) bg-background shadow-[0_1px_4px_rgb(0_0_0/0.25)]',
      'transition-[left,top,scale] duration-[520ms] ease-[cubic-bezier(0.3,1.35,0.4,1)] group-data-dragging/pad:cursor-grabbing group-data-dragging/pad:duration-0',
      'group-data-dragging/pad:scale-110 group-data-disabled/pad:cursor-not-allowed motion-reduce:transition-none',
      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted',
      // The point itself, in the middle of the ring.
      "after:absolute after:inset-[3px] after:rounded-full after:bg-(--pad-mark) after:content-['']",
    ],
    bracket: [
      'pointer-events-none absolute size-2 border-foreground/70 opacity-0 transition-[opacity,translate] duration-200',
      'group-data-dragging/pad:translate-x-0 group-data-dragging/pad:translate-y-0 group-data-dragging/pad:opacity-100',
      'motion-reduce:transition-none',
    ],
    value: 'flex items-center gap-3 text-xs font-medium tabular-nums text-muted-foreground',
    axisName: 'me-1 text-foreground/50',
  },
  variants: {
    color: {
      primary: { root: '[--pad-mark:var(--primary)]' },
      info: { root: '[--pad-mark:var(--info)]' },
      success: { root: '[--pad-mark:var(--success)]' },
      warning: { root: '[--pad-mark:var(--warning)]' },
      destructive: { root: '[--pad-mark:var(--destructive)]' },
    },
  },
  defaultVariants: { color: 'info' },
});

interface PadContextValue {
  value: XYPadPoint;
  write(axis: 'x' | 'y', value: number): string;
}

const PadContext = createContext<PadContextValue | null>(null);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const snapTo = (value: number, step: number, min: number) => {
  const decimals = (String(step).split('.')[1] ?? '').length;
  return Number((Math.round((value - min) / step) * step + min).toFixed(Math.min(decimals + 2, 10)));
};

export interface XYPadProps extends Omit<ComponentProps<'div'>, 'defaultValue' | 'onChange' | 'children'> {
  /** Where the point is, when the caller holds it. */
  value?: XYPadPoint;
  /** Where it starts, when the caller does not hold it. Default the centre. */
  defaultValue?: XYPadPoint;
  /** Called with the new point while it moves. */
  onValueChange?: (value: XYPadPoint) => void;
  /** Called once a move ends: on release, or after a key press. */
  onValueCommitted?: (value: XYPadPoint) => void;
  /** The range of `x`, left to right. Default `[-1, 1]`. */
  x?: [number, number];
  /** The range of `y`, bottom to top. Default `[-1, 1]`. */
  y?: [number, number];
  /** The granularity of both values. Default `0.01`. */
  step?: number;
  /** How many cells the dot grid has across. Default 8. */
  grid?: number;
  /** Snap the point to the dots of the grid. */
  snapToGrid?: boolean;
  /** Spring back to the centre on release, like a joystick. */
  snapBack?: boolean;
  /** Draw the last moves as a fading line behind the point. */
  trail?: boolean;
  /** The colour of the point, its guides and its trail. Default `info`. */
  color?: XYPadColor;
  /** The shape of the field, as a CSS aspect ratio. Default `16 / 10`. */
  aspect?: string;
  /** What it sets. Read out with its values. */
  label?: string;
  /** How each value is written, here and to a screen reader. Default two decimals. */
  format?: (value: number, axis: 'x' | 'y') => string;
  /** Turns it off. */
  disabled?: boolean;
  /** Submits `<name>.x` and `<name>.y` with a form. */
  name?: string;
  /** An `XYPad.Value` readout, set under the field. */
  children?: ReactNode;
}

/** A field with a point in it, moved by a drag, a press or the arrow keys. */
function XYPadRoot({
  value: valueProp,
  defaultValue,
  onValueChange,
  onValueCommitted,
  x: xRange = [-1, 1],
  y: yRange = [-1, 1],
  step = 0.01,
  grid = 8,
  snapToGrid = false,
  snapBack = false,
  trail = false,
  color,
  aspect = '16 / 10',
  label,
  format,
  disabled = false,
  name,
  className,
  style,
  children,
  ...props
}: XYPadProps) {
  const slots = xyPadVariants({ color });
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  const centre = useMemo(() => ({ x: (xMin + xMax) / 2, y: (yMin + yMax) / 2 }), [xMin, xMax, yMin, yMax]);
  const [inner, setInner] = useState<XYPadPoint>(defaultValue ?? centre);
  const value = valueProp ?? inner;
  const [dragging, setDragging] = useState(false);
  const [path, setPath] = useState<XYPadPoint[]>([]);

  const live = useRef({
    value,
    onValueChange,
    onValueCommitted,
    controlled: valueProp !== undefined,
  });
  live.current = {
    value,
    onValueChange,
    onValueCommitted,
    controlled: valueProp !== undefined,
  };

  const write = useCallback(
    (axis: 'x' | 'y', number: number) =>
      format ? format(number, axis) : `${number < 0 ? '−' : ''}${Math.abs(number).toFixed(2)}`,
    [format]
  );

  // Square cells: as many rows as the field's shape fits at the width of a column.
  const [wide, tall] = aspect.split('/').map((part) => Number(part) || 1);
  const rows = Math.max(1, Math.round((grid * (tall ?? 1)) / (wide ?? 1)));

  const tidy = useCallback(
    (point: XYPadPoint): XYPadPoint => {
      const xStep = snapToGrid ? (xMax - xMin) / grid : step;
      const yStep = snapToGrid ? (yMax - yMin) / rows : step;
      return {
        x: clamp(snapTo(point.x, xStep, xMin), xMin, xMax),
        y: clamp(snapTo(point.y, yStep, yMin), yMin, yMax),
      };
    },
    [snapToGrid, grid, rows, step, xMin, xMax, yMin, yMax]
  );

  const change = useCallback(
    (next: XYPadPoint) => {
      const { value: last, controlled } = live.current;
      if (next.x === last.x && next.y === last.y) return;
      if (!controlled) setInner(next);
      live.current.onValueChange?.(next);
      if (trail) setPath((all) => [...all.slice(-(TRAIL - 1)), next]);
    },
    [trail]
  );

  // The trail fades away once the point is left alone.
  useEffect(() => {
    if (!trail || dragging || path.length === 0) return;
    const timer = window.setInterval(() => {
      setPath((all) => (all.length <= 1 ? [] : all.slice(Math.ceil(all.length / 6))));
    }, 60);
    return () => window.clearInterval(timer);
  }, [trail, dragging, path.length]);

  const field = useRef<HTMLDivElement>(null);
  const plane = useRef<HTMLDivElement>(null);
  // The plane's size in pixels, so the lens round the point is a circle.
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const box = plane.current;
    if (!box) return;
    const observer = new ResizeObserver(() => setSize({ width: box.clientWidth, height: box.clientHeight }));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  const handle = useRef<HTMLDivElement>(null);
  const pointAt = (clientX: number, clientY: number): XYPadPoint => {
    const box = plane.current!.getBoundingClientRect();
    const across = clamp((clientX - box.left) / box.width, 0, 1);
    const down = clamp((clientY - box.top) / box.height, 0, 1);
    return tidy({
      x: xMin + across * (xMax - xMin),
      y: yMax - down * (yMax - yMin),
    });
  };

  const press = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    try {
      field.current?.setPointerCapture(event.pointerId);
    } catch {
      // A pointer the browser no longer tracks; the drag still follows moves over the field.
    }
    // Focused for the arrow keys, without the ring a keyboard user would see.
    handle.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    setDragging(true);
    change(pointAt(event.clientX, event.clientY));
  };
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    change(pointAt(event.clientX, event.clientY));
  };
  const release = () => {
    if (!dragging) return;
    setDragging(false);
    if (snapBack) change(centre);
    live.current.onValueCommitted?.(snapBack ? centre : live.current.value);
  };

  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const by = (event.shiftKey ? 10 : 1) * (snapToGrid ? (xMax - xMin) / grid : step);
    const byY = (event.shiftKey ? 10 : 1) * (snapToGrid ? (yMax - yMin) / rows : step);
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const moves: Record<string, () => XYPadPoint> = {
      ArrowLeft: () => ({ ...value, x: value.x + (rtl ? by : -by) }),
      ArrowRight: () => ({ ...value, x: value.x + (rtl ? -by : by) }),
      ArrowUp: () => ({ ...value, y: value.y + byY }),
      ArrowDown: () => ({ ...value, y: value.y - byY }),
      Home: () => centre,
    };
    const next = moves[event.key];
    if (!next) return;
    event.preventDefault();
    const point = tidy(next());
    change(point);
    live.current.onValueCommitted?.(point);
  };

  const toX = (x: number) => ((x - xMin) / (xMax - xMin)) * 100;
  const toY = (y: number) => ((yMax - y) / (yMax - yMin)) * 100;
  const left = ((value.x - xMin) / (xMax - xMin)) * 100;
  const down = ((yMax - value.y) / (yMax - yMin)) * 100;
  const zeroX = xMin < 0 && xMax > 0 ? ((0 - xMin) / (xMax - xMin)) * 100 : null;
  const zeroY = yMin < 0 && yMax > 0 ? ((yMax - 0) / (yMax - yMin)) * 100 : null;
  const valueText = `${label ? `${label}: ` : ''}x ${write('x', value.x)}, y ${write('y', value.y)}`;

  // Each bracket closes in from its own corner.
  const brackets = [
    'border-s-[1.5px] border-t-[1.5px] -translate-x-1 -translate-y-1 left-[calc(var(--pad-x)-15px)] top-[calc(var(--pad-y)-15px)]',
    'border-e-[1.5px] border-t-[1.5px] translate-x-1 -translate-y-1 left-[calc(var(--pad-x)+7px)] top-[calc(var(--pad-y)-15px)]',
    'border-s-[1.5px] border-b-[1.5px] -translate-x-1 translate-y-1 left-[calc(var(--pad-x)-15px)] top-[calc(var(--pad-y)+7px)]',
    'border-e-[1.5px] border-b-[1.5px] translate-x-1 translate-y-1 left-[calc(var(--pad-x)+7px)] top-[calc(var(--pad-y)+7px)]',
  ];

  return (
    <PadContext.Provider value={useMemo(() => ({ value, write }), [value, write])}>
      <div
        data-slot="xy-pad"
        data-dragging={dragging ? '' : undefined}
        data-disabled={disabled ? '' : undefined}
        className={slots.root({ className })}
        style={
          {
            ...style,
            '--pad-aspect': aspect,
            '--pad-x': `${left}%`,
            '--pad-y': `${down}%`,
          } as CSSProperties
        }
        {...props}
      >
        <div
          ref={field}
          data-slot="xy-pad-field"
          className={slots.field()}
          onPointerDown={press}
          onPointerMove={move}
          onPointerUp={release}
          onPointerCancel={release}
          onLostPointerCapture={release}
        >
          <div ref={plane} data-slot="xy-pad-plane" className={slots.plane()}>
            <Dots
              columns={grid}
              rows={rows}
              size={size}
              at={{ x: left / 100, y: down / 100 }}
              className={slots.dots()}
            />
            {zeroX !== null ? (
              <span
                aria-hidden
                className={slots.axis({
                  className: '-inset-y-3 w-px -translate-x-1/2',
                })}
                style={{ left: `${zeroX}%` }}
              />
            ) : null}
            {zeroY !== null ? (
              <span
                aria-hidden
                className={slots.axis({
                  className: '-inset-x-3 h-px -translate-y-1/2',
                })}
                style={{ top: `${zeroY}%` }}
              />
            ) : null}
            <span
              aria-hidden
              className={slots.guide({
                className: '-inset-y-3 left-(--pad-x) w-px -translate-x-1/2',
              })}
            />
            <span
              aria-hidden
              className={slots.guide({
                className: '-inset-x-3 top-(--pad-y) h-px -translate-y-1/2',
              })}
            />
            {trail && path.length > 1 ? (
              <svg aria-hidden className={slots.trail()} viewBox="0 0 100 100" preserveAspectRatio="none">
                {/*
                 * One unbroken line underneath in the tail's colour, then the
                 * fade on top in flat-ended pieces. Round ends would overlap at
                 * every join and show as beads.
                 */}
                <polyline
                  points={path.map((point) => `${toX(point.x)},${toY(point.y)}`).join(' ')}
                  fill="none"
                  stroke="color-mix(in oklab, var(--pad-mark) 12%, var(--muted))"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                {path.slice(1).map((point, at) => {
                  const from = path[at]!;
                  return (
                    <line
                      key={at}
                      x1={toX(from.x)}
                      y1={toY(from.y)}
                      x2={toX(point.x)}
                      y2={toY(point.y)}
                      stroke={`color-mix(in oklab, var(--pad-mark) ${Math.round(12 + ((at + 1) / path.length) * 78)}%, var(--muted))`}
                      strokeWidth={2.5}
                      strokeLinecap="butt"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </svg>
            ) : null}
            {brackets.map((place, at) => (
              <span key={at} aria-hidden className={slots.bracket({ className: place })} />
            ))}
            <div
              ref={handle}
              role="slider"
              data-slot="xy-pad-handle"
              tabIndex={disabled ? -1 : 0}
              aria-label={label ?? 'Position'}
              aria-valuetext={valueText}
              aria-valuenow={value.x}
              aria-valuemin={xMin}
              aria-valuemax={xMax}
              aria-disabled={disabled || undefined}
              onKeyDown={keys}
              className={slots.handle()}
            />
          </div>
        </div>
        {name ? (
          <>
            <input type="hidden" name={`${name}.x`} value={value.x} />
            <input type="hidden" name={`${name}.y`} value={value.y} />
          </>
        ) : null}
        {children}
      </div>
    </PadContext.Provider>
  );
}
XYPadRoot.displayName = 'XYPad';

/** How far round the point the dots swell: this share of the field's shorter side, at most 72px. */
const LENS = 0.3;

/**
 * The dot grid, one dot at each crossing including the edges. The dots
 * within reach of the point swell and brighten, so the grid answers the
 * point as it moves.
 */
function Dots({
  columns,
  rows,
  size,
  at,
  className,
}: {
  columns: number;
  rows: number;
  size: { width: number; height: number };
  at: { x: number; y: number };
  className: string;
}) {
  const dots: ReactNode[] = [];
  for (let column = 0; column <= columns; column++) {
    for (let row = 0; row <= rows; row++) {
      const x = column / columns;
      const y = row / rows;
      const distance = Math.hypot((x - at.x) * size.width, (y - at.y) * size.height);
      const reach = Math.min(Math.min(size.width, size.height) * LENS, 72);
      const near = reach ? Math.max(0, 1 - distance / reach) : 0;
      dots.push(
        <circle
          key={`${column}-${row}`}
          cx={`${x * 100}%`}
          cy={`${y * 100}%`}
          r={1.25 + near * 1.25}
          fill="currentColor"
          fillOpacity={0.16 + near * 0.5}
        />
      );
    }
  }
  return (
    <svg aria-hidden className={className}>
      {dots}
    </svg>
  );
}

export interface XYPadValueProps extends ComponentProps<'div'> {}

/** The two values written out, under the field. */
function XYPadValue({ className, ...props }: XYPadValueProps) {
  const pad = useContext(PadContext);
  if (!pad) throw new Error('XYPad.Value must be used inside an <XYPad>.');
  const slots = xyPadVariants();
  return (
    <div aria-hidden data-slot="xy-pad-value" className={slots.value({ className })} {...props}>
      <span>
        <span className={slots.axisName()}>X</span>
        {pad.write('x', pad.value.x)}
      </span>
      <span>
        <span className={slots.axisName()}>Y</span>
        {pad.write('y', pad.value.y)}
      </span>
    </div>
  );
}
XYPadValue.displayName = 'XYPad.Value';

export const XYPad = Object.assign(XYPadRoot, {
  Value: XYPadValue,
});

export { XYPadValue, xyPadVariants };
