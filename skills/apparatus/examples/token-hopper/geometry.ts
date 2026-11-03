/**
 * The token hopper, part by part.
 *
 * A glass magazine stands on a gate block and holds up to five balls: the
 * tokens. A feeder on top drops a new ball in at a fixed rate, turning a star
 * wheel one tooth for each. Pulling the lever on the gate block lets the bottom
 * ball out through a slot, down a chute and along a tray, where the last four
 * sent wait in a queue; when a fifth arrives, the oldest rolls off the open end
 * into a bin. When the magazine is empty the gate stays shut and a flag swings up.
 */
import {
  axisFrame,
  box,
  cylinder,
  dots,
  halo,
  line,
  planeMatrix,
  polygon,
  prism,
  rectPlan,
  ringFront,
  silhouette,
  sphere,
  type Solid,
  type Vec2,
  type Vec3,
  type View,
} from '../../kit/iso';
import { BUCKET } from './model';

export const BALL = 6.5;
export const TUBE = { x: 60, y: 54, r: 8, bottom: 52, top: 128 };
/** Where ball `i` of the stack sits. */
export function slotZ(i: number): number {
  'worklet';
  return TUBE.bottom + 3 + BALL + 0.5 + i * (BALL * 2);
}
export const FEEDER = { x: 42, y: 36, w: 36, d: 36, z: TUBE.top, h: 20 };
export const STAR = { at: [60, FEEDER.y + FEEDER.d, FEEDER.z + FEEDER.h / 2] as Vec3, r: 8 };
export const GATE = { x: 44, y: 38, w: 32, d: 32, z: 8, h: TUBE.bottom - 8 };
export const TRAY = { x: 106, y: 42, w: 54, d: 24, z: 20, h: 3 };
/** The bin past the tray's open end: the oldest ball rolls off into it when the tray is full. */
export const BIN = { x: 162, y: 38, w: 28, d: 32, z: 8, h: 13 };
/** The chute: out of the gate's slot, down to the tray's near end. */
export const CHUTE = { from: 76, to: TRAY.x, top: 34, bottom: TRAY.z + TRAY.h + 0.5, y: TUBE.y - 9, d: 18 };
/** The slot in the gate's face the ball leaves through. */
export const SLOT = { bottom: CHUTE.top, top: CHUTE.top + BALL * 2 + 2 };
export const LEVER = { pivot: [50, GATE.y + GATE.d + 0.5, 30] as Vec3, length: 30 };
export const FLAG = { pivot: [72, GATE.y + GATE.d + 0.5, GATE.z + GATE.h - 3] as Vec3 };

/** The height of a ball's centre resting on the chute at `x`. */
export function chuteZ(x: number): number {
  'worklet';
  return CHUTE.top + ((x - CHUTE.from) / (CHUTE.to - CHUTE.from)) * (CHUTE.bottom - CHUTE.top) + BALL;
}

/** Where a ball comes out of the slot, and where it rests on the tray. */
export const EXIT_X = CHUTE.from + 3;
export const TRAY_Z = TRAY.z + TRAY.h + BALL;

/** The tray holds a queue of four; slot 0 is at the open end, by the bin. */
export const TRAY_SLOTS = 4;
export function trayX(j: number): number {
  'worklet';
  return TRAY.x + TRAY.w - BALL - 1 - j * (BALL * 2 + 0.5);
}

export const EXTENT: Vec3[] = [
  [30, 22, 0],
  [196, 22, 0],
  [30, 92, 0],
  [196, 92, 0],
  [FEEDER.x, FEEDER.y, FEEDER.z + FEEDER.h + 4],
  [FEEDER.x + FEEDER.w, FEEDER.y + FEEDER.d, FEEDER.z + FEEDER.h + 4],
  [LEVER.pivot[0] + LEVER.length + 6, LEVER.pivot[1], LEVER.pivot[2] + 24],
];

