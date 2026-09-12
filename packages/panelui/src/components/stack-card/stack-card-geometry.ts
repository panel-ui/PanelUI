/**
 * The numbers a deck is made of, kept apart from the views that draw them so
 * each rule can be checked on its own.
 *
 * Every function here is a worklet: they run inside the pan handler and the
 * animated styles, on the UI thread, and none of them touches anything but
 * its arguments.
 */

/** Which way a card leaves the deck. */
export type StackCardDirection = 'left' | 'right' | 'up' | 'down';

/**
 * iOS's scroll deceleration, and the constant behind `project`.
 *
 * Momentum is what lets a short fast flick count and a long slow drag not.
 * Without it the only question a release can answer is how far the finger
 * travelled, and a deck read that way feels heavy in the hand.
 */
export const DECELERATION = 0.998;

/**
 * Where a flick would come to rest if it kept decelerating, in points.
 *
 * The exponential-decay form the platform uses, not the `v² / 2a` from
 * physics: the two disagree most at exactly the speeds a thumb produces.
 */
export function project(velocity: number, deceleration: number = DECELERATION): number {
  'worklet';
  return ((velocity / 1000) * deceleration) / (1 - deceleration);
}

/**
 * How far a finger gets on an axis the deck does not accept, given how far it
 * pushed.
 *
 * Asymptotic rather than clamped. A card that stops dead at a limit reads as
 * broken; one that keeps moving a little further for a lot more travel reads
 * as held.
 */
export function resist(travel: number, span: number, give: number): number {
  'worklet';
  if (span <= 0) return 0;
  return (travel * span * give) / (span + give * Math.abs(travel));
}

/** How far a card has to be taken for a release to send it away, in points. */
export function commitReach(span: number, threshold: number): number {
  'worklet';
  return Math.max(span * threshold, 1);
}

/**
 * How far a drag has carried a card toward leaving in one direction, 0 to 1.
 *
 * One number, and three things read it: the stamp for that direction fades in
 * on it, the card behind climbs into place on it, and the haptic fires when it
 * first reaches 1.
 */
export function directionProgress(
  direction: StackCardDirection,
  x: number,
  y: number,
  width: number,
  height: number,
  threshold: number
): number {
  'worklet';
  const sideways = direction === 'left' || direction === 'right';
  const reach = commitReach(sideways ? width : height, threshold);
  const travel =
    direction === 'left' ? -x : direction === 'right' ? x : direction === 'up' ? -y : y;
  return Math.min(Math.max(travel / reach, 0), 1);
}

/** The furthest any accepted direction has been carried, 0 to 1. */
export function releaseProgress(
  allowed: readonly StackCardDirection[],
  x: number,
  y: number,
  width: number,
  height: number,
  threshold: number
): number {
  'worklet';
  let furthest = 0;
  for (let index = 0; index < allowed.length; index += 1) {
    const direction = allowed[index];
    if (!direction) continue;
    const progress = directionProgress(direction, x, y, width, height, threshold);
    if (progress > furthest) furthest = progress;
  }
  return furthest;
}

/**
 * Which way a lifted finger sent the card, or `null` to put it back.
 *
 * Distance and momentum are added before the comparison rather than tested one
 * after the other, so there is a single rule: a card leaves when the finger
 * was going to take it past the reach, whether it got there or not.
 *
 * Where two directions both qualify — a diagonal fling in a deck that takes
 * all four — the one carried furthest wins, so the card goes where it was
 * actually thrown.
 */
