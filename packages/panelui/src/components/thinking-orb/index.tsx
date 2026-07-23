/**
 * ThinkingOrb — a dotted orb that says what an agent is doing.
 *
 * A spinner says "busy". These say *which kind of busy*: particles running
 * tilted orbits for work in flight, a scan meridian sweeping a globe for a
 * search, bands that scramble and click back for a solve. Six states, each a
 * distinct silhouette in motion, so a glance at the orb is enough — which is
 * the whole point of putting one next to a streaming reply.
 *
 * ```tsx
 * <ThinkingOrb state="searching" />
 * <ThinkingOrb state="working" size={20} />
 * ```
 *
 * ## How it is drawn
 *
 * The geometry is honestly three-dimensional — points on a sphere, rotated and
 * tilted, projected orthographically, with depth carried by dot size and ink
 * weight. React Native has no 2D canvas to paint that into, and one animated
 * SVG node per dot would be two hundred native prop writes a frame, which no
 * amount of tuning survives.
 *
 * So the dots are quantised into eight ink buckets and each bucket is emitted
 * as a *single* path of circle arcs. Eight animated props a frame, whatever the
 * dot count, and depth ordering falls out of bucket order for free — depth is
 * what drives the ink in the first place, so painting faint to strong paints
 * far to near. Everything from the trigonometry to the path strings runs in one
 * worklet on the UI thread; React renders once and then never again.
 *
 * Strictly monochrome, from `--color-foreground`, so the orb inverts with the
 * theme and needs no palette of its own.
 */
