# Frame

Widget shell — a card of rows sitting in a titled tray.

```tsx
import { Frame } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Frame } from '@/components/ui/frame';
```

### Anatomy

```tsx
<Frame>
  <Frame.Header>
    <Frame.Title>…</Frame.Title>
    <Frame.Action>…</Frame.Action>
  </Frame.Header>
  <Frame.Panel>
    <Frame.Section title="…">
      <Frame.Row>
        <Frame.Media>…</Frame.Media>
        <Frame.Content>
          <Frame.Title>…</Frame.Title>
          <Frame.Description>…</Frame.Description>
        </Frame.Content>
        <Frame.Actions>…</Frame.Actions>
      </Frame.Row>
    </Frame.Section>
  </Frame.Panel>
  <Frame.Footer>…</Frame.Footer>
</Frame>
```

### Variants

- **variant** — `default` *(default)*, `plain`, `inset`

### Parts

- `Frame.Header` — The strip of shell above the panel, holding the title and the action.
- `Frame.Title` — Frame heading. Muted in a header; inside a `Frame.Content` it is the row's subject instead, so it takes the foreground colour and truncates to one line.
- `Frame.Action` — Trailing slot on the header — a label, a button, a badge. Strings render muted.
- `Frame.Description` — Secondary line under a title, in a column-wrapped header or inside a `Frame.Content`.
- `Frame.Panel` — The card holding the rows. Divides them for you.
- `Frame.Footer` — The row of actions under the panel — what somebody does with the widget rather than more of what it says. Under `inset` it sits in the band, held further in than the panel so it reads as things to press rather than as another edge of the shell, and it shapes what is put in it: equal widths and full pills. Under `default` and `plain` it is a padded row below the panel, which stops the panel being flush at the bottom.
- `Frame.Section` — A labelled cluster of rows, for a panel holding more than one group.
- `Frame.Row` — A row inside the panel. Give it an `onPress` and it becomes a pressable.
- `Frame.Media` — Leading slot on a row — an icon, an avatar, a status dot. Holds its size.
- `Frame.Content` — The flexible middle of a row. Takes what the other two leave and is allowed to shrink past its content.
- `Frame.Actions` — Trailing slot on a row — a chip, a value, a switch, a small button. Holds its size.

### Props

#### `FrameProps`

Extends `ViewProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `FrameRootProps`

Extends `FrameProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `FrameVariant` | `default` | `plain` drops the outer shell so the panel is the widget — for a Frame inside a container that already draws its own border. `inset` sets the panel into a recessed band on all four sides instead, and gives `Frame.Footer` somewhere to sit. |

#### `FrameHeaderProps`

Extends `FrameProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | — |

#### `FrameActionProps`

Extends `FrameProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | — |

#### `FrameMediaProps`

Extends `FrameProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | — |

#### `FrameContentProps`

Extends `FrameProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | — |

#### `FrameActionsProps`

Extends `FrameProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | — |

#### `FramePanelProps`

Extends `FrameProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `dividers` | `boolean` | — | Set false to place the hairlines by hand instead — for a panel whose rows are generated somewhere the divider order is not obvious. |
| `children` | `ReactNode` | — | — |

#### `FrameRowProps`

Extends `Omit<PressableProps, 'children'>, Dividable`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `divided` | `boolean` | — | Draw a hairline above this row. `Frame.Panel` sets it for you; pass it explicitly to override the panel's decision either way. |
| `chevron` | `boolean` | — | Trailing chevron marking the row as leading somewhere. |
| `wrap` | `boolean` | — | Let the row run onto a second line instead of holding one. For a cluster of chips or tags, where the alternative is the last ones being clipped. |
| `align` | `'center' \| 'start'` | — | Where the row's slots sit against each other. `start` for a row two or three lines tall, where centring an icon against a tall text column leaves it floating in the middle. |
| `children` | `ReactNode` | — | — |

#### `FrameSectionProps`

Extends `FrameProps, Dividable`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | Heading above the rows. Strings are wrapped for you. |
| `divided` | `boolean` | — | — |
| `children` | `ReactNode` | — | — |

#### `FrameFooterProps`

Extends `FrameProps`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | — |

### Example — A settings panel

Nothing has to say where the hairlines go — the panel puts one above every row but the first.

