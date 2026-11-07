/**
 * The arithmetic behind Pagination, kept away from the drawing.
 *
 * A pager is two separate problems: deciding which numbers to show, and
 * putting them on the screen. The first is the one that goes wrong quietly —
 * an ellipsis that hides a single page, a run that changes width as you step
 * through it, a page number left past the end when a filter shrinks the
 * result set. Keeping it here means it can be tested without a browser, and
 * a caller who needs the same run for a control of their own gets the same
 * answer rather than a second implementation that drifts.
 *
 * The run is a fixed width rather than a sliding window: the same number of
 * targets whichever page you are on, so the row does not reflow under the
 * finger and the arrow somebody was aiming at stays put. `boundaries` pins
 * the ends, `siblings` pads the middle, and a gap of exactly one page is
 * drawn as that page instead of an ellipsis — a gap marker wider than the
 * number it hides is a worse trade than the number.
 */

/** A number in the run, or the gap where the numbers between are folded. */
export type PaginationItemValue = number | 'start-ellipsis' | 'end-ellipsis';

const range = (start: number, end: number): number[] =>
  end < start ? [] : Array.from({ length: end - start + 1 }, (_, index) => start + index);

/** A count of pages: a whole number, never below zero. */
const whole = (value: number, fallback: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;

/**
 * A page number the component can use: whole, at least 1, and never past the
 * last page.
 *
 * Both ends matter. A controlled page can be set to 0 by a stepper, and
 * `count` can shrink under a page that was valid a moment ago when a filter
 * narrows the result set. A page past the end would light nothing and disable
 * both arrows at once, which reads as a pager that has stopped working.
 *
 * A set with no pages has no page to be on, so this returns 0; the component
 * draws an empty run rather than a phantom page 1.
 */
export function clampPage(page: number, count: number): number {
  const pages = whole(count, 0);
  if (pages <= 0) return 0;
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(Math.floor(page), 1), pages);
}

/**
 * Which numbers to draw, and where the gaps go.
 *
 * `page` is clamped first, so a caller may pass the page it is holding rather
 * than the page the component is drawing. A gap of exactly one page is
 * written as the page itself: an ellipsis there would take the same width and
 * hide a target for nothing.
 */
export function paginationRange({
  count,
  page,
  siblings = 1,
  boundaries = 1,
}: {
  /** How many pages there are, numbered from 1. */
  count: number;
  /** The page being shown. Clamped into the run. */
  page: number;
  /** How many pages to keep either side of the current one. */
  siblings?: number;
  /** How many pages to keep pinned at each end. */
  boundaries?: number;
}): PaginationItemValue[] {
  const pages = whole(count, 0);
  if (pages === 0) return [];

  const current = clampPage(page, pages);
  const edge = whole(boundaries, 1);
  const around = whole(siblings, 1);

  const startPages = range(1, Math.min(edge, pages));
  const endPages = range(Math.max(pages - edge + 1, edge + 1), pages);

  const siblingsStart = Math.max(
    Math.min(current - around, pages - edge - around * 2 - 1),
    edge + 2
  );
  const siblingsEnd = Math.min(
    Math.max(current + around, edge + around * 2 + 2),
    endPages.length > 0 ? (endPages[0] as number) - 2 : pages - 1
  );

  return [
    ...startPages,
    ...(siblingsStart > edge + 2
      ? (['start-ellipsis'] as PaginationItemValue[])
      : edge + 1 < pages - edge
        ? [edge + 1]
        : []),
    ...range(siblingsStart, siblingsEnd),
    ...(siblingsEnd < pages - edge - 1
      ? (['end-ellipsis'] as PaginationItemValue[])
      : pages - edge > edge
        ? [pages - edge]
        : []),
    ...endPages,
  ];
}

/**
 * The rows on the current page, as a sentence: `1–20 of 143`.
 *
 * The last page is nearly always short, so the end of the span is cut at the
 * total rather than counted as a full page past it — the classic off-by-a-page
 * -size that makes a status line claim rows that do not exist.
 *
 * Needs both `pageSize` and `total` to answer. Without them it returns `null`
 * so the caller can fall back to a page count or its own words. A set with no
 * rows says so in words rather than in a range from zero to zero.
 */
export function paginationSpan({
  page,
  pageSize,
  total,
}: {
  /** The page being shown. Clamped into the set. */
  page: number;
  /** How many rows a page holds. */
  pageSize: number;
  /** How many rows there are altogether. */
  total: number;
}): string | null {
  if (!Number.isFinite(total) || total <= 0) return 'No results';

  const size = whole(pageSize, 0);
  if (size === 0) return null;

  const rows = Math.floor(total);
  const lastPage = Math.max(1, Math.ceil(rows / size));
  const current = Math.min(Math.max(Number.isFinite(page) ? Math.floor(page) : 1, 1), lastPage);
  const from = (current - 1) * size + 1;
  const to = Math.min(current * size, rows);

  return `${from}–${to} of ${rows}`;
}
