/**
 * The flywheel, part by part.
 *
 * A heavy spoked wheel turns on an axle between two A-frame stands. Its rim
 * drives a strip across the top of the machine — the content of a list, ruled
 * into rows — running over two idler rollers into a housing at each end. A
 * brake shoe rides the rim below, pressed on by a lever whose knob sets how
 * hard: the deceleration.
 *
 * Static parts are built once per canvas size. The wheel's face turns as a
 * layer; the strip's rows are drawn per frame from the offset.
 */
import {
  box,
  cylinder,
  dots,
  halo,
  line,
  planeMatrix,
  projector,
  ringFront,
  ticks,
  type Projector,
  type Solid,
  type Vec2,
  type Vec3,
  type View,
} from '../../kit/iso';

export const WHEEL = { x: 104, y: 40, z: 74, r: 54, width: 12 };
export const AXLE = { r: 4, from: 16, to: 72 };
export const STRIP = { from: 20, to: 196, y: 34, d: 24, z: WHEEL.z + WHEEL.r + 0.4, h: 1.6 };
export const ROW = 12;
export const KNOB = { at: [176, 66, 40] as Vec3, r: 7, length: 6 };

/** Points the camera is fitted to. */
export const EXTENT: Vec3[] = [
  [0, 0, 0],
  [216, 0, 0],
  [0, 88, 0],
  [216, 88, 0],
  [0, 20, STRIP.z + 14],
  [216, 20, STRIP.z + 14],
  [104, 70, 0],
];

export interface FlywheelArt {
  halo: string;
  back: Solid[];
  backLines: { faint: string; edge: string };
  screws: Vec2[];
  wheel: Solid[];
  wheelPlane: number[];
  middle: Solid[];
  middleLines: string;
  strip: Solid;
  front: Solid[];
  frontScrews: Vec2[];
  knobPlane: number[];
  knobFacePlane: number[];
  proj: Projector;
  /** Screen centre of the knob, for hit-testing. */
  knobAt: Vec2;
  /** Screen direction the strip runs, per world unit. */
  stripStep: Vec2;
}

