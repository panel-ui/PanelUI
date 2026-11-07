/**
 * The numbers a collapsing header is made of, kept out of the views that draw
 * them so each one can be checked on its own.
 *
 * Every function here is pure: it takes the scroll offset and the measured
 * height of the large block and returns a value. Nothing reads the DOM and
 * nothing subscribes to anything, which is what lets the component read these
 * once per animation frame and write the answer to a CSS custom property
 * instead of asking React to render.
 */

/** How close to an end a band has to be before it is treated as settled. */
export const SNAP_EPSILON = 1;

/** A large block shorter than this is treated as no large block at all. */
export const MINIMUM_SPAN = 1;

/**
 * How far through the collapse each fade runs.
 *
 * The hand-over is ordered rather than one crossfade, because a single linear
 * fade puts both titles on the screen at once and the large block travels to
 * exactly the pixels the bar's title occupies. The block is gone before it
 * reaches the bar, the surface closes behind it, and only then does the bar's
 * own title arrive.
 */
export const LARGE_EXIT: readonly [number, number] = [0, 0.45];
export const SURFACE_ARRIVE: readonly [number, number] = [0.35, 0.75];
export const BAR_TITLE_ARRIVE: readonly [number, number] = [0.6, 1];

/** A part of the collapse, as a start and an end between 0 and 1. */
export type FadeStep = readonly [number, number];

/** Somewhere between two ends, without ever running past either. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Whether a header has a large block to cross at all. */
export function hasSpan(largeHeight: number): boolean {
  return largeHeight >= MINIMUM_SPAN;
}

/**
 * How far through the change from large block to bar the header is, 0 to 1.
 *
 * `threshold` shortens the distance the crossfade runs over without changing
 * how far the block actually travels, so a tall block can finish handing over
 * before its last few points have left. It is floored rather than allowed to
 * reach zero: a crossfade with no distance is a jump cut.
 *
 * With no large block there is no distance to interpolate over, so this is the
 * bar's only cue that the content has moved at all, and it answers on the
 * first point of scroll rather than waiting for a span that will never come.
 */
export function collapseProgress(offset: number, largeHeight: number, threshold: number): number {
  const span = largeHeight * clamp(threshold, 0.05, 1);
  if (span < MINIMUM_SPAN) return offset > 0 ? 1 : 0;
  return clamp(offset / span, 0, 1);
}

/**
 * How much of the scroll offset actually moves the large block.
 *
 * The block can only be carried up as far as its own height; past that the
 * band is already at the bar and the content simply scrolls under it. A
 * negative offset — an over-scroll on a platform that reports one — is not
 * travel: it becomes stretch, which is handled separately.
 */
export function clampOffset(offset: number, largeHeight: number): number {
  return clamp(offset, 0, Math.max(largeHeight, 0));
}

/**
 * How far the scroller is pulled past its start, in pixels.
 *
 * Only Safari and other rubber-banding scrollers report a negative offset; a
 * platform that clamps at zero reports nothing and gets no stretch. `stretch`
 * off is the same as a platform that never reports one.
 */
export function stretchOf(offset: number, stretch: boolean): number {
  if (!stretch) return 0;
  return Math.max(-offset, 0);
}

/**
 * The height of the band at a given scroll position.
 *
 * The bar's share is fixed and the large block's is whatever it has left, so
 * the band and the content underneath can never disagree about where the
 * header ends. An over-scroll makes the remainder larger than the block ever
 * was, which is what stretches a cover: it is laid out taller rather than
 * scaled up, so a photograph in it does not go soft.
 */
export function bandHeight(
  barBand: number,
  largeHeight: number,
  offset: number,
  stretchPx = 0
): number {
  const span = Math.max(largeHeight, 0);
  const remaining = span - clampOffset(offset, span);
  return barBand + Math.max(remaining, 0) + Math.max(stretchPx, 0);
}

/**
 * The translate that keeps the large block's bottom on the band's.
 *
 * The block is in normal flow below the bar, so moving it by the same amount
 * the band shrank — downwards, hence negative for a positive offset — is what
 * keeps the two flush. Under an over-scroll the band grows and the block is
 * pushed the other way, which is what a cover filling the band needs.
 */
export function contentShift(offset: number, largeHeight: number, stretchPx = 0): number {
  return Math.max(stretchPx, 0) - clampOffset(offset, largeHeight);
}

/**
 * Where a settled scroller should be left, or `null` to leave it where it is.
 *
 * Only a band caught part-way is moved: a band already at one end has nothing
 * to settle. Past the halfway point it closes, before it opens, so the shorter
 * journey always wins.
 */
export function snapTarget(offset: number, largeHeight: number): number | null {
  if (largeHeight < MINIMUM_SPAN) return null;
  if (offset <= SNAP_EPSILON || offset >= largeHeight - SNAP_EPSILON) return null;
  return offset >= largeHeight / 2 ? largeHeight : 0;
}

/**
 * Whether a new collapsed state is a crossing worth reporting.
 *
 * The first read after mount is not a crossing: reporting it would hand
 * `onCollapsedChange` a `true` for a page that merely loaded scrolled. After
 * that, only a change counts.
 */
export function isCrossing(next: boolean, previous: boolean | null): boolean {
  return previous !== null && next !== previous;
}

/**
 * How far a value has travelled through a step, 0 to 1.
 *
 * A zero-width step is a jump cut: below its end nothing has happened, at or
 * past it the whole change has.
 */
export function ramp(value: number, step: FadeStep): number {
  const [from, to] = step;
  if (to <= from) return value >= to ? 1 : 0;
  return clamp((value - from) / (to - from), 0, 1);
}