import { useEffect } from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, {
  runOnUI,
  useAnimatedProps,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import { cn } from '../../utils/cn';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * How many ink levels the dots are rounded to.
 *
 * This is the dial. Every bucket is one animated prop and one path per frame,
 * so fewer is cheaper and more is smoother; below about six the depth falloff
 * starts to band visibly, and above about twelve there is nothing left to see.
 */
const BUCKETS = 8;

/** Ink below this is invisible against any background, so it is not drawn. */
const MIN_INK = 0.03;

/** Dots never shrink past this, or a far dot becomes a gap in the lattice. */
const MIN_RADIUS = 0.3;

/** The frame a still orb shows. Far enough in that no state is at its start. */
const STILL_FRAME = 2.4;

export type ThinkingOrbState =
  | 'working'
  | 'searching'
  | 'solving'
  | 'listening'
  | 'composing'
  | 'shaping';

/** What each state is doing, for anyone who cannot see it. */
const STATE_LABEL: Record<ThinkingOrbState, string> = {
  working: 'Working',
  searching: 'Searching',
  solving: 'Solving',
  listening: 'Listening',
  composing: 'Composing',
  shaping: 'Shaping',
};

/**
 * Density and speed per state, at the two scales.
 *
 * `sm` is not `md` scaled down. Below about thirty pixels a faithful lattice
 * turns to grey mush, so the small orb is a separate design: far fewer dots,
 * each proportionally much larger, running faster so the motion still reads at
 * a size where the individual dots barely do.
 *
 * The counts are lower than a canvas implementation would use, because every
 * dot here is arc commands in a path string built each frame — the cost is in
 * the string, not in the fill.
 */
interface Profile {
  speed: number;
  /** Lattice rows, orbit count, ribbon lanes — whatever the mode counts by. */
  rows: number;
  /** Dots around a row. */
  density: number;
  /** Multiplier on every dot radius. */
  radius: number;
}

const PROFILES: Record<ThinkingOrbState, { md: Profile; sm: Profile }> = {
  working: {
    md: { speed: 1.9, rows: 9, density: 26, radius: 1 },
    sm: { speed: 3.9, rows: 4, density: 12, radius: 2.4 },
  },
  searching: {
    md: { speed: 2.0, rows: 11, density: 28, radius: 1.15 },
    sm: { speed: 2.7, rows: 5, density: 12, radius: 1.75 },
  },
  solving: {
    md: { speed: 1.8, rows: 10, density: 24, radius: 1.05 },
    sm: { speed: 2.0, rows: 5, density: 11, radius: 1.9 },
  },
  listening: {
    md: { speed: 4.4, rows: 10, density: 24, radius: 1 },
    sm: { speed: 4.0, rows: 5, density: 11, radius: 1.6 },
  },
  composing: {
    md: { speed: 2.3, rows: 5, density: 44, radius: 0.85 },
    sm: { speed: 3.1, rows: 3, density: 20, radius: 1.1 },
  },
  shaping: {
    md: { speed: 2.4, rows: 1, density: 26, radius: 1 },
    sm: { speed: 2.1, rows: 1, density: 14, radius: 2.2 },
  },
};

/* -------------------------------------------------------------------------- */
/* Worklet maths                                                              */
/* -------------------------------------------------------------------------- */

/** Deterministic hash in `[0, 1)`. Stable across frames and across mounts. */
function hashD(a: number, b: number): number {
  'worklet';
  const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

/** Shortest signed angular distance, wrapped to `(-π, π]`. */
function angleDelta(a: number, b: number): number {
  'worklet';
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

/** One decimal place. Path strings are rebuilt every frame; every digit costs. */
function q(value: number): number {
  'worklet';
  return Math.round(value * 10) / 10;
}

/**
 * Dot radii were tuned against a 300pt frame; scaling them sub-linearly is what
 * keeps a 20pt orb from becoming a smudge and a 96pt one from becoming beads.
 */
function radiusScale(size: number): number {
  'worklet';
  return (size / 300) ** 0.6;
}

/**
 * A dot, straight into its ink bucket as a circle of arcs.
 *
 * Two half-arcs rather than a `<Circle>`, because a bucket has to be one node:
 * the entire point of bucketing is that the frame costs eight prop writes and
 * not two hundred.
 */
function dot(out: string[], x: number, y: number, r: number, ink: number): void {
  'worklet';
  if (ink < MIN_INK) return;
  const bucket = Math.min(BUCKETS - 1, Math.max(0, Math.floor(ink * BUCKETS)));
  const rr = q(Math.max(MIN_RADIUS, r));
  const d = q(rr * 2);
  out[bucket] += `M${q(x - rr)} ${q(y)}a${rr} ${rr} 0 1 0 ${d} 0a${rr} ${rr} 0 1 0 ${-d} 0`;
}

/**
 * Spin, tilt and orthographic projection, written into a scratch triple.
 *
 * It writes into an array the caller owns rather than returning one, because it
 * is called once per dot per frame — a fresh triple each time is a few hundred
 * allocations a frame for a value read immediately and thrown away.
 */
function project(
  out: number[],
  x: number,
  y: number,
  z: number,
  sy: number,
  cy: number,
  st: number,
  ct: number,
  ox: number,
  oy: number,
  scale: number
): void {
  'worklet';
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const y1 = y * ct - z1 * st;
  out[0] = ox + x1 * scale;
  out[1] = oy - y1 * scale;
  out[2] = y * st + z1 * ct;
}

/* -------------------------------------------------------------------------- */
/* The six states                                                             */
/* -------------------------------------------------------------------------- */

/**
 * `working` — particles running tilted orbits, each on a faint ghost path.
 *
 * The ghosts are what make it read as orbits rather than as loose specks: three
 * bright particles alone look random, and the same three on a visible track
 * look like work being done.
 */
function drawWorking(out: string[], size: number, t: number, p: Profile): void {
  'worklet';
  const c = size / 2;
  const R = c * 0.82;
  const rs = radiusScale(size) * p.radius;
  const sy = Math.sin(t * 0.12);
  const cy = Math.cos(t * 0.12);
  const st = Math.sin(0.3);
  const ct = Math.cos(0.3);
  const v = [0, 0, 0];

  for (let orbit = 0; orbit < p.rows; orbit++) {
    const h1 = hashD(orbit, 1.7);
    const h2 = hashD(orbit, 5.2);
    const h3 = hashD(orbit, 8.9);
    const ro = R * (0.45 + 0.52 * h1);
    const theta = h1 * 2 * Math.PI;
    const phi = Math.acos(2 * h2 - 1);

    // An orthonormal basis for the orbit's plane, from its normal.
    const nx = Math.sin(phi) * Math.cos(theta);
    const ny = Math.cos(phi);
    const nz = Math.sin(phi) * Math.sin(theta);
    const ul = Math.max(1e-6, Math.hypot(ny, nx));
    const ux = -ny / ul;
    const uy = nx / ul;
    const vx = ny * 0 - nz * uy;
    const vy = nz * ux - nx * 0;
    const vz = nx * uy - ny * ux;

    const speed = (0.25 + 0.55 * h3) * (h3 > 0.5 ? 1 : -1);

    for (let k = 0; k < p.density; k++) {
      const a = (k / p.density) * 2 * Math.PI;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      project(v, (ux * ca + vx * sa) * ro, (uy * ca + vy * sa) * ro, (vz * sa) * ro, sy, cy, st, ct, c, c, 1);
      const depth = (v[2]! / ro + 1) / 2;
      dot(out, v[0]!, v[1]!, 0.9 * rs, 0.28 * (0.4 + 0.6 * depth));
    }

    for (let m = 0; m < 3; m++) {
      const a = t * speed + (m / 3) * 2 * Math.PI + h2 * 6;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      project(v, (ux * ca + vx * sa) * ro, (uy * ca + vy * sa) * ro, (vz * sa) * ro, sy, cy, st, ct, c, c, 1);
      const depth = (v[2]! / ro + 1) / 2;
      dot(out, v[0]!, v[1]!, (1.2 + 1.6 * depth) * rs, 0.7 + 0.22 * depth);
    }
  }
}

/**
 * `searching` — a scan meridian sweeping a dotted globe.
 *
 * The scan is a ripple in dot *size*, not a highlight. A brightness sweep on a
 * monochrome orb reads as a lighting effect; a size ripple reads as something
 * passing over the surface, which is what a search is.
 */
function drawSearching(out: string[], size: number, t: number, p: Profile): void {
  'worklet';
  const c = size / 2;
  const R = c * 0.82;
  const rs = radiusScale(size) * p.radius;
  const spin = 0.5;
  const tilt = 0.4 + 0.06 * Math.sin(t * 0.35);
  const sy = Math.sin(t * spin);
  const cySpin = Math.cos(t * spin);
  const st = Math.sin(tilt);
  const ct = Math.cos(tilt);
  const scan = t * (spin + (1.7 - spin) * 4.1);
  const v = [0, 0, 0];

  for (let li = 0; li <= p.rows; li++) {
    const lat = -Math.PI / 2 + (li / p.rows) * Math.PI;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    const count = Math.max(1, Math.round(Math.abs(cosLat) * p.density));

    for (let lj = 0; lj < count; lj++) {
      const lon = (lj / count) * 2 * Math.PI;
      project(v, cosLat * Math.cos(lon), sinLat, cosLat * Math.sin(lon), sy, cySpin, st, ct, c, c, R);
      const depth = (v[2]! + 1) / 2;
      const delta = angleDelta(lon + t * spin, scan);
      const boost = Math.exp(-(delta * delta) / 0.18) * Math.max(0, v[2]!);
      const ink = 0.38 + 0.54 * depth;
      dot(
        out,
        v[0]!,
        v[1]!,
        (0.6 + 1.7 * depth + boost) * rs,
        ink * (0.45 + 0.55 * Math.min(1, boost))
      );
    }
  }
}

/**
 * `solving` — bands twist in quarter turns, then replay in reverse and click
 * back to solved.
 *
 * The palindrome is the whole trick. A scramble that never resolves reads as
 * confusion; one that comes apart and goes back together reads as an answer
 * being found, and it loops seamlessly because it ends where it began.
 */
function drawSolving(out: string[], size: number, t: number, p: Profile): void {
  'worklet';
  const c = size / 2;
  const R = c * 0.82;
  const rs = radiusScale(size) * p.radius;
  const yaw = t * 0.55;
  const tilt = 0.35 + 0.1 * Math.sin(t * 0.9);
  const sy = Math.sin(yaw);
  const cySpin = Math.cos(yaw);
  const st = Math.sin(tilt);
  const ct = Math.cos(tilt);
  const v = [0, 0, 0];

  const moves = 10;
  const slot = 0.42;
  const rest = 1.2;
  const cycle = 2 * moves * slot + rest;
  const tc = t % cycle;

  // How far through each move we are: all the way for the ones already made,
  // eased for the one under way, nothing for the ones still to come.
  const amount: number[] = [];
  let active = -1;
  for (let i = 0; i < moves; i++) amount.push(0);

  if (tc < 2 * moves * slot) {
    const index = Math.floor(tc / slot);
    const local = Math.min(1, (tc - index * slot) / slot / 0.7);
    const eased = 1 - (1 - local) ** 3;
    if (index < moves) {
      for (let i = 0; i < index; i++) amount[i] = 1;
      amount[index] = eased;
      active = index;
    } else {
      const undo = 2 * moves - 1 - index;
      for (let i = 0; i < undo; i++) amount[i] = 1;
      amount[undo] = 1 - eased;
      active = undo;
    }
  }

  for (let li = 0; li <= p.rows; li++) {
    const lat = -Math.PI / 2 + (li / p.rows) * Math.PI;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    const count = Math.max(1, Math.round(Math.abs(cosLat) * p.density));

    for (let lj = 0; lj < count; lj++) {
      const lon = (lj / count) * 2 * Math.PI;
      let x = cosLat * Math.cos(lon);
      let y = sinLat;
      let z = cosLat * Math.sin(lon);
      let inActive = false;

      for (let i = 0; i < moves; i++) {
        if (amount[i]! <= 0) continue;
        const axis = Math.min(2, Math.floor(hashD(i, 2.3) * 3));
        const lo = -1 + 0.5 * Math.min(3, Math.floor(hashD(i, 5.9) * 4));
        const coord = axis === 0 ? x : axis === 1 ? y : z;
        if (coord < lo || coord >= lo + 0.5) continue;
        if (i === active) inActive = true;

        const dir = hashD(i, 7.7) < 0.5 ? 1 : -1;
        const a = ((dir * Math.PI) / 2) * amount[i]!;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        if (axis === 0) {
          const y2 = y * ca - z * sa;
          z = y * sa + z * ca;
          y = y2;
        } else if (axis === 1) {
          const x2 = x * ca + z * sa;
          z = -x * sa + z * ca;
          x = x2;
        } else {
          const x2 = x * ca - y * sa;
          y = x * sa + y * ca;
          x = x2;
        }
      }

      project(v, x, y, z, sy, cySpin, st, ct, c, c, R);
      const depth = (v[2]! + 1) / 2;
      // The band under the hand inks a touch stronger, so the turn is legible.
      dot(
        out,
        v[0]!,
        v[1]!,
        (0.6 + 1.7 * depth + (inActive ? 0.3 : 0)) * rs,
        0.38 + 0.54 * depth + (inActive ? 0.14 : 0)
      );
    }
  }
}

/**
 * `listening` — a waveform rolling through the latitude rings.
 *
 * Two waves at unrelated tempi, so the surface never quite repeats. One wave
 * gives a pulse, which reads as a heartbeat rather than as listening.
 */
function drawListening(out: string[], size: number, t: number, p: Profile): void {
  'worklet';
  const c = size / 2;
  const R = c * 0.874;
  const rs = radiusScale(size) * p.radius;
  const sy = Math.sin(t * 0.18);
  const cySpin = Math.cos(t * 0.18);
  const st = Math.sin(0.38);
  const ct = Math.cos(0.38);
  const v = [0, 0, 0];

  for (let ri = 0; ri <= p.rows; ri++) {
    const lat = -Math.PI / 2 + (ri / p.rows) * Math.PI;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    const w = 0.62 * Math.sin(t * 2.1 - ri * 0.52) + 0.38 * Math.sin(t * 1.27 + ri * 0.83);
    const rr = R * (0.88 + 0.105 * w);
    const crest = Math.max(0, w);
    const count = Math.max(1, Math.round(Math.abs(cosLat) * p.density));

    for (let lj = 0; lj < count; lj++) {
      const lon = (lj / count) * 2 * Math.PI;
      project(v, cosLat * Math.cos(lon) * rr, sinLat * rr, cosLat * Math.sin(lon) * rr, sy, cySpin, st, ct, c, c, 1);
      const depth = (v[2]! / R + 1) / 2;
      dot(
        out,
        v[0]!,
        v[1]!,
        (0.6 + 1.7 * depth) * (1 + 0.4 * crest) * rs,
        0.34 + 0.56 * depth + 0.1 * crest
      );
    }
  }
}

/**
 * `composing` — an undulating sash of parallel strands on a great circle,
 * inside a faint dotted shell.
 *
 * The band's own tumble is frozen. Left spinning it competes with the
 * undulation and the two motions cancel into noise; held still, the wave
 * travelling along it is the only thing moving, and it reads as a line of
 * something being written.
 */
function drawComposing(out: string[], size: number, t: number, p: Profile): void {
  'worklet';
  const c = size / 2;
  const R = c * 0.78;
  const rs = radiusScale(size) * p.radius;
  const st = Math.sin(0.3);
  const ct = Math.cos(0.3);
  const v = [0, 0, 0];

  // The shell: a Fibonacci lattice, which is the only way to scatter points on
  // a sphere evenly without them lining up into visible seams.
  const shell = 70;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < shell; i++) {
    const y = 1 - (2 * (i + 0.5)) / shell;
    const rad = Math.sqrt(Math.max(0, 1 - y * y));
    const a = i * golden;
    project(v, rad * Math.cos(a) * R, y * R, rad * Math.sin(a) * R, 0, 1, st, ct, c, c, 1);
    const depth = (v[2]! / R + 1) / 2;
    dot(out, v[0]!, v[1]!, 0.8 * rs, 0.22 * (0.3 + 0.7 * depth));
  }

  const ta = 0.55;
  const ux = 1;
  const uz = 0;
  const vx = -uz * Math.sin(ta);
  const vy = Math.cos(ta);
  const vz = ux * Math.sin(ta);
  const nx = -uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy;

  const lanes = p.rows;
  const half = Math.max(1, (lanes - 1) / 2);

  for (let w = 0; w < lanes; w++) {
    const laneOffset = (w - (lanes - 1) / 2) * 0.075;
    const edge = Math.abs(w - (lanes - 1) / 2) / half;

    for (let k = 0; k < p.density; k++) {
      const a = (k / p.density) * 2 * Math.PI;
      const wobble =
        0.16 * Math.sin(a * 3 - t * 1.7 + w * 0.22) + 0.07 * Math.sin(a * 5 + t * 1.1);
      const off = laneOffset + wobble;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const x = ux * ca + vx * sa + nx * off;
      const y = vy * sa + ny * off;
      const z = uz * ca + vz * sa + nz * off;
      const l = Math.max(1e-6, Math.sqrt(x * x + y * y + z * z));
      project(v, (x / l) * R, (y / l) * R, (z / l) * R, 0, 1, st, ct, c, c, 1);
      const depth = (v[2]! / R + 1) / 2;
      dot(
        out,
        v[0]!,
        v[1]!,
        (1.1 + 1.7 * depth) * (1 - 0.25 * edge) * rs,
        (0.48 + 0.44 * depth - 0.18 * edge) * (0.4 + 0.6 * depth)
      );
    }
  }
}

/** The three outlines `shaping` cycles through, as closed paths. */
const SHAPES: number[][] = [
  // A circle is sampled, not listed — the marker below says so.
  [],
  [0, -0.26, 0.24, 0.16, -0.24, 0.16],
  [0, -0.2, 0.2, -0.2, 0.2, 0.2, -0.2, 0.2, -0.2, -0.2],
];

/** Point at arc-length fraction `f` around shape `index`. */
function shapePoint(out: number[], index: number, f: number): void {
  'worklet';
  const verts = SHAPES[index]!;
  if (!verts.length) {
    // Started at top-centre and walked clockwise, so every shape's dot zero is
    // in the same place and the morph has nothing to unwind.
    const a = -Math.PI / 2 + f * 2 * Math.PI;
    out[0] = Math.cos(a) * 0.24;
    out[1] = Math.sin(a) * 0.24;
    return;
  }

  const n = verts.length / 2;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    total += Math.hypot(verts[j * 2]! - verts[i * 2]!, verts[j * 2 + 1]! - verts[i * 2 + 1]!);
  }

  let target = f * total;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ax = verts[i * 2]!;
    const ay = verts[i * 2 + 1]!;
    const bx = verts[j * 2]!;
    const by = verts[j * 2 + 1]!;
    const len = Math.hypot(bx - ax, by - ay);
    if (target <= len || i === n - 1) {
      const ff = len ? Math.min(1, target / len) : 0;
      out[0] = ax + (bx - ax) * ff;
      out[1] = ay + (by - ay) * ff;
      return;
    }
    target -= len;
  }
}

