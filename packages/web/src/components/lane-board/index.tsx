'use client';

/**
 * LaneBoard — lanes side by side, each holding cards that can be dragged
 * within a lane and from one lane to another.
 *
 * ```tsx
 * <LaneBoard
 *   lanes={lanes}
 *   onLanesChange={setLanes}
 *   renderCard={(card) => (
 *     <>
 *       <LaneBoard.Title>{card.title}</LaneBoard.Title>
 *       <LaneBoard.Code>{card.code}</LaneBoard.Code>
 *     </>
 *   )}
 * />
 * ```
 *
 * ## The data is yours
 *
 * The board is given the lanes and their cards and says what they should
 * become. It keeps nothing you did not give it, so the order on screen is the
 * order in your state, and a move can be refused by not applying it.
 *
 * ## A card is carried, and the rest make room
 *
 * A dragged card is lifted off the board and follows the pointer. Where it
 * came from closes up, and a gap opens where it would land if it were let go
 * now, with the cards round it sliding to their new places. Nothing is
 * decided until the pointer is released, and Escape puts everything back.
 *
 * ## The board has a height
 *
 * The board is a fixed height and every lane fills it. A lane with more cards
 * than fit scrolls on its own, so a card added to a long lane moves nothing
 * else on the page. Pass `height="auto"` for a board that grows with its
 * longest lane.
 *
 * ## It works without a pointer
 *
 * Space or Enter on a card picks it up. The arrow keys then move it, up and
 * down within its lane and left and right between lanes. Space or Enter sets
 * it down, Escape puts it back, and each step is said to a screen reader.
 */
import { ScrollArea } from '@base-ui/react/scroll-area';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

/** Which of the theme's roles a part is drawn in. */
export type LaneBoardColor = 'primary' | 'info' | 'success' | 'warning' | 'destructive';

/** A card is anything with an id that is its own across the whole board. */
export interface LaneBoardCard {
  id: string;
}

export interface LaneBoardLane<T extends LaneBoardCard = LaneBoardCard> {
  id: string;
  /** Written at the head of the lane. */
  title: ReactNode;
  cards: T[];
  /** One of the theme's roles, drawn as a dot before the title. */
  color?: LaneBoardColor;
  /**
   * How many cards the lane is meant to hold. The count is written against
   * it, and drawn as a warning once the lane holds more. It is advice: the
   * board does not refuse a card. Do that in `onLanesChange`.
   */
  limit?: number;
}

/** One card going from one place to another. */
export interface LaneBoardMove<T extends LaneBoardCard = LaneBoardCard> {
  card: T;
  from: { lane: string; index: number };
  to: { lane: string; index: number };
}

