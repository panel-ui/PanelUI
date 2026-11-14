/**
 * Reading a typed amount, apart from anything drawn, so a test can run it directly.
 */

/** The figure as it is typed: digits and one point, with grouping commas dropped. */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/,/g, '').trim();
  if (cleaned === '' || cleaned === '.') return null;
  if (!/^\d*\.?\d*$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}
