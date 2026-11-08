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

/**
 * What the rail needs to know about one row to move focus and the pill.
 *
 * The component reads these off the DOM; keeping the shape here is what makes
 * "which rows are reachable" and "where does the pill go" testable without a
 * browser.
 */
export interface RailRowState {
  /** It is the destination the reader is on. */
  active: boolean;
  /** It cannot be chosen, and the arrow keys step over it. */
  disabled: boolean;
  /** It is not drawn: inside a closed sub-list, or in a folded flyout that is away. */
  hidden: boolean;
  /** It owns a child list. */
  branch: boolean;
  /** Its child list is open. */
  expanded: boolean;
  /** One of its children is the active destination. */
  childActive: boolean;
  /** It sits inside a child list rather than at the top of the rail. */
  nested: boolean;
}

/** The indexes of the rows that are drawn, in the order they are read. */
export function visibleIndexes(rows: readonly RailRowState[]): number[] {
  return rows.flatMap((row, index) => (row.hidden ? [] : [index]));
}

/**
 * The row focus should move to, or `null` when there is nowhere to go.
 *
 * Hidden rows are left out entirely: a child in a closed sub-list is not a
 * place the arrow keys can reach, and Home and End land on the first and last
 * row that is actually on screen. The wrapping and disabled-row rules are the
 * same ones the rail uses everywhere else, applied to what is visible.
 */
export function rovingRow(
  key: string,
  current: number,
  rows: readonly RailRowState[]
): number | null {
  const visible = visibleIndexes(rows);
  if (visible.length === 0) return null;
  const next = rovingIndex(
    key,
    visible.indexOf(current),
    visible.map((index) => rows[index]!.disabled)
  );
  return next === null ? null : visible[next]!;
}

/**
 * Where the one pill is drawn.
 *
 * A visible active row wins. When the only active destination is a child in a
 * closed list, its parent holds the pill instead: the reader still sees where
 * they are on the rail rather than losing the marker with the label. The
 * parent is a fallback, not a theft — as soon as the child is drawn it takes
 * the pill back.
 */
export function activeRowIndex(rows: readonly RailRowState[]): number | null {
  const direct = rows.findIndex((row) => row.active && !row.hidden);
  if (direct >= 0) return direct;
  const parent = rows.findIndex((row) => row.childActive && !row.hidden);
  return parent >= 0 ? parent : null;
}

/** What a movement key asks of a parent row and its child list. */
export type SubKeyAction = 'open' | 'enter' | 'close';

/**
 * The action a key takes on a row that owns a child list, or `null`.
 *
 * Right opens a closed list and steps into an open one, Left closes the list a
 * row sits in (and a parent's own list), and Escape closes either. The rail
 * only answers these keys when the row has something for them to act on, so
 * Left on a plain destination is left to the browser.
 */
export function subKeyAction(
  key: string,
  row: Pick<RailRowState, 'branch' | 'expanded' | 'nested'>
): SubKeyAction | null {
  if (key === 'ArrowRight') {
    if (!row.branch) return null;
    return row.expanded ? 'enter' : 'open';
  }
  if (key === 'ArrowLeft') {
    if (row.nested) return 'close';
    if (row.branch && row.expanded) return 'close';
    return null;
  }
  if (key === 'Escape') {
    return row.nested || row.branch ? 'close' : null;
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
