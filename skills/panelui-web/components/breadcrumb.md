# Breadcrumb

The trail of links back up a hierarchy to the page you are on, with the middle folded away when the path runs long.

```tsx
import { Breadcrumb } from "@/components/panelui/breadcrumb"
```

From npm the path is `panelui-web/breadcrumb`. Install with `npx shadcn@latest add @panelui/breadcrumb`.

## When to use it

Use it to show where a page sits in a hierarchy, and to give the reader a way back up it: the project a file belongs to, the section a setting lives in, the steps that led to a record. The trail ends at the page that is open, which is a label rather than a link — you cannot navigate to where you already are.

A breadcrumb describes a hierarchy, not a history. When the reader arrived through screens that are not nested, a back link is the honest control. When the trail would be the only way between a set of peers, use tabs or a sidebar instead.

It earns its place on pages reached through several levels, where the title alone does not say where you are. A top-level page has nothing above it to name, so it usually goes without one.

## Usage

```tsx
<Breadcrumb>
  <Breadcrumb.List>
    <Breadcrumb.Item>
      <Breadcrumb.Link href="/">Home</Breadcrumb.Link>
    </Breadcrumb.Item>
    <Breadcrumb.Item>
      <Breadcrumb.Link href="/projects">Projects</Breadcrumb.Link>
    </Breadcrumb.Item>
    <Breadcrumb.Item>
      <Breadcrumb.Page>Autumn catalogue</Breadcrumb.Page>
    </Breadcrumb.Item>
  </Breadcrumb.List>
</Breadcrumb>
```

## Parts

```tsx
<Breadcrumb>
  <Breadcrumb.List>
    <Breadcrumb.Item>
      <Breadcrumb.Link href="/">…</Breadcrumb.Link>
    </Breadcrumb.Item>
    <Breadcrumb.Item>
      <Breadcrumb.Page>…</Breadcrumb.Page>
    </Breadcrumb.Item>
  </Breadcrumb.List>
</Breadcrumb>
```

- `Breadcrumb.List` — The crumb row. It owns the separators — one between every pair of crumbs, none at the ends — and the folding, so you only ever list items.
- `Breadcrumb.Item` — One crumb, as a list item. Wrap a `Link` or the `Page` in it; a trail is a list of these.
- `Breadcrumb.Link` — A navigable crumb: an ancestor to go back to. It renders an `<a>`, so `href` and the rest work as they do anywhere, and `render` swaps in your router's own link. A string label truncates to the space available and carries the full text as a `title`.
- `Breadcrumb.Page` — The trailing crumb, where you are now. Not a link — it carries `aria-current="page"` and the full foreground, so the trail resolves to it.
- `Breadcrumb.Separator` — The glyph between crumbs, hidden from screen readers. `List` inserts it for you and owns the gaps; a `Breadcrumb.Separator` passed directly to `List` is ignored, so change the glyph with the root's `separator` prop instead.
- `Breadcrumb.Ellipsis` — Stands in for the crumbs a folded trail hides. Static by default; give the root an `onEllipsisClick` and it becomes a button for a menu of the hidden steps. Pass `ellipsisOpen` so it reports `aria-expanded`, and `ellipsisLabel` to change its name from the default "Show hidden items". A separately rendered `Breadcrumb.Ellipsis` takes those as its own `label` and `onClick`.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `BreadcrumbProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Extra classes for the landmark. |
| `size` | `BreadcrumbSize` | `'default'` | Text density for every crumb. `sm` suits a header bar. Default `default`. |
| `separator` | `ReactNode` | — | The glyph `Breadcrumb.List` places between crumbs. Defaults to a chevron; pass `'/'`, a dot, or any node to change every gap at once. |
| `maxItems` | `number` | — | Collapse the trail once it holds more than this many crumbs. The first `itemsBeforeCollapse` and last `itemsAfterCollapse` crumbs survive; the middle folds into a single ellipsis. Nothing folds when hiding the middle would not shorten the row. |
| `itemsBeforeCollapse` | `number` | `1` | How many leading crumbs survive a collapse, at least one. Default 1. |
| `itemsAfterCollapse` | `number` | `1` | How many trailing crumbs survive a collapse, at least one. Default 1. |
| `onEllipsisClick` | `MouseEventHandler<HTMLElement>` | — | Makes the collapsed ellipsis pressable — the handle for a menu listing the hidden steps. Without it the ellipsis is a static marker. |
| `ellipsisOpen` | `boolean` | — | Whether the menu the pressable ellipsis opens is showing. Sets `aria-expanded` on that button, so a screen reader knows the menu is open. |
| `ellipsisLabel` | `string` | — | What the collapsed ellipsis is called when pressable. Default "Show hidden items"; set it to localize the button the list creates for you. |

#### `BreadcrumbListProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Extra classes for the crumb row. |

