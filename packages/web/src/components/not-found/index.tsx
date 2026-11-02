'use client';

/**
 * NotFound — an error code drawn in pixels that come apart when the pointer
 * reaches them, with a title, a line of help and a way out underneath.
 *
 * ```tsx
 * <NotFound>
 *   <NotFound.Code code="404" effect="scatter" />
 *   <NotFound.Title>Nothing lives here</NotFound.Title>
 *   <NotFound.Description>The address may be mistyped, or the page has moved.</NotFound.Description>
 *   <NotFound.Actions>…</NotFound.Actions>
 * </NotFound>
 * ```
 *
 * ## A grid of cells, not a font
 *
 * Each digit is a small bitmap laid on a grid of cells, and every cell is
 * drawn as a dot or a rounded square of its own size and strength. The sizes
 * and strengths are fixed per cell from a seed, so the code has the uneven,
 * hand-placed texture of pixel art and still looks the same on every render.
 * Nothing depends on a typeface loading.
 *
 * ## One digit reacts at a time
 *
 * The digit nearest the pointer is the one that reacts, and it is put back
 * when the pointer moves away. `effect` chooses how: its cells fly apart
 * (`scatter`), drop out one by one (`dissolve`), or travel into a small icon
 * and back (`scramble`). On a touch screen a tap does the same, and the digit
 * is put back a moment after the finger lifts.
 *
 * ## Two colours, mixed by light
 *
 * Every cell is either the text colour, faint, or the accent. Which one it is
 * depends on how much light falls on it: the highlighted digit is always
 * partly lit, a band of light goes slowly round the whole code, and the
 * pointer lights the cells near it and leaves them fading as it moves on. Each
 * cell turns accent at its own level of light, so a shape in half light is
 * dithered between the two colours, the way pixel art is shaded.
 *
 * ## What it costs
 *
 * The cells are drawn on a canvas, a few hundred of them in about sixteen
 * fills. The band asks for 30 frames a second while the code is on screen and
 * none once it is scrolled away; with `ambient={false}` a frame is only drawn
 * while something is moving. The canvas reads its colours from the theme each
 * time it draws, so a change of theme needs nothing from the page.
 */
import { useEffect, useRef, type ComponentProps, type CSSProperties } from 'react';
import { tv } from 'tailwind-variants';
import { GLYPH_COLUMNS, GLYPH_ROWS, ICONS, digitGlyph, type Glyph } from './glyphs';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

/** How the digit near the pointer reacts. */
export type NotFoundEffect = 'scatter' | 'dissolve' | 'scramble';

/** Which of the theme's roles the highlighted digit is drawn in. */
export type NotFoundColor = 'primary' | 'info' | 'success' | 'warning' | 'destructive';

const notFoundVariants = tv({
  slots: {
    // `overflow-x-clip` keeps flying cells from widening the page on a phone.
    // It clips one axis only, so nothing above or below is cut off.
    root: 'relative isolate flex w-full flex-col items-center gap-3 overflow-x-clip px-4 text-center',
    // A faint grid with a small cross where its lines meet, fading out towards
    // the edges. Drawn in the text colour at a few percent, so it suits either theme.
    backdrop: 'pointer-events-none absolute inset-0 -z-10 bg-foreground/15',
    code: 'relative mb-6 w-full max-w-xl select-none',
    // The canvas is larger than the box the code takes in the layout, so
    // scattered cells have somewhere to go. It takes no pointer events: the
    // page under it stays usable while cells are flying over it.
    canvas: 'pointer-events-none absolute text-foreground [outline-color:var(--pu-color)]',
    title: 'text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl',
    description: 'max-w-md text-balance text-base text-muted-foreground',
    actions: 'mt-4 flex flex-wrap items-center justify-center gap-2',
  },
  variants: {
    backdrop: {
      true: { root: 'py-12' },
    },
    color: {
      primary: { code: '[--pu-color:var(--primary)]' },
      info: { code: '[--pu-color:var(--info)]' },
      success: { code: '[--pu-color:var(--success)]' },
      warning: { code: '[--pu-color:var(--warning)]' },
      destructive: { code: '[--pu-color:var(--destructive)]' },
    },
  },
  defaultVariants: { color: 'info' },
});

/* -------------------------------------------------------------------------- */
/* Layout                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Empty cells between two digits: two of a digit's own pixels. Any closer and
 * the outlines of neighbouring digits read as one pattern.
 */
const GAP = 6;
/** Room round the code, in cells, for scattered cells to fly into. */
const PAD_X = 10;
const PAD_Y = 8;