export function buildFlywheel(view: View): FlywheelArt {
  const feet = [
    [10, 10],
    [206, 10],
    [10, 78],
    [206, 78],
  ].map(([x, y]) => cylinder(view, { at: [x!, y!, 0], axis: 'z', r: 4.5, length: 3 }, 'lo'));
  const plate = box(view, { x: 0, y: 0, z: 3, w: 216, d: 88, h: 7, r: 6 }, 'lo');
  const plateScrews = dots(view, [
    [7, 7, 10],
    [209, 7, 10],
    [7, 81, 10],
    [209, 81, 10],
  ]);

  // The far A-frame, behind the wheel: two legs and a bearing block.
  const stand = (y: number) => [
    box(view, { x: WHEEL.x - 34, y, z: 10, w: 68, d: 10, h: 6 }, 'mid'),
    box(view, { x: WHEEL.x - 6, y, z: 16, w: 12, d: 10, h: WHEEL.z - 16 - 6 }, 'mid'),
    box(view, { x: WHEEL.x - 10, y: y - 1, z: WHEEL.z - 8, w: 20, d: 12, h: 16, r: 3 }, 'hi'),
  ];
  const farStand = stand(AXLE.from + 6);
  const nearStand = stand(WHEEL.y + WHEEL.width + 6);

  // Idler posts and rollers at each end of the strip, on the far side.
  const post = (x: number) => box(view, { x: x - 4, y: STRIP.y - 6, z: 10, w: 8, d: 6, h: STRIP.z - 14 }, 'mid');
  const roller = (x: number) =>
    cylinder(view, { at: [x, STRIP.y - 2, STRIP.z - 5], axis: 'y', r: 5, length: STRIP.d + 4 }, 'hi');

  const axle = cylinder(view, { at: [WHEEL.x, AXLE.from, WHEEL.z], axis: 'y', r: AXLE.r, length: AXLE.to - AXLE.from }, 'hi');
  const wheel = cylinder(view, { at: [WHEEL.x, WHEEL.y, WHEEL.z], axis: 'y', r: WHEEL.r, length: WHEEL.width, segments: 48 }, 'lit');
  const hub = cylinder(view, { at: [WHEEL.x, WHEEL.y + WHEEL.width, WHEEL.z], axis: 'y', r: 11, length: 3 }, 'hi');
  const rimLine = ringFront(
    view,
    { origin: [WHEEL.x, WHEEL.y + WHEEL.width / 2, WHEEL.z], u: [1, 0, 0], v: [0, 0, 1], w: [0, 1, 0] },
    WHEEL.r
  );

  // The brake: a shoe on the rim's lower right, its lever pivoted on a post.
  const brakePost = box(view, { x: 168, y: 54, z: 10, w: 16, d: 12, h: 38 }, 'mid');
  const lever = box(view, { x: WHEEL.x + 40, y: 56, z: 30, w: 34, d: 6, h: 6, r: 1 }, 'hi');
  const shoe = box(view, { x: WHEEL.x + 36, y: WHEEL.y - 1, z: 30, w: 10, d: WHEEL.width + 2, h: 14, r: 2 }, 'hi');
  const shoeArm = box(view, { x: WHEEL.x + 44, y: WHEEL.y + WHEEL.width + 1, z: 34, w: 6, d: 15, h: 5 }, 'hi');
  const knob = cylinder(view, { at: KNOB.at, axis: 'y', r: KNOB.r, length: KNOB.length }, 'hi');
  const knobBoss = cylinder(view, { at: [KNOB.at[0], KNOB.at[1] - 0.5, KNOB.at[2]], axis: 'y', r: 4, length: 1 }, 'hi');

  // The strip and its end housings.
  const strip = box(view, { x: STRIP.from, y: STRIP.y, z: STRIP.z, w: STRIP.to - STRIP.from, d: STRIP.d, h: STRIP.h }, 'hi');
  const housing = (x: number) =>
    box(view, { x: x - 11, y: STRIP.y - 8, z: STRIP.z - 14, w: 22, d: STRIP.d + 16, h: 24, r: 3 }, 'mid');
  const housingScrews = [8, 208].flatMap((x) =>
    dots(view, [
      [x - 6, STRIP.y + STRIP.d + 8, STRIP.z + 6],
      [x + 6, STRIP.y + STRIP.d + 8, STRIP.z + 6],
    ])
  );

  // A scale on the near stand's foot: the brake's travel marks.
  const scale = ticks(view, {
    from: [WHEEL.x - 30, WHEEL.y + WHEEL.width + 16, 16],
    dir: [1, 0, 0],
    out: [0, 1, 0],
    count: 13,
    step: 5,
    minor: 2,
    major: 3.4,
    every: 4,
  });
  const groove = line(view, [4, 84, 10], [212, 84, 10]);

  const wheelFace: Vec3 = [WHEEL.x, WHEEL.y + WHEEL.width, WHEEL.z];

  return {
    halo: halo(view, { x: 0, y: 0, w: 216, d: 88, spread: 8 }),
    back: [...feet, plate, post(26), post(190), roller(26), roller(190), ...farStand, axle],
    backLines: { faint: groove, edge: scale.major + scale.minor },
    screws: plateScrews,
    wheel: [wheel],
    wheelPlane: planeMatrix(view, wheelFace, [1, 0, 0], [0, 0, 1]),
    middle: [hub, ...nearStand, shoe, shoeArm, brakePost, lever, knobBoss, knob],
    middleLines: rimLine,
    strip,
    front: [housing(8), housing(208)],
    frontScrews: housingScrews,
    knobPlane: planeMatrix(view, [KNOB.at[0], KNOB.at[1] + KNOB.length, KNOB.at[2]], [1, 0, 0], [0, 0, 1]),
    knobFacePlane: planeMatrix(view, [KNOB.at[0], KNOB.at[1], KNOB.at[2]], [1, 0, 0], [0, 0, 1]),
    proj: projector(view),
    knobAt: view.point([KNOB.at[0], KNOB.at[1] + KNOB.length, KNOB.at[2]]),
    stripStep: view.delta([1, 0, 0]),
  };
}
