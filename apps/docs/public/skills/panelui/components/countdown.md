# Countdown

The time left until a moment, ticking down to it.

```tsx
import { Countdown } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Countdown } from '@/components/ui/countdown';
```

### Usage

```tsx
const [launch] = useState(() => Date.now() + 2 * 86400 * 1000);

<Countdown to={launch} />
```

### Variants

- **variant** — `segmented` *(default)*, `inline`
- **size** — `sm`, `md` *(default)*, `lg`

### Props

#### `CountdownProps`

Extends `Omit<ViewProps, 'children'>, CountdownVariantProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `to` | `Date \| number` | **required** | The moment to count down to, as a `Date` or epoch milliseconds. |
| `units` | `CountdownUnit[]` | — | Which units to show, largest to smallest. The largest one absorbs everything above it — `['hours', 'minutes', 'seconds']` shows two days as 48 hours. Defaults to all four. |
| `trim` | `boolean` | `true` | Drop leading units while they are zero, so a launch three hours away has no "00 days" box. The smallest two always stay. |
| `labels` | `Partial<Record<CountdownUnit, string>>` | — | Names under each box in `segmented`. Pass any subset to translate them. |
| `urgentBelow` | `number` | — | Turn the digits to the destructive colour once this many seconds or fewer are left — the last five minutes of a sale, the last ten seconds of a bid. |
| `onComplete` | `() => void` | — | Called once when the time is up, including on mount if it already is. |
| `onTick` | `(secondsLeft: number) => void` | — | Called with the whole seconds left each time the display changes. |

### Example — Inline

`variant="inline"` writes the time as a line of text, `2d 14:03:22`, for a banner, a card header or the line under a field. Put your own words around it in a row.

```tsx
<View className="flex-row items-baseline gap-1.5">
  <Text size="sm" muted>Ends in</Text>
  <Countdown to={saleEnds} variant="inline" size="sm" />
</View>
```

### Notes

### Keep `to` stable

`to` is the moment itself, not a duration. Compute it once, in state or from your data, and pass the same value on every render. `Date.now() + 30_000` written straight into the JSX makes a new target on every render, so the countdown restarts each time the parent renders.

### Accessibility

The countdown is a single element with the `timer` role. Its label is coarser than the display: it names days, hours and minutes, and counts seconds only in the last minute. A label that changed every second would be read again every second.

### Motion

When a digit changes, the old one slides down and out and the new one comes in from above. Only the digits that changed move. Nothing animates on the first render, and nothing animates when reduce motion is on.

---

Full page, with every example: https://panelui.dev/docs/components/countdown
