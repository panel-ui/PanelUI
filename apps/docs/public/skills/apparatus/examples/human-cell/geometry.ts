/**
 * The cell, part by part.
 *
 * A human cell resting on a glass slide, the way one grows in a dish: a low
 * dome, cut in half so the near half is gone. The cut face is the section: the
 * membrane round its edge, the nucleus with its envelope and nucleolus, three
 * mitochondria with their folded inner membranes, the endoplasmic reticulum
 * wrapped round the nucleus, a Golgi stack and a few vesicles. A glucose
 * transporter sits in the membrane on the left, with glucose waiting outside it.
 *
 * Everything in the section is drawn in the cut plane's own coordinates —
 * `s` across, `z` up — through one plane matrix, so the moving molecules can be
 * drawn there too without projecting anything.
 */
import {
  hull,
  planeMatrix,
  polygon,
  polyline,
  type Solid,
  type Vec2,
  type Vec3,
  type View,
} from '../../kit/iso';

/** The cell's centre on the slide, its radius across and its height. */
export const CELL = { r: 104, h: 70 };
/** The cut runs across the cell; `U` lies along it, `N` points out of it towards the viewer. */
const SPIN = (20 * Math.PI) / 180;
export const N: Vec3 = [Math.cos(SPIN), Math.sin(SPIN), 0];
export const U: Vec3 = [Math.sin(SPIN), -Math.cos(SPIN), 0];

export interface Mito {
  s: number;
  z: number;
  length: number;
  width: number;
  /** Tilt in degrees. */
  angle: number;
}

export const MITOS: Mito[] = [
  { s: -56, z: 15, length: 30, width: 11, angle: -14 },
  { s: 50, z: 14, length: 32, width: 11, angle: 12 },
  { s: 38, z: 46, length: 24, width: 9, angle: -20 },
];

export const NUCLEUS = { s: -6, z: 31, rx: 30, rz: 22 };

/** The transporter, where the membrane's edge is at 150° round the section. */
const AT = (150 * Math.PI) / 180;
export const PORT = { s: CELL.r * Math.cos(AT), z: CELL.h * Math.sin(AT) };
const normal: Vec2 = (() => {
  const nx = PORT.s / (CELL.r * CELL.r);
  const nz = PORT.z / (CELL.h * CELL.h);
  const len = Math.hypot(nx, nz);
  return [nx / len, nz / len];
})();
/** Out of the cell, through the transporter. */
export const OUT = normal;

/** Where queued glucose waits outside, nearest first. */
export function queueAt(k: number): Vec2 {
  'worklet';
  return [PORT.s + OUT[0] * (13 + k * 9), PORT.z + OUT[1] * (13 + k * 9)];
}

/** A glucose's trip: outside, through the transporter, inside, to mitochondrion `m`. */
export function tripPoints(m: number): Vec2[] {
  const mito = MITOS[m]!;
  return [
    queueAt(0),
    [PORT.s, PORT.z],
    [PORT.s - OUT[0] * 12, PORT.z - OUT[1] * 12],
    [mito.s, mito.z],
  ];
}

export const EXTENT: Vec3[] = (() => {
  const points: Vec3[] = [];
  for (const s of [-124, 124]) for (const t of [-118, 30]) points.push(at(s, 0, t, -4));
  points.push(at(0, CELL.h + 4, -20, 0));
  return points;
})();

/** A world point from section coordinates, `d` units out of the cut towards the viewer. */
function at(s: number, z: number, d = 0, lift = 0): Vec3 {
  return [U[0] * s + N[0] * d, U[1] * s + N[1] * d, z + lift];
}

export interface CellArt {
  halo: string;
  slide: Solid;
  dome: Solid;
  domeLines: string;
  cutPlane: number[];
  /** Section paths, all in the cut plane's coordinates. */
  section: {
    cytoplasm: string;
    membrane: string;
    nucleus: string;
    envelope: string;
    pores: Vec2[];
    nucleolus: string;
    chromatin: Vec2[];
    mitos: string[];
    cristae: string;
    er: string;
    golgi: string;
    vesicles: string;
    transporter: string;
  };
}

/** A closed curve through points in section coordinates. */
function closed(points: Vec2[]) {
  return `M${points.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}Z`;
}

