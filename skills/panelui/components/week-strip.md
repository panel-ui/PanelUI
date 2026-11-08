# WeekStrip

One row of days to pick from, with marks for what is on each.

```tsx
import { WeekStrip } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { WeekStrip } from '@/components/ui/week-strip';
```

### Usage

```tsx
const [day, setDay] = useState(() => new Date());

<WeekStrip value={day} onValueChange={setDay} weekStartsOn="auto" />
```

### Variants

- **size** — `sm`, `md` *(default)*
- **selected** — `true`
- **today** — `true`
- **dim** — `true`

### Props

#### `WeekStripProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `Date \| null` | — | The selected day. |
| `onValueChange` | `(day: Date) => void` | — | Called with the day that was pressed. |
| `week` | `Date` | — | Which week to show, as any day inside it. Defaults to the week of `value`, or this week. Ignored when `scroll` is set. |
| `scroll` | `boolean` | `false` | Lay out `length` days from `start` in fixed-width cells that scroll sideways, instead of the seven days of one week filling the row. |
| `start` | `Date` | — | The first day of a scrolling strip. Defaults to today. |
| `length` | `number` | `14` | How many days a scrolling strip holds. Default 14. |
| `weekStartsOn` | `number \| 'auto'` | `0` | The first day of the week, 0 for Sunday to 6 for Saturday, or `auto` to ask the locale. Default 0. |
| `locale` | `DateLocale` | — | The locale for weekday names and spoken dates. Defaults to the device's. |
| `size` | `WeekStripSize` | `md` | How big the days are. `sm` suits a header; `md` is the default. |
| `disabled` | `(day: Date) => boolean` | — | Days that cannot be picked. They are faded and do not respond. |
| `faded` | `(day: Date) => boolean` | — | Days that are faded but can still be picked, such as days in the past. |
| `marks` | `(day: Date) => WeekStripMarks \| undefined` | — | What each day shows beneath its number and in its corner. |
| `today` | `Date` | — | The day counted as today. Defaults to the current date. |

### Example — Marks

`marks` returns what each day shows: up to three `dots` in theme tones, a short `label` in their place, or a `corner` dot for a day that needs attention.

```tsx
<WeekStrip
  value={day}
  onValueChange={setDay}
  marks={(date) => (date.getDay() === 3 ? { dots: ['primary', 'success'] } : undefined)}
/>
```

### Notes

### The week

`weekStartsOn` is the first day of the week, 0 for Sunday to 6 for Saturday. `auto` asks `locale`, the same way Calendar does, so `en-GB` starts on Monday. `week` picks which week is shown; it defaults to the week of `value`, or this week.

### Today

Today has a ring, and the selected day is filled. Pass `today` to set the day counted as today, for a screen that is showing a different time zone.

### Accessibility

Each day is a button. A screen reader hears the whole date in `locale`, followed by its label when it has one, and the selected day is announced as selected. Disabled days are announced as disabled.

---

Full page, with every example: https://panelui.dev/docs/components/week-strip
