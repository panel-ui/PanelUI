# Scroll Area

A box that scrolls, with a thin scrollbar laid over its content in place of the browser's own.

```tsx
import { ScrollArea } from "@/components/panelui/scroll-area"
```

From npm the path is `panelui-web/scroll-area`. Install with `npx shadcn@latest add @panelui/scroll-area`.

## When to use it

Use it for any box with more content than it has room for: a list in a card, a panel beside an editor, a long article inside a frame. It scrolls like the browser's own scroller, with a thin bar drawn over the content's edge that shows while the box is hovered or scrolled.

It needs a height to scroll in. Give the root a height, a `max-h-*`, or put it in a flex column where it can shrink.

Put the border radius on the root, not on what is inside it. The root clips everything, including sticky, blurred or transformed children, which a rounded scroller on its own can let paint over its corners.

## Usage

```tsx
<ScrollArea className="h-80 rounded-2xl border">
  <article>…</article>
</ScrollArea>
```

## Parts

```tsx
<ScrollArea.Root>
  <ScrollArea.Viewport>
    <ScrollArea.Content />
  </ScrollArea.Viewport>
  <ScrollArea.Scrollbar />
  <ScrollArea.Corner />
</ScrollArea.Root>
```

- `ScrollArea.Root` — The frame. It clips its content to its own radius and holds the bars. `ScrollArea` on its own renders all the parts inside it, so you only need `Root` to compose them yourself.
- `ScrollArea.Viewport` — The element that scrolls. Its `ref` is the one to pass to code that listens to scrolling, such as a table of contents' `root` or a scroll header's `scrollRef`. It takes `fade` and `gutter`, like `ScrollArea`.
- `ScrollArea.Content` — What scrolls. It is measured to size the thumb.
- `ScrollArea.Scrollbar` — The track and its thumb, over the content's edge. Pass `orientation="horizontal"` for a second one along the bottom.
- `ScrollArea.Corner` — The square where two bars meet, for a box that scrolls both ways.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `ScrollAreaProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `orientation` | `ScrollAreaOrientation` | `'vertical'` | Which ways it scrolls. Each gets its own bar. Default `vertical`. |
| `fade` | `boolean` | `false` | Fades the content out at an edge it continues past. Default `false`. |
| `gutter` | `boolean` | `false` | Holds the content clear of the bar while there is something to scroll, instead of letting the bar sit over it. Default `false`. |
| `viewportRef` | `Ref<HTMLDivElement>` | — | The element that scrolls, for code that listens to it: pass it as a table of contents' `root` or a scroll header's `scrollRef`. |
| `viewportClassName` | `string` | — | Classes for the viewport, the element that scrolls. |
| `contentClassName` | `string` | — | Classes for the element that holds the content inside the viewport. |

#### `ScrollAreaViewportProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `fade` | `boolean` | `false` | Fades the content out at an edge it continues past. Default `false`. |
| `gutter` | `boolean` | `false` | Holds the content clear of the bar while there is something to scroll. Default `false`. |

#### `ScrollAreaScrollbarProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Which way this bar moves. Default `vertical`. |

## In a Server Component

`ScrollArea` is a client component. A Server Component cannot read `ScrollArea.Root` off the import, so import each part by name: `ScrollAreaRoot`, `ScrollAreaViewport`, `ScrollAreaContent`, `ScrollAreaScrollbar`, `ScrollAreaCorner`.

## Notes

#### Scrolling

The viewport is a real scroller, so the wheel, a trackpad, touch, the keyboard and find-in-page all work as they do anywhere else. The thumb can also be dragged, and a press on the track moves the thumb to where you pressed.

#### Keyboard

The viewport takes focus when there is something to scroll, and shows a ring inside its edge. The arrow keys, Page Up, Page Down, Home and End scroll it.

#### Reduced motion

With reduced motion set, the bar appears and disappears without fading.

## Example

```tsx
'use client';

import { ScrollArea } from '@/components/panelui/scroll-area';

const RELEASES = [
  { version: '2.4.0', date: '12 Nov', note: 'Exports can be scheduled for the first of each month.' },
  { version: '2.3.2', date: '4 Nov', note: 'A shared link no longer drops its filters when it is opened on a phone.' },
  { version: '2.3.1', date: '29 Oct', note: 'CSV imports keep leading zeros in postcodes and account numbers.' },
  { version: '2.3.0', date: '21 Oct', note: 'Dashboards can be duplicated with or without their saved views.' },
  { version: '2.2.4', date: '9 Oct', note: 'The date picker opens on the month that is already selected.' },
  { version: '2.2.3', date: '30 Sep', note: 'Search matches an invoice number typed with or without its prefix.' },
  { version: '2.2.2', date: '18 Sep', note: 'Two people editing one report no longer overwrite each other’s notes.' },
  { version: '2.2.0', date: '2 Sep', note: 'Workspaces can require two-step sign-in for every member.' },
  { version: '2.1.1', date: '20 Aug', note: 'Large tables scroll without the header row jumping.' },
];

export default function ScrollAreaOverview() {
  return (
    <ScrollArea className="h-80 w-full max-w-sm rounded-2xl border bg-background">
      <ol className="flex flex-col divide-y">
        {RELEASES.map((release) => (
          <li key={release.version} className="flex flex-col gap-1 px-5 py-4">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium tabular-nums">{release.version}</span>
              <span className="text-xs text-muted-foreground">{release.date}</span>
            </div>
            <p className="text-sm text-muted-foreground">{release.note}</p>
          </li>
        ))}
      </ol>
    </ScrollArea>
  );
}
```
