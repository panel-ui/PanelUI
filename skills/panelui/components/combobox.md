# Combobox

A text field that filters a list of options as you type.

```tsx
import { Combobox } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Combobox } from '@/components/ui/combobox';
```

### Anatomy

```tsx
<Combobox>
  <Combobox.Item value="…" label="…" />
  <Combobox.Group label="…">
    <Combobox.Item value="…" label="…" />
  </Combobox.Group>
</Combobox>
```

### Variants

- **selected** — `true`
- **disabled** — `true`
- **itemDisabled** — `true`
- **presentation** — `overlay` *(default)*, `inline`

### Parts

- `Combobox.Item` — One option. `value` identifies it, `label` is what is shown and what the filter matches on, `description` adds a second line, `start` draws something before the label, and `disabled` keeps it listed but unselectable.
- `Combobox.Group` — A titled run of options. Presentational only — a grouped Combobox reports the same values a flat one would.

### Props

#### `ComboboxItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `string` | **required** | — |
| `label` | `string` | **required** | — |
| `disabled` | `boolean` | `false` | Shows the option but refuses it. Kept in the list rather than dropped from it, because an option that vanishes reads as one that never existed. |
| `start` | `ReactNode` | — | Anything to draw before the label — an avatar, a flag, a status dot. |
| `description` | `string` | — | A second line under the label, for what the label alone cannot say. |

#### `ComboboxGroupProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `string` | — | Heading over the run of options. Announced as a header, so a screen reader reaching the group is told what it is before walking into it. |
| `className` | `string` | — | Extra classes for the group wrapper. |
| `labelClassName` | `string` | — | Extra classes for the heading. |
| `children` | `ReactNode` | **required** | — |

#### `ComboboxProps`

Extends `<Mode ComboboxMode = 'single'> extends Omit<ViewProps, 'children' \| 'onLayout'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `mode` | `Mode` | — | One value or several. `multiple` draws the chosen options as removable chips in front of the input and keeps the list open between picks. |
| `value` | `ComboboxSelection[Mode]` | — | Controlled selection. Its shape follows `mode`. |
| `defaultValue` | `ComboboxSelection[Mode]` | — | Starting selection when uncontrolled. |
| `onValueChange` | `(value: ComboboxSelection[Mode]) => void` | — | — |
| `inputValue` | `string` | — | Controlled query — the text actually in the field. Pair it with `onInputValueChange` when the options are fetched for it. |
| `defaultInputValue` | `string` | `` | Starting query when uncontrolled. |
| `onInputValueChange` | `(value: string) => void` | — | — |
| `placeholder` | `string` | `Search` | — |
| `disabled` | `boolean` | `false` | — |
| `presentation` | `ComboboxPresentation` | `overlay` | Where the options appear. |
| `filter` | `boolean \| ((option: ComboboxItemProps, query: string) => boolean)` | `true` | Narrow the options to the query here. `true` matches case-insensitively on any part of an option's label; pass a function to match on something else — a description, an alias list, an initialism. Pass `false` when a server is doing the matching: the options you render are then shown exactly as given, since a second filter over results the field cannot see the query behind would only remove correct answers. |
| `allowCustomValue` | `boolean` | `false` | Let the typed text become the value when it matches no option, committed on submit. Turns the list into a set of suggestions rather than the set of legal answers — which is what a tag field is. |
| `loading` | `boolean` | `false` | Show a spinner in place of the list. For options still being fetched. |
| `emptyMessage` | `string` | `No matches` | Shown in place of the list when nothing matches. |
| `loadingMessage` | `string` | `Searching` | Shown in place of the list while `loading`. |
| `clearable` | `boolean` | `false` | Offer a ✕ that clears the query and the selection. |
| `openOnFocus` | `boolean` | `false` | Open the list as soon as the field takes focus, before anything is typed. |
| `onOpenChange` | `(open: boolean) => void` | — | Called when the list opens or closes. |
| `contentWidth` | `'field' \| 'content' \| number` | `field` | Width of the floating list. `field` matches the field, `content` sizes to the longest option, or pass a pixel value. A list wider than the field moves left to stay on screen. `overlay` only. |
| `offset` | `number` | `8` | Gap between the field and the floating list. `overlay` only. |
| `listClassName` | `string` | — | Extra classes for the list surface. |
| `accessibilityLabel` | `string` | — | Accessible name for the field. |
| `children` | `ReactNode` | **required** | — |

### Example — Filter as you type

The list narrows on every keystroke; `clearable` offers a ✕ that empties the field.

```tsx
const [framework, setFramework] = useState<string>();

