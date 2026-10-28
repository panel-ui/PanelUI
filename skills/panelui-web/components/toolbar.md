# Toolbar

A strip of tools and actions for an editor, with one tool chosen at a time.

```tsx
import { Toolbar } from "@/components/panelui/toolbar"
```

From npm the path is `panelui-web/toolbar`. Install with `npx shadcn@latest add @panelui/toolbar`.

## When to use it

Use it for the tools of an editor: a drawing canvas, a photo editor, a video timeline. It holds two kinds of control. A `Toolbar.Tool` is a mode, such as the pen or the select tool; exactly one in its `Toolbar.Group` is on until another is chosen. A `Toolbar.Button` is an action, such as undo, that does its job and leaves nothing on.

Give every tool and button a `label`. The buttons show only icons, so the label is their tooltip and what a screen reader reads.

For a few views of one panel, use [Tabs](/docs/web/components/tabs). For buttons that act on one thing together, such as a split button, use [Button Group](/docs/web/components/button-group).

## Usage

```tsx
<Toolbar>
  <Toolbar.Group defaultValue="select" aria-label="Tools">
    <Toolbar.Tool value="select" label="Select" shortcut="V">
      <MousePointer2Icon />
    </Toolbar.Tool>
    <Toolbar.Tool value="pen" label="Pen" shortcut="P">
      <PenToolIcon />
    </Toolbar.Tool>
  </Toolbar.Group>
  <Toolbar.Separator />
  <Toolbar.Button label="Undo" shortcut="⌘Z" onClick={undo}>
    <Undo2Icon />
  </Toolbar.Button>
</Toolbar>
```

## Parts

```tsx
<Toolbar>
  <Toolbar.Group>
    <Toolbar.Tool>
      <Toolbar.Caret />
    </Toolbar.Tool>
  </Toolbar.Group>
  <Toolbar.Separator />
  <Toolbar.Button />
</Toolbar>
```

- `Toolbar.Group` — Tools of which exactly one is on. `value` and `onValueChange`, or `defaultValue`, hold which one, by its `value`. Choosing the tool that is already on leaves it on. A filled marker in the primary colour sits under the chosen tool and glides to the next one.
- `Toolbar.Tool` — One tool in a group. `label` is its tooltip and its name for a screen reader, and `shortcut` shows its key in the tooltip.
- `Toolbar.Button` — An action: undo, zoom, export. `label` and `shortcut` work as on a tool. `render` makes another trigger the button, such as a `Menu.Trigger`, so a menu opens from the strip.
- `Toolbar.Separator` — A short line between sets of controls that belong apart, such as the tools and the history buttons.
- `Toolbar.Caret` — A small chevron saying a button opens more choices. Beside an icon it marks that button; alone in a `Toolbar.Button`, it makes that button a slim chevron against the tool before it, muted until it is hovered or its menu is open.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `ToolbarProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `ToolbarVariant` | `floating` | `floating` sits on a raised surface of its own; `inline` draws only the buttons. Default `floating`. |
| `size` | `ToolbarSize` | `md` | The size of every button in it. Default `md`. |
| `shortcuts` | `boolean` | `false` | Answer single-key shortcuts anywhere on the page: a key in a tool's or button's `shortcut` chooses that tool or presses that button. Keys typed into a field are left alone. Off by default; turn it on for the one toolbar that owns the page. |
| `tooltipSide` | `'top' \| 'bottom' \| 'left' \| 'right'` | — | Which side of a button its tooltip opens on. Default below a row and beside a column. |
| `className` | `string` | — | — |
| `style` | `CSSProperties` | — | — |

#### `ToolbarGroupProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `string` | — | The chosen tool's `value`, when the caller holds it. |
| `defaultValue` | `string` | — | The tool chosen at first, when the caller does not hold it. |
| `onValueChange` | `(value: string) => void` | — | Called with the `value` of the tool that was chosen. |
| `disabled` | `boolean` | — | Turns every tool in the group off. |

#### `ToolbarToolProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `string` | **required** | Names the tool in its group's `value`. |
| `label` | `string` | — | What the tool is called: its tooltip, and what a screen reader reads. |
| `shortcut` | `string` | — | The key that chooses it, shown in the tooltip, such as `V`. |

#### `ToolbarButtonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `string` | — | What it does: its tooltip, and what a screen reader reads. |
| `shortcut` | `string` | — | The key or keys that press it, shown in the tooltip, such as `⌘Z`. A single key is also answered. |
| `render` | `ReactElement` | — | Another trigger to be the button, such as a `Menu.Trigger`, so a menu opens from the strip and keeps its place in the arrow-key order. |

#### `ToolbarSeparatorProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

## In a Server Component

`Toolbar` is a client component. A Server Component cannot read `Toolbar.Group` off the import, so import each part by name: `ToolbarGroup`, `ToolbarTool`, `ToolbarButton`, `ToolbarSeparator`, `ToolbarCaret`.

## Notes

#### Keyboard

The strip is one stop in the tab order. The arrow keys move along it, Home and End go to its ends, and Space or Enter chooses a tool or presses a button.

A `shortcut` written as one key, such as `V`, is answered when `shortcuts` is on. One written with a modifier, such as `⌘Z`, is only shown in the tooltip; handle that key yourself, because the page may already use it.

#### Floating or inline

`floating`, the default, draws the strip on a raised surface of its own, for a strip laid over a canvas. `inline` draws the buttons only, for a strip inside a header or a panel that already has a surface.

With reduced motion turned on, the marker moves to the chosen tool without gliding.

## Example

```tsx
'use client';

import {
  CircleIcon,
  FrameIcon,
  HandIcon,
  MessageCircleIcon,
  MousePointer2Icon,
  PenToolIcon,
  Redo2Icon,
  SquareIcon,
  TypeIcon,
  Undo2Icon,
} from 'lucide-react';
import { Toolbar } from '@/components/panelui/toolbar';

export default function ToolbarOverview() {
  return (
    <Toolbar>
      <Toolbar.Group defaultValue="select" aria-label="Tools">
        <Toolbar.Tool value="select" label="Select" shortcut="V">
          <MousePointer2Icon />
        </Toolbar.Tool>
        <Toolbar.Tool value="hand" label="Pan" shortcut="H">
          <HandIcon />
        </Toolbar.Tool>
        <Toolbar.Tool value="frame" label="Frame" shortcut="F">
          <FrameIcon />
        </Toolbar.Tool>
        <Toolbar.Tool value="rectangle" label="Rectangle" shortcut="R">
          <SquareIcon />
        </Toolbar.Tool>
        <Toolbar.Tool value="ellipse" label="Ellipse" shortcut="E">
          <CircleIcon />
        </Toolbar.Tool>
        <Toolbar.Tool value="pen" label="Pen" shortcut="P">
          <PenToolIcon />
        </Toolbar.Tool>
        <Toolbar.Tool value="text" label="Text" shortcut="T">
          <TypeIcon />
        </Toolbar.Tool>
        <Toolbar.Tool value="comment" label="Comment" shortcut="C">
          <MessageCircleIcon />
        </Toolbar.Tool>
      </Toolbar.Group>
      <Toolbar.Separator />
      <Toolbar.Button label="Undo" shortcut="⌘Z">
        <Undo2Icon />
      </Toolbar.Button>
      <Toolbar.Button label="Redo" shortcut="⇧⌘Z" disabled>
        <Redo2Icon />
      </Toolbar.Button>
    </Toolbar>
  );
}
```
