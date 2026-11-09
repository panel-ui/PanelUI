# Dialog

A task done in a panel over the page, with its buttons in the band beneath it.

```tsx
import { Dialog } from "@/components/panelui/dialog"
```

From npm the path is `panelui-web/dialog`. Install with `npx shadcn@latest add @panelui/dialog`.

## When to use it

Use it for a short task that is done away from the page and then put away: renaming something, inviting people, filling in a few fields.

The task sits in a panel, and `Dialog.Footer` moves out of the panel into the darker band underneath, where its buttons are equal pills. `variant="plain"` is a single surface with the footer ruled off at its foot, for a dense form. A press outside, Escape or the close button in the corner dismiss it.

The dialog is never taller than the screen: the header and footer stay put and `Dialog.Body` scrolls between them. On a screen under 640px wide it rests at the bottom, where a thumb reaches its buttons.

For a yes-or-no question, use [Alert Dialog](/docs/web/components/alert-dialog). For a longer task that keeps the page in view, use [Sheet](/docs/web/components/sheet).

## Usage

```tsx
<Dialog>
  <Dialog.Trigger render={<Button />}>Rename board</Dialog.Trigger>
  <Dialog.Content size="sm">
    <Dialog.Header title="Rename board" description="Everyone on the board sees the new name." />
    <Dialog.Body>
      <Input defaultValue="Spring launch" aria-label="Name" />
    </Dialog.Body>
    <Dialog.Footer>
      <Dialog.Close render={<Button variant="secondary" />}>Cancel</Dialog.Close>
      <Button>Save</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog>
```

## Parts

```tsx
<Dialog>
  <Dialog.Trigger />
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title />
      <Dialog.Description />
    </Dialog.Header>
    <Dialog.Body>
      <Dialog.List>
        <Dialog.ListGroup>
          <Dialog.ListItem />
        </Dialog.ListGroup>
      </Dialog.List>
    </Dialog.Body>
    <Dialog.Footer>
      <Dialog.Close />
    </Dialog.Footer>
  </Dialog.Content>
</Dialog>
```

- `Dialog.Trigger` — What opens the dialog. Pass your own button as `render`.
- `Dialog.Content` — The dialog, over a dimmed page. `variant` is `inset` (a panel in a band) or `plain` (one surface), `size` is `sm`, `md` or `lg`, `showClose` draws the round close button, and `blur` frosts the page behind it.
- `Dialog.Header` — The title and the line under it, given as `title` and `description` or as parts. It leaves room for the close button. Anything else in it, such as a search field, stays put while the body scrolls.
- `Dialog.Title` — The dialog's name. It is announced when the dialog opens.
- `Dialog.Description` — A sentence under the title, read out after it.
- `Dialog.Body` — The part that scrolls, with a thin drawn thumb. Its children are laid out in a column with a gap, so the fields of a form need no wrapper. A hairline appears under the header once its content has scrolled.
- `Dialog.List` — A list of one-line choices, such as time zones or the projects to move something to. The arrow keys, Home and End move between its items, and it opens scrolled to the selected one.
- `Dialog.ListGroup` — A run of items under a `label`, which stays pinned at the top while its items scroll under it.
- `Dialog.ListItem` — One choice. `selected` tints and checks it, `onSelect` is called when it is pressed or chosen with Enter, and `meta` puts quieter text at its end in figures that line up.
- `Dialog.Footer` — The buttons. In the inset look they sit in the band as equal pills; in `plain` they sit at the end of a ruled strip. Keep it a direct child of `Dialog.Content`.
- `Dialog.Close` — Closes the dialog. Pass your own button as `render`, such as Cancel.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `DialogProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `open` | `boolean` | — | Whether it is open, when the caller holds that. |
| `defaultOpen` | `boolean` | — | Whether it starts open, when the caller does not hold it. |
| `onOpenChange` | `(open: boolean) => void` | — | Called when it opens or closes. |
| `onOpenChangeComplete` | `(open: boolean) => void` | — | Called once it has finished opening or closing, after its transition has ended. `false` means the exit is over, so a dialog mounted from state can be unmounted. |
| `dismissible` | `boolean` | `true` | Whether a press outside it closes it. Turn it off while a form in it has changes that would be lost; Escape and the close button still work. Default `true`. |

#### `DialogTriggerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `render` | `ReactElement` | — | Your own element to be the trigger, such as a styled button. It is given the click handler and the attributes that tie it to the dialog. |

