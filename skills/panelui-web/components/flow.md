# Flow

A canvas of nodes joined by edges, that you pan, zoom and rearrange.

```tsx
import { Flow } from "@/components/panelui/flow"
```

From npm the path is `panelui-web/flow`. Install with `npx shadcn@latest add @panelui/flow`.

## When to use it

Use it to show how things are connected and let somebody move them about: the stages of a pipeline, an automation, the parts of a system. Nodes are boxes with your own contents, edges join them, and the canvas is panned and zoomed.

It has the same parts and props as the app library's Flow, so a graph written for one reads the same in the other.

It lays nothing out for you. Every node is given a position, so for a graph whose shape comes from data you need to work the positions out first. For steps in a fixed order with nothing to rearrange, a list of steps is the simpler thing.

## Usage

```tsx
<Flow fitViewOnMount>
  <Flow.Background />
  <Flow.Node id="draft" position={{ x: 40, y: 20 }}>
    <Flow.NodeContent>
      <Flow.NodeTitle>Draft</Flow.NodeTitle>
    </Flow.NodeContent>
  </Flow.Node>
  <Flow.Node id="edit" position={{ x: 40, y: 150 }}>
    <Flow.NodeContent>
      <Flow.NodeTitle>Edit</Flow.NodeTitle>
      <Flow.NodeDescription>Two rounds</Flow.NodeDescription>
    </Flow.NodeContent>
  </Flow.Node>
  <Flow.Edge from="draft" to="edit" arrow />
  <Flow.Controls />
</Flow>
```

## Parts

```tsx
<Flow>
  <Flow.Background />
  <Flow.Node id="…" position={…}>
    <Flow.NodeHeader>
      <Flow.NodeDescription />
      <Flow.NodeBadge />
    </Flow.NodeHeader>
    <Flow.NodeContent>
      <Flow.NodeTitle />
      <Flow.NodeDescription />
    </Flow.NodeContent>
    <Flow.Handle />
  </Flow.Node>
  <Flow.Group id="…" position={…}>
    <Flow.GroupItem>
      <Flow.NodeContent />
    </Flow.GroupItem>
  </Flow.Group>
  <Flow.Edge from="…" to="…" />
  <Flow.Controls />
  <Flow.MiniMap />
</Flow>
```

- `Flow.Background` — The pattern behind the graph: dots, lines or crosses. It moves and scales with the graph.
- `Flow.Node` — A box on the graph. `id` is what edges call it and `position` is where it starts. Fill it with the node parts below, or with anything of your own.
- `Flow.NodeHeader` — A strip across the top of a node, ruled off from the rest, with something at each end: a step number and a `Flow.NodeBadge`.
- `Flow.NodeContent` — The body of a node, carrying the node's padding. Inside a `Flow.GroupItem` it has none, because the item has its own.
- `Flow.NodeTitle` — What the node is.
- `Flow.NodeDescription` — A quieter line about the node. It is smaller inside a `Flow.GroupItem`.
- `Flow.NodeBadge` — A word in a pill for the node's state, tinted with the theme colour named by `color`. `muted` is grey, and the default.
- `Flow.Handle` — A dot on a node's edge that a connection can be drawn from or dropped on. Give it an `id` to join an edge to it by name.
- `Flow.Edge` — A line from one node to another: a curve, a routed line or a straight one, optionally dashed, marching and with an arrowhead.
- `Flow.Group` — A dashed box with a label, round things that belong together. It is dragged as one and an edge can be joined to it.
- `Flow.GroupItem` — One thing inside a group that is not a node of its own: an icon beside a `Flow.NodeContent`. It moves with the group, and edges cannot join it.
- `Flow.Controls` — Buttons to zoom, fit everything in view and lock the canvas.
- `Flow.MiniMap` — The whole graph, small, with the part in view marked on it.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `FlowProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultViewport` | `FlowViewport` | — | Where the canvas looks to begin with. |
| `minZoom` | `number` | `0.3` | The furthest out it can be zoomed. |
| `maxZoom` | `number` | `2.5` | The furthest in it can be zoomed. |
| `panOnDrag` | `boolean` | `true` | Whether dragging the pane pans it. |
| `zoomOnPinch` | `boolean` | `true` | Whether a pinch, or Control with the wheel, zooms it. |
| `fitViewOnMount` | `boolean` | `false` | Fits every node into view once they have been measured. |
| `fitViewPadding` | `number` | `48` | The room left round the nodes when fitting them, in pixels. |
| `onViewportChange` | `(viewport: FlowViewport) => void` | — | Called as the canvas is panned or zoomed. |
| `onNodeDragEnd` | `(id: string, position: FlowNodePosition) => void` | — | Called with a node's new position when a drag or a key press has moved it. |
| `onConnect` | `(connection: FlowConnection) => void` | — | Called when a connection drawn from a handle lands on another node. |
| `isValidConnection` | `(connection: FlowConnection) => boolean` | — | Decides whether a connection may land. Without it, any two different nodes may be joined. |
| `label` | `string` | `'Diagram'` | What a screen reader calls the canvas. |

