/**
 * The geometry core of an apparatus figure: an isometric camera, a few solids,
 * and the path strings that draw them.
 *
 * Pure TypeScript with no React Native import, so it runs in Node for tests and
 * build scripts, and so nothing here can re-render. A figure calls it once, at
 * module scope or inside `useMemo` keyed on its size, and hands the strings to
 * `draw.tsx`.
 *
 * World units are roughly one point of the real object. `x` and `y` lie on the
 * floor and `z` points up. The camera turns about `z` by `azimuth` and looks
 * down by `elevation`; at the default 45° and 30° the faces turned towards +x
 * and +y are the visible sides, +y on the left of the screen and +x on the
 * right.
 */

export type Vec2 = readonly [number, number];
export type Vec3 = readonly [number, number, number];

/** How a part reads in the tone ladder. Exactly one part of a figure is `lit`. */
export type Tone = 'ground' | 'lo' | 'mid' | 'hi' | 'lit';

export interface Camera {
  /** Turn about the vertical axis, in degrees. 45 shows two sides equally. */
  azimuth: number;
  /** How far the camera looks down, in degrees. 30 is the default. */
  elevation: number;
}

export function camera(options: Partial<Camera> = {}): Camera {
  return { azimuth: options.azimuth ?? 45, elevation: options.elevation ?? 30 };
}

const RAD = Math.PI / 180;

/** A world point on the unscaled image plane, y pointing down the screen. */
export function project(cam: Camera, p: Vec3): Vec2 {
  const a = cam.azimuth * RAD;
  const e = cam.elevation * RAD;
  const u = p[0] * Math.cos(a) - p[1] * Math.sin(a);
  const v = p[0] * Math.sin(a) + p[1] * Math.cos(a);
  return [u, v * Math.sin(e) - p[2] * Math.cos(e)];
}

/** How near a point is to the viewer. Paint smaller values first. */
export function depthOf(cam: Camera, p: Vec3): number {
  const a = cam.azimuth * RAD;
  const e = cam.elevation * RAD;
  const v = p[0] * Math.sin(a) + p[1] * Math.cos(a);
  return v * Math.cos(e) + p[2] * Math.sin(e);
}

/**
 * A camera fitted to a box on screen. Every function a figure draws with takes
 * one of these, so the whole drawing scales with the width it was given.
 */
export interface View {
  readonly cam: Camera;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly offset: Vec2;
  /** A world point in screen points. */
  point(p: Vec3): Vec2;
  /** The screen movement of a world displacement. Linear: no offset applied. */
  delta(d: Vec3): Vec2;
  /** Nearness to the viewer. */
  depth(p: Vec3): number;
}

/**
 * Fit a camera so `points` fill `width` × `height` less `pad` on every side,
 * centred. Pass the corners of the whole machine at its widest pose, moving
 * parts included, or the figure crops itself the first time something moves.
 */
export function fitView(
  cam: Camera,
  points: readonly Vec3[],
  width: number,
  height: number,
  pad = 16
): View {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    const [x, y] = project(cam, p);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
  const offset: Vec2 = [
    (width - spanX * scale) / 2 - minX * scale,
    (height - spanY * scale) / 2 - minY * scale,
  ];
  return {
    cam,
    width,
    height,
    scale,
    offset,
    point(p) {
      const [x, y] = project(cam, p);
      return [x * scale + offset[0], y * scale + offset[1]];
    },
    delta(d) {
      const [x, y] = project(cam, d);
      return [x * scale, y * scale];
    },
    depth(p) {
      return depthOf(cam, p);
    },
  };
}

/**
 * Width over height of the drawing of `points`, plus `pad` points each side at
 * `width`. Give it to `FigureCanvas` so the canvas is as tall as the machine
 * needs and no taller.
 */
export function aspectOf(cam: Camera, points: readonly Vec3[], width = 360, pad = 16): number {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    const [x, y] = project(cam, p);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const scale = (width - pad * 2) / Math.max(maxX - minX, 1e-6);
  return width / ((maxY - minY) * scale + pad * 2);
}

/* ---- Vectors ---- */

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** The direction the camera sits in, from the origin: what a visible face points towards. */
export function towardViewer(cam: Camera): Vec3 {
  const a = cam.azimuth * RAD;
  const e = cam.elevation * RAD;
  return [Math.sin(a) * Math.cos(e), Math.cos(a) * Math.cos(e), Math.sin(e)];
}

