/**
 * Leaderboard — entries ranked by a value, with the top three on a podium.
 *
 * ```tsx
 * <Leaderboard
 *   data={[
 *     { id: 'maya', name: 'Maya Chen', value: 12480, change: 2 },
 *     { id: 'omar', name: 'Omar Haddad', value: 11930 },
 *     { id: 'lena', name: 'Lena Brandt', value: 10215, change: -1 },
 *     { id: 'sam', name: 'Sam Okafor', value: 9870 },
 *   ]}
 *   unit="steps"
 *   highlightId="sam"
 * />
 * ```
 *
 * Data in, ranks out. The caller passes values and the component sorts and
 * places them, so ties are numbered the same way everywhere and a row can
 * never show a place its value does not earn. See `leaderboard-rank.ts`.
 *
 * The podium is laid out 2-1-3, first in the middle and highest, because that
 * is the arrangement people already read a top three in. Its bars are drawn
 * to scale against the leader by default: a close race looks close and a
 * runaway looks like one, which a fixed staircase of heights cannot show.
 *
 * Every podium column and every row is one accessible element. A screen
 * reader hears "Rank 2, Omar Haddad, 11,930 steps" once, rather than the
 * rank, the name and the value as three stops in a grid it cannot see.
 */
import { forwardRef, useEffect, useMemo } from 'react';
import {
  Pressable,
  View,
  type ImageSourcePropType,
  type ViewProps,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { tv } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { ArrowDownIcon, ArrowUpIcon } from '../../icons';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { Avatar } from '../avatar';
import { podiumHeights, rankEntries, type Ranked } from './leaderboard-rank';

export { rankEntries } from './leaderboard-rank';
export type { Ranked as LeaderboardRanked } from './leaderboard-rank';

/** Milliseconds for a podium bar to grow. */
const GROW_DURATION = 620;
/** Delay between bars. Third rises first and first last, so the leader lands on the beat. */
const GROW_STAGGER = 110;

const leaderboardVariants = tv({
  slots: {
    root: 'w-full gap-4',
    podium: 'flex-row items-end gap-2 px-1',
    column: 'flex-1 items-center',
    person: 'items-center gap-1 pb-2',
    rankBadge:
      'absolute -bottom-1.5 h-5 min-w-5 items-center justify-center self-center rounded-full border-2 border-background px-1',
    bar: 'w-full items-center overflow-hidden rounded-t-2xl pt-2.5',
    card: 'flex-1 items-center gap-1.5 rounded-2xl border border-border bg-card px-2 pb-3 pt-4',
    list: 'overflow-hidden rounded-2xl border border-border bg-card',
    row: 'min-h-14 flex-row items-center gap-3 px-3 py-2.5',
    rowDivider: 'ml-14 h-px bg-border',
    rank: 'w-7 text-center text-sm font-semibold tabular-nums text-muted-foreground',
    rowText: 'flex-1 gap-0.5',
    value: 'text-sm font-semibold tabular-nums text-foreground',
    change: 'min-w-10 flex-row items-center justify-end gap-0.5',
    gap: 'flex-row items-center justify-center gap-1 py-1.5',
    gapDot: 'h-1 w-1 rounded-full bg-muted-foreground/40',
    empty: 'items-center rounded-2xl border border-dashed border-border px-4 py-8',
  },
});

/**
 * Colour by podium place. A lookup rather than a `tv()` variant: place is
 * derived from the data, not something a caller passes, and a variant here
 * would be documented as a prop on `Leaderboard`.
 *
 * One hue stepped down in strength, so the podium reads as a single series
 * and follows the theme's primary rather than borrowing medal colours that
 * would clash with half the themes.
 */
const PLACE: Record<1 | 2 | 3, { bar: string; badge: string }> = {
  1: { bar: 'bg-primary', badge: 'bg-primary' },
  2: { bar: 'bg-primary/40', badge: 'bg-foreground' },
  3: { bar: 'bg-primary/16', badge: 'bg-foreground' },
};

export interface LeaderboardEntry {
  /** Stable identity, used for keys and `highlightId`. */
  id: string;
  /** Shown on the row and read out first after the rank. */
  name: string;
  /** What the board is ranked by. */
  value: number;
  /** Image for the avatar. A string is taken as a URI. Initials stand in without one. */
  avatar?: ImageSourcePropType | string;
  /** A second line under the name — a team, a level, a city. */
  subtitle?: string;
  /**
   * Places moved since the last period. Positive is up the board, negative
   * is down, 0 is unchanged. Leave it out to show no movement column.
   */
  change?: number;
}

export type LeaderboardPodium = 'bars' | 'cards' | 'none';

export interface LeaderboardProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** The entries, in any order. Places are worked out from `value`. */
  data: readonly LeaderboardEntry[];
  /**
   * How the top three are drawn. `bars` stands them on a podium whose bars
   * are scaled to their values; `cards` gives each a card, with first raised
   * between the other two; `none` puts everyone in the list.
   */
  podium?: LeaderboardPodium;
  /**
   * `desc` ranks the highest value first. `asc` ranks the lowest first, for a
   * time or a golf score.
   */
  order?: 'desc' | 'asc';
  /**
   * What the podium bar heights follow. `value` draws each against the
   * leader's value; `rank` steps them by place. Always `rank` when `order` is
   * `asc`, where the winning value is the smallest.
   */
  podiumScale?: 'value' | 'rank';
  /** Height of the tallest podium bar, in points. */
  podiumHeight?: number;
  /** Show at most this many entries, podium included. */
  limit?: number;
  /**
   * The entry to mark — usually the person looking at the board. Their row is
   * tinted, and if `limit` cuts them off it is pinned at the bottom with their
   * real place.
   */
  highlightId?: string;
  /** Turns a value into its label. Defaults to grouped digits: 12,480. */
  formatValue?: (value: number) => string;
  /** Word read after the value by a screen reader, e.g. "points". */
  unit?: string;
  /** Makes every row and podium place pressable. */
  onPressEntry?: (entry: LeaderboardEntry, rank: number) => void;
  /** Shown when `data` has nothing to rank. */
  emptyText?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

function toSource(avatar: LeaderboardEntry['avatar']): ImageSourcePropType | undefined {
  return typeof avatar === 'string' ? { uri: avatar } : avatar;
}

const defaultFormat = (value: number) => value.toLocaleString('en-US');

function describe(
  { entry, rank, tied }: Ranked<LeaderboardEntry>,
  label: string,
  unit: string | undefined
): string {
  const place = tied ? `Rank ${rank}, tied` : `Rank ${rank}`;
  const parts = [place, entry.name, unit ? `${label} ${unit}` : label];
  if (entry.subtitle) parts.splice(2, 0, entry.subtitle);
  if (entry.change) {
    const n = Math.abs(entry.change);
    parts.push(`${entry.change > 0 ? 'up' : 'down'} ${n} ${n === 1 ? 'place' : 'places'}`);
  } else if (entry.change === 0) {
    parts.push('no change');
  }
  return parts.join(', ');
}

/** A pressable when the board is, a plain view when it is not. */
function Slot({
  onPress,
  label,
  className,
  children,
}: {
  onPress?: () => void;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (onPress) {
    return (
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        className={cn(className, 'active:opacity-70')}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View accessible accessibilityLabel={label} className={className}>
      {children}
    </View>
  );
}

function PodiumBar({
  place,
  height,
  delay,
  rank,
}: {
  place: 1 | 2 | 3;
  height: number;
  delay: number;
  rank: number;
}) {
  const slots = leaderboardVariants();
  const reduced = useReducedMotion();
  const grown = useSharedValue(reduced ? height : 0);

  useEffect(() => {
    grown.value = reduced
      ? height
      : withDelay(
          delay,
          withTiming(height, { duration: GROW_DURATION, easing: Easing.out(Easing.cubic) })
        );
  }, [grown, height, delay, reduced]);

  const style = useAnimatedStyle(() => ({ height: grown.value }));
  // The numeral fades in once the bar is tall enough to hold it, so it never
  // overflows a bar that is still a few points high.
  const numeral = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, (grown.value - 28) / 24)),
  }));

  return (
    <Animated.View className={cn(slots.bar(), PLACE[place].bar)} style={style}>
      <Animated.View style={numeral}>
        <Text
          size={place === 1 ? '3xl' : '2xl'}
          weight="bold"
          className={cn(
            'tabular-nums',
            place === 1 ? 'text-primary-foreground' : 'text-foreground/70'
          )}
        >
          {rank}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

function RankBadge({ place, rank }: { place: 1 | 2 | 3; rank: number }) {
  const slots = leaderboardVariants();
  return (
    <View className={cn(slots.rankBadge(), PLACE[place].badge)}>
      <Text
        className={cn(
          'text-[10px] font-bold tabular-nums',
          place === 1 ? 'text-primary-foreground' : 'text-background'
        )}
      >
        {rank}
      </Text>
    </View>
  );
}

function ChangeLabel({ change }: { change: number | undefined }) {
  const slots = leaderboardVariants();
  const success = useCSSVariable('--color-success');
  const destructive = useCSSVariable('--color-destructive');
  if (change === undefined) return null;

  if (change === 0) {
    return (
      <View className={slots.change()}>
        <Text size="xs" muted className="tabular-nums">
          –
        </Text>
      </View>
    );
  }

  const up = change > 0;
  const tint = up ? success : destructive;
  const color = typeof tint === 'string' ? tint : undefined;
  const Arrow = up ? ArrowUpIcon : ArrowDownIcon;
  return (
    <View className={slots.change()}>
      <Arrow size={11} strokeWidth={2.5} color={color} />
      <Text
        size="xs"
        weight="medium"
        className={cn('tabular-nums', up ? 'text-success' : 'text-destructive')}
      >
        {Math.abs(change)}
      </Text>
    </View>
  );
}

/**
 * Ranked entries with a podium for the top three and a list for the rest.
 *
 * Renders every row it is given rather than virtualising them: a board is
 * read from the top, and past a few dozen rows nobody is reading it. Use
 * `limit` for a long board, and `highlightId` to keep the viewer's own row in
 * sight when the limit cuts them off.
 */
const LeaderboardRoot = forwardRef<View, LeaderboardProps>(function Leaderboard(
  {
    className,
    data,
    podium = 'bars',
    order = 'desc',
    podiumScale = 'value',
    podiumHeight = 132,
    limit,
    highlightId,
    formatValue = defaultFormat,
    unit,
    onPressEntry,
    emptyText = 'No entries yet',
    ...props
  },
  ref
) {
  const slots = leaderboardVariants();
  const ranked = useMemo(() => rankEntries(data, order), [data, order]);
  const shown = limit != null ? ranked.slice(0, Math.max(0, limit)) : ranked;

  // The viewer's own row, when the limit has cut it off.
  const pinned =
    highlightId != null && !shown.some((r) => r.entry.id === highlightId)
      ? ranked.find((r) => r.entry.id === highlightId)
      : undefined;

  const top = podium === 'none' ? [] : shown.slice(0, 3);
  const rest = podium === 'none' ? shown : shown.slice(3);

  const press = (item: Ranked<LeaderboardEntry>) =>
    onPressEntry ? () => onPressEntry(item.entry, item.rank) : undefined;

  if (ranked.length === 0) {
    return (
      <View ref={ref} className={slots.root({ className })} {...props}>
        <View className={slots.empty()}>
          <Text size="sm" muted>
            {emptyText}
          </Text>
        </View>
      </View>
    );
  }

  // Second, first, third. With fewer than three the missing seats are left
  // out rather than drawn empty.
  const seats = [top[1], top[0], top[2]]
    .map((item, slot) => (item ? { item, place: ([2, 1, 3] as const)[slot]! } : null))
    .filter((seat): seat is { item: Ranked<LeaderboardEntry>; place: 1 | 2 | 3 } => !!seat);

  const heights = podiumHeights(
    seats.map((s) => s.item.entry.value),
    seats.map((s) => s.item.rank),
    order === 'asc' ? 'rank' : podiumScale
  );

  const renderRow = (item: Ranked<LeaderboardEntry>, index: number) => {
    const label = formatValue(item.entry.value);
    const highlighted = item.entry.id === highlightId;
    return (
      <View key={item.entry.id}>
        {index > 0 ? <View className={slots.rowDivider()} /> : null}
        <Slot
          onPress={press(item)}
          label={describe(item, label, unit)}
          className={cn(slots.row(), highlighted && 'bg-primary/10')}
        >
          <Text className={cn(slots.rank(), highlighted && 'text-primary')}>
            {item.rank}
          </Text>
          <Avatar
            size="sm"
            source={toSource(item.entry.avatar)}
            fallback={initials(item.entry.name)}
          />
          <View className={slots.rowText()}>
            <Text size="sm" weight="medium" numberOfLines={1}>
              {item.entry.name}
            </Text>
            {item.entry.subtitle ? (
              <Text size="xs" muted numberOfLines={1}>
                {item.entry.subtitle}
              </Text>
            ) : null}
          </View>
          <Text className={slots.value()}>{label}</Text>
          <ChangeLabel change={item.entry.change} />
        </Slot>
      </View>
    );
  };

  return (
    <View ref={ref} className={slots.root({ className })} {...props}>
      {podium === 'bars' && seats.length > 0 ? (
        <View className={slots.podium()}>
          {seats.map(({ item, place }, i) => {
            const label = formatValue(item.entry.value);
            return (
              <Slot
                key={item.entry.id}
                onPress={press(item)}
                label={describe(item, label, unit)}
                className={slots.column()}
              >
                <View className={slots.person()}>
                  <View className="mb-1.5">
                    <Avatar
                      size={place === 1 ? 'lg' : 'md'}
                      source={toSource(item.entry.avatar)}
                      fallback={initials(item.entry.name)}
                      className={cn(
                        place === 1 && 'border-2 border-primary',
                        item.entry.id === highlightId && place !== 1 && 'border-2 border-primary/60'
                      )}
                    />
                    <RankBadge place={place} rank={item.rank} />
                  </View>
                  <Text size="sm" weight="semibold" numberOfLines={1} className="text-center">
                    {item.entry.name}
                  </Text>
                  <Text size="xs" muted numberOfLines={1} className="tabular-nums">
                    {label}
                  </Text>
                </View>
                <PodiumBar
                  place={place}
                  rank={item.rank}
                  height={Math.round(podiumHeight * heights[i]!)}
                  delay={(3 - place) * GROW_STAGGER}
                />
              </Slot>
            );
          })}
        </View>
      ) : null}

      {podium === 'cards' && seats.length > 0 ? (
        <View className="flex-row items-end gap-2">
          {seats.map(({ item, place }) => {
            const label = formatValue(item.entry.value);
            return (
              <Slot
                key={item.entry.id}
                onPress={press(item)}
                label={describe(item, label, unit)}
                className={cn(
                  slots.card(),
                  place === 1 && 'border-primary pb-5 pt-5 shadow-sm',
                  item.entry.id === highlightId && place !== 1 && 'border-primary/40'
                )}
              >
                <View className="mb-1.5">
                  <Avatar
                    size={place === 1 ? 'lg' : 'md'}
                    source={toSource(item.entry.avatar)}
                    fallback={initials(item.entry.name)}
                    className={cn(place === 1 && 'border-2 border-primary')}
                  />
                  <RankBadge place={place} rank={item.rank} />
                </View>
                <Text size="sm" weight="semibold" numberOfLines={1} className="text-center">
                  {item.entry.name}
                </Text>
                <Text
                  size={place === 1 ? 'base' : 'sm'}
                  weight="bold"
                  numberOfLines={1}
                  className={cn('tabular-nums', place === 1 && 'text-primary')}
                >
                  {label}
                </Text>
                {item.entry.subtitle ? (
                  <Text size="xs" muted numberOfLines={1}>
                    {item.entry.subtitle}
                  </Text>
                ) : null}
              </Slot>
            );
          })}
        </View>
      ) : null}

      {rest.length > 0 || pinned ? (
        <View className={slots.list()} accessibilityRole="list">
          {rest.map(renderRow)}
          {pinned ? (
            <>
              {rest.length > 0 ? (
                <View className={slots.gap()} importantForAccessibility="no-hide-descendants">
                  <View className={slots.gapDot()} />
                  <View className={slots.gapDot()} />
                  <View className={slots.gapDot()} />
                </View>
              ) : null}
              {renderRow(pinned, 0)}
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

export const Leaderboard = LeaderboardRoot;
