/**
 * Which crumbs survive a folded trail.
 *
 * Kept apart from the component because it is the one part of a breadcrumb with
 * rules worth testing: the first and last crumb always stay, and a fold that
 * hides a single crumb is not a fold — it is the same number of slots with one
 * of them made less useful.
 */

/** The slot a folded run of crumbs collapses into. */
export const BREADCRUMB_ELLIPSIS = 'ellipsis' as const;

/** A crumb index, or the one slot that stands in for the hidden ones. */
export type BreadcrumbSlot = number | typeof BREADCRUMB_ELLIPSIS;

export interface BreadcrumbCollapseOptions {
  /** Fold once the trail holds more than this many crumbs. */
  maxItems?: number;
  /** How many leading crumbs survive. At least one, so the trail keeps its root. */
  itemsBeforeCollapse?: number;
  /** How many trailing crumbs survive. At least one, so the trail keeps its end. */
  itemsAfterCollapse?: number;
}

const whole = (value: number) => Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));

/**
 * The order of slots a list should draw for `count` crumbs.
 *
 * Returns every index when nothing is folded, so a caller can map the result
 * straight onto its children without a separate path for the common case.
 */
export function collapseBreadcrumbItems(
  count: number,
  { maxItems, itemsBeforeCollapse = 1, itemsAfterCollapse = 1 }: BreadcrumbCollapseOptions = {}
): BreadcrumbSlot[] {
  const total = whole(count);
  const all = Array.from({ length: total }, (_, index) => index);

  if (maxItems === undefined || !Number.isFinite(maxItems) || total <= whole(maxItems)) {
    return all;
  }

  // The ends are not negotiable: an unfolded view without its first crumb has
  // lost the way home, and one without its last has lost the page it describes.
  const before = Math.max(1, whole(itemsBeforeCollapse));
  const after = Math.max(1, whole(itemsAfterCollapse));
  const hidden = total - before - after;

  // One hidden crumb plus an ellipsis is the same length as keeping the crumb,
  // and the crumb is more useful. Fold only when at least two disappear.
  if (hidden < 2) return all;

  return [
    ...Array.from({ length: before }, (_, index) => index),
    BREADCRUMB_ELLIPSIS,
    ...Array.from({ length: after }, (_, index) => total - after + index),
  ];
}
