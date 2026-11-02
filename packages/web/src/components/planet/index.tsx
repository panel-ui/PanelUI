'use client';

/**
 * Planet — the world as dots on a globe you can turn, with things pinned to it.
 *
 * ```tsx
 * <Planet defaultRotation={[78, 18]}>
 *   <Planet.Globe>
 *     <Planet.Marker lat={24.7} lng={46.7} label="Saudi Arabia" count={2} />
 *     <Planet.Marker lat={-33.9} lng={151.2} label="Australia" />
 *   </Planet.Globe>
 *   <Planet.Controls />
 * </Planet>
 * ```
 *
 * ## Two layers
 *
 * The globe is a canvas and the markers are ordinary elements laid over it.
 * The land is several thousand dots, which is a job for a canvas; a marker is
 * a label, an avatar, maybe a link, which is a job for the DOM. Each frame the
 * canvas is redrawn and every marker is moved to where its coordinate now is,
 * by a transform written straight to the element. Turning the globe never
 * re-renders React.
 *
 * ## Nothing is drawn that is not asked for
 *
 * There is no loop running while the globe is still. A drag, a press on a
 * control, a resize or a change of theme asks for one frame, and a frame asks
 * for another only while something is still moving.
 *
 * ## The land is a question, not a shape
 *
 * `land.ts` says, per square degree, whether it is land. A grid of points is
 * laid over the sphere at an even spacing and the ones on land are kept, so
 * the coastlines come out as the edge of a dot pattern. The spacing is in
 * pixels, so a small globe and a large one are dotted equally finely and a
 * small one is not a smear.
 *
 * ## It takes the text colour
 *
 * The dots and the shading are drawn in `currentColor`, read from the element
 * each frame. On a dark surface the land is light and on a light one it is
 * dark, with no colour passed in and nothing to keep in step with the theme.
 */
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { LAND, LAND_COLUMNS, LAND_ROWS } from './land';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

const planetVariants = tv({
  slots: {
    // `isolate` keeps the markers' depth ordering inside the planet. Each marker
    // sets its own z-index, and without a stacking context of its own those
    // numbers compete with the page's sidebars and menus, and win.
    root: 'isolate flex w-full flex-col items-center gap-4 text-foreground',
    // `touch-pan-y` leaves a vertical swipe to the page. A globe that traps
    // the scroll it sits in is worse than one that only turns sideways.
    globe:
      'relative aspect-square w-full max-w-md cursor-grab touch-pan-y select-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background active:cursor-grabbing',
    // The glow's colour is put in a real colour property, so the browser
    // resolves it and the drawing code can read back a colour it can use.
    canvas: 'absolute inset-0 size-full [outline-color:var(--pu-glow)]',
    markers: 'pointer-events-none absolute inset-0',
    // Opacity 0 until the first frame has placed it, so a marker is never
    // seen stacked in the corner it starts in.
    marker:
      'pointer-events-auto absolute left-0 top-0 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center opacity-0 will-change-transform',
    // The same label and pin the app library's Map draws: opaque enough to
    // read over the land, with an edge and a shadow so it sits on the globe
    // and not in it.
    // The stem under the label ties it to its pin, so two labels close
    // together can still be told apart.
    label:
      'absolute bottom-full mb-2.5 flex items-center gap-1.5 whitespace-nowrap rounded-md border bg-background/95 px-1.5 py-0.5 text-xs font-medium text-foreground shadow-sm after:absolute after:left-1/2 after:top-full after:h-2 after:w-px after:-translate-x-1/2 after:bg-foreground/40',
    count: 'tabular-nums text-muted-foreground',
    // An opaque surface. A tint would let the land show through whatever the
    // pin holds, and initials over a field of dots cannot be read.
    pin: 'relative flex size-8 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--pu-color)] bg-card text-card-foreground shadow-md ring-2 ring-background',
    dot: 'relative size-3.5 rounded-full border-2 border-background bg-[var(--pu-color)] shadow-md',
    // A marker that can be pressed. The button has no box of its own, so the
    // label above it is still placed from the marker and pressing either the
    // label or the pin counts.
    press:
      'group/marker flex cursor-pointer flex-col items-center rounded-full outline-none [&>[data-pin]]:transition-[scale,box-shadow] [&>[data-pin]]:duration-200 hover:[&>[data-pin]]:scale-125 focus-visible:[&>[data-pin]]:ring-2 focus-visible:[&>[data-pin]]:ring-ring active:[&>[data-pin]]:scale-110',
    // A ring that spreads from the marker and fades, for one that wants
    // looking at. Still for anyone who has asked for reduced motion.
    pulse:
      'pointer-events-none absolute left-1/2 top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-[var(--pu-color)] opacity-70 motion-reduce:hidden',
    // One surface split by a hairline, not two buttons with a gap between.
    controls:
      'inline-flex items-stretch divide-x divide-border overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm',
    control:
      'inline-flex size-9 cursor-pointer items-center justify-center text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground active:bg-muted',
    caption: 'flex items-center px-3 text-sm font-medium',
    // The places on the globe again, as a list beside it, ruled off from what is above.
    list: 'grid grid-cols-2 gap-1 border-t pt-3',
    listItem:
      'flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-start text-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-muted aria-pressed:text-foreground',
    listDot: 'size-2 shrink-0 rounded-full bg-[var(--pu-color)]',
    listName: 'truncate',
  },
  variants: {
    /** The colour of the light at the globe's edge. */
    glow: {
      primary: { globe: '[--pu-glow:var(--primary)]' },
      info: { globe: '[--pu-glow:var(--info)]' },
      success: { globe: '[--pu-glow:var(--success)]' },
      warning: { globe: '[--pu-glow:var(--warning)]' },
      destructive: { globe: '[--pu-glow:var(--destructive)]' },
    },
    // The marker that has been picked: larger, with a ring of its own colour.
    selected: {
      true: {
        dot: 'scale-125 shadow-[0_0_0_4px_color-mix(in_oklab,var(--pu-color)_35%,transparent)]',
        pin: 'scale-110 shadow-[0_0_0_4px_color-mix(in_oklab,var(--pu-color)_35%,transparent)]',
        marker: 'z-10',
      },
    },
    color: {
      primary: { marker: '[--pu-color:var(--primary)]', listDot: '[--pu-color:var(--primary)]' },
      info: { marker: '[--pu-color:var(--info)]', listDot: '[--pu-color:var(--info)]' },
      success: { marker: '[--pu-color:var(--success)]', listDot: '[--pu-color:var(--success)]' },
      warning: { marker: '[--pu-color:var(--warning)]', listDot: '[--pu-color:var(--warning)]' },
      destructive: { marker: '[--pu-color:var(--destructive)]', listDot: '[--pu-color:var(--destructive)]' },
    },
  },
  defaultVariants: { color: 'primary', glow: 'primary' },
});