interface Layout {
  /** Cells across the code itself. */
  columns: number;
  /** The first column of each character. */
  lefts: number[];
}

function layoutOf(code: string): Layout {
  const lefts: number[] = [];
  let x = 0;
  for (let i = 0; i < code.length; i += 1) {
    if (i > 0) x += GAP;
    lefts.push(x);
    x += GLYPH_COLUMNS;
  }
  return { columns: Math.max(x, 1), lefts };
}

/* -------------------------------------------------------------------------- */
/* Engine                                                                      */
/* -------------------------------------------------------------------------- */

/** A small fast hash, so a cell's look is the same on every render. */
function seeded(n: number) {
  let t = (n * 0x9e3779b9) >>> 0;
  t = Math.imul(t ^ (t >>> 16), 0x85ebca6b) >>> 0;
  t = Math.imul(t ^ (t >>> 13), 0xc2b2ae35) >>> 0;
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** How strong an unlit cell is drawn: three strengths, picked per cell. */
const PLAIN_TONES = [0.22, 0.34, 0.48];
/** How lit the highlighted digit is with nothing else lighting it. */
const HIGHLIGHT_LIGHT = 0.72;
/** How far the pointer's light reaches, in cells. */
const HEAT_RADIUS = 5;
/** How fast a cell lights under the pointer, and how fast it fades after, per second. */
const HEAT_RISE = 22;
const HEAT_FALL = 2.6;
/** How fast the band of light goes round the code, in radians a second. */
const BAND_SPEED = 0.55;
/** How wide the band is, in radians either side of its middle. */
const BAND_WIDTH = 0.7;
/** Steps of opacity the cells are batched into. Each is one fill per frame. */
const ALPHA_STEPS = 12;

/** Cells within this distance of a digit, in cells, make it react. */
const APPROACH = 2.5;
/** And it is put back once the pointer is this far away. */
const RELEASE = 4.5;
/** How long a tapped digit stays apart after the finger lifts, in ms. */
const TOUCH_HOLD = 700;

interface Particle {
  /** Home, in cells from the canvas's top left. */
  hx: number;
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Where Scatter sends it, relative to home. */
  sx: number;
  sy: number;
  /** A dot or a rounded square. */
  square: boolean;
  /** Its size, as a share of a cell. */
  size: number;
  tone: number;
  seed: number;
  /** Lit above this much light. Different per cell, so light dithers across a shape. */
  pick: number;
  /** Light left by the pointer, 0 to 1, fading after it moves on. */
  heat: number;
  /** Dissolve takes it out once the digit's progress passes this. */
  threshold: number;
  /** Scramble: where it leaves from and goes to, and how it fades on the way. */
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  /** 1 fades in on the way, -1 fades out, 0 stays. */
  fade: number;
}

interface Digit {
  left: number;
  accent: boolean;
  /** The cells at home. */
  cells: Particle[];
  /** What is drawn: the cells, or Scramble's travelling copy of them. */
  particles: Particle[];
  active: boolean;
  /** Dissolve and Scramble's progress, 0 at rest and 1 fully apart. */
  amount: number;
  /** The icon Scramble turns it into next. */
  icon: number;
  /** Where Scramble's cells gather on the way. */
  mx: number;
  my: number;
}

interface Engine {
  setEffect(effect: NotFoundEffect): void;
  destroy(): void;
}

interface EngineOptions {
  canvas: HTMLCanvasElement;
  code: string;
  fill: 'outline' | 'solid';
  highlight: number | null;
  effect: NotFoundEffect;
  ambient: boolean;
}

function makeCell(hx: number, hy: number, salt: number): Particle {
  const seed = seeded(salt);
  const pick = seeded(salt + 7919);
  return {
    hx,
    hy,
    x: hx,
    y: hy,
    vx: 0,
    vy: 0,
    sx: 0,
    sy: 0,
    // Mostly dots, with a square here and there.
    square: pick < 0.28,
    size: 0.56 + seeded(salt + 104729) * 0.34,
    tone: Math.floor(seeded(salt + 1299709) * 3),
    seed,
    pick: seeded(salt + 15485863),
    heat: 0,
    threshold: seed,
    fx: hx,
    fy: hy,
    tx: hx,
    ty: hy,
    fade: 0,
  };
}

function cellsOf(glyph: Glyph, left: number, salt: number): Particle[] {
  const cells: Particle[] = [];
  glyph.forEach((row, y) =>
    row.forEach((on, x) => {
      if (on) cells.push(makeCell(PAD_X + left + x, PAD_Y + y, salt * 4099 + y * 97 + x));
    })
  );
  return cells;
}

/** Cells sorted by their angle round a point, so two shapes can be paired off in order. */
function byAngle<T extends { x: number; y: number }>(cells: T[], cx: number, cy: number): T[] {
  return [...cells].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
}

function createEngine({ canvas, code, fill, highlight, effect: initialEffect, ambient }: EngineOptions): Engine {
  const context = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const layout = layoutOf(code);
  const columns = layout.columns + PAD_X * 2;

  let effect = initialEffect;
  let pitch = 0;
  let width = 0;
  let height = 0;
  let frame = 0;
  let last = 0;
  let time = 0;
  let destroyed = false;
  let visible = true;
  /** The pointer, in cells, or `null` when it is not over the page. */
  let pointer: { x: number; y: number } | null = null;
  let touchTimer = 0;
  /** 1 while the code is first being drawn in, falling to 0. */
  let intro = reducedMotion.matches ? 0 : 1;
  /** Whether any cell is still lit by the pointer, as of the last frame drawn. */
  let warm = false;
  let lastDraw = 0;
  /** The middle of the code, and half its size, in cells. The band goes round this. */
  const middle = { x: PAD_X + layout.columns / 2, y: PAD_Y + GLYPH_ROWS / 2 };
  const half = { x: layout.columns / 2, y: GLYPH_ROWS / 2 };

  const digits: Digit[] = [...code].map((character, index) => {
    const glyph = digitGlyph(character, fill);
    const cells = glyph ? cellsOf(glyph, layout.lefts[index] ?? 0, index + 1) : [];
    return {
      left: layout.lefts[index] ?? 0,
      accent: index === highlight,
      cells,
      particles: cells,
      active: false,
      amount: 0,
      icon: index % ICONS.length,
      mx: 0,
      my: 0,
    };
  });
  // The highlighted digit is drawn last, so its debris flies over the others'.
  const order = digits.map((_, i) => i).sort((a, b) => Number(digits[a]!.accent) - Number(digits[b]!.accent));

  /* -------------------------- starting each effect -------------------------- */

  const centreOf = (digit: Digit) => ({
    x: PAD_X + digit.left + GLYPH_COLUMNS / 2,
    y: PAD_Y + GLYPH_ROWS / 2,
  });

  const startScatter = (digit: Digit) => {
    const from = pointer ?? centreOf(digit);
    for (const cell of digit.cells) {
      // Away from the pointer, spread a little either side, and further for
      // the cells that were nearest it.
      const away = Math.atan2(cell.hy - from.y, cell.hx - from.x);
      const angle = away + (cell.seed - 0.5) * 1.6;
      const near = 1 - clamp(Math.hypot(cell.hx - from.x, cell.hy - from.y) / 16, 0, 1);
      const distance = 3 + seeded(cell.seed * 1e6) * 7 + near * 6;
      cell.sx = Math.cos(angle) * distance;
      cell.sy = Math.sin(angle) * distance;
      // A kick in the same direction, so they burst rather than drift.
      cell.vx += Math.cos(angle) * distance * 5;
      cell.vy += Math.sin(angle) * distance * 5;
    }
  };

  const startDissolve = (digit: Digit) => {
    const from = pointer ?? centreOf(digit);
    // Nearest the pointer goes first, with enough noise that it reads as
    // pixels dropping out and not as a wipe.
    for (const cell of digit.cells) {
      const distance = clamp(Math.hypot(cell.hx - from.x, cell.hy - from.y) / 22, 0, 1);
      cell.threshold = 0.62 * distance + 0.38 * cell.seed;
    }
  };

  const startScramble = (digit: Digit) => {
    const centre = centreOf(digit);
    const from = byAngle(
      digit.cells.map((cell) => ({ x: cell.hx, y: cell.hy, cell })),
      centre.x,
      centre.y
    );
    const icon = ICONS[digit.icon % ICONS.length]!;
    const to = byAngle(
      cellsOf(icon, digit.left, 0).map((cell) => ({ x: cell.hx, y: cell.hy })),
      centre.x,
      centre.y
    );
    const count = Math.max(from.length, to.length);
    const particles: Particle[] = [];
    const usedFrom = new Set<number>();
    const usedTo = new Set<number>();
    for (let i = 0; i < count; i += 1) {
      const a = Math.floor((i * from.length) / count);
      const b = Math.floor((i * to.length) / count);
      const source = from[a];
      const target = to[b];
      if (!source || !target) continue;
      const particle = { ...source.cell };
      particle.fx = source.x;
      particle.fy = source.y;
      particle.tx = target.x;
      particle.ty = target.y;
      // A cell that already left, or a target already reached, is a second
      // copy: it fades in or out so the count can change without a pile-up.
      particle.fade = usedFrom.has(a) ? 1 : usedTo.has(b) ? -1 : 0;
      usedFrom.add(a);
      usedTo.add(b);
      particles.push(particle);
    }
    digit.particles = particles;
    // They gather near the pointer on the way, as if it had picked them up.
    const at = pointer ?? centre;
    digit.mx = at.x + (seeded(digit.icon + 31) - 0.5) * 3;
    digit.my = at.y + (seeded(digit.icon + 37) - 0.5) * 3;
  };

  const activate = (index: number) => {
    digits.forEach((digit, i) => {
      if (i !== index && digit.active) digit.active = false;
    });
    const digit = digits[index];
    if (!digit || digit.active) return;
    digit.active = true;
    if (effect === 'scatter') startScatter(digit);
    else if (effect === 'dissolve') startDissolve(digit);
    // Scramble only picks a new icon when the digit was whole. Caught on the
    // way back, it turns round and heads for the same one.
    else if (digit.amount === 0) startScramble(digit);
    invalidate();
  };

  const releaseAll = () => {
    let changed = false;
    for (const digit of digits) {
      if (digit.active) {
        digit.active = false;
        changed = true;
      }
    }
    if (changed) invalidate();
  };

  /* --------------------------------- motion --------------------------------- */

  /** Steps every digit on by `dt` seconds. True while anything is still moving. */
  const step = (dt: number) => {
    let moving = false;
    const still = reducedMotion.matches;

    if (intro > 0) {
      intro = still ? 0 : Math.max(0, intro - dt / 0.9);
      moving ||= intro > 0;
    }
    moving ||= warm;

    for (const digit of digits) {
      if (effect === 'scatter') {
        if (still) {
          digit.amount = digit.active ? 1 : 0;
          for (const cell of digit.cells) {
            cell.x = cell.hx;
            cell.y = cell.hy;
            cell.vx = 0;
            cell.vy = 0;
          }
          continue;
        }
        // Stiffer on the way home than on the way out: the burst should feel
        // loose, the return should snap shut.
        const stiffness = digit.active ? 60 : 150;
        const damping = 2 * Math.sqrt(stiffness) * (digit.active ? 0.7 : 0.92);
        for (const cell of digit.cells) {
          let tx = cell.hx;
          let ty = cell.hy;
          if (digit.active) {
            // Scattered cells keep drifting, so the debris is not a still picture.
            tx += cell.sx + Math.sin(time * 1.4 + cell.seed * 40) * 0.5;
            ty += cell.sy + Math.cos(time * 1.2 + cell.seed * 70) * 0.5;
          }
          // Two half steps keep a stiff spring from overshooting at 30fps.
          for (let s = 0; s < 2; s += 1) {
            const h = dt / 2;
            cell.vx += ((tx - cell.x) * stiffness - cell.vx * damping) * h;
            cell.vy += ((ty - cell.y) * stiffness - cell.vy * damping) * h;
            cell.x += cell.vx * h;
            cell.y += cell.vy * h;
          }
          if (
            !digit.active &&
            Math.abs(cell.x - tx) < 0.004 &&
            Math.abs(cell.y - ty) < 0.004 &&
            Math.abs(cell.vx) + Math.abs(cell.vy) < 0.02
          ) {
            cell.x = tx;
            cell.y = ty;
            cell.vx = 0;
            cell.vy = 0;
          } else {
            moving = true;
          }
        }
        continue;
      }

      // Dissolve and Scramble run on one number per digit.
      const target = digit.active ? 1 : 0;
      if (digit.amount !== target) {
        if (still) digit.amount = target;
        else {
          const duration = effect === 'scramble' ? 0.7 : digit.active ? 0.45 : 0.6;
          digit.amount =
            target > digit.amount
              ? Math.min(target, digit.amount + dt / duration)
              : Math.max(target, digit.amount - dt / duration);
        }
        moving ||= digit.amount !== target;
      }
      if (effect === 'scramble' && digit.amount === 0 && !digit.active && digit.particles !== digit.cells) {
        // Home again. The next scramble goes to the next icon.
        digit.particles = digit.cells;
        digit.icon = (digit.icon + 1) % ICONS.length;
      }
    }
    return moving;
  };

  /* --------------------------------- drawing -------------------------------- */

  const draw = (dt = 0) => {
    if (!context || width === 0) return;
    const ratio = window.devicePixelRatio || 1;
    const style = getComputedStyle(canvas);
    const plain = style.color;
    const accent = style.outlineColor || plain;
    const still = reducedMotion.matches;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    // One path per colour, opacity step and shape. A few hundred cells come
    // out as a handful of fills.
    const paths = new Map<string, Path2D>();
    const add = (isAccent: boolean, alpha: number, square: boolean, x: number, y: number, r: number) => {
      if (alpha <= 0.02 || r <= 0.2) return;
      const level = clamp(Math.round(alpha * ALPHA_STEPS), 1, ALPHA_STEPS);
      const key = `${isAccent ? 1 : 0}${square ? 1 : 0}${level}`;
      let path = paths.get(key);
      if (!path) {
        path = new Path2D();
        paths.set(key, path);
      }
      if (square) {
        if (typeof path.roundRect === 'function') path.roundRect(x - r, y - r, r * 2, r * 2, r * 0.35);
        else path.rect(x - r, y - r, r * 2, r * 2);
      } else {
        path.moveTo(x + r, y);
        path.arc(x, y, r, 0, Math.PI * 2);
      }
    };

    // The band of light: where it is now, or held on the left without motion.
    const band = still || !ambient ? Math.PI : time * BAND_SPEED;
    let anyWarm = false;

    for (const index of order) {
      const digit = digits[index]!;
      const amount = digit.amount;
      // Stepped, so dissolving pixels go in visible ticks, the way pixel art moves.
      const stepped = Math.floor(amount * 24) / 24;
      const scrambleAt = easeInOut(amount);

      for (const cell of digit.particles) {
        let x = cell.x;
        let y = cell.y;
        let alpha = 1;
        let size = cell.size;
        let isAccent = false;

        // Drawn in on first sight, in the same pixel-by-pixel way.
        if (intro > 0 && cell.seed * 0.7 + index * 0.1 < intro) continue;

        if (still && digit.active && effect !== 'scramble') {
          // No movement asked for: the digit only dims.
          alpha *= 0.25;
        } else if (effect === 'scatter') {
          const flown = clamp(Math.hypot(x - cell.hx, y - cell.hy) / 9, 0, 1);
          size *= 1 - flown * 0.35;
          alpha *= 1 - flown * 0.3;
        } else if (effect === 'dissolve') {
          if (cell.threshold < stepped) continue;
          // The cells about to go, or just back, flash in the accent first.
          if (cell.threshold - stepped < 0.07 && stepped > 0) {
            isAccent = true;
            size *= 1.2;
            alpha = 1;
          }
        } else if (effect === 'scramble' && digit.particles !== digit.cells) {
          // Each cell leaves a little after the last, through the gathering point.
          const delay = cell.seed * 0.3;
          const t = still ? amount : easeInOut(clamp((amount - delay) / 0.7, 0, 1));
          const u = 1 - t;
          x = u * u * cell.fx + 2 * u * t * digit.mx + t * t * cell.tx;
          y = u * u * cell.fy + 2 * u * t * digit.my + t * t * cell.ty;
          // Scattered a little mid-flight, so the crowd reads as noise.
          const noise = Math.sin(Math.PI * t) * (still ? 0 : 1.4);
          x += (seeded(cell.seed * 1e5) - 0.5) * noise;
          y += (seeded(cell.seed * 2e5) - 0.5) * noise;
          if (cell.fade === 1) alpha *= scrambleAt;
          if (cell.fade === -1) alpha *= 1 - scrambleAt;
        }

        /*
         * Light. Three things light a cell: being in the highlighted digit,
         * the band going slowly round the code, and the pointer having been
         * near. Each cell turns accent at its own level of light, so a shape
         * half in the light is dithered between the two colours, the way
         * pixel art shades.
         */
        let heat = 0;
        if (pointer && !still) {
          const reach = 1 - Math.hypot(x - pointer.x, y - pointer.y) / HEAT_RADIUS;
          heat = reach > 0 ? reach * reach * (3 - 2 * reach) : 0;
        } else if (pointer) {
          const reach = 1 - Math.hypot(x - pointer.x, y - pointer.y) / HEAT_RADIUS;
          heat = reach > 0 ? 1 : 0;
        }
        if (dt > 0) {
          const rate = heat > cell.heat ? HEAT_RISE : HEAT_FALL;
          cell.heat += (heat - cell.heat) * (1 - Math.exp(-dt * rate));
          if (cell.heat < 0.004) cell.heat = 0;
        }
        if (cell.heat > 0) anyWarm = true;

        const around = Math.atan2((y - middle.y) / half.y, (x - middle.x) / half.x);
        const off = Math.atan2(Math.sin(around - band), Math.cos(around - band));
        const swept = ambient ? Math.exp(-(off * off) / (2 * BAND_WIDTH * BAND_WIDTH)) * 0.85 : 0;
        const light = Math.min(1, Math.max(digit.accent ? HIGHLIGHT_LIGHT : 0, swept, cell.heat));

        if (isAccent) {
          // Dissolve's flash, already decided.
        } else if (light > 0.1 + cell.pick * 0.85) {
          isAccent = true;
          alpha *= 0.66 + 0.34 * light;
        } else {
          alpha *= (PLAIN_TONES[cell.tone] ?? 0.34) + 0.18 * light;
        }
        size *= 0.9 + 0.2 * light + 0.35 * cell.heat;

        add(isAccent, alpha, cell.square, (x + 0.5) * pitch, (y + 0.5) * pitch, (size * pitch) / 2);
      }
    }

    warm = anyWarm;

    for (const [key, path] of paths) {
      context.fillStyle = key[0] === '1' ? accent : plain;
      context.globalAlpha = Number(key.slice(2)) / ALPHA_STEPS;
      context.fill(path);
    }
    context.globalAlpha = 1;
  };

  /* ---------------------------------- loop ---------------------------------- */

  const tick = (now: number) => {
    frame = 0;
    if (destroyed) return;
    const dt = last === 0 ? 1 / 60 : Math.min(1 / 30, (now - last) / 1000);
    last = now;
    time += dt;
    const moving = step(dt);
    const turning = ambient && !reducedMotion.matches;
    // With only the band moving, 30 frames a second is plenty and halves the work.
    if (moving || now - lastDraw >= 32) {
      draw(now - lastDraw > 0 && lastDraw !== 0 ? Math.min(1 / 15, (now - lastDraw) / 1000) : dt);
      lastDraw = now;
    }
    if ((moving || turning) && visible) frame = requestAnimationFrame(tick);
    else {
      last = 0;
      lastDraw = 0;
    }
  };

  function invalidate() {
    if (frame === 0 && !destroyed) frame = requestAnimationFrame(tick);
  }

  /* --------------------------------- pointer -------------------------------- */

  /** Which digit is nearest the pointer, and how far away it is, in cells. */
  const nearest = () => {
    if (!pointer) return { index: -1, distance: Infinity };
    let index = -1;
    let distance = Infinity;
    digits.forEach((digit, i) => {
      if (digit.cells.length === 0) return;
      const left = PAD_X + digit.left;
      const dx = Math.max(left - pointer!.x, 0, pointer!.x - (left + GLYPH_COLUMNS));
      const dy = Math.max(PAD_Y - pointer!.y, 0, pointer!.y - (PAD_Y + GLYPH_ROWS));
      const d = Math.hypot(dx, dy);
      if (d < distance) {
        distance = d;
        index = i;
      }
    });
    return { index, distance };
  };

  const track = (event: PointerEvent) => {
    if (pitch === 0) return;
    const rect = canvas.getBoundingClientRect();
    pointer = {
      x: (event.clientX - rect.left) / pitch - 0.5,
      y: (event.clientY - rect.top) / pitch - 0.5,
    };
  };

  const onMove = (event: PointerEvent) => {
    // A finger only counts while it is down, and that is handled below.
    if (event.pointerType === 'touch') return;
    track(event);
    // Anywhere over the canvas the pointer lights cells, so a frame is wanted
    // even when no digit is close enough to react.
    if (
      pointer &&
      pointer.x > -HEAT_RADIUS &&
      pointer.x < columns + HEAT_RADIUS &&
      pointer.y > -HEAT_RADIUS &&
      pointer.y < GLYPH_ROWS + PAD_Y * 2 + HEAT_RADIUS
    )
      invalidate();
    const { index, distance } = nearest();
    const current = digits.findIndex((digit) => digit.active);
    if (index !== -1 && distance <= APPROACH) activate(index);
    else if (current !== -1 && (index !== current || distance > RELEASE)) releaseAll();
  };

  const onDown = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') return;
    track(event);
    const { index, distance } = nearest();
    if (index === -1 || distance > APPROACH) return;
    window.clearTimeout(touchTimer);
    activate(index);
  };

  const onUp = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') return;
    window.clearTimeout(touchTimer);
    touchTimer = window.setTimeout(releaseAll, TOUCH_HOLD);
  };

  const onLeave = () => {
    pointer = null;
    releaseAll();
  };
  const onOut = (event: PointerEvent) => {
    if (event.relatedTarget === null) onLeave();
  };

  let listening = false;
  const listen = (on: boolean) => {
    if (on === listening) return;
    listening = on;
    const root = document.documentElement;
    if (on) {
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerdown', onDown, { passive: true });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
      root.addEventListener('pointerout', onOut);
      window.addEventListener('blur', onLeave);
    } else {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      root.removeEventListener('pointerout', onOut);
      window.removeEventListener('blur', onLeave);
    }
  };

  /* ------------------------------ observers -------------------------------- */

  const resize = new ResizeObserver(() => {
    const next = canvas.clientWidth;
    if (next === 0) return;
    const ratio = window.devicePixelRatio || 1;
    width = next;
    pitch = width / columns;
    height = pitch * (GLYPH_ROWS + PAD_Y * 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    // Straight away: resizing cleared the canvas, and a frame's wait would
    // show it empty.
    draw();
    invalidate();
  });
  resize.observe(canvas);

  const theme = new MutationObserver(invalidate);
  theme.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'style', 'data-theme'],
  });

  // Off screen nothing listens and nothing moves. Coming back finishes
  // whatever was under way.
  const viewport = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
    listen(visible);
    if (!visible) releaseAll();
    invalidate();
  });
  viewport.observe(canvas);

  reducedMotion.addEventListener('change', invalidate);

  return {
    setEffect(next) {
      if (next === effect) return;
      // Put everything back first, so no digit is left half way into the
      // previous effect.
      for (const digit of digits) {
        digit.active = false;
        digit.amount = 0;
        digit.particles = digit.cells;
        for (const cell of digit.cells) {
          cell.x = cell.hx;
          cell.y = cell.hy;
          cell.vx = 0;
          cell.vy = 0;
        }
      }
      effect = next;
      invalidate();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(touchTimer);
      listen(false);
      resize.disconnect();
      theme.disconnect();
      viewport.disconnect();
      reducedMotion.removeEventListener('change', invalidate);
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Parts                                                                       */
/* -------------------------------------------------------------------------- */

export interface NotFoundProps extends ComponentProps<'div'> {
  /** Draws a faint grid behind everything, fading out towards the edges. On by default. */
  backdrop?: boolean;
}

const GRID_TILE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Cpath d='M0 24.5H48M24.5 0V48' stroke='%23000' stroke-opacity='.45'/%3E%3Cpath d='M20 24.5H29M24.5 20V29' stroke='%23000'/%3E%3C/svg%3E\")";

const backdropStyle: CSSProperties = {
  maskImage: `${GRID_TILE}, radial-gradient(closest-side, #000 35%, transparent)`,
  maskSize: '48px 48px, 100% 100%',
  maskRepeat: 'repeat, no-repeat',
  maskPosition: 'center, center',
  maskComposite: 'intersect',
  WebkitMaskImage: `${GRID_TILE}, radial-gradient(closest-side, #000 35%, transparent)`,
  WebkitMaskSize: '48px 48px, 100% 100%',
  WebkitMaskRepeat: 'repeat, no-repeat',
  WebkitMaskPosition: 'center, center',
  WebkitMaskComposite: 'source-in',
};

/** The column the code, the title, the description and the actions stand in, centred. */
function NotFoundRoot({ backdrop = true, className, children, render, ...props }: NotFoundProps & RenderProp<'div'>) {
  const slots = notFoundVariants({ backdrop });
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'not-found',
        className: slots.root({ className }),
        children: (
          <>
            {backdrop ? (
              <span
                aria-hidden="true"
                data-slot="not-found-backdrop"
                className={slots.backdrop()}
                style={backdropStyle}
              />
            ) : null}
            {children}
          </>
        ),
      },
      props
    ),
  });
}
NotFoundRoot.displayName = 'NotFound';

