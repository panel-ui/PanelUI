# WeekHoursGrid

A week of hours, one row per day, with the taken parts filled in.

```tsx
import { WeekHoursGrid } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { WeekHoursGrid } from '@/components/ui/week-hours-grid';
```

### Usage

```tsx
<WeekHoursGrid
  from={6}
  to={22}
  ticks={[6, 10, 14, 18, 22]}
  rows={[
    { key: 'mon', label: 'Mon', blocks: [{ start: 9, end: 12 }, { start: 16, end: 20 }] },
    { key: 'sun', label: 'Sun', off: true, blocks: [] },
  ]}
/>
```

### Props

#### `WeekHoursGridProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `rows` | `WeekHoursRow[]` | **required** | The rows, top to bottom. |
| `from` | `number` | — | The first visible hour. Default 0. |
| `to` | `number` | — | The last visible hour. Default 24. |
| `ticks` | `(number \| string)[]` | — | The labels under the bars, spread evenly from `from` to `to`. Numbers are written as two-digit hours; strings are shown as given. |
| `legend` | `WeekHoursLegendItem[]` | — | The entries under the grid, explaining each tone. |
| `onSelect` | `(key: string) => void` | — | Makes each row a button, called with the row's `key`. |
| `offLabel` | `string` | — | What a screen reader says for a row marked `off`. Default "off". |

### Example — Pressing a row

With `onSelect` each row is a button, called with the row's `key`. Mark the row being edited `selected` to outline it.

```tsx
<WeekHoursGrid
  from={6}
  to={22}
  rows={rows.map((row) => ({ ...row, selected: row.key === editing }))}
  onSelect={setEditing}
/>
```

### Notes

### Ticks

`ticks` are spread evenly from `from` to `to`, so pass evenly spaced hours. A number is written as a two-digit hour; a string is shown as given.

### Rows that are off

A row marked `off` is drawn faded with no blocks. A screen reader hears its label followed by `offLabel`, which defaults to "off".

### Accessibility

Each row is read as its label followed by every block as a range of times, such as "Mon, 09:00 to 12:00, 16:00 to 20:00". With `onSelect` the row is a button and a `selected` row is announced as selected. The ticks are hidden from assistive technology, since the times are already in each row's label.

---

Full page, with every example: https://panelui.dev/docs/components/week-hours-grid
