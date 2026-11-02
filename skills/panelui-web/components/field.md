# Field

A form control with its label, a line of help and its error, wired to each other.

```tsx
import { Field } from "@/components/panelui/field"
```

From npm the path is `panelui-web/field`. Install with `npx shadcn@latest add @panelui/field`.

## When to use it

Use a field around a form control to give it a label, a line of help and an error message, all tied to the control for screen readers without ids passed by hand.

Input, Textarea, Select, Checkbox, Radio Group and Switch all work inside a field. `Field.Label` is a [Label](/docs/web/components/label), so `required`, `optional` and the label's parts work in it.

## Usage

```tsx
<Field name="email">
  <Field.Label>Work email</Field.Label>
  <Input type="email" required />
  <Field.Description>We send the receipt here.</Field.Description>
  <Field.Error match="valueMissing">Enter an email address.</Field.Error>
</Field>
```

## Parts

```tsx
<Field>
  <Field.Label />
  {/* the control */}
  <Field.Description />
  <Field.Error />
</Field>
```

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `FieldProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `FieldDescriptionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `FieldErrorProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

## Notes

#### Field.Error

With no children, it shows the browser's own message for the failed check.

#### Disabled

`disabled` on the field disables its control and fades its label.

## Example

```tsx
import { Field } from '@/components/panelui/field';
import { Input } from '@/components/panelui/input';

export default function FieldOverview() {
  return (
    <Field className="max-w-xs">
      <Field.Label>Company name</Field.Label>
      <Input placeholder="Larkspur Joinery" />
      <Field.Description>Printed on every invoice you send.</Field.Description>
    </Field>
  );
}
```
