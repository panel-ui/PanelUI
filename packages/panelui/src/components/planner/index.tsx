/**
 * Planner — a month of days, each carrying what falls on it.
 *
 * ```tsx
 * const [month, setMonth] = useState(new Date());
 *
 * <Planner
 *   month={month}
 *   onMonthChange={setMonth}
 *   entries={renewals}
 *   categories={[
 *     { id: 'monthly', label: 'Monthly' },
 *     { id: 'yearly', label: 'Yearly', colorIndex: 4 },
 *   ]}
 * >
 *   <Planner.Header>
 *     <Planner.Title />
 *     <Planner.Today />
 *     <Planner.Nav />
 *   </Planner.Header>
 *   <Planner.Grid />
 *   <Planner.Legend />
 *   <Planner.Details>
 *     {(date, entries) => <Text>{entries.length} on {date.toDateString()}</Text>}
 *   </Planner.Details>
 * </Planner>
 * ```
 *
 * ## How it differs from Calendar
 *
 * `Calendar` picks a date and answers with one. This shows what is already on
 * the days and answers with the day you asked about — the selection exists to
 * open something, not to be submitted.
 *
 * ## Why it draws its own Frame
 *
 * A month at a glance is a widget: a boundary, a strip along the top carrying
 * the month and the way through it, and a footer that holds still while the
 * middle changes. That is `Frame`, so the root renders one instead of leaving
 * every caller to assemble the same shell. Pass `frame={false}` to drop it,
 * for a planner in a sheet or a card that already draws its own edge.
 *
 * ## Why the grid is always six weeks
 *
 * A month can span five weeks or six. Drawn at its natural height the panel
 * jumps as you page through the year and the days appear to move under your
 * thumb, so the grid is always six rows and the last one is sometimes all
 * next month. `Calendar` fixes its height for the same reason.
 *
 * ## Why a day says more than its date
 *
 * The marker on a day is a coloured dot, and colour is a signal that does not
 * reach everyone looking at it. So the legend prints its label beside every
 * swatch, and a day is spoken as its date, how many entries it carries and
 * which categories they belong to. Neither is decoration: between them they
 * are the whole content of the grid for somebody who cannot see it.
 */
import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  AccessibilityInfo,
  AppState,
  FlatList,
  Platform,
  Pressable,
  View,
  type ViewToken,
  type ViewProps,
} from 'react-native';
import { tv } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { ChevronLeftIcon, ChevronRightIcon } from '../../icons';
import { Text, type TextProps } from '../../primitives/text';
import { cn } from '../../utils/cn';
import {
  addCalendarMonths,
  calendarDayNumber,
  calendarLongDate,
  calendarMonthLabel,
  isSameCalendarMonth,
  isSameDay,
  localeWeekStart,
  monthGrid,
  normalizeWeekStart,
  resolveCalendar,
  startOfCalendarMonth,
  startOfDay,
  weekdayNames,
  type CalendarSystem,
  type DateLocale,
} from '../../utils/date';
import { Dialog } from '../dialog';
import { Frame } from '../frame';
import {
  bucketByDay,
  dayAccessibilityLabel,
  entriesOn,
  summariseMonth,
  visibleEntries,
  type PlannerCountedCategory,
} from './planner-entries';
import { usePlannerMonthAnnouncement } from './planner-announcement';
import { plannerGridTarget } from './planner-grid-navigation';
import { weekAnchor, weekDays, weekIndex, weekRange } from './planner-weeks';
import {
  usePlannerMonthLifecycle,
  usePlannerSelectionLifecycle,
} from './planner-lifecycle';
import { millisecondsUntilNextLocalDay } from './planner-today';

/**
 * How many of a day's entries a cell draws before it stops and counts.
 *
 * `calendar` gets one more because a named entry is a row, and a cell tall
 * enough to name one is tall enough for three; `tiles` draws a single icon at
 * the size of the tile, so the limit there is the look rather than a number.
 */
const DEFAULT_ENTRY_LIMIT: Record<PlannerVariant, number> = {
  default: 2,
  tiles: 1,
  calendar: 3,
};

/** The palette a category takes its dot from when it does not name a colour. */
const PALETTE_SIZE = 5;

/**
 * How strongly a `tiles` day takes its category's colour.
 *
 * Low enough that the date in the corner and the icon over it both stay
 * legible, high enough that a brand colour arrives as that brand rather than as
 * a grey tile with a suggestion of one.
 */
const TILE_TINT_OPACITY = 0.32;

/**
 * The height a `tiles` grid reserves, and what it is made of.
 *
 * Six weeks' worth, always — but only the weeks the month actually spans are
 * drawn, and they share the reserved height out between them. A five-week
 * month therefore has slightly taller tiles than a six-week one and no band of
 * empty space under the last row, while the panel itself never changes size as
 * you page through the year. Reserving the height and leaving the sixth row
 * blank, or dropping the row and letting the panel shrink, each fix one of
 * those at the cost of the other.
 */
const TILE_ROW_HEIGHT = 64;
const TILE_ROW_GAP = 4;
const TILE_GRID_HEIGHT = TILE_ROW_HEIGHT * 6 + TILE_ROW_GAP * 5;

/** Stable wrapper keeps the native method's receiver and the hook dependency steady. */
const announceMonth = (label: string) => {
  AccessibilityInfo.announceForAccessibility(label);
};

const plannerVariants = tv({
  slots: {
    grid: 'gap-1 px-3 pb-3 pt-1',
    week: 'flex-row',
    heading: 'flex-1 text-center',
    legend: 'flex-row flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3',
    swatch: 'h-2 w-2 rounded-full',
  },
  variants: {
    /*
     * The weeks share out the height instead of standing at their own. The
     * weekday row keeps its natural height — it is a label, and stretching it
     * only moves the letters away from the column they name.
     */
    fill: { true: { grid: 'flex-1', week: 'flex-1' } },
  },
});