<Combobox
  value={framework}
  onValueChange={setFramework}
  placeholder="Search frameworks"
  clearable
>
  {frameworks.map((f) => (
    <Combobox.Item key={f.value} value={f.value} label={f.label} />
  ))}
</Combobox>
```

### Notes

### Choosing a presentation

`overlay` (the default) floats the list through a portal, anchored under the field and flipped above it when the keyboard leaves no room below. Nothing else on the screen moves. `contentWidth` and `offset` apply here only.

`inline` expands the list in normal layout flow instead, pushing what is below it down. Reach for it in a form where nothing should be covered.

There is deliberately no sheet presentation. A sheet takes the bottom of the screen, which is where the keyboard already is, and the field you are typing into would end up behind one or the other. Select can offer a sheet because its trigger stops mattering once the list is open; a Combobox's never does.

### One value or several

`mode="multiple"` draws the chosen options as removable chips in front of the input and keeps the list open between picks, so several can be taken in a row. The value is an array there and a single string otherwise — the type follows `mode`, so nothing has to be cast.

Picking an already-chosen option removes it, which is the only way to undo a pick without reaching for its chip. Backspace on an empty field reaches the thing in front of the cursor when there is no character left to delete — but it marks that chip first, turning it `destructive`, and only a second backspace takes it. A held backspace repeats, and a field that removed on the first one would empty itself in the time it takes to notice. Typing anything, or leaving the field, takes the mark off again. [TagInput](/docs/components/tag-input) does the same, so the reflex carries between the two.

### Filtering, and turning it off

Filtering happens in the component by default, matching case-insensitively on any part of an option's label. Pass a function to `filter` to match on something else — a description, an alias list, an initialism.

Pass `filter={false}` when the options come from a server that is doing the matching itself. The field then renders exactly what it was given, because a second filter over results it cannot see the query behind would only remove correct answers. Pair it with the controlled `inputValue` / `onInputValueChange` so the query can drive the request, and with `loading` so the list says it is working rather than saying there are no matches.

### Values it does not know about

`allowCustomValue` lets the typed text become the value when it matches no option, committed on return. That turns the list into a set of suggestions rather than the set of legal answers, which is what a tag field is.

### Inside a scroll view

An `overlay` list is portalled out of the tree, so a screen-level scroll view is not one of its ancestors and taps on the options reach them directly.

An `inline` list is not. It stays where it is rendered, which means the scroll view around it decides what happens to a tap that lands while the keyboard is up — and the default is to spend it dismissing the keyboard. Set `keyboardShouldPersistTaps="handled"` on that scroll view, or the first tap on an option will be swallowed and the option will only take on the second.

```tsx
<ScrollView keyboardShouldPersistTaps="handled">
  <Combobox presentation="inline" … />
</ScrollView>
```

### Accessibility

The field is announced as a combobox that owns an expandable list, so the chips and the input read as parts of one control rather than as loose siblings, and the open state is announced on a role where it means something. The floating list is a modal layer: it takes the Android back button and hides the page behind it from the accessibility tree, so a screen reader cannot walk out of an open list into content it is covering.

---

Full page, with every example: https://panelui.dev/docs/components/combobox
