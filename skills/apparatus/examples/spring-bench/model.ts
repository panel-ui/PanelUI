/**
 * The truth behind the spring bench: a mass on a spring with a damper, the
 * system a spring animation solves.
 *
 * The carriage is the mass, the coil is the stiffness, the dashpot is the
 * damping. Everything the figure shows — where the carriage goes when it is
 * let go, the curve the pen draws, the numbers in the readout — comes from the
 * functions here, so the drawing cannot say something the physics does not.
 *
 * Distances are in the figure's world units and time is in real seconds.
 */

/** Where things are, in world units along the rail. */
export const BENCH = {
  /** The carriage's left face when the spring is at rest. */
  rest: 140,
  /** Hard stops, at the dashpot's end and at the far stop block. */
  min: 105,
  max: 185,
  /** Where an idle tour pulls the carriage to before letting go. */
  tourPull: 40,
  mass: 1,
} as const;

export const STIFFNESS = { min: 60, max: 360, initial: 170, step: 20 } as const;
export const DAMPING = { min: 2, max: 30, initial: 7, step: 2 } as const;

/** The damping ratio: below 1 the carriage overshoots, at 1 it just doesn't, above 1 it creeps. */
export function dampingRatio(stiffness: number, damping: number, mass: number = BENCH.mass): number {
  return damping / (2 * Math.sqrt(stiffness * mass));
}

/**
 * How far past rest the carriage swings on its first return, as a share of how
 * far it was pulled. Zero once the damping ratio reaches 1.
 */
export function overshoot(stiffness: number, damping: number, mass: number = BENCH.mass): number {
  const zeta = dampingRatio(stiffness, damping, mass);
  if (zeta >= 1) return 0;
  return Math.exp((-zeta * Math.PI) / Math.sqrt(1 - zeta * zeta));
}

/**
 * Seconds from release until the carriage stays within `tolerance` of rest,
 * as a share of the pull. Found by stepping the same equation the figure runs,
 * rather than from the textbook approximation, which is wrong near a ratio of 1.
 */
export function settleTime(
  stiffness: number,
  damping: number,
  mass: number = BENCH.mass,
  tolerance = 0.02
): number {
  const h = 0.0005;
  let x = 1;
  let v = 0;
  let lastOutside = 0;
  for (let t = 0; t < 10; t += h) {
    const a = (-stiffness * x - damping * v) / mass;
    v += a * h;
    x += v * h;
    if (Math.abs(x) > tolerance) lastOutside = t;
  }
  return lastOutside;
}

/** The readout: the damping ratio and the settle time. */
export function describe(stiffness: number, damping: number): string {
  const zeta = dampingRatio(stiffness, damping);
  const seconds = settleTime(stiffness, damping);
  return `ζ ${zeta.toFixed(2)} · settles ${seconds.toFixed(2)} s`;
}

/** How far a knob turns each way from straight up, in radians. */
export const SWEEP = (135 * Math.PI) / 180;

/** A knob's angle in radians for a value. Runs on the UI thread, so it is a worklet. */
export function knobAngle(value: number, range: { min: number; max: number }): number {
  'worklet';
  return -SWEEP + ((value - range.min) / (range.max - range.min)) * SWEEP * 2;
}
