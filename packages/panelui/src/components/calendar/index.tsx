/**
 * Calendar — a month of days, for picking one, several, or a range.
 *
 * ```tsx
 * const [day, setDay] = useState<Date>();
 *
 * <Calendar mode="single" selected={day} onSelect={setDay} />
 * ```
 *
 * ## The grid is always six weeks
 *
 * A month needs five rows or six depending on what day it starts on. Drawing
 * only the rows a month uses makes the calendar change height as it is paged
 * through — everything below it jumps, and the days themselves appear to shift
 * between months. So the grid is six rows always, and the spare cells hold the
 * neighbouring months' days.
 *
 * ## How a range is drawn
 *
 * On the web the band under a selected range is one background with the ends
 * rounded by `:first-child` and `:last-child`. There are no pseudo-classes
 * here, so each cell draws its own piece of the band as a view *behind* the
 * number, and works out for itself where that piece has to stop.
 *
 * Two questions, and they are not the same one:
 *
 * - **How wide.** A day between the two ends fills its cell, so the pieces meet
 *   and the band reads as continuous. An end fills half its cell, from the
 *   centre outwards towards the middle of the range — the half that is not
 *   covered by the disc, so the disc appears to sit *on* the band rather than
 *   beside it. That is the join the old three-piece version never made, which
 *   is why a range used to read as two discs with a gap and a stripe.
 * - **Where it is rounded.** Only where it genuinely stops: at an end of the
 *   range, or at the edge of a row, because a range running over a weekend has
 *   to close off on Saturday and open again on Sunday rather than trailing into
 *   the gap between the two.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Pressable, ScrollView, View, type ViewProps } from 'react-native';
import { tv } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../../icons';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { Popover } from '../popover';
import {
  addCalendarMonths,
  calendarDayNumber,
  calendarLongDate,
  calendarMonthLabel,
  calendarMonthNames,
  calendarParts,
  clampDate,
  isAfter,
  isBefore,
  isSameCalendarMonth,
  isSameDay,
  isWithin,
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
import type { ScrollViewRef } from '../../primitives/refs';

export type CalendarMode = 'single' | 'multiple' | 'range';
export type CalendarCaptionLayout = 'label' | 'dropdown';

/** A range under construction: `to` is undefined between the two taps. */
export interface DateRange {
  from: Date;
  to?: Date;
}

/**
 * What a `mode` selects. Written as a map so the root, the parts and the
 * caller all read the same association rather than each casting their own way.
 */
export interface CalendarSelection {
  single: Date | undefined;
  multiple: Date[];
  range: DateRange | undefined;
}

/**
 * Which days cannot be picked. A list, a span, or a rule — a rule because
 * "no weekends" and "not in the past" are the two most common cases and
 * neither can be written as a list that stays right tomorrow.
 */
export type CalendarDisabled =
  | Date[]
  | { from: Date; to: Date }
  | ((date: Date) => boolean);

/**
 * The corner radius of a day, and so of the band that runs between days.
 *
 * A number rather than a class because the band's four corners are set
 * independently from the flags below, which no single `rounded-*` can express.
 */
const DAY_RADIUS = 8;

const calendarVariants = tv({
  slots: {
    root: 'gap-3',
    header: 'h-10 flex-row items-center justify-between gap-2',
    nav: 'h-8 w-8 items-center justify-center rounded-full',
    caption: 'flex-1 flex-row items-center justify-center gap-1',
  },
  variants: {
    /** Draw the calendar's own panel, for one standing on the page. */
    bordered: {
      true: { root: 'rounded-3xl border border-border bg-card p-3' },
    },
  },
  defaultVariants: {
    bordered: true,
  },
});

const dayVariants = tv({
  slots: {
    cell: 'h-10 flex-1 items-center justify-center',
    /** The range band, drawn behind the number so it can run cell to cell. */
    band: 'absolute inset-y-0.5 bg-accent',
    /**
     * The fill on a selected day, or the ring on today. Square-ish rather than
     * round: a circle has one point of contact with the band beside it, so a
     * range reads as beads on a string. A rounded rectangle meets the band
     * along its whole edge and the two become one shape.
     */
    disc: 'h-9 w-9 items-center justify-center rounded-lg',
    label: 'text-sm',
  },
  variants: {
    selected: { true: { disc: 'bg-primary', label: 'text-primary-foreground' } },
    today: { true: { disc: 'border border-primary', label: 'text-primary' } },
    outside: { true: { label: 'text-muted-foreground/40' } },
    disabled: { true: { label: 'text-muted-foreground/30' } },
    /** A ruled-out day inside a range still sits on it, but faintly. */
    fadedBand: { true: { band: 'opacity-40' } },
  },
  compoundVariants: [
    // A selected day inside a range keeps the solid fill; the band passes
    // under it rather than the disc losing to it.
    { selected: true, today: true, class: { label: 'text-primary-foreground' } },
  ],
});

