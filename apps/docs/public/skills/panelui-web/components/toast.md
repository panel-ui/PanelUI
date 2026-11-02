# Toast

A short message that leaves on its own, with a title that changes through dither.

```tsx
import { Toast } from "@/components/panelui/toast"
```

From npm the path is `panelui-web/toast`. Install with `npx shadcn@latest add @panelui/toast`.

## When to use it

Use a toast to confirm something that just happened, or to follow a task that finishes in the background, without interrupting what the reader is doing.

A toast leaves on its own after five seconds, so it cannot hold anything the reader must act on. For a question that needs an answer, use an [Alert Dialog](/docs/web/components/alert-dialog). For a message that should stay on the page, use an [Alert](/docs/web/components/alert).

Toasts are drawn in ordered dither, in one of three versions set by `effect`: the title typed through dither cells (`type`, the default), the card dithered in and then its text (`materialize`), or the title typed with a dithered bar timing it (`timer`).

Put one `Toast.Provider` near the root of the app. `useToast()` raises toasts from anywhere inside it.

## Usage

```tsx
<Toast.Provider position="bottom-right" effect="type">
  <App />
</Toast.Provider>

const toast = useToast();

toast.add({ title: 'Invoice sent', description: 'Harbour Bakery will get it in a minute.', type: 'success' });
```

## Parts

```tsx
<Toast.Provider>
  {/* the app; useToast() inside it */}
</Toast.Provider>
```

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `ToastProviderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `position` | `ToastPosition` | `'bottom-right'` | Which corner or edge of the screen the toasts gather at. Default `bottom-right`. |
| `inline` | `boolean` | `false` | Draws the stack where the provider is, in the flow of the page, instead of pinned to a corner of the screen. For a preview or a thumbnail. |
| `effect` | `ToastEffect` | `'type'` | How the toasts are dithered. `type` writes the title through dither cells. `materialize` dithers the whole card in, then resolves its title and description through dither inside it, and runs the same backwards when it leaves. `timer` writes the title as `type` does and runs a dithered bar down the toast's time. One toast can choose its own with `data: { effect }`. Default `type`. |

## Notes

#### Motion

With `type`, the title arrives through a row of dither cells with a caret at the arriving edge, changes through the same cells, and dissolves into them before the card fades. With reduced motion turned on, every effect holds still: the title changes in place, the card appears without dithering in and the bar does not run.

#### Stacking

Up to `limit` toasts (3 by default) show at once. They stack into one, with the ones behind peeking out. Hovering or focusing the stack spreads it into a list and pauses every timer until the pointer leaves.

#### Accessibility

Toasts are announced by a screen reader as they arrive, without moving focus: politely by default, and at once with `priority: 'high'`. F6 moves focus to the stack. The title is announced as text; the dither is hidden from assistive technology.

#### Outside React

`createToaster()` returns a manager with the same `add`, `update`, `promise` and `close`. Pass it to `Toast.Provider` as `toastManager` and call it from anywhere, such as a data-fetching layer.

## Example

```tsx
'use client';

import { Button } from '@/components/panelui/button';
import { Toast, useToast } from '@/components/panelui/toast';

function Publish() {
  const toast = useToast();
  return (
    <Button
      onClick={() =>
        toast.add({
          title: 'Recipe published',
          description: 'Slow-roast tomato soup is live on your page.',
          type: 'success',
        })
      }
    >
      Publish recipe
    </Button>
  );
}

export default function ToastOverview() {
  return (
    <Toast.Provider>
      <Publish />
    </Toast.Provider>
  );
}
```
