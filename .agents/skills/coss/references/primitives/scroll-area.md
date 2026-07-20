# coss Scroll Area

## When to use

- Constrained-height scroll containers with styled viewport.
- Scrollable lists/logs/panels embedded in fixed layouts.

## Install

```bash
npx shadcn@latest add @coss/scroll-area
```

Manual deps from docs:

```bash
npm install @base-ui/react
```

## Canonical imports

```tsx
import { ScrollArea } from "@/components/ui/scroll-area"
```

## Minimal pattern

```tsx
<ScrollArea className="h-64 rounded-md border">
  <div className="p-4">
    Just as suddenly as it had begun, the sensation stopped, leaving Alice
    feeling slightly disoriented. She looked around and realized that the room
    hadn't changed at all - it was she who had grown smaller, shrinking down to
    a fraction of her previous size. Alice felt herself growing larger and
    larger, filling up the entire room until she feared she might burst. The
    sensation was both thrilling and terrifying, as if she were expanding beyond
    the confines of her own body. She wondered if this was what it felt like to
    be a balloon, swelling with air until it could hold no more.
  </div>
</ScrollArea>
```

## Patterns from coss particles

### Key patterns

Horizontal scrolling (use wide inner content, not an `orientation` prop):

```tsx
<ScrollArea className="max-w-96 rounded-lg border">
  <div className="flex w-max gap-4 p-4">
    {items.map((item) => (
      <div key={item} className="w-32 shrink-0">{item}</div>
    ))}
  </div>
</ScrollArea>
```

Scroll fade edges:

```tsx
<ScrollArea className="h-64" scrollFade>
  <div className="p-4">{/* Long content */}</div>
</ScrollArea>
```

Fill viewport for flex layouts (e.g. sidebar footers with `mt-auto`):

```tsx
<ScrollArea className="flex-1 min-h-0" fill>
  <div className="flex h-full flex-col">
    <nav>{/* main items */}</nav>
    <footer className="mt-auto">{/* pinned footer */}</footer>
  </div>
</ScrollArea>
```

`fill` defaults to `false`. Use it only when the content wrapper must stretch to the viewport height—not for lists, comboboxes, or other content-sized scroll areas.

`ScrollArea` always renders both scrollbars internally -- horizontal scroll is driven by inner content width exceeding the container, not by a prop. Also supports `scrollbarGutter` for reserving scrollbar space.

`clampContentMinWidth` defaults to `true` and sets `minWidth: 0` on the content wrapper to avoid spurious horizontal scroll in vertical layouts (Base UI uses `min-width: fit-content`). Wide children (`w-max`, table min-width) still scroll horizontally. Set `clampContentMinWidth={false}` only if horizontal scroll breaks and the child has no explicit width.

### More examples

See `p-scroll-area-1` through `p-scroll-area-5` for vertical, horizontal, both axes, fade, and gutter patterns.

## Common pitfalls

- Forgetting explicit height/constraint, resulting in non-scrollable container.
- Nesting multiple scroll areas that compete for wheel/touch events.
- Using scroll area where native page scrolling is simpler and clearer.
- Using `fill` on every scroll area—default is `false`; opt in only for flex layouts that need full viewport height (e.g. `mt-auto` footers). Pair with `flex-1 min-h-0` on the root and `h-full flex-col` on the inner wrapper.
- Disabling `clampContentMinWidth` unless horizontal scroll actually regresses—default `true` fixes spurious horizontal bars in vertical-first layouts.

## Useful particle references

- scroll fade: `p-scroll-area-4`
- horizontal scroll: `p-scroll-area-2`
- scrollbar gutter: `p-scroll-area-5`
- both scrollbars: `p-scroll-area-3`