#### `FlowBackgroundProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `'dots' \| 'lines' \| 'cross' \| 'none'` | `'bezier'` | Dots, a grid of lines, small crosses, or nothing. |
| `gap` | `number` | `20` | The distance from one mark to the next, in pixels at a zoom of 1. |
| `size` | `number` | — | How big a mark is: a dot's radius, a line's thickness, half a cross's arm. |
| `className` | `string` | — | — |

#### `FlowNodeProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `id` | `string` | **required** | What edges and `onNodeDragEnd` call this node. |
| `position` | `FlowNodePosition` | **required** | Where its top left corner is, on the graph. |
| `draggable` | `boolean` | `true` | Whether it can be dragged and moved with the arrow keys. |
| `confine` | `boolean` | `false` | Inside a `Flow.Group`, stop a drag at the group's edge instead of letting the node leave it. Does nothing outside a group. |
| `pinned` | `boolean` | `false` | Inside a `Flow.Group`, take no drag of its own: a drag that starts on it moves the group, and the node goes with it. |
| `selected` | `boolean` | `false` | Draws it as the one that has been picked. |
| `onPress` | `() => void` | — | Called when it is pressed without being dragged, or with Enter. |
| `onDelete` | `() => void` | — | Called when Delete or Backspace is pressed on it. |
| `moveStep` | `number` | — | How far one arrow key press moves it, in pixels. Shift moves four times as far. |

#### `FlowGroupProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `ReactNode` | — | Written in the corner of the group. |
| `size` | `{ width: number; height: number }` | — | A fixed size for the group. Give one when it holds `Flow.Node`s, which are placed inside it rather than laid out by it, so they do not size it. |

#### `FlowNodeHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'flow-node-header', className: flowVariants().nodeHeader({ className }) }, props),` | **required** | — |

#### `FlowNodeContentProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |

#### `FlowNodeTitleProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'p',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'flow-node-title', className: flowVariants().nodeTitle({ className }) }, props),` | **required** | — |

#### `FlowNodeDescriptionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'p',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |

#### `FlowNodeBadgeProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `FlowColor \| 'muted'` | — | Which of the theme's roles it is tinted with. `muted` is grey. Default `muted`. |

#### `FlowGroupItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'flow-group-item', className: flowVariants().groupItem({ className }) }, props),` | **required** | — |

#### `FlowHandleProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `id` | `string` | — | A name for this handle, so an edge can be joined to it and not only to the node. |
| `position` | `FlowSide` | `'right'` | Which face of the node it sits on. |
| `offset` | `number` | `0.5` | How far along that face, from 0 to 1. |

