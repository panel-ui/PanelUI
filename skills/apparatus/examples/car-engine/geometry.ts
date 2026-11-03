/**
 * The engine, part by part.
 *
 * An inline four on a display stand, cut open along the line of its cylinders
 * so the front half of the block, the head and the cam cover are gone and the
 * cut face shows where the metal was. Inside: four pistons in their bores, a
 * connecting rod from each to the crankshaft running the length of the
 * crankcase, two valves above each bore and a spark plug between them. A
 * flywheel at the back end, a pulley at the front, and the throttle knob on the
 * intake plenum on top.
 *
 * Moving parts are whole, as a cutaway shows them; only the casting is cut.
 */
import {
  box,
  cylinder,
  dots,
  halo,
  planeMatrix,
  projector,
  ringFront,
  type Projector,
  type Solid,
  type Vec2,
  type Vec3,
  type View,
} from '../../kit/iso';
import { CRANK } from './model';

/** The cut runs through the cylinder centres and the crank axis. */
export const CUT = 30;
export const BORES = [26, 62, 98, 134] as const;
export const BORE = 13;
export const PISTON = { r: 12.4, h: 16 };
/** Heights: the crank axis, where the bores begin, the head's underside and top. */
export const Z = { crank: 36, bore: 60, deck: 96, head: 116, cover: 126 };
export const BLOCK = { x: 0, w: 160, bottom: 18 };
export const KNOB = { at: [146, 15, Z.cover + 8] as Vec3, r: 6.5, length: 5 };
export const PULLEY = { x: BLOCK.w, r: 13, length: 8 };
/** Valves: offset from the bore centre, travel when fully open. */
export const VALVE = { offset: 5.5, lift: 4, stem: 16 };

/** The crown's height at top dead centre, where the pistons are drawn. */
export const TDC = Z.crank + CRANK.throw + CRANK.rod + CRANK.pinToCrown;

export const EXTENT: Vec3[] = [
  [-16, -16, 0],
  [178, -16, 0],
  [-16, 52, 0],
  [178, 52, 0],
  [0, 0, Z.cover + 14],
  [160, 30, Z.cover + 14],
  [-10, 30, Z.crank - 28],
];

export interface EngineArt {
  halo: string;
  back: Solid[];
  /** The flywheel's ring gear, on its visible face. */
  flywheelLines: string;
  hatch: string;
  cavities: string;
  boreLines: string;
  journal: Solid;
  pistons: Solid[];
  pistonRings: string[];
  plugs: Solid[];
  front: Solid[];
  frontScrews: Vec2[];
  cutPlane: number[];
  pulleyPlane: number[];
  knobPlane: number[];
  proj: Projector;
  knobAt: Vec2;
  /** Screen direction of the crankshaft, per world unit, for turning it by hand. */
  along: Vec2;
}

/** Rectangles on the cut face, in the face's own (x, z) coordinates. */
function rect(x0: number, z0: number, x1: number, z1: number) {
  return `M${x0} ${z0}L${x1} ${z0}L${x1} ${z1}L${x0} ${z1}Z`;
}

