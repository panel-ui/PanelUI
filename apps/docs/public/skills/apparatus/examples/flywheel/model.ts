/**
 * The truth behind the flywheel: how a flicked scroll view coasts to a stop.
 *
 * When a finger lifts mid-fling, the content keeps the finger's speed and then
 * loses a fixed share of it every millisecond: `v(t) = v₀ · rateᵗ`. The rate is
 * the deceleration a scroll view or a decay animation is given; 0.998 is a
 * platform's normal scroll, 0.99 its fast one. The distance it will coast is
 * known the moment the finger lifts, `v₀ / -ln(rate)`, which is how a
 * list can snap to where a fling will end before it gets there.
 *
 * Speeds are in points per second, distances in points, time in seconds.
 */

export const RATE = { min: 0.99, max: 0.999, initial: 0.998, step: 0.001 } as const;

/** Below this speed, in points per second, the wheel is stopped. */
export const STOP_SPEED = 5;

/** Speed after `dt` seconds of coasting. A worklet: the frame loop calls it. */
export function coast(speed: number, rate: number, dt: number): number {
  'worklet';
  return speed * Math.pow(rate, dt * 1000);
}

/** How far a fling at `speed` coasts before it stops, in points. */
export function coastDistance(speed: number, rate: number): number {
  'worklet';
  if (Math.abs(speed) < STOP_SPEED) return 0;
  return Math.abs(speed) / 1000 / -Math.log(rate);
}

/** Seconds until a fling at `speed` falls below the stop speed. */
export function coastTime(speed: number, rate: number): number {
  if (Math.abs(speed) < STOP_SPEED) return 0;
  return Math.log(STOP_SPEED / Math.abs(speed)) / Math.log(rate) / 1000;
}

const grouped = (value: number) => Math.round(value).toLocaleString('en-US');

/** The readout: the speed now and what it will still travel, or the rate when still. */
export function describe(speed: number, rate: number): string {
  if (Math.abs(speed) < STOP_SPEED) return `rate ${rate.toFixed(3)} per ms`;
  return `${grouped(Math.abs(speed))} pt/s · ${grouped(coastDistance(speed, rate))} pt left`;
}

/** A knob's angle in radians for a rate, -135° to 135°. */
export const SWEEP = (135 * Math.PI) / 180;

export function knobAngle(rate: number): number {
  'worklet';
  return -SWEEP + ((rate - RATE.min) / (RATE.max - RATE.min)) * SWEEP * 2;
}
