# Pagination

Page controls for a long result set: the pages near you, the gaps between them, and a way across.

```tsx
import { Pagination } from "@/components/panelui/pagination"
```

From npm the path is `panelui-web/pagination`. Install with `npx shadcn@latest add @panelui/pagination`.

## When to use it

Use it under a table or a list that is longer than one screen, when the rows arrive a page at a time and a reader needs to reach a particular part of the set.

It never fetches and never slices. Give it how many pages there are, and either let it keep the page or pass `page` and `onPageChange` to hold it yourself; the rows are yours.

The run of numbers has a fixed width. `siblings` sets how many pages sit either side of the one you are on and `boundaries` how many stay pinned at each end, so a narrow column shows fewer numbers rather than a row that reshuffles as you move through it.

For moving between a few views of one thing, use [Tabs](/docs/web/components/tabs). When the pages have addresses of their own, pass `getPageHref` and every number becomes a real link that can be opened in another tab.

## Usage

```tsx
<Pagination count={12} page={page} onPageChange={setPage}>
  <Pagination.Status page={page} pageSize={20} total={240} />
</Pagination>
```

## Parts

```tsx
<Pagination count={12} page={page} onPageChange={setPage}>
  <Pagination.Status />
</Pagination>
```

- `Pagination.Previous` — Back one page. With `label` it writes the word beside the arrow, which is what `simple` turns on. It is dead on the first page and does not loop to the last.
- `Pagination.Next` — Forward one page. With `label` it writes the word beside the arrow. It is dead on the last page.
- `Pagination.Item` — One numbered target. On the page being shown it carries `aria-current="page"` and the solid primary marker, so the current page is spoken as state and not only painted. A screen reader calls it "Go to page 3" unless `aria-label` says otherwise.
- `Pagination.Link` — A numbered target drawn as a real link, with an `href`. `getPageHref` on the root is what puts these in the run; used directly, it is the target for a pager you are assembling yourself. A plain click moves the component before the navigation lands; a click with a modifier is left to the browser, so opening a page in another tab does not change the one behind it.
- `Pagination.Ellipsis` — The gap where the folded pages would be. It is a button, not punctuation: pressing it jumps `pageJump` pages in the direction of the gap, because a dead target among live ones reads as broken. The two gaps are told apart so the jump follows the row.
- `Pagination.Status` — The line that says how much of the set is on screen: `1–20 of 143` when given `pageSize` and `total`, `3 / 12` when only the page is known, or children of your own while the size is still arriving.
- `Pagination.Summary` — The `3 / 12` in the middle of `compact`, between the two arrows. A screen reader hears "Page 3 of 12"; the slash is for the eye.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `PaginationProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `count` | `number` | **required** | How many pages there are. Pages are numbered from 1, so this is also the last page's number. |
| `page` | `number` | — | The page being shown. Pass it to control the component. |
| `defaultPage` | `number` | `1` | The page to start on when the component keeps its own. Defaults to 1. |
| `onPageChange` | `(page: number) => void` | — | Called with the page that was asked for, already clamped to `count`. |
| `variant` | `PaginationVariant` | `'numbers'` | Which presentation to draw. Default `numbers`. |
| `size` | `PaginationSize` | `'default'` | Its height and text size. Default `default`. |
| `siblings` | `number` | `1` | How many pages to keep either side of the current one. Default 1. |
| `boundaries` | `number` | `1` | How many pages to keep pinned at each end of the run. Default 1. |
| `controls` | `boolean` | `true` | Show the previous and next arrows. Turning them off leaves the numbers alone, for a row that something else moves — a swipe, a scroller reaching its end. |
| `pageJump` | `number` | `5` | How far pressing an ellipsis jumps. Default 5. |
| `getPageHref` | `(page: number) => string` | — | Turns a page number into its address. When set, every numbered target is a real link — one that opens in another tab and works without JavaScript — instead of a button that only moves this component. |
| `disabled` | `boolean` | `false` | Greys out and deafens the whole row, for a page that is still loading. |
| `className` | `string` | — | Extra classes for the row. |

#### `PaginationItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `page` | `number` | **required** | The page this target goes to. |
| `className` | `string` | — | Extra classes for the target. |

