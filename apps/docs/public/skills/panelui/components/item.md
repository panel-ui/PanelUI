# Item

Row of media, text and actions for lists and settings.

```tsx
import { Item } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Item } from '@/components/ui/item';
```

### Anatomy

```tsx
<Item.Group>
  <Item>
    <Item.Header>…</Item.Header>
    <Item.Media>…</Item.Media>
    <Item.Content>
      <Item.Title>…</Item.Title>
      <Item.Description>…</Item.Description>
    </Item.Content>
    <Item.Actions>…</Item.Actions>
    <Item.Footer>…</Item.Footer>
  </Item>
  <Item.Separator />
</Item.Group>
```

### Variants

- **variant** — `default` *(default)*, `outline`, `muted`
- **size** — `default` *(default)*, `sm`, `xs`
- **orientation** — `horizontal` *(default)*, `vertical`
- **disabled** — `true`

### Parts

- `Item.Group` — Stack of rows. Announces itself as a list.
- `Item.Separator` — Hairline between rows in a group.
- `Item.Media` — Leading slot — an icon tile, a thumbnail, or an avatar passed straight through.
- `Item.Content` — The text column. Takes the remaining width so actions stay pinned to the trailing edge.
- `Item.Title` — Primary line. Its size follows the item.
- `Item.Description` — Secondary line, muted. Its size follows the item.
- `Item.Actions` — Trailing slot — buttons, a chevron, a switch.
- `Item.Header` — Full-width strip above the row content. Needs the item laid out as a column.
- `Item.Footer` — Full-width strip below the row content.

### Props

#### `ItemProps`

Extends `Omit<AnimatedPressableProps, 'children' \| 'disabled'>, Omit<VariantProps<typeof itemVariants>, 'disabled'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `disabled` | `boolean` | — | — |
| `size` | `ItemSize` | `default` | Row density. `Item.Media`, `Item.Title` and `Item.Description` follow it, so it only needs setting here. |
| `orientation` | `ItemOrientation` | `horizontal` | `horizontal` is the list row: media, text and actions side by side. `vertical` stacks them into a card, which is what a horizontal carousel wants — and it is also what `Item.Header` and `Item.Footer` need, since both are full-width strips. |
| `children` | `ReactNode` | — | — |

#### `ItemGroupProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `orientation` | `ItemOrientation` | `horizontal` | `vertical` stacks the items — the settings-list shape. `horizontal` runs them across instead, for a carousel; pair it with a scrollable and `orientation="vertical"` on each item so every entry reads as a card. |
| `children` | `ReactNode` | — | — |

#### `ItemSeparatorProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `orientation` | `ItemOrientation` | `horizontal` | Match the group's axis: a horizontal group needs vertical hairlines. |

#### `ItemMediaProps`

Extends `ViewProps, VariantProps<typeof mediaVariants>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `ItemContentProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `ItemTitleProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `ItemDescriptionProps`

Extends `TextProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `ItemActionsProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `ItemHeaderProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

#### `ItemFooterProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | — |

### Example — A file row

```tsx
<Item variant="outline">
  <Item.Media variant="icon">
    <ReceiptIcon size={18} />
  </Item.Media>
  <Item.Content>
    <Item.Title>Invoice.pdf</Item.Title>
    <Item.Description>2.4 MB · Updated yesterday</Item.Description>
  </Item.Content>
  <Item.Actions>
    <Button size="sm" variant="outline">Open</Button>
  </Item.Actions>
</Item>
```

### Notes

### Pressable or not

Give the item an `onPress` and it renders as an `AnimatedPressable` with `accessibilityRole="button"` and a press animation. Leave it off and it renders as a plain `View` — a static row should not announce itself as a button. React Native has no `render`-as-link escape hatch, so this is the substitute for one.

### Density

`size` is set once on the item. `Item.Media`, `Item.Title` and `Item.Description` read it from context, so the icon tile, title size and description size all move together. Override any of them individually by passing `size` or `className` to that part.

### Colouring the text

`Item.Title` and `Item.Description` are the text, so their own `className` sets the colour: `<Item.Title className="text-destructive">`. A colour on `Item`, through `className` or `style`, styles the row's view and does not reach the text inside it — React Native does not pass a text colour down from a view.

### The two axes

`orientation` means something different on the item and on the group, and they are independent:

- On **`Item`** it decides whether the item's own parts sit side by side (`horizontal`, the default list row) or stack (`vertical`, a card).
- On **`Item.Group`** it decides whether the items run down the screen (`vertical`, the default) or across it (`horizontal`, a carousel).

`Item.Header` and `Item.Footer` are full-width strips, so they need `orientation="vertical"` on the item. `Item.Separator` takes the prop too — a horizontal group needs vertical hairlines.

Item forwards ordinary view or Pressable props according to the rendered branch, while retaining ownership of its disabled announcement, styled surface, and—when interactive—its button role and primary press handler.

---

Full page, with every example: https://panelui.dev/docs/components/item