const laneBoardVariants = tv({
  slots: {
    root: 'relative w-full',
    board: 'size-full',
    // Lanes share the width when there is room and scroll sideways, one lane
    // at a time, when there is not. Room is made under them for the bar only
    // when there is something to scroll.
    boardViewport: 'size-full snap-x outline-none data-has-overflow-x:pb-3',
    lanes: 'flex h-full gap-3',
    /*
     * The border is the lane's own, inside its box, and not a ring round it:
     * the board clips what is drawn outside a lane, and a ring would lose its
     * top edge to that.
     */
    lane: 'flex min-h-0 min-w-50 flex-1 shrink-0 snap-start flex-col rounded-3xl border bg-muted py-2 transition-colors duration-200',
    laneHeader: 'flex items-center justify-between gap-3 px-4.5 pb-1.5 pt-1.5 text-sm',
    laneScroller: 'min-h-0 flex-1',
    /*
     * Padded on every side, so a card's focus ring and shadow have room and
     * are not cut by the edge they scroll under. Where cards carry on past an
     * edge, they fade out towards it.
     */
    laneViewport:
      'h-full px-2 py-0.5 outline-none data-has-overflow-y:overscroll-y-contain data-has-overflow-y:[mask-image:linear-gradient(to_bottom,transparent,black_min(1.25rem,var(--scroll-area-overflow-y-start)),black_calc(100%-min(1.25rem,var(--scroll-area-overflow-y-end))),transparent)]',
    laneFooter: 'flex flex-col px-2 pt-1.5 empty:hidden',
    // A drawn bar, thin and rounded, that shows while the pointer is on the
    // lane or it is being scrolled.
    scrollbar:
      'flex opacity-0 transition-opacity delay-300 data-hovering:opacity-100 data-hovering:delay-0 data-hovering:duration-100 data-scrolling:opacity-100 data-scrolling:delay-0 data-scrolling:duration-100 data-[orientation=horizontal]:mx-3 data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:flex-col data-[orientation=vertical]:my-1 data-[orientation=vertical]:me-px data-[orientation=vertical]:w-1.5',
    thumb: 'relative flex-1 rounded-full bg-foreground/20',
    laneHeading: 'flex min-w-0 items-center gap-2',
    laneDot: 'size-2 shrink-0 rounded-full bg-[var(--pu-color)]',
    laneTitle: 'truncate font-medium text-muted-foreground',
    laneCount: 'tabular-nums text-muted-foreground',
    // Tall enough when empty to be somewhere a card can be dropped.
    list: 'flex min-h-20 flex-col gap-2',
    card: 'flex cursor-grab touch-manipulation select-none flex-col gap-1 rounded-2xl border bg-card p-4 text-card-foreground shadow-xs outline-none transition-shadow duration-150 focus-visible:ring-2 focus-visible:ring-ring',
    overlay:
      'pointer-events-none fixed left-0 top-0 z-50 flex rotate-2 cursor-grabbing flex-col gap-1 rounded-2xl border bg-card p-4 text-card-foreground shadow-xl',
    title: 'truncate text-base font-semibold',
    code: 'truncate font-mono text-sm text-muted-foreground',
    row: 'mt-2 flex items-center justify-between gap-3',
    steps: 'flex items-center gap-1',
    step: 'h-1 w-4 rounded-full',
    tag: 'inline-flex items-center rounded-full border border-[color-mix(in_oklab,var(--pu-color)_35%,var(--card))] bg-[color-mix(in_oklab,var(--pu-color)_14%,transparent)] px-2 py-0.5 text-xs font-medium text-[var(--pu-color)]',
    meta: 'font-mono text-sm tabular-nums text-foreground',
    avatar:
      'flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[0.625rem] font-semibold text-muted-foreground',
  },
  variants: {
    color: {
      primary: {
        steps: '[--pu-color:var(--primary)]',
        tag: '[--pu-color:var(--primary)]',
        laneDot: '[--pu-color:var(--primary)]',
      },
      info: {
        steps: '[--pu-color:var(--info)]',
        tag: '[--pu-color:var(--info)]',
        laneDot: '[--pu-color:var(--info)]',
      },
      success: {
        steps: '[--pu-color:var(--success)]',
        tag: '[--pu-color:var(--success)]',
        laneDot: '[--pu-color:var(--success)]',
      },
      warning: {
        steps: '[--pu-color:var(--warning)]',
        tag: '[--pu-color:var(--warning)]',
        laneDot: '[--pu-color:var(--warning)]',
      },
      destructive: {
        steps: '[--pu-color:var(--destructive)]',
        tag: '[--pu-color:var(--destructive)]',
        laneDot: '[--pu-color:var(--destructive)]',
      },
    },
    // The lane a carried card is over: a firmer edge and a deeper tray.
    over: { true: { lane: 'border-ring/70 bg-foreground/8' } },
    // A lane holding more than its limit says so in its count.
    full: { true: { laneCount: 'font-medium text-[var(--warning)]' } },
    state: {
      rest: {},
      // Where a carried card would land: its room is kept and outlined, and
      // what is on it is not drawn.
      placeholder: { card: 'border-dashed border-ring/70 bg-transparent shadow-none *:invisible' },
      // Picked up with the keyboard: it stays where it is and is ringed.
      held: { card: 'cursor-grabbing shadow-lg ring-2 ring-ring' },
    },
    lit: {
      true: { step: 'bg-[var(--pu-color)]' },
      false: { step: 'bg-muted-foreground/20' },
    },
  },
  defaultVariants: { color: 'primary', state: 'rest' },
});

/** How far a mouse has to move before a press becomes a drag, in pixels. */
const SLOP = 4;
/** How long a finger has to rest on a card before it is picked up, in milliseconds. */
const HOLD = 220;
/** How near an edge of the board the pointer has to be for it to scroll, in pixels. */
const EDGE = 48;