#### `FlowEdgeProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `from` | `FlowEndpointReference` | **required** | Where it leaves from: a node's `id`, `"node.handle"` for one of its handles, or `{ node, handle }`. |
| `to` | `FlowEndpointReference` | **required** | Where it arrives. |
| `variant` | `FlowEdgeVariant` | `'bezier'` | A curve, a rounded right-angled route, a square one, or a straight line. |
| `animated` | `boolean` | `false` | Sets the dashes marching towards the target. |
| `dashed` | `boolean` | `false` | Draws it dashed. |
| `color` | `FlowColor` | — | One of the theme's roles. Without it the edge is a quiet grey. |
| `width` | `number` | `2` | How thick the line is, in pixels at a zoom of 1. |
| `arrow` | `boolean` | `false` | Draws an arrowhead where it arrives. |
| `fromSide` | `FlowSide` | — | The face it leaves from. Worked out from where the two nodes are when left out. |
| `toSide` | `FlowSide` | — | The face it arrives at. |
| `radius` | `number` | `8` | How round the corners of a `smoothstep` route are. |
| `gap` | `number` | `20` | How far a routed edge runs straight out of a node before it turns. |
| `curvature` | `number` | `0.25` | How far a `bezier` bulges when its target is behind its source. |

#### `FlowControlsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `zoom` | `boolean` | `true` | Shows the two zoom buttons. |
| `fit` | `boolean` | `true` | Shows the button that fits every node into view. |
| `lock` | `boolean` | `true` | Shows the button that locks the canvas against panning, zooming and dragging. |
| `step` | `number` | `1.3` | How much one press of a zoom button zooms. |
| `position` | `FlowCorner` | `'bottom-right'` | Which corner of the canvas they sit in. |

#### `FlowMiniMapProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `width` | `number` | `120` | How wide the map is, in pixels. |
| `height` | `number` | `80` | How tall the map is, in pixels. |
| `position` | `FlowCorner` | `'bottom-left'` | Which corner of the canvas it sits in. |

## In a Server Component

`Flow` is a client component. A Server Component cannot read `Flow.Background` off the import, so import each part by name: `FlowBackground`, `FlowNode`, `FlowHandle`, `FlowEdge`, `FlowGroup`, `FlowGroupItem`, `FlowNodeHeader`, `FlowNodeContent`, `FlowNodeTitle`, `FlowNodeDescription`, `FlowNodeBadge`, `FlowControls`, `FlowMiniMap`.

## Notes

#### Size

The canvas is 24rem tall and as wide as its container. Set a height with `className`.

It is drawn as a bordered, rounded box. Inside a frame that already has an edge, such as a card or a panel, give it the frame's height and take its own edge off: `className="h-full rounded-none border-0"`. The examples on this page do that.

`fitViewOnMount` fits the graph once. Where the room for the graph changes a great deal, as between a phone and a desktop, lay the nodes out for each and give the canvas a `key` that changes with the layout, so it is fitted again.

#### Positions

`position` is the node's top left corner on the graph, in pixels at a zoom of 1. The canvas holds a node's position after that: a drag moves it, and `onNodeDragEnd` reports where it stopped. To move a node yourself, keep its position in state and pass the new one.

`fitViewOnMount` zooms and pans so every node is in view once they have been measured. It never zooms in past 1.

#### Edges

`from` and `to` are node ids, or `{ node, handle }` to join a handle by its `id`. The faces an edge uses are worked out from where the two nodes are, and change as one is dragged past the other; `fromSide` and `toSide` fix them.

`variant` is `bezier`, `smoothstep`, `step` or `straight`. `animated` sets dashes marching towards the target, and stops for anyone who has asked for reduced motion. `color` names one of the theme's roles; without it an edge is a quiet grey.

#### Panning and zooming

Drag the empty canvas to pan. Zoom with a pinch, or with Control or Command and the wheel. The plain wheel is left to the page, so a diagram in a long page does not trap its scroll. `Flow.Controls` has buttons for the same things, and a lock that stops all of it.

#### Keyboard

The canvas and every node are Tab stops. On the canvas the arrow keys pan, plus and minus zoom and 0 fits everything. On a node the arrow keys move it by `moveStep`, four times as far with Shift, Enter presses it and Delete calls `onDelete`.

A connection can only be drawn with a pointer. Where joining nodes matters to everyone, give them another way to do it, such as a menu on the node.

#### Inside a node

A node is a card by default; pass `className` to change it. Buttons, links and fields inside a node work as usual and do not start a drag. Put `data-no-drag` on anything else that should not.