const dayVariants = tv({
  slots: {
    /*
     * A fixed height, and a square-ish tile rather than a circle.
     *
     * Fixed because the cell has to be the same size whether the day carries
     * anything or not — sized to its contents, a row with one icon in it is
     * taller than the five around it and the grid stops being a grid.
     *
     * Square-ish because a day here holds a number, a marker and sometimes an
     * icon, and a circle wastes the corners it needs for them.
     */
    /*
     * The transparent border is load-bearing: today and the open day both draw
     * one, and a cell that only grows a border when it is picked shifts its
     * contents by a point at the moment you look at it. Every cell reserves the
     * point; the variants below only colour it.
     */
    cell: 'mx-0.5 h-14 flex-1 rounded-xl border border-transparent px-1.5 pt-1.5',
    /*
     * `leading-none` is safe here and only here: these slots hold a day
     * number, `•••` or `+3`, and none of those has anything below the
     * baseline for Android to clip. Anywhere the caller's own words can
     * appear it has to be `leading-tight` — a line height equal to the font
     * size loses the tail of every `g` and `y` on that platform.
     */
    number: 'text-xs leading-none',
    marker: 'absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full',
    body: 'flex-1 flex-row items-center justify-center gap-0.5 pb-1',
    /** The colour a day's entries give it, drawn under everything else. */
    tint: 'absolute inset-0 rounded-xl',
    /*
     * The corners of a tile. These are Views rather than classes on the Text
     * itself: a Text takes its typography from a class but not its position,
     * so a number told to sit in a corner stayed where the layout put it —
     * dead centre, under the icon.
     */
    corner: 'absolute bottom-1 right-1.5',
    counter: 'absolute left-1.5 top-1',
    /** One entry, named, in a cell with the height to name it. */
    chip: 'w-full overflow-hidden rounded-sm bg-muted px-1 py-0.5',
    overflow: 'leading-none',
  },
  variants: {
    /*
     * Cells stretch to their container rather than standing at a fixed height.
     * The grid is still six weeks, so what changes is how tall a week is, not
     * how many there are.
     */
    fill: { true: { cell: 'h-auto min-h-0 flex-1' } },
    /** Inside the month being shown, as opposed to the days either side. */
    inMonth: {
      true: { cell: 'bg-muted/40', number: 'text-foreground' },
      false: { cell: 'bg-muted/15', number: 'text-muted-foreground/40' },
    },
    /*
     * Today rings the tile; the open day fills it. Two rings would be the
     * problem — two channels are not, and the ring is the one that has to
     * survive being read at a glance across forty-two tiles.
     */
    today: { true: { cell: 'border-foreground', number: 'font-semibold' } },
    selected: { true: { cell: 'border-primary/60 bg-primary/10' } },
    disabled: { true: { cell: 'opacity-40' } },
    /*
     * What a cell draws. One axis, because these are three answers to the same
     * question and a cell can only give one of them.
     *
     * Last, so a look can undo what the states above it set. `calendar` has no
     * tile to ring or fill, so it has to be able to take the background and the
     * border back off a cell that today or the open day just gave one to.
     */
    variant: {
      default: {},
      /*
       * A tile per day, carrying the one thing on it at the size of a mark
       * rather than a marker. The date moves out of the way into the corner:
       * it is how you find the day you want, not what the cell is showing.
       */
      tiles: {
        cell: 'h-full items-center justify-center px-0 pt-0',
        overflow: 'leading-none',
      },
      /*
       * Named entries stacked down an open cell. No tile, because a tile per
       * day and a block per entry are two boxes saying the same thing and the
       * entries are the ones carrying words — the weeks are ruled off instead,
       * which separates them without enclosing anything.
       */
      calendar: {
        cell: 'mx-0 h-full min-h-0 items-stretch gap-px rounded-none border-transparent bg-transparent px-1 pb-1 pt-1.5',
        number: 'text-center',
        body: 'flex-col items-stretch justify-start gap-px pb-0',
        overflow: 'text-center leading-none',
      },
    },
  },
  compoundVariants: [
    /*
     * Today, and open. Declaration order would otherwise hand the border to
     * `selected` and lose the one mark that says which day it actually is —
     * so the ring is restated over the fill.
     */
    { today: true, selected: true, class: { cell: 'border-foreground bg-primary/10' } },
  ],
  defaultVariants: { inMonth: true, variant: 'default' },
});

/* ------------------------------------------------------------------ *
 * Data
 * ------------------------------------------------------------------ */

/**
 * What a day cell draws.
 *
 * `default` is a number, a marker and small icons. `tiles` gives the day over
 * to one large icon tinted with its category's colour, with the date in the
 * corner. `calendar` names each entry in a block under a centred date, on an
 * open grid ruled off by week.
 */
export type PlannerVariant = 'default' | 'tiles' | 'calendar';

/** One thing that falls on a day. */
export interface PlannerEntry {
  /** Stable across renders; it keys the cell's contents. */
  id: string;
  /** When it falls. The time of day is kept but not read by the grid. */
  date: Date;
  /** Named in the dialog and, through its category, in the day's spoken label. */
  label: string;
  /** Matches a `PlannerCategory` id. Without one the entry is still counted. */
  category?: string;
  /** Drawn in the cell — a brand mark, an avatar, a glyph. */
  icon?: ReactNode;
  /**
   * This entry's own colour, for a mark that belongs to the entry rather than
   * to a group of them — a brand. It wins over the category's colour, and
   * under `tiles` it is what tints the day.
   */
  color?: string;
}

/** A group of entries: the key to a colour, and a line in the legend. */
export interface PlannerCategory {
  id: string;
  /** Printed beside the swatch, and spoken as part of a day that carries it. */
  label: string;
  /**
   * Which `--color-chart-*` token the dot takes, 1 to 5. Categories without
   * one are numbered in the order they are declared.
   */
  colorIndex?: number;
  /** An explicit colour, for a brand that is not the theme's to choose. */
  color?: string;
}

