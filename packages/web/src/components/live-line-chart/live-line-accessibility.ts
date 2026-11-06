import type { LiveLineReading } from './live-line-lifecycle';

export interface LiveLineAccessibilityInput {
  name?: string;
  status: 'loading' | 'ready';
  latest: LiveLineReading | null;
  activePoint: LiveLineReading | null;
  momentum: 'up' | 'down' | 'flat';
  windowSeconds: number;
  paused: boolean;
  now: number;
  valueOverride?: string;
  formatLatest: (value: number) => string;
  formatActive: (value: number) => string;
}

/** One bounded snapshot for a stream, rather than one node per arriving point. */
export function liveLineAccessibility({
  name,
  status,
  latest,
  activePoint,
  momentum,
  windowSeconds,
  paused,
  now,
  valueOverride,
  formatLatest,
  formatActive,
}: LiveLineAccessibilityInput): string {
  const parts = [name?.trim() || 'Live line chart'];

  if (status === 'loading' || !latest) {
    parts.push(status === 'loading' ? 'Loading' : 'No readings');
    if (paused) parts.push('Paused');
    return parts.join('. ');
  }

  if (activePoint) {
    const secondsAgo = Math.max(0, Math.round((now - activePoint.time) / 1000));
    parts.push(`Selected value, ${formatActive(activePoint.value)}`);
    parts.push(secondsAgo === 0 ? 'Just now' : `${secondsAgo} seconds ago`);
  } else {
    parts.push(`Current value, ${valueOverride ?? formatLatest(latest.value)}`);
    parts.push(`Trend, ${momentum === 'up' ? 'rising' : momentum === 'down' ? 'falling' : 'steady'}`);
  }

  parts.push(`${windowSeconds}-second window`);
  if (paused) parts.push('Paused');
  return parts.join('. ');
}
