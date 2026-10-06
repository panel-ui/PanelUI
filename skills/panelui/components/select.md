# Select

Picker shown in a bottom sheet, expanded in place, or floating over the page.

```tsx
import { Select } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Select } from '@/components/ui/select';
```

### Anatomy

```tsx
<Select>
  <Select.Item value="…" label="…" />
  <Select.Group label="…">
    <Select.Item value="…" label="…" />
  </Select.Group>
</Select>
```

### Variants

- **selected** — `true`
- **disabled** — `true`
- **itemDisabled** — `true`
- **presentation** — `sheet` *(default)*, `inline`, `overlay`

### Parts

- `Select.Item` — One option. `value` identifies it, `label` is what is shown, and `disabled` keeps it listed but unselectable.
- `Select.Group` — A titled run of options. `label` is the heading. Grouping is presentational — the value is still one flat string — and the filter reaches through it.

### Props

#### `SelectItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `string` | **required** | — |
| `label` | `string` | **required** | — |
| `className` | `string` | — | Extra classes for the option row. |
| `labelClassName` | `string` | — | Extra classes for the option's label. |
| `disabled` | `boolean` | — | Shows the option but refuses it — a plan above the current tier, a region with nothing in stock. Kept in the list rather than dropped from it, because an option that vanishes reads as one that never existed. |

#### `SelectGroupProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `string` | — | Heading over the run of options. Announced as a header, so a screen reader reaching the group is told what it is before walking into it. |
| `className` | `string` | — | Extra classes for the group wrapper. |
| `labelClassName` | `string` | — | Extra classes for the heading. |
| `children` | `ReactNode` | **required** | — |

#### `SelectSheetProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `native` | `boolean` | — | Present the platform's own sheet — SwiftUI on iOS, Jetpack Compose on Android — instead of the styled one. Requires the optional `@expo/ui` package; without it the styled sheet is shown. Only the container is the platform's. The options inside are still the select's own, so groups, disabled options and `searchable` all work. |
| `snapPoints` | `('half' \| 'full' \| { fraction: number } \| { height: number })[]` | — | Heights the native sheet can rest at. Omit to size to the options. The list fills the first one and scrolls inside it. `{ fraction }` and `{ height }` are iOS-only. Native sheet only. |
| `nativeBackground` | `boolean \| string` | — | Paint the native sheet a solid colour instead of the platform's translucent material. `true` uses the theme's popover surface; a string paints that colour. Native sheet only. |
| `size` | `'auto' \| 'half' \| 'full'` | — | How tall the sheet opens. `auto`, the default, sizes to the options and scrolls once they pass 384 points; `half` and `full` fix the height and the list fills it. On the native sheet these map onto the platform's detents, and `snapPoints` wins over them. |