interface PlannerContextValue {
  month: Date;
  setMonth: (month: Date) => void;
  /** Moves the month without announcing it. For scrolling, which is continuous. */
  syncMonth: (month: Date) => void;
  today: Date;
  selected: Date | null;
  select: (date: Date | null) => void;
  days: Map<number, PlannerEntry[]>;
  categories: PlannerCategory[];
  categoryLabels: Map<string, string>;
  colorOf: (category: string | undefined) => string | undefined;
  summary: { total: number; categories: PlannerCountedCategory[] };
  entryLimit: number;
  variant: PlannerVariant;
  fill: boolean;
  weekStartsOn: number;
  grid: Date[][];
  locale: DateLocale;
  system: 'gregory' | 'islamic';
  isInMonth: (date: Date) => boolean;
  renderDay?: PlannerDayRenderer;
  onDayPress?: (date: Date, entries: PlannerEntry[]) => void;
}

const PlannerContext = createContext<PlannerContextValue | null>(null);

function usePlanner(component: string): PlannerContextValue {
  const context = useContext(PlannerContext);
  if (!context) {
    throw new Error(`${component} must be used within a <Planner>`);
  }
  return context;
}

/** Today, recomputed at local midnight and whenever the app comes back. */
function useToday(): Date {
  const [today, setToday] = useState(() => startOfDay(new Date()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const clearTimer = () => {
      if (timer === null) return;
      clearTimeout(timer);
      timer = null;
    };

    const refreshAndSchedule = () => {
      const current = new Date();
      const now = startOfDay(current);
      // A new object every resume would invalidate every memo below it for a
      // date that has not changed.
      setToday((previous) => (previous.getTime() === now.getTime() ? previous : now));
      clearTimer();
      timer = setTimeout(refreshAndSchedule, millisecondsUntilNextLocalDay(current));
    };

    refreshAndSchedule();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshAndSchedule();
      else clearTimer();
    });
    return () => {
      clearTimer();
      subscription.remove();
    };
  }, []);

  return today;
}

/**
 * The five series colours, read once.
 *
 * A fixed number of reads rather than one per category: a hook cannot run in a
 * loop whose length is a prop.
 */
function usePalette(): (string | undefined)[] {
  const one = useCSSVariable('--color-chart-1');
  const two = useCSSVariable('--color-chart-2');
  const three = useCSSVariable('--color-chart-3');
  const four = useCSSVariable('--color-chart-4');
  const five = useCSSVariable('--color-chart-5');
  return useMemo(
    () => [one, two, three, four, five].map((v) => (typeof v === 'string' ? v : undefined)),
    [one, two, three, four, five]
  );
}

/* ------------------------------------------------------------------ *
 * Root
 * ------------------------------------------------------------------ */

export interface PlannerProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** The month on show. Leave it out for an uncontrolled planner. */
  month?: Date;
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  /** Everything the planner knows about, in any order and any month. */
  entries?: PlannerEntry[];
  /** The colour key. Declaration order is legend order and palette order. */
  categories?: PlannerCategory[];
  /** The open day. `null` is none. Leave it out for an uncontrolled planner. */
  selected?: Date | null;
  defaultSelected?: Date | null;
  onSelectedChange?: (date: Date | null) => void;
  /** Runs before the selection moves, whether or not `Details` is present. */
  onDayPress?: (date: Date, entries: PlannerEntry[]) => void;
  /**
   * What each day draws. `tiles` is one large icon per day, tinted by its
   * category; `calendar` names every entry and needs the height to do it.
   */
  variant?: PlannerVariant;
  /**
   * Stretch the grid to its container instead of standing at its own height.
   * For a planner that owns a screen — the six weeks share out whatever is
   * left after the header, the legend and anything below them.
   */
  fill?: boolean;
  /**
   * How many entries a cell draws before it counts the rest. Default `2`, or
   * `3` under `calendar`, which has the room; `tiles` draws one whatever you
   * pass.
   */
  entryLimit?: number;
  /** First day of the week, 0 is Sunday. Defaults to the locale's. */
  weekStartsOn?: number | 'auto';
  locale?: DateLocale;
  calendar?: CalendarSystem;
  /** Draw the surrounding `Frame`. Off for a planner in a sheet or a card. */
  frame?: boolean;
  children?: ReactNode;
}

