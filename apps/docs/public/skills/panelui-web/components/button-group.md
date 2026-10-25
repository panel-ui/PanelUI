# Button Group

Related buttons joined into one control, with separators, text cells and fields between them.

```tsx
import { ButtonGroup } from "@/components/panelui/button-group"
```

From npm the path is `panelui-web/button-group`. Install with `npx shadcn@latest add @panelui/button-group`.

## When to use it

Use it for a few actions on the same thing, such as archiving, snoozing or reporting one message, so they read as one control rather than a row of separate buttons.

The group joins whatever is placed directly inside it: it squares the corners where two children meet and drops the border one of them would double. Put `Button`s in it, and an `Input`, `Menu.Trigger` or `ButtonGroup.Text` beside them.

Filled buttons have no border to share, so put a `ButtonGroup.Separator` between them.

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

- `ButtonGroup.Separator` — A one-pixel line between two children with no border to share, such as filled buttons. It runs upright by default; pass `orientation="horizontal"` in a vertical group. It is hidden from assistive technology.
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

#### What joins

Only direct children are joined. Wrap a button in another element and that element is joined instead, so the button keeps its own corners. `Menu.Trigger` with `render={<Button />}` renders the button itself and joins as one.

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