/* -------------------------------------------------------------------------- */
/* The land                                                                   */
/* -------------------------------------------------------------------------- */

const RADIANS = Math.PI / 180;

/** The globe's radius as a share of half its box. The rest is the glow. */
const SPHERE = 0.9;

/** The points of a dot grid that fall on land, as unit vectors. */
interface Dots {
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  count: number;
}

let landBits: Uint8Array | null = null;

function isLand(latitude: number, longitude: number): boolean {
  if (!landBits) {
    const decoded = atob(LAND);
    landBits = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i += 1) landBits[i] = decoded.charCodeAt(i);
  }
  const row = Math.min(LAND_ROWS - 1, Math.max(0, Math.floor(((90 - latitude) / 180) * LAND_ROWS)));
  const column = Math.min(LAND_COLUMNS - 1, Math.max(0, Math.floor(((longitude + 180) / 360) * LAND_COLUMNS)));
  const cell = row * LAND_COLUMNS + column;
  return ((landBits[cell >> 3] ?? 0) & (1 << (cell & 7))) !== 0;
}

const dotCache = new Map<number, Dots>();

/**
 * A grid with `step` degrees between rows, and between the points along each
 * row at the equator. A row nearer a pole is a shorter circle and gets fewer
 * points, so the spacing on the sphere is the same everywhere and the dots do
 * not crowd together towards the top.
 */
function dotsFor(step: number): Dots {
  const cached = dotCache.get(step);
  if (cached) return cached;

  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  const rows = Math.round(180 / step);
  for (let row = 0; row < rows; row += 1) {
    const latitude = 90 - (row + 0.5) * (180 / rows);
    const cos = Math.cos(latitude * RADIANS);
    const sin = Math.sin(latitude * RADIANS);
    const columns = Math.max(1, Math.round((360 / step) * cos));
    for (let column = 0; column < columns; column += 1) {
      const longitude = -180 + (column + 0.5) * (360 / columns);
      if (!isLand(latitude, longitude)) continue;
      xs.push(cos * Math.sin(longitude * RADIANS));
      ys.push(sin);
      zs.push(cos * Math.cos(longitude * RADIANS));
    }
  }

  const dots = {
    x: Float32Array.from(xs),
    y: Float32Array.from(ys),
    z: Float32Array.from(zs),
    count: xs.length,
  };
  dotCache.set(step, dots);
  return dots;
}

/* -------------------------------------------------------------------------- */
/* Context                                                                    */
/* -------------------------------------------------------------------------- */

/** `[longitude, latitude]` of the point facing the viewer, in degrees. */
export type PlanetRotation = [longitude: number, latitude: number];

/** Where a coordinate is on the globe's box, and how far towards the viewer. */
interface Projected {
  x: number;
  y: number;
  /** 1 at the centre, 0 on the edge, negative on the far side. */
  depth: number;
}

