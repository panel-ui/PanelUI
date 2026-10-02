/**
 * Ranking for `Leaderboard`, kept apart from the views so it can be tested
 * without mounting anything.
 *
 * Ties share a place and the next place is skipped — 1, 2, 2, 4. That is how
 * a scoreboard is read: two people on the same score are both second, and the
 * one below them is fourth, because three people beat them. Numbering the
 * next one third would claim a place nobody below a tie can hold.
 */

export interface RankableEntry {
  id: string;
  value: number;
}

export interface Ranked<T extends RankableEntry> {
  entry: T;
  /** The place, 1-based. Shared by everyone on the same value. */
  rank: number;
  /** Whether another entry holds the same place. */
  tied: boolean;
}

/**
 * Sorts by value and assigns competition ranks.
 *
 * `desc` puts the highest value first — points, revenue, steps. `asc` puts
 * the lowest first, for a race time or a golf score. Entries whose value is
 * not a finite number are dropped rather than sorted to an arbitrary end,
 * since a row with no score has no place to be ranked at. The sort is stable,
 * so equal values keep the order they were passed in.
 */
export function rankEntries<T extends RankableEntry>(
  data: readonly T[],
  order: 'desc' | 'asc' = 'desc'
): Ranked<T>[] {
  const sign = order === 'asc' ? 1 : -1;
  const sorted = data
    .filter((entry) => Number.isFinite(entry.value))
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => sign * (a.entry.value - b.entry.value) || a.index - b.index)
    .map(({ entry }) => entry);

  const ranked: Ranked<T>[] = [];
  sorted.forEach((entry, index) => {
    const previous = ranked[index - 1];
    const rank =
      previous && previous.entry.value === entry.value ? previous.rank : index + 1;
    ranked.push({ entry, rank, tied: false });
  });

  for (let i = 0; i < ranked.length; i += 1) {
    const current = ranked[i]!;
    current.tied =
      ranked[i - 1]?.rank === current.rank || ranked[i + 1]?.rank === current.rank;
  }

  return ranked;
}

/**
 * Bar heights for the podium, as fractions of the tallest bar.
 *
 * `value` scales each bar by its value against the leader's, so a close race
 * looks close. A floor keeps third place a bar rather than a sliver when the
 * leader is far ahead. `rank` steps the heights by place and ignores the
 * values — the only honest choice for `asc`, where the best value is the
 * smallest and a bar proportional to it would be shortest.
 */
export function podiumHeights(
  values: readonly number[],
  ranks: readonly number[],
  scale: 'value' | 'rank',
  floor = 0.4
): number[] {
  if (scale === 'rank') {
    const steps = [1, 0.74, 0.56];
    return ranks.map((rank) => steps[Math.min(rank, 3) - 1] ?? steps[2]!);
  }

  const peak = Math.max(...values.map((value) => Math.abs(value)), 0);
  if (peak === 0) return values.map(() => 1);
  return values.map((value) => floor + (1 - floor) * (Math.abs(value) / peak));
}