#### `BreadcrumbItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Extra classes for the crumb's list item. |

#### `BreadcrumbLinkProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Extra classes for the anchor. |

#### `BreadcrumbPageProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Extra classes for the label. |

#### `BreadcrumbSeparatorProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Extra classes for the gap. |

#### `BreadcrumbEllipsisProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | Extra classes for the marker or button. |
| `onClick` | `MouseEventHandler<HTMLElement>` | — | Called when the ellipsis is pressed. Without it the ellipsis is a static marker; with it, it is a real button for a menu of the hidden steps. |
| `label` | `string` | — | Its accessible name. Default `More` when static, `Show hidden items` when pressable. |

## In a Server Component

`Breadcrumb` is a client component. A Server Component cannot read `Breadcrumb.List` off the import, so import each part by name: `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`, `BreadcrumbEllipsis`.

## Notes

#### Accessibility

The root is a `<nav>` with `aria-label="Breadcrumb"`. When a page carries more than one trail — one in the page and one in a dialog — give each its own `aria-label` naming the hierarchy it describes, so the landmarks are told apart. `Breadcrumb.Page` carries `aria-current="page"` and is not a link, and the separators are `aria-hidden`, so a screen reader hears the crumbs rather than a run of chevrons. A static ellipsis is announced as "More"; a pressable one is a button named "Show hidden items" unless you pass `label`. When that button opens a menu, pass the menu's state as `ellipsisOpen` on the root so the button reports `aria-expanded`.

#### Collapsing

`maxItems` is a threshold, not a hard ceiling. Once the trail holds more than that, the first `itemsBeforeCollapse` and last `itemsAfterCollapse` crumbs survive (both default to 1) and the middle becomes one ellipsis. A fold that would hide only a single crumb does not happen, because the same number of slots with the crumb kept is more useful; for the same reason a very small `maxItems` still leaves a first and a last. Without `onEllipsisClick` the ellipsis is a marker, never a button that does nothing.

#### One line, and long labels

The row does not wrap. `Breadcrumb.Link` and `Breadcrumb.Page` truncate a string label to the width available, and set the full text as the element's `title`; pass your own `title` when the label is not a string. The separators and the ellipsis keep their width, and the labels share what is left, so the trail stays readable as the space narrows rather than folding every crumb to nothing.

#### Built on

The parts are drawn with Base UI's `useRender` and `mergeProps`, so `render` can swap the link for a router's own component without losing its props. There is no state and no dependency beyond the package's existing Base UI, Tailwind Variants and shadcn tokens; `Breadcrumb.List` reads the separator and folding rules from the root through context. The underline and the ellipsis background are a short colour transition, and both are still when `prefers-reduced-motion` is on.

## Example

```tsx
'use client';

import { Breadcrumb } from '@/components/panelui/breadcrumb';

export default function BreadcrumbOverview() {
  return (
    <Breadcrumb>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/">Home</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/projects">Projects</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Breadcrumb.Page>Autumn catalogue</Breadcrumb.Page>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb>
  );
}
```