type Project = (latitude: number, longitude: number) => Projected;

interface PlanetContextValue {
  /** Called with the current projection on every frame the globe draws. */
  subscribe(listener: (project: Project) => void): () => void;
  /** The set `subscribe` adds to, which the globe hands to its engine. */
  listeners: Set<(project: Project) => void>;
  rotateBy(longitude: number, latitude?: number): void;
  rotateTo(rotation: PlanetRotation): void;
  /** The globe's own loop, started by `Planet.Globe` once it has a canvas. */
  engine: React.RefObject<Engine | null>;
  defaultRotation: PlanetRotation;
  autoRotate: number;
  interactive: boolean;
  onRotationChange?: (rotation: PlanetRotation) => void;
}

const PlanetContext = createContext<PlanetContextValue | null>(null);

function usePlanetContext(part: string): PlanetContextValue {
  const context = useContext(PlanetContext);
  if (!context) throw new Error(`${part} must be used inside a <Planet>.`);
  return context;
}

export interface PlanetHandle {
  /** Turn by this many degrees of longitude, and optionally latitude. */
  rotateBy(longitude: number, latitude?: number): void;
  /** Turn until this coordinate faces the viewer. */
  rotateTo(rotation: PlanetRotation): void;
  /** The coordinate facing the viewer right now. */
  getRotation(): PlanetRotation;
}

/* -------------------------------------------------------------------------- */
/* The engine                                                                 */
/* -------------------------------------------------------------------------- */

/** How far the globe can be tipped. Past this the far pole comes into view. */
const MAX_TILT = 60;
/** Pixels between neighbouring dots, whatever size the globe is. */
const DOT_SPACING = 4.4;
/** Where the light comes from: in front, a little above and to the left. */
const LIGHT = { x: -0.3, y: 0.42, z: 0.86 };
const ALPHA_STEPS = 8;

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
/** A longitude brought back into -180..180, so it never grows without bound. */
const wrap = (longitude: number) => ((((longitude + 180) % 360) + 360) % 360) - 180;
/** The short way round from one longitude to another. */
const shortest = (from: number, to: number) => wrap(to - from);

interface Engine {
  rotateBy(longitude: number, latitude?: number): void;
  rotateTo(rotation: PlanetRotation): void;
  getRotation(): PlanetRotation;
  setAutoRotate(speed: number): void;
  dragStart(): void;
  dragMove(dx: number, dy: number, vertical: boolean): void;
  dragEnd(): void;
  setHover(hovering: boolean): void;
  invalidate(): void;
  destroy(): void;
}

interface EngineOptions {
  canvas: HTMLCanvasElement;
  rotation: PlanetRotation;
  autoRotate: number;
  listeners: Set<(project: Project) => void>;
  onSettle(rotation: PlanetRotation): void;
}

