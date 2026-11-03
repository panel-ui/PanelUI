# LiveLineChart

A reading that keeps arriving, against a window that keeps moving.

```tsx
import { LiveLineChart } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { LiveLineChart } from '@/components/ui/live-line-chart';
```

### Anatomy

```tsx
<LiveLineChart>
  <LiveLineChart.Header />     {/* what is watched, and what it reads now */}
  <LiveLineChart.Grid />       {/* the rules the readings are judged against */}
  <LiveLineChart.Area />       {/* the gradient fill under the line */}
  <LiveLineChart.Line />       {/* the line */}
  <LiveLineChart.Skeleton />   {/* while status="loading" */}
  <LiveLineChart.Tip />        {/* the dot at the leading end, and its badge */}
  <LiveLineChart.XAxis />      {/* how far back the plot reaches */}
  <LiveLineChart.YAxis />      {/* the value scale */}
  <LiveLineChart.Tooltip />    {/* drag back to read a reading that has gone past */}
</LiveLineChart>
```

### Parts

- `LiveLineChart.Header` — The strip above the plot. Its value falls back to the reading under the crosshair, then to the latest one, so a drag reads out here without wiring anything up.
- `LiveLineChart.Grid` — The horizontal rules the readings are judged against.
- `LiveLineChart.Area` — The gradient fill under the line. Its own part, so a chart that wants the shape without the weight of a filled band does not have one.
- `LiveLineChart.Line` — The line, rebuilt on the UI thread every frame the window moves.
- `LiveLineChart.Tip` — The dot at the leading end. It rides the newest reading rather than the right-hand edge. Pass `badge` to write the current reading beside it — off by default, since a floating card nobody opened reads as a tooltip.
- `LiveLineChart.XAxis` — How far back the plot reaches, labelled as offsets from now.
- `LiveLineChart.YAxis` — The value scale. Declaring one widens the left gutter so its labels have somewhere to sit.
- `LiveLineChart.Tooltip` — Drag back through the window to read a reading that has already gone past.
- `LiveLineChart.Skeleton` — A flat line down the middle, shown while `status="loading"`.

### Props

#### `LiveLineChartProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `accessibilityLabel` | `string` | — | Names the chart's single screen-reader snapshot. Falls back to the Header title, then to "Live line chart". |
| `accessibilityHint` | `string` | — | Additional guidance after the snapshot. No gesture is invented for it. |
| `data` | `LiveLinePoint[]` | **required** | The readings so far. Invalid values are dropped and timestamps are ordered. |
| `window` | `number` | `30` | How much time the plot spans, in seconds. Invalid values use 30. |
| `paused` | `boolean` | `false` | Freeze the window where it is. The readings still arrive; the clock stops. |
| `yDomain` | `[number, number]` | — | Fix the y-axis instead of deriving it from what is visible. |
| `domainDuration` | `number` | `420` | Milliseconds for the y-axis to settle after the range changes. |
| `curve` | `ChartCurve` | `monotone` | `monotone` never overshoots between readings; `linear` joins them straight. |
| `maxPoints` | `number` | `500` | The most readings kept. Older ones are dropped, since they are off the window and cannot come back — an unbounded feed otherwise grows an array for as long as the screen is open. Must be positive and finite. |
| `aspectRatio` | `number` | `2` | Width ÷ height of the plot. |
| `status` | `LiveLineChartStatus` | `ready` | `loading` draws a flat placeholder and holds the clock. |
| `momentumColors` | `LiveLineMomentumColors` | — | Colour per direction. Left out, the chart draws in one hue throughout. |
| `color` | `string` | — | Overrides the `--color-chart-1` token. Ignored when `momentumColors` is set. |
| `onActivePointChange` | `(point: LiveLinePoint \| null) => void` | — | The reading under the crosshair as it moves, and `null` when the finger lifts. |
| `children` | `ReactNode` | — | — |

#### `LiveLineChartGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `rows` | `number` | — | How many bands the plot is divided into. |
| `color` | `string` | — | — |
| `dashArray` | `string` | — | — |

#### `LiveLineChartLineProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `strokeWidth` | `number` | — | — |
| `color` | `string` | — | Overrides the chart's colour, momentum included. |

#### `LiveLineChartAreaProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `opacity` | `number` | — | Opacity at the top of the fill, fading to nothing at the baseline. |
| `color` | `string` | — | Overrides the chart's colour, momentum included. |

#### `LiveLineChartTipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `badge` | `boolean` | `false` | Show the current reading in a badge beside the dot. Off by default. The badge is a floating card, which is the shape a reader has learnt means "you touched something" — sitting there unasked it reads as a tooltip nobody opened. Turn it on where the chart has no header to put the reading in, and it becomes the only place the number is written. |
| `pulse` | `boolean` | `true` | Ring the dot with a repeating pulse. |
| `formatValue` | `(value: number) => string` | — | Format the badge. Defaults to a compact number. |
| `className` | `string` | — | — |