#### `DialogContentProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `'inset' \| 'plain'` | `'inset'` | `inset` sets the task in a panel inside a darker band that holds the footer. `plain` is one surface with the footer ruled off. Default `inset`. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | How wide it may grow: `sm` 24rem, `md` 28rem, `lg` 36rem. Default `md`. |
| `showClose` | `boolean` | `true` | Show the round close button in the top trailing corner. Default `true`. |
| `blur` | `boolean` | `false` | Frost the page behind it instead of only dimming it. |
| `inline` | `boolean` | `false` | Draw it in the page instead of over it: no backdrop, no trigger, always there. For previews; `open` is ignored. |

#### `DialogHeaderProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | The heading. It is also what the dialog is announced as. |
| `description` | `ReactNode` | — | A line under the heading. |

#### `DialogFooterProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |

#### `DialogCloseProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `render` | `ReactElement` | — | Your own element to close the dialog with, such as a Cancel button. |
| `icon` | `boolean` | — | Draw the cross glyph. Set for you on the built-in close button. |

#### `DialogListProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |
| `ref` | `list,` | **required** | — |
| `role` | `'listbox',` | **required** | — |
| `className` | `dialogVariants().list({ className }),` | **required** | — |
| `onKeyDown` | `move,` | **required** | — |

#### `DialogListGroupProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `ReactNode` | **required** | The heading over the group, which stays pinned while its items scroll under it. |

#### `DialogListItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `selected` | `boolean` | `false` | Whether it is the chosen one: it is tinted and checked. |
| `onSelect` | `() => void` | — | Called when it is pressed, or chosen with Enter or Space. |
| `meta` | `ReactNode` | — | Quieter text at its end, in figures that line up: a time, a count. |
| `disabled` | `boolean` | `false` | Shown, but cannot be chosen. |

## In a Server Component

`Dialog` is a client component. A Server Component cannot read `Dialog.Trigger` off the import, so import each part by name: `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogBody`, `DialogFooter`, `DialogClose`, `DialogList`, `DialogListGroup`, `DialogListItem`.

## Notes

#### Closing

A press outside, Escape and the close button close it, and so does any `Dialog.Close`. `dismissible={false}` stops a press outside from closing it, for a form whose changes would be lost; Escape still works. Hold `open` yourself with `onOpenChange` to close it from code, for example once a form has saved.

#### Focus

When it opens, focus goes to the first field in it. The close button is drawn in the corner but comes last in the order, so the way out is not the first thing focused. Focus returns to the trigger when it closes.

#### Forms

Put the `<form>` in `Dialog.Body` with an `id`, and give the submit button in the footer `type="submit"` and `form` set to that `id`. Enter in a field then submits it, and the footer can stay a direct child of the content.

#### On a phone

Under 640px wide the dialog sits at the bottom of the screen, 8px clear of the edges, and can be as tall as the screen less that gap.

## Example

```tsx
'use client';

import { Button } from '@/components/panelui/button';
import { Dialog } from '@/components/panelui/dialog';
import { Input } from '@/components/panelui/input';
import { Label } from '@/components/panelui/label';
import { useState } from 'react';

export default function DialogOverview() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('Spring launch');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Dialog.Trigger render={<Button variant="outline" />}>Rename board</Dialog.Trigger>
      <Dialog.Content size="sm">
        <Dialog.Header title="Rename board" description="Everyone on the board will see it." />
        <Dialog.Body>
          <form
            id="rename-board"
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const next = new FormData(event.currentTarget).get('name');
              if (typeof next === 'string' && next.trim()) setName(next.trim());
              setOpen(false);
            }}
          >
            <Label htmlFor="board-name">
              <Label.Text>Name</Label.Text>
            </Label>
            <Input id="board-name" name="name" defaultValue={name} autoComplete="off" />
          </form>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.Close render={<Button variant="secondary" />}>Cancel</Dialog.Close>
          <Button type="submit" form="rename-board">
            Save
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}
```