/**
 * How much light a face with this outward normal catches, 0 to 1.
 *
 * The light comes from above and to the left of the viewer: tops are brightest,
 * left-facing sides next, right-facing sides darkest. Fixed, so every figure in
 * a set is lit the same way.
 */
export function lightOf(cam: Camera, normal: Vec3): number {
  const [sx] = project(cam, normal);
  const len = Math.hypot(normal[0], normal[1], normal[2]) || 1;
  const up = normal[2] / len;
  const lean = sx / len;
  return Math.max(0, Math.min(1, 0.5 + 0.5 * up - 0.18 * lean));
}

/* ---- Paths ---- */

const n = (value: number) => Math.round(value * 100) / 100;

/** A closed polygon through screen points. */
export function polygon(points: readonly Vec2[]): string {
  if (!points.length) return '';
  return `M${points.map((p) => `${n(p[0])} ${n(p[1])}`).join('L')}Z`;
}

/** An open polyline through screen points. */
export function polyline(points: readonly Vec2[]): string {
  if (!points.length) return '';
  return `M${points.map((p) => `${n(p[0])} ${n(p[1])}`).join('L')}`;
}

/** A straight line between two world points. */
export function line(view: View, a: Vec3, b: Vec3): string {
  return polyline([view.point(a), view.point(b)]);
}

