# Combobox

A text field that filters a list of options as you type.

```tsx
import { Combobox } from "@/components/panelui/combobox"
```

From npm the path is `panelui-web/combobox`. Install with `npx shadcn@latest add @panelui/combobox`.

## When to use it

Use it to choose from a list of options the reader already knows the name of: a city, a repository, a tag. Typing narrows the list, so the hand stays on the keyboard and a long list stays short.

The difference from [Select](/docs/web/components/select) is where the typing happens. A select is a button that opens a list, and its optional filter lives inside that list once it opens. A combobox is the field itself: the options appear while the reader is already typing.

Use a select when the options are few enough to recognise by scrolling, and a combobox when there are enough of them that the name is easier to type than the list is to read.

## Usage

```tsx
<Combobox value={framework} onValueChange={setFramework} placeholder="Search frameworks" clearable>
  <Combobox.Item value="expo" label="Expo" />
  <Combobox.Item value="next" label="Next.js" />
</Combobox>
```

## Parts

```tsx
<Combobox>
  <Combobox.Item value="…" label="…" />
  <Combobox.Group label="…">
    <Combobox.Item value="…" label="…" />
  </Combobox.Group>
</Combobox>
```

- `Combobox.Item` — One option. `value` identifies it, `label` is what is shown and what the default filter matches on, `description` adds a second line, `start` draws something before the label, and `disabled` keeps it listed but unselectable.
- `Combobox.Group` — A titled run of options. Presentational only: a grouped Combobox reports the same values a flat one would, and a group with nothing left in it disappears from the filtered list.

## Props

`Combobox.Item` and `Combobox.Group` take only the props listed here: they describe the options, and do not render an element of their own. `Combobox` takes the props of the wrapper it renders, plus `className`.

#### `ComboboxItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `string` | **required** | Identifies the option; what `value` and `onValueChange` carry. |
| `label` | `string` | **required** | What is shown, and what the default filter matches on. |
| `disabled` | `boolean` | `false` | Shows the option but refuses it. Kept in the list rather than dropped from it, because an option that vanishes reads as one that never existed. |
| `start` | `ReactNode` | — | Anything to draw before the label — an avatar, a flag, a status dot. |
| `description` | `ReactNode` | — | A second line under the label, for what the label alone cannot say. |
| `className` | `string` | — | Extra classes for this option. |

#### `ComboboxGroupProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `string` | — | Heading over the run of options. Announced as a group label, so a screen reader reaching the group is told what it is before walking into it. |
| `className` | `string` | — | Extra classes for the group wrapper. |
| `labelClassName` | `string` | — | Extra classes for the heading. |

#### `ComboboxProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `mode` | `Mode` | — | One value or several. `multiple` draws the chosen options as chips and keeps the list open. |
| `value` | `ComboboxSelection[Mode]` | — | Controlled selection. Its shape follows `mode`. |
| `defaultValue` | `ComboboxSelection[Mode]` | — | Starting selection when uncontrolled. |
| `onValueChange` | `(value: ComboboxSelection[Mode]) => void` | — | Called with the next selection, whose shape follows `mode`. |
| `inputValue` | `string` | — | Controlled query — the text actually in the field. Pair it with `onInputValueChange` when the options are fetched for it. |
| `defaultInputValue` | `string` | — | Starting query when uncontrolled. |
| `onInputValueChange` | `(value: string) => void` | — | Called with the typed text. |
| `placeholder` | `string` | `'Search'` | What the field says while empty. Default `Search`. |
| `disabled` | `boolean` | `false` | Whether the field and its list are unavailable. |
| `presentation` | `ComboboxPresentation` | `'overlay'` | Where the options appear. Default `overlay`. |
| `filter` | `boolean \| ((option: ComboboxItemProps, query: string) => boolean)` | `true` | Narrow the options to the query here. `true` matches case-insensitively on any part of an option's label; pass a function to match on something else. Pass `false` when a server is doing the matching: the options you render are then shown exactly as given. |
| `allowCustomValue` | `boolean` | `false` | Let the typed text become the value when it matches no option, committed on Enter. Turns the list into a set of suggestions rather than the set of legal answers. |
| `loading` | `boolean` | `false` | Show a spinner in place of the list. For options still being fetched. |
| `emptyMessage` | `string` | `'No matches'` | Shown in place of the list when nothing matches. Default `No matches`. |
| `loadingMessage` | `string` | `'Searching'` | Shown in place of the list while `loading`. Default `Searching`. |
| `clearable` | `boolean` | `false` | Offer a ✕ that clears the query and the selection. |
| `openOnFocus` | `boolean` | `false` | Open the list as soon as the field takes focus. |
| `onOpenChange` | `(open: boolean) => void` | — | Called when the list opens or closes. |
| `contentWidth` | `'field' \| 'content' \| number` | `'field'` | Width of the floating list. `field` matches the field, `content` sizes to the longest option, or pass a pixel value. `overlay` only. |
| `offset` | `number` | `8` | Gap between the field and the floating list, in pixels. Default `8`. |
| `listClassName` | `string` | — | Extra classes for the list surface. |
| `accessibilityLabel` | `string` | — | Accessible name for the field. |
| `id` | `string` | — | The input's id, so a `<label htmlFor>` can name it. |
| `name` | `string` | — | Form field name, so the value is sent with the form. |
| `form` | `string` | — | The form the field belongs to. |
| `required` | `boolean` | — | Whether the field must have a value before the form can be sent. |
| `container` | `BaseCombobox.Portal.Props['container']` | — | Where in the document an overlay list is put. Default `document.body`. |