function createEngine({ canvas, rotation, autoRotate, listeners, onSettle }: EngineOptions): Engine {
  const context = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let longitude = wrap(rotation[0]);
  let latitude = clamp(rotation[1], -MAX_TILT, MAX_TILT);
  /** Where an eased turn is heading, or `null` when none is under way. */
  let target: { longitude: number; latitude: number } | null = null;
  /** Degrees a second the globe is still coasting at after a drag. */
  let velocity = 0;
  let spin = autoRotate;
  let dragging = false;
  let hovering = false;
  let visible = true;
  let frame = 0;
  let last = 0;
  let size = 0;
  let destroyed = false;
  /** Samples of recent drag movement, to turn a flick into a coast. */
  let samples: { time: number; dx: number }[] = [];

  const draw = () => {
    if (!context || size === 0) return;
    const ratio = window.devicePixelRatio || 1;
    const centre = size / 2;
    // Smaller than the canvas, which leaves a margin for the light round it.
    const radius = (size / 2) * SPHERE;
    const style = getComputedStyle(canvas);
    const color = style.color;
    const glow = style.outlineColor || color;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, size, size);

    /*
     * The light round the globe: a ring that starts at the edge and fades
     * outwards. Drawn as a ring and not a disc, because a gradient paints its
     * first colour all the way in to the middle.
     */
    const halo = context.createRadialGradient(centre, centre, radius * 0.98, centre, centre, size / 2);
    halo.addColorStop(0, glow);
    halo.addColorStop(1, 'transparent');
    context.fillStyle = halo;
    // Faint on purpose. Any stronger and it washes over the land near the
    // edge, which is where the dots are already at their quietest.
    context.globalAlpha = 0.14;
    context.beginPath();
    context.arc(centre, centre, size / 2, 0, Math.PI * 2);
    context.arc(centre, centre, radius, 0, Math.PI * 2, true);
    context.fill('evenodd');
    context.globalAlpha = 1;

    /* The sphere itself: a faint disc, lit from the upper left. */
    context.save();
    context.beginPath();
    context.arc(centre, centre, radius, 0, Math.PI * 2);
    context.clip();
    context.fillStyle = color;
    context.globalAlpha = 0.035;
    context.fillRect(0, 0, size, size);
    const lit = context.createRadialGradient(
      centre - radius * 0.42,
      centre - radius * 0.48,
      radius * 0.05,
      centre - radius * 0.2,
      centre - radius * 0.2,
      radius * 1.15
    );
    lit.addColorStop(0, color);
    lit.addColorStop(1, 'transparent');
    context.fillStyle = lit;
    context.globalAlpha = 0.11;
    context.fillRect(0, 0, size, size);
    context.restore();

    /* The land. */
    const sinLongitude = Math.sin(longitude * RADIANS);
    const cosLongitude = Math.cos(longitude * RADIANS);
    const sinLatitude = Math.sin(latitude * RADIANS);
    const cosLatitude = Math.cos(latitude * RADIANS);

    // Finer than a degree buys nothing: that is what the land grid resolves.
    const step = clamp(Math.round((DOT_SPACING / (radius * RADIANS)) * 10) / 10, 1, 6);
    const dots = dotsFor(step);
    const dotRadius = Math.max(0.6, radius * 0.0062);

    // One path per level of brightness. Filling several thousand dots one at a
    // time is several thousand state changes; this is eight.
    const paths: Path2D[] = Array.from({ length: ALPHA_STEPS }, () => new Path2D());
    for (let i = 0; i < dots.count; i += 1) {
      const dx = dots.x[i] ?? 0;
      const dy = dots.y[i] ?? 0;
      const dz = dots.z[i] ?? 0;
      // Turn about the vertical axis, then tip towards the viewer.
      const x = dx * cosLongitude - dz * sinLongitude;
      const forward = dx * sinLongitude + dz * cosLongitude;
      const depth = dy * sinLatitude + forward * cosLatitude;
      if (depth <= 0) continue;
      const y = dy * cosLatitude - forward * sinLatitude;

      const light = Math.max(0, x * LIGHT.x + y * LIGHT.y + depth * LIGHT.z);
      // Dots fade out towards the edge. They are seen nearly side on there,
      // packed into lines, and at full strength the rim reads as a bright ring
      // around a globe whose middle is the part worth looking at.
      const turned = Math.min(1, depth / 0.55);
      const edge = turned * turned * (3 - 2 * turned);
      const alpha = (0.22 + 0.78 * light) * edge;
      const level = Math.min(ALPHA_STEPS - 1, Math.floor(alpha * ALPHA_STEPS));
      const path = paths[level];
      if (!path) continue;
      const px = centre + x * radius;
      const py = centre - y * radius;
      // Dots facing the viewer are drawn a little larger than those turned
      // away, as they would be seen.
      const r = dotRadius * (0.72 + 0.42 * depth);
      path.moveTo(px + r, py);
      path.arc(px, py, r, 0, Math.PI * 2);
    }
    context.fillStyle = color;
    paths.forEach((path, level) => {
      context.globalAlpha = (level + 0.5) / ALPHA_STEPS;
      context.fill(path);
    });
    context.globalAlpha = 1;

    /* The markers, which are told where they are rather than drawn here. */
    const project: Project = (markerLatitude, markerLongitude) => {
      const cos = Math.cos(markerLatitude * RADIANS);
      const sin = Math.sin(markerLatitude * RADIANS);
      const dx = cos * Math.sin(markerLongitude * RADIANS);
      const dz = cos * Math.cos(markerLongitude * RADIANS);
      const x = dx * cosLongitude - dz * sinLongitude;
      const forward = dx * sinLongitude + dz * cosLongitude;
      return {
        x: centre + x * radius,
        y: centre - (sin * cosLatitude - forward * sinLatitude) * radius,
        depth: sin * sinLatitude + forward * cosLatitude,
      };
    };
    for (const listener of listeners) listener(project);
  };

  const resting = () => {
    const turning = spin !== 0 && !hovering && !dragging && visible && !reducedMotion.matches;
    return !dragging && target === null && Math.abs(velocity) < 1 && !turning;
  };

  const tick = (now: number) => {
    frame = 0;
    if (destroyed) return;
    const elapsed = last === 0 ? 0 : Math.min(0.05, (now - last) / 1000);
    last = now;

    if (target) {
      // Closes most of the remaining distance each frame, so a turn starts
      // quickly and settles gently however far it has to go.
      const ease = reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed * 6);
      const remaining = shortest(longitude, target.longitude);
      longitude = wrap(longitude + remaining * ease);
      latitude += (target.latitude - latitude) * ease;
      if (Math.abs(remaining) < 0.05 && Math.abs(target.latitude - latitude) < 0.05) {
        longitude = target.longitude;
        latitude = target.latitude;
        target = null;
      }
    } else if (!dragging && Math.abs(velocity) >= 1) {
      longitude = wrap(longitude + velocity * elapsed);
      velocity *= Math.exp(-elapsed * 3.2);
    } else if (!dragging && !hovering && visible && spin !== 0 && !reducedMotion.matches) {
      longitude = wrap(longitude + spin * elapsed);
    }

    draw();

    if (resting()) {
      velocity = 0;
      last = 0;
      onSettle([longitude, latitude]);
      return;
    }
    frame = requestAnimationFrame(tick);
  };

  const invalidate = () => {
    if (frame === 0 && !destroyed) frame = requestAnimationFrame(tick);
  };

  /* Size the canvas to its box, at the density of the screen it is on. */
  const resize = new ResizeObserver(() => {
    const next = Math.round(canvas.clientWidth);
    if (next === 0) return;
    const ratio = window.devicePixelRatio || 1;
    size = next;
    canvas.width = Math.round(next * ratio);
    canvas.height = Math.round(next * ratio);
    // Synchronously, not on the next frame: setting the size cleared the
    // canvas, and waiting a frame to redraw would flash it empty.
    draw();
    invalidate();
  });
  resize.observe(canvas);

  /* A theme change repaints nothing by itself, since nothing is animating. */
  const theme = new MutationObserver(invalidate);
  theme.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'style', 'data-theme'],
  });

  /* Turning on its own stops while the globe is off screen. */
  const viewport = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
    if (visible) invalidate();
  });
  viewport.observe(canvas);

  const onMotionPreference = () => invalidate();
  reducedMotion.addEventListener('change', onMotionPreference);

  return {
    rotateBy(byLongitude, byLatitude = 0) {
      const from = target ?? { longitude, latitude };
      target = {
        longitude: wrap(from.longitude + byLongitude),
        latitude: clamp(from.latitude + byLatitude, -MAX_TILT, MAX_TILT),
      };
      velocity = 0;
      invalidate();
    },
    rotateTo([toLongitude, toLatitude]) {
      target = { longitude: wrap(toLongitude), latitude: clamp(toLatitude, -MAX_TILT, MAX_TILT) };
      velocity = 0;
      invalidate();
    },
    getRotation: () => [longitude, latitude],
    setAutoRotate(speed) {
      spin = speed;
      invalidate();
    },
    dragStart() {
      dragging = true;
      target = null;
      velocity = 0;
      samples = [];
      invalidate();
    },
    dragMove(dx, dy, vertical) {
      if (!dragging || size === 0) return;
      // A point on the surface stays under the pointer: an arc the length of
      // the movement, on a sphere of this radius.
      const degrees = 1 / ((size / 2) * RADIANS);
      longitude = wrap(longitude - dx * degrees);
      if (vertical) latitude = clamp(latitude + dy * degrees, -MAX_TILT, MAX_TILT);
      const now = performance.now();
      samples.push({ time: now, dx: -dx * degrees });
      samples = samples.filter((sample) => now - sample.time < 120);
      invalidate();
    },
    dragEnd() {
      if (!dragging) return;
      dragging = false;
      const now = performance.now();
      const recent = samples.filter((sample) => now - sample.time < 120);
      const first = recent[0];
      if (first && recent.length > 1 && !reducedMotion.matches) {
        const span = Math.max(16, now - first.time) / 1000;
        velocity = clamp(recent.reduce((sum, sample) => sum + sample.dx, 0) / span, -540, 540);
      }
      invalidate();
    },
    setHover(next) {
      hovering = next;
      invalidate();
    },
    invalidate,
    destroy() {
      destroyed = true;
      if (frame !== 0) cancelAnimationFrame(frame);
      resize.disconnect();
      theme.disconnect();
      viewport.disconnect();
      reducedMotion.removeEventListener('change', onMotionPreference);
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Root                                                                       */
/* -------------------------------------------------------------------------- */

export interface PlanetProps extends Omit<ComponentProps<'div'>, 'children'> {
  children?: ReactNode;
  /**
   * The coordinate facing the viewer to begin with, as `[longitude, latitude]`
   * in degrees. Read once: turning the globe afterwards does not change it.
   */
  defaultRotation?: PlanetRotation;
  /**
   * Turn on its own, at this many degrees of longitude a second. `true` is 6.
   * It stops while the pointer is over the globe, while it is being dragged,
   * while it is off screen, and for anyone who has asked for reduced motion.
   */
  autoRotate?: boolean | number;
  /** Let the globe be dragged and turned with the arrow keys. */
  interactive?: boolean;
  /** Called with the coordinate facing the viewer each time the globe comes to rest. */
  onRotationChange?: (rotation: PlanetRotation) => void;
}

const PlanetRoot = forwardRef<PlanetHandle, PlanetProps>(function PlanetRoot(
  {
    children,
    className,
    defaultRotation = [0, 15],
    autoRotate = false,
    interactive = true,
    onRotationChange,
    ...props
  },
  ref
) {
  const slots = planetVariants();
  const engine = useRef<Engine | null>(null);
  const listeners = useRef(new Set<(project: Project) => void>()).current;
  // The opening view, kept from the first render. The prop says where the
  // globe starts, not where it is.
  const initial = useRef(defaultRotation).current;
  const speed = autoRotate === true ? 6 : autoRotate === false ? 0 : autoRotate;

  const subscribe = useCallback(
    (listener: (project: Project) => void) => {
      listeners.add(listener);
      // A marker added later is placed straight away, not on the next turn.
      engine.current?.invalidate();
      return () => {
        listeners.delete(listener);
      };
    },
    [listeners]
  );

  const rotateBy = useCallback((longitude: number, latitude?: number) => {
    engine.current?.rotateBy(longitude, latitude);
  }, []);
  const rotateTo = useCallback((rotation: PlanetRotation) => {
    engine.current?.rotateTo(rotation);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      rotateBy,
      rotateTo,
      getRotation: () => engine.current?.getRotation() ?? initial,
    }),
    [rotateBy, rotateTo, initial]
  );

  const context = useMemo<PlanetContextValue>(
    () => ({
      subscribe,
      listeners,
      rotateBy,
      rotateTo,
      engine,
      defaultRotation: initial,
      autoRotate: speed,
      interactive,
      onRotationChange,
    }),
    [subscribe, listeners, rotateBy, rotateTo, initial, speed, interactive, onRotationChange]
  );

  return (
    <PlanetContext.Provider value={context}>
      <div className={slots.root({ className })} {...props}>
        {children}
      </div>
    </PlanetContext.Provider>
  );
});
PlanetRoot.displayName = 'Planet';

/* -------------------------------------------------------------------------- */
/* Globe                                                                      */
/* -------------------------------------------------------------------------- */

export interface PlanetGlobeProps extends Omit<ComponentProps<'div'>, 'children' | 'color'> {
  /** The markers. Anything else placed here is laid over the globe unmoved. */
  children?: ReactNode;
  /** Which of the theme's roles the light round the globe is drawn in. */
  color?: PlanetMarkerColor;
  /** What a screen reader calls the globe. */
  label?: string;
}

/** Degrees one press of an arrow key turns the globe. */
const KEY_STEP = 15;

function PlanetGlobe({
  children,
  className,
  color = 'primary',
  label = 'Globe',
  render,
  ...props
}: PlanetGlobeProps & RenderProp<'div'>) {
  const slots = planetVariants({ glow: color });
  const planet = usePlanetContext('Planet.Globe');
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointer = useRef<{ id: number; x: number; y: number; vertical: boolean } | null>(null);
  // Where the globe has come to rest, for the slider semantics below. Updated
  // when it settles, not while it turns, so turning never re-renders.
  const [settled, setSettled] = useState<PlanetRotation>(planet.defaultRotation);

  // Read through a ref so a new callback from the parent does not rebuild the
  // engine and throw away where the globe has been turned to.
  const onRotationChange = useRef(planet.onRotationChange);
  onRotationChange.current = planet.onRotationChange;

  const { engine, defaultRotation, listeners } = planet;
  // The glow is read off the canvas when it draws, so a new colour needs a
  // new drawing to be seen.
  useEffect(() => {
    engine.current?.invalidate();
  }, [engine, color]);

  useEffect(() => {
    if (!canvas.current) return;
    const created = createEngine({
      canvas: canvas.current,
      rotation: defaultRotation,
      autoRotate: 0,
      listeners,
      onSettle: (rotation) => {
        setSettled((current) =>
          Math.round(current[0]) === Math.round(rotation[0]) && Math.round(current[1]) === Math.round(rotation[1])
            ? current
            : rotation
        );
        onRotationChange.current?.(rotation);
      },
    });
    engine.current = created;
    return () => {
      created.destroy();
      engine.current = null;
    };
    // The engine is built once per canvas. What can change later, the
    // turning speed, is pushed into it by the effect below.
  }, [engine, defaultRotation, listeners]);

  useEffect(() => {
    engine.current?.setAutoRotate(planet.autoRotate);
  }, [engine, planet.autoRotate]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!planet.interactive || event.button !== 0) return;
    // A press that starts on a marker belongs to the marker.
    if ((event.target as HTMLElement).closest('[data-planet-marker]')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      // A finger moving vertically is scrolling the page, so only a mouse or a
      // pen tips the globe as well as turning it.
      vertical: event.pointerType !== 'touch',
    };
    engine.current?.dragStart();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = pointer.current;
    if (!active || active.id !== event.pointerId) return;
    engine.current?.dragMove(event.clientX - active.x, event.clientY - active.y, active.vertical);
    active.x = event.clientX;
    active.y = event.clientY;
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointer.current?.id !== event.pointerId) return;
    pointer.current = null;
    engine.current?.dragEnd();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!planet.interactive) return;
    const turn: Record<string, [number, number]> = {
      ArrowLeft: [-KEY_STEP, 0],
      ArrowRight: [KEY_STEP, 0],
      ArrowUp: [0, KEY_STEP],
      ArrowDown: [0, -KEY_STEP],
    };
    const by = turn[event.key];
    if (!by) return;
    event.preventDefault();
    planet.rotateBy(by[0], by[1]);
  };

  const longitude = Math.round(settled[0]);
  const side = longitude === 0 ? '' : longitude > 0 ? ' east' : ' west';

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        role: planet.interactive ? 'slider' : 'img',
        'aria-label': label,
        'aria-orientation': planet.interactive ? 'horizontal' : undefined,
        'aria-valuemin': planet.interactive ? -180 : undefined,
        'aria-valuemax': planet.interactive ? 180 : undefined,
        'aria-valuenow': planet.interactive ? longitude : undefined,
        'aria-valuetext': planet.interactive ? `Centred on ${Math.abs(longitude)} degrees${side}` : undefined,
        tabIndex: planet.interactive ? 0 : undefined,
        className: slots.globe({ className }),
        onPointerDown: onPointerDown,
        onPointerMove: onPointerMove,
        onPointerUp: endDrag,
        onPointerCancel: endDrag,
        onPointerEnter: () => engine.current?.setHover(true),
        onPointerLeave: () => engine.current?.setHover(false),
        onKeyDown: onKeyDown,
        children: (
          <>
            <canvas ref={canvas} aria-hidden="true" className={slots.canvas()} />
            <div className={slots.markers()}>{children}</div>
          </>
        ),
      },
      props
    ),
  });
}
PlanetGlobe.displayName = 'Planet.Globe';