export interface NotFoundCodeProps extends Omit<ComponentProps<'div'>, 'children' | 'color'> {
  /** The code to draw. Digits only; any other character leaves a blank the width of a digit. */
  code?: string;
  /** How the digit nearest the pointer reacts. */
  effect?: NotFoundEffect;
  /** Digits drawn with solid strokes three cells wide, or as their outline. */
  fill?: 'outline' | 'solid';
  /**
   * A band of light that goes slowly round the code on its own. While it is
   * on, the canvas draws about 30 frames a second when the code is on screen;
   * turn it off and nothing is drawn until the pointer comes near.
   */
  ambient?: boolean;
  /** The theme role of the accent: the highlighted digit, the band of light and the pointer's light. */
  color?: NotFoundColor;
  /**
   * Which digit is lit in `color` even with nothing else lighting it, counting
   * from 0. Defaults to the middle one. `null` lights none of them.
   */
  highlight?: number | null;
  /** What a screen reader says for the code. Defaults to "Error" and the code. */
  label?: string;
}

/** The code, drawn in cells on a canvas. Its box keeps the code's shape before anything is drawn. */
function NotFoundCode({
  code = '404',
  effect = 'scatter',
  fill = 'solid',
  color = 'info',
  ambient = true,
  highlight,
  label,
  className,
  style,
  render,
  ...props
}: NotFoundCodeProps & RenderProp<'div'>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const effectRef = useRef(effect);
  effectRef.current = effect;

  const lit = highlight === undefined ? (code.length > 1 ? Math.floor((code.length - 1) / 2) : null) : highlight;
  const { columns } = layoutOf(code);
  const slots = notFoundVariants({ color });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createEngine({ canvas, code, fill, highlight: lit, effect: effectRef.current, ambient });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [code, fill, lit, ambient]);

  useEffect(() => {
    engineRef.current?.setEffect(effect);
  }, [effect]);

  // The canvas reaches past the box on every side by the padding, given as a
  // share of the box so it scales with it.
  // A canvas does not stretch between `left` and `right` the way a box does:
  // it keeps the size of its pixel buffer. So its size is given outright.
  const canvasStyle: CSSProperties = {
    left: `${(-PAD_X / columns) * 100}%`,
    top: `${(-PAD_Y / GLYPH_ROWS) * 100}%`,
    width: `${(1 + (2 * PAD_X) / columns) * 100}%`,
    height: `${(1 + (2 * PAD_Y) / GLYPH_ROWS) * 100}%`,
  };

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'not-found-code',
        role: 'img',
        'aria-label': label ?? `Error ${code}`,
        className: slots.code({ className }),
        style: { aspectRatio: `${columns} / ${GLYPH_ROWS}`, ...style },
        children: (
          <>
            <canvas ref={canvasRef} aria-hidden="true" className={slots.canvas()} style={canvasStyle} />
          </>
        ),
      },
      props
    ),
  });
}
NotFoundCode.displayName = 'NotFound.Code';