/**
 * `shaping` — a dotted outline morphing circle → triangle → square.
 *
 * The two outlines are blended first and the dots laid evenly along the
 * *result*, rather than each dot being tweened from its old place to its new
 * one. Tweening per dot bunches them at the corners halfway through the morph;
 * re-spacing every frame keeps the outline uniform at every instant, which is
 * what makes the shape read as a shape while it is changing.
 */
function drawShaping(out: string[], size: number, t: number, p: Profile): void {
  'worklet';
  const c = size / 2;
  const hold = 1.4;
  const morph = 0.9;
  const seg = hold + morph;
  const shapes = 3;
  const tc = t % (seg * shapes);
  const k = Math.floor(tc / seg);
  const local = tc - k * seg;
  const raw = local > hold ? (local - hold) / morph : 0;
  const m = raw * raw * (3 - 2 * raw);
  const spread = 1.45;

  const samples = 96;
  const px: number[] = [];
  const py: number[] = [];
  const a = [0, 0];
  const b = [0, 0];

  for (let i = 0; i < samples; i++) {
    const f = i / samples;
    shapePoint(a, k, f);
    shapePoint(b, (k + 1) % shapes, f);
    px.push((a[0]! + (b[0]! - a[0]!) * m) * spread);
    py.push((a[1]! + (b[1]! - a[1]!) * m) * spread);
  }

  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < samples; i++) {
    const j = (i + 1) % samples;
    const l = Math.hypot(px[j]! - px[i]!, py[j]! - py[i]!);
    lengths.push(l);
    total += l;
  }

  const n = p.density;
  const r = Math.max(0.35, 0.021 * 1.35 * spread * size * p.radius * 0.4);
  const pulse = 1 + 0.02 * Math.sin(local * 3.1);
  let index = 0;
  let walked = 0;

  for (let i = 0; i < n; i++) {
    const target = (i / n) * total;
    while (walked + lengths[index]! < target && index < samples - 1) {
      walked += lengths[index]!;
      index++;
    }
    const j = (index + 1) % samples;
    const f = lengths[index]! ? Math.min(1, (target - walked) / lengths[index]!) : 0;
    const x = (px[index]! + (px[j]! - px[index]!) * f) * pulse;
    const y = (py[index]! + (py[j]! - py[index]!) * f) * pulse;
    dot(out, c + x * size, c + y * size, r, 0.92);
  }
}

