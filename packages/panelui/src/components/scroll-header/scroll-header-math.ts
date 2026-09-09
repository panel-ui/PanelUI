/**
 * The three numbers a collapsing header is made of, kept apart from the views
 * that draw them so each one can be checked on its own.
 *
 * All three are worklets: they run inside the scroll handler and the animated
 * styles, on the UI thread, and none of them touches anything but its
 * arguments.
 */

/** How close to an end a band has to be before it is treated as settled. */
export const SNAP_EPSILON = 1;

/** Below this, a lifted finger is not going to start any momentum. */
export const RESTING_VELOCITY = 0.05;

/** A large block shorter than this is treated as no large block at all. */
export const MINIMUM_SPAN = 1;

/**
 * How long the hand-over takes when there is no large block to cross.
 *
 * With a block, the change is scroll-linked and lasts exactly as long as the
 * finger says. With none there is no distance to interpolate over, so the step
 * is timed instead — otherwise the bar's surface appears between one frame and
 * the next, on the first point of scroll.
 */
export const HANDOVER_DURATION = 200;

/**
 * The hand-over runs in three steps rather than one crossfade, and these are
 * where each step starts and ends along the collapse.
 *
 * A single linear crossfade puts both titles on the screen at once, and the
 * large block travels to exactly where the bar's title sits — so the two words
 * land on the same pixels, half-opaque, and the screen reads as a printing
 * error. Worse, a bar whose surface is still arriving is see-through, so the
 * block slides up *through* whatever else the bar is carrying.
 *
 * Ordering them fixes both: the block is gone before it reaches the bar, the
 * surface closes behind it, and only then does the bar's own title arrive.
 * Nothing is ever legible on top of anything else.
 */
export const LARGE_EXIT: readonly [number, number] = [0, 0.45];
export const SURFACE_ARRIVE: readonly [number, number] = [0.35, 0.75];
export const BAR_TITLE_ARRIVE: readonly [number, number] = [0.6, 1];

/** Whether a header has a large block to cross at all. */
export function hasSpan(largeHeight: number): boolean {
  'worklet';
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
 * bar's only cue that the content has moved at all — and it answers on the
 * first point of scroll rather than waiting for a span that will never come.
 */
export function collapseProgress(offset: number, largeHeight: number, threshold: number): number {
  'worklet';
  const span = largeHeight * Math.min(Math.max(threshold, 0.05), 1);
  if (span < MINIMUM_SPAN) return offset > 0 ? 1 : 0;
  return Math.min(Math.max(offset / span, 0), 1);
}

/**
 * The band's height at a given scroll position.
 *
 * The bar's share is fixed and the large block's is whatever it has left, so
 * the band and the content inset can never disagree about where the header
 * ends. An over-scroll makes the remainder larger than the block ever was,
 * which is what stretches a cover: it is laid out taller rather than scaled
 * up, so a photograph in it does not go soft.
 */
export function bandHeight(
  barBand: number,
  largeHeight: number,
  offset: number,
  stretch: boolean
): number {
  'worklet';
  const remaining = largeHeight - offset;
  const bounded = stretch ? remaining : Math.min(remaining, largeHeight);
  return barBand + Math.max(bounded, 0);
}

/**
 * Where a lifted finger should leave the scroller, or `null` to leave it
 * where it is.
 *
 * Only a band caught part-way is moved, and only once nothing else is going to
 * move it: a fling has momentum still to run, and settling under it would
 * fight the gesture. Past the halfway point it closes, before it opens, so the
 * shorter journey always wins.
 */
export function snapTarget(
  offset: number,
  largeHeight: number,
  velocity: number
): number | null {
  'worklet';
  if (Math.abs(velocity) > RESTING_VELOCITY) return null;
  if (largeHeight < MINIMUM_SPAN) return null;
  if (offset <= SNAP_EPSILON || offset >= largeHeight - SNAP_EPSILON) return null;
  return offset >= largeHeight / 2 ? largeHeight : 0;
}

/**
 * Whether a reaction's new value is a crossing worth reporting.
 *
 * A reaction's first run carries `null` as the previous value, and a mount is
 * not a crossing: reporting it would hand `onCollapsedChange` a `false` for a
 * header that has never been anywhere else. After that, only a change counts.
 */
export function isCrossing(next: boolean, previous: boolean | null): boolean {
  'worklet';
  return previous !== null && next !== previous;
}

/**
 * The content inset the scrollable needs: the band's resting height, plus any
 * top padding the caller asked for.
 *
 * A style array does not add, it overrides — so a caller who writes
 * `contentContainerStyle={{ padding: 16 }}` on the child would otherwise lose
 * the inset and start their content underneath the header. They cannot write
 * the sum themselves either, because the band's height is measured rather than
 * known. So their padding is read and added here, and the total is what goes
 * on the child.
 *
 * Only a real number can be added to. A percentage is left out of the sum
 * rather than guessed at, and the inset alone is used.
 */
export function contentInset(band: number, ownTopPadding: unknown): number {
  'worklet';
  const own =
    typeof ownTopPadding === 'number' && Number.isFinite(ownTopPadding) && ownTopPadding > 0
      ? ownTopPadding
      : 0;
  return band + own;
}