export function releasedDirection(
  allowed: readonly StackCardDirection[],
  x: number,
  y: number,
  velocityX: number,
  velocityY: number,
  width: number,
  height: number,
  threshold: number
): StackCardDirection | null {
  'worklet';
  const projectedX = x + project(velocityX);
  const projectedY = y + project(velocityY);

  let sent: StackCardDirection | null = null;
  // Starting at one is the threshold itself: a direction has to reach the
  // whole reach before it is a candidate at all.
  let furthest = 1;
  for (let index = 0; index < allowed.length; index += 1) {
    const direction = allowed[index];
    if (!direction) continue;
    const sideways = direction === 'left' || direction === 'right';
    const reach = commitReach(sideways ? width : height, threshold);
    const travel =
      direction === 'left'
        ? -projectedX
        : direction === 'right'
          ? projectedX
          : direction === 'up'
            ? -projectedY
            : projectedY;
    // Compared on the raw ratio rather than on `directionProgress`, which is
    // capped at one: a straight fling and a nudge that barely qualifies would
    // otherwise tie, and the nudge would win on order.
    const ratio = travel / reach;
    if (ratio >= furthest) {
      furthest = ratio;
      sent = direction;
    }
  }
  return sent;
}

/** How far past its own edge a card is sent, as a multiple of the card. */
const EXIT_OVERSHOOT = 1.35;

/** How much of a diagonal a card keeps on its way out. */
const EXIT_CARRY = 1.4;

/**
 * Where a card is animated to on its way off.
 *
 * The off-axis is carried rather than zeroed, so a card thrown up and to the
 * right leaves up and to the right. Zeroing it straightens the throw out
 * mid-flight, which is the one moment the animation is most obviously not the
 * finger any more.
 */
export function exitTarget(
  direction: StackCardDirection,
  width: number,
  height: number,
  x: number,
  y: number
): { x: number; y: number } {
  'worklet';
  switch (direction) {
    case 'left':
      return { x: -width * EXIT_OVERSHOOT, y: y * EXIT_CARRY };
    case 'right':
      return { x: width * EXIT_OVERSHOOT, y: y * EXIT_CARRY };
    case 'up':
      return { x: x * EXIT_CARRY, y: -height * EXIT_OVERSHOOT };
    default:
      return { x: x * EXIT_CARRY, y: height * EXIT_OVERSHOOT };
  }
}

/**
 * Which way the card pivots, from where it was taken hold of.
 *
 * A card pulled by its top corner turns one way and one pulled by its bottom
 * corner turns the other, because that is what a piece of card on a table
 * does. Read once when the finger lands and held for the whole gesture: a
 * lever that changed sign mid-drag would flip the card over in the hand.
 */
export function lever(grabY: number, height: number): number {
  'worklet';
  if (height <= 0) return 1;
  return grabY <= height / 2 ? 1 : -1;
}

/**
 * The card's tilt, in degrees.
 *
 * Measured against half the card rather than all of it: a card commits at
 * roughly a third of its width, and scaled across the full width the tilt at
 * the moment of release would be a couple of degrees — present in the numbers
 * and invisible on the screen.
 */
export function tiltAngle(x: number, width: number, maxTilt: number, pivot: number): number {
  'worklet';
  if (width <= 0) return 0;
  const raw = (x / (width * 0.5)) * maxTilt * pivot;
  return Math.max(-maxTilt, Math.min(maxTilt, raw));
}

/**
 * Where a card sits in the pile, counting the top one as 0, once the drag on
 * the card in front of it is taken into account.
 *
 * This is what makes the pile continuous across a dismissal. By the time the
 * top card has been carried far enough to leave, the one behind it has already
 * arrived at the top position — so when it becomes the top card there is
 * nothing left to move.
 */
export function effectiveDepth(depth: number, release: number): number {
  'worklet';
  return Math.max(0, depth - release);
}

/**
 * How opaque a card at a given depth is drawn, where `visible` is how many the
 * pile shows behind its top card.
 *
 * One more card is kept than the pile shows, and this is what fades it in: one
 * place further back than the pile goes it is invisible, and it reaches full
 * strength exactly as it takes the last visible place. Without it a card
 * appears out of nothing at the bottom of the pile every time one leaves the
 * top.
 */
export function depthOpacity(depth: number, visible: number): number {
  'worklet';
  return Math.min(1, Math.max(0, visible + 1 - depth));
}
