# Scroll Header

A page title with room around it that hands over to a compact sticky bar as the reader scrolls.

```tsx
import { ScrollHeader } from "@/components/panelui/scroll-header"
```

From npm the path is `panelui-web/scroll-header`. Install with `npx shadcn@latest add @panelui/scroll-header`.

## When to use it

Use it for the top of a page that a reader scrolls: an article, a changelog, a settings surface with a long body. The title starts large with room around it and, once the reader is in the content, hands over to a compact bar that stays pinned to the top.

The two states are one component because the interesting part is the transit between them. The band shrinks, the large block is carried up behind the bar, the bar's surface closes, and the two titles cross-fade in that order — so no title is ever read over another and the article underneath never jumps.

It is not a replacement for the site's navigation. The bar holds the page's own title and the actions that belong to it; the links that go elsewhere stay where they are.

## Usage

```tsx
<ScrollHeader>
  <ScrollHeader.Cover />
  <ScrollHeader.Bar>
    <ScrollHeader.Title>Field notes</ScrollHeader.Title>
    <ScrollHeader.Actions>
      <Button variant="ghost" size="icon" aria-label="Share">
        <ShareIcon />
      </Button>
    </ScrollHeader.Actions>
  </ScrollHeader.Bar>
  <ScrollHeader.Large>
    <ScrollHeader.Description>Issue 12 · November</ScrollHeader.Description>
    <ScrollHeader.Title>Field notes from the coast</ScrollHeader.Title>
  </ScrollHeader.Large>
  <article>{body}</article>
</ScrollHeader>
```

## Parts

```tsx
<ScrollHeader>
  <ScrollHeader.Cover />
  <ScrollHeader.Bar>
    <ScrollHeader.Title />
    <ScrollHeader.Actions />
  </ScrollHeader.Bar>
  <ScrollHeader.Large>
    <ScrollHeader.Description />
    <ScrollHeader.Title />
    <ScrollHeader.Actions />
  </ScrollHeader.Large>
  {content}
</ScrollHeader>
```

- `ScrollHeader.Bar` — The pinned row. Its contents never move; its surface — background, blur and hairline — fades in as the large block leaves. `surface` is `blur`, `plain` or `none`, and `divider` draws the hairline, or leaves it transparent. Write it once, with the compact title and the controls that should stay reachable.
- `ScrollHeader.Large` — The expanded block. Its measured height is the distance the header collapses over, so whatever is in it — a title, a byline, a row of chips — sets the scroll distance rather than a prop having to agree with it. It is anchored to the band's bottom, which is what carries it up behind the bar.
- `ScrollHeader.Title` — The page's title. Write it in both `Bar` and `Large`: the one in the block is large and at rest, the one in the bar is compact and truncates to a line. Only the one being shown is exposed to assistive technology. It is a `span` with a heading role; `render={<h1 />}` gives the page a real heading element where one is wanted.
- `ScrollHeader.Description` — The quiet line under the title — a count, a byline, a date. It fades with the large block it sits in.
- `ScrollHeader.Actions` — The controls at the trailing end. In the bar they stay put and stay reachable through the whole transition; only the bar's surface and title are part of the fade. In the large block they leave with the rest of it, which is the place for a save or a share that belongs to the article rather than the page.
- `ScrollHeader.Cover` — A picture or a gradient filling the band behind the large block. With no `src` it uses the theme's chart tokens, so an app that puts its charts on brand puts this on brand with them. `scrim` lays a background-coloured wash under the title so it stays legible on a bright picture; turn it off when the cover is already dark.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `ScrollHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `barHeight` | `number` | `56` | Height of the pinned bar in pixels. The large block and the article are laid out around it, so changing it moves the resting state rather than cropping the bar. Default `56`. |
| `threshold` | `number` | `1` | How much of the large block has to leave before the bar has fully taken over, as a fraction of its height. Below 1 the crossing happens early, which suits a tall block whose last few pixels are not worth waiting for. Default `1`. |
| `snap` | `boolean` | `false` | Settle a part-scrolled band open or closed once the scroller comes to rest, rather than leaving the header half-collapsed. It moves the page, so it is off by default; turn it on for a header that owns the scroll. Default `false`. |
| `stretch` | `boolean` | `true` | Let the band grow past its resting height when the scroller is pulled down. A cover fills the band, so this is what stretches it. Only a platform that reports a negative scroll offset can do it — Safari and other rubber-banding scrollers — and it is off under reduced motion. Default `true`. |
| `scrollRef` | `ScrollHeaderScrollSource` | — | The element to read scroll from: the window by default, or an element or a ref to one for a page with its own scroller. The header must be the first thing in that scroller, so offset zero is its resting position. |
| `onCollapsedChange` | `(collapsed: boolean) => void` | — | Called as the bar takes over, and again when the large block comes back. Fires on the crossing, not on every frame, and not for a page that merely loaded scrolled. |

