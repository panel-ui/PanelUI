/**
 * Activity — a fitness summary on one screen: three goals as rings, the body
 * readings beside them, steps across the period, and a quarter of workouts as
 * a calendar.
 *
 * One switch at the top decides the period for everything under it. A summary
 * that shows today's rings beside this week's steps answers two questions at
 * once and neither well, so Day, Week and Month change every figure together.
 *
 * The rings come first because they are the question a person opens the
 * screen with — have I done enough today — and each is measured against its
 * own target, since calories, minutes and steps share no scale. The heatmap
 * stays on the last thirteen weeks whatever the period: it is there for the
 * streak, and a streak is not a property of a day.
 *
 * Every chart sits in a Frame with its own header, and drags or taps update
 * that header's readout rather than a tooltip over the data.
 *
 * The sample data is the constants below. Replace them with your own, or
 * lift them into props.
 */
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react-native';
// Deep imports: the icon package's barrel re-exports thousands of glyphs, and
// a bundler that cannot tree-shake follows every one of them.
import FireIcon from '@hugeicons/core-free-icons/FireIcon';
import { BarChart, type BarChartDatum } from '../src/components/bar-chart';
import { Button } from '../src/components/button';
import { Frame } from '../src/components/frame';
import {
  HeatmapChart,
  buildHeatmapCalendar,
  type HeatmapCell,
} from '../src/components/heatmap-chart';
import { Kpi } from '../src/components/kpi';
import { RingChart, type RingDatum } from '../src/components/ring-chart';
import { Tabs } from '../src/components/tabs';
import { ChevronLeftIcon, useIconColor } from '../src/icons';
import { Text } from '../src/primitives/text';
import { cn } from '../src/utils/cn';

/* -------------------------------------------------------------------------- */
/* Sample data                                                                */
/* -------------------------------------------------------------------------- */

type Period = 'day' | 'week' | 'month';

const PERIODS: { id: Period; label: string; title: string }[] = [
  { id: 'day', label: 'Day', title: 'Today' },
  { id: 'week', label: 'Week', title: 'Last 7 days' },
  { id: 'month', label: 'Month', title: 'Last 4 weeks' },
];

/** Each goal against its target, per period. Outermost ring first. */
const GOALS: Record<Period, RingDatum[]> = {
  day: [
    { label: 'Energy', value: 486, maxValue: 600 },
    { label: 'Workout', value: 34, maxValue: 45 },
    { label: 'Steps', value: 8214, maxValue: 10000 },
  ],
  week: [
    { label: 'Energy', value: 3712, maxValue: 4200 },
    { label: 'Workout', value: 268, maxValue: 315 },
    { label: 'Steps', value: 61840, maxValue: 70000 },
  ],
  month: [
    { label: 'Energy', value: 14920, maxValue: 18000 },
    { label: 'Workout', value: 1104, maxValue: 1350 },
    { label: 'Steps', value: 251300, maxValue: 300000 },
  ],
};

const UNITS: Record<string, string> = { Energy: 'kcal', Workout: 'min', Steps: 'steps' };

/** The body readings under the rings, per period. Trends are percentage changes. */
const VITALS: Record<
  Period,
  { label: string; value: string; trend: number; goodDirection: 'up' | 'down' }[]
> = {
  day: [
    { label: 'Resting HR', value: '58 bpm', trend: -3.3, goodDirection: 'down' },
    { label: 'Sleep', value: '7h 12m', trend: 6.4, goodDirection: 'up' },
    { label: 'Distance', value: '6.1 km', trend: 12.0, goodDirection: 'up' },
  ],
  week: [
    { label: 'Resting HR', value: '59 bpm', trend: -1.7, goodDirection: 'down' },
    { label: 'Sleep', value: '6h 58m', trend: -2.1, goodDirection: 'up' },
    { label: 'Distance', value: '44.8 km', trend: 8.5, goodDirection: 'up' },
  ],
  month: [
    { label: 'Resting HR', value: '60 bpm', trend: -4.8, goodDirection: 'down' },
    { label: 'Sleep', value: '7h 04m', trend: 1.2, goodDirection: 'up' },
    { label: 'Distance', value: '183 km', trend: 15.6, goodDirection: 'up' },
  ],
};

/** Which chart token each reading takes, in order. */
const VITAL_COLORS = [1, 2, 3] as const;

/** Workouts in a row, ending today. */
const STREAK_DAYS = 23;

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The interface is written in English, so the date under the title is too. */
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A stable number between 0 and 1 for a key.
 *
 * The charts need figures that look measured, and a real random would redraw
 * them on every render. A mixed hash gives each hour and each day its own
 * figure, the same every time, without the even steps a counter would leave.
 */
function noise(key: string) {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0x5bd1e995);
  hash ^= hash >>> 15;
  return (hash >>> 0) / 4294967295;
}