#### `LiveLineChartXAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | — | How many labels along the bottom. |
| `formatTick` | `(secondsAgo: number) => string` | — | Rewrites a label. Given how many seconds back the tick is. |
| `className` | `string` | — | — |

#### `LiveLineChartYAxisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `ticks` | `number` | — | How many labels up the side. |
| `formatValue` | `(value: number) => string` | — | Format a value. Defaults to a compact number. |
| `className` | `string` | — | — |

#### `LiveLineChartTooltipProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `formatValue` | `(value: number) => string` | — | Format the value. Defaults to a compact number. |
| `className` | `string` | — | — |
| `activateAfterLongPress` | `number` | `180` | How long a press has to be held before the readout takes the touch, in milliseconds. Until then the touch belongs to whatever else wants it: a quick tap still reaches a button floating over the chart, and a swipe still scrolls the screen the chart sits in. Set `0` to read on contact, only for a chart with nothing over it and no scroll view around it. |

#### `LiveLineChartSkeletonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `string` | — | — |

#### `LiveLineChartHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `title` | `string` | — | Small line above the value — what is being watched. |
| `value` | `string` | — | The readout. Left out, it shows the current reading. |
| `caption` | `string` | — | One muted line under the value. |
| `formatValue` | `(value: number) => string` | — | Format the derived value. Defaults to a compact number. |
| `children` | `ReactNode` | — | Trailing slot — a pause control, a badge, a unit. |

### Example — A metric off a socket

Append to `data` as readings arrive and the chart does the rest. Times are milliseconds, as `Date.now()` gives them.

Old readings are dropped past `maxPoints` — they are off the window and cannot come back, and an unbounded feed otherwise grows an array for as long as the screen is open.

```tsx
const [points, setPoints] = useState<LiveLinePoint[]>([]);

useEffect(() => {
  const timer = setInterval(() => {
    setPoints((current) => [...current, { time: Date.now(), value: read() }]);
  }, 500);
  return () => clearInterval(timer);
}, []);

<LiveLineChart data={points} window={30}>
  <LiveLineChart.Header title="Requests / sec" />
  <LiveLineChart.Grid />
  <LiveLineChart.Area />
  <LiveLineChart.Line />
  <LiveLineChart.Tip />
  <LiveLineChart.XAxis />
</LiveLineChart>
```

### Notes

The y-axis follows what is *visible*, not everything kept. A spike that has scrolled off the left edge stops holding the axis open, so a feed that settles is not left flat against the bottom of a plot scaled for something that happened a minute ago. Pass `yDomain` to fix it instead.

The chart owns one canonical buffer: non-finite readings are ignored, out-of-order timestamps are sorted, and the last reading at a duplicate timestamp replaces the earlier one. `maxPoints` is applied after that normalization, so a controlled replacement or a smaller limit cannot leave a stale point selected.
`Tip` draws a dot and nothing else unless `badge` is passed. The badge is a floating card, which is the shape a reader has learnt means they touched something — sitting there unasked it reads as a tooltip that opened by itself. Turn it on for a chart with no header to put the reading in. It hides itself while the crosshair is out either way, so there is never a second card answering a different question.

The visual Header value, axes, Tip badge, crosshair and Tooltip are hidden from the accessibility tree because the chart snapshot already carries their reading. Header action children remain ordinary accessible controls. Existing Header, Tip and Tooltip formatters are reused for the snapshot. It updates when data or state renders, but it is not a live region and does not announce every frame. `Tooltip` read-back remains a touch interaction; `onActivePointChange` reports that interaction but is not an action, so the chart does not claim adjustable controls. Render application errors beside or instead of the chart — `status` models only `loading` and `ready`.

`paused` holds the whole picture, not only the clock. Readings keep arriving behind the frozen edge, and the y-axis, the tip and the momentum colour are all derived from the newest one — left live they would go on rescaling, chasing and recolouring under a line that has stopped, which is a held chart that is still moving.

The tip rides the newest reading rather than the right-hand edge. Pinning it to the edge would hold it still and steady, which is the picture of a feed that is working.

The x-axis is labelled in offsets from now — `-30s`, `-15s`, `now` — rather than clock times. A moving window labelled with wall-clock times rewrites every label on every frame.

The frame callback stops on unmount, while the app is backgrounded, on `paused`, on `status="loading"`, and never starts under reduced motion. Returning to the app synchronizes the window before drawing resumes. Nothing else in the library animates without an interaction or a change of data, so a chart left mounted off-screen is worth `paused`.

---

Full page, with every example: https://panelui.dev/docs/charts/live-line-chart