/* -------------------------------------------------------------------------- */
/* Marker                                                                     */
/* -------------------------------------------------------------------------- */

/** Which of the theme's roles a marker's dot is drawn in. */
export type PlanetMarkerColor = 'primary' | 'info' | 'success' | 'warning' | 'destructive';

export interface PlanetMarkerProps extends Omit<ComponentProps<'div'>, 'children' | 'color' | 'onClick'> {
  /** Degrees north of the equator. South is negative. */
  lat: number;
  /** Degrees east of Greenwich. West is negative. */
  lng: number;
  /** A caption in a tag above the pin. */
  label?: ReactNode;
  /** A figure after the label, in a quieter colour. */
  count?: ReactNode;
  /** Which of the theme's roles the dot, or the ring of a pin with children, is drawn in. */
  color?: PlanetMarkerColor;
  /** Spreads a fading ring from the marker, for one that wants looking at. */
  pulse?: boolean;
  /**
   * Called when the marker is pressed. Passing this makes the marker a
   * button: it takes focus, and Enter or Space press it.
   */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Draws the marker as the one that has been picked. */
  selected?: boolean;
  /** What a screen reader calls a marker that can be pressed. Defaults to its label. */
  name?: string;
  /** Extra classes for the label. */
  labelClassName?: string;
  /** What is drawn at the coordinate: an avatar, an icon. A dot when left out. */
  children?: ReactNode;
}

