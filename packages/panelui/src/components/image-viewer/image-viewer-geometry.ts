/**
 * The arithmetic behind the image viewer, kept apart from the component.
 *
 * Every function here runs on the UI thread inside a gesture or an animated
 * style, so each is a worklet. None of them touches React Native, which is what
 * lets the contract tests run them in Node.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Size {
  x: number;
  y: number;
}

/** How much a rubber-banded overshoot gives. Lower is stiffer. */
export const RUBBER_BAND = 0.55;

export function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

export function lerp(from: number, to: number, t: number): number {
  'worklet';
  return from + (to - from) * t;
}

export function lerpRect(from: Rect, to: Rect, t: number): Rect {
  'worklet';
  return {
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    width: lerp(from.width, to.width, t),
    height: lerp(from.height, to.height, t),
  };
}

/**
 * The largest rect with the image's proportions that fits inside the box,
 * centred in it. An image with no known size fills the box.
 */
export function fitContain(image: Size, box: Size): Rect {
  'worklet';
  if (image.width <= 0 || image.height <= 0) {
    return { x: 0, y: 0, width: box.width, height: box.height };
  }
  const scale = Math.min(box.width / image.width, box.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  return { x: (box.width - width) / 2, y: (box.height - height) / 2, width, height };
}

/** `fitContain` inside a rect that does not start at the origin. */
export function fitWithin(image: Size, box: Rect): Rect {
  'worklet';
  const fitted = fitContain(image, box);
  return { ...fitted, x: box.x + fitted.x, y: box.y + fitted.y };
}

/**
 * The smallest size with the image's proportions that covers the frame.
 *
 * A thumbnail crops its picture to its box; the viewer shows the whole of it.
 * Drawing the image at this size inside a frame that grows from one to the
 * other is what makes the crop open out instead of the picture jumping.
 */
export function coverSize(image: Size, frame: Size): Size {
  'worklet';
  if (image.width <= 0 || image.height <= 0) {
    return { width: frame.width, height: frame.height };
  }
  const scale = Math.max(frame.width / image.width, frame.height / image.height);
  return { width: image.width * scale, height: image.height * scale };
}

/**
 * How far past its limit a value is allowed to travel, given how far it was
 * pushed. The resistance grows with the push and never quite reaches `dimension`.
 */
export function rubberBand(overshoot: number, dimension: number, coefficient?: number): number {
  'worklet';
  if (dimension <= 0) return 0;
  const give = coefficient ?? RUBBER_BAND;
  return (1 - 1 / ((overshoot * give) / dimension + 1)) * dimension;
}

/** Clamps to `[min, max]`, letting the value stretch past either end with resistance. */
export function rubberBandClamp(
  value: number,
  min: number,
  max: number,
  dimension: number,
  coefficient?: number
): number {
  'worklet';
  const clamped = clamp(value, min, max);
  const overshoot = Math.abs(value - clamped);
  if (overshoot === 0) return clamped;
  const sign = value < clamped ? -1 : 1;
  return clamped + sign * rubberBand(overshoot, dimension, coefficient);
}

/**
 * How far a zoomed image may be moved along one axis before its edge comes away
 * from the screen's. Zero while the scaled image is smaller than the screen,
 * which keeps it centred on that axis.
 */
export function panBound(fitted: number, scale: number, viewport: number): number {
  'worklet';
  return Math.max(0, (fitted * scale - viewport) / 2);
}

/**
 * The translation that keeps a point under the fingers while the scale changes.
 *
 * `offset` is where that point sat relative to the image's centre when the
 * pinch began, at `fromScale`; `focal` is the fingers' position now, relative
 * to the screen's centre. The result is measured from the screen's centre too.
 */
export function focalTranslation(
  focal: number,
  offset: number,
  fromScale: number,
  toScale: number
): number {
  'worklet';
  if (fromScale === 0) return focal;
  return focal - offset * (toScale / fromScale);
}

/**
 * The page a released pager settles on. Where it would have coasted to decides
 * it rather than where it was let go, so a short flick still turns the page —
 * but never by more than one, which is what a flick means.
 */
export function snapPage(
  offset: number,
  velocity: number,
  current: number,
  count: number,
  pageWidth: number
): number {
  'worklet';
  if (count <= 1 || pageWidth <= 0) return 0;
  const projected = -(offset + velocity * 0.25) / pageWidth;
  const target = Math.round(projected);
  return clamp(clamp(target, current - 1, current + 1), 0, count - 1);
}

/** How far a drag has to travel, counting where it was flung, to close the viewer. */
export const DISMISS_DISTANCE = 110;

/**
 * Whether a released drag closes the viewer.
 *
 * Measured on where the image was heading rather than where it was dropped, so
 * a quick flick closes it from a short distance and a slow drag that is let go
 * of carefully does not. A throw back towards the centre cancels.
 */
export function shouldDismiss(translation: number, velocity: number): boolean {
  'worklet';
  const projected = translation + velocity * 0.2;
  if (Math.abs(projected) <= DISMISS_DISTANCE) return false;
  return translation === 0 || Math.sign(projected) === Math.sign(translation);
}

/**
 * How much of the backdrop is left while the image is dragged away from the
 * centre. It is mostly gone by the time the drag would close the viewer, so the
 * page coming back into focus is the warning that letting go will close it.
 */
export function dragFade(distance: number, viewport: number): number {
  'worklet';
  if (viewport <= 0) return 1;
  return 1 - clamp(Math.abs(distance) / (viewport * 0.4), 0, 1) * 0.85;
}

/** How small the image gets while it is dragged. Never below 0.8 of its size. */
export function dragScale(distance: number, viewport: number): number {
  'worklet';
  if (viewport <= 0) return 1;
  return 1 - clamp(Math.abs(distance) / viewport, 0, 1) * 0.2;
}

/** Whether a point lands on a rect that has been scaled about its centre and moved. */
export function hitsRect(
  px: number,
  py: number,
  rect: Rect,
  scale: number,
  tx: number,
  ty: number
): boolean {
  'worklet';
  const cx = rect.x + rect.width / 2 + tx;
  const cy = rect.y + rect.height / 2 + ty;
  return (
    Math.abs(px - cx) <= (rect.width * scale) / 2 &&
    Math.abs(py - cy) <= (rect.height * scale) / 2
  );
}