/** Builds one frame's worth of bucket paths. */
function renderFrame(state: ThinkingOrbState, size: number, t: number, p: Profile): string[] {
  'worklet';
  const out: string[] = [];
  for (let i = 0; i < BUCKETS; i++) out.push('');

  if (state === 'working') drawWorking(out, size, t, p);
  else if (state === 'searching') drawSearching(out, size, t, p);
  else if (state === 'solving') drawSolving(out, size, t, p);
  else if (state === 'listening') drawListening(out, size, t, p);
  else if (state === 'composing') drawComposing(out, size, t, p);
  else drawShaping(out, size, t, p);

  return out;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

const BUCKET_INDICES = Array.from({ length: BUCKETS }, (_unused, index) => index);

/**
 * One ink level's worth of dots, as a single path.
 *
 * It is a component rather than a loop of `useAnimatedProps` in the parent so
 * that each bucket owns exactly one hook — the count is a module constant, but
 * hooks in a loop is still a rule waiting to be broken by the next person who
 * makes it configurable.
 */
function Bucket({
  index,
  paths,
  ink,
}: {
  index: number;
  paths: SharedValue<string[]>;
  ink: string;
}) {
  const animatedProps = useAnimatedProps(() => ({ d: paths.value[index] ?? '' }));

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      fill={ink}
      fillOpacity={(index + 0.5) / BUCKETS}
    />
  );
}

