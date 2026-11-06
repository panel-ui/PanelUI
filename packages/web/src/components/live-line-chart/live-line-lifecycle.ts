export interface LiveLineReading {
  time: number;
  value: number;
}

export const DEFAULT_LIVE_LINE_WINDOW = 30;
export const DEFAULT_LIVE_LINE_MAX_POINTS = 500;

export function normalizeLiveLineWindow(seconds: number): number {
  return Number.isFinite(seconds) && seconds > 0 ? Math.max(seconds, 1) : DEFAULT_LIVE_LINE_WINDOW;
}

export function normalizeLiveLineMaxPoints(maxPoints: number): number {
  return Number.isFinite(maxPoints) && maxPoints > 0 ? Math.max(1, Math.floor(maxPoints)) : DEFAULT_LIVE_LINE_MAX_POINTS;
}

/**
 * Builds the one ordered, finite buffer everything else reads. For duplicate
 * timestamps the last input wins, as a corrected reading replaces the one it
 * shares a time with.
 */
export function normalizeLiveLinePoints<T extends LiveLineReading>(data: readonly T[], maxPoints: number): T[] {
  const byTime = new Map<number, T>();
  for (const point of data) {
    if (Number.isFinite(point.time) && Number.isFinite(point.value)) byTime.set(point.time, point);
  }
  return [...byTime.values()]
    .sort((left, right) => left.time - right.time)
    .slice(-normalizeLiveLineMaxPoints(maxPoints));
}

/** The clock runs only while something can see it move. */
export function liveLineClockRuns(options: {
  paused: boolean;
  loading: boolean;
  reducedMotion: boolean;
  visible: boolean;
}): boolean {
  return !options.paused && !options.loading && !options.reducedMotion && options.visible;
}

/** The same moment in a new buffer, or null once it has been trimmed away. */
export function reconcileLiveLineActivePoint<T extends LiveLineReading>(active: T | null, points: readonly T[]): T | null {
  if (!active) return null;
  return points.find((point) => point.time === active.time) ?? null;
}

/**
 * The value axis, from what is in the window and not everything kept: a spike
 * that has scrolled off should stop holding the axis open.
 */
export function liveLineExtent(points: readonly LiveLineReading[], from: number): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const point of points) {
    if (point.time < from) continue;
    if (point.value < min) min = point.value;
    if (point.value > max) max = point.value;
  }
  if (min === Infinity) return [0, 1];
  if (min === max) return [min - 1, max + 1];
  const headroom = (max - min) * 0.12;
  return [min - headroom, max + headroom];
}

/** Where the last few readings have been going, as a share of the axis. */
export function liveLineMomentum(points: readonly LiveLineReading[], extent: [number, number]): 'up' | 'down' | 'flat' {
  if (points.length < 2) return 'flat';
  const recent = points.slice(-6);
  const span = Math.abs(extent[1] - extent[0]) || 1;
  const change = (recent[recent.length - 1]!.value - recent[0]!.value) / span;
  return change > 0.04 ? 'up' : change < -0.04 ? 'down' : 'flat';
}

/**
 * The readings to draw. The run starts one reading before the window, so the line
 * enters from the edge instead of beginning wherever the oldest survivor sits; the
 * plot's clip hides the overhang. It stops at the window's end, which a paused
 * chart is behind.
 */
export function liveLineRun<T extends LiveLineReading>(points: readonly T[], xMin: number, xMax: number): readonly T[] {
  let start = 0;
  let end = 0;
  for (const point of points) {
    if (point.time > xMax) break;
    end += 1;
    if (point.time < xMin) start = end - 1;
  }
  return points.slice(start, end);
}

/** The reading the leading dot rides: the newest on the plot, or null if the feed stopped too long ago. */
export function newestOnPlot<T extends LiveLineReading>(points: readonly T[], xMin: number, xMax: number): T | null {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index]!;
    if (point.time <= xMax) return point.time >= xMin ? point : null;
  }
  return null;
}

/** The readings inside the plot's window: the only ones a pointer or a key can read. */
export function liveLineOnPlot<T extends LiveLineReading>(points: readonly T[], xMin: number, xMax: number): T[] {
  return points.filter(({ time }) => time >= xMin && time <= xMax);
}

/** The reading nearest a moment, which on a feed with gaps is not the nearest on screen. */
export function nearestReading<T extends LiveLineReading>(points: readonly T[], at: number): T | null {
  let best: T | null = null;
  let bestGap = Infinity;
  for (const point of points) {
    const gap = Math.abs(point.time - at);
    if (gap < bestGap) {
      bestGap = gap;
      best = point;
    }
  }
  return best;
}
