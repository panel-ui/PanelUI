/**
 * The hold-to-repeat timer behind NumberInput's − and + buttons.
 *
 * A press steps once, then after `delay` keeps stepping every `interval` until
 * it is stopped. Two things keep it from running away:
 *
 * - There is only ever one timer. `start` clears whatever is already running,
 *   because a press-in does not always arrive after the previous press-out —
 *   quick taps on Android can deliver two press-ins in a row, and a second
 *   timer started over the first leaves the first with no handle to clear it.
 * - The step reports whether another one is possible. At a bound the button
 *   disables, and a disabled button is not guaranteed to deliver the release
 *   that would stop the timer, so the timer stops itself there instead.
 *
 * Kept free of React so it can be tested on its own.
 */

export interface Repeater {
  /** Step once now, then repeat until `stop`. Replaces any running repeat. */
  start: (step: () => boolean) => void;
  /** Stop repeating. Safe to call when nothing is running. */
  stop: () => void;
}

export function createRepeater(delay: number, interval: number): Repeater {
  let delayTimer: ReturnType<typeof setTimeout> | null = null;
  let intervalTimer: ReturnType<typeof setInterval> | null = null;
  // Bumped by every start and stop. A callback from an earlier generation does
  // nothing, so a timer that fires once more after being cleared cannot step.
  let generation = 0;

  const stop = () => {
    generation += 1;
    if (delayTimer !== null) clearTimeout(delayTimer);
    if (intervalTimer !== null) clearInterval(intervalTimer);
    delayTimer = null;
    intervalTimer = null;
  };

  const start = (step: () => boolean) => {
    stop();
    const current = generation;
    if (!step()) return;
    delayTimer = setTimeout(() => {
      if (current !== generation) return;
      delayTimer = null;
      intervalTimer = setInterval(() => {
        if (current !== generation) return;
        if (!step()) stop();
      }, interval);
    }, delay);
  };

  return { start, stop };
}
