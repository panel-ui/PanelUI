# Label

The name of a field, with its required mark, a hint and an action on one line.

```tsx
import { Label } from "@/components/panelui/label"
```

From npm the path is `panelui-web/label`. Install with `npx shadcn@latest add @panelui/label`.

## When to use it

Use it to name a field. It also carries what a reader needs to know about the field before filling it in: whether it must be filled, a hint such as a format or a limit, and an action at the far end of the line, such as a link to reset a password or a count of characters left.

Tie it to its control with `htmlFor`, or wrap it round the control. A label wrapped round a checkbox or switch reads that control's state: it fades when the control is disabled and turns to the destructive colour when the control is invalid. A label tied by `htmlFor` cannot see its control, so pass it `invalid` and `disabled` yourself.

`required` draws a mark for the eye only. Set `required` on the control too, because that is what a screen reader announces.

## Usage

```tsx
<Label htmlFor="email" required>
  Email
</Label>
<Input id="email" type="email" required />

<Label htmlFor="password">
  <Label.Text>Password</Label.Text>
  <Label.Action>
    <a href="/reset">Forgot it?</a>
  </Label.Action>
</Label>
<Input id="password" type="password" />
```

## Parts

```tsx
<Label>
  <Label.Text />
  <Label.Hint />
  <Label.Action />
</Label>
```

- `Label.Text` — The field's name. A string passed straight to `Label` is wrapped in it for you. It truncates rather than pushing the action off the line, and the required mark is drawn after it.
- `Label.Hint` — A quieter word or two after the name: a format, a limit, a unit. On an invalid label it turns to the destructive colour, so it can say what is wrong. Give it an `id` and point the control's `aria-describedby` at it, so a screen reader reads it too.
- `Label.Action` — Pushed to the far end of the line, whatever its place in the markup: a link, a count, a small button, a switch.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `LabelProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `required` | `boolean` | `false` | Marks the field as one that must be filled. The mark is for the eye; set `required` on the control as well, which is what a screen reader announces. |
| `optional` | `boolean` | `false` | Shows "Optional" after the text, for a form where most fields are required. |
| `invalid` | `boolean` | `false` | Turns the label to the destructive colour. Needed when the label is tied to its control by `htmlFor`; a label wrapped round its control reads it. |
| `disabled` | `boolean` | `false` | Fades the label. As with `invalid`, a wrapped control is read on its own. |

#### `LabelTextProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'span',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |
| `className` | `slots.text({ className }),` | **required** | — |

#### `LabelHintProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'span',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'label-hint', className: labelVariants().hint({ className }) }, props),` | **required** | — |

#### `LabelActionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'span',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'label-action', className: labelVariants().action({ className }) }, props),` | **required** | — |

## In a Server Component

`Label` is a client component. A Server Component cannot read `Label.Text` off the import, so import each part by name: `LabelText`, `LabelHint`, `LabelAction`.

## Notes

#### Required and optional

`required` draws an asterisk after the text. `optional` writes "Optional" after it instead, for a form where most fields are required and the few that are not need saying.

#### Every attribute passes through

`Label` renders a `<label>` and passes everything to it, so `htmlFor`, `id` and the rest work as they do on the element.

#### It renders on the server

`Label` has no client JavaScript. Its state reaches its parts through data attributes and CSS.

## Example

```tsx
'use client';

import { useState } from 'react';
import { Input } from '@/components/panelui/input';
import { Label } from '@/components/panelui/label';
import { Textarea } from '@/components/panelui/textarea';

const LIMIT = 160;

export default function LabelFields() {
  const [note, setNote] = useState('');

  return (
    <div className="flex w-full max-w-sm flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="booking-name" required>
          Name
        </Label>
        <Input id="booking-name" autoComplete="name" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="booking-email" required>
          <Label.Text>Email</Label.Text>
          <Label.Hint>For the confirmation</Label.Hint>
        </Label>
        <Input id="booking-email" type="email" autoComplete="email" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="booking-note" optional>
          <Label.Text>Anything we should know</Label.Text>
          <Label.Action className="tabular-nums">
            {note.length}/{LIMIT}
          </Label.Action>
        </Label>
        <Textarea
          id="booking-note"
          maxLength={LIMIT}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="A high chair, an allergy, a birthday"
        />
      </div>
    </div>
  );
}
```