const PlannerRoot = forwardRef<View, PlannerProps>(
  (
    {
      className,
      month: monthProp,
      defaultMonth,
      onMonthChange,
      entries = [],
      categories = [],
      selected: selectedProp,
      defaultSelected = null,
      onSelectedChange,
      onDayPress,
      variant = 'default',
      fill = false,
      entryLimit,
      weekStartsOn = 'auto',
      locale,
      calendar = 'gregory',
      frame = true,
      children,
      ...props
    },
    ref
  ) => {
    const resolvedEntryLimit = entryLimit ?? DEFAULT_ENTRY_LIMIT[variant];
    const system = resolveCalendar(calendar, locale);
    const palette = usePalette();
    const today = useToday();
    const settleMonth = useCallback(
      (date: Date) => startOfCalendarMonth(date, system, locale),
      [system, locale]
    );

    const [month, requestMonth] = usePlannerMonthLifecycle({
      month: monthProp,
      defaultMonth,
      settleMonth,
      onMonthChange,
    });
    /*
     * The announcement is registered against the month a press asks for, and
     * spoken only once a commit arrives carrying it. That is what keeps a
     * controlled parent's rejection silent, so it wraps the lifecycle's setter
     * rather than living inside it — the hook owns which month is current, and
     * this owns whether the change was the user's to hear about.
     */
    const expectMonthAnnouncement = usePlannerMonthAnnouncement({
      monthKey: month.getTime(),
      monthLabel: calendarMonthLabel(month, system, locale),
      announce: announceMonth,
    });
    /*
     * Scrolling changes the month continuously, and announcing each one as it
     * goes would talk over somebody reading the weeks. The announcement belongs
     * to a deliberate move — the arrows, the Today pill — so a scroll reports
     * the change and stays quiet about it.
     */
    const syncMonth = useCallback(
      (next: Date) => {
        requestMonth(next);
      },
      [requestMonth]
    );
    const setMonth = useCallback(
      (next: Date) => {
        expectMonthAnnouncement(settleMonth(next));
        requestMonth(next);
      },
      [expectMonthAnnouncement, requestMonth, settleMonth]
    );
    const [selected, select] = usePlannerSelectionLifecycle({
      selected: selectedProp,
      defaultSelected,
      onSelectedChange,
    });

    const days = useMemo(() => bucketByDay(entries), [entries]);
    const normalizedWeekStart =
      weekStartsOn === 'auto'
        ? localeWeekStart(locale)
        : normalizeWeekStart(weekStartsOn);
    const grid = useMemo(
      () => monthGrid(month, normalizedWeekStart, system, locale),
      [month, normalizedWeekStart, system, locale]
    );

    const isInMonth = useCallback(
      (date: Date) => isSameCalendarMonth(date, month, system, locale),
      [month, system, locale]
    );

    const categoryLabels = useMemo(
      () => new Map(categories.map((category) => [category.id, category.label])),
      [categories]
    );

    const categoryColors = useMemo(
      () => {
        const colors = new Map<string, string | undefined>();
        categories.forEach((category, index) => {
          // `findIndex` used to make the first duplicate id authoritative.
          if (colors.has(category.id)) return;
          const slot = (category.colorIndex ?? index + 1) - 1;
          colors.set(
            category.id,
            category.color ??
              palette[((slot % PALETTE_SIZE) + PALETTE_SIZE) % PALETTE_SIZE]
          );
        });
        return colors;
      },
      [categories, palette]
    );
    const colorOf = useCallback(
      (id: string | undefined) => id ? categoryColors.get(id) : undefined,
      [categoryColors]
    );

    const summary = useMemo(
      () => summariseMonth(days, grid, categories, isInMonth),
      [days, grid, categories, isInMonth]
    );

    const context = useMemo<PlannerContextValue>(
      () => ({
        month,
        setMonth,
        syncMonth,
        today,
        selected,
        select,
        days,
        categories,
        categoryLabels,
        colorOf,
        summary,
        entryLimit: resolvedEntryLimit,
        variant,
        fill,
        weekStartsOn: normalizedWeekStart,
        grid,
        locale,
        system,
        isInMonth,
        onDayPress,
      }),
      [
        month, setMonth, syncMonth, today, selected, select, days, categories, categoryLabels,
        colorOf, summary, resolvedEntryLimit, variant, fill, normalizedWeekStart,
        grid, locale, system, isInMonth, onDayPress,
      ]
    );

    /*
     * The header belongs in the Frame's strip and everything else in its
     * panel, so the root sorts its children rather than asking the caller to
     * nest them in two places to get one widget.
     */
    const parts = Children.toArray(children);
    const header = parts.find(
      (child) => isValidElement(child) && child.type === PlannerHeader
    );
    const body = parts.filter((child) => child !== header);

    return (
      <PlannerContext.Provider value={context}>
        {frame ? (
          // Full width by default: the grid is seven equal columns, and a
          // container that sizes to its content collapses them to the width of
          // a two-digit number. Under `fill` the panel has to flex too, or the
          // grid inside it stretches against a container that does not.
          <Frame ref={ref} className={cn('w-full', fill && 'flex-1', className)} {...props}>
            {header}
            <Frame.Panel dividers={false} className={fill ? 'flex-1' : undefined}>
              {body}
            </Frame.Panel>
          </Frame>
        ) : (
          <View ref={ref} className={cn('w-full', fill && 'flex-1', className)} {...props}>
            {header}
            {body}
          </View>
        )}
      </PlannerContext.Provider>
    );
  }
);
PlannerRoot.displayName = 'Planner';

/* ------------------------------------------------------------------ *
 * Header strip
 * ------------------------------------------------------------------ */

export interface PlannerHeaderProps {
  children?: ReactNode;
}

/**
 * The strip along the top of the frame. Put `Title`, `Today` and `Nav` in it.
 *
 * The strip has two ends rather than an even spread. What the month *is* —
 * its name, and the way back to today — reads from the leading edge; what
 * *moves* it sits at the trailing edge, under the thumb that reaches for it.
 * Spaced evenly across a full-width strip they read as three unrelated
 * controls instead of a label and a pair of buttons.
 */
function PlannerHeader({ children }: PlannerHeaderProps) {
  const parts = Children.toArray(children);
  const trails = (child: ReactNode) =>
    isValidElement(child) && (child.type === PlannerNav || child.type === PlannerAction);

  const trailing = parts.filter(trails);
  const lead = parts.filter((child) => !trails(child));

  return (
    <Frame.Header>
      <View className="min-w-0 shrink flex-row items-center gap-2">{lead}</View>
      {/*
        `ml-auto` rather than a flexible lead. The nav belongs against the right
        edge whatever is to its left — one short title, a title and a pill, or
        nothing at all — and pushing it there with a margin says that directly
        instead of leaving it to whether the thing beside it happened to grow.
      */}
      {trailing.length > 0 ? (
        <View className="ml-auto shrink-0 flex-row items-center gap-1.5">{trailing}</View>
      ) : null}
    </Frame.Header>
  );
}
PlannerHeader.displayName = 'Planner.Header';

export interface PlannerTitleProps extends Omit<TextProps, 'children'> {
  /** Replaces the month name, for a title that says something else. */
  children?: ReactNode;
}

/** The month on show, in the calendar system and locale the grid uses. */
function PlannerTitle({ children, className, ...props }: PlannerTitleProps) {
  const { month, system, locale } = usePlanner('Planner.Title');
  return (
    <Text weight="medium" className={cn('text-base', className)} {...props}>
      {children ?? calendarMonthLabel(month, system, locale)}
    </Text>
  );
}
PlannerTitle.displayName = 'Planner.Title';

export interface PlannerTodayProps {
  /** Replaces the word on the pill. */
  children?: ReactNode;
}

/** Jumps back to the month today is in, and selects nothing. */
function PlannerToday({ children = 'Today' }: PlannerTodayProps) {
  const { today, setMonth, month, system, locale } = usePlanner('Planner.Today');
  const alreadyHere = isSameCalendarMonth(today, month, system, locale);

  return (
    <Pressable
      onPress={() => setMonth(today)}
      disabled={alreadyHere}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel="Go to this month"
      accessibilityState={{ disabled: alreadyHere }}
      className={cn(
        'rounded-full border border-border px-3 py-1',
        alreadyHere ? 'opacity-40' : 'active:bg-accent'
      )}
    >
      <Text size="xs" muted>
        {children}
      </Text>
    </Pressable>
  );
}
PlannerToday.displayName = 'Planner.Today';

