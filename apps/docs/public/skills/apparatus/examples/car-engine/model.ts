/**
 * The truth behind the engine: an inline four-cylinder, four-stroke engine.
 *
 * Every cylinder runs the same four strokes, each half a turn of the
 * crankshaft — intake, compression, power, exhaust — so one cycle takes two
 * full turns. The four are spaced through that cycle so one of them is always
 * on its power stroke, firing in the order 1, 3, 4, 2. Pistons 1 and 4 share
 * a crank throw, as do 2 and 3, so the pairs rise and fall together, half a
 * cycle apart in what they are doing.
 *
 * Angles are in degrees of crankshaft rotation through the 720° cycle.
 */

export const CRANK = {
  /** Crank throw: half the stroke. */
  throw: 11,
  /** Connecting rod length, centre to centre. */
  rod: 36,
  /** From the piston pin up to the crown. */
  pinToCrown: 8,
} as const;

/** Where each cylinder's power stroke begins in the cycle: the firing order 1-3-4-2. */
export const FIRE_AT = [0, 540, 180, 360] as const;

export const THROTTLE = { min: 0, max: 120, initial: 40, step: 10 } as const;

export type Stroke = 'power' | 'exhaust' | 'intake' | 'compression';
export const STROKES: Stroke[] = ['power', 'exhaust', 'intake', 'compression'];

/** Where cylinder `index` is in its own cycle, 0–720°, power starting at 0. */
export function phaseOf(cycle: number, index: number): number {
  'worklet';
  const p = (cycle - FIRE_AT[index]!) % 720;
  return p < 0 ? p + 720 : p;
}

/** Which stroke a phase is in: 0 power, 1 exhaust, 2 intake, 3 compression. */
export function strokeOf(phase: number): number {
  'worklet';
  return Math.floor(phase / 180) % 4;
}

/**
 * How high the piston crown sits above the crank axis, for a phase. Top dead
 * centre is at 0° and 360°. The slider-crank: the throw's height plus the
 * rod's, leaning as the throw swings out.
 */
export function crownHeight(phase: number): number {
  'worklet';
  const a = (phase * Math.PI) / 180;
  const side = CRANK.throw * Math.sin(a);
  return CRANK.throw * Math.cos(a) + Math.sqrt(CRANK.rod * CRANK.rod - side * side) + CRANK.pinToCrown;
}

/** Valve lift as a share of full lift: intake opens through intake, exhaust through exhaust. */
export function valveLift(phase: number, valve: 'intake' | 'exhaust'): number {
  'worklet';
  const from = valve === 'intake' ? 360 : 180;
  if (phase < from || phase > from + 180) return 0;
  return Math.sin(((phase - from) / 180) * Math.PI);
}

/** How brightly the charge burns: a flash at the spark that fades through the power stroke. */
export function burn(phase: number): number {
  'worklet';
  if (phase > 140) return 0;
  return Math.pow(1 - phase / 140, 1.6);
}

/** The readout: the speed, and what cylinder 1 is doing. */
export function describe(rpm: number, stroke: number): string {
  const label = STROKES[stroke] ?? 'power';
  return rpm ? `${rpm} rpm · cylinder 1: ${label}` : `stopped · cylinder 1: ${label}`;
}
