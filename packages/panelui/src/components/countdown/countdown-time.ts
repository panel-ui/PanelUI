/**
 * Time arithmetic for `Countdown`, kept apart from the views so it can be
 * tested without a clock.
 *
 * Whole seconds are rounded **up**. A countdown that floors shows 0:00 for the
 * last second before it ends, so it reads as finished while it is not — and
 * an "ends at 12:00" sale still taking orders under a zero is the bug people
 * report. Rounding up shows 0:01 until the very end and reaches 0:00 at the
 * moment the target passes.
 */

export type CountdownUnit = 'days' | 'hours' | 'minutes' | 'seconds';

export const COUNTDOWN_UNITS: readonly CountdownUnit[] = ['days', 'hours', 'minutes', 'seconds'];

const SECONDS: Record<CountdownUnit, number> = {
  days: 86400,
  hours: 3600,
  minutes: 60,
  seconds: 1,
};

export interface CountdownPart {
  unit: CountdownUnit;
  value: number;
}

/** Whole seconds left until `target`, rounded up, never below zero. */
export function secondsLeft(target: number, now: number): number {
  if (!Number.isFinite(target) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.ceil((target - now) / 1000));
}

/**
 * Milliseconds until the displayed second next changes.
 *
 * The tick is scheduled for that moment rather than every 1000ms from mount,
 * so the display changes when the second actually turns over instead of
 * drifting by however late the first timer fired.
 */
export function msUntilNextTick(target: number, now: number): number {
  const remaining = target - now;
  if (remaining <= 0) return 0;
  const into = remaining % 1000;
  return into === 0 ? 1000 : into;
}

/**
 * Splits a number of seconds across the given units, largest first.
 *
 * The largest unit absorbs everything above it, so with `['hours',
 * 'minutes', 'seconds']` two days reads as 48 hours rather than losing the
 * days. Units are always returned in largest-to-smallest order whatever order
 * they were passed in.
 */
export function splitSeconds(
  total: number,
  units: readonly CountdownUnit[] = COUNTDOWN_UNITS
): CountdownPart[] {
  const wanted = COUNTDOWN_UNITS.filter((unit) => units.includes(unit));
  if (wanted.length === 0) return [];
  let rest = Math.max(0, Math.floor(total));
  return wanted.map((unit) => {
    const value = Math.floor(rest / SECONDS[unit]);
    rest -= value * SECONDS[unit];
    return { unit, value };
  });
}

/**
 * Drops leading units that are zero, keeping at least `keep` of them.
 *
 * A launch three hours away has no use for a "00 days" box, but a countdown
 * should not shrink to a lone seconds field in its last minute either, so the
 * smallest `keep` units always stay.
 */
export function trimLeading(parts: CountdownPart[], keep = 2): CountdownPart[] {
  let start = 0;
  while (start < parts.length - keep && parts[start]!.value === 0) start += 1;
  return parts.slice(start);
}

const NAMES: Record<CountdownUnit, [string, string]> = {
  days: ['day', 'days'],
  hours: ['hour', 'hours'],
  minutes: ['minute', 'minutes'],
  seconds: ['second', 'seconds'],
};

/**
 * What a screen reader hears. Coarser than what is on screen.
 *
 * The label changes only when the minute does, until the last minute, when it
 * counts seconds. A label that changed every second would be re-read every
 * second by anything polling it, and a reader does not need the seconds of a
 * launch two days away.
 */
export function describeSeconds(total: number): string {
  if (total <= 0) return 'Time is up';
  if (total < 60) return `${total} ${NAMES.seconds[total === 1 ? 0 : 1]} left`;
  const parts = splitSeconds(total, ['days', 'hours', 'minutes'])
    .filter((part) => part.value > 0)
    .map((part) => `${part.value} ${NAMES[part.unit][part.value === 1 ? 0 : 1]}`);
  return `${parts.join(', ')} left`;
}
