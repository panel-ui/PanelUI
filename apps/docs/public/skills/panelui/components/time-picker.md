# TimePicker

A time of day, as a wheel, a clock or a swipeable scale.

```tsx
import { TimePicker } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { TimePicker } from '@/components/ui/time-picker';
```

### Usage

```tsx
const [time, setTime] = useState<TimeValue>();

<TimePicker value={time} onValueChange={setTime} />
```

### Variants

- **readout** — `default` *(default)*, `compact`, `none`

### Parts

- `TimePicker.Trigger` — Wraps a trigger of your own and opens the panel on press. Pass a child to the picker instead and it is wrapped for you.

### Props

#### `TimePickerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `TimeValue` | — | Controlled selection, as `{ hour, minute }` on a 24-hour clock. |
| `defaultValue` | `TimeValue` | — | Starting selection when uncontrolled. Defaults to the top of the hour. |
| `onValueChange` | `(value: TimeValue) => void` | — | — |
| `layout` | `TimePickerLayout` | `wheel` | Which face the panel draws. |
| `presentation` | `TimePickerPresentation` | `popover` | How the panel gets onto the screen. `inline` renders it with no trigger. |
| `open` | `boolean` | — | Controlled open state of the panel. |
| `onOpenChange` | `(open: boolean) => void` | — | — |
| `hourCycle` | `HourCycle` | `12` | `24` drops the meridiem column and writes hours 00–23. |
| `minuteStep` | `number` | — | Minutes between selectable times. `wheel` defaults to 1; `clock` and `ruler` default to 30 and 15, since both scroll the whole day at once. |
| `minTime` | `TimeValue` | — | Earliest selectable time, inclusive. |
| `maxTime` | `TimeValue` | — | Latest selectable time, inclusive. |
| `placeholder` | `string` | `Choose a time` | What the trigger reads when nothing has been chosen. |
| `format` | `(value: TimeValue) => string` | — | Override how the chosen time is written on the trigger. |
| `locale` | `string` | — | BCP 47 tag for the time's text and the meridiem labels. |
| `readout` | `TimePickerReadout` | `default` | How loudly the `ruler` face states the time it is on. The other two faces spell the time out in their own columns and hands, and ignore this. The big centred number is right when the scale is the only thing on the panel. Under something that outranks it — a calendar, a form row — it is the largest text on screen for the smaller half of the answer, so step it down with `compact` or take it over yourself with `none`. |
| `disabled` | `boolean` | `false` | Stop the trigger opening it, and the faces from being scrolled. |
| `className` | `string` | — | — |
| `children` | `ReactElement<{ onPress?: () => void }> \| ReactNode` | — | A trigger of your own. Given one, it is cloned with an `onPress` that opens the panel — so a field row or an icon button can stand in for the default button without this component knowing what either looks like. Ignored by `presentation="inline"`, which has no trigger. |

### Example — A time

The trigger reads back the chosen time and falls back to the placeholder. Nothing chosen yet means the wheel opens near the current hour rather than at midnight — an unset picker still has to open somewhere plausible.

```tsx
const [time, setTime] = useState<TimeValue>();

<TimePicker value={time} onValueChange={setTime} />
```

### Notes

**The value is always 0–23.** `displayHour` and `hourFromDisplay` are exported alongside it if you need the face's own numbering, but nothing stored should be in it.

**`minuteStep` defaults per layout.** `wheel` steps by 1, `clock` by 30 and `ruler` by 15 — the two that scroll the whole day at once need a coarser grid to be usable. Pass it explicitly and the layout stops mattering. The ruler keeps every resulting time reachable while mounting only a bounded slice of its ticks, including all 1,440 choices at `minuteStep={1}`.

**A chosen time off the step is rounded, not rejected.** At a 30-minute step 7:29 is a finger that stopped just short of half past, not a request for seven o'clock.

**Every face is a scroll view.** Momentum, deceleration and fling physics come from the platform, and the selection is the row it comes to rest on. That is also why the panel needs a definite width, which the presentations give it.

**The sheet gets a Done button and the popover does not.** A popover is dismissed by tapping anywhere outside it, which is most of the screen; a sheet's outside is the strip above it, and a scale under your thumb needs somewhere deliberate to finish.

### Tapping instead of dragging

A visible row in a column, or a tick on the ruler, can be tapped to pick it. Dragging is not the only way to change the time, which matters for anyone whose pointer cannot drag reliably. Screen readers step each column with increment and decrement instead.

---

Full page, with every example: https://panelui.dev/docs/components/time-picker