#### `SelectProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Extra classes for the wrapper around the trigger — the box the select occupies in your layout, which is where margins and widths belong. To restyle the field itself, use `triggerClassName`. |
| `value` | `string` | — | The selected option's `value`. Leave unset for the placeholder. |
| `valueLabel` | `string` | — | What the trigger shows for the current `value`. Select reads the label off its `Select.Item` children, which it cannot do when a list component renders those rows — the elements do not exist until the list decides to draw them, and the selected one may be scrolled far out of view. Pass the label yourself in that case; otherwise leave it unset and the trigger will find it. |
| `onValueChange` | `(value: string) => void` | **required** | Called with the `value` of the option that was picked. |
| `placeholder` | `string` | `Select an option` | Shown on the trigger while nothing is selected. |
| `disabled` | `boolean` | — | Refuses the trigger and dims it. The options cannot be opened. |
| `triggerClassName` | `string` | — | Extra classes for the trigger — the field you press to open the list. |
| `valueClassName` | `string` | — | Extra classes for the selected option's text on the trigger. |
| `placeholderClassName` | `string` | — | Extra classes for the placeholder text on the trigger. |
| `listClassName` | `string` | — | Extra classes for the surface the options sit on. In `sheet` the sheet is that surface, so this reaches the block of options inside it instead. |
| `searchClassName` | `string` | — | Extra classes for the row the filter field sits in. `searchable` only. |
| `searchInputClassName` | `string` | — | Extra classes for the filter field itself. `searchable` only. |
| `searchContainerClassName` | `string` | — | Extra classes for the box drawn around the filter field — its fill, border and radius. `searchable` only. |
| `emptyClassName` | `string` | — | Extra classes for the message shown when the filter matches nothing. |
| `presentation` | `SelectPresentation` | `sheet` | Where the options appear. `sheet` takes the bottom of the screen, `inline` expands the list in layout flow, `overlay` floats it above the page anchored to the trigger. |
| `title` | `string` | — | Sheet title shown above the options. `sheet` presentation only. |
| `sheetProps` | `SelectSheetProps` | — | How the sheet is drawn — the platform's own sheet, its detents and surface, or a fixed height. `sheet` presentation only. |
| `contentWidth` | `'trigger' \| 'content' \| number` | `trigger` | Width of the floating list. `trigger` matches the trigger, `content` sizes to the longest option, or pass a pixel value. `overlay` only. |
| `offset` | `number` | `8` | Gap between the trigger and the floating list. `overlay` only. |
| `onOpenChange` | `(open: boolean) => void` | — | Called when the options open or close. |
| `searchable` | `boolean` | `false` | Put a filter above the options, matching case-insensitively on any part of an option's label. For a list long enough that scrolling it is not finding anything — countries, currencies, a repository's branches. The field is not focused on open: on a phone that would throw the keyboard over the very list you are trying to look at. |
| `searchPlaceholder` | `string` | `Search` | Placeholder for the filter field. `searchable` only. |
| `emptyMessage` | `string` | `No matches` | Shown in place of the list when the filter matches nothing. |
| `native` | `boolean` | — | Render the platform's own picker instead of the trigger-and-list pair. Requires the optional `@expo/ui` package; without it this prop does nothing. **Theme tokens do not apply** — the platform draws the picker, so `className`, `title` and `presentation` are ignored. `Select.Item` children still declare the options. |
| `nativeAppearance` | `'menu' \| 'wheel'` | `menu` | Native picker style. `menu` is a compact button opening a dropdown; `wheel` is an always-visible rotor (iOS; falls back to `menu` elsewhere). |
| `children` | `ReactNode` | **required** | — |

### Example — Basic

The trigger shows the selected option’s label, or the placeholder when nothing is chosen.

```tsx
const [fruit, setFruit] = useState<string>();

<Select
  value={fruit}
  onValueChange={setFruit}
  placeholder="Select a fruit"
  title="Favorite fruit"
>
  <Select.Item value="apple" label="Apple" />
  <Select.Item value="banana" label="Banana" />
  <Select.Item value="cherry" label="Cherry" />
</Select>
```

### Notes

### Choosing a presentation

`sheet` takes the bottom of the screen. Reach for it when the list is long, or on a small screen where an anchored panel would cover the very thing you are choosing for.

`inline` expands the list in normal layout flow, so everything below it moves down. That reads as the row growing inside a settings list, and reads as the page jumping anywhere else.

`overlay` floats the list through a portal, anchored to the trigger and flipped above it when there is no room below. Nothing else on the screen moves. `contentWidth` and `offset` apply here only.

### Styling

`className` is the wrapper around the trigger — the box the select occupies in your layout, and where widths and margins belong. It is not the field. To restyle the field itself, use `triggerClassName`.

Everything else the control draws has its own prop, so nothing has to be reached through a parent selector:

| Prop | Where it lands |
| --- | --- |
| `className` | The wrapper around the trigger |
| `triggerClassName` | The trigger — the field you press |
| `valueClassName` | The selected option's text on the trigger |
| `placeholderClassName` | The placeholder text on the trigger |
| `listClassName` | The surface the options sit on |
| `searchClassName` | The row the filter field sits in |
| `searchInputClassName` | The filter field itself |
| `searchContainerClassName` | The box drawn around the filter field |
| `emptyClassName` | The message shown when the filter matches nothing |

`Select.Item` takes `className` and `labelClassName`, and `Select.Group` takes `className` and `labelClassName`, so an individual option or heading can be styled where the whole list should not be.

In `sheet` there is no list surface of the select's own — the sheet is the surface — so `listClassName` lands on the block of options inside it.

None of these reach a `native` picker. The platform draws that one.

### Scrolling the options

In `sheet` the options scroll inside the sheet's own scroller, so the list and the sheet share one drag. The list scrolls until it reaches its top; pulling down from there drags the sheet.

### Configuring the sheet

