/**
 * Reading a typed amount, apart from anything drawn, so a test can run it directly.
 */

/**
 * The figure as typed, with its decimal mark made a point. The draft never
 * holds grouping, so a single comma with no point is the decimal mark a
 * keypad offered (`1,50`); with a point present, or more than one comma, the
 * commas are grouping from a pasted figure and are dropped.
 */
export function normalizeTyped(text: string): string {
  const trimmed = text.trim();
  const commas = trimmed.split(',').length - 1;
  if (commas === 1 && !trimmed.includes('.')) return trimmed.replace(',', '.');
  return trimmed.replace(/,/g, '');
}

/** The figure as it is typed: digits and one decimal mark. */
export function parseAmount(text: string): number | null {
  const cleaned = normalizeTyped(text);
  if (cleaned === '' || cleaned === '.') return null;
  if (!/^\d*\.?\d*$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Rounds to a currency's minor unit, so the figure held is one that could be
 * paid. It shifts by exponent rather than multiplying, because `1.005 * 100`
 * is `100.49999…` in binary and would round the wrong way.
 */
export function roundTo(amount: number, decimals: number): number {
  const shifted = Math.round(Number(`${amount}e${decimals}`));
  return Number(`${shifted}e-${decimals}`);
}
