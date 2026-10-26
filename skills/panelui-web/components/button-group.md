# Button Group

Related buttons joined into one control, with separators, text cells and fields between them.

```tsx
import { ButtonGroup } from "@/components/panelui/button-group"
```

From npm the path is `panelui-web/button-group`. Install with `npx shadcn@latest add @panelui/button-group`.

## When to use it

Use it for a few actions on the same thing, such as archiving, snoozing or reporting one message, so they read as one control rather than a row of separate buttons.

The group sets whatever is placed directly inside it in one track, drawn like the segmented [Tabs](/docs/web/components/tabs): outline and ghost buttons lie flat with muted labels, and the one under the pointer rises out of the track. Put `Button`s in it, and an `Input`, `Menu.Trigger` or `ButtonGroup.Text` beside them.

For a split button, put a `ButtonGroup.Separator` between two filled buttons. The group then drops its track and joins them edge to edge.

To choose one option from a few, use [Tabs](/docs/web/components/tabs): a button group runs actions and does not keep a selection.

## Usage

```tsx
<ButtonGroup aria-label="Message actions">
  <Button variant="outline">Archive</Button>
  <Button variant="outline">Snooze</Button>
  <Button variant="outline">Report</Button>
</ButtonGroup>
```

## Parts

```tsx
<ButtonGroup>
  <Button />
  <ButtonGroup.Separator />
  <ButtonGroup.Text />
</ButtonGroup>
```

- `ButtonGroup.Separator` — Turns the group into a split button: no track, and the children joined edge to edge. Before a primary, secondary or destructive button it takes that button's fill and draws a short line in its text colour, so the two halves read as one. It runs upright by default; pass `orientation="horizontal"` in a vertical group. It is hidden from assistive technology.
- `ButtonGroup.Text` — A cell that is read rather than pressed: a prefix such as `https://`, a unit, or the value a pair of buttons changes. `size` matches the height of the `sm`, `md` or `lg` buttons and fields beside it.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `ButtonGroupProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `orientation` | `ButtonGroupOrientation` | `horizontal` | Lay the children out in a row or a column. Default `horizontal`. |

#### `ButtonGroupSeparatorProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Which way the line runs. It follows the group: a row of buttons is divided by upright lines, a column by flat ones. Default `vertical`, for a row. |

#### `ButtonGroupTextProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `size` | `ButtonGroupTextSize` | `md` | The height, matching the buttons and fields beside it. Default `md`. |

## Notes

#### Accessibility

The group has `role="group"`. Give it an `aria-label` that names what its actions have in common, such as "Formatting" or "Message actions", so a screen reader announces it on the way in. Each icon-only button needs its own `aria-label` too.

The buttons stay separate stops in the tab order. The group does not move focus between them with the arrow keys.

#### What takes part

Only outline and ghost buttons lie flat in the track. A field or a filled button keeps its own surface, so it reads as raised from the start.

Only direct children take part. Wrap a button in another element and that element takes its place, so the button keeps its own look. `Menu.Trigger` with `render={<Button />}` renders the button itself and joins as one.

#### Server Components

It holds no state, so a Server Component can render it.

## Example

```tsx
import { ArchiveIcon, ClockIcon, FlagIcon } from 'lucide-react';
import { Button } from '@/components/panelui/button';
import { ButtonGroup } from '@/components/panelui/button-group';

export default function ButtonGroupOverview() {
  return (
    <ButtonGroup aria-label="Message actions">
      <Button variant="outline">
        <ArchiveIcon />
        Archive
      </Button>
      <Button variant="outline">
        <ClockIcon />
        Snooze
      </Button>
      <Button variant="outline">
        <FlagIcon />
        Report
      </Button>
    </ButtonGroup>
  );
}
```
