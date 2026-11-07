/**
 * The arithmetic behind the rail, kept out of the component so it can be read
 * and tested on its own: where the one active pill sits, how wide the rail is,
 * and which row the arrow keys go to next.
 *
 * None of this touches a DOM node. A caller reads the boxes it already has and
 * hands over the numbers, which is what makes the behaviour testable without a
 * browser and keeps the layout effect in the component to measuring alone.
 */

/** A box in viewport coordinates, as `getBoundingClientRect` reports one. */
export interface RailRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Where the indicator is drawn, in the scrolling content of the rail. */
export interface IndicatorBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RailScroll {
  x: number;
  y: number;
}

/**
 * Places the indicator over a row.
 *
 * The difference between the two boxes is in viewport coordinates, so the
 * rail's own scroll is added back: the indicator is an absolutely positioned
 * child of the scroller and has to travel with the rows it sits over rather
 * than stay pinned to the visible edge.
 */
export function indicatorBox(
  rail: RailRect,
  item: RailRect,
  scroll: RailScroll = { x: 0, y: 0 }
): IndicatorBox {
  return {
    x: item.left - rail.left + scroll.x,
    y: item.top - rail.top + scroll.y,
    width: Math.max(item.width, 0),
    height: Math.max(item.height, 0),
  };
}

/** A width written either as pixels or as any CSS length. */
export type RailWidth = number | string;

/** The rail's width, with a number read as pixels. */
export function railWidth(collapsed: boolean, expanded: RailWidth, closed: RailWidth): string {
  const value = collapsed ? closed : expanded;
  return typeof value === 'number' ? `${Math.max(value, 0)}px` : value;
}

export type RovingKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End';

/** Whether a key is one the rail answers with focus movement. */
export function isRovingKey(key: string): key is RovingKey {
  return key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End';
}

/**
 * The row focus should move to, or `null` when the key is not ours.
 *
 * Disabled rows are stepped over rather than landed on, and the two arrows
 * wrap at the ends: a rail is a closed loop of destinations, so continuing past
 * the last one is less surprising than stopping dead. Home and End look inward
 * from the ends so a disabled first or last row does not swallow the jump.
 */
export function rovingIndex(key: string, current: number, disabled: readonly boolean[]): number | null {
  const count = disabled.length;
  if (count === 0) return null;
  const enabled = (index: number) => disabled[index] !== true;
  const inside = current >= 0 && current < count;

  if (key === 'Home' || key === 'End') {
    const step = key === 'Home' ? 1 : -1;
    let index = key === 'Home' ? 0 : count - 1;
    for (let moves = 0; moves < count; moves += 1) {
      if (enabled(index)) return index;
      index += step;
    }
    return null;
  }

  if (key !== 'ArrowDown' && key !== 'ArrowUp') return null;
  const step = key === 'ArrowDown' ? 1 : -1;
  let index = inside ? current : step > 0 ? -1 : count;
  for (let moves = 0; moves < count; moves += 1) {
    index = (index + step + count) % count;
    if (enabled(index)) return index;
  }
  return null;
}

/** The text of a node when it is only text, for a name that has to survive collapsing. */
export function textOf(node: unknown): string | undefined {
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint') {
    const text = String(node).trim();
    return text.length > 0 ? text : undefined;
  }
  if (Array.isArray(node)) {
    const text = node
      .map((part) => textOf(part))
      .filter((part): part is string => part !== undefined)
      .join(' ')
      .trim();
    return text.length > 0 ? text : undefined;
  }
  return undefined;
}
