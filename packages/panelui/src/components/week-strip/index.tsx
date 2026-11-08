/**
 * WeekStrip — one row of days to pick from.
 *
 * A schedule screen usually starts with the days of the week across the top:
 * press one and the list below it shows what is on that day. A month grid is
 * the wrong shape for that, because it spends five rows on weeks the screen is
 * not about.
 *
 * ```tsx
 * <WeekStrip value={day} onValueChange={setDay} marks={(date) => marksFor(date)} />
 * ```
 *
 * ## Two layouts
 *
 * By default the strip is the seven days of one week, in seven equal cells
 * that fill the row. `scroll` lays out a run of `length` days from `start`
 * instead, in cells of a fixed width that scroll sideways, for a picker that
 * reaches a few weeks ahead.
 *
 * ## What a day can say
 *
 * Every day is a rounded column with its weekday above its number. The
 * selected day's column is filled, and today's is ringed. Beneath the number a day can carry up to three dots in
 * different tones, or a short label in their place, and a small dot in its
 * corner for something that needs attention.
 *
 * `disabled` days are faded and cannot be pressed. `faded` days are faded
 * too but stay pressable: a day in the past that is still worth looking at is
 * not the same thing as a day that is closed.
 *
 * The week starts where the locale says it does with `weekStartsOn="auto"`,
 * the same way `Calendar` reads it, and the weekday names come from `locale`.
 */
import { forwardRef, useMemo } from 'react';
import { Pressable, ScrollView, View, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';
import {
  addDays,
  isSameDay,
  localeWeekStart,
  longDate,
  normalizeWeekStart,
  startOfDay,
  weekdayNames,
  type DateLocale,
} from '../../utils/date';
import type { ViewRef } from '../../primitives/refs';

/** The colour of a mark, from the theme's roles. */
export type WeekStripTone = 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'muted';

/** What a day shows beneath its number, and in its corner. */
export interface WeekStripMarks {
  /** Up to three dots, one per kind of thing on the day. */
  dots?: WeekStripTone[];
  /** A short label in place of the dots, such as "3 free". Wins over `dots`. */
  label?: string;
  /** A small dot in the top corner, for a day that needs attention. */
  corner?: WeekStripTone;
}

const TONE: Record<WeekStripTone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  info: 'bg-info',
  muted: 'bg-muted-foreground',
};

const weekStripVariants = tv({
  slots: {
    // Always the full row: seven equal columns need a width to share, and a
    // strip sized to its contents squeezes the weekday names until they wrap.
    root: 'w-full flex-row gap-1 self-stretch',
    cell: 'relative flex-1 items-center rounded-2xl border border-transparent',
    weekday: 'text-xs font-medium text-muted-foreground',
    number: 'font-semibold text-foreground',
    marks: 'h-3 flex-row items-center justify-center gap-1',
    dot: 'size-1.5 rounded-full',
    label: 'text-xs text-muted-foreground',
    corner: 'absolute end-1.5 top-1.5 size-1.5 rounded-full',
  },
  variants: {
    size: {
      sm: { cell: 'gap-0.5 py-2', number: 'text-base' },
      md: { cell: 'gap-1 py-2.5', number: 'text-lg' },
    },
    selected: {
      true: {
        cell: 'bg-primary',
        weekday: 'text-primary-foreground opacity-70',
        number: 'text-primary-foreground',
        label: 'text-primary-foreground opacity-80',
      },
    },
    today: {
      true: { cell: 'border-border bg-muted' },
    },
    dim: {
      true: { cell: 'opacity-40' },
    },
  },
  defaultVariants: { size: 'md' },
});

/** How big the strip's days are. */
export type WeekStripSize = NonNullable<VariantProps<typeof weekStripVariants>['size']>;

/** The width of one day when the strip scrolls, per size. */
const SCROLL_CELL: Record<WeekStripSize, number> = { sm: 48, md: 56 };