/** `Thursday, 9 October`. */
function longDate(date: Date) {
  return `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

/** `8214` as `8,214`. */
function grouped(value: number) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Steps across the period: two-hour blocks for today, the last seven days by
 * name, and the last four weeks by the date each one starts. Each total
 * matches the Steps ring for the same period.
 *
 * The week and the month run back from today rather than from a Monday or
 * the first of the month, so there is never a bar for a day that has not
 * happened yet.
 */
function steps(period: Period, today: Date): BarChartDatum[] {
  const target = GOALS[period][2]!.value;
  const daysAgo = (days: number) => {
    const date = new Date(today);
    date.setDate(today.getDate() - days);
    return date;
  };

  const shape =
    period === 'day'
      ? ['6a', '8a', '10a', '12p', '2p', '4p', '6p', '8p'].map((label, index) => ({
          label,
          // A morning walk, a lunch walk, and an evening run.
          weight: [0.6, 1.4, 0.5, 1.2, 0.4, 0.6, 1.8, 0.7][index]! * (0.8 + noise(`d${index}`) * 0.4),
        }))
      : period === 'week'
        ? [6, 5, 4, 3, 2, 1, 0].map((days) => {
            const date = daysAgo(days);
            const weekend = date.getDay() === 0 || date.getDay() === 6;
            return {
              label: SHORT_DAYS[date.getDay()]!,
              weight: (weekend ? 1.3 : 1) * (0.7 + noise(`w${date.getDate()}`) * 0.6),
            };
          })
        : [27, 20, 13, 6].map((days) => {
            const date = daysAgo(days);
            return {
              label: `${date.getDate()} ${MONTH_NAMES[date.getMonth()]!.slice(0, 3)}`,
              weight: 0.85 + noise(`m${date.getDate()}`) * 0.3,
            };
          });

  const total = shape.reduce((sum, row) => sum + row.weight, 0);
  return shape.map(({ label, weight }) => ({ label, steps: Math.round((weight / total) * target) }));
}

/** Thirteen weeks of workout minutes, ending today, with the streak unbroken. */
function workouts() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const entries: { date: Date; count: number }[] = [];
  for (let offset = 90; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    const roll = noise(key);
    const rest = offset >= STREAK_DAYS && roll < 0.28;
    entries.push({ date, count: rest ? 0 : Math.round(15 + roll * 55) });
  }
  return buildHeatmapCalendar(entries, { weekStartDay: 1 });
}

/** A theme token, resolved for the drawing props that cannot take a class. */
function useToken(name: string, fallback: string) {
  const value = useCSSVariable(name);
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/** A glyph from the icon set, tinted by whatever surface it sits on. */
function Glyph({ icon, size = 18, color }: { icon: IconSvgElement; size?: number; color?: string }) {
  const inherited = useIconColor();
  const fallback = useToken('--color-foreground', '#262626');
  return (
    <HugeiconsIcon icon={icon} size={size} color={color ?? inherited ?? fallback} strokeWidth={1.75} />
  );
}

/** Padding a chart's own header needs to line up inside a `Frame.Panel`, which has none. */
const CHART_HEADER = 'px-4 pt-3.5';

/* -------------------------------------------------------------------------- */
/* Block                                                                      */
/* -------------------------------------------------------------------------- */

export interface ActivityBlockProps {
  /** Shows a back button in the header and is called when it is pressed. */
  onBack?: () => void;
  className?: string;
}

export function ActivityBlock({ onBack, className }: ActivityBlockProps) {
  const insets = useSafeAreaInsets();
  const warning = useToken('--color-warning', '#f59e0b');
  const [period, setPeriod] = useState<Period>('day');
  const [ring, setRing] = useState(-1);
  const [bar, setBar] = useState<BarChartDatum | null>(null);
  const [cell, setCell] = useState<HeatmapCell | null>(null);

  const goals = GOALS[period];
  const selected = ring >= 0 ? goals[ring] : null;
  const headline = selected ?? goals[0]!;
  const now = useMemo(() => new Date(), []);
  const data = useMemo(() => steps(period, now), [period, now]);
  const calendar = useMemo(() => workouts(), []);
  const periodTitle = PERIODS.find((item) => item.id === period)!.title;
  const today = longDate(now);

  const percent = (goal: RingDatum) => Math.round((goal.value / goal.maxValue) * 100);

  return (
    <View className={cn('flex-1 bg-background', className)}>
      <View style={{ paddingTop: insets.top + 8 }} className="px-5 pb-3">
        <View className="w-full max-w-xl flex-row items-center gap-3 self-center">
          {onBack ? (
            <Button variant="outline" size="icon" className="rounded-full" accessibilityLabel="Back" onPress={onBack}>
              <ChevronLeftIcon size={18} />
            </Button>
          ) : null}
          <View className="flex-1">
            <Text size="lg" weight="semibold">
              Activity
            </Text>
            <Text size="sm" muted numberOfLines={1}>
              {today}
            </Text>
          </View>
          <View
            accessible
            accessibilityLabel={`${STREAK_DAYS}-day workout streak`}
            className="flex-row items-center gap-1.5 rounded-full bg-warning-subtle px-3 py-1.5"
          >
            <Glyph icon={FireIcon} size={16} color={warning} />
            <Text size="sm" weight="semibold" className="tabular-nums text-warning-foreground">
              {STREAK_DAYS}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        contentContainerClassName="px-5 pt-2"
      >
        <View className="w-full max-w-xl gap-5 self-center">
          {/* One period for every figure on the screen. */}
          <Tabs
            defaultValue="day"
            value={period}
            onValueChange={(value) => {
              setRing(-1);
              setBar(null);
              setPeriod(value as Period);
            }}
          >
            <Tabs.List>
              {PERIODS.map((item) => (
                <Tabs.Trigger key={item.id} value={item.id}>
                  {item.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs>

          {/* The goals */}
          <Frame className="w-full">
            <Frame.Header>
              <Frame.Title>{periodTitle}</Frame.Title>
              <Frame.Action>Tap a ring</Frame.Action>
            </Frame.Header>
            <Frame.Panel>
              <RingChart
                data={goals}
                size={200}
                strokeWidth={18}
                ringGap={5}
                className="pb-4"
                activeIndex={ring}
                onActiveIndexChange={setRing}
              >
                <RingChart.Header
                  className={CHART_HEADER}
                  value={`${percent(headline)}%`}
                  caption={
                    selected
                      ? `${selected.label} · ${grouped(selected.value)} of ${grouped(selected.maxValue)} ${UNITS[selected.label]}`
                      : 'Each ring against its own target'
                  }
                  legend
                />
                {goals.map((goal, index) => (
                  <RingChart.Ring key={goal.label} index={index} />
                ))}
                {/* The centre's own compact format: the hole is about fifty
                    points across, so a month's 14,020 kcal does not fit in it.
                    The header above carries the exact figure. */}
                <RingChart.Center defaultLabel={goals[0]!.label} />
              </RingChart>
            </Frame.Panel>
          </Frame>

          {/* The body */}
          <Frame className="w-full">
            <Frame.Header>
              <Frame.Title>Body</Frame.Title>
              <Frame.Action>{`vs. previous ${period}`}</Frame.Action>
            </Frame.Header>
            <Frame.Panel>
              <View className="p-4">
                <Kpi.Group>
                  {VITALS[period].map((vital, index) => (
                    <Kpi
                      key={vital.label}
                      surface={false}
                      colorIndex={VITAL_COLORS[index]}
                      goodDirection={vital.goodDirection}
                    >
                      <Kpi.Title>{vital.label}</Kpi.Title>
                      <Kpi.Value className="text-xl">{vital.value}</Kpi.Value>
                      <Kpi.Trend value={vital.trend} className="self-start" />
                    </Kpi>
                  ))}
                </Kpi.Group>
              </View>
            </Frame.Panel>
          </Frame>

          {/* Steps across the period */}
          <Frame className="w-full">
            <Frame.Header>
              <Frame.Title>Steps</Frame.Title>
              <Frame.Action>Drag to inspect</Frame.Action>
            </Frame.Header>
            <Frame.Panel>
              <BarChart
                data={data}
                xDataKey="label"
                aspectRatio={1.9}
                onActiveIndexChange={(_index, datum) => setBar(datum)}
              >
                <BarChart.Header
                  className={CHART_HEADER}
                  value={grouped(bar ? Number(bar.steps) : goals[2]!.value)}
                  caption={bar ? `${bar.label} · steps` : `${periodTitle} · steps`}
                />
                <BarChart.Grid />
                <BarChart.Bar dataKey="steps" colorIndex={3} />
                <BarChart.XAxis />
                <BarChart.Tooltip />
              </BarChart>
            </Frame.Panel>
          </Frame>

          {/* The streak */}
          <Frame className="w-full">
            <Frame.Header>
              <Frame.Title>Workouts</Frame.Title>
              <Frame.Action>Last 13 weeks</Frame.Action>
            </Frame.Header>
            <Frame.Panel>
              <HeatmapChart data={[]} className={CHART_HEADER}>
                <HeatmapChart.Header
                  value={cell ? `${cell.count} min` : `${STREAK_DAYS} days`}
                  caption={cell ? (cell.date?.toDateString() ?? '—') : 'In a row, ending today'}
                />
              </HeatmapChart>
              <View className="p-4">
                <HeatmapChart
                  data={calendar}
                  layout="fill"
                  weekStartDay={1}
                  gap={4}
                  onActiveCellChange={setCell}
                >
                  <HeatmapChart.XAxis />
                  <HeatmapChart.YAxis />
                  <HeatmapChart.Cells cornerRadius={3} />
                  <HeatmapChart.Tooltip />
                  <HeatmapChart.Legend />
                </HeatmapChart>
              </View>
            </Frame.Panel>
          </Frame>
        </View>
      </ScrollView>
    </View>
  );
}