/** Where something is laid out, measured from the board through whatever it is nested in. */
function placeIn(node: HTMLElement, board: HTMLElement) {
  let x = 0;
  let y = 0;
  let at: HTMLElement | null = node;
  while (at && at !== board) {
    x += at.offsetLeft;
    y += at.offsetTop;
    at = at.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The lanes with one card taken out and put somewhere else. */
function moved<T extends LaneBoardCard>(
  lanes: LaneBoardLane<T>[],
  id: string,
  toLane: string,
  toIndex: number
): LaneBoardLane<T>[] {
  let card: T | undefined;
  const without = lanes.map((lane) => {
    const found = lane.cards.find((entry) => entry.id === id);
    if (!found) return lane;
    card = found;
    return { ...lane, cards: lane.cards.filter((entry) => entry.id !== id) };
  });
  if (!card) return lanes;
  const carried = card;
  return without.map((lane) => {
    if (lane.id !== toLane) return lane;
    const cards = [...lane.cards];
    cards.splice(Math.min(Math.max(0, toIndex), cards.length), 0, carried);
    return { ...lane, cards };
  });
}

function whereIs<T extends LaneBoardCard>(lanes: LaneBoardLane<T>[], id: string) {
  for (const lane of lanes) {
    const index = lane.cards.findIndex((card) => card.id === id);
    if (index >= 0) return { lane: lane.id, index, card: lane.cards[index] as T };
  }
  return null;
}

export interface LaneBoardProps<T extends LaneBoardCard> extends Omit<ComponentProps<'div'>, 'children' | 'onChange'> {
  /** The lanes and their cards, when the caller holds them. */
  lanes?: LaneBoardLane<T>[];
  /** The lanes to begin with, when the caller does not hold them. */
  defaultLanes?: LaneBoardLane<T>[];
  /** Called with the lanes as they should now be, when a card is set down somewhere new. */
  onLanesChange?: (lanes: LaneBoardLane<T>[]) => void;
  /** Called with the one card that moved, and where from and to. */
  onMove?: (move: LaneBoardMove<T>) => void;
  /** Draws the inside of a card. */
  renderCard: (card: T, state: { lane: LaneBoardLane<T>; carried: boolean }) => ReactNode;
  /** Draws something under a lane's cards, such as a button that adds one. */
  renderLaneFooter?: (lane: LaneBoardLane<T>) => ReactNode;
  /** What a screen reader calls a card, where its id would not mean much. */
  cardName?: (card: T) => string;
  /** What a screen reader calls the board. */
  label?: string;
  /**
   * How tall the board is: a number of pixels, or any CSS length. Lanes fill
   * it, and one with more cards than fit scrolls. `'auto'` lets the board
   * grow with its longest lane.
   */
  height?: number | string;
}

function LaneBoardRoot<T extends LaneBoardCard>({
  lanes: controlled,
  defaultLanes,
  onLanesChange,
  onMove,
  renderCard,
  renderLaneFooter,
  cardName = (card) => card.id,
  label = 'Board',
  height = '28rem',
  className,
  style,
  render,
  ...props
}: LaneBoardProps<T> & RenderProp<'div'>) {
  const slots = laneBoardVariants();
  const [internal, setInternal] = useState<LaneBoardLane<T>[]>(defaultLanes ?? []);
  const settled = controlled ?? internal;

  /** The lanes as they would be if the carried card were set down now. */
  const [draft, setDraft] = useState<LaneBoardLane<T>[] | null>(null);
  /** The card being carried, and whether by the pointer or the keyboard. */
  const [carry, setCarry] = useState<{ id: string; by: 'pointer' | 'keys' } | null>(null);
  const [said, setSaid] = useState('');
  const shown = draft ?? settled;

  const root = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const cards = useRef(new Map<string, HTMLElement>());
  /** The board's own scroller, which moves sideways. */
  const scroller = useRef<HTMLDivElement>(null);
  const sections = useRef(new Map<string, HTMLElement>());
  /** Each lane's scroller, which moves up and down. */
  const viewports = useRef(new Map<string, HTMLElement>());
  const places = useRef(new Map<string, { x: number; y: number; height: number; lane: string }>());
  /** Everything about a pointer drag that changes too often to be state. */
  const drag = useRef<{
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    grabX: number;
    grabY: number;
    x: number;
    y: number;
    width: number;
    started: boolean;
    timer: number;
    frame: number;
  } | null>(null);
  const latest = useRef({ settled, draft });
  latest.current = { settled, draft };

  const commit = useCallback(
    (next: LaneBoardLane<T>[], id: string) => {
      const from = whereIs(latest.current.settled, id);
      const to = whereIs(next, id);
      if (!from || !to) return;
      if (from.lane === to.lane && from.index === to.index) return;
      if (controlled === undefined) setInternal(next);
      onLanesChange?.(next);
      onMove?.({
        card: from.card,
        from: { lane: from.lane, index: from.index },
        to: { lane: to.lane, index: to.index },
      });
    },
    [controlled, onLanesChange, onMove]
  );

  /*
   * Cards slide to where they now belong. Each card's place is remembered from
   * one drawing to the next; a card found somewhere else in its lane is
   * started from where it was and let go. Places are where a card is laid
   * out, so scrolling the page, the board or a lane between two drawings
   * moves nothing. A card that has changed lanes is not slid: each lane clips
   * its own cards, and it would be seen coming in through the lane's side.
   */
  useLayoutEffect(() => {
    const board = root.current;
    if (!board) return;
    const still = reducedMotion();
    const laneOf = new Map<string, string>();
    for (const lane of shown) for (const card of lane.cards) laneOf.set(card.id, lane.id);
    const next = new Map<string, { x: number; y: number; height: number; lane: string }>();
    cards.current.forEach((node, id) => {
      // Where the card is laid out, measured from the board. Not its box on
      // the page: a card that is still sliding has a box that is on its way,
      // and what is wanted here is where it is going.
      const place = {
        ...placeIn(node, board),
        height: node.offsetHeight,
        lane: laneOf.get(id) ?? '',
      };
      next.set(id, place);
      const before = places.current.get(id);
      if (!before || still || before.lane !== place.lane) return;
      const dx = before.x - place.x;
      const dy = before.y - place.y;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      node.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], {
        duration: 220,
        easing: 'cubic-bezier(0.2, 0, 0, 1)',
      });
    });
    places.current = next;
  });

  /*
   * Only for a board left to grow, with `height="auto"`. It is then as tall
   * as its tallest lane, and which lane that is changes as cards move. Left
   * to follow, the board would grow and shrink under the pointer in the
   * middle of a drag, and again when the card is set down. So it keeps the
   * greatest height it has had, and only ever grows.
   */
  const tallest = useRef(0);
  useLayoutEffect(() => {
    const lanes = [...sections.current.values()];
    for (const lane of lanes) lane.style.minHeight = '';
    if (height !== 'auto') {
      tallest.current = 0;
      return;
    }
    const natural = Math.max(0, ...lanes.map((lane) => lane.offsetHeight));
    // Only what has been set down counts. A card carried across a full lane
    // makes it taller for a moment, and that is not a height to keep.
    if (!carry) tallest.current = Math.max(tallest.current, natural);
    const keep = Math.max(tallest.current, natural);
    for (const lane of lanes) lane.style.minHeight = `${keep}px`;
  });

  /*
   * Brings a card's place into view: its lane across the board, and the card
   * down its lane. Worked out from where things are laid out, since a card
   * that has just moved is still drawn on its way there.
   */
  const reveal = (id: string) => {
    const board = root.current;
    const spot = places.current.get(id);
    if (!board || !spot) return;
    const across = scroller.current;
    const section = sections.current.get(spot.lane);
    if (across && section) {
      const before = placeIn(section, board).x - across.scrollLeft;
      const after = before + section.offsetWidth - across.clientWidth;
      if (before < 0) across.scrollLeft += before;
      else if (after > 0) across.scrollLeft += after;
    }
    const lane = viewports.current.get(spot.lane);
    if (lane) {
      // A little clear of the edge, where cards fade out.
      const above = spot.y - placeIn(lane, board).y - lane.scrollTop - 8;
      const below = above + spot.height + 16 - lane.clientHeight;
      if (above < 0) lane.scrollTop += above;
      else if (below > 0) lane.scrollTop += below;
    }
  };

  /* ------------------------------------------------------------------ */
  /* Carrying with the pointer                                           */
  /* ------------------------------------------------------------------ */

  /** Which lane, and where in it, the carried card is over. */
  const target = (x: number, y: number, id: string) => {
    let lane: string | null = null;
    let nearest = Infinity;
    sections.current.forEach((node, laneId) => {
      const box = node.getBoundingClientRect();
      const distance = x < box.left ? box.left - x : x > box.right ? x - box.right : 0;
      if (distance < nearest) {
        nearest = distance;
        lane = laneId;
      }
    });
    if (lane === null) return null;
    const over = (latest.current.draft ?? latest.current.settled).find((entry) => entry.id === lane);
    /*
     * Measured against where each card belongs, as last laid out, and not
     * where it is drawn. Cards slide to their places, and a card read half
     * way through its slide can be on the wrong side of the pointer, which
     * moves the gap, which slides the card back: a flicker with no end.
     * A place is where a card is laid out, so how far its lane has been
     * scrolled is taken off the pointer and not off the card.
     */
    const top = root.current?.getBoundingClientRect().top ?? 0;
    const scrolled = viewports.current.get(lane)?.scrollTop ?? 0;
    let index = 0;
    for (const card of over?.cards ?? []) {
      if (card.id === id) continue;
      const place = places.current.get(card.id);
      if (place && y - top + scrolled > place.y + place.height / 2) index += 1;
    }
    return { lane: lane as string, index };
  };

  const place = () => {
    const state = drag.current;
    const node = overlay.current;
    if (!state || !node) return;
    node.style.translate = `${state.x - state.grabX}px ${state.y - state.grabY}px`;
  };

  const follow = () => {
    const state = drag.current;
    if (!state?.started) return;
    const over = target(state.x, state.y, state.id);
    if (over) {
      const now = whereIs(latest.current.draft ?? latest.current.settled, state.id);
      if (!now || now.lane !== over.lane || now.index !== over.index) {
        setDraft(moved(latest.current.settled, state.id, over.lane, over.index));
      }
    }
    // Near either end of the board, it scrolls towards that end.
    const board = scroller.current;
    if (board) {
      const box = board.getBoundingClientRect();
      if (state.x < box.left + EDGE) board.scrollLeft -= 10;
      else if (state.x > box.right - EDGE) board.scrollLeft += 10;
    }
    // And near the top or bottom of the lane it is over, that lane scrolls.
    const lane = over ? viewports.current.get(over.lane) : undefined;
    if (lane) {
      const box = lane.getBoundingClientRect();
      if (state.y < box.top + EDGE) lane.scrollTop -= 8;
      else if (state.y > box.bottom - EDGE) lane.scrollTop += 8;
    }
    state.frame = requestAnimationFrame(follow);
  };

  const begin = () => {
    const state = drag.current;
    if (!state || state.started) return;
    state.started = true;
    setDraft(latest.current.settled);
    setCarry({ id: state.id, by: 'pointer' });
    state.frame = requestAnimationFrame(follow);
  };

  const end = (drop: boolean) => {
    const state = drag.current;
    if (!state) return;
    window.clearTimeout(state.timer);
    cancelAnimationFrame(state.frame);
    drag.current = null;
    if (!state.started) return;
    const next = latest.current.draft;
    // Put back, the gap goes home first, so there is somewhere to fly to.
    if (!drop) setDraft(latest.current.settled);

    const finish = () => {
      if (drop && next) commit(next, state.id);
      setDraft(null);
      setCarry(null);
    };
    /*
     * The lifted card flies the last of the way into the gap that is waiting
     * for it, and only then is the real card shown. Dropped where the pointer
     * let go, it would vanish from one place and appear in another.
     */
    requestAnimationFrame(() => {
      const lifted = overlay.current;
      const board = root.current;
      const slot = places.current.get(state.id);
      if (!lifted || !board || !slot || reducedMotion()) return finish();
      // The gap may have been left under an edge of its lane. It is brought
      // into view first, so the card flies to somewhere that can be seen.
      reveal(state.id);
      const lane = viewports.current.get(slot.lane);
      const box = board.getBoundingClientRect();
      const left = box.left + slot.x - (scroller.current?.scrollLeft ?? 0);
      const top = box.top + slot.y - (lane?.scrollTop ?? 0);
      const flight = lifted.animate(
        [
          { translate: lifted.style.translate, rotate: '2deg' },
          { translate: `${left}px ${top}px`, rotate: '0deg' },
        ],
        { duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards' }
      );
      flight.finished.then(finish, finish);
    });
  };

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const state = drag.current;
      if (!state || event.pointerId !== state.pointerId) return;
      state.x = event.clientX;
      state.y = event.clientY;
      if (!state.started) {
        const travel = Math.hypot(state.x - state.startX, state.y - state.startY);
        // A finger that moves before the hold is up is scrolling, not lifting.
        if (event.pointerType === 'touch') {
          if (travel > SLOP * 2) end(false);
          return;
        }
        if (travel > SLOP) begin();
        return;
      }
      place();
    };
    const onUp = (event: PointerEvent) => {
      if (drag.current && event.pointerId === drag.current.pointerId) end(true);
    };
    const onCancel = () => end(false);
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && drag.current?.started) end(false);
    };
    // A carried card must not also scroll the page under the finger.
    const onTouch = (event: TouchEvent) => {
      if (drag.current?.started) event.preventDefault();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchmove', onTouch, { passive: false });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchmove', onTouch);
      end(false);
    };
    // The handlers read everything through refs, so they are set up once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The lifted card is put under the pointer as soon as it exists.
  useLayoutEffect(() => {
    if (carry?.by === 'pointer') place();
  });

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>, id: string) => {
    if (event.button !== 0 || carry) return;
    // A button or a link inside a card is pressed, not dragged by.
    if ((event.target as HTMLElement).closest('button, a, input, textarea, select, [data-no-drag]')) {
      return;
    }
    const box = event.currentTarget.getBoundingClientRect();
    drag.current = {
      id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      grabX: event.clientX - box.left,
      grabY: event.clientY - box.top,
      x: event.clientX,
      y: event.clientY,
      width: box.width,
      started: false,
      timer: event.pointerType === 'touch' ? window.setTimeout(begin, HOLD) : 0,
      frame: 0,
    };
  };

  /* ------------------------------------------------------------------ */
  /* Carrying with the keyboard                                          */
  /* ------------------------------------------------------------------ */

  const say = (card: T, lanes: LaneBoardLane<T>[], lead: string) => {
    const at = whereIs(lanes, card.id);
    const lane = lanes.find((entry) => entry.id === at?.lane);
    if (!at || !lane) return;
    const name = typeof lane.title === 'string' ? lane.title : lane.id;
    setSaid(`${lead} ${cardName(card)}: ${name}, place ${at.index + 1} of ${lane.cards.length}.`);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>, card: T) => {
    if (event.target !== event.currentTarget) return;
    const held = carry?.by === 'keys' && carry.id === card.id;

    if (!held) {
      if (carry || (event.key !== ' ' && event.key !== 'Enter')) return;
      event.preventDefault();
      setDraft(settled);
      setCarry({ id: card.id, by: 'keys' });
      setSaid(`Picked up ${cardName(card)}. Arrow keys move it, Space sets it down, Escape puts it back.`);
      return;
    }

    const lanes = draft ?? settled;
    const at = whereIs(lanes, card.id);
    if (!at) return;
    const laneAt = lanes.findIndex((lane) => lane.id === at.lane);
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      commit(lanes, card.id);
      say(card, lanes, 'Set down');
      setDraft(null);
      setCarry(null);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setDraft(null);
      setCarry(null);
      setSaid(`Put ${cardName(card)} back.`);
      return;
    }

    let next: LaneBoardLane<T>[] | null = null;
    if (event.key === 'ArrowUp') next = moved(lanes, card.id, at.lane, at.index - 1);
    else if (event.key === 'ArrowDown') next = moved(lanes, card.id, at.lane, at.index + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const step = (event.key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1);
      const other = lanes[laneAt + step];
      if (other) next = moved(lanes, card.id, other.id, at.index);
    }
    if (!next) return;
    event.preventDefault();
    setDraft(next);
    say(card, next, 'Moved');
  };

  // Moving to another lane redraws the card under a new parent, which would
  // drop the focus it is being steered by.
  // A move within a long lane can also take it under the lane's edge, where
  // focus alone would not bring it back.
  useLayoutEffect(() => {
    if (carry?.by !== 'keys') return;
    cards.current.get(carry.id)?.focus({ preventScroll: true });
    reveal(carry.id);
  });

  const carried = carry ? whereIs(shown, carry.id) : null;
  const carriedLane = carried ? shown.find((lane) => lane.id === carried.lane) : undefined;

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        ref: root,
        role: 'group',
        'aria-label': label,
        className: slots.root({ className }),
        style: { height: height === 'auto' ? undefined : height, ...style } as CSSProperties,
        children: (
          <>
            <ScrollArea.Root className={slots.board()}>
              <ScrollArea.Viewport ref={scroller} className={slots.boardViewport()}>
                <div className={slots.lanes()}>
                  {shown.map((lane) => (
                    <section
                      key={lane.id}
                      ref={(node) => {
                        if (node) sections.current.set(lane.id, node);
                        else sections.current.delete(lane.id);
                      }}
                      aria-label={typeof lane.title === 'string' ? lane.title : undefined}
                      data-over={carried?.lane === lane.id ? '' : undefined}
                      className={laneBoardVariants({ over: carried?.lane === lane.id }).lane()}
                    >
                      <header className={slots.laneHeader()}>
                        <div className={slots.laneHeading()}>
                          {lane.color ? (
                            <span aria-hidden="true" className={laneBoardVariants({ color: lane.color }).laneDot()} />
                          ) : null}
                          <h3 className={slots.laneTitle()}>{lane.title}</h3>
                        </div>
                        <span
                          className={laneBoardVariants({
                            full: lane.limit !== undefined && lane.cards.length > lane.limit,
                          }).laneCount()}
                        >
                          {lane.limit === undefined ? lane.cards.length : `${lane.cards.length}/${lane.limit}`}
                        </span>
                      </header>
                      <ScrollArea.Root className={slots.laneScroller()}>
                        <ScrollArea.Viewport
                          ref={(node: HTMLDivElement | null) => {
                            if (node) viewports.current.set(lane.id, node);
                            else viewports.current.delete(lane.id);
                          }}
                          className={slots.laneViewport()}
                        >
                          <ol className={slots.list()}>
                            {lane.cards.map((card) => {
                              const isCarried = carry?.id === card.id;
                              const state = !isCarried ? 'rest' : carry.by === 'pointer' ? 'placeholder' : 'held';
                              return (
                                <li
                                  key={card.id}
                                  ref={(node) => {
                                    if (node) cards.current.set(card.id, node);
                                    else cards.current.delete(card.id);
                                  }}
                                  tabIndex={0}
                                  aria-roledescription="Card that can be moved"
                                  aria-label={cardName(card)}
                                  data-card={card.id}
                                  data-carried={isCarried ? carry.by : undefined}
                                  className={laneBoardVariants({ state }).card()}
                                  onPointerDown={(event) => onPointerDown(event, card.id)}
                                  onKeyDown={(event) => onKeyDown(event, card)}
                                  onBlur={() => {
                                    // Focus leaving a card held with the keyboard puts it
                                    // back: nothing is steering it any more.
                                    if (
                                      carry?.by === 'keys' &&
                                      carry.id === card.id &&
                                      !cards.current.get(card.id)?.matches(':focus')
                                    ) {
                                      requestAnimationFrame(() => {
                                        if (document.activeElement !== cards.current.get(card.id)) {
                                          setDraft(null);
                                          setCarry(null);
                                        }
                                      });
                                    }
                                  }}
                                >
                                  {renderCard(card, { lane, carried: isCarried })}
                                </li>
                              );
                            })}
                          </ol>
                        </ScrollArea.Viewport>
                        <ScrollArea.Scrollbar orientation="vertical" className={slots.scrollbar()}>
                          <ScrollArea.Thumb className={slots.thumb()} />
                        </ScrollArea.Scrollbar>
                      </ScrollArea.Root>
                      <div className={slots.laneFooter()}>{renderLaneFooter?.(lane)}</div>
                    </section>
                  ))}
                </div>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar orientation="horizontal" className={slots.scrollbar()}>
                <ScrollArea.Thumb className={slots.thumb()} />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>

            {carry?.by === 'pointer' && carried && carriedLane ? (
              <div ref={overlay} aria-hidden="true" className={slots.overlay()} style={{ width: drag.current?.width }}>
                {renderCard(carried.card, { lane: carriedLane, carried: true })}
              </div>
            ) : null}

            <span aria-live="assertive" className="sr-only">
              {said}
            </span>
          </>
        ),
      },
      props
    ),
  });
}
LaneBoardRoot.displayName = 'LaneBoard';