/** The convex hull of screen points, counter-clockwise. */
export function hull(points: readonly Vec2[]): Vec2[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted;
  const turn = (o: Vec2, a: Vec2, b: Vec2) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Vec2[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && turn(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Vec2[] = [];
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const p = sorted[i]!;
    while (upper.length >= 2 && turn(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/* ---- Plans ---- */

/** A rectangle plan, optionally with rounded corners, counter-clockwise from its origin. */
export function rectPlan(w: number, d: number, r = 0, segments = 4): Vec2[] {
  if (r <= 0) {
    return [
      [0, 0],
      [w, 0],
      [w, d],
      [0, d],
    ];
  }
  const radius = Math.min(r, w / 2, d / 2);
  const corners: [number, number, number][] = [
    [w - radius, radius, -90],
    [w - radius, d - radius, 0],
    [radius, d - radius, 90],
    [radius, radius, 180],
  ];
  const points: Vec2[] = [];
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= segments; i += 1) {
      const angle = (start + (90 * i) / segments) * RAD;
      points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
    }
  }
  return points;
}

/** A circle plan centred on the origin. */
export function circlePlan(r: number, segments = 28): Vec2[] {
  const points: Vec2[] = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    points.push([r * Math.cos(angle), r * Math.sin(angle)]);
  }
  return points;
}

/* ---- Solids ---- */

/** A gradient stop across a solid's sides: where it is, and how much light it catches. */
export interface ShadeStop {
  offset: number;
  light: number;
}

/** One filled region of a solid. */
export type Fill =
  | { kind: 'flat'; light: number }
  | { kind: 'shaded'; from: Vec2; to: Vec2; stops: ShadeStop[] };

export interface SolidPart {
  d: string;
  fill: Fill;
}

/**
 * Something with volume, ready to paint: its filled parts back to front, the
 * seams where two sides meet, and its silhouette for the outline stroke.
 */
export interface Solid {
  tone: Tone;
  parts: SolidPart[];
  seams: string;
  outline: string;
  depth: number;
}

/**
 * The frame a plan is drawn in: an origin, two axes spanning the plan and the
 * axis it is pushed along. All three are unit vectors at right angles.
 */
export interface Frame3 {
  origin: Vec3;
  u: Vec3;
  v: Vec3;
  w: Vec3;
}

export const FLOOR: Omit<Frame3, 'origin'> = { u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] };

function along(frame: Frame3, s: number, t: number, h: number): Vec3 {
  return add(add(add(frame.origin, mul(frame.u, s)), mul(frame.v, t)), mul(frame.w, h));
}

/**
 * A convex plan pushed along an axis: a slab, a post, a rod, a puck, a pipe.
 *
 * Painted as two regions. The silhouette of the whole thing is filled with a
 * gradient that steps through the light each visible side catches, with a hard
 * step where two sides meet at a corner and a soft one round a curve; the end
 * that faces the viewer is filled flat on top of it. A seam is drawn wherever
 * neighbouring sides turn through more than 25°, which is every corner of a box
 * and none of the facets of a cylinder.
 *
 * The plan must be convex and counter-clockwise when looking down `w`.
 */
export function prism(view: View, frame: Frame3, plan: readonly Vec2[], length: number, tone: Tone): Solid {
  const cam = view.cam;
  const eye = towardViewer(cam);
  const bottom = plan.map(([s, t]) => along(frame, s, t, 0));
  const top = plan.map(([s, t]) => along(frame, s, t, length));
  const screenBottom = bottom.map((p) => view.point(p));
  const screenTop = top.map((p) => view.point(p));
  const silhouette = hull([...screenBottom, ...screenTop]);

  // The end facing the viewer. Both ends are parallel, so exactly one shows.
  const capUp = dot(frame.w, eye) >= 0;
  const cap = capUp ? screenTop : screenBottom;
  const capNormal = capUp ? frame.w : mul(frame.w, -1);

  // Sides that face the viewer, as spans across the silhouette.
  const axis = view.delta(frame.w);
  const across: Vec2 = Math.hypot(axis[0], axis[1]) < 1e-6 ? [1, 0] : [-axis[1], axis[0]];
  const measure = (p: Vec2) => p[0] * across[0] + p[1] * across[1];
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of silhouette) {
    lo = Math.min(lo, measure(p));
    hi = Math.max(hi, measure(p));
  }
  const span = hi - lo || 1;

  type Side = { a: number; b: number; light: number; normal: Vec3; index: number };
  const sides: Side[] = [];
  for (let i = 0; i < plan.length; i += 1) {
    const j = (i + 1) % plan.length;
    const edge = sub(bottom[j]!, bottom[i]!);
    const normal = cross(edge, frame.w);
    if (dot(normal, eye) <= 1e-9) continue;
    const a = (measure(screenBottom[i]!) - lo) / span;
    const b = (measure(screenBottom[j]!) - lo) / span;
    sides.push({ a: Math.min(a, b), b: Math.max(a, b), light: lightOf(cam, normal), normal, index: i });
  }
  sides.sort((x, y) => x.a - y.a);

  const stops: ShadeStop[] = [];
  for (const side of sides) {
    stops.push({ offset: clamp01(side.a), light: side.light });
    stops.push({ offset: clamp01(side.b), light: side.light });
  }
  if (!stops.length) stops.push({ offset: 0, light: 0.5 }, { offset: 1, light: 0.5 });

  // Seams at sharp turns between neighbouring visible sides.
  const seams: string[] = [];
  const byIndex = new Map(sides.map((side) => [side.index, side]));
  for (const side of sides) {
    const next = byIndex.get((side.index + 1) % plan.length);
    if (!next) continue;
    const cosine =
      dot(side.normal, next.normal) /
      (Math.hypot(...side.normal) * Math.hypot(...next.normal) || 1);
    if (cosine < Math.cos(25 * RAD)) {
      const k = (side.index + 1) % plan.length;
      seams.push(polyline([screenBottom[k]!, screenTop[k]!]));
    }
  }

  const fromPoint: Vec2 = pointAt(across, lo);
  const toPoint: Vec2 = pointAt(across, hi);
  const centre = along(frame, average(plan, 0), average(plan, 1), length / 2);

  return {
    tone,
    parts: [
      { d: polygon(silhouette), fill: { kind: 'shaded', from: fromPoint, to: toPoint, stops } },
      { d: polygon(cap), fill: { kind: 'flat', light: lightOf(cam, capNormal) } },
    ],
    seams: seams.join(''),
    outline: polygon(silhouette),
    depth: view.depth(centre),
  };
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function average(points: readonly Vec2[], index: 0 | 1) {
  let sum = 0;
  for (const p of points) sum += p[index];
  return sum / (points.length || 1);
}

/** A point on the line through the origin along `dir`, at `amount` measured along it. */
function pointAt(dir: Vec2, amount: number): Vec2 {
  const len2 = dir[0] * dir[0] + dir[1] * dir[1] || 1;
  return [(dir[0] * amount) / len2, (dir[1] * amount) / len2];
}

export interface BoxSpec {
  x: number;
  y: number;
  z: number;
  /** Size along x. */
  w: number;
  /** Size along y. */
  d: number;
  /** Size along z. */
  h: number;
  /** Corner radius in plan. */
  r?: number;
}

/** A box standing on the floor plane, optionally rounded in plan. */
export function box(view: View, spec: BoxSpec, tone: Tone): Solid {
  return prism(
    view,
    { origin: [spec.x, spec.y, spec.z], ...FLOOR },
    rectPlan(spec.w, spec.d, spec.r ?? 0),
    spec.h,
    tone
  );
}

export type Axis = 'x' | 'y' | 'z';

const AXES: Record<Axis, Omit<Frame3, 'origin'>> = {
  z: FLOOR,
  x: { u: [0, 1, 0], v: [0, 0, 1], w: [1, 0, 0] },
  y: { u: [0, 0, 1], v: [1, 0, 0], w: [0, 1, 0] },
};

/** The frame of an axis, for content drawn across a round part's end. */
export function axisFrame(axis: Axis, origin: Vec3): Frame3 {
  return { origin, ...AXES[axis] };
}

export interface CylinderSpec {
  /** The centre of the end the cylinder starts from. */
  at: Vec3;
  axis: Axis;
  r: number;
  length: number;
  segments?: number;
}

/** A round part along one axis: a post, a rod, a knob, a puck, a roller. */
export function cylinder(view: View, spec: CylinderSpec, tone: Tone): Solid {
  return prism(view, axisFrame(spec.axis, spec.at), circlePlan(spec.r, spec.segments ?? 28), spec.length, tone);
}

/**
 * A ball: a head, a knob's end, a token. Shaded across from its lit upper left
 * to its shadowed lower right, as one region with no seams.
 */
export function sphere(view: View, center: Vec3, r: number, tone: Tone): Solid {
  const [cx, cy] = view.point(center);
  const radius = r * view.scale;
  const segments = 36;
  const ring: Vec2[] = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    ring.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
  }
  const d = polygon(ring);
  return {
    tone,
    parts: [
      {
        d,
        fill: {
          kind: 'shaded',
          from: [cx - radius * 0.7, cy - radius * 0.7],
          to: [cx + radius * 0.7, cy + radius * 0.7],
          stops: [
            { offset: 0, light: 0.95 },
            { offset: 0.55, light: 0.62 },
            { offset: 1, light: 0.32 },
          ],
        },
      },
    ],
    seams: '',
    outline: d,
    depth: view.depth(center),
  };
}