export interface PlannerNavProps {
  className?: string;
}

/** Back and forward a month. */
function PlannerNav({ className }: PlannerNavProps) {
  const { month, setMonth, system, locale } = usePlanner('Planner.Nav');

  return (
    <View className={cn('flex-row items-center gap-1', className)}>
      <PlannerArrow
        direction="previous"
        onPress={() => setMonth(addCalendarMonths(month, -1, system, locale))}
      />
      <PlannerArrow
        direction="next"
        onPress={() => setMonth(addCalendarMonths(month, 1, system, locale))}
      />
    </View>
  );
}
PlannerNav.displayName = 'Planner.Nav';

function PlannerArrow({
  direction,
  onPress,
}: {
  direction: 'previous' | 'next';
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={direction === 'next' ? 'Next month' : 'Previous month'}
      className="h-8 w-8 items-center justify-center rounded-lg active:bg-accent"
    >
      {direction === 'next' ? <ChevronRightIcon size={18} /> : <ChevronLeftIcon size={18} />}
    </Pressable>
  );
}

export interface PlannerActionProps {
  children?: ReactNode;
}

/** The trailing end of the header strip, for a button of the caller's. */
function PlannerAction({ children }: PlannerActionProps) {
  return <Frame.Action>{children}</Frame.Action>;
}
PlannerAction.displayName = 'Planner.Action';

/* ------------------------------------------------------------------ *
 * Grid
 * ------------------------------------------------------------------ */

/** What a custom cell is handed. Everything the default cell draws from. */
export interface PlannerDayState {
  date: Date;
  entries: PlannerEntry[];
  isToday: boolean;
  isSelected: boolean;
  isInMonth: boolean;
}

export type PlannerDayRenderer = (state: PlannerDayState) => ReactNode;

export interface PlannerGridProps {
  className?: string;
  /** Draws a cell yourself. It is handed the day and what falls on it. */
  renderDay?: PlannerDayRenderer;
}

interface PlannerGridKeyDownEvent {
  nativeEvent: { key?: string };
  preventDefault: () => void;
}

interface PlannerGridNavigationContextValue {
  activeIndex: number;
  indexByDay: ReadonlyMap<number, number>;
  register: (index: number, node: View | null) => void;
  focus: (index: number, event: PlannerGridKeyDownEvent) => void;
  makeActive: (index: number) => void;
}

const PlannerGridNavigationContext = createContext<PlannerGridNavigationContextValue | null>(null);

/**
 * The weekday row and the six weeks below it.
 *
 * React Native has no per-cell grid vocabulary — no `gridcell`, no `row` — so
 * a screen reader never hears "row three, column five" and cannot fall back on
 * position for context. Every day therefore carries its own full date, and the
 * weekday headings are hidden rather than read out 42 times over.
 */
function PlannerGrid({ className, renderDay }: PlannerGridProps) {
  const { grid: weeks, weekStartsOn, locale, selected, today, isInMonth, variant, fill } =
    usePlanner('Planner.Grid');
  const { grid, week: weekRow, heading } = plannerVariants({ fill });
  /*
   * `tiles` leaves the days either side of the month blank, so its columns are
   * told apart by position alone and a single letter is enough to head them.
   */
  const headings = useMemo(
    () => weekdayNames(locale, weekStartsOn, variant === 'tiles' ? 'narrow' : 'short'),
    [locale, weekStartsOn, variant]
  );
  /*
   * `tiles` draws nothing for the days either side of the month, so a week made
   * only of those is a band of empty space rather than a week. It is dropped,
   * and the grid keeps its height by letting the weeks that remain stretch.
   */
  const shownWeeks = useMemo(
    () => (variant === 'tiles' ? weeks.filter((week) => week.some(isInMonth)) : weeks),
    [weeks, variant, isInMonth]
  );
  const dates = useMemo(() => shownWeeks.flat(), [shownWeeks]);
  const indexByDay = useMemo(
    () => new Map(dates.map((date, index) => [date.getTime(), index])),
    [dates]
  );
  /*
   * A blank cell has nothing to focus, so arrow keys step over it rather than
   * landing on a day that is not drawn and losing focus altogether.
   */
  const navigable = useMemo(
    () =>
      variant === 'tiles' ? (index: number) => isInMonth(dates[index] ?? today) : undefined,
    [variant, dates, isInMonth, today]
  );
  const initialDay = selected ?? today;
  const [activeDay, setActiveDay] = useState(initialDay.getTime());
  const storedIndex = indexByDay.get(activeDay);
  const preferredIndex =
    (selected ? indexByDay.get(startOfDay(selected).getTime()) : undefined) ??
    indexByDay.get(today.getTime()) ??
    dates.findIndex(isInMonth);
  const activeIndex = storedIndex ?? Math.max(0, preferredIndex);
  const refs = useRef(new Map<number, View>());
  const register = useCallback((index: number, node: View | null) => {
    if (node) refs.current.set(index, node);
    else refs.current.delete(index);
  }, []);
  const makeActive = useCallback(
    (index: number) => {
      const date = dates[index];
      if (date) setActiveDay(date.getTime());
    },
    [dates]
  );
  const focus = useCallback(
    (index: number, event: PlannerGridKeyDownEvent) => {
      const target = plannerGridTarget(
        event.nativeEvent.key ?? '',
        index,
        dates.length,
        7,
        navigable
      );
      if (target === null) return;
      event.preventDefault();
      makeActive(target);
      refs.current.get(target)?.focus();
    },
    [dates.length, makeActive, navigable]
  );
  const navigation = useMemo<PlannerGridNavigationContextValue>(
    () => ({ activeIndex, indexByDay, register, focus, makeActive }),
    [activeIndex, indexByDay, register, focus, makeActive]
  );

  return (
    <PlannerGridNavigationContext.Provider value={renderDay ? null : navigation}>
      <View
        className={grid({ className })}
        style={variant === 'tiles' && !fill ? { height: TILE_GRID_HEIGHT } : undefined}
      >
        <View
          className={weekRow()}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {/*
            Keyed by position rather than by the word: narrow names repeat in
            plenty of locales — English has T twice and S twice — and a column
            is identified by where it is, not by the letter over it.
          */}
          {headings.map((label, position) => (
            <Text key={position} size="xs" muted className={heading()}>
              {label.toUpperCase()}
            </Text>
          ))}
        </View>

        {shownWeeks.map((week, index) => (
          <View key={index} className={cn(weekRow(), variant === 'tiles' && 'flex-1')}>
            {week.map((date) => (
              <PlannerDay key={date.getTime()} date={date} renderDay={renderDay} />
            ))}
          </View>
        ))}
      </View>
    </PlannerGridNavigationContext.Provider>
  );
}
PlannerGrid.displayName = 'Planner.Grid';

