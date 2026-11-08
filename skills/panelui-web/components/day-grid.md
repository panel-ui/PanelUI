# Day Grid

A run of days as a field of dots, each sized by how much happened on it.

```tsx
import { DayGrid, type DayCell } from "@/components/panelui/day-grid"
```

From npm the path is `panelui-web/day-grid`. Install with `npx shadcn@latest add @panelui/day-grid`.

## When to use it

Use it to show how much happened on each day of a period: words written, commits pushed, minutes practised. Each day is a dot that grows with the amount, from a speck for an empty day to a full disc for the busiest, and the days can run along rows or down columns.

It shows a pattern, not a figure. Nobody can read a count off the size of a dot, so put the number that matters beside the grid, and give each day a `label`: it is shown in a tag when the pointer is over that day.

For values over two dimensions that are not days, such as hour against weekday, use a table or a chart with axes.

## Usage

```tsx
const days: DayCell[] = [
  { level: 0, label: '1 Sep, nothing written' },
  { level: 2, label: '2 Sep, 880 words' },
  { level: 4, label: '3 Sep, 2,210 words' },
]

<DayGrid cells={days} columns={7} />
<DayGrid.Legend />
```

## Parts

```tsx
<DayGrid.Weekdays />
<DayGrid cells={…} />
<DayGrid.Legend />
<DayGrid.Caption>
  <DayGrid.Title />
  <DayGrid.Description />
</DayGrid.Caption>
```

- `DayGrid.Legend` — The five sizes in a row, quietest to busiest, with a word at each end. It is a sibling of the grid, so place it wherever the layout wants it and give it the same `color`.
- `DayGrid.Weekdays` — The days of the week down the side of a grid that runs a week to a column (`rows={7}`). Put it in a row with the grid. `labels` sets the names, an empty string for a row left unnamed; the default names every other day.
- `DayGrid.Caption` — What the picked day holds, written out beside the grid. It is read out politely each time the pick changes.
- `DayGrid.Title` — The picked day's figure, such as "17 merged".
- `DayGrid.Description` — The picked day's date, quieter, under its figure.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `DayGridProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `cells` | `DayCell[]` | **required** | The days, in order. They fill the grid row by row. |
| `columns` | `number` | `7` | Cells per row. Seven makes each row a week. |
| `rows` | `number` | — | Cells per column. Giving this fills the grid column by column, and `columns` is ignored. Seven makes each column a week, which lays a long period out wide and short. |
| `offset` | `number` | `0` | Empty slots before the first day, for a period that starts partway through the first row or column. Use it when a month does not begin on the first day of the week: `rows={7}` with `offset={4}` leaves four slots in the first column and puts the first day on a Friday. The offset is not a day: it holds space only, so it is left out of the summary and never becomes a button. |
| `color` | `DayGridColor` | `'primary'` | Which of the theme's roles the dots are drawn in. |
| `value` | `number \| null` | `null` | The index of the selected day, when the caller holds it. |
| `onValueChange` | `(index: number) => void` | — | Called with the index of a day when it is pressed. Passing this makes the days buttons; without it the grid is a picture. |
| `lens` | `boolean` | `true` | Set to `false` for dots that hold still under the pointer. |
| `label` | `string` | `'Activity'` | What a screen reader calls the grid. |
| `summary` | `(counts: DayGridSummaryCounts) => string` | — | The sentence a screen reader says for the whole grid, written in the reader's language. It is given `active`, the days with something on them, and `total`, every day in the grid. Without it the grid says the same thing in English. |

#### `DayGridLegendProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `DayGridColor` | `'primary'` | The same role the grid is drawn in. |
| `less` | `ReactNode` | `'Less'` | The word at the quiet end of the scale. |
| `more` | `ReactNode` | `'More'` | The word at the busy end of the scale. |

#### `DayGridWeekdaysProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `labels` | `string[]` | — | The name written beside each row, first row first. An empty string leaves a row unnamed. Default Monday to Sunday with every other name left out. |

#### `DayGridCaptionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |

#### `DayGridTitleProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'p',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'day-grid-title', className: dayGridVariants().title({ className }) }, props),` | **required** | — |

#### `DayGridDescriptionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'p',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |

## In a Server Component

`DayGrid` is a client component. A Server Component cannot read `DayGrid.Legend` off the import, so import each part by name: `DayGridLegend`, `DayGridWeekdays`, `DayGridCaption`, `DayGridTitle`, `DayGridDescription`.

## Notes

#### Levels

A day's `level` is a whole number from 0 to 4. Level 0 is a small grey speck and means the day was measured and nothing happened. Levels 1 to 4 are dots of growing size and strength in the chosen colour, and a level 4 dot has a faint glow.

The component does not turn counts into levels, because where the steps fall depends on the data. Decide the four thresholds once and map your counts through them.