export interface WeekStripProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** The selected day. */
  value?: Date | null;
  /** Called with the day that was pressed. */
  onValueChange?: (day: Date) => void;
  /**
   * Which week to show, as any day inside it. Defaults to the week of `value`,
   * or this week. Ignored when `scroll` is set.
   */
  week?: Date;
  /**
   * Lay out `length` days from `start` in fixed-width cells that scroll
   * sideways, instead of the seven days of one week filling the row.
   */
  scroll?: boolean;
  /** The first day of a scrolling strip. Defaults to today. */
  start?: Date;
  /** How many days a scrolling strip holds. Default 14. */
  length?: number;
  /**
   * The first day of the week, 0 for Sunday to 6 for Saturday, or `auto` to
   * ask the locale. Default 0.
   */
  weekStartsOn?: number | 'auto';
  /** The locale for weekday names and spoken dates. Defaults to the device's. */
  locale?: DateLocale;
  /** How big the days are. `sm` suits a header; `md` is the default. */
  size?: WeekStripSize;
  /** Days that cannot be picked. They are faded and do not respond. */
  disabled?: (day: Date) => boolean;
  /** Days that are faded but can still be picked, such as days in the past. */
  faded?: (day: Date) => boolean;
  /** What each day shows beneath its number and in its corner. */
  marks?: (day: Date) => WeekStripMarks | undefined;
  /** The day counted as today. Defaults to the current date. */
  today?: Date;
}

export const WeekStrip = forwardRef<ViewRef, WeekStripProps>(
  (
    {
      className,
      value,
      onValueChange,
      week,
      scroll = false,
      start,
      length = 14,
      weekStartsOn = 0,
      locale,
      size = 'md',
      disabled,
      faded,
      marks,
      today: todayProp,
      ...props
    },
    ref
  ) => {
    const first = weekStartsOn === 'auto' ? localeWeekStart(locale) : normalizeWeekStart(weekStartsOn);
    const today = startOfDay(todayProp ?? new Date());
    // Indexed by `getDay()`, so a day of any week finds its own name.
    const names = useMemo(() => weekdayNames(locale, 0), [locale]);

    const anchor = (week ?? value ?? today).getTime();
    const startTime = (start ?? today).getTime();
    const days = useMemo(() => {
      if (scroll) {
        const from = startOfDay(new Date(startTime));
        return Array.from({ length: Math.max(1, Math.trunc(length)) }, (_unused, index) =>
          addDays(from, index)
        );
      }
      const day = startOfDay(new Date(anchor));
      const back = (day.getDay() - first + 7) % 7;
      const from = addDays(day, -back);
      return Array.from({ length: 7 }, (_unused, index) => addDays(from, index));
    }, [scroll, startTime, length, anchor, first]);

    const slots = weekStripVariants({ size });

    const cells = days.map((day) => {
      const selected = isSameDay(day, value);
      const isToday = isSameDay(day, today);
      const off = disabled?.(day) ?? false;
      const dim = off || (faded?.(day) ?? false);
      const mark = marks?.(day);
      const dots = (mark?.dots ?? []).slice(0, 3);
      const styles = weekStripVariants({ size, selected, today: isToday && !selected, dim });
      const spoken = [longDate(day, locale), mark?.label].filter(Boolean).join(', ');

      return (
        <Pressable
          key={day.getTime()}
          accessibilityRole="button"
          accessibilityLabel={spoken}
          accessibilityState={{ selected, disabled: off }}
          disabled={off}
          onPress={() => onValueChange?.(day)}
          style={scroll ? { width: SCROLL_CELL[size] } : undefined}
          className={cn(styles.cell(), scroll && 'flex-none')}
        >
          <Text numberOfLines={1} className={styles.weekday()}>
            {names[day.getDay()]}
          </Text>
          <Text className={styles.number()}>{day.getDate()}</Text>
          <View className={styles.marks()}>
            {mark?.label ? (
              <Text numberOfLines={1} className={styles.label()}>
                {mark.label}
              </Text>
            ) : (
              dots.map((tone, index) => (
                // On the selected fill a tone could vanish into it, so every
                // dot takes the fill's own foreground there.
                <View
                  key={index}
                  className={cn(styles.dot(), selected ? 'bg-primary-foreground' : TONE[tone])}
                />
              ))
            )}
          </View>
          {mark?.corner ? (
            <View
              className={cn(styles.corner(), selected ? 'bg-primary-foreground' : TONE[mark.corner])}
            />
          ) : null}
        </Pressable>
      );
    });

    if (scroll) {
      const selectedIndex = days.findIndex((day) => isSameDay(day, value));
      return (
        <View ref={ref} className={cn('w-full self-stretch', className)} {...props}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            // Opens with the selected day in view rather than at the far end.
            contentOffset={{ x: Math.max(0, selectedIndex) * SCROLL_CELL[size], y: 0 }}
            contentContainerClassName={slots.root()}
          >
            {cells}
          </ScrollView>
        </View>
      );
    }

    return (
      <View ref={ref} className={slots.root({ className })} {...props}>
        {cells}
      </View>
    );
  }
);

WeekStrip.displayName = 'WeekStrip';
