# Live Line Chart

A reading that keeps arriving, against a window that keeps moving.

```tsx
import { LiveLineChart } from "@/components/panelui/live-line-chart"
```

From npm the path is `panelui-web/live-line-chart`. Install with `npx shadcn@latest add @panelui/live-line-chart`.

## When to use it

Use it for a number that keeps arriving: a metric off a socket, a sensor, a queue depth. Each reading is placed at the time it carries, against a window running from `window` seconds ago to now, so the gaps between readings are part of what is drawn.

The window follows the clock and not the data, so the line drifts left whether or not anything is arriving. A feed that stalls shows as the line pulling away from the right edge.

The clock costs one frame callback while the chart can be seen. `paused`, `status="loading"`, a hidden page and scrolling off screen stop it. Under reduced motion it does not run, and the window advances as each reading arrives.

For a fixed series that is not going to grow, such as a week of visits, use a line chart.

## Usage

```tsx
<LiveLineChart data={points} window={30}>
  <LiveLineChart.Header title="Requests / sec" />
  <LiveLineChart.Grid />
  <LiveLineChart.Area />
  <LiveLineChart.Line />
  <LiveLineChart.Tip />
  <LiveLineChart.XAxis />
  <LiveLineChart.Tooltip />
</LiveLineChart>
```

## Parts

```tsx
<LiveLineChart data={…}>
  <LiveLineChart.Header />
  <LiveLineChart.Grid />
  <LiveLineChart.Area />
  <LiveLineChart.Line />
  <LiveLineChart.Skeleton />
  <LiveLineChart.Tip />
  <LiveLineChart.XAxis />
  <LiveLineChart.YAxis />
  <LiveLineChart.Tooltip />
</LiveLineChart>
```

- `LiveLineChart.Header` — The strip above the plot. Its value falls back to the reading under the crosshair, then to the latest one, so reading back through the window shows here with nothing to wire up. `children` is a trailing slot for a pause control or a badge.
- `LiveLineChart.Grid` — The rules the readings are judged against. They divide the plot evenly and stay put when the scale changes.
- `LiveLineChart.Area` — The gradient fill under the line.
- `LiveLineChart.Line` — The line.
- `LiveLineChart.Tip` — The dot at the leading end. It rides the newest reading and not the right-hand edge, so it drifts left when the feed stops. `badge` writes the reading beside it, for a chart with no header.
- `LiveLineChart.XAxis` — How far back the plot reaches, as offsets from now: `-30s`, `-15s`, `now`. They do not change while the window moves.
- `LiveLineChart.YAxis` — The value scale, with room made for it on the left.
- `LiveLineChart.Tooltip` — Reads a reading that has gone past, by hovering, dragging or the arrow keys. The crosshair stays on the moment it named and travels left with it. Moving away or Escape lets it go.
- `LiveLineChart.Skeleton` — A flat line down the middle of the plot, shown while `status="loading"`.

## Props

`LiveLineChart` and `LiveLineChart.Header` also take the props of the element they render, and a `className`. `LiveLineChart.Tip` and `LiveLineChart.Tooltip` put their `className` on the badge and the readout. The other parts draw nothing themselves and take only the props listed.

#### `LiveLineChartProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `readonly LiveLinePoint[]` | **required** | The readings so far. Invalid values are dropped and timestamps are ordered. |
| `window` | `number` | `30` | How much time the plot spans, in seconds. Invalid values use 30. |
| `paused` | `boolean` | `false` | Freeze the window where it is. The readings still arrive; the clock stops. |
| `yDomain` | `[number, number]` | — | Fix the value axis instead of deriving it from what is visible. |
| `domainDuration` | `number` | `420` | Milliseconds for the value axis to settle after the range changes. |
| `curve` | `LiveLineChartCurve` | `'monotone'` | `monotone` never overshoots between readings; `linear` joins them straight. |
| `maxPoints` | `number` | `500` | The most readings kept. Older ones are dropped, so an unbounded feed does not grow an array for as long as the page is open. Must be positive and finite. |
| `aspectRatio` | `number` | `2` | The plot's width ÷ height. |
| `status` | `LiveLineChartStatus` | `'ready'` | `loading` holds the clock and draws `Skeleton` in place of the line. |
| `momentumColors` | `LiveLineMomentumColors` | — | Which role to draw in per direction. Left out, the chart keeps to one colour. |
| `color` | `LiveLineChartColor` | — | Which of the theme's roles the chart is drawn in, `chart-1` by default. With `momentumColors` it only colours a flat reading, and only if `momentumColors.flat` is not set. |
| `onActivePointChange` | `(point: LiveLinePoint \| null) => void` | — | The reading under the crosshair as it moves, and `null` when it is let go. |
| `label` | `string` | — | Names the chart for a screen reader. Falls back to the Header's title, then to "Live line chart". |
| `hint` | `string` | — | Further guidance after the snapshot a screen reader gets. |

#### `LiveLineChartGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `rows` | `number` | `4` | How many bands the plot is divided into. Give it the same number as `YAxis`'s `ticks`. |
| `dashArray` | `string` | `'4 6'` | The stroke's dash pattern. `"none"` for a solid rule. |
| `color` | `LiveLineChartColor` | — | Which of the theme's roles the lines are drawn in. Defaults to the border colour. |

