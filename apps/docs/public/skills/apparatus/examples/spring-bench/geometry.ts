/**
 * The spring bench, part by part.
 *
 * A base plate on four feet carries a linear guide rail. A carriage rides the
 * rail, tied back to an anchor block by a coil spring, and dragged on by a
 * piston rod running into an oil dashpot along the front. A post on the
 * carriage holds a pen against a paper chart at the back; the paper feeds
 * downward, so the pen draws where the carriage has been. A ruler along the
 * front edge reads the carriage's position through an index pointer.
 *
 * Two controls: a tension knob on the anchor block (stiffness) and a needle
 * valve on top of the dashpot (damping).
 *
 * Everything static is built here once per canvas size. The parts that move
 * are built at rest and moved as whole layers by the figure.
 */
import {
  box,
  cylinder,
  coil,
  dots,
  halo,
  line,
  planeMatrix,
  polygon,
  ringFront,
  ticks,
  type Solid,
  type Vec2,
  type Vec3,
  type View,
} from '../../kit/iso';
import { BENCH } from './model';

/** Points the camera is fitted to: the whole machine at its widest pose. */
export const EXTENT: Vec3[] = [
  [0, 0, 0],
  [250, 0, 0],
  [0, 104, 0],
  [250, 104, 0],
  [0, 0, 134],
  [250, 0, 134],
  [8, 104, 40],
];

export const RAIL = { x: 40, y: 36, w: 196, d: 24, z: 11, h: 11 };
export const CARRIAGE = { y: 30, d: 36, z: 22, w: 40, h: 26 };
export const SPRING = { y: 48, z: 37, r: 8, from: 40, turns: 13 };
export const DASHPOT = { x: 8, length: 98, y: 84, z: 26, r: 9 };
export const ROD = { length: 116, r: 2.2 };
export const PAPER = { x: 30, w: 196, y: 12.5, bottom: 22, top: 124 };
/** Where the pen touches the paper. */
export const PEN = { offset: 20, y: 14, z: 116 };
export const TENSION_KNOB = { at: [27, 66, 41] as Vec3, r: 7.5, length: 6 };
export const VALVE_KNOB = { at: [62, DASHPOT.y, DASHPOT.z + DASHPOT.r - 1] as Vec3, r: 6, length: 7 };

export interface BenchArt {
  halo: string;
  /** The plate and the board, painted before the paper. */
  under: Solid[];
  /** Everything else at the back, painted after the paper. */
  back: Solid[];
  backLines: { faint: string; edge: string; strong: string };
  screws: Vec2[];
  paper: string;
  paperRules: string;
  restLine: string;
  spring: { back: string; front: string };
  springEyes: Solid[];
  carriage: Solid[];
  carriageScrews: Vec2[];
  pointerTip: string;
  front: Solid[];
  frontLines: string;
  tensionCap: Vec3;
  valveCap: Vec3;
  /** For the trace and the knobs, in the same order `planeMatrix` returns. */
  paperPlane: number[];
  springPlane: number[];
  tensionPlane: number[];
  /** The anchor's front face, centred on the knob: where its scale is engraved. */
  anchorFacePlane: number[];
  valvePlane: number[];
  /** Screen centres for hit-testing touches. */
  hits: { carriage: Vec2; tension: Vec2; valve: Vec2 };
  /** Screen movement of one world unit along the rail. */
  railStep: Vec2;
}

