/**
 * WeekHoursGrid — a week of hours, one row per day.
 *
 * Each row is a bar across the visible hours, with the taken parts of the day
 * filled in: the hours a trainer works, the sessions already booked in a room,
 * a person's shift. Reading down the rows compares the days; reading along one
 * shows where its gaps are.
 *
 * ```tsx
 * <WeekHoursGrid
 *   from={6}
 *   to={22}
 *   ticks={[6, 10, 14, 18, 22]}
 *   rows={[{ key: 'mon', label: 'Mon', blocks: [{ start: 9, end: 12 }] }]}
 * />
 * ```
 *
 * ## Hours, not times
 *
 * Positions are hours as numbers, so 9.5 is half past nine and the grid needs
 * no date library. `from` and `to` set the visible range; a block reaching
 * outside it is cut at the edge, and one wholly outside it is not drawn.
 * Blocks are placed in percent, so the grid works at any width.
 *
 * ## Rows need not be days
 *
 * A row is a key, a label and its blocks, so the same grid holds a shift plan
 * with one row per person. A row marked `off` is drawn faded with no blocks,
 * and a `selected` row is outlined.
 *
 * ## Pressing a row
 *
 * With `onSelect` each row is a button, and a screen reader hears its label
 * and every block read out as a range of times.
 */
import { forwardRef } from 'react';
import { Pressable, View, type ViewProps } from 'react-native';
import { tv } from 'tailwind-variants';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';
import type { ViewRef } from '../../primitives/refs';

/** The colour of a block, from the theme's roles. */
export type WeekHoursTone = 'primary' | 'muted' | 'success' | 'warning' | 'destructive' | 'info';

/** One filled stretch of a row. */
export interface WeekHoursBlock {
  /** Where it starts, in hours: 9.5 is half past nine. */
  start: number;
  /** Where it ends, in hours. */
  end: number;
  /** Its colour. Default `primary`. Use `muted` for time taken by someone else. */
  tone?: WeekHoursTone;
}

/** One row of the grid: a day, a room or a person. */
export interface WeekHoursRow {
  /** Identifies the row; it is what `onSelect` is called with. */
  key: string;
  /** The text at the start of the row, such as "Mon". */
  label: string;
  /** The filled stretches. */
  blocks: WeekHoursBlock[];
  /** Draws the row faded with no blocks, for a day that is not worked. */
  off?: boolean;
  /** Outlines the row, for the one being edited. */
  selected?: boolean;
  /** What a screen reader says for the row's label, when it differs from the text. */
  accessibilityLabel?: string;
}

/** One entry under the grid, explaining a tone. */
export interface WeekHoursLegendItem {
  label: string;
  /** The tone it explains. Default `primary`. */
  tone?: WeekHoursTone;
}

const TONE: Record<WeekHoursTone, string> = {
  primary: 'bg-primary',
  muted: 'bg-muted-foreground/40',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  info: 'bg-info',
};

const weekHoursGridVariants = tv({
  slots: {
    root: 'w-full gap-2 self-stretch',
    row: 'flex-row items-center gap-3 rounded-lg',
    label: 'w-14 text-sm font-medium text-foreground',
    bar: 'relative h-6 flex-1 overflow-hidden rounded-md border border-transparent bg-muted',
    block: 'absolute inset-y-0 rounded-sm',
    ticks: 'flex-row items-center gap-3',
    tickSpacer: 'w-14',
    tickRow: 'flex-1 flex-row justify-between',
    tick: 'text-xs text-muted-foreground',
    legend: 'flex-row flex-wrap items-center gap-x-4 gap-y-1 pt-1',
    legendItem: 'flex-row items-center gap-1.5',
    swatch: 'size-2.5 rounded-sm',
    legendLabel: 'text-xs text-muted-foreground',
  },
  variants: {
    off: {
      true: { label: 'text-muted-foreground', bar: 'opacity-50' },
    },
    selected: {
      true: { bar: 'border-primary' },
    },
  },
});

export interface WeekHoursGridProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** The rows, top to bottom. */
  rows: WeekHoursRow[];
  /** The first visible hour. Default 0. */
  from?: number;
  /** The last visible hour. Default 24. */
  to?: number;
  /**
   * The labels under the bars, spread evenly from `from` to `to`. Numbers are
   * written as two-digit hours; strings are shown as given.
   */
  ticks?: (number | string)[];
  /** The entries under the grid, explaining each tone. */
  legend?: WeekHoursLegendItem[];
  /** Makes each row a button, called with the row's `key`. */
  onSelect?: (key: string) => void;
  /** What a screen reader says for a row marked `off`. Default "off". */
  offLabel?: string;
}

/** 9.5 as "09:30". */
function clock(hours: number): string {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  const h = minutes === 60 ? whole + 1 : whole;
  const m = minutes === 60 ? 0 : minutes;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const WeekHoursGrid = forwardRef<ViewRef, WeekHoursGridProps>(
  (
    { className, rows, from = 0, to = 24, ticks, legend, onSelect, offLabel = 'off', ...props },
    ref
  ) => {
    const span = Math.max(to - from, 1e-6);
    const slots = weekHoursGridVariants();

    return (
      <View ref={ref} className={slots.root({ className })} {...props}>
        {rows.map((row) => {
          const styles = weekHoursGridVariants({ off: !!row.off, selected: !!row.selected });
          const shown = row.off
            ? []
            : row.blocks
                .map((block) => ({
                  ...block,
                  start: Math.max(block.start, from),
                  end: Math.min(block.end, to),
                }))
                .filter((block) => block.end > block.start);
          const spoken = [
            row.accessibilityLabel ?? row.label,
            ...(row.off
              ? [offLabel]
              : shown.map((block) => `${clock(block.start)} to ${clock(block.end)}`)),
          ].join(', ');

          const content = (
            <>
              <Text className={styles.label()} numberOfLines={1}>
                {row.label}
              </Text>
              <View className={styles.bar()}>
                {shown.map((block, index) => (
                  <View
                    key={index}
                    className={cn(styles.block(), TONE[block.tone ?? 'primary'])}
                    style={{
                      left: `${((block.start - from) / span) * 100}%`,
                      width: `${((block.end - block.start) / span) * 100}%`,
                    }}
                  />
                ))}
              </View>
            </>
          );

          return onSelect ? (
            <Pressable
              key={row.key}
              accessibilityRole="button"
              accessibilityLabel={spoken}
              accessibilityState={{ selected: !!row.selected }}
              onPress={() => onSelect(row.key)}
              className={styles.row()}
            >
              {content}
            </Pressable>
          ) : (
            <View key={row.key} accessible accessibilityLabel={spoken} className={styles.row()}>
              {content}
            </View>
          );
        })}

        {ticks && ticks.length > 0 ? (
          <View className={slots.ticks()} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <View className={slots.tickSpacer()} />
            <View className={slots.tickRow()}>
              {ticks.map((tick, index) => (
                <Text key={index} className={slots.tick()}>
                  {typeof tick === 'number' ? String(tick).padStart(2, '0') : tick}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        {legend && legend.length > 0 ? (
          <View className={slots.legend()}>
            {legend.map((item) => (
              <View key={item.label} className={slots.legendItem()}>
                <View className={cn(slots.swatch(), TONE[item.tone ?? 'primary'])} />
                <Text className={slots.legendLabel()}>{item.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  }
);

WeekHoursGrid.displayName = 'WeekHoursGrid';