interface CalendarContextValue {
  month: Date;
  setMonth: (month: Date) => void;
  locale: DateLocale;
  /** Already resolved — `auto` is settled once, at the root. */
  system: 'gregory' | 'islamic';
  minDate?: Date;
  maxDate?: Date;
  /** Bounds for the caption's pickers, which are not the selectable bounds. */
  startMonth?: Date;
  endMonth?: Date;
  captionLayout: CalendarCaptionLayout;
}

const CalendarContext = createContext<CalendarContextValue | null>(null);

function useCalendar(component: string): CalendarContextValue {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error(`${component} must be used within a <Calendar>`);
  }
  return context;
}

/**
 * Today, kept current.
 *
 * "Today" is not a constant, and a calendar is exactly the kind of thing left
 * on screen across the boundary that changes it — a picker open in a sheet, an
 * app resumed the next morning. Recomputed when the app comes back to the
 * foreground, which is when a stale answer would otherwise become visible, and
 * held as state so the marker actually moves when it does.
 */
function useToday(): Date {
  const [today, setToday] = useState(() => startOfDay(new Date()));

  useEffect(() => {
    const refresh = () => {
      const now = startOfDay(new Date());
      // A new object every resume would invalidate every memo below it for a
      // date that has not changed.
      setToday((current) => (current.getTime() === now.getTime() ? current : now));
    };

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, []);

  return today;
}

/** Whether a rule, a list or a span rules this day out. */
function isDisabled(
  date: Date,
  disabled: CalendarDisabled | undefined,
  minDate: Date | undefined,
  maxDate: Date | undefined
): boolean {
  /*
   * Both bounds are compared at local midnight, because they are about days
   * and the caller almost always hands over a moment. `minDate={new Date()}`
   * means "from today", and against a raw timestamp that would rule out every
   * hour of today that has already passed — which is to say, today.
   */
  if (minDate && isBefore(date, startOfDay(minDate))) return true;
  if (maxDate && isAfter(date, startOfDay(maxDate))) return true;
  if (!disabled) return false;
  if (typeof disabled === 'function') return disabled(date);
  if (Array.isArray(disabled)) return disabled.some((day) => isSameDay(day, date));
  return isWithin(date, disabled.from, disabled.to);
}

export interface CalendarProps<Mode extends CalendarMode = 'single'>
  extends Omit<ViewProps, 'children'> {
  className?: string;
  /** One day, several, or a span with two ends. */
  mode?: Mode;
  /** Controlled selection. Its shape follows `mode`. */
  selected?: CalendarSelection[Mode];
  /** Starting selection when uncontrolled. */
  defaultSelected?: CalendarSelection[Mode];
  onSelect?: (selected: CalendarSelection[Mode]) => void;
  /** Controlled visible month. Any day inside it will do. */
  month?: Date;
  /** Month shown first when uncontrolled. Defaults to the selection, or today. */
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  /** Months side by side. Two is what picking a range across a boundary wants. */
  numberOfMonths?: number;
  /**
   * `dropdown` turns the caption into month and year pickers, which is the
   * difference between choosing a birthday in four taps and in four hundred.
   */
  captionLayout?: CalendarCaptionLayout;
  /** Days that cannot be picked: a list, a span, or a rule. */
  disabled?: CalendarDisabled;
  /** Earliest selectable day. Also stops the caption paging back past it. */
  minDate?: Date;
  /** Latest selectable day. */
  maxDate?: Date;
  /**
   * Earliest month the caption's pickers offer. Defaults to `minDate`, and to
   * a hundred years back when there is none.
   *
   * Separate from `minDate` because they answer different questions: `minDate`
   * is about which days can be picked, this is about how far the month and year
   * lists reach. A birthday picker wants a century of years on offer and no
   * bound at all on the days inside them.
   */
  startMonth?: Date;
  /** Latest month the caption's pickers offer. Defaults to `maxDate`, else ten years on. */
  endMonth?: Date;
  /**
   * Which day the week's first column is. `0` is Sunday.
   *
   * `auto` asks the locale, which is what most of the world wants — `en-GB` and
   * `fr-FR` start on Monday, and a calendar that says otherwise is wrong in a
   * way its reader notices immediately. It is not the default only because
   * changing an existing calendar's columns out from under it is not something
   * a version bump should do. Out-of-range numbers wrap rather than producing
   * a blank column.
   */
  weekStartsOn?: number | 'auto';
  /** Draw the neighbouring months' days rather than leaving the cells blank. */
  showOutsideDays?: boolean;
  /**
   * Let a tap on a neighbouring month's day select it. Off by default: those
   * cells exist to keep the grid six rows tall, and a tap on one is far more
   * often a misfire than an attempt to reach into July from June. Paging to the
   * month is the way to pick a day in it.
   */
  selectOutsideDays?: boolean;
  /**
   * Draw the calendar's own panel — a rounded, bordered card. On by default,
   * for a calendar standing on a page. Turn it off when it is already inside
   * something that draws one, which is what `DatePicker` does.
   */
  bordered?: boolean;
  /** BCP 47 tag for the month and weekday names. The device's own by default. */
  locale?: DateLocale;
  /**
   * Which calendar the months and the day numbers are counted in.
   *
   * `gregory` by default rather than `auto`: a grid whose month boundaries move
   * with the device's language is a surprise, and it is the caller — not the
   * locale — who knows whether the dates being picked are Hijri ones. `auto`
   * follows the locale for the cases where they are the same question.
   */
  calendar?: CalendarSystem;
}

function CalendarRoot<Mode extends CalendarMode = 'single'>({
  className,
  mode = 'single' as Mode,
  selected,
  defaultSelected,
  onSelect,
  month: monthProp,
  defaultMonth,
  onMonthChange,
  numberOfMonths = 1,
  captionLayout = 'label',
  disabled,
  minDate,
  maxDate,
  startMonth,
  endMonth,
  weekStartsOn: weekStartsOnProp = 0,
  showOutsideDays = true,
  selectOutsideDays = false,
  bordered = true,
  locale,
  calendar = 'gregory',
  ...props
}: CalendarProps<Mode>) {
  // Settled once here rather than at each call site, so every part of the
  // grid is certainly reading the same calendar.
  const system = useMemo(() => resolveCalendar(calendar, locale), [calendar, locale]);
  // Settled once too, and normalised: everything below indexes an array of
  // seven with it, where a negative or out-of-range value is a blank column
  // rather than an error anyone would trace back to here.
  const weekStartsOn = useMemo(
    () =>
      weekStartsOnProp === 'auto'
        ? localeWeekStart(locale)
        : normalizeWeekStart(weekStartsOnProp),
    [weekStartsOnProp, locale]
  );
  const [internalSelected, setInternalSelected] = useState<CalendarSelection[Mode] | undefined>(
    defaultSelected
  );
  const isControlled = selected !== undefined;
  const value = (isControlled ? selected : internalSelected) as CalendarSelection[Mode];

  /**
   * The month to open on: whatever is selected, so a picker reopened on a date
   * chosen last year does not land on today and make it look unselected.
   */
  const initialMonth = useMemo(() => {
    if (defaultMonth) return startOfCalendarMonth(defaultMonth, system, locale);
    const first =
      value instanceof Date
        ? value
        : Array.isArray(value)
          ? value[0]
          : value && typeof value === 'object' && 'from' in value
            ? (value as DateRange).from
            : undefined;
    return startOfCalendarMonth(first ?? new Date(), system, locale);
    // Only the first render decides this; after that the month is its own state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [internalMonth, setInternalMonth] = useState(initialMonth);
  /*
   * Memoised on the *instant*, not on the prop. A controlled caller almost
   * always passes a fresh `new Date(…)`, and deriving a new month object from
   * it on every render invalidates the grid memo and the context memo below —
   * so a calendar that has not moved rebuilds forty-two cells per keystroke
   * somewhere else on the screen.
   */
  const controlledMonth = useMemo(
    () => (monthProp ? startOfCalendarMonth(monthProp, system, locale) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monthProp?.getTime(), system, locale]
  );
  const month = controlledMonth ?? internalMonth;

  /*
   * How far the calendar may be paged, as the first day of the outermost month
   * either way. `startMonth`/`endMonth` win where they are given, because they
   * are the props about *navigation*; `minDate`/`maxDate` are about which days
   * can be picked, and stand in when the navigation bounds are not stated.
   */
  const monthBounds = useMemo(() => {
    const lower = startMonth ?? minDate;
    const upper = endMonth ?? maxDate;
    return {
      from: lower ? startOfCalendarMonth(lower, system, locale) : undefined,
      to: upper ? startOfCalendarMonth(upper, system, locale) : undefined,
    };
  }, [startMonth, minDate, endMonth, maxDate, system, locale]);

  const setMonth = useCallback(
    (next: Date) => {
      /*
       * Clamped here rather than only at the arrows. The arrows guard
       * themselves, but the caption's dropdowns and a controlled caller both
       * reach this by other routes — and a month list that offers a year is a
       * poor place to discover that the year was out of bounds.
       */
      const settled = clampDate(
        startOfCalendarMonth(next, system, locale),
        monthBounds.from,
        monthBounds.to
      );
      if (!monthProp) setInternalMonth(settled);
      onMonthChange?.(settled);
    },
    [monthProp, onMonthChange, system, locale, monthBounds]
  );

  const commit = useCallback(
    (next: CalendarSelection[Mode]) => {
      if (!isControlled) setInternalSelected(next);
      onSelect?.(next);
    },
    [isControlled, onSelect]
  );

  const select = useCallback(
    (date: Date) => {
      const day = startOfDay(date);

      /*
       * A tap on a neighbouring month's cell — which only happens with
       * `selectOutsideDays` — commits a date the grid is not showing. Page to
       * it, or the selection lands in a greyed-out cell of the month you are
       * still looking at and reads as having missed.
       */
      if (!isSameCalendarMonth(day, month, system, locale)) setMonth(day);

      if (mode === 'multiple') {
        const current = (value as Date[] | undefined) ?? [];
        const without = current.filter((picked) => !isSameDay(picked, day));
        const next = without.length === current.length ? [...current, day] : without;
        commit(next as CalendarSelection[Mode]);
        return;
      }

      if (mode === 'range') {
        const current = value as DateRange | undefined;
        /*
         * Three states, not two: no range, half a range, a whole range. A tap
         * with half a range open closes it — unless it landed before the open
         * end, in which case it becomes the new start. Anything else would ask
         * someone who picked the wrong month first to undo before retrying.
         */
        if (!current || current.to || isBefore(day, current.from)) {
          commit({ from: day } as CalendarSelection[Mode]);
        } else {
          commit({ from: current.from, to: day } as CalendarSelection[Mode]);
        }
        return;
      }

      // Single. Tapping the selected day again clears it.
      const current = value as Date | undefined;
      commit((isSameDay(current, day) ? undefined : day) as CalendarSelection[Mode]);
    },
    [mode, value, commit, month, system, locale, setMonth]
  );

  const context = useMemo(
    () => ({
      month,
      setMonth,
      locale,
      system,
      minDate,
      maxDate,
      startMonth,
      endMonth,
      captionLayout,
    }),
    [month, setMonth, locale, system, minDate, maxDate, startMonth, endMonth, captionLayout]
  );

  const { root } = calendarVariants({ bordered });
  const months = Math.max(1, numberOfMonths);

  return (
    <CalendarContext.Provider value={context}>
      <View {...props} className={cn(root(), className)}>
        {Array.from({ length: months }, (_unused, offset) => (
          <View key={offset} className="gap-2">
            <CalendarHeader offset={offset} lastOffset={months - 1} />
            <CalendarGrid
              month={addCalendarMonths(month, offset, system, locale)}
              mode={mode}
              value={value}
              onSelect={select}
              disabled={disabled}
              minDate={minDate}
              maxDate={maxDate}
              weekStartsOn={weekStartsOn}
              showOutsideDays={showOutsideDays}
              selectOutsideDays={selectOutsideDays}
              locale={locale}
              system={system}
            />
          </View>
        ))}
      </View>
    </CalendarContext.Provider>
  );
}
CalendarRoot.displayName = 'Calendar';

/* -------------------------------------------------------------------------- */
/* Caption                                                                    */
/* -------------------------------------------------------------------------- */

export interface CalendarHeaderProps {
  /** Which month of the run this header sits over. `0` is the first. */
  offset?: number;
  /** The last offset in the run, so the header knows whether it owns the arrow. */
  lastOffset?: number;
}

/**
 * The row over a month: an arrow at each edge and the month's name between
 * them.
 *
 * The arrows are pinned to the edges of the calendar rather than packed around
 * the label, so the two targets are as far apart as the panel allows and the
 * name sits centred over its own grid. With several months shown they are split
 * across the run — back on the first, forward on the last — because both sets
 * on both headers would page the whole run and give two ways to do one thing.
 * The month that owns neither still lays out a spacer, or its name would slide
 * off centre.
 */
function CalendarHeader({ offset = 0, lastOffset = 0 }: CalendarHeaderProps) {
  const { month, setMonth, locale, system, minDate, maxDate, captionLayout } =
    useCalendar('Calendar.Header');
  const { header, caption } = calendarVariants();
  const shown = addCalendarMonths(month, offset, system, locale);

  const canGoBack =
    !minDate || isBefore(startOfCalendarMonth(minDate, system, locale), month);
  const canGoForward =
    !maxDate || isAfter(startOfCalendarMonth(maxDate, system, locale), shown);

  return (
    <View className={header()}>
      {offset === 0 ? (
        <CalendarNav
          direction="previous"
          disabled={!canGoBack}
          onPress={() => setMonth(addCalendarMonths(month, -1, system, locale))}
        />
      ) : (
        <View className="h-8 w-8" />
      )}

      <View className={caption()}>
        {captionLayout === 'dropdown' ? (
          <CalendarDropdowns month={shown} offset={offset} />
        ) : (
          <Text weight="semibold" className="text-base">
            {calendarMonthLabel(shown, system, locale)}
          </Text>
        )}
      </View>

      {offset === lastOffset ? (
        <CalendarNav
          direction="next"
          disabled={!canGoForward}
          onPress={() => setMonth(addCalendarMonths(month, 1, system, locale))}
        />
      ) : (
        <View className="h-8 w-8" />
      )}
    </View>
  );
}

export interface CalendarNavProps {
  direction: 'previous' | 'next';
  disabled?: boolean;
  onPress?: () => void;
}

/**
 * One paging arrow.
 *
 * Borderless: two bordered squares at the ends of a bordered panel read as a
 * row of boxes rather than as controls, and the chevron is legible enough on
 * its own. The target is still 32px with another 8 of slop around it.
 */
function CalendarNav({ direction, disabled = false, onPress }: CalendarNavProps) {
  const { nav } = calendarVariants();

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={direction === 'next' ? 'Next month' : 'Previous month'}
      accessibilityState={{ disabled }}
      className={cn(nav(), disabled ? 'opacity-30' : 'active:bg-accent')}
    >
      {direction === 'next' ? <ChevronRightIcon size={18} /> : <ChevronLeftIcon size={18} />}
    </Pressable>
  );
}

/**
 * Month and year as chips that open a panel of options.
 *
 * The panel floats rather than opening in place, and the caption is the reason:
 * it is a fixed-height row, so a list opened inside it has nowhere to go and
 * spills over the grid below. A popover is laid out against the chip and
 * clamped to the screen, which is the behaviour this needs and already has.
 *
 * Native pickers are still the wrong tool — a platform overlay on top of a
 * calendar that is itself already in a popover is two floating layers deep for
 * choosing a number, and it cannot show a Hijri year at all.
 */
function CalendarDropdowns({ month, offset }: { month: Date; offset: number }) {
  const { setMonth, locale, system, minDate, maxDate, startMonth, endMonth } =
    useCalendar('Calendar.Caption');

  /*
   * Everything here counts in the calendar on screen, not in the platform's.
   * The names come from a real year of that calendar rather than from twelve
   * Gregorian firsts, and the year list is that calendar's years — a Hijri
   * caption offering Gregorian years is choosing from the wrong set.
   */
  const months = useMemo(
    () => calendarMonthNames(month, system, locale, 'short'),
    [month, system, locale]
  );
  const current = calendarParts(month, system, locale);
  /*
   * `startMonth`/`endMonth` bound the lists, falling back to the selectable
   * bounds and then to a century back and a decade on. They are separate props
   * because the two questions are different: a birthday picker wants a hundred
   * years on offer and no bound at all on the days inside them.
   */
  const first = startMonth ?? minDate;
  const last = endMonth ?? maxDate;
  const firstParts = first ? calendarParts(first, system, locale) : null;
  const lastParts = last ? calendarParts(last, system, locale) : null;
  const bounds = {
    from: firstParts ? firstParts.year : current.year - 100,
    to: lastParts ? lastParts.year : current.year + 10,
  };
  /*
   * The month list is bounded too, and only the year list used to be — so a
   * calendar starting in March 1925 still offered January and February of 1925,
   * and picking one navigated somewhere the calendar had said it would not go.
   * Only the outermost year of each bound loses months; every year between them
   * has all twelve.
   */
  const monthOptions = months
    .map((label, index) => ({ label, month: index + 1 }))
    .filter(({ month }) => {
      if (firstParts && current.year === firstParts.year && month < firstParts.month) {
        return false;
      }
      if (lastParts && current.year === lastParts.year && month > lastParts.month) {
        return false;
      }
      return true;
    });
  /*
   * Oldest first, the way a year runs. The list is long — a century by default
   * — so it is opened scrolled to the year already in the caption rather than
   * to either end, which is what makes the natural order affordable. Counting
   * backwards was a way of putting the likely years at the top of a list that
   * always opened at the top; it is not needed once the list opens in the right
   * place, and it made every other use of the picker read upside down.
   */
  const years = Array.from(
    { length: Math.max(1, bounds.to - bounds.from + 1) },
    (_unused, index) => bounds.from + index
  );

  /*
   * Navigated by months rather than by building a date, because there is no
   * `new Date(hijriYear, hijriMonth)`. A Hijri year is always twelve months,
   * so a year jump is twelve of them.
   */
  const choose = (months_: number) => {
    setMonth(addCalendarMonths(month, months_ - offset, system, locale));
  };

  return (
    <>
      <CaptionDropdown
        label={months[current.month - 1] ?? String(current.month)}
        accessibilityLabel="Month"
        options={monthOptions.map((option) => option.label)}
        active={monthOptions.findIndex((option) => option.month === current.month)}
        width={MONTH_LIST_WIDTH}
        onSelect={(index) => choose((monthOptions[index]?.month ?? current.month) - current.month)}
      />
      <CaptionDropdown
        label={String(current.year)}
        accessibilityLabel="Year"
        options={years.map(String)}
        active={years.indexOf(current.year)}
        width={YEAR_LIST_WIDTH}
        onSelect={(index) => choose((years[index]! - current.year) * 12)}
      />
    </>
  );
}

/** Panel widths. A month name needs the room; a four-digit year does not. */
const MONTH_LIST_WIDTH = 176;
const YEAR_LIST_WIDTH = 132;

/**
 * Height of one option row, and the tallest the list is allowed to be.
 *
 * The row height is a constant rather than a measurement because it is what
 * turns "the twenty-ninth option" into a scroll offset, and that has to be
 * known before the list has laid out — the whole point is that it opens in the
 * right place rather than scrolling there afterwards.
 */
const OPTION_HEIGHT = 40;
const LIST_MAX_HEIGHT = OPTION_HEIGHT * 6.5;

/**
 * One chip and the list of options it opens.
 *
 * A list, not a grid of chips. Twelve months tile into a panel well enough, but
 * the same treatment applied to a century of years is a wall of four-digit
 * numbers with no order the eye can follow — and it opened at whichever end
 * happened to be first. Rows in a column read as a list, take a checkmark, and
 * can be scrolled to a particular one.
 */
function CaptionDropdown({
  label,
  accessibilityLabel,
  options,
  active,
  width,
  onSelect,
}: {
  label: string;
  accessibilityLabel: string;
  options: string[];
  /** Index of the option currently in the caption, or -1 for none. */
  active: number;
  width: number;
  onSelect: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const list = useRef<ScrollViewRef>(null);
  /*
   * The check is given a colour rather than left to its own fallback, which is
   * white — right inside a filled control, invisible on this panel.
   */
  const rawTick = useCSSVariable('--color-foreground');
  const tick = typeof rawTick === 'string' ? rawTick : undefined;

  /*
   * Opened on the option already in the caption, centred in the panel rather
   * than pinned to an edge so the years either side of it are in view too. A
   * hundred-item list that opens at the top is showing the one year nobody came
   * to pick, and asks for a flick through a century to reach the one they did.
   */
  const scrollToActive = useCallback(() => {
    if (active < 0) return;
    const centred = active * OPTION_HEIGHT - LIST_MAX_HEIGHT / 2 + OPTION_HEIGHT / 2;
    list.current?.scrollTo({ y: Math.max(0, centred), animated: false });
  }, [active]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <CaptionChip label={label} expanded={open} accessibilityLabel={accessibilityLabel} />
      </Popover.Trigger>
      <Popover.Content align="center" width={width} className="p-1.5">
        <ScrollView
          ref={list}
          bounces={false}
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: LIST_MAX_HEIGHT }}
          // Fires once the rows exist, which is the first moment there is
          // anything to scroll. Doing it on mount would scroll an empty list.
          onContentSizeChange={scrollToActive}
        >
          {options.map((option, index) => {
            const selected = index === active;
            return (
              <Pressable
                key={option}
                onPress={() => {
                  onSelect(index);
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={{ height: OPTION_HEIGHT }}
                className={cn(
                  'flex-row items-center justify-between gap-2 rounded-xl px-3',
                  selected ? 'bg-accent' : 'active:bg-accent'
                )}
              >
                <Text size="sm" weight={selected ? 'semibold' : 'normal'}>
                  {option}
                </Text>
                {selected ? <CheckIcon size={16} color={tick} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </Popover.Content>
    </Popover>
  );
}

function CaptionChip({
  label,
  expanded,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  expanded: boolean;
  accessibilityLabel: string;
  /** Supplied by `Popover.Trigger`, which clones this to open the panel. */
  onPress?: (...args: unknown[]) => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ expanded }}
      className="flex-row items-center gap-1 rounded-lg px-2 py-1.5 active:bg-accent"
    >
      <Text weight="semibold">{label}</Text>
      {/*
        The chevron says the chip opens something. Without it a bold word in the
        middle of a header is indistinguishable from the plain caption layout,
        and nobody thinks to press it.
      */}
      <ChevronDownIcon size={14} />
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */
/* Grid                                                                       */
/* -------------------------------------------------------------------------- */

interface GridProps {
  month: Date;
  mode: CalendarMode;
  value: unknown;
  onSelect: (date: Date) => void;
  disabled?: CalendarDisabled;
  minDate?: Date;
  maxDate?: Date;
  weekStartsOn: number;
  showOutsideDays: boolean;
  selectOutsideDays?: boolean;
  locale: DateLocale;
  system: 'gregory' | 'islamic';
}

function CalendarGrid({
  month,
  mode,
  value,
  onSelect,
  disabled,
  minDate,
  maxDate,
  weekStartsOn,
  showOutsideDays,
  selectOutsideDays = false,
  locale,
  system,
}: GridProps) {
  /*
   * Six rows of consecutive days, anchored on the first of *this* calendar's
   * month. Weekdays are shared between the two calendars — only the month
   * boundaries and the day numbers differ — so the walk itself is the same
   * either way and only where it starts moves.
   */
  const weeks = useMemo(
    () => monthGrid(month, weekStartsOn, system, locale),
    [month, weekStartsOn, system, locale]
  );
  const headings = useMemo(() => weekdayNames(locale, weekStartsOn), [locale, weekStartsOn]);
  const today = useToday();

  const range = mode === 'range' ? (value as DateRange | undefined) : undefined;
  const multiple = mode === 'multiple' ? ((value as Date[] | undefined) ?? []) : [];
  const single = mode === 'single' ? (value as Date | undefined) : undefined;

  return (
    // React Native has no `grid` role, so the month announces itself as a list
    // of days and each day carries its own full date as its label.
    <View accessibilityRole="list" className="gap-1">
      <View className="flex-row">
        {headings.map((heading) => (
          <Text key={heading} size="xs" muted className="flex-1 text-center">
            {heading}
          </Text>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} className="flex-row">
          {week.map((date, dayIndex) => {
            const outside = !isSameCalendarMonth(date, month, system, locale);
            if (outside && !showOutsideDays) {
              // A spacer, not nothing: the row has to stay seven wide or the
              // columns stop lining up with their headings.
              return <View key={dayIndex} className="h-10 flex-1" />;
            }

            const isStart = mode === 'range' && isSameDay(date, range?.from);
            const isEnd = mode === 'range' && isSameDay(date, range?.to);

            const selected =
              mode === 'range'
                ? isStart || isEnd
                : mode === 'multiple'
                  ? multiple.some((picked) => isSameDay(picked, date))
                  : isSameDay(date, single);

            /*
             * Inclusive of both ends, unlike the old middles-only rule. An end
             * has to carry its half of the band or there is a gap between the
             * disc and the run beside it — which is precisely what made a range
             * read as two discs with a stripe floating between them.
             */
            const inRange = !!range?.to && isWithin(date, range.from, range.to);

            /*
             * Whether the band carries on past this cell's edge into the one
             * beside it. It stops at an end of the range, and at the edge of a
             * row — a range over a weekend closes on Saturday and opens again
             * on Sunday rather than trailing into the gap between the rows.
             */
            const openStart = inRange && !isStart && dayIndex > 0;
            const openEnd = inRange && !isEnd && dayIndex < 6;

            // A neighbouring month's day is drawn, not offered. Reaching into
            // July from June is what the arrows are for.
            const ruledOut =
              isDisabled(date, disabled, minDate, maxDate) ||
              (outside && !selectOutsideDays);

            return (
              <CalendarDay
                key={dayIndex}
                date={date}
                outside={outside}
                selected={selected}
                inRange={inRange}
                rangeStart={isStart}
                rangeEnd={isEnd}
                today={isSameDay(date, today)}
                disabled={ruledOut}
                openStart={openStart}
                openEnd={openEnd}
                locale={locale}
                system={system}
                onPress={() => onSelect(date)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

interface DayProps {
  date: Date;
  outside: boolean;
  selected: boolean;
  /** Anywhere inside the range, ends included. */
  inRange: boolean;
  rangeStart?: boolean;
  rangeEnd?: boolean;
  today: boolean;
  disabled: boolean;
  /** The band carries on past this cell's leading edge. */
  openStart: boolean;
  /** The band carries on past this cell's trailing edge. */
  openEnd: boolean;
  locale: DateLocale;
  system: 'gregory' | 'islamic';
  onPress: () => void;
}

function CalendarDay({
  date,
  outside,
  selected,
  inRange,
  rangeStart = false,
  rangeEnd = false,
  today,
  disabled,
  openStart,
  openEnd,
  locale,
  system,
  onPress,
}: DayProps) {
  const styles = dayVariants({
    selected,
    today: today && !selected,
    outside,
    disabled,
    fadedBand: disabled && inRange,
  });

  /*
   * An end of the range fills half its cell, from the centre outwards towards
   * the rest of the range; every other day in it fills the whole cell. Half a
   * cell is what puts the band underneath the disc rather than beside it — the
   * disc is centred, so a band starting at the centre emerges from behind it
   * and the two read as one shape. A range of one day gets both halves and so
   * no band at all, which is right: there is nothing to span.
   */
  const bandStyle = inRange
    ? {
        left: rangeStart ? ('50%' as const) : 0,
        right: rangeEnd ? ('50%' as const) : 0,
        borderTopLeftRadius: openStart ? 0 : DAY_RADIUS,
        borderBottomLeftRadius: openStart ? 0 : DAY_RADIUS,
        borderTopRightRadius: openEnd ? 0 : DAY_RADIUS,
        borderBottomRightRadius: openEnd ? 0 : DAY_RADIUS,
      }
    : null;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={calendarLongDate(date, system, locale)}
      accessibilityState={{ selected, disabled }}
      className={styles.cell()}
    >
      {bandStyle ? <View className={styles.band()} style={bandStyle} /> : null}
      <View className={styles.disc()}>
        <Text className={styles.label()}>
          {calendarDayNumber(date, system, locale)}
        </Text>
      </View>
    </Pressable>
  );
}

export const Calendar = Object.assign(CalendarRoot, {
  Header: CalendarHeader,
  Nav: CalendarNav,
  Grid: CalendarGrid,
  Day: CalendarDay,
});