export interface NotFoundTitleProps extends ComponentProps<'h1'> {
  /** The heading level. A page that is only this one message wants `h1`. */
  as?: 'h1' | 'h2' | 'h3';
}

/** What happened, in a few words. */
function NotFoundTitle({ as: Tag = 'h1', className, ...props }: NotFoundTitleProps) {
  return <Tag data-slot="not-found-title" className={notFoundVariants().title({ className })} {...props} />;
}
NotFoundTitle.displayName = 'NotFound.Title';

export interface NotFoundDescriptionProps extends ComponentProps<'p'> {}

/** A line on what to do next. */
function NotFoundDescription({ className, render, ...props }: NotFoundDescriptionProps & RenderProp<'p'>) {
  return useRender({
    defaultTagName: 'p',
    render,
    props: mergeProps(
      { 'data-slot': 'not-found-description', className: notFoundVariants().description({ className }) },
      props
    ),
  });
}
NotFoundDescription.displayName = 'NotFound.Description';

export interface NotFoundActionsProps extends ComponentProps<'div'> {}

/** The ways out: links or buttons in a row that wraps on a narrow screen. */
function NotFoundActions({ className, render, ...props }: NotFoundActionsProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      { 'data-slot': 'not-found-actions', className: notFoundVariants().actions({ className }) },
      props
    ),
  });
}
NotFoundActions.displayName = 'NotFound.Actions';

export const NotFound = Object.assign(NotFoundRoot, {
  Code: NotFoundCode,
  Title: NotFoundTitle,
  Description: NotFoundDescription,
  Actions: NotFoundActions,
});

/*
 * The parts again, by name, for a page that is a Server Component: it cannot
 * read `NotFound.Code` off a client module, only pass the import along.
 */
export { NotFoundCode, NotFoundTitle, NotFoundDescription, NotFoundActions };