#### The lens

Dots within about two cells of the pointer grow, the nearest most. It follows a mouse or a pen and does nothing for touch, where a finger would cover it. Pass `lens={false}` to turn it off. It is also off for anyone who has asked their system for reduced motion.

#### Arriving

The dots grow in from nothing when the grid mounts, one diagonal after the next. With reduced motion on they are simply there.

#### Layout

Days fill the grid row by row and stay round at any width. `columns` defaults to 7, which makes each row a week and the grid tall. For a strip that runs along one line, set `columns` to the number of days.

Give `rows` and the days run down each column, `rows` to a column, for as many columns as it takes. `rows={7}` makes each column a week, which lays a long period out wide and short.

Give `offset` when the period starts partway through the first week. It leaves that many empty slots before the first day, and counts towards the number of columns or rows the grid needs, so a month that starts on a Friday still rests on the right weekday. An offset is not a day: it holds space only, so the summary and the `onValueChange` indexes count the days alone.

The grid takes the width of its container. Set a `max-w-*` class on it or on its parent to stop the dots growing too large.

#### Labels

`label` on a day is its tag and what a screen reader says for it, so write the date and the figure: "14 May, 6 commits". A day without a label has no tag, and a pressable one is announced by its position and level.

The grid as a whole is announced with its `label` and how many of the days have something on them. Pass `summary` to write that sentence yourself, in your own language: it is given the counts, so you do not have to work them out again. An `aria-label` put straight on the grid is merged after the summary and takes its place, but it knows nothing about the counts.

#### Keyboard

When the days are buttons, Tab moves to the selected day, or the first. The arrow keys move to the cell beside, above or below, whichever way the days run, and Home and End go to the first and last day. Landing on the day that already has focus is not a press, so it is not reported again.

## Example

```tsx
'use client';

import { DayGrid, type DayCell, type DayLevel } from '@/components/panelui/day-grid';
import { Frame } from '@/components/panelui/frame';
import { Stat } from '@/components/panelui/stat';

/** Words written on each of the last 112 days, oldest first, starting on a Monday. */
const WORDS = [
  0, 420, 1310, 880, 0, 0, 240, 1650, 1920, 760, 0, 310, 0, 0, 980, 1440, 2210, 1180, 640, 0, 0,
  1890, 2460, 1730, 920, 0, 150, 0, 2050, 1380, 0, 1120, 1960, 0, 0, 870, 2320, 1610, 1240, 2580,
  430, 0, 0, 0, 760, 1340, 0, 0, 280, 1470, 1980, 2240, 640, 1010, 0, 0, 2120, 940, 1760, 0, 520, 0,
  190, 1560, 2380, 1820, 2050, 1290, 0, 0, 0, 610, 1430, 1070, 0, 0, 0, 2290, 2510, 1940, 1680, 730,
  0, 360, 1210, 0, 1850, 2400, 1530, 0, 0, 990, 1720, 2160, 0, 1340, 220, 0, 2070, 2450, 1890, 2630,
  1160, 0, 0, 1480, 2220, 1960, 2540, 870, 410, 0,
];

/** A day's count as one of the five sizes. */
const levelOf = (words: number): DayLevel =>
  words === 0 ? 0 : words < 600 ? 1 : words < 1300 ? 2 : words < 2000 ? 3 : 4;

const START = new Date(2026, 5, 22);

const CELLS: DayCell[] = WORDS.map((words, index) => {
  const day = new Date(START);
  day.setDate(START.getDate() + index);
  const date = day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return {
    level: levelOf(words),
    label: words === 0 ? `${date}, nothing written` : `${date}, ${words.toLocaleString('en-GB')} words`,
  };
});

export default function DayGridWriting() {
  const total = WORDS.reduce((sum, words) => sum + words, 0);
  const written = WORDS.filter((words) => words > 0).length;

  return (
    <Frame variant="band" className="w-full max-w-2xl">
      <Frame.Header>
        <Frame.Title>Words written</Frame.Title>
        <Frame.Action>Last 16 weeks</Frame.Action>
      </Frame.Header>

      <Frame.Panel className="gap-4 p-5">
        <Stat>
          <Stat.Content>
            <Stat.Label>In total</Stat.Label>
            <Stat.Value>{total.toLocaleString('en-GB')}</Stat.Value>
          </Stat.Content>
          <Stat.Badge>
            {written} of {WORDS.length} days
          </Stat.Badge>
        </Stat>

        {/* A week to a column: `rows` runs the days downwards. */}
        <div className="flex gap-2">
          <DayGrid.Weekdays />
          <DayGrid cells={CELLS} rows={7} color="success" label="Words written" />
        </div>

        <DayGrid.Legend color="success" className="self-end" />
      </Frame.Panel>
    </Frame>
  );
}
```