/* -------------------------------------------------------------------------- */
/* What goes on a card                                                        */
/* -------------------------------------------------------------------------- */

export interface LaneBoardTitleProps extends ComponentProps<'div'> {}

/** A card's name. */
function LaneBoardTitle({ className, render, ...props }: LaneBoardTitleProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ className: laneBoardVariants().title({ className }) }, props),
  });
}
LaneBoardTitle.displayName = 'LaneBoard.Title';

export interface LaneBoardCodeProps extends ComponentProps<'div'> {}

/** A card's reference, in a fixed-width face so a column of them lines up. */
function LaneBoardCode({ className, render, ...props }: LaneBoardCodeProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ className: laneBoardVariants().code({ className }) }, props),
  });
}
LaneBoardCode.displayName = 'LaneBoard.Code';

export interface LaneBoardRowProps extends ComponentProps<'div'> {}

/** The last line of a card: something at each end. */
function LaneBoardRow({ className, render, ...props }: LaneBoardRowProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ className: laneBoardVariants().row({ className }) }, props),
  });
}
LaneBoardRow.displayName = 'LaneBoard.Row';

export interface LaneBoardStepsProps extends Omit<ComponentProps<'div'>, 'children' | 'color'> {
  /** How many steps are done. */
  value: number;
  /** How many steps there are. */
  max?: number;
  /** Which of the theme's roles the done steps are drawn in. */
  color?: LaneBoardColor;
  /** What a screen reader calls it. */
  label?: string;
}