/** How near the edge a marker starts to fade, as depth. */
const FADE_FROM = 0.28;
const FADE_TO = 0.06;

function PlanetMarker({
  lat,
  lng,
  label,
  count,
  color = 'primary',
  pulse = false,
  onClick,
  selected = false,
  name,
  className,
  labelClassName,
  children,
  render,
  ...props
}: PlanetMarkerProps & RenderProp<'div'>) {
  const slots = planetVariants({ color, selected });
  const planet = usePlanetContext('Planet.Marker');
  const element = useRef<HTMLDivElement>(null);
  const { subscribe } = planet;

  useEffect(
    () =>
      subscribe((project) => {
        const node = element.current;
        if (!node) return;
        const { x, y, depth } = project(lat, lng);
        const shown = clamp((depth - FADE_TO) / (FADE_FROM - FADE_TO), 0, 1);
        // `translate` is its own property, so it does not replace the classes'
        // transform that centres the pin on the point.
        node.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
        node.style.opacity = shown.toFixed(3);
        node.style.pointerEvents = shown > 0.5 ? '' : 'none';
        // A marker on the far side cannot be seen, so it cannot be tabbed to.
        node.toggleAttribute('inert', shown <= 0.5);
        // Nearer the viewer is on top, as it would be on a real globe.
        node.style.zIndex = String(Math.round(depth * 100));
      }),
    [subscribe, lat, lng]
  );

  const body = (
    <>
      {label !== undefined && label !== null ? (
        <span className={slots.label({ className: labelClassName })}>
          {label}
          {count !== undefined && count !== null ? <span className={slots.count()}>{count}</span> : null}
        </span>
      ) : null}
      {pulse ? <span aria-hidden="true" className={slots.pulse()} /> : null}
      {children !== undefined && children !== null ? (
        <span data-pin="" className={slots.pin()}>
          {children}
        </span>
      ) : (
        <span data-pin="" className={slots.dot()} />
      )}
    </>
  );

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        ref: element,
        'data-planet-marker': '',
        className: slots.marker({ className }),
        children: (
          <>
            {onClick ? (
              <button
                type="button"
                aria-label={name ?? (typeof label === 'string' ? label : undefined)}
                aria-pressed={selected}
                className={slots.press()}
                onClick={onClick}
                // Kept from the globe, which would otherwise take the press as the
                // start of a drag and the click would never arrive.
                onPointerDown={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                {body}
              </button>
            ) : (
              body
            )}
          </>
        ),
      },
      props
    ),
  });
}
PlanetMarker.displayName = 'Planet.Marker';

