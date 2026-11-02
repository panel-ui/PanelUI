# Select

A button that opens a list of options and shows the one chosen.

```tsx
import { Select } from "@/components/panelui/select"
```

From npm the path is `panelui-web/select`. Install with `npx shadcn@latest add @panelui/select`.

## When to use it

Use it to choose one option from a list that is known in advance: a plan, a time zone, a sort order. For a list long enough to search, use a combobox, and for two or three options that should all be seen at once, radio buttons.

Opened with a pointer, the list is placed so the chosen option sits over the trigger. Where there is no room for that, it opens below.

Pass the options as `items` to the root, and the trigger shows the chosen option's label rather than its value.

## Usage

```tsx
<Select items={plans} defaultValue="team">
  <Select.Trigger>
    <Select.Value placeholder="Pick a plan" />
  </Select.Trigger>
  <Select.Content>
    {plans.map((plan) => (
      <Select.Item key={plan.value} value={plan.value} description={plan.price}>
        {plan.label}
      </Select.Item>
    ))}
  </Select.Content>
</Select>
```

## Parts

```tsx
<Select>
  <Select.Trigger>
    <Select.Value />
  </Select.Trigger>
  <Select.Content>
    <Select.Group>
      <Select.GroupLabel />
      <Select.Item />
    </Select.Group>
    <Select.Separator />
  </Select.Content>
</Select>
```

- `Select.Trigger` — The button that opens the list. `variant` is `default`, a field for a form; `ghost`, with no box until hovered, for a toolbar; or `pill`, a rounded chip with an edge. An icon put before the value is shown in it.
- `Select.Value` — The chosen option's label, or `placeholder` while nothing is chosen. Without `items` on the root, give it a function from a value to what to show.
- `Select.Content` — The list, opened in a layer over the page. `alignItemWithTrigger={false}` always opens it below the trigger instead of over it.
- `Select.Item` — One option, with a check when chosen. `description` adds a second, quieter line, and `icon` an icon before the label.
- `Select.Group` — Options that belong together. A screen reader announces them by their `Select.GroupLabel`.
- `Select.GroupLabel` — The heading of a group.
- `Select.Separator` — A rule between groups.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `SelectTriggerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `'default' \| 'ghost' \| 'pill'` | `default` | `default` is a field, `ghost` has no box until hovered, `pill` is a rounded chip. Default `default`. |
| `size` | `'sm' \| 'md' \| 'lg'` | `md` | Its height and text size. Default `md`. |
| `icon` | `ReactNode` | — | Replaces the chevron at the end. Pass `null` for none. |
| `className` | `string` | — | — |

#### `SelectValueProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `SelectContentProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `side` | `BaseSelect.Positioner.Props['side']` | `'bottom'` | Which side of the trigger it opens on, when it is not placed over it. Default `bottom`. |
| `align` | `BaseSelect.Positioner.Props['align']` | `'start'` | How it lines up with the trigger along that side. Default `start`. |
| `sideOffset` | `number` | `6` | The gap between the trigger and the list, in pixels. Default `6`. |
| `alignItemWithTrigger` | `boolean` | `true` | Whether a pointer opens it with the chosen option over the trigger. Default `true`. |
| `container` | `BaseSelect.Portal.Props['container']` | — | Where in the document the list is put. Default `document.body`. |
| `className` | `string` | — | — |

#### `SelectItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `description` | `ReactNode` | — | A second, quieter line under the label. |
| `icon` | `ReactNode` | — | An icon before the label. |
| `className` | `string` | — | — |

#### `SelectGroupProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `SelectGroupLabelProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `SelectSeparatorProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |

## In a Server Component

`Select` is a client component. A Server Component cannot read `Select.Trigger` off the import, so import each part by name: `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectGroupLabel`, `SelectSeparator`.

## Notes

#### Keyboard

With the trigger focused, Enter, Space or the arrow keys open the list. The arrow keys move through the options, typing jumps to one by its first letters, Enter chooses, and Escape closes the list without changing anything.

#### Forms

Give the root a `name` and the chosen value is sent with the form it is in, as a native select's would be. `required` and `disabled` work on the root as well.

#### Controlled

`value` and `onValueChange` on the root hold the choice from outside. `onValueChange` is called with the option's `value`, or `null` when the choice is cleared.

## Example

```tsx
'use client';

import { Field } from '@/components/panelui/field';
import { Select } from '@/components/panelui/select';

const PLANS = [
  { value: 'solo', label: 'Solo', price: 'Free, one editor' },
  { value: 'team', label: 'Team', price: '$12 per editor a month' },
  { value: 'studio', label: 'Studio', price: '$29 per editor a month' },
  { value: 'enterprise', label: 'Enterprise', price: 'Priced with you' },
];

export default function SelectPlans() {
  return (
    <Field className="w-full max-w-xs">
      <Field.Label>Plan</Field.Label>
      <Select items={PLANS} defaultValue="team">
        <Select.Trigger>
          <Select.Value placeholder="Pick a plan" />
        </Select.Trigger>
        <Select.Content>
          {PLANS.map((plan) => (
            <Select.Item key={plan.value} value={plan.value} description={plan.price}>
              {plan.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
      <Field.Description>You can change plan at the end of any month.</Field.Description>
    </Field>
  );
}
```
