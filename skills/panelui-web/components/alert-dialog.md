# Alert Dialog

A question that must be answered before the page can be used again, with the answers side by side under it.

```tsx
import { AlertDialog } from "@/components/panelui/alert-dialog"
```

From npm the path is `panelui-web/alert-dialog`. Install with `npx shadcn@latest add @panelui/alert-dialog`.

## When to use it

Use it to ask a question that has to be answered before anything else on the page: deleting a project, discarding changes, signing out of every device.

A press outside it, Escape and `AlertDialog.Cancel` all close it without doing anything, and `AlertDialog.Action` closes it once it has done its work. The question sits in a panel, and `AlertDialog.Footer` moves out of the panel into the darker band under it, where the answers sit side by side at equal widths.

For a task rather than a yes or no, such as a form to fill in, use [Dialog](/docs/web/components/dialog), or [Sheet](/docs/web/components/sheet) for a longer one. For a message that can wait on the page, use [Alert](/docs/web/components/alert).

## Usage

```tsx
<AlertDialog>
  <AlertDialog.Trigger render={<Button variant="destructive" />}>Delete project</AlertDialog.Trigger>
  <AlertDialog.Content tone="destructive">
    <AlertDialog.Title>Delete Orchard?</AlertDialog.Title>
    <AlertDialog.Description>Its 14 boards go with it.</AlertDialog.Description>
    <AlertDialog.Footer>
      <AlertDialog.Cancel />
      <AlertDialog.Action onClick={remove}>Delete project</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog>
```

## Parts

```tsx
<AlertDialog>
  <AlertDialog.Trigger />
  <AlertDialog.Content>
    <AlertDialog.Media />
    <AlertDialog.Title />
    <AlertDialog.Description />
    <AlertDialog.Footer>
      <AlertDialog.Cancel />
      <AlertDialog.Action />
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog>
```

- `AlertDialog.Trigger` — What opens the dialog. Pass your own button as `render`.
- `AlertDialog.Content` — The dialog: a panel in a darker band, over a dimmed page. `tone` colours the media and sets the action's default colour, `size="sm"` centres a shorter question, and `blur` frosts the page behind it. Anything other than the footer, such as a field, goes in the panel.
- `AlertDialog.Media` — A glyph in a disc of the dialog's tone, above the title.
- `AlertDialog.Title` — The question. The dialog is announced by it.
- `AlertDialog.Description` — What follows from each answer, read out after the title.
- `AlertDialog.Footer` — The answers, side by side at equal widths in the band under the panel. Keep it a direct child of `AlertDialog.Content`.
- `AlertDialog.Cancel` — Closes the dialog and does nothing else. It reads "Cancel" unless given children.
- `AlertDialog.Action` — Does what the dialog asks about, then closes it. It takes a [Button](/docs/web/components/button)'s props, a `tone`, and `variant="soft"` for an answer that is not the main one. When `onClick` returns a promise, it waits for it. `hold` makes it an action that must be pressed and held.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `AlertDialogProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `open` | `boolean` | — | Whether it is open, when the caller holds that. |
| `defaultOpen` | `boolean` | `false` | Whether it starts open, when the caller does not hold it. |
| `onOpenChange` | `(open: boolean) => void` | — | Called when it opens or closes. |
| `onOpenChangeComplete` | `(open: boolean) => void` | — | Called once it has finished opening or closing, after its transition has ended. `false` means the exit is over, so a dialog mounted from state can be unmounted. |
| `dismissible` | `boolean` | `true` | Whether a press outside it closes it, as Cancel would. Escape always does. Default `true`. |

#### `AlertDialogTriggerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `render` | `ReactElement` | — | Your own element to be the trigger, such as a styled button. It is given the click handler and the attributes that tie it to the dialog. |

#### `AlertDialogContentProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `tone` | `AlertDialogTone` | `'neutral'` | The theme role it is drawn in: the colour of `AlertDialog.Media`, and of an action that is not given its own. `destructive` makes the action red. Default `neutral`. |
| `size` | `'default' \| 'sm'` | `'default'` | `sm` is narrower, with the question centred over the answers. Default `default`. |
| `blur` | `boolean` | `false` | Frost the page behind the dialog instead of only dimming it. |
| `inline` | `boolean` | `false` | Draw it in the page instead of over it: no backdrop, no trigger, always there. For previews; `open` is ignored. |

#### `AlertDialogMediaProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |
| `className` | `alertDialogVariants().media({ className }),` | **required** | — |

#### `AlertDialogFooterProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |

#### `AlertDialogActionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `onClick` | `(event: MouseEvent<HTMLButtonElement>) => void \| Promise<unknown>` | — | What it does. When it returns a promise, the button shows a spinner and the dialog stays open, and cannot be closed, until it settles: it closes when the promise resolves and stays open when it rejects. Call `event.preventDefault()` to keep the dialog open after a plain handler. |
| `tone` | `'primary' \| 'destructive'` | — | Its colour. Default: `destructive` in a destructive dialog, `primary` otherwise. |
| `variant` | `'solid' \| 'soft'` | `'solid'` | `solid` is filled; `soft` is a tint of its colour, for an answer that is not the main one. Default `solid`. |
| `hold` | `number` | — | Makes it an action that must be pressed and held, for this many milliseconds, while a fill runs across it. Letting go early drains the fill. Space and Enter can be held the same way. |

## In a Server Component

`AlertDialog` is a client component. A Server Component cannot read `AlertDialog.Trigger` off the import, so import each part by name: `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogMedia`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogCancel`, `AlertDialogAction`.

## Notes

#### Closing

A press outside it, Escape and `AlertDialog.Cancel` close it, unless an action is running. `dismissible={false}` stops a press outside from closing it, for a question that a stray click should not answer; Escape still does. `AlertDialog.Action` closes it after its `onClick`, unless that handler calls `event.preventDefault()` or returns a promise that rejects.

#### Focus

When it opens, focus moves to the first thing in it that takes focus: a field in the panel if there is one, otherwise the first answer. Put `AlertDialog.Cancel` first in the footer, so the answer focused by default is the one that changes nothing. Focus goes back to the trigger when it closes.

#### Holding and screen readers

A screen reader cannot hold a button, so a press that arrives with no pointer or key going down first, as a screen reader's does, confirms straight away. The button is described as "Press and hold to confirm" for everyone else.

#### Opening it from code

Pass `open` and `onOpenChange` to open it from anywhere, such as a menu item, without an `AlertDialog.Trigger`.

## Example

```tsx
'use client';

import { AlertDialog } from '@/components/panelui/alert-dialog';
import { Button } from '@/components/panelui/button';

export default function AlertDialogOverview() {
  return (
    <AlertDialog>
      <AlertDialog.Trigger render={<Button variant="destructive" />}>Delete project</AlertDialog.Trigger>
      <AlertDialog.Content tone="destructive">
        <AlertDialog.Title>Delete Orchard?</AlertDialog.Title>
        <AlertDialog.Description>
          Its 14 boards and their history are deleted with it. This cannot be undone.
        </AlertDialog.Description>
        <AlertDialog.Footer>
          <AlertDialog.Cancel />
          <AlertDialog.Action>Delete project</AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog>
  );
}
```