/**
 * The view's projection as eight plain numbers, for the UI thread: a worklet
 * cannot call `view.point`, but it can multiply by these.
 * `screen = [ax·x + bx·y + cx·z + ox, ay·x + by·y + cy·z + oy]`.
 */
export type Projector = [number, number, number, number, number, number, number, number];

export function projector(view: View): Projector {
  const [ax, ay] = view.delta([1, 0, 0]);
  const [bx, by] = view.delta([0, 1, 0]);
  const [cx, cy] = view.delta([0, 0, 1]);
  const [ox, oy] = view.point([0, 0, 0]);
  return [ax, ay, bx, by, cx, cy, ox, oy];
}

/* ---- Details ---- */

/**
 * A coil spring along an axis, split at the wire's nearest and farthest points
 * into a back path and a front path. Paint `back` before the rod it wraps and
 * `front` after it.
 */
export function coil(
  view: View,
  spec: { at: Vec3; axis: Axis; r: number; length: number; turns: number; steps?: number }
): { back: string; front: string } {
  const frame = axisFrame(spec.axis, spec.at);
  const steps = spec.steps ?? spec.turns * 24;
  const eye = towardViewer(view.cam);
  const back: Vec2[][] = [];
  const front: Vec2[][] = [];
  let run: Vec2[] = [];
  let runFront: boolean | null = null;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const angle = t * spec.turns * Math.PI * 2;
    const radial = add(mul(frame.u, Math.cos(angle)), mul(frame.v, Math.sin(angle)));
    const point = along(frame, spec.r * Math.cos(angle), spec.r * Math.sin(angle), t * spec.length);
    const isFront = dot(radial, eye) >= 0;
    if (runFront !== null && isFront !== runFront) {
      run.push(view.point(point));
      (runFront ? front : back).push(run);
      run = [];
    }
    runFront = isFront;
    run.push(view.point(point));
  }
  if (run.length > 1 && runFront !== null) (runFront ? front : back).push(run);
  return { back: back.map(polyline).join(''), front: front.map(polyline).join('') };
}

/**
 * A row of tick marks along a ruler edge, with every `major`th one longer.
 * `dir` runs along the ruler and `out` is the direction the ticks hang in.
 */
export function ticks(
  view: View,
  spec: { from: Vec3; dir: Vec3; out: Vec3; count: number; step: number; minor: number; major: number; every?: number }
): { minor: string; major: string } {
  const every = spec.every ?? 5;
  const minor: string[] = [];
  const major: string[] = [];
  for (let i = 0; i < spec.count; i += 1) {
    const base = add(spec.from, mul(spec.dir, i * spec.step));
    const isMajor = i % every === 0;
    const tip = add(base, mul(spec.out, isMajor ? spec.major : spec.minor));
    (isMajor ? major : minor).push(line(view, base, tip));
  }
  return { minor: minor.join(''), major: major.join('') };
}