#### Groups

A group's children are ordinary elements, laid out however you like inside it. They are not nodes: an edge is joined to the group, not to something in it.

## Example

```tsx
'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/panelui/button';
import { Flow } from '@/components/panelui/flow';

/** An article on its way to being published. */
const STAGES = [
  { id: 'draft', name: 'Draft', detail: '1,840 words' },
  { id: 'edit', name: 'Edit', detail: 'Two rounds' },
  { id: 'check', name: 'Fact check', detail: '14 claims' },
  { id: 'legal', name: 'Legal read', detail: 'One quote to clear' },
  { id: 'schedule', name: 'Schedule', detail: 'Thursday, 09:00' },
  { id: 'publish', name: 'Publish', detail: 'Site and newsletter' },
];

const TAG = { done: 'success', live: 'info', waiting: 'muted' } as const;

/**
 * Whether the canvas has room to lay the graph out across. It is the canvas
 * that is measured and not the window: in a page with a sidebar the two are
 * far apart.
 */
function useRoom(least: number) {
  const [wide, setWide] = useState(true);
  const watch = useCallback(
    (node: HTMLElement | null) => {
      if (!node) return;
      const observer = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= least));
      observer.observe(node);
      return () => observer.disconnect();
    },
    [least]
  );
  return [wide, watch] as const;
}

export default function FlowPipeline() {
  // The stage being worked on. Everything before it is done.
  const [at, setAt] = useState(1);
  const [wide, watch] = useRoom(720);
  const columns = wide ? 3 : 2;

  // The stages run along a row and back along the next, like a snake.
  const place = (index: number) => {
    const row = Math.floor(index / columns);
    const along = index % columns;
    const column = row % 2 ? columns - 1 - along : along;
    return { x: column * (wide ? 340 : 216), y: row * (wide ? 230 : 160) };
  };

  return (
    <div ref={watch} className="relative h-[34rem] w-full">
      <Flow
        // Laid out afresh, and fitted afresh, when the room for it changes.
        key={columns}
        fitViewOnMount
        fitViewPadding={wide ? 48 : 20}
        label="Article pipeline"
        className="h-full rounded-none border-0"
      >
        <Flow.Background variant="lines" gap={28} />
        {STAGES.map((stage, index) => {
          const state = index < at ? 'done' : index === at ? 'live' : 'waiting';
          return (
            <Flow.Node
              key={stage.id}
              id={stage.id}
              position={place(index)}
              className={wide ? 'w-52' : 'w-44'}
            >
              <Flow.NodeHeader>
                <Flow.NodeDescription>Stage {index + 1}</Flow.NodeDescription>
                <Flow.NodeBadge color={TAG[state]}>
                  {state === 'done' ? 'Done' : state === 'live' ? 'Now' : 'Waiting'}
                </Flow.NodeBadge>
              </Flow.NodeHeader>
              <Flow.NodeContent>
                <Flow.NodeTitle>{stage.name}</Flow.NodeTitle>
                <Flow.NodeDescription className="truncate">{stage.detail}</Flow.NodeDescription>
              </Flow.NodeContent>
            </Flow.Node>
          );
        })}
        {STAGES.slice(1).map((stage, index) => (
          <Flow.Edge
            key={stage.id}
            from={STAGES[index].id}
            to={stage.id}
            variant="smoothstep"
            gap={10}
            arrow
            // Only the edge into the stage being worked on is marching.
            animated={index + 1 === at}
            color={index + 1 === at ? 'info' : undefined}
          />
        ))}
        {/* Fewer buttons where the graph needs the room. */}
        <Flow.Controls fit={wide} lock={wide} />
      </Flow>

      <div className="absolute bottom-3 left-3 flex gap-2">
        <Button variant="outline" size="sm" disabled={at === 0} onClick={() => setAt(at - 1)}>
          Back a stage
        </Button>
        <Button size="sm" disabled={at === STAGES.length - 1} onClick={() => setAt(at + 1)}>
          Advance
        </Button>
      </div>
    </div>
  );
}
```