/** How far along a card is, as a row of dashes with the done ones lit. */
function LaneBoardSteps({
  value,
  max = 5,
  color = 'primary',
  label = 'Progress',
  className,
  render,
  ...props
}: LaneBoardStepsProps & RenderProp<'div'>) {
  const slots = laneBoardVariants({ color });
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        role: 'img',
        'aria-label': `${label}: ${value} of ${max}`,
        className: slots.steps({ className }),
        children: (
          <>
            {Array.from({ length: max }, (_, index) => (
              <span key={index} className={laneBoardVariants({ lit: index < value }).step()} />
            ))}
          </>
        ),
      },
      props
    ),
  });
}
LaneBoardSteps.displayName = 'LaneBoard.Steps';

export interface LaneBoardTagProps extends Omit<ComponentProps<'span'>, 'color'> {
  /** Which of the theme's roles the tag is drawn in. */
  color?: LaneBoardColor;
}

/** A word in a pill, for a card's state. */
function LaneBoardTag({ color = 'primary', className, render, ...props }: LaneBoardTagProps & RenderProp<'span'>) {
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps({ className: laneBoardVariants({ color }).tag({ className }) }, props),
  });
}
LaneBoardTag.displayName = 'LaneBoard.Tag';

export interface LaneBoardMetaProps extends ComponentProps<'span'> {}

