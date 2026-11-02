# Badge

A short label for a state or a kind, tinted in its theme colour, with a dot for a state that is still changing.

```tsx
import { Badge } from "@/components/panelui/badge"
```

From npm the path is `panelui-web/badge`. Install with `npx shadcn@latest add @panelui/badge`.

## When to use it

Use a badge to label a state (paid, overdue, building) or a kind (draft, beta, a version number) next to the thing it describes.

A badge is not a control. It cannot be pressed, toggled or removed. For a label that does any of those, use [Chip](/docs/web/components/chip).

## Usage

```tsx
<Badge>New</Badge>
<Badge variant="success" dot>Paid</Badge>
<Badge variant="info" dot="pulse">Syncing</Badge>
```

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `BadgeProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `BadgeVariant` | `'default'` | What it means. `default` is solid, for the one thing that should be seen first; the four states are tinted in their theme colour. Default `default`. |
| `size` | `BadgeSize` | `'md'` | Its height and text size. Default `md`. |
| `dot` | `boolean \| 'pulse'` | `false` | A dot before the text in the badge's colour. `'pulse'` makes it breathe, for a state that is still changing. |

## Notes

#### Choosing a variant

`default` is solid. Keep it for the one badge on a screen that should be seen first. `secondary` and `outline` are for kinds, the four colours for states.

#### Reduced motion

The pulse does not run when the reader has asked for reduced motion. The dot stays.

## Example

```tsx
import { Badge } from '@/components/panelui/badge';

export default function BadgeOverview() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Badge>New</Badge>
      <Badge variant="secondary">Draft</Badge>
      <Badge variant="outline">v2.4</Badge>
      <Badge variant="success" dot>
        Paid
      </Badge>
      <Badge variant="info" dot="pulse">
        Syncing
      </Badge>
      <Badge variant="warning" dot>
        Due Friday
      </Badge>
      <Badge variant="destructive" dot>
        Overdue
      </Badge>
    </div>
  );
}
```