#### `ScrollHeaderBarProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `surface` | `ScrollHeaderSurface` | `'blur'` | What the bar is drawn on once it has taken over. `blur` frosts it, so the content passing under the bar stays legible as shape and colour. `plain` is the background token, and `none` leaves it clear for a bar over a cover that should stay visible. Default `blur`. |
| `divider` | `boolean` | `true` | A hairline under the bar, drawn with its surface. Default `true`. |

#### `ScrollHeaderCoverProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `src` | `string` | — | A picture behind the header, laid out to fill the band rather than cropped by the document. |
| `alt` | `string` | `''` | Alt text for `src`. Empty by default: the cover is decoration behind the title. |
| `scrim` | `boolean` | `true` | A wash over the cover, so the title stays legible on a bright picture. Default `true`. |

## In a Server Component

`ScrollHeader` is a client component. A Server Component cannot read `ScrollHeader.Bar` off the import, so import each part by name: `ScrollHeaderBar`, `ScrollHeaderLarge`, `ScrollHeaderTitle`, `ScrollHeaderDescription`, `ScrollHeaderActions`, `ScrollHeaderCover`.

## Notes

#### The scroll source

The window by default. A page with its own scroller passes `scrollRef` an element or a ref to one, and the header listens there instead. The header has to be the first thing in that scroller: the offset it reads is measured from zero, and a header that starts below something else would be measured against the wrong origin.

The listener is passive and the read is batched into one `requestAnimationFrame`. Per-frame values are written as CSS custom properties on the header's root (`--scroll-header-fade`, `--scroll-header-band`, `--scroll-header-shift`); React is re-rendered only when the progress reaches an end. The server renders the expanded state, and the first client frame measures the content that is already laid out, so a page that loads at the top does not jump.

#### The two titles

The large title and the bar title are both in the tree, and only one of them is exposed to a screen reader at a time. The crossing point is published as `collapsed`, and `onCollapsedChange` fires there — once per crossing, not on every frame, and not for a page that merely loaded scrolled.

The fades are ordered: the large block is gone before the bar's surface has finished closing, and the bar's title arrives only after that. A single crossfade would put both titles on the same pixels at the same time, and the block would be seen through a half-transparent bar.

#### No jump underneath

The band shrinks, but the sticky box around it keeps the height the expanded header had. The article therefore starts where it always started and simply scrolls, while the visible band above it gets shorter. The article's first line stays flush with the band's bottom edge until the block has gone, and then slides under the bar.

#### Accessibility

`ScrollHeader.Title` is a `span` with `role="heading"` and `aria-level={1}`, so the same part works in both halves. Render it as `render={<h1 />}` for a page that wants a real heading element; the bar's copy is hidden from assistive technology while the large one is showing, so the page still has one heading.

When the bar has taken over, the large block is `inert` as well as clipped, so its links and buttons leave the tab order with it. The bar's actions never leave the tab order. Give icon-only buttons an `aria-label`, as in the examples.

#### Reduced motion

With reduced motion on, the bar still condenses as the reader scrolls; it is the fades that stop travelling. They change once at the crossing and spend a short transition there. The over-scroll stretch is off, and a `snap` settles instantly rather than smoothly.