/** A short figure at the end of a card's last line: a time, a count. */
function LaneBoardMeta({ className, render, ...props }: LaneBoardMetaProps & RenderProp<'span'>) {
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps({ className: laneBoardVariants().meta({ className }) }, props),
  });
}
LaneBoardMeta.displayName = 'LaneBoard.Meta';

export interface LaneBoardAvatarProps extends ComponentProps<'span'> {}

/** Who a card belongs to, as initials in a small circle. */
function LaneBoardAvatar({ className, render, ...props }: LaneBoardAvatarProps & RenderProp<'span'>) {
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps(
      { 'data-slot': 'lane-board-avatar', className: laneBoardVariants().avatar({ className }) },
      props
    ),
  });
}
LaneBoardAvatar.displayName = 'LaneBoard.Avatar';

export const LaneBoard = Object.assign(LaneBoardRoot, {
  Title: LaneBoardTitle,
  Code: LaneBoardCode,
  Row: LaneBoardRow,
  Steps: LaneBoardSteps,
  Tag: LaneBoardTag,
  Meta: LaneBoardMeta,
  Avatar: LaneBoardAvatar,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export { LaneBoardTitle, LaneBoardCode, LaneBoardRow, LaneBoardSteps, LaneBoardTag, LaneBoardMeta, LaneBoardAvatar };