export function buildEngine(view: View): EngineArt {
  const plate = box(view, { x: -14, y: -16, z: 0, w: 190, d: 68, h: 4, r: 6 }, 'lo');
  const pillars = [18, 128].map((x) => box(view, { x, y: 6, z: 4, w: 14, d: 18, h: 6 }, 'mid'));
  const flywheel = cylinder(view, { at: [-10, CUT, Z.crank], axis: 'x', r: 26, length: 8, segments: 48 }, 'mid');
  const ringGear = ringFront(view, { origin: [-2, CUT, Z.crank], u: [0, 1, 0], v: [0, 0, 1], w: [1, 0, 0] }, 23);
  const pan = box(view, { x: 4, y: 2, z: 10, w: 152, d: CUT - 2, h: 8, r: 3 }, 'lo');
  const block = box(view, { x: BLOCK.x, y: 0, z: BLOCK.bottom, w: BLOCK.w, d: CUT, h: Z.deck - BLOCK.bottom }, 'mid');
  const head = box(view, { x: 2, y: 0, z: Z.deck, w: 156, d: CUT, h: Z.head - Z.deck }, 'mid');
  const cover = box(view, { x: 6, y: 3, z: Z.head, w: 148, d: CUT - 3, h: Z.cover - Z.head, r: 3 }, 'hi');
  const plenum = box(view, { x: 18, y: 4, z: Z.cover, w: 112, d: 18, h: 8, r: 4 }, 'mid');
  const runners = BORES.map((x) => cylinder(view, { at: [x - 5.5, 8, Z.cover], axis: 'z', r: 3.2, length: 9 }, 'hi'));
  const throttle = box(view, { x: 136, y: 4, z: Z.cover, w: 20, d: 18, h: 6, r: 3 }, 'hi');

  // The cut face: hatched where it is metal, dark where it is hollow.
  let hatch = '';
  const left = BLOCK.x;
  const right = BLOCK.x + BLOCK.w;
  const bottom = BLOCK.bottom;
  const top = Z.head;
  for (let c = left - (top - bottom); c < right; c += 5) {
    // A 45° line x - z = c - bottom, clipped to the face.
    const x0 = Math.max(left, c);
    const z0 = bottom + (x0 - c);
    const x1 = Math.min(right, c + (top - bottom));
    const z1 = bottom + (x1 - c);
    if (x1 > x0) hatch += `M${x0.toFixed(1)} ${z0.toFixed(1)}L${x1.toFixed(1)} ${z1.toFixed(1)}`;
  }
  let cavities = rect(6, 22, 154, Z.bore);
  let boreLines = '';
  for (const x of BORES) {
    cavities += rect(x - BORE, Z.bore - 1, x + BORE, Z.deck);
    for (const k of [-0.55, 0, 0.55]) boreLines += `M${x + k * BORE} ${Z.bore + 2}L${x + k * BORE} ${Z.deck - 2}`;
  }

  const journal = cylinder(view, { at: [2, CUT, Z.crank], axis: 'x', r: 4.6, length: 156 }, 'hi');

  const pistons: Solid[] = [];
  const pistonRings: string[] = [];
  for (const x of BORES) {
    pistons.push(cylinder(view, { at: [x, CUT, TDC - PISTON.h], axis: 'z', r: PISTON.r, length: PISTON.h }, 'hi'));
    pistonRings.push(
      [3, 5.5, 8]
        .map((d) => ringFront(view, { origin: [x, CUT, TDC - d], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] }, PISTON.r))
        .join('')
    );
  }

  const plugs = BORES.flatMap((x) => [
    cylinder(view, { at: [x, CUT, Z.deck + 2], axis: 'z', r: 2.2, length: 18 }, 'hi'),
    cylinder(view, { at: [x, CUT, Z.head - 2], axis: 'z', r: 3.6, length: 5, segments: 6 }, 'hi'),
    cylinder(view, { at: [x, CUT, Z.head + 3], axis: 'z', r: 2.6, length: 9 }, 'hi'),
  ]);

  const pulley = cylinder(view, { at: [PULLEY.x, CUT, Z.crank], axis: 'x', r: PULLEY.r, length: PULLEY.length }, 'hi');
  const nose = cylinder(view, { at: [BLOCK.w - 2, CUT, Z.crank], axis: 'x', r: 5, length: 3 }, 'hi');
  const knobBoss = cylinder(view, { at: [KNOB.at[0], KNOB.at[1], KNOB.at[2] - 2], axis: 'z', r: 3, length: 2 }, 'hi');
  const knob = cylinder(view, { at: KNOB.at, axis: 'z', r: KNOB.r, length: KNOB.length }, 'hi');

  const knobTop: Vec3 = [KNOB.at[0], KNOB.at[1], KNOB.at[2] + KNOB.length];
  const pulleyFace: Vec3 = [PULLEY.x + PULLEY.length, CUT, Z.crank];

  return {
    halo: halo(view, { x: -14, y: -16, w: 190, d: 68, spread: 8 }),
    back: [plate, ...pillars, flywheel, pan, block, head, cover, plenum, ...runners, throttle],
    flywheelLines: ringGear,
    hatch,
    cavities,
    boreLines,
    journal,
    pistons,
    pistonRings,
    plugs,
    front: [nose, pulley, knobBoss, knob],
    frontScrews: dots(view, [
      [10, 6, Z.cover],
      [150, 6, Z.cover],
      [-8, -10, 4],
      [170, -10, 4],
      [-8, 46, 4],
      [170, 46, 4],
    ]),
    cutPlane: planeMatrix(view, [0, CUT, 0], [1, 0, 0], [0, 0, 1]),
    pulleyPlane: planeMatrix(view, pulleyFace, [0, 1, 0], [0, 0, 1]),
    knobPlane: planeMatrix(view, knobTop, [1, 0, 0], [0, 1, 0]),
    proj: projector(view),
    knobAt: view.point(knobTop),
    along: view.delta([1, 0, 0]),
  };
}
