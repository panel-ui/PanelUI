# Checkbox

Animated checkbox, as a row or a selectable card.

```tsx
import { Checkbox } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Checkbox } from '@/components/ui/checkbox';
```

### Usage

```tsx
<Checkbox
  checked={accepted}
  onCheckedChange={setAccepted}
  label="Marketing & promotions"
  description="Special offers and exclusive deals"
/>

<Checkbox
  variant="card"
  checked={plan === 'pro'}
  onCheckedChange={() => setPlan('pro')}
  label="Pro"
  description="Advanced analytics and priority support."
/>
```

### Variants

- **variant** — `default` *(default)*, `card`
- **checked** — `true`
- **disabled** — `true`

### Props

#### `CheckboxProps`

Extends `VariantProps<typeof checkboxVariants>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Styles the pressable row — layout, border, fill. It does not reach the label: text colour is not inherited from a view in React Native, so use `labelClassName` for that. |
| `checked` | `boolean` | **required** | — |
| `onCheckedChange` | `(checked: boolean) => void` | — | — |
| `indeterminate` | `boolean` | — | A third, in-between state for a box that governs a group of others — some on, some off. It fills like a checked box but shows a dash rather than a tick, and announces itself as `mixed` to a screen reader. Pressing it resolves the ambiguity by turning the whole group on, so the press reports `true`. `indeterminate` overrides `checked` for what is drawn. |
| `disabled` | `boolean` | — | — |
| `label` | `string` | — | Optional label rendered next to the box; pressing it also toggles. |
| `labelClassName` | `string` | — | Classes for the label text, merged over the defaults — e.g. `text-black`. |
| `description` | `string` | — | Secondary line under the label, for extra context. |
| `descriptionClassName` | `string` | — | Classes for the description text, merged over the defaults. |

### Example — Controlled

`checked` is required — the checkbox holds no state of its own.

```tsx
const [accepted, setAccepted] = useState(false);

<Checkbox
  checked={accepted}
  onCheckedChange={setAccepted}
  label="I accept the terms"
/>
```

### Notes

With a `description` the row aligns the box to the label rather than centring it against the whole block. The card variant moves the box after the content so it sits top-right, and takes the primary border when checked.

### The indeterminate state

`indeterminate` is the third state a parent box needs when it governs a group whose children are partly on. It fills like a checked box but draws a dash instead of a tick, and announces itself to a screen reader as `mixed` rather than a plain boolean. `indeterminate` overrides `checked` for what is drawn; pressing an indeterminate box resolves the group by turning it fully on, so the press reports `true`.

---

Full page, with every example: https://panelui.dev/docs/components/checkbox
