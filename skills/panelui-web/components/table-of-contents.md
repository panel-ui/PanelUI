# Table of Contents

The sections of a long page as a quiet rail, with one mark that moves to what you are reading.

```tsx
import { TableOfContents } from "@/components/panelui/table-of-contents"
```

From npm the path is `panelui-web/table-of-contents`. Install with `npx shadcn@latest add @panelui/table-of-contents`.

## When to use it

Use it beside a long page that is read in sections: a documentation article, a settings screen, a statement of terms. It lists the headings once, quietly, and keeps one mark on the section at the top of the viewport, so a reader can see how far in they are and jump without losing their place.

It is a navigation, not a printed contents table. Every row is a real link with a hash, so the URL follows the reader and a section can be sent to somebody else, and the current row is marked for a screen reader. Keep the labels to the page's own headings and the list to three levels: a rail of twenty equal rows stops saying where you are and becomes a second page.

Scroll tracking is on by default. Pass `value` to hold the active section yourself, or a `root` when the page scrolls inside a panel rather than as a window.

## Usage

```tsx
<TableOfContents defaultValue="install" offset={80}>
  <TableOfContents.Title>On this page</TableOfContents.Title>
  <TableOfContents.List>
    <TableOfContents.Item value="install">
      <TableOfContents.Link href="#install">Install</TableOfContents.Link>
    </TableOfContents.Item>
    <TableOfContents.Item value="configure" depth={1}>
      <TableOfContents.Link href="#configure">Configure</TableOfContents.Link>
    </TableOfContents.Item>
    <TableOfContents.Item value="api">
      <TableOfContents.Link href="#api">API reference</TableOfContents.Link>
    </TableOfContents.Item>
  </TableOfContents.List>
</TableOfContents>
```

## Parts

```tsx
<TableOfContents>
  <TableOfContents.Title />
  <TableOfContents.List>
    <TableOfContents.Item>
      <TableOfContents.Link />
    </TableOfContents.Item>
  </TableOfContents.List>
</TableOfContents>
```

- `TableOfContents.Title` — A small heading above the list, such as “On this page”. It is optional: the `<nav>` is already named for a screen reader, so the title is for the eye.
- `TableOfContents.List` — The ordered list of sections, and the hairline rail down its leading edge. One segment in the primary colour is measured from the active row and travels when the section changes. The rail and the segment are decoration, drawn in pseudo-elements, so the list keeps only its items and nothing extra is announced. With `variant="contour"` on the root it draws the contour line instead, in an SVG hidden from assistive technology.
- `TableOfContents.Item` — One section. `value` names it and matches the root's `value`, and `depth` indents it by one step per level, for a heading under another heading.
- `TableOfContents.Link` — The anchor to the section, hash included in `href`. It is a real `<a>`, so the browser scrolls, the URL gains the hash and middle-click opens the section in a new tab; `render` lets a router's link take its place. Pressing it moves the mark at once, and the current one carries `aria-current="location"`.
- `TableOfContents.Code` — An identifier inside a link, such as a prop name listed under an API heading. It is drawn as a small pill in the link's colour, so it dims and lights with its row.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `TableOfContentsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `string` | — | The active section, when the caller holds it. The scroll spy stands aside. |
| `defaultValue` | `string` | — | The section active at first, when the caller does not hold it. |
| `onValueChange` | `(value: string) => void` | — | Called with a section's `value` when a link is pressed or the spy moves on. |
| `observe` | `boolean` | — | Watch the page and keep the active section at the reading line. On by default when uncontrolled; pass `false` to leave the active section alone, or `true` with `value` to report scroll position without holding state. |
| `offset` | `number` | `16` | How far below the top of the scroll viewport counts as the reading line, in pixels. Raise it to clear a sticky header. |
| `root` | `HTMLElement \| null \| RefObject<HTMLElement \| null>` | — | The element that scrolls, when the page is not what scrolls. A section inside a panel needs the panel here; the viewport is the default. |
| `variant` | `TableOfContentsVariant` | `rail` | How the list marks where the reader is. `rail` is a hairline with one segment on the active section. `contour` is a line that steps in and out with each level and lights every section on screen. Default `rail`. |
| `className` | `string` | — | Classes for the `<nav>`. |

#### `TableOfContentsTitleProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Classes for the heading. |

#### `TableOfContentsListProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Classes for the `<ol>`. |

#### `TableOfContentsItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `string` | **required** | The section this row stands for. Matches the root's `value`. |
| `depth` | `number` | `0` | How deep the section sits. Each step indents the row and its link, for a section under a section. |
| `className` | `string` | — | Classes for the `<li>`. |