/* -------------------------------------------------------------------------- */
/* Controls                                                                   */
/* -------------------------------------------------------------------------- */

export interface PlanetControlsProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** Degrees of longitude one press turns the globe. */
  step?: number;
  /** Words to show between the two arrows. Without them it is the arrows alone. */
  children?: ReactNode;
}

const Arrow = ({ flipped }: { flipped?: boolean }) => (
  <svg
    viewBox="0 0 16 16"
    aria-hidden="true"
    className={flipped ? 'size-4 -scale-x-100' : 'size-4'}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);

function PlanetControls({ step = 60, className, children, render, ...props }: PlanetControlsProps & RenderProp<'div'>) {
  const slots = planetVariants();
  const planet = usePlanetContext('Planet.Controls');

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        role: 'group',
        'aria-label': 'Turn the globe',
        className: slots.controls({ className }),
        children: (
          <>
            <button
              type="button"
              aria-label="Turn west"
              className={slots.control()}
              onClick={() => planet.rotateBy(-step)}
            >
              <Arrow flipped />
            </button>
            {children !== undefined && children !== null ? <span className={slots.caption()}>{children}</span> : null}
            <button
              type="button"
              aria-label="Turn east"
              className={slots.control()}
              onClick={() => planet.rotateBy(step)}
            >
              <Arrow />
            </button>
          </>
        ),
      },
      props
    ),
  });
}
PlanetControls.displayName = 'Planet.Controls';