#### `PaginationLinkProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `page` | `number` | **required** | The page this link goes to. |
| `href` | `string` | **required** | The address of that page. A real link works without JavaScript and can be opened in another tab. |
| `className` | `string` | — | Extra classes for the target. |

#### `PaginationPreviousProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `boolean` | `false` | Write the word beside the arrow rather than leaving it as a glyph. |
| `className` | `string` | — | Extra classes for the control. |

#### `PaginationNextProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `boolean` | `false` | Write the word beside the arrow rather than leaving it as a glyph. |
| `className` | `string` | — | Extra classes for the control. |

#### `PaginationEllipsisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `direction` | `-1 \| 1` | `1` | Which way the gap runs: `-1` towards page 1, `1` towards the last page. |
| `jump` | `number` | `5` | How many pages a press covers. Default 5. |
| `className` | `string` | — | Extra classes for the control. |

#### `PaginationSummaryProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Extra classes for the line. |

#### `PaginationStatusProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `page` | `number` | — | Which page the span is counted from. Read from the root when left out. |
| `pageSize` | `number` | — | How many rows a page holds. Required, with `total`, for a range. |
| `total` | `number` | — | How many rows there are altogether. |
| `className` | `string` | — | Extra classes for the line. |

## In a Server Component

`Pagination` is a client component. A Server Component cannot read `Pagination.Previous` off the import, so import each part by name: `PaginationPrevious`, `PaginationNext`, `PaginationItem`, `PaginationLink`, `PaginationEllipsis`, `PaginationStatus`, `PaginationSummary`.

## Notes

#### The three variants

`numbers` is the default: the run of pages with folded gaps. `compact` keeps the arrows and puts `3 / 12` between them. `simple` shows labelled Previous and Next and no page numbers.

Which one to use follows from how the reader moves. Jumping to a known place wants numbers; stepping through in order wants words; a footer with no room wants the compact line.

#### Folding

The run is a fixed width rather than a sliding window. `siblings`, default 1, is how many pages stay either side of the current one; `boundaries`, default 1, is how many stay pinned at each end. A gap of exactly one page is drawn as that page, because a gap marker wider than the number it hides is a worse trade than the number.

`pageJump`, default 5, is how far a press on a gap moves. It is clamped to the set, so a gap near the end never asks for a page that does not exist.

#### Sizes

`size="sm"` is 32px per target for a dense table footer; the default is 36px. The row tightens, but the target stays a comfortable square, and the gap between targets shrinks with it.

#### Links

Pass `getPageHref` and every numbered target is drawn as an `<a href>` instead of a button, which is what a pager backed by real URLs wants: the pages can be opened in another tab, shared, and followed without JavaScript. A plain click still moves the component first, so a router or a caller holding the page updates before the navigation lands; a modified click is left to the browser. `Pagination.Link` is the part underneath, and can be used directly in a row you assemble yourself.

#### Keyboard

Every part is a real control, so Tab moves through the row, Shift+Tab moves back, and Enter or Space presses the focused target. A link part also takes Enter and can be opened in another tab from its context menu.

An arrow that is dead at an end stays in the tab order with `aria-disabled`, so a keyboard user hears that the control exists and is unavailable rather than finding the row shorter than it looked. Pressing it does nothing.

#### Accessibility

The root is a `nav` labelled "Pagination" unless `aria-label` says otherwise, and the targets are a list. The current page carries `aria-current="page"`. Every gap has a label such as "Jump forward 5 pages", and the arrows say "Previous page" and "Next page" even when their visible label is a glyph.

When there is more than one pager on a page — one above a table and one below it — give each its own `aria-label` so a screen reader can tell them apart.

#### Motion

The only movement is the colour of a target's background on hover or focus, over 150ms. With reduced motion turned on, even that transition is dropped; nothing slides.

#### Built on

Native `nav`, `ul`, `button` and `a` elements, with no headless library in between. The range arithmetic lives in a sibling `pagination-range.ts` and is exported as `paginationRange`, `paginationSpan` and `clampPage` for a caller that needs the same run for a control of its own.

## Example

```tsx
'use client';

import { Pagination } from '@/components/panelui/pagination';

export default function PaginationOverview() {
  return (
    <Pagination
      count={12}
      defaultPage={3}
      aria-label="Search results"
      className="max-w-md"
    />
  );
}
```