export interface ThinkingOrbProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** Which of the six animations to show. */
  state?: ThinkingOrbState;
  /**
   * Side of the orb in pixels.
   *
   * Two tunings ship, and they are separate designs rather than one scaled:
   * at or below 32 the orb switches to far fewer, proportionally much larger
   * dots moving faster, because a faithful lattice at that size is grey mush.
   */
  size?: number;
  /** Multiplier on the state's own speed. */
  speed?: number;
  /** Freeze on the current frame. */
  paused?: boolean;
  /** Ink colour. Defaults to the theme's foreground, so the orb inverts with it. */
  color?: string;
  /** Overrides the per-state default announced to screen readers. */
  accessibilityLabel?: string;
}

export function ThinkingOrb({
  className,
  state = 'working',
  size = 64,
  speed = 1,
  paused = false,
  color,
  accessibilityLabel,
  style,
  ...props
}: ThinkingOrbProps) {
  const reducedMotion = useReducedMotion();
  const foreground = useCSSVariable('--color-foreground');
  const ink = color ?? (typeof foreground === 'string' ? foreground : '#0a0a0a');

  const profile = PROFILES[state][size <= 32 ? 'sm' : 'md'];
  const clock = useSharedValue(0);
  const paths = useSharedValue<string[]>([]);

  const still = !paused && !reducedMotion;

  const frame = useFrameCallback((info) => {
    'worklet';
    // Elapsed time is accumulated rather than derived from the total, so
    // `speed` can change mid-animation without the orb jumping to wherever the
    // new rate would have put it by now. A dropped frame is clamped rather than
    // honoured — a 300ms hitch played back at full rate is a lurch.
    const delta = Math.min(info.timeSincePreviousFrame ?? 16, 48) / 1000;
    clock.value += delta * profile.speed * speed;
    paths.value = renderFrame(state, size, clock.value, profile);
  }, false);

  const { setActive } = frame;
  useEffect(() => {
    setActive(still);
    return () => setActive(false);
  }, [still, setActive]);

  // A still orb is not an empty one: reduced motion and `paused` both get a
  // representative frame rather than nothing, which is the difference between
  // "not animating" and "broken".
  useEffect(() => {
    if (still) return;
    runOnUI(() => {
      'worklet';
      paths.value = renderFrame(
        state,
        size,
        clock.value > 0 ? clock.value : STILL_FRAME,
        profile
      );
    })();
  }, [still, state, size, profile, clock, paths]);

  return (
    <View
      {...props}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? STATE_LABEL[state]}
      className={cn('items-center justify-center', className)}
      style={[{ width: size, height: size }, style]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Faint to strong, which is also far to near — depth is what drives
            the ink, so bucket order is depth order and no sort is needed. */}
        {BUCKET_INDICES.map((index) => (
          <Bucket key={index} index={index} paths={paths} ink={ink} />
        ))}
      </Svg>
    </View>
  );
}

ThinkingOrb.displayName = 'ThinkingOrb';