/* -------------------------------------------------------------------------- */
/* The list                                                                   */
/* -------------------------------------------------------------------------- */

export interface PlanetListProps extends ComponentProps<'ul'> {}

/**
 * The places on the globe as a list, in two columns, for picking one by name.
 * Put it beside or under the globe and turn the globe to whatever is picked.
 */
function PlanetList({ className, render, ...props }: PlanetListProps & RenderProp<'ul'>) {
  return useRender({
    defaultTagName: 'ul',
    render,
    props: mergeProps({ 'data-slot': 'planet-list', className: planetVariants().list({ className }) }, props),
  });
}
PlanetList.displayName = 'Planet.List';

export interface PlanetListItemProps extends Omit<ComponentProps<'button'>, 'color'> {
  /** The colour of the dot before the name. Match it to the place's marker. */
  color?: PlanetMarkerColor;
  /** Draws the row as the one that has been picked. */
  selected?: boolean;
}

/** One place in `Planet.List`: a dot in its marker's colour, and its name. A button. */
function PlanetListItem({
  color = 'primary',
  selected = false,
  className,
  children,
  render,
  ...props
}: PlanetListItemProps & RenderProp<'button'>) {
  const slots = planetVariants({ color });
  // `render` draws the row's button as something else, such as a link to the place.
  const button = useRender({
    defaultTagName: 'button',
    render,
    props: mergeProps(
      {
        type: render ? undefined : ('button' as const),
        'aria-pressed': selected,
        className: slots.listItem({ className }),
        children: (
          <>
            <span aria-hidden="true" className={slots.listDot()} />
            <span className={slots.listName()}>{children}</span>
          </>
        ),
      },
      props
    ),
  });
  return <li data-slot="planet-list-item">{button}</li>;
}
PlanetListItem.displayName = 'Planet.ListItem';

export const Planet = Object.assign(PlanetRoot, {
  Globe: PlanetGlobe,
  Marker: PlanetMarker,
  Controls: PlanetControls,
  List: PlanetList,
  ListItem: PlanetListItem,
});

/*
 * The parts again, by name. `Planet.Globe` is a property of a component, and a
 * Server Component cannot read a property off something imported from a
 * client module, only pass the import itself along. So a page that is a
 * Server Component writes `<PlanetGlobe>`; anywhere else the dotted form is
 * the same thing.
 */
export { PlanetGlobe, PlanetMarker, PlanetControls, PlanetList, PlanetListItem };