/**
 * A ring drawn flat on a plane: the rim of a hole, a bolt circle, a dial's edge.
 */
export function ring(view: View, frame: Frame3, r: number, segments = 32): string {
  return polygon(circlePlan(r, segments).map(([s, t]) => view.point(along(frame, s, t, 0))));
}

/**
 * The half of a ring that faces the viewer, for a band or a seam round a
 * round part: the other half is behind the part and must not show through it.
 * `frame.w` is the part's axis. Pass `side: 'back'` for the far half, which
 * shows only through something clear — a glass tube's far rim.
 */
export function ringFront(view: View, frame: Frame3, r: number, segments = 48, side: 'front' | 'back' = 'front'): string {
  const eye = towardViewer(view.cam);
  const facing = side === 'front' ? 1 : -1;
  const runs: Vec2[][] = [];
  let run: Vec2[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    const radial = add(mul(frame.u, Math.cos(angle)), mul(frame.v, Math.sin(angle)));
    const point = view.point(along(frame, r * Math.cos(angle), r * Math.sin(angle), 0));
    if (dot(radial, eye) * facing >= 0) run.push(point);
    else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) runs.push(run);
  // A run that wrapped past the start belongs to the first one.
  if (runs.length > 1 && dot(frame.u, eye) * facing >= 0) {
    const last = runs.pop()!;
    runs[0] = [...last, ...runs[0]!];
  }
  return runs.filter((r) => r.length > 1).map(polyline).join('');
}

/**
 * A soft floor shadow under a footprint. Draw it first, with the `ground` tone
 * at low opacity, so the machine reads as standing on something.
 */
export function halo(view: View, spec: { x: number; y: number; w: number; d: number; spread?: number }): string {
  const spread = spec.spread ?? 6;
  const frame: Frame3 = { origin: [spec.x - spread, spec.y - spread, 0], ...FLOOR };
  const plan = rectPlan(spec.w + spread * 2, spec.d + spread * 2, spread * 2, 6);
  return polygon(plan.map(([s, t]) => view.point(along(frame, s, t, 0))));
}

/**
 * The affine map from a plane's own 2D coordinates to the screen, as
 * `[a, b, c, d, e, f]` in SVG's `matrix()` order.
 *
 * Draw anything flat in the plane's coordinates — a dial's ticks, a label
 * plate's rule lines, a gauge needle — and wrap it in `<G matrix={...}>`. Use
 * it again in `live.ts` to turn a part about an axis lying in the plane.
 */
export function planeMatrix(view: View, origin: Vec3, u: Vec3, v: Vec3): [number, number, number, number, number, number] {
  const [ox, oy] = view.point(origin);
  const [ax, ay] = view.delta(u);
  const [bx, by] = view.delta(v);
  return [ax, ay, bx, by, ox, oy];
}

/**
 * The two outside edges of a round part as screen lines, from one end to the
 * other: the outline of a glass tube, which has no faces to shade.
 */
export function silhouette(view: View, spec: { at: Vec3; axis: Axis; r: number; length: number }): string {
  const frame = axisFrame(spec.axis, spec.at);
  const axis = view.delta(frame.w);
  const across: Vec2 = [-axis[1], axis[0]];
  let best = 0;
  let bestAngle = 0;
  for (let i = 0; i < 180; i += 1) {
    const angle = (i / 180) * Math.PI;
    const [x, y] = view.delta(add(mul(frame.u, Math.cos(angle)), mul(frame.v, Math.sin(angle))));
    const reach = Math.abs(x * across[0] + y * across[1]);
    if (reach > best) {
      best = reach;
      bestAngle = angle;
    }
  }
  const radial = add(mul(frame.u, Math.cos(bestAngle) * spec.r), mul(frame.v, Math.sin(bestAngle) * spec.r));
  const end = mul(frame.w, spec.length);
  const a = add(spec.at, radial);
  const b = sub(spec.at, radial);
  return line(view, a, add(a, end)) + line(view, b, add(b, end));
}

/** Screen points of world points, for dots: screws, rivets, terminals. */
export function dots(view: View, points: readonly Vec3[]): Vec2[] {
  return points.map((p) => view.point(p));
}