function ellipse(cs: number, cz: number, rx: number, rz: number, steps = 48): Vec2[] {
  const points: Vec2[] = [];
  for (let i = 0; i < steps; i += 1) {
    const a = (i / steps) * Math.PI * 2;
    points.push([cs + rx * Math.cos(a), cz + rz * Math.sin(a)]);
  }
  return points;
}

/** A mitochondrion's outline: a capsule, tilted. */
export function capsule(m: Mito, inset = 0): Vec2[] {
  const half = m.length / 2 - m.width / 2;
  const r = m.width / 2 - inset;
  const a = (m.angle * Math.PI) / 180;
  const points: Vec2[] = [];
  for (const [end, from] of [
    [half, -90],
    [-half, 90],
  ] as const) {
    for (let i = 0; i <= 12; i += 1) {
      const t = ((from + (180 * i) / 12) * Math.PI) / 180;
      const x = end + r * Math.cos(t);
      const y = r * Math.sin(t);
      points.push([m.s + x * Math.cos(a) - y * Math.sin(a), m.z + x * Math.sin(a) + y * Math.cos(a)]);
    }
  }
  return points;
}

export function capsulePath(m: Mito): string {
  return closed(capsule(m));
}

export function buildCell(view: View): CellArt {
  // The slide is square to the cut rather than to the world's axes: its top and
  // its edge, as one solid.
  const corners = [
    at(-124, 0, -118, -4),
    at(124, 0, -118, -4),
    at(124, 0, 30, -4),
    at(-124, 0, 30, -4),
  ];
  const top = corners.map((p) => view.point([p[0], p[1], 0]));
  const under = corners.map((p) => view.point(p));
  const slideShape: Solid = {
    tone: 'lo',
    depth: 0,
    parts: [
      { d: polygon(hull([...top, ...under])), fill: { kind: 'flat', light: 0.45 } },
      { d: polygon(top), fill: { kind: 'flat', light: 1 } },
    ],
    outline: polygon(hull([...top, ...under])),
    seams: '',
  };

  // The dome behind the cut: a half ellipsoid, sampled and wrapped.
  const domePoints: Vec2[] = [];
  const lines: string[] = [];
  for (let j = 0; j <= 12; j += 1) {
    const phi = (j / 12) * (Math.PI / 2);
    const row: Vec2[] = [];
    for (let i = 0; i <= 24; i += 1) {
      const theta = (i / 24) * Math.PI;
      const s = CELL.r * Math.cos(phi) * Math.cos(theta);
      const d = -CELL.r * Math.cos(phi) * Math.sin(theta);
      const p = view.point(at(s, CELL.h * Math.sin(phi), d));
      domePoints.push(p);
      row.push(p);
    }
    if (j === 4 || j === 8) lines.push(polyline(row));
  }
  const outline = hull(domePoints);
  const xs = outline.map((p) => p[0]);
  const ys = outline.map((p) => p[1]);
  const dome: Solid = {
    tone: 'hi',
    parts: [
      {
        d: polygon(outline),
        fill: {
          kind: 'shaded',
          from: [Math.min(...xs), Math.min(...ys)],
          to: [Math.max(...xs), Math.max(...ys)],
          stops: [
            { offset: 0, light: 0.95 },
            { offset: 0.6, light: 0.6 },
            { offset: 1, light: 0.35 },
          ],
        },
      },
    ],
    seams: '',
    outline: polygon(outline),
    depth: 0,
  };

  // The section.
  const edge: Vec2[] = [];
  const inner: Vec2[] = [];
  for (let i = 0; i <= 64; i += 1) {
    const a = (i / 64) * Math.PI;
    edge.push([CELL.r * Math.cos(a), CELL.h * Math.sin(a)]);
    inner.push([(CELL.r - 2.4) * Math.cos(a), (CELL.h - 2.4) * Math.sin(a)]);
  }
  const nucleusOutline = ellipse(NUCLEUS.s, NUCLEUS.z, NUCLEUS.rx, NUCLEUS.rz);
  const envelopeInner = ellipse(NUCLEUS.s, NUCLEUS.z, NUCLEUS.rx - 1.6, NUCLEUS.rz - 1.6);
  const pores: Vec2[] = [];
  for (let i = 0; i < 14; i += 1) {
    const a = (i / 14) * Math.PI * 2 + 0.2;
    pores.push([NUCLEUS.s + (NUCLEUS.rx - 0.8) * Math.cos(a), NUCLEUS.z + (NUCLEUS.rz - 0.8) * Math.sin(a)]);
  }
  const chromatin: Vec2[] = [];
  for (let i = 0; i < 22; i += 1) {
    const a = i * 2.39996;
    const k = Math.sqrt((i + 0.5) / 22) * 0.8;
    chromatin.push([NUCLEUS.s + NUCLEUS.rx * k * Math.cos(a), NUCLEUS.z + NUCLEUS.rz * k * Math.sin(a)]);
  }

  // Cristae: the inner membrane folding back and forth along each mitochondrion.
  let cristae = '';
  for (const m of MITOS) {
    const a = (m.angle * Math.PI) / 180;
    const half = m.length / 2 - 3;
    const r = m.width / 2 - 2.2;
    const points: Vec2[] = [];
    const folds = Math.round(m.length / 4);
    for (let i = 0; i <= folds; i += 1) {
      const x = -half + (i / folds) * half * 2;
      const y = i % 2 === 0 ? -r : r;
      points.push([m.s + x * Math.cos(a) - y * Math.sin(a), m.z + x * Math.sin(a) + y * Math.cos(a)]);
    }
    cristae += polyline(points);
  }

  // Rough ER: nested arcs hugging the nucleus on its upper left.
  let er = '';
  for (let k = 0; k < 4; k += 1) {
    const points: Vec2[] = [];
    for (let i = 0; i <= 20; i += 1) {
      const a = Math.PI * (0.55 + (i / 20) * 0.45);
      const wobble = Math.sin(i * 1.7 + k) * 0.8;
      points.push([
        NUCLEUS.s + (NUCLEUS.rx + 5 + k * 3.4 + wobble) * Math.cos(a),
        NUCLEUS.z + (NUCLEUS.rz + 5 + k * 3.4 + wobble) * Math.sin(a),
      ]);
    }
    er += polyline(points);
  }

  // The Golgi: a short stack of curved cisternae.
  let golgi = '';
  for (let k = 0; k < 4; k += 1) {
    const points: Vec2[] = [];
    for (let i = 0; i <= 12; i += 1) {
      const x = 66 + i * 1.3;
      points.push([x, 24 + k * 3.4 + Math.sin((i / 12) * Math.PI) * 3]);
    }
    golgi += polyline(points);
  }

  const vesicles = [
    [86, 12, 2.6],
    [80, 38, 2],
    [14, 7, 2.4],
    [-32, 6, 2],
    [62, 44, 1.8],
    [-78, 34, 2.2],
  ]
    .map(([s, z, r]) => closed(ellipse(s!, z!, r!, r!, 16)))
    .join('');

  // The transporter: two blocks spanning the membrane, either side of a channel.
  const tangent: Vec2 = [-OUT[1], OUT[0]];
  const block = (side: number) => {
    const c: Vec2 = [PORT.s + tangent[0] * side * 3.6, PORT.z + tangent[1] * side * 3.6];
    const corners: Vec2[] = [];
    for (const [a, b] of [
      [-6, -1.8],
      [6, -1.8],
      [6, 1.8],
      [-6, 1.8],
    ] as const) {
      corners.push([c[0] + OUT[0] * a + tangent[0] * b, c[1] + OUT[1] * a + tangent[1] * b]);
    }
    return closed(corners);
  };

  return {
    halo: polygon(hull(under.map(([x, y]) => [x + 4, y + 6] as Vec2))),
    slide: slideShape,
    dome,
    domeLines: lines.join(''),
    cutPlane: planeMatrix(view, [0, 0, 0], U, [0, 0, 1]),
    section: {
      cytoplasm: closed(edge),
      membrane: polyline(edge) + polyline(inner),
      nucleus: closed(nucleusOutline),
      envelope: closed(envelopeInner),
      pores,
      nucleolus: closed(ellipse(NUCLEUS.s + 6, NUCLEUS.z + 3, 8, 6)),
      chromatin,
      mitos: MITOS.map(capsulePath),
      cristae,
      er,
      golgi,
      vesicles,
      transporter: block(-1) + block(1),
    },
  };
}