`sheetProps` sets how the `sheet` presentation draws its sheet. `size` gives it a fixed height: `half` or `full`, with the list filling it, instead of `auto`, where the sheet sizes to the options and the list scrolls past 384 points.

`sheetProps.native` presents the platform's own sheet — SwiftUI on iOS, Jetpack Compose on Android — so it gets the system's detents, dismiss gesture and material. Only the container is the platform's: the options are still the select's own, so groups, disabled options and `searchable` keep working, and the styling props still reach them. `snapPoints` sets the detents, and the list fills the first one and scrolls inside it. `nativeBackground` paints the sheet a solid colour instead of the platform's translucent material; `true` uses the theme's popover surface. Like the rest of native rendering, it needs the optional `@expo/ui` package, and without it the styled sheet is shown.

### Native rendering

Pass `native` to render the platform’s own picker instead — SwiftUI on iOS, Jetpack Compose on Android. It needs the optional `@expo/ui` package and is a silent no-op without it.

**Theme tokens do not apply in native mode**: the platform draws the control with its own colours and metrics, so `className`, `triggerClassName`, `presentation` and every other styling prop are ignored. `native` replaces the sheet too, so it wins over `sheetProps` — for the platform's sheet with the select's own options inside it, use `sheetProps.native` instead. A native picker always has a selection, so an unset `value` shows the first option rather than the placeholder — set an initial value or add an explicit "None" item.

The portable native picker cannot disable one option independently. When any `Select.Item` is disabled, Select keeps the styled presentation even if `native` is requested, so the disabled choice remains visible without becoming selectable.

See [Native rendering](/docs/native) for the full prop-by-prop breakdown.

### Filtering a long list

`searchable` puts a filter above the options in every presentation, matching case-insensitively on any part of an option's label. It narrows what is *shown* rather than what is declared, so the options stay where they are and nothing has to be lifted into state; `searchPlaceholder` names the field and `emptyMessage` replaces the list when nothing matches. The filter clears itself when the list closes, so it is never waiting there the next time with most of the options missing.

`searchClassName`, `searchInputClassName` and `searchContainerClassName` restyle the field: the row it sits in, the text and its placeholder, and the box drawn around it. The last of those is the one to reach for to change its fill, border or radius, because those belong to the box rather than to the text inside it.

The field is deliberately not focused on open — on a phone that throws the keyboard over the list you are trying to look at — and the option scrollers dismiss the keyboard on a drag, so you can get back to reading without first tapping somewhere neutral.

### Grouping options

`Select.Group` wraps a run of options under a heading, which is what a list long enough to want a filter is usually long enough to want. Grouping is presentational: the Select still reports one flat string, and `Select.Item` needs to know nothing about being inside a group.

The filter reaches through groups. A group is rebuilt around whatever survives inside it and dropped when that is nothing, so a heading never stands over an empty section — which would read as a section that failed to load rather than one the query emptied.

The heading is announced as a header, so a screen reader reaching the group is told what it is before walking into it.

### Very long lists, and lists you render yourself

The options sit in a plain scroller, which is the right shape up to a few
hundred rows and the wrong one after that. Past that, render them with a
virtualized list of your own.

Select filters the options it renders. It cannot filter rows a list component
draws, because those elements do not exist until the list decides to draw them
— so when you own the list, you own the filtering, and `useSelectSearch` hands
you the query to do it with. `Select.Item` still works wherever your rows put
it: selection travels by context, not by position.

```tsx
function TimezoneOptions() {
  const { query } = useSelectSearch();
  const rows = useMemo(() => filterTimezones(query), [query]);

  return (
    <FlashList
      data={rows}
      estimatedItemSize={44}
      renderItem={({ item }) => <Select.Item value={item.id} label={item.name} />}
    />
  );
}

<Select searchable value={zone} valueLabel={zoneName} onValueChange={setZone}>
  <TimezoneOptions />
</Select>
```

Two things go with it. `valueLabel` is what the trigger shows, because the
selected row may never have been drawn for Select to read a label off. And
`emptyMessage` is not used — Select was never shown the rows, so it does not
claim to know whether the query matched; render your own empty row when your
data comes back empty.

A caption, a divider or any other child you put among the options survives the
filter untouched, for the same reason: a filter has no opinion about something
that is not an option.

---

Full page, with every example: https://panelui.dev/docs/components/select