export function buildBench(view: View): BenchArt {
  const rest = BENCH.rest;

  /* Base: plate on four feet, screws at the corners. */
  const feet = [
    [12, 12],
    [238, 12],
    [12, 92],
    [238, 92],
  ].map(([x, y]) => cylinder(view, { at: [x!, y!, 0], axis: 'z', r: 5, length: 3 }, 'lo'));
  const plate = box(view, { x: 0, y: 0, z: 3, w: 250, d: 104, h: 8, r: 6 }, 'lo');
  const plateScrews = dots(view, [
    [8, 8, 11],
    [242, 8, 11],
    [8, 96, 11],
    [242, 96, 11],
  ]);

  /* Chart board at the back, the paper on its face, a roll top and bottom. */
  const board = box(view, { x: 20, y: 4, z: 11, w: 216, d: 8, h: 121 }, 'mid');
  const paper = polygon(
    (
      [
        [PAPER.x, PAPER.y, PAPER.bottom],
        [PAPER.x + PAPER.w, PAPER.y, PAPER.bottom],
        [PAPER.x + PAPER.w, PAPER.y, PAPER.top],
        [PAPER.x, PAPER.y, PAPER.top],
      ] as Vec3[]
    ).map((p) => view.point(p))
  );
  // Vertical rules only: the paper feeds straight down, so they never move.
  const rules: string[] = [];
  for (let x = PAPER.x + 12; x < PAPER.x + PAPER.w; x += 20) {
    rules.push(line(view, [x, PAPER.y, PAPER.bottom], [x, PAPER.y, PAPER.top]));
  }
  const penRest = rest + PEN.offset;
  const restLine = line(view, [penRest, PAPER.y, PAPER.bottom], [penRest, PAPER.y, PAPER.top]);
  const rollTop = cylinder(view, { at: [PAPER.x - 2, 15, PAPER.top + 3], axis: 'x', r: 4, length: PAPER.w + 4 }, 'hi');
  const rollBottom = cylinder(view, { at: [PAPER.x - 2, 15, PAPER.bottom - 2], axis: 'x', r: 4, length: PAPER.w + 4 }, 'hi');
  const boardScrews = dots(view, [
    [24, 12, 128],
    [232, 12, 128],
    [24, 12, 15],
    [232, 12, 15],
  ]);

  /* Anchor block and the rail with its stop. */
  const anchor = box(view, { x: 14, y: 30, z: 11, w: 26, d: 36, h: 41 }, 'mid');
  const anchorScrews = dots(view, [
    [19, 35, 52],
    [35, 35, 52],
    [19, 61, 52],
    [35, 61, 52],
  ]);
  const rail = box(view, { x: RAIL.x, y: RAIL.y, z: RAIL.z, w: RAIL.w, d: RAIL.d, h: RAIL.h }, 'mid');
  const railGroove = line(view, [RAIL.x, RAIL.y + RAIL.d, RAIL.z + 6], [RAIL.x + RAIL.w, RAIL.y + RAIL.d, RAIL.z + 6]);
  const railBolts: Vec3[] = [];
  for (let x = RAIL.x + 10; x < RAIL.x + RAIL.w; x += 24) railBolts.push([x, RAIL.y + RAIL.d / 2, RAIL.z + RAIL.h]);
  const stop = box(view, { x: 236, y: 30, z: 11, w: 10, d: 36, h: 20 }, 'mid');
  const bumper = cylinder(view, { at: [232, 48, 24], axis: 'x', r: 4, length: 4 }, 'hi');

  /* Ruler on the front edge. Major marks every 20, one at the rest position. */
  const ruler = box(view, { x: 40, y: 94, z: 11, w: 200, d: 8, h: 1.2 }, 'hi');
  const scale = ticks(view, {
    from: [44, 94.5, 12.2],
    dir: [1, 0, 0],
    out: [0, 1, 0],
    count: 49,
    step: 4,
    minor: 2.6,
    major: 5,
  });
  const pointerX = rest + 35;
  const restMark = line(view, [pointerX, 101.5, 12.2], [pointerX, 96, 12.2]);

  /* Spring, drawn at rest between the anchor and the carriage. */
  const spring = coil(view, {
    at: [SPRING.from, SPRING.y, SPRING.z],
    axis: 'x',
    r: SPRING.r,
    length: rest - SPRING.from,
    turns: SPRING.turns,
  });
  const springEyes = [
    cylinder(view, { at: [SPRING.from, SPRING.y, SPRING.z], axis: 'x', r: 3.2, length: 3 }, 'hi'),
  ];

  /* Carriage, at rest. */
  const cx = rest;
  const carriageBody = box(view, { x: cx, y: CARRIAGE.y, z: CARRIAGE.z, w: CARRIAGE.w, d: CARRIAGE.d, h: CARRIAGE.h, r: 2 }, 'lit');
  const shoe = box(view, { x: cx + 2, y: RAIL.y - 2, z: RAIL.z + RAIL.h - 4, w: CARRIAGE.w - 4, d: RAIL.d + 4, h: 4 }, 'hi');
  const carriageScrews = dots(view, [
    [cx + 5, CARRIAGE.y + 5, CARRIAGE.z + CARRIAGE.h],
    [cx + 35, CARRIAGE.y + 5, CARRIAGE.z + CARRIAGE.h],
    [cx + 5, CARRIAGE.y + 31, CARRIAGE.z + CARRIAGE.h],
    [cx + 35, CARRIAGE.y + 31, CARRIAGE.z + CARRIAGE.h],
  ]);
  const postX = cx + PEN.offset;
  const post = cylinder(view, { at: [postX, 36, CARRIAGE.z + CARRIAGE.h], axis: 'z', r: 3, length: PEN.z + 2 - (CARRIAGE.z + CARRIAGE.h) }, 'hi');
  const collar = cylinder(view, { at: [postX, 36, PEN.z - 4], axis: 'z', r: 4.2, length: 8 }, 'hi');
  const arm = cylinder(view, { at: [postX, PEN.y + 2, PEN.z], axis: 'y', r: 2, length: 36 - PEN.y - 2 }, 'hi');
  const nib = cylinder(view, { at: [postX, PEN.y, PEN.z], axis: 'y', r: 1.2, length: 2 }, 'mid');
  const bracketX = cx + 28;
  const bracket = box(view, { x: bracketX, y: CARRIAGE.y + CARRIAGE.d, z: 18, w: 10, d: DASHPOT.y + 5 - (CARRIAGE.y + CARRIAGE.d), h: 16 }, 'hi');
  const rod = cylinder(view, { at: [bracketX - ROD.length, DASHPOT.y, DASHPOT.z], axis: 'x', r: ROD.r, length: ROD.length }, 'hi');
  const pointer = box(view, { x: pointerX - 1, y: DASHPOT.y + 5, z: 12.2, w: 2, d: 11, h: 1.6 }, 'hi');
  const pointerTip = line(view, [pointerX, DASHPOT.y + 16, 13.8], [pointerX, DASHPOT.y + 9, 13.8]);
  const bracketScrews = dots(view, [
    [bracketX + 5, DASHPOT.y + 1, 34],
    [bracketX + 5, CARRIAGE.y + CARRIAGE.d + 4, 34],
  ]);

  /* Dashpot along the front, on two saddles, with the needle valve on top. */
  const saddles = [20, 78].map((x) =>
    box(view, { x, y: DASHPOT.y - 7, z: 11, w: 10, d: 14, h: DASHPOT.z - 11 - 4 }, 'lo')
  );
  const cylinderBody = cylinder(view, { at: [DASHPOT.x, DASHPOT.y, DASHPOT.z], axis: 'x', r: DASHPOT.r, length: DASHPOT.length }, 'mid');
  const endCap = cylinder(view, { at: [DASHPOT.x + DASHPOT.length - 4, DASHPOT.y, DASHPOT.z], axis: 'x', r: DASHPOT.r + 1.2, length: 4 }, 'hi');
  const gland = cylinder(view, { at: [DASHPOT.x + DASHPOT.length, DASHPOT.y, DASHPOT.z], axis: 'x', r: 4, length: 3 }, 'hi');
  const bands = [30, 60].map((x) =>
    ringFront(view, { origin: [x, DASHPOT.y, DASHPOT.z], u: [0, 1, 0], v: [0, 0, 1], w: [1, 0, 0] }, DASHPOT.r)
  );
  const valveSeat = cylinder(view, { at: [VALVE_KNOB.at[0], VALVE_KNOB.at[1], VALVE_KNOB.at[2] - 2], axis: 'z', r: 3, length: 3 }, 'hi');
  const valve = cylinder(view, { at: VALVE_KNOB.at, axis: 'z', r: VALVE_KNOB.r, length: VALVE_KNOB.length }, 'hi');

  /* Tension knob on the anchor's front face. */
  const tensionBoss = cylinder(view, { at: [TENSION_KNOB.at[0], 66, TENSION_KNOB.at[2]], axis: 'y', r: 4, length: 2 }, 'hi');
  const tension = cylinder(view, { at: [TENSION_KNOB.at[0], 68, TENSION_KNOB.at[2]], axis: 'y', r: TENSION_KNOB.r, length: TENSION_KNOB.length }, 'hi');

  const tensionCap: Vec3 = [TENSION_KNOB.at[0], 68 + TENSION_KNOB.length, TENSION_KNOB.at[2]];
  const valveCap: Vec3 = [VALVE_KNOB.at[0], VALVE_KNOB.at[1], VALVE_KNOB.at[2] + VALVE_KNOB.length];

  return {
    halo: halo(view, { x: 0, y: 0, w: 250, d: 104, spread: 8 }),
    under: [...feet, plate, board],
    back: [
      rollTop,
      rollBottom,
      anchor,
      rail,
      stop,
      bumper,
      ruler,
    ],
    backLines: {
      faint: [railGroove, scale.minor].join(''),
      edge: scale.major,
      strong: restMark,
    },
    screws: [...plateScrews, ...boardScrews, ...anchorScrews, ...dots(view, railBolts)],
    paper,
    paperRules: rules.join(''),
    restLine,
    spring,
    springEyes,
    carriage: [shoe, carriageBody, post, collar, arm, nib, rod, bracket, pointer],
    carriageScrews: [...carriageScrews, ...bracketScrews],
    pointerTip,
    front: [tensionBoss, tension, ...saddles, cylinderBody, endCap, gland, valveSeat, valve],
    frontLines: bands.join(''),
    tensionCap,
    valveCap,
    paperPlane: planeMatrix(view, [0, PAPER.y, 0], [1, 0, 0], [0, 0, 1]),
    springPlane: planeMatrix(view, [0, SPRING.y, SPRING.z], [1, 0, 0], [0, 0, 1]),
    tensionPlane: planeMatrix(view, tensionCap, [1, 0, 0], [0, 0, 1]),
    anchorFacePlane: planeMatrix(view, [TENSION_KNOB.at[0], 66, TENSION_KNOB.at[2]], [1, 0, 0], [0, 0, 1]),
    valvePlane: planeMatrix(view, valveCap, [1, 0, 0], [0, 1, 0]),
    hits: {
      carriage: view.point([cx + CARRIAGE.w / 2, CARRIAGE.y + CARRIAGE.d / 2, CARRIAGE.z + CARRIAGE.h / 2]),
      tension: view.point(tensionCap),
      valve: view.point(valveCap),
    },
    railStep: view.delta([1, 0, 0]),
  };
}