#### Setting the distance

`barHeight` is the pinned bar's height in pixels and defaults to `56`. `threshold` is how much of the large block has to leave before the bar has fully taken over, as a fraction of its height; below `1` the crossing happens early, which suits a tall block. `snap` settles a part-scrolled band open or closed once the scroller comes to rest — it moves the page, so it is off by default. `stretch` lets the band grow when a rubber-banding scroller is pulled down; platforms that clamp the scroll at zero report nothing and get no stretch.

A global navigation bar above the page can be cleared by setting `--scroll-header-top` on the header's root, which the sticky box reads as its `top`.

#### Built on

The header is React and Tailwind theme tokens, with `tailwind-variants` for the slots and Base UI's `useRender` and `mergeProps` for the `render` prop on its parts. It adds no dependency of its own and uses no third-party scroll or sticky library: the sticky positioning, the clipping and the animation are the browser's.

## Example

```tsx
'use client';

import { BookmarkIcon, MoreHorizontalIcon, Share2Icon } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/panelui/button';
import { ScrollHeader } from '@/components/panelui/scroll-header';

const PARAGRAPHS = [
  'The press has been in the same building since 1974: two floors, a stone stair, and a loading door on the lane that is exactly wide enough for a pallet of paper. Nothing about it was chosen for efficiency. It was chosen because it was there, and because the rent was low enough that a bad year would not close it.',
  'That is the whole model, in a sentence. A small publisher does not compete on speed or scale. It competes by being able to wait — for a book to find its reader, for a printing decision to become obvious, for a title to earn back its advance over four years instead of four months.',
  'The autumn list has eleven titles. Six are reprints, which means the typesetting is already done and the only question is how many to print. The other five are new, and each one arrives with a different kind of risk: a first novel with a good agent, a translation that took three years to license, a cookbook that needs colour on every spread, a memoir with a difficult author, and a book of essays that nobody expects to sell and everybody wants to publish.',
  'The print run for the novel is four thousand. That is not a guess. It is the number the sales team can place in independent shops before publication, plus the number the wholesalers will take on a sale-or-return basis, minus the number that usually come back. The arithmetic is unglamorous and it is the whole job.',
  'What the reader sees is a cover, a page, a sentence. What makes the sentence arrive is a schedule that has been revised six times, a paper stock that was tested against the cover proof, and a printer who answers the phone on a Tuesday afternoon in November.',
  'The building is quiet in the morning. By ten the desk has three parcels on it and the kettle is on, and somebody is asking whether the index for the essays has come back from the author. It has not. It will, eventually. The book will be late by a week, and the week will not matter.',
];

export default function ScrollHeaderOverview() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scroller}
      className="h-[460px] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-background text-sm"
    >
      <ScrollHeader scrollRef={scroller}>
        <ScrollHeader.Cover />
        <ScrollHeader.Bar>
          <ScrollHeader.Title>Field notes</ScrollHeader.Title>
          <ScrollHeader.Actions>
            <Button variant="ghost" size="icon" aria-label="Share this issue">
              <Share2Icon />
            </Button>
            <Button variant="ghost" size="icon" aria-label="More actions">
              <MoreHorizontalIcon />
            </Button>
          </ScrollHeader.Actions>
        </ScrollHeader.Bar>
        <ScrollHeader.Large>
          <ScrollHeader.Description>Issue 12 · November</ScrollHeader.Description>
          <ScrollHeader.Title>Field notes from the coast</ScrollHeader.Title>
          <ScrollHeader.Actions>
            <Button variant="secondary" size="sm">
              <BookmarkIcon />
              Save
            </Button>
          </ScrollHeader.Actions>
        </ScrollHeader.Large>

        <article className="px-6 py-6">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            The press
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            Eleven titles and a loading door
          </h2>
          <div className="mt-4 flex flex-col gap-4 leading-7 text-muted-foreground">
            {PARAGRAPHS.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </article>
      </ScrollHeader>
    </div>
  );
}
```
