/** How far a ring has got towards its target, 0 to 1. A value past it fills the ring and stops. */
export function ringFraction(value: number, maxValue: number): number {
  if (!(maxValue > 0)) return 0;
  return Math.max(0, Math.min(1, value / maxValue));
}

/** The same thing in words. Not clamped, because 120 percent of a goal is worth saying. */
export function ringPercent(value: number, maxValue: number): number {
  return maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
}

/** How much of a turn the arcs run, from two angles on the clock. A gauge is less than one. */
export function ringSpan(startAngle: number, endAngle: number): number {
  return Math.min(Math.max(endAngle - startAngle, 0), 360) / 360;
}

/** Where a ring's centre line sits. Outermost first, each one stepping in by its thickness and the gap. */
export function ringRadius(box: number, strokeWidth: number, ringGap: number, index: number): number {
  return Math.max(box / 2 - strokeWidth / 2 - index * (strokeWidth + ringGap), strokeWidth / 2);
}

/**
 * One tick of a segmented ring: `slot` is a tick and the gap after it, `dash` the
 * tick alone. The gap comes out of the tick, so N ticks still span the whole arc.
 */
export function ringTick(arcLength: number, segments: number, segmentGap: number): { slot: number; dash: number } {
  const slot = arcLength / segments;
  return { slot, dash: Math.max(slot - segmentGap, 0.5) };
}

/**
 * When a ring starts its sweep, as a share of the duration. Staggered outward-in,
 * with the last 60 percent left for the sweep itself, so five rings finish inside
 * the one duration.
 */
export function ringStagger(index: number, count: number): number {
  return (index / Math.max(1, count)) * 0.4;
}

/** The ring a key moves the reading to, or `current` for any other key. Walks in data order and stops at the ends. */
export function ringAfterKey(key: string, current: number, count: number): number {
  if (count <= 0) return current;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return Math.min(current + 1, count - 1);
    case 'ArrowLeft':
    case 'ArrowUp':
      return Math.max(current - 1, 0);
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return current;
  }
}