#### `LiveLineChartLineProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `strokeWidth` | `number` | `2` | The stroke's width. |
| `color` | `LiveLineChartColor` | — | Which of the theme's roles to draw in. Overrides the chart's colour, momentum included. |

#### `LiveLineChartAreaProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `opacity` | `number` | `0.22` | Opacity at the top of the fill, fading to nothing at the bottom of the plot. |
| `color` | `LiveLineChartColor` | — | Which of the theme's roles to draw in. Overrides the chart's colour, momentum included. |

#### `LiveLineChartTipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `badge` | `boolean` | `false` | Write the current reading in a badge beside the dot. Off by default, because a floating card nobody opened reads as a tooltip. Turn it on where the chart has no header to put the reading in. |
| `pulse` | `boolean` | `true` | Ring the dot with a repeating pulse. Held while paused and under reduced motion. |
| `formatValue` | `(value: number) => string` | — | Format the badge. Defaults to a compact number. |
| `className` | `string` | — | Added to the badge's surface. |

#### `LiveLineChartXAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | `4` | How many steps along the bottom. There is a label at each end of each one. |
| `formatTick` | `(secondsAgo: number) => string` | — | Rewrites a label. Given how many seconds back the tick is. |

#### `LiveLineChartYAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | `4` | How many steps up the side. There is a label at each end of each one. |
| `formatValue` | `(value: number) => string` | — | Format a value. Defaults to a compact number. |

#### `LiveLineChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatValue` | `(value: number) => string` | — | Format the value. Defaults to a compact number. |
| `className` | `string` | — | Added to the readout's surface. |

#### `LiveLineChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `LiveLineChartColor` | — | Which of the theme's roles the line is drawn in. Defaults to the muted colour. |

#### `LiveLineChartHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `string` | — | Small line above the value: what is being watched. |
| `value` | `string` | — | The readout. Left out, it shows the current reading. |
| `caption` | `ReactNode` | — | One muted line under the value. |
| `formatValue` | `(value: number) => string` | — | Format the derived value. Defaults to a compact number. |

## In a Server Component

`LiveLineChart` is a client component. A Server Component cannot read `LiveLineChart.Header` off the import, so import each part by name: `LiveLineChartHeader`, `LiveLineChartGrid`, `LiveLineChartArea`, `LiveLineChartLine`, `LiveLineChartTip`, `LiveLineChartXAxis`, `LiveLineChartYAxis`, `LiveLineChartTooltip`, `LiveLineChartSkeleton`.

## Notes

#### Sizing

The chart fills its container's width and takes its height from `aspectRatio`, which applies to the plot alone. The plot draws in the browser after it has been measured, and the space is reserved until then.

#### The value axis

The derived axis spans the readings inside the window, with 12% of headroom, and settles over `domainDuration` when that range changes. A spike stops holding the axis open once it has scrolled off. `yDomain` fixes it.

#### Long-running feeds

The chart keeps the newest `maxPoints` readings and drops the rest, so a feed can keep appending to `data`. Readings with a non-finite time or value are dropped, and for two readings with the same time the later one wins.

#### Accessibility

The plot is one image whose name a screen reader reads as a snapshot: the name, then the current value and direction, or the selected value and its age, then the window and whether it is paused. It changes with the data and is not announced on its own, because a live region on a stream would never stop talking. `label` names it, falling back to the Header's title.

With a `Tooltip` the plot takes focus. The left and right arrow keys walk the readings in the window and Escape lets go.

## Example

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Frame } from '@/components/panelui/frame';
import { LiveLineChart, type LiveLinePoint } from '@/components/panelui/live-line-chart';

/** A made-up reading each second, with the last minute already there. */
function useFeed() {
  const [points, setPoints] = useState<LiveLinePoint[]>([]);
  useEffect(() => {
    const read = (time: number) => ({ time, value: 120 + 40 * Math.sin(time / 7000) + 18 * Math.sin(time / 1900) + Math.random() * 8 });
    const start = Date.now();
    setPoints(Array.from({ length: 60 }, (_, index) => read(start - (60 - index) * 1000)));
    const timer = setInterval(() => setPoints((current) => [...current, read(Date.now())]), 1000);
    return () => clearInterval(timer);
  }, []);
  return points;
}

export default function LiveLineChartOverview() {
  const points = useFeed();

  return (
    <Frame variant="band" className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>API traffic</Frame.Title>
        <Frame.Action>Hover to read back</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-5">
        <LiveLineChart data={points} window={30}>
          <LiveLineChart.Header title="Requests / sec" formatValue={(value) => value.toFixed(0)} />
          <LiveLineChart.Grid />
          <LiveLineChart.Area />
          <LiveLineChart.Line />
          <LiveLineChart.Tip />
          <LiveLineChart.XAxis ticks={3} />
          <LiveLineChart.YAxis formatValue={(value) => value.toFixed(0)} />
          <LiveLineChart.Tooltip formatValue={(value) => `${value.toFixed(0)} req/s`} />
        </LiveLineChart>
      </Frame.Panel>
    </Frame>
  );
}
```
