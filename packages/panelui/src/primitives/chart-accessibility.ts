import { createElement } from 'react';
import type { ViewProps } from 'react-native';

/**
 * The largest text scale a chart's axis labels follow: iOS's biggest size before
 * the accessibility range. Axis labels sit in fixed-width gutters at fixed
 * steps, so past this they overlap each other or clip. Screen readers still get
 * every value through the chart's accessibility data.
 */
export const CHART_AXIS_MAX_FONT_SCALE = 1.353;

/*
 * `accessibilityLabel` and `accessibilityHint` come from ViewProps, which every
 * chart also extends, rather than being declared again here: React Native 0.88
 * declares them read-only, and two declarations that differ by that fail to merge.
 * A chart's label defaults to its family and number of data entries, and the
 * hint is spoken after that summary.
 */
export interface ChartAccessibilityProps<Datum> extends Pick<ViewProps, 'accessibilityLabel' | 'accessibilityHint'> {
  /** Overrides the spoken label for one data entry. */
  accessibilityLabelForDatum?: (datum: Datum, index: number) => string;
  /** Makes each data entry actionable without making the SVG geometry focusable. */
  onAccessibilityDatumPress?: (datum: Datum, index: number) => void;
}

export interface ChartAccessibilityItem<Datum> {
  datum: Datum;
  index: number;
  label: string;
}

function spoken(value: unknown): string | null {
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return null;
}

/** Pure semantic projection, shared by tests and the native accessibility tree. */
export function chartAccessibilityModel<Datum>(
  chart: string,
  data: Datum[],
  valueOf: (datum: Datum) => [string, unknown][],
  labelForDatum?: (datum: Datum, index: number) => string
): { summary: string; items: ChartAccessibilityItem<Datum>[] } {
  return {
    summary: `${chart}, ${data.length} ${data.length === 1 ? 'data entry' : 'data entries'}`,
    items: data.map((datum, index) => ({
      datum,
      index,
      label:
        labelForDatum?.(datum, index) ??
        valueOf(datum)
          .map(([label, value]) => {
            const text = spoken(value);
            return text === null ? null : `${label}, ${text}`;
          })
          .filter((part): part is string => part !== null)
          .join('. '),
    })),
  };
}

export interface ChartAccessibilityDataProps<Datum>
  extends ChartAccessibilityProps<Datum> {
  chart: string;
  data: Datum[];
  valueOf: (datum: Datum) => [string, unknown][];
  disabled?: boolean;
}

/**
 * A compact semantic sibling to the visual plot. The SVG remains one
 * decorative subtree while screen readers receive one summary and one entry
 * per datum, rather than every path, grid line and marker.
 */
export function ChartAccessibilityData<Datum>({
  chart,
  data,
  valueOf,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityLabelForDatum,
  onAccessibilityDatumPress,
}: ChartAccessibilityDataProps<Datum>) {
  if (disabled) return null;
  // Keep the pure semantic projection importable by Node tests without asking
  // Node to parse React Native's Flow entry point.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, View } = require('react-native') as typeof import('react-native');
  const model = chartAccessibilityModel(chart, data, valueOf, accessibilityLabelForDatum);

  return createElement(
    View,
    { style: { position: 'absolute', left: -10_000, width: 1, height: 1 } },
    createElement(View, {
      accessible: true,
      accessibilityRole: 'image',
      accessibilityLabel: accessibilityLabel ?? model.summary,
      accessibilityHint,
    }),
    ...model.items.map((item) =>
      createElement(Pressable, {
        key: item.index,
        accessible: true,
        accessibilityRole: onAccessibilityDatumPress ? 'button' : 'text',
        accessibilityLabel: item.label,
        onPress: onAccessibilityDatumPress
          ? () => onAccessibilityDatumPress(item.datum, item.index)
          : undefined,
      })
    )
  );
}
