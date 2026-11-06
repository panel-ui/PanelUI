/**
 * The arithmetic behind a candlestick chart, apart from the drawing so it can be
 * tested on its own: reading rows into candles, the price axis and which periods
 * get a label.
 */

/** Which columns of a row hold the four prices. */
export interface CandleKeys {
  open: string;
  high: string;
  low: string;
  close: string;
}

/** One period's four prices. */
export interface Ohlc {
  open: number;
  high: number;
  low: number;
  close: number;
}

/** One candle: a period that has all four prices, and where it sits along the axis. */
export interface Candle extends Ohlc {
  index: number;
  rising: boolean;
}

/** The closest two period labels may sit, in pixels, so they read as a row of dates. */
const MIN_LABEL_SPACING = 68;

/**
 * A row's four prices, or `null` if any of them is missing. A candle cannot be
 * drawn from some of them, unlike a point on a line.
 */
export function ohlcOf(row: Record<string, unknown> | null | undefined, keys: CandleKeys): Ohlc | null {
  if (!row) return null;
  const { [keys.open]: open, [keys.high]: high, [keys.low]: low, [keys.close]: close } = row;
  if (
    typeof open !== 'number' ||
    typeof high !== 'number' ||
    typeof low !== 'number' ||
    typeof close !== 'number' ||
    ![open, high, low, close].every(Number.isFinite)
  ) {
    return null;
  }
  return { open, high, low, close };
}

/**
 * The periods that can be drawn. A row with a missing price is skipped but keeps
 * its place along the axis, because the period still happened.
 */
export function candlesOf(data: readonly Record<string, unknown>[], keys: CandleKeys): Candle[] {
  return data.flatMap((row, index) => {
    const ohlc = ohlcOf(row, keys);
    return ohlc ? [{ ...ohlc, index, rising: ohlc.close >= ohlc.open }] : [];
  });
}

/**
 * The price axis: the lowest low to the highest high, with a tenth of the span as
 * margin so the extremes are not drawn on the frame.
 *
 * It does not reach for zero. A candle's prices sit close together and usually
 * far from the origin, and including zero would flatten every candle into a dash.
 */
export function candleExtent(candles: readonly Candle[]): [number, number] {
  if (candles.length === 0) return [0, 1];
  let min = Infinity;
  let max = -Infinity;
  // A loop, because a long series spread into `Math.min` passes the engine's argument limit.
  for (const { low, high } of candles) {
    min = Math.min(min, low);
    max = Math.max(max, high);
  }
  // A price that never moved still needs a span to divide by.
  if (min === max) {
    const nudge = Math.abs(min) * 0.05 || 1;
    return [min - nudge, max + nudge];
  }
  const margin = (max - min) * 0.1;
  return [min - margin, max + margin];
}

/**
 * Evenly spaced prices from the top of the axis to the bottom, `count` intervals
 * of them. Even rather than rounded, because the domain's ends are not round.
 */
export function priceTicks([min, max]: readonly [number, number], count: number): number[] {
  const intervals = Math.max(1, Math.round(count));
  return Array.from({ length: intervals + 1 }, (_unused, index) => max - ((max - min) * index) / intervals);
}

/**
 * Which periods get a label: every nth, starting at the first. `ticks` asks for a
 * count, and otherwise the width decides how many fit.
 */
export function labelledPeriods(total: number, width: number, ticks?: number): number[] {
  if (total <= 0) return [];
  const room = Math.max(1, Math.floor(width / MIN_LABEL_SPACING));
  const count = Math.max(1, Math.min(ticks ?? room, total));
  const stride = Math.ceil(total / count);
  return Array.from({ length: Math.ceil(total / stride) }, (_unused, index) => index * stride);
}

/** What a period moved by, open to close, and that as a percentage of the open. */
export function changeOf({ open, close }: Pick<Ohlc, 'open' | 'close'>): { change: number; percent: number } {
  const change = close - open;
  return { change, percent: open === 0 ? 0 : (change / open) * 100 };
}