#### `TableOfContentsLinkProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `href` | `string` | **required** | The section this link jumps to, hash included: `#install`. |
| `className` | `string` | — | Classes for the `<a>`. |

#### `TableOfContentsCodeProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Classes for the `<code>`. |

## In a Server Component

`TableOfContents` is a client component. A Server Component cannot read `TableOfContents.Title` off the import, so import each part by name: `TableOfContentsTitle`, `TableOfContentsList`, `TableOfContentsItem`, `TableOfContentsLink`, `TableOfContentsCode`.

## Notes

#### The scroll spy

With no `value` given, the spy watches the elements named by the links' `href` hashes with an `IntersectionObserver`. It makes the section at the reading line active, which is the section the line falls through, or the one most recently passed when the line is in a gap. `offset` is how far below the top of the scroll viewport that line sits, in pixels, and defaults to `16`. A hash that points at nothing is skipped rather than throwing, the observer disconnects on unmount, and a controlled `value` is never overwritten.

#### Keyboard

Every link is an ordinary tab stop, in the order the sections appear. Enter follows it, and the browser moves focus and the URL with it. There is no roving focus, no arrow-key mode and nothing hidden to learn: the list behaves like the links it is made of.

#### Accessibility

The root is a `<nav>` labelled “Table of contents”. Give it another `aria-label` when the page has more than one navigation landmark. The list keeps its `<ol>` semantics, the current link carries `aria-current="location"`, and the rail and its mark are pseudo-elements outside the accessibility tree. Focus is drawn as a ring around the link.

#### Reduced motion

With reduced motion turned on, the segment jumps to its new row without travelling. Nothing else moves.

#### Built on

It uses `@base-ui/react` for the `render` prop and `tailwind-variants` for its styles, as the rest of the collection does. The spy is the browser's `IntersectionObserver`, and the marks are placed in a layout effect from the rows' measured positions, so no measuring library is needed.

#### Contour

The contour lights a range rather than one row, so it needs to know what is on screen. With the scroll spy on, that is the section at the reading line and every section whose heading is above the bottom of the viewport. With `value` held and the spy off, only the active section is lit. The line, its lit stretch and the dot are drawn from the rows' measured positions and move with a transition that turns off under reduced motion.

## Example

```tsx
'use client';

import { useRef } from 'react';
import { TableOfContents } from '@/components/panelui/table-of-contents';

const SECTIONS = [
  {
    value: 'introduction',
    label: 'Introduction',
    text: 'Orders leave the warehouse within two working days. What follows is how a parcel gets from there to a doorstep, and what to do when it does not arrive at all.',
  },
  {
    value: 'shipping',
    label: 'Shipping',
    text: 'Standard delivery is free over £40 and takes three to five working days. Express orders placed before noon are sent the same day, and a tracking link arrives by email as soon as the carrier has scanned the parcel.',
  },
  {
    value: 'returns',
    label: 'Returns',
    text: 'Anything unused can come back within thirty days. Print the label from the order page, put the item in its original box, and leave it at any drop-off point; the refund is issued when it reaches the warehouse.',
  },
  {
    value: 'exchanges',
    label: 'Exchanges',
    text: 'For a different size or colour, send the first item back and place a new order. It is quicker than a two-way exchange, and the new parcel is not held while the old one is in transit.',
  },
  {
    value: 'contact',
    label: 'Contact',
    text: 'The team answers from 09:00 to 18:00 on weekdays. Include the order number in the first message and the reply can be answered in one go rather than three.',
  },
];

export default function TableOfContentsOverview() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div className="grid w-full max-w-2xl grid-cols-[minmax(0,1fr)_8.5rem] gap-5">
      <div
        ref={scroller}
        className="h-80 overflow-y-auto overscroll-contain rounded-xl border bg-card [scrollbar-width:thin]"
      >
        <article className="px-5 py-5">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Guide</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">Shipping and returns</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Everything about getting an order to you, and getting it back to us.
          </p>

          {SECTIONS.map((section) => (
            <section key={section.value} id={`toc-overview-${section.value}`} className="mt-8 scroll-mt-4">
              <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{section.text}</p>
            </section>
          ))}
        </article>
      </div>

      <TableOfContents root={scroller} offset={16} defaultValue="introduction" className="self-start py-1">
        <TableOfContents.Title>On this page</TableOfContents.Title>
        <TableOfContents.List>
          {SECTIONS.map((section) => (
            <TableOfContents.Item key={section.value} value={section.value}>
              <TableOfContents.Link href={`#toc-overview-${section.value}`}>{section.label}</TableOfContents.Link>
            </TableOfContents.Item>
          ))}
        </TableOfContents.List>
      </TableOfContents>
    </div>
  );
}
```
