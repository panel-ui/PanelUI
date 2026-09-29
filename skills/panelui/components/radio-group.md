# RadioGroup

Single-select list of options.

```tsx
import { RadioGroup } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { RadioGroup } from '@/components/ui/radio-group';
```

### Anatomy

```tsx
<RadioGroup>
  <RadioGroup.Item value="…" label="…" />
</RadioGroup>
```

### Variants

- **variant** — `dot` *(default)*, `card`
- **selected** — `true`
- **disabled** — `true`
- **horizontal** — `true`

### Parts

- `RadioGroup.Item` — One option. `value` identifies it, `label` is what is shown.

### Props

#### `RadioGroupProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `value` | `string` | — | — |
| `onValueChange` | `(value: string) => void` | **required** | — |
| `disabled` | `boolean` | — | — |
| `variant` | `RadioVariant` | `dot` | `dot` is the label-beside-a-disc row. `card` makes the whole surface the target and highlights the selected option — for a plan picker or a settings choice where each option carries a description. |
| `orientation` | `RadioOrientation` | `vertical` | `horizontal` lays the options out along a row that wraps — for two or three short choices, where a stacked list wastes the width and reads as longer than it is. |
| `children` | `ReactNode` | **required** | — |

#### `RadioGroupItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Styles the pressable row — layout, border, fill. It does not reach the label: text colour is not inherited from a view in React Native, so use `labelClassName` for that. |
| `value` | `string` | **required** | — |
| `label` | `string` | — | — |
| `labelClassName` | `string` | — | Classes for the label text, merged over the defaults — e.g. `text-black`. |
| `description` | `string` | — | Secondary line under the label. Most at home in the `card` variant. |
| `descriptionClassName` | `string` | — | Classes for the description text, merged over the defaults. |
| `disabled` | `boolean` | — | — |
| `hideIndicator` | `boolean` | — | Hide the disc entirely — for a card whose selected fill is enough. |
| `children` | `ReactNode` | — | — |

### Example — A list of plans

The group owns the value; each item reports its own value up and reads selection back down.

```tsx
const [plan, setPlan] = useState("pro");

<RadioGroup value={plan} onValueChange={setPlan}>
  <RadioGroup.Item value="free" label="Free — $0/month" />
  <RadioGroup.Item value="pro" label="Pro — $12/month" />
  <RadioGroup.Item value="team" label="Team — $36/month" />
</RadioGroup>
```

### Notes

The row of a `dot` item is only as wide as its label, so the empty space beside it is not part of the target — pressing nothing selects nothing. A `card` is the opposite on purpose: there the whole surface is what you aim at.

The options wrap rather than scroll when laid out horizontally. A choice that has run off the edge of the screen is a choice nobody knows is there.

Pressing the already selected option is a no-op: `onValueChange` runs only when an item requests a different value. This keeps controlled form side effects tied to real selection changes.

---

Full page, with every example: https://panelui.dev/docs/components/radio-group