## In a Server Component

`Combobox` is a client component. A Server Component cannot read `Combobox.Item` off the import, so import each part by name: `ComboboxItem`, `ComboboxGroup`.

## Notes

#### One value or several

`mode="multiple"` draws the chosen options as removable chips in front of the input and keeps the list open between picks, so several can be taken in a row. The value is an array there and a single string otherwise: the type follows `mode`, so nothing has to be cast.

A chip can be removed with its ✕, or from the keyboard: press Left Arrow from the start of the input to reach the chips, then Backspace or Delete to take one out.

#### Filtering, and turning it off

Filtering happens in the component by default, matching case-insensitively on any part of an option's label. Pass a function to `filter` to match on something else — a description, an alias list, an initialism.

Pass `filter={false}` when options come from a server that is doing the matching itself. The field then shows exactly what it was given, because a second filter over results it cannot see the query behind would only remove correct answers. Pair it with the controlled `inputValue` / `onInputValueChange` so the query can drive the request, and with `loading` so the list says it is working rather than saying there are no matches.

#### Values it does not know about

`allowCustomValue` lets the typed text become the value when it matches no option, committed on Enter. The list becomes a set of suggestions rather than the set of legal answers, which is what a tag field is.

#### Overlay or inline

`overlay` (the default) floats the list above the page, anchored under the field and flipped above it when there is no room below; nothing else on the screen moves. `contentWidth` and `offset` apply there only.

`inline` expands the list in normal layout flow instead, pushing what is below it down. Reach for it in a form where nothing should be covered.

#### Width

An overlay list is as wide as the field by default. `contentWidth="content"` sizes it to the longest option, and a number sets an exact width; a list wider than the field stays on screen by moving left or right.

#### Keyboard

The field is a combobox: typing filters, the arrow keys move through the options, Enter chooses the highlighted one, and Escape closes the list. Enter also takes the typed text when `allowCustomValue` is on and nothing matches it.

#### Forms

Put it in a [Field](/docs/web/components/field) to give it a label and a line of help, and pass `name` to send the value with the form. In `multiple` mode each chosen value is sent as its own entry.

## Example

```tsx
'use client';

import { Field } from '@/components/panelui/field';
import { Combobox } from '@/components/panelui/combobox';
import { useState } from 'react';

const FRAMEWORKS = [
  { value: 'expo', label: 'Expo' },
  { value: 'react-native', label: 'React Native' },
  { value: 'next', label: 'Next.js' },
  { value: 'remix', label: 'Remix' },
  { value: 'astro', label: 'Astro' },
  { value: 'sveltekit', label: 'SvelteKit' },
];

export default function ComboboxOverview() {
  const [framework, setFramework] = useState<string | undefined>();

  return (
    <Field className="w-full max-w-xs">
      <Field.Label>Framework</Field.Label>
      <Combobox
        value={framework}
        onValueChange={setFramework}
        placeholder="Search frameworks"
        clearable
      >
        {FRAMEWORKS.map((framework) => (
          <Combobox.Item key={framework.value} value={framework.value} label={framework.label} />
        ))}
      </Combobox>
      <Field.Description>
        {framework ? `Building with ${FRAMEWORKS.find((item) => item.value === framework)?.label}.` : 'Pick one to continue.'}
      </Field.Description>
    </Field>
  );
}
```
