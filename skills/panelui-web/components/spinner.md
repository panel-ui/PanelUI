# Spinner

Something working that has not finished: an arc, spokes, dots, an orbit, a pulse or a dither cell.

```tsx
import { Spinner } from "@/components/panelui/spinner"
```

From npm the path is `panelui-web/spinner`. Install with `npx shadcn@latest add @panelui/spinner`.

## When to use it

Use it where something is working and the wait is short or unknown: a button that is saving, a search that is running, a row that is syncing. When the share done is known, a progress bar says more. When the wait is for an assistant writing, the shimmering status line of [Message](/docs/web/components/message) reads better than a spinner beside the words.

It draws in the colour of the text around it, so a spinner in a muted line is muted and one in a button takes the button's text colour. `size` gives 14, 16 and 24 pixels; a `size-*` class sets any other.

The motion is quick, because a faster spinner makes the same wait feel shorter. With reduced motion asked for it runs at a third of its speed rather than stopping, since a spinner that stands still looks frozen.

## Usage

```tsx
<Spinner />
<Spinner variant="dots" size="lg" label="Writing a reply" />

<Button disabled>
  <Spinner size="sm" label="Exporting" />
  Exporting
</Button>
```

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `SpinnerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `SpinnerVariant` | — | Its look: `ring`, `spokes`, `dots`, `orbit`, `pulse` or `dither`. Default `ring`. |
| `size` | `'sm' \| 'md' \| 'lg'` | `md` | `sm` is 14px, `md` 16px and `lg` 24px. A `size-*` class sets any other. Default `md`. |
| `label` | `string` | — | What a screen reader announces. Default `Loading`. |
| `className` | `string` | — | — |

## Notes

#### Accessibility

It has `role="status"` and announces `label`, which is `Loading` unless you pass another. Name what is happening, such as `Saving` or `Searching`, so a screen reader says more than that something is busy. Where a visible line of text already says it, as in a button, the two can match.

#### Inside a button

[Button](/docs/web/components/button) has its own `loading` prop, which puts a spinner over the label and keeps the button's width. Put a `Spinner` in a button yourself when the label should change while it works, as in "Exporting 3 of 12".

## Example

```tsx
import { Spinner } from '@/components/panelui/spinner';

export default function SpinnerOverview() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-10 text-foreground">
      <Spinner variant="ring" size="lg" />
      <Spinner variant="spokes" size="lg" />
      <Spinner variant="dots" size="lg" />
      <Spinner variant="orbit" size="lg" />
      <Spinner variant="pulse" size="lg" />
      <Spinner variant="dither" size="lg" />
    </div>
  );
}
```
