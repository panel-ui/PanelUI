/**
 * The running totals a waterfall sits on, kept apart from the drawing so that
 * the bars, the connectors, the labels and the readout all get the same answer.
 */

/** Which of the three roles a step's bar is drawn in. */
export type WaterfallKind = 'rise' | 'fall' | 'total';

export interface WaterfallDatum<TColor extends string = string> {
  /** Name of the step, as the axis and the readout show it. */
  label: string;
  /**
   * The change this step makes to the running total. On a `total` step it is
   * added before the bar is drawn, so `0` reads the balance as it stands and a
   * non-zero one opens the run at a starting balance.
   */
  value: number;
  /** Draw this step as a reading: measured from the baseline, in the total's colour. */
  total?: boolean;
  /** Which of the theme's roles to draw this one bar in, over its kind's. */
  color?: TColor;
}

/** One step, resolved against the running total it acts on. */
export interface WaterfallStep<TColor extends string = string> {
  datum: WaterfallDatum<TColor>;
  label: string;
  /** The change, or on a total the balance it reads. */
  value: number;
  kind: WaterfallKind;
  /** Where the bar is measured from: the running total before this step. */
  start: number;
  /** Where the bar reaches: the running total after it. */
  end: number;
}

/**
 * Resolves the data into steps. A value that is not a finite number counts as
 * zero, so the step keeps its place and one bad row does not poison every total
 * after it.
 */
export function waterfallSteps<TColor extends string = string>(
  data: readonly WaterfallDatum<TColor>[]
): WaterfallStep<TColor>[] {
  let running = 0;
  return data.map((datum) => {
    const value = Number.isFinite(datum.value) ? datum.value : 0;
    const start = running;
    running += value;
    if (datum.total) return { datum, label: datum.label, value: running, kind: 'total', start: 0, end: running };
    return { datum, label: datum.label, value, kind: value < 0 ? 'fall' : 'rise', start, end: running };
  });
}

/**
 * The value axis. It takes both ends of every bar, because a domain from the
 * changes alone would be a fraction of the height a climbing run needs, and it
 * always includes zero. Headroom goes past the furthest bar only, so the run
 * stays on its baseline. A `domain` with both ends finite wins.
 */
export function waterfallExtent(
  steps: readonly Pick<WaterfallStep, 'start' | 'end'>[],
  domain?: readonly [number, number]
): [number, number] {
  if (domain && Number.isFinite(domain[0]) && Number.isFinite(domain[1])) return [domain[0], domain[1]];
  let min = 0;
  let max = 0;
  for (const { start, end } of steps) {
    min = Math.min(min, start, end);
    max = Math.max(max, start, end);
  }
  if (min === 0 && max === 0) return [0, 1];
  return [min === 0 ? 0 : min * 1.1, max === 0 ? 0 : max * 1.1];
}

/**
 * Whether any of a step's bar lies inside a fixed `domain`. Past either end the
 * scale clamps it to nothing. A step that only touches an end also has no length there.
 */
export function waterfallReaches(
  { start, end }: Pick<WaterfallStep, 'start' | 'end'>,
  domain?: readonly [number, number]
): boolean {
  if (!domain || !domain.every(Number.isFinite)) return true;
  const low = Math.min(domain[0], domain[1]);
  const high = Math.max(domain[0], domain[1]);
  return Math.max(start, end) > low && Math.min(start, end) < high;
}

/** The kinds a run actually contains, in the order a legend lists them. */
export function waterfallKinds(steps: readonly Pick<WaterfallStep, 'kind'>[]): WaterfallKind[] {
  const seen = new Set(steps.map(({ kind }) => kind));
  return (['rise', 'fall', 'total'] as const).filter((kind) => seen.has(kind));
}