export interface PlannerDayProps {
  date: Date;
  renderDay?: PlannerDayRenderer;
}

/** One cell. Pressing it selects the day and opens whatever is bound to it. */
function PlannerDay({ date, renderDay }: PlannerDayProps) {
  const {
    days, today, selected, select, colorOf, categoryLabels,
    entryLimit, variant, fill, locale, system, isInMonth, onDayPress,
  } = usePlanner('Planner.Day');
  const navigation = useContext(PlannerGridNavigationContext);
  const registerGridCell = navigation?.register;
  const focusGridCell = navigation?.focus;
  const makeGridCellActive = navigation?.makeActive;

  const entries = entriesOn(days, date);
  const inMonth = isInMonth(date);
  const isToday = isSameDay(date, today);
  const isSelected = selected ? isSameDay(date, selected) : false;
  const { shown, overflow } = visibleEntries(entries, entryLimit);
  const drawable = shown.filter((entry) => entry.icon);
  const styles = dayVariants({ variant, fill, inMonth, today: isToday, selected: isSelected });
  /*
   * The colour the day's entries give it. The first entry naming a category the
   * planner knows wins, and an uncategorised day gets nothing — the tint is a
   * signal about what is on the day, so a day with no answer stays plain rather
   * than being coloured for the sake of it.
   */
  const tint = markerColor(entries, colorOf);

  const label = dayAccessibilityLabel(
    calendarLongDate(date, system, locale),
    entries,
    categoryLabels
  );

  /*
   * Pressing the open day again closes it. Without this the mark is a one-way
   * door: a planner with no `Details` bound has nothing to dismiss, so the day
   * you pressed stays ringed until you press a different one and there is no
   * way back to none selected.
   */
  const press = () => {
    onDayPress?.(date, entries);
    select(isSelected ? null : date);
  };
  const gridIndex = navigation?.indexByDay.get(date.getTime());
  const setRef = useCallback(
    (node: View | null) => {
      if (gridIndex !== undefined) registerGridCell?.(gridIndex, node);
    },
    [gridIndex, registerGridCell]
  );
  const onFocus = useCallback(() => {
    if (gridIndex !== undefined) makeGridCellActive?.(gridIndex);
  }, [gridIndex, makeGridCellActive]);
  const onKeyDown = useCallback(
    (event: PlannerGridKeyDownEvent) => {
      if (gridIndex !== undefined) focusGridCell?.(gridIndex, event);
    },
    [gridIndex, focusGridCell]
  );
  const webGridProps =
    Platform.OS === 'web' && gridIndex !== undefined && navigation
      ? {
          ref: setRef,
          tabIndex: navigation.activeIndex === gridIndex ? (0 as const) : (-1 as const),
          onFocus,
          onKeyDown,
        }
      : {};

  if (renderDay) {
    return (
      <View className="flex-1">
        {renderDay({ date, entries, isToday, isSelected, isInMonth: inMonth })}
      </View>
    );
  }

  /*
   * `tiles` leaves the days either side of the month out altogether. The row
   * still holds their column, so the grid is six weeks whatever month it is
   * showing, but there is no tile, no number and nothing to press or to read
   * out: a blank is the answer, and drawing a faded one only invites the press
   * it is going to ignore.
   */
  if (variant === 'tiles' && !inMonth) {
    return (
      <View
        className={cn('mx-0.5 flex-1', fill ? 'min-h-0' : 'h-16')}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    );
  }

  return (
    <Pressable
      {...(webGridProps as ViewProps)}
      onPress={press}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={entries.length > 0 ? 'Opens what is on this day' : undefined}
      accessibilityState={{ selected: isSelected }}
      className={styles.cell()}
    >
      {/*
        The tint sits under the content rather than on the cell itself: the
        colour arrives as a runtime string from the theme, so it cannot go
        through a class with an opacity on it, and painting the cell at full
        strength would take the number down with it.
      */}
      {variant === 'tiles' && tint ? (
        <View
          pointerEvents="none"
          className={styles.tint()}
          style={{ backgroundColor: tint, opacity: TILE_TINT_OPACITY }}
        />
      ) : null}

      {variant === 'tiles' ? (
        <View className={styles.corner()} pointerEvents="none">
          <Text size="xs" className={styles.number()}>
            {calendarDayNumber(date, system, locale)}
          </Text>
        </View>
      ) : variant === 'calendar' ? (
        /*
         * A disc around the date rather than a ring around the cell. There is
         * no tile here to ring, and the date is the only thing in the cell that
         * is always present — so it is the only place a mark can go and be
         * found in the same spot on every day of the month.
         */
        <View
          className={cn(
            'h-6 w-6 items-center justify-center self-center rounded-full',
            isToday && 'bg-primary'
          )}
        >
          <Text
            size="xs"
            className={cn(styles.number(), isToday && 'text-primary-foreground')}
          >
            {calendarDayNumber(date, system, locale)}
          </Text>
        </View>
      ) : (
        <Text className={styles.number()}>{calendarDayNumber(date, system, locale)}</Text>
      )}

      {variant === 'default' && entries.length > 0 ? (
        <View className={styles.marker()} style={{ backgroundColor: tint }} />
      ) : null}

      {variant === 'calendar' ? (
        <View className={styles.body()}>
          {shown.map((entry) => (
            <PlannerChip
              key={entry.id}
              entry={entry}
              color={entry.color ?? colorOf(entry.category)}
            />
          ))}
          {/*
            Three dots, not a count. The cell has already run out of room for
            the entries themselves, and "+2 more" spends a whole row of that
            room on a number nobody acts on — the dots say there is more and
            leave the row for an entry.
          */}
          {overflow > 0 ? (
            <Text size="xs" muted className={styles.overflow()} numberOfLines={1}>
              •••
            </Text>
          ) : null}
        </View>
      ) : null}

      {/*
        Only entries that brought an icon are drawn, and the overflow count
        goes with them. A day whose entries have no icons is already saying
        "something is here" with its marker; adding a bare "+3" under an empty
        row says it twice, in a way that looks like a stray number.
      */}
      {variant === 'tiles' && overflow > 0 ? (
        <View className={styles.counter()} pointerEvents="none">
          <Text size="xs" muted className={styles.overflow()}>
            +{overflow}
          </Text>
        </View>
      ) : null}

      {variant !== 'calendar' && drawable.length > 0 ? (
        <View className={styles.body()}>
          {drawable.map((entry) => (
            <View key={entry.id}>{entry.icon}</View>
          ))}
          {variant !== 'tiles' && overflow > 0 ? (
            <Text size="xs" muted className={styles.overflow()}>
              +{overflow}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * One named entry inside a `calendar` cell.
 *
 * A solid block of the entry's colour with light text on it. That is a real
 * constraint rather than a free choice: the colour is the caller's, so a pale
 * one will not carry white well — but a wash with the label in the foreground
 * colour makes every entry the same weight and loses the one thing the colour
 * was for, which is telling them apart down a column at a glance.
 */
function PlannerChip({ entry, color }: { entry: PlannerEntry; color?: string }) {
  const { chip } = dayVariants();
  return (
    <View className={chip()} style={color ? { backgroundColor: color } : undefined}>
      <Text
        size="xs"
        numberOfLines={1}
        className={cn('leading-tight', !color && 'text-foreground')}
        style={color ? { color: '#ffffff' } : undefined}
      >
        {entry.label}
      </Text>
    </View>
  );
}

/**
 * The dot's colour: the first entry that names a category the planner knows.
 *
 * One dot rather than one per entry. A cell this size fits a row of dots or a
 * day number, and the count is already spoken — so the dot answers "is there
 * anything here, and roughly what kind", which is all it has room to answer.
 */
function markerColor(
  entries: readonly PlannerEntry[],
  colorOf: (category: string | undefined) => string | undefined
): string | undefined {
  for (const entry of entries) {
    // The entry's own colour first: a brand belongs to the thing, not to the
    // group it was filed under.
    const color = entry.color ?? colorOf(entry.category);
    if (color) return color;
  }
  return undefined;
}

/* ------------------------------------------------------------------ *
 * Legend and summary
 * ------------------------------------------------------------------ */

export interface PlannerLegendProps {
  className?: string;
  /** Print each category's count for the month beside its label. */
  counts?: boolean;
  /** Sits at the trailing end — a total, a currency, whatever the month adds to. */
  children?: ReactNode;
}

/**
 * The key to the dots.
 *
 * It prints the label beside every swatch, because a column of coloured dots
 * with nothing to read them against is a quiz.
 */
function PlannerLegend({ className, counts = false, children }: PlannerLegendProps) {
  const { summary, colorOf } = usePlanner('Planner.Legend');
  const { legend, swatch } = plannerVariants();

  return (
    <View className={cn(legend(), 'justify-between border-t border-border', className)}>
      <View className="flex-row flex-wrap items-center gap-x-4 gap-y-2">
        {summary.categories.map((category) => (
          <View key={category.id} className="flex-row items-center gap-1.5">
            <View
              className={swatch()}
              style={{ backgroundColor: colorOf(category.id) }}
            />
            <Text size="xs" muted>
              {counts ? `${category.label} ${category.count}` : category.label}
            </Text>
          </View>
        ))}
      </View>
      {children}
    </View>
  );
}
PlannerLegend.displayName = 'Planner.Legend';

export interface PlannerSummaryProps extends Omit<TextProps, 'children'> {
  /** Replaces the count, for a total that is money rather than entries. */
  children?: ReactNode;
}

/** What the month adds up to. Counts this month only, never the days either side. */
function PlannerSummary({ children, ...props }: PlannerSummaryProps) {
  const { summary } = usePlanner('Planner.Summary');
  return (
    <Text size="xs" muted {...props}>
      {children ?? `${summary.total} ${summary.total === 1 ? 'entry' : 'entries'}`}
    </Text>
  );
}
PlannerSummary.displayName = 'Planner.Summary';

export interface PlannerFooterProps {
  className?: string;
  children?: ReactNode;
}

/** The strip along the bottom, for tools that act on the month. */
function PlannerFooter({ className, children }: PlannerFooterProps) {
  return (
    <View className={cn('flex-row items-center justify-between gap-3 px-4 py-3', className)}>
      {children}
    </View>
  );
}
PlannerFooter.displayName = 'Planner.Footer';

/* ------------------------------------------------------------------ *
 * Details
 * ------------------------------------------------------------------ */

export interface PlannerDetailsProps {
  className?: string;
  /** Title above the children. Defaults to the day's full date. */
  title?: ReactNode;
  /**
   * The line under the title. Defaults to how many entries the day carries,
   * so the dialog answers "how much of this is there" before it is read.
   * Pass `null` to drop it.
   */
  description?: ReactNode;
  /** Given the open day and what falls on it. */
  children: (date: Date, entries: PlannerEntry[]) => ReactNode;
}

/**
 * A dialog bound to the open day.
 *
 * The planner owns the grid and the binding; what the dialog says is the
 * application's, because the contents of a day are its data and not the
 * component's. Leave it out and `onDayPress` is still called — a planner that
 * pushes a screen instead of opening a dialog wants that and nothing else.
 */
function PlannerDetails({ className, title, description, children }: PlannerDetailsProps) {
  const { selected, select, days, system, locale } = usePlanner('Planner.Details');
  const entries = selected ? entriesOn(days, selected) : [];

  const count =
    entries.length === 1 ? '1 entry' : `${entries.length} entries`;

  return (
    <Dialog open={selected !== null} onOpenChange={(open) => !open && select(null)}>
      <Dialog.Content className={cn('gap-3', className)}>
        <View className="gap-0.5">
          <Dialog.Title>
            {title ?? (selected ? calendarLongDate(selected, system, locale) : '')}
          </Dialog.Title>
          {description === null ? null : (
            <Dialog.Description>
              {description ?? (entries.length === 0 ? 'Nothing planned' : count)}
            </Dialog.Description>
          )}
        </View>
        {selected ? children(selected, entries) : null}
      </Dialog.Content>
    </Dialog>
  );
}
PlannerDetails.displayName = 'Planner.Details';

/* ------------------------------------------------------------------ *
 * Scroller
 * ------------------------------------------------------------------ */

/** How many weeks either side of the opening month a scroller reaches by default. */
const DEFAULT_SCROLLER_WEEKS = 53;

/** The height of one week row, and enough of it for a date and three entries. */
const DEFAULT_WEEK_HEIGHT = 96;

export interface PlannerScrollerProps {
  className?: string;
  /**
   * How many weeks either side of the opening month can be reached. Default
   * `53`, about a year each way.
   */
  weeks?: number;
  /** The height of one week row. Default `96`. */
  rowHeight?: number;
  /** Draws a cell yourself. It is handed the day and what falls on it. */
  renderDay?: PlannerDayRenderer;
}

/**
 * The weeks of the year, scrolled through rather than paged.
 *
 * A month grid answers "what does this month look like"; a scroller answers
 * "what is coming", which does not stop at the end of a month. The week
 * straddling the boundary is drawn once, in one piece, instead of appearing cut
 * in half at the bottom of one page and again at the top of the next.
 *
 * The range is bounded rather than endless. A scroller has to know its own
 * height to place a scrollbar and to jump to a month without rendering its way
 * there, and neither is possible over a list with no end.
 *
 * The month in the header follows the scroll: whichever month holds most of the
 * first week on screen is the one named, and the days either side of it grey
 * out. `Planner.Nav` and `Planner.Today` still work — they scroll the list
 * rather than replacing what is in it.
 */
function PlannerScroller({
  className,
  weeks: span = DEFAULT_SCROLLER_WEEKS,
  rowHeight = DEFAULT_WEEK_HEIGHT,
  renderDay,
}: PlannerScrollerProps) {
  const { month, syncMonth, weekStartsOn, locale, variant, system } =
    usePlanner('Planner.Scroller');
  const { week: weekRow, heading } = plannerVariants();
  const list = useRef<FlatList<Date>>(null);

  /*
   * The range is anchored where the planner opened and never rebuilt. Rebuilding
   * it around the current month would move every row's index under the scroll
   * position each time the month changed, which is the one thing a list being
   * scrolled must not do.
   */
  const [anchor] = useState(() => month);
  const range = useMemo(
    () => weekRange(anchor, weekStartsOn, span, span),
    [anchor, weekStartsOn, span]
  );

  const headings = useMemo(
    () => weekdayNames(locale, weekStartsOn, 'narrow'),
    [locale, weekStartsOn]
  );

  /*
   * Which month the scroll is showing, reported up but not acted on here. The
   * ref is what stops a scroll that stays inside one month from setting it over
   * and over, and what stops the scroll this component performs in answer to a
   * month change from reporting that same month straight back.
   */
  const reported = useRef(month.getTime());
  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0]?.item as Date | undefined;
    if (!first) return;
    const next = startOfCalendarMonth(weekAnchor(first), system, locale);
    if (next.getTime() === reported.current) return;
    reported.current = next.getTime();
    syncMonth(next);
  });

  /*
   * A month arriving from outside — the arrows, the Today pill, a controlled
   * prop — scrolls the list to it. A month the scroll itself just reported is
   * already there, and scrolling to it again would fight the finger.
   */
  useEffect(() => {
    if (month.getTime() === reported.current) return;
    reported.current = month.getTime();
    const index = weekIndex(range, month, weekStartsOn);
    if (index >= 0) list.current?.scrollToIndex({ index, animated: true });
  }, [month, range, weekStartsOn]);

  const initialIndex = Math.max(0, weekIndex(range, month, weekStartsOn));

  return (
    <View className={cn('flex-1', className)}>
      <View
        className={cn(weekRow(), 'px-1 pb-1')}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {headings.map((label, position) => (
          <Text key={position} size="xs" muted className={heading()}>
            {label.toUpperCase()}
          </Text>
        ))}
      </View>

      <FlatList
        ref={list}
        data={range}
        keyExtractor={(weekStart) => String(weekStart.getTime())}
        initialScrollIndex={initialIndex}
        // Every row is the same height, so the list can place any of them
        // without measuring — which is what makes jumping to a month cheap.
        getItemLayout={(_unused, index) => ({
          length: rowHeight,
          offset: rowHeight * index,
          index,
        })}
        onViewableItemsChanged={onViewable.current}
        viewabilityConfig={VIEWABILITY}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View
            className={cn(
              weekRow(),
              'border-t border-border px-1',
              variant === 'calendar' && 'items-stretch'
            )}
            style={{ height: rowHeight }}
          >
            {weekDays(item).map((date) => (
              <PlannerDay key={date.getTime()} date={date} renderDay={renderDay} />
            ))}
          </View>
        )}
      />
    </View>
  );
}
PlannerScroller.displayName = 'Planner.Scroller';

/*
 * The first row more than half on screen is the one that names the month. A
 * lower threshold hands the month over while the week is still mostly below the
 * fold, which reads as the header changing early.
 */
const VIEWABILITY = { itemVisiblePercentThreshold: 60 };

export const Planner = Object.assign(PlannerRoot, {
  Header: PlannerHeader,
  Title: PlannerTitle,
  Today: PlannerToday,
  Nav: PlannerNav,
  Action: PlannerAction,
  Grid: PlannerGrid,
  Scroller: PlannerScroller,
  Day: PlannerDay,
  Legend: PlannerLegend,
  Summary: PlannerSummary,
  Footer: PlannerFooter,
  Details: PlannerDetails,
});

export type { PlannerCountedCategory };