export interface HopperArt {
  halo: string;
  back: Solid[];
  /** The gate block, above a ball still inside it. */
  gate: Solid[];
  slotOpening: string;
  /** The chute, in front of the gate. */
  chute: Solid[];
  /** The chute's near rail, in front of a ball rolling down it. */
  nearRail: Solid;
  /** The bin's far walls and floor, and the near walls that hide a ball once it is in. */
  binBack: Solid[];
  binFront: Solid[];
  glassBack: string;
  screws: Vec2[];
  stack: Solid[];
  trayFront: Solid[];
  ball: Solid;
  glassFront: string;
  glassShine: string;
  front: Solid[];
  starPlane: number[];
  leverPlane: number[];
  flagPlane: number[];
  /** Screen offset of one world unit straight up. */
  up: Vec2;
}

export function buildHopper(view: View): HopperArt {
  const feet = [
    [36, 28],
    [190, 28],
    [36, 86],
    [190, 86],
  ].map(([x, y]) => cylinder(view, { at: [x!, y!, 0], axis: 'z', r: 4.5, length: 3 }, 'lo'));
  const plate = box(view, { x: 30, y: 22, z: 3, w: 166, d: 70, h: 5, r: 6 }, 'lo');

  const gate = box(view, { x: GATE.x, y: GATE.y, z: GATE.z, w: GATE.w, d: GATE.d, h: GATE.h, r: 2 }, 'mid');
  // The slot the ball leaves through, on the gate's face towards the chute.
  const slot = polygon(
    (
      [
        [GATE.x + GATE.w, TUBE.y - BALL - 1.5, SLOT.bottom],
        [GATE.x + GATE.w, TUBE.y + BALL + 1.5, SLOT.bottom],
        [GATE.x + GATE.w, TUBE.y + BALL + 1.5, SLOT.top],
        [GATE.x + GATE.w, TUBE.y - BALL - 1.5, SLOT.top],
      ] as Vec3[]
    ).map((p) => view.point(p))
  );

  // The chute: a tilted trough with a rail each side.
  const from: Vec3 = [CHUTE.from, CHUTE.y, CHUTE.top - 2];
  const to: Vec3 = [CHUTE.to + 2, CHUTE.y, CHUTE.bottom - 2];
  const run: Vec3 = [to[0] - from[0], 0, to[2] - from[2]];
  const length = Math.hypot(run[0], run[2]);
  const w: Vec3 = [run[0] / length, 0, run[2] / length];
  const u: Vec3 = [0, 1, 0];
  const v: Vec3 = [-w[2], 0, w[0]];
  const trough = prism(view, { origin: from, u, v, w }, rectPlan(CHUTE.d, 2), length, 'hi');
  const strut = box(view, { x: CHUTE.from + 8, y: CHUTE.y + 4, z: 8, w: 6, d: 10, h: CHUTE.top - 10 }, 'mid');
  const rail = (side: number) =>
    prism(view, { origin: [from[0], from[1] + side, from[2] + 2], u, v, w }, rectPlan(2, 4), length, 'mid');

  const trayBase = box(view, { x: TRAY.x, y: TRAY.y, z: TRAY.z, w: TRAY.w, d: TRAY.d, h: TRAY.h, r: 1 }, 'hi');
  const trayLegs = [TRAY.x + 6, TRAY.x + TRAY.w - 12].map((x) =>
    box(view, { x, y: TRAY.y + 6, z: 8, w: 6, d: TRAY.d - 12, h: TRAY.z - 8 }, 'mid')
  );
  const binWall = (x: number, y: number, wd: number, dd: number) =>
    box(view, { x, y, z: BIN.z, w: wd, d: dd, h: BIN.h }, 'mid');
  const binFloor = box(view, { x: BIN.x, y: BIN.y, z: BIN.z, w: BIN.w, d: BIN.d, h: 1.5 }, 'lo');
  const binBack = [binFloor, binWall(BIN.x, BIN.y, BIN.w, 2), binWall(BIN.x, BIN.y, 2, BIN.d)];
  const binFront = [binWall(BIN.x + BIN.w - 2, BIN.y, 2, BIN.d), binWall(BIN.x, BIN.y + BIN.d - 2, BIN.w, 2)];
  const wall = (x: number, y: number, wd: number, dd: number) =>
    box(view, { x, y, z: TRAY.z + TRAY.h, w: wd, d: dd, h: 5 }, 'mid');
  // The tray is open at both ends: the chute runs onto it, and the oldest ball rolls off into the bin.
  const farWalls = [wall(TRAY.x, TRAY.y, TRAY.w, 2)];
  const nearWalls = [wall(TRAY.x, TRAY.y + TRAY.d - 2, TRAY.w, 2)];

  const collar = (z: number) => cylinder(view, { at: [TUBE.x, TUBE.y, z], axis: 'z', r: TUBE.r + 2, length: 3 }, 'hi');
  const tubeFrame = (z: number) => axisFrame('z', [TUBE.x, TUBE.y, z]);

  const feeder = box(view, { x: FEEDER.x, y: FEEDER.y, z: FEEDER.z, w: FEEDER.w, d: FEEDER.d, h: FEEDER.h, r: 3 }, 'mid');
  const lid = box(view, { x: FEEDER.x + 4, y: FEEDER.y + 4, z: FEEDER.z + FEEDER.h, w: FEEDER.w - 8, d: FEEDER.d - 8, h: 3, r: 2 }, 'hi');
  const starHub = cylinder(view, { at: STAR.at, axis: 'y', r: 3, length: 2 }, 'hi');
  const leverBoss = cylinder(view, { at: LEVER.pivot, axis: 'y', r: 3.5, length: 2 }, 'hi');
  const flagBoss = cylinder(view, { at: FLAG.pivot, axis: 'y', r: 2, length: 1.5 }, 'hi');

  const stack: Solid[] = [];
  for (let i = 0; i < BUCKET.capacity; i += 1) stack.push(sphere(view, [TUBE.x, TUBE.y, slotZ(i)], BALL, 'lit'));

  const glass = { at: [TUBE.x, TUBE.y, TUBE.bottom + 3] as Vec3, axis: 'z' as const, r: TUBE.r, length: TUBE.top - TUBE.bottom - 3 };

  return {
    halo: halo(view, { x: 30, y: 22, w: 166, d: 70, spread: 8 }),
    back: [...feet, plate, ...binBack, ...trayLegs, trayBase, ...farWalls],
    binBack: [],
    binFront,
    gate: [gate, collar(TUBE.bottom)],
    chute: [strut, rail(0), trough],
    nearRail: rail(CHUTE.d - 2),
    slotOpening: slot,
    glassBack:
      ringFront(view, tubeFrame(TUBE.bottom + 3), TUBE.r, 48, 'back') +
      ringFront(view, tubeFrame(TUBE.top - 3), TUBE.r, 48, 'back'),
    screws: dots(view, [
      [35, 27, 8],
      [191, 27, 8],
      [35, 87, 8],
      [191, 87, 8],
      [GATE.x + 4, GATE.y + 4, GATE.z + GATE.h],
      [GATE.x + GATE.w - 4, GATE.y + 4, GATE.z + GATE.h],
      [GATE.x + GATE.w - 4, GATE.y + GATE.d - 4, GATE.z + GATE.h],
    ]),
    stack,
    trayFront: nearWalls,
    ball: sphere(view, [EXIT_X, TUBE.y, chuteZ(EXIT_X)], BALL, 'lit'),
    glassFront: silhouette(view, glass) + ringFront(view, tubeFrame(TUBE.top - 3), TUBE.r) + ringFront(view, tubeFrame(TUBE.bottom + 3), TUBE.r),
    glassShine: line(view, [TUBE.x + 3, TUBE.y + 6.5, TUBE.bottom + 10], [TUBE.x + 3, TUBE.y + 6.5, TUBE.top - 10]),
    front: [collar(TUBE.top - 3), feeder, lid, starHub, leverBoss, flagBoss],
    starPlane: planeMatrix(view, [STAR.at[0], STAR.at[1] + 2, STAR.at[2]], [1, 0, 0], [0, 0, 1]),
    leverPlane: planeMatrix(view, [LEVER.pivot[0], LEVER.pivot[1] + 2, LEVER.pivot[2]], [1, 0, 0], [0, 0, 1]),
    flagPlane: planeMatrix(view, [FLAG.pivot[0], FLAG.pivot[1] + 1.5, FLAG.pivot[2]], [1, 0, 0], [0, 0, 1]),
    up: view.delta([0, 0, 1]),
  };
}