```tsx
<Frame>
  <Frame.Header>
    <Frame.Title>Notifications</Frame.Title>
    <Frame.Description>How we reach you.</Frame.Description>
  </Frame.Header>
  <Frame.Panel>
    <Frame.Row>
      <Text className="flex-1">Push</Text>
      <Switch value={push} onValueChange={setPush} />
    </Frame.Row>
    <Frame.Row>
      <Text className="flex-1">Email</Text>
      <Switch value={email} onValueChange={setEmail} />
    </Frame.Row>
    <Frame.Row>
      <Text className="flex-1">SMS</Text>
      <Switch value={sms} onValueChange={setSms} />
    </Frame.Row>
  </Frame.Panel>
</Frame>
```

### Notes

### Why the card is flush

The two surfaces are nested rather than stacked, and only one edge of the outer one is ever visible. The panel meets the shell's left, right and bottom exactly, so the shell reads as something the card is *sitting in* rather than as a border drawn around it — and the strip left at the top is the header, which is why the header needs no rule under it and no background of its own.

The shell's radius is the larger of the two, and the panel's top corners are tighter. That is the reverse of the usual nested-radius rule, and it is deliberate: with only the top corners free, matching them would make the two surfaces read as one misdrawn shape. The panel's bottom corners are not set at all — the shell clips them, so they take its radius exactly, which is what `overflow-hidden` on the root is doing.

### Thickening the shell's border

That clip follows the shell's *border box*, not the box inside its border. Along the straight edges the panel is held off by the border width and the edge shows through, but at the corner arcs the panel's square corner is clipped to the outer radius and paints across the border. At the default hairline that is a sliver nobody sees. Give the shell a thicker border and the corners visibly eat it, so tell the panel where to stop:

```tsx
<Frame className="rounded-[28px] border-2 border-dashed">
  <Frame.Panel className="rounded-b-[26px]">…</Frame.Panel>
</Frame>
```

The radius to use is the shell's less its border width. It is on you rather than on the component because both arrive as `className` strings, which `Frame` cannot read.

### Dividers

React Native has no `:first-child`, so the hairline between rows cannot be a CSS rule. `Frame.Panel` places them instead — a line above every child but the first. Passing `divided` on a row overrides that either way, and `dividers={false}` on the panel hands the whole job back to you.

`Frame.Section` divides its own rows the same way, so the two nest without either needing to know about the other.

### Why a row has slots

Yoga defaults `flexShrink` to `0`, the opposite of the web. A child that is not told to shrink never does, so a fourth thing in a row pushes the others past the edge — where the frame's `overflow-hidden` cuts them off silently, rather than wrapping or truncating the way a browser would.

`Frame.Media` and `Frame.Actions` hold their size. `Frame.Content` takes what is left and carries `min-w-0`, which is the part that is easy to miss: a flex child's minimum size is its content unless told otherwise, so `flex-1` alone still refuses to go narrower than the longest word inside it.

For a row that genuinely has too much in it — a handful of chips, say — `wrap` lets it take a second line instead. `align="start"` is for a row two or three lines tall, where centring an icon against a tall text column leaves it floating in the middle.

`Frame.Row` forwards ordinary view or Pressable props for the branch it renders, while retaining ownership of its row classes and—when interactive—its button role and primary press handler.

### Where the recess comes from

Under `inset` the shell is the popover surface with `--color-inset` laid over it rather than a colour of its own. That token is a translucent black in every theme, so the band always comes out darker than the panel it holds.

The surface ladder cannot do this job: it runs darker in a light theme and lighter in a dark one, and the recess has to read the same way in both.

There is no shadow under an `inset` frame. A recessed band and a drop shadow are opposite claims about where a surface sits, and this one is set into the page.

### The corners are concentric

The panel's radius is the shell's less the shell's padding. Both are fixed numbers rather than classes, because an arbitrary Tailwind value a running dev server has not already compiled turns into nothing at all — no error, no warning, the corner simply squares off.

The consequence is that `inset` does not follow the theme's radius scale the way `default` and `plain` do. Restyle it with `className` and give `Frame.Panel` the matching radius yourself: the shell's, less the shell's padding.

### What the band does to an action

An `inset` footer gives every element child `h-11 flex-1 rounded-full`: equal widths, and a full pill. The band is a row of equal decisions, and one arriving with the radius it happened to have breaks that.

Your own `className` is merged after, so any of it can be overridden — `flex-none` and `w-11` for a trailing icon button that should stay square, say.

---

Full page, with every example: https://panelui.dev/docs/components/frame
