# Button

Something to press, in the weight its action deserves, with a spinner for while it works.

```tsx
import { Button } from "@/components/panelui/button"
```

From npm the path is `panelui-web/button`. Install with `npx shadcn@latest add @panelui/button`.

## When to use it

Use it for an action: saving, sending, opening something. For moving to another page, use a link.

The variant says how much the action asks to be pressed. `default` is the one action a view is for, `secondary` and `outline` are the ones beside it, `ghost` is for actions in a toolbar or a row that should not draw the eye, and `destructive` is for one that cannot be undone.

A view usually has one `default` button. Two of them leave the reader to work out which one matters.

## Usage

```tsx
<Button>Publish</Button>
<Button variant="outline">Preview</Button>
<Button variant="ghost" size="icon" aria-label="Close">
  <XIcon />
</Button>
```

## Parts

```tsx
<Button />
```

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `ButtonProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `ButtonVariant` | `default` | How much the button asks to be pressed. Default `default`. |
| `size` | `ButtonSize` | `md` | Its height and padding. The `icon` sizes are square, for a button that holds only an icon. Default `md`. |
| `shape` | `'default' \| 'pill'` | `default` | `pill` rounds the ends fully. Default `default`. |
| `loading` | `boolean` | `false` | Shows a spinner over the label, sets `aria-busy` and stops presses, keeping the width. |
| `render` | `BaseButton.Props['render']` | — | An element to draw the button as, such as `<a href="/" />` or a router's link, or a function of the props and state that returns one. It takes the button's classes, children, ref and event handlers. A link stays a link: it is not given `type`, and Space does not press it. |
| `nativeButton` | `boolean` | — | Whether `render` draws a native `<button>`. Set automatically for an element; pass it when `render` is a function that returns something else. |

## Notes

#### Icons

Put an icon before or after the text as a child. It is sized to 16 pixels unless it carries a `size-*` class of its own, and the gap between it and the text is set by the button.

#### Type

The button is `type="button"` unless you say otherwise, so one inside a form does not send the form by accident. Set `type="submit"` on the one that should.

#### Loading

While `loading` is true the button is disabled and has `aria-busy`, so a screen reader announces it as busy and a second press is not possible. Clear it when the work is done, whether it worked or not.

#### Server Components

It holds no state, so a Server Component can render it. Its `onClick` needs a client component, as any event handler does.

## Example

```tsx
import { Button } from '@/components/panelui/button';

export default function ButtonVariants() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Button>Publish</Button>
      <Button variant="secondary">Save draft</Button>
      <Button variant="outline">Preview</Button>
      <Button variant="ghost">Cancel</Button>
      <Button variant="destructive">Delete</Button>
      <Button variant="link">Learn more</Button>
    </div>
  );
}
```
