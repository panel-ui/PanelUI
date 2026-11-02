# Checkbox

One choice that is on or off, with a tick that draws itself and a parent box for a group.

```tsx
import { Checkbox } from "@/components/panelui/checkbox"
```

From npm the path is `panelui-web/checkbox`. Install with `npx shadcn@latest add @panelui/checkbox`.

## When to use it

Use a checkbox for a choice that applies when a form is sent, such as accepting terms, or for picking any number of items from a list.

For a setting that takes effect the moment it changes, use a [Switch](/docs/web/components/switch). For one choice out of several, use a [Radio Group](/docs/web/components/radio-group).

Give every checkbox a name. Wrap it in a [Label](/docs/web/components/label), or pass `label` when its name is shown elsewhere.

## Usage

```tsx
<Label>
  <Checkbox defaultChecked />
  <Label.Text>Email me a receipt</Label.Text>
</Label>
```

## Parts

```tsx
<Checkbox.Group>
  <Checkbox parent />
  <Checkbox value="…" />
</Checkbox.Group>
```

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `CheckboxProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `size` | `CheckboxSize` | `md` | Default `md`. |
| `color` | `CheckboxColor` | `primary` | The colour it fills with when checked. `primary` by default. |
| `label` | `string` | — | What a screen reader calls it, when there is no visible label tied to it. |
| `className` | `string` | — | — |
| `style` | `CSSProperties` | — | — |

#### `CheckboxGroupProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

## Notes

#### Motion

The tick is drawn as a line, the way a pen makes it, and is drawn back out when unchecked. With reduced motion turned on, it appears at once.

#### In a form

Pass `name` and the checkbox submits with the form. `value` sets what it submits, and is what a `Checkbox.Group` holds.

## Example

```tsx
import { Checkbox } from '@/components/panelui/checkbox';
import { Label } from '@/components/panelui/label';

export default function CheckboxOverview() {
  return (
    <div className="flex w-full max-w-xs flex-col gap-3">
      <Label>
        <Checkbox defaultChecked />
        <Label.Text>Keep me signed in</Label.Text>
      </Label>
      <Label>
        <Checkbox />
        <Label.Text>Send me the monthly digest</Label.Text>
      </Label>
      <Label>
        <Checkbox disabled />
        <Label.Text>Share usage data</Label.Text>
        <Label.Hint>Admins only</Label.Hint>
      </Label>
    </div>
  );
}
```
