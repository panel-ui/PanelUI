# Input

A single line to type into, with icons, units and buttons set inside its box.

```tsx
import { Input } from "@/components/panelui/input"
```

From npm the path is `panelui-web/input`. Install with `npx shadcn@latest add @panelui/input`.

## When to use it

Use it for one line of text: a name, an email address, a search. For more than one line, use [Textarea](/docs/web/components/textarea), and for a choice from a fixed list, [Select](/docs/web/components/select).

`Input.Group` draws one box round the input and anything set beside it, an icon, a unit or a button, so they read as one field and the focus ring goes round all of it.

It has no label of its own. Put it in a field with a label, or give it an `aria-label` where the label is somewhere a screen reader cannot tie to it.

## Usage

```tsx
<Input placeholder="you@company.com" type="email" />

<Input.Group>
  <Input.Addon>
    <SearchIcon />
  </Input.Addon>
  <Input placeholder="Search" aria-label="Search" />
  <Input.Addon align="end">
    <kbd>⌘K</kbd>
  </Input.Addon>
</Input.Group>
```

## Parts

```tsx
<Input />

<Input.Group>
  <Input.Addon />
  <Input />
  <Input.Addon align="end" />
</Input.Group>
```

- `Input.Group` — One box round the input and its addons. It takes the `size`, and draws the border, background and focus ring the input drops inside it.
- `Input.Addon` — An icon, text, shortcut or button beside the input, inside the box. `align="end"` puts it after the input. Pressing it, where it is not a button, puts focus in the input.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `InputProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `size` | `InputSize` | `md` | Its height and text size. Inside a group, set it on the group instead. Default `md`. |

#### `InputGroupProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `size` | `InputSize` | `md` | The height of the input and its addons together. Default `md`. |

#### `InputAddonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `align` | `'start' \| 'end'` | `start` | Which side of the input it sits on, whatever its place in the markup. Default `start`. |

## In a Server Component

`Input` is a client component. A Server Component cannot read `Input.Group` off the import, so import each part by name: `InputGroup`, `InputAddon`.

## Notes

#### Invalid

Set `aria-invalid` on the input when its value is wrong. The border turns to the destructive colour, on the input alone or on the group round it, and a screen reader announces the field as invalid. Say what is wrong in text near it as well.

#### Disabled

A disabled input is faded and cannot be focused. In a group the whole group fades with it.

#### Every attribute passes through

`Input` renders an `<input>` and passes everything to it, so `name`, `required`, `autoComplete`, `inputMode` and the rest work as they do on the element.

## Example

```tsx
import { Field } from '@/components/panelui/field';
import { MailIcon, SearchIcon } from 'lucide-react';
import { Input } from '@/components/panelui/input';

export default function InputFields() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-5">
      <Input.Group>
        <Input.Addon>
          <SearchIcon />
        </Input.Addon>
        <Input placeholder="Search the handbook" aria-label="Search the handbook" />
        <Input.Addon align="end">
          <kbd>⌘K</kbd>
        </Input.Addon>
      </Input.Group>
      <Field>
        <Field.Label>Work email</Field.Label>
        <Input.Group>
          <Input.Addon>
            <MailIcon />
          </Input.Addon>
          <Input type="email" placeholder="you@company.com" />
        </Input.Group>
        <Field.Description>We send the receipt here.</Field.Description>
      </Field>
      <Field>
        <Field.Label>Display name</Field.Label>
        <Input defaultValue="Rosa Okafor" />
      </Field>
    </div>
  );
}
```
