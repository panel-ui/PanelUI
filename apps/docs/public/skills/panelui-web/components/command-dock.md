# Command Dock

A small button that opens into a field, with the answer arriving under it a row at a time.

```tsx
import { CommandDock } from "@/components/panelui/command-dock"
```

From npm the path is `panelui-web/command-dock`. Install with `npx shadcn@latest add @panelui/command-dock`.

## When to use it

Use it for one question a reader can ask from wherever they are: search these notes, find an action, ask an assistant. It is a small button that opens into a field, and the answer arrives under the field a row at a time.

It runs nothing itself. `onSubmit` is handed what was typed and the rows are whatever you render, so it works the same over a search, a model or a list you already have.

It holds one field and a short list. For a conversation that goes back and forth, use a chat interface, and for a list long enough to scroll, a full search page.

## Usage

```tsx
<CommandDock onSubmit={find} busy={busy}>
  <CommandDock.Trigger>Search the notes</CommandDock.Trigger>
  <CommandDock.Panel>
    <CommandDock.Input placeholder="Try: pricing" />
    <CommandDock.Results>
      {found.map((note) => (
        <CommandDock.Row key={note.id}>
          <CommandDock.RowTitle>{note.title}</CommandDock.RowTitle>
          <CommandDock.RowMeta>{note.where}</CommandDock.RowMeta>
        </CommandDock.Row>
      ))}
    </CommandDock.Results>
  </CommandDock.Panel>
</CommandDock>
```

## Parts

```tsx
<CommandDock>
  <CommandDock.Trigger />
  <CommandDock.Panel>
    <CommandDock.Input />
    <CommandDock.Results>
      <CommandDock.Row>
        <CommandDock.RowTitle />
        <CommandDock.RowMeta />
      </CommandDock.Row>
      <CommandDock.Status />
    </CommandDock.Results>
  </CommandDock.Panel>
</CommandDock>
```

- `CommandDock.Trigger` — The closed form: a button with your label that opens the dock.
- `CommandDock.Panel` — The open form. It stays in the page while closed, folded away and inert, so opening and closing can both be seen.
- `CommandDock.Input` — The field, with a send button. Enter sends too.
- `CommandDock.Results` — Where the rows go. It takes no room until there is a row or the dock is busy.
- `CommandDock.Row` — One row of the answer. It slides in when it is added, and `onSelect` makes it a button.
- `CommandDock.RowTitle` — What the row is. It takes the width the row has spare and is cut to one line.
- `CommandDock.RowMeta` — Something short at the end of the row, quieter than the title: a date, a place. It keeps its width.
- `CommandDock.Status` — Three dots and a few words, for while an answer is on its way.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `CommandDockProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `open` | `boolean` | — | Whether it is open, when the caller holds that. |
| `defaultOpen` | `boolean` | `false` | Whether it starts open, when the caller does not. |
| `onOpenChange` | `(open: boolean) => void` | — | Called when it opens or closes. |
| `value` | `string` | — | What is typed in the field, when the caller holds it. |
| `onValueChange` | `(value: string) => void` | — | Called with what is typed, each time it changes. |
| `onSubmit` | `(value: string) => void` | — | Called with what was typed when it is sent. |
| `busy` | `boolean` | `false` | While true, the field cannot be sent again and `CommandDock.Status` is shown. |
| `closedWidth` | `string` | `'9rem'` | How wide it is while closed, as a CSS length. |

#### `CommandDockTriggerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'button',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |
| `ref` | `ref,` | **required** | — |
| `type` | `'button',` | **required** | — |
| `className` | `commandDockVariants({ open: dock.open }).trigger({ className }),` | **required** | — |
| `onClick` | `(event: ReactTypes.MouseEvent<HTMLButtonElement>) => {` | **required** | — |

#### `CommandDockPanelProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |
| `ref` | `ref,` | **required** | — |
| `id` | `dock.panelId,` | **required** | — |
| `className` | `commandDockVariants().panel({ className }),` | **required** | — |

#### `CommandDockInputProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `submitLabel` | `string` | `'Send'` | What a screen reader calls the send button. |

#### `CommandDockResultsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `string` | `'Results'` | What a screen reader calls the list of rows. |

#### `CommandDockRowProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `onSelect` | `() => void` | — | Called when the row is pressed. Passing this makes the row a button. |

#### `CommandDockRowTitleProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'span',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |

#### `CommandDockRowMetaProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'span',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |

## In a Server Component

`CommandDock` is a client component. A Server Component cannot read `CommandDock.Trigger` off the import, so import each part by name: `CommandDockTrigger`, `CommandDockPanel`, `CommandDockInput`, `CommandDockResults`, `CommandDockRow`, `CommandDockRowTitle`, `CommandDockRowMeta`, `CommandDockStatus`.

## Notes

#### Sending

`onSubmit` is called with the text, trimmed, when Enter is pressed or the send button is used. It is not called for an empty field or while `busy` is true.

#### Busy

Set `busy` while an answer is on its way. The send button is disabled and the results area opens, so a `CommandDock.Status` in it has somewhere to show. Render the status yourself where you want it among the rows; the first example puts it after them.

#### Rows arriving

A row slides in when it is added to the page. Add rows one at a time, as they come, and they read as an answer being written. Rows rendered together arrive together. Give each row a stable `key`, or a row that was already there is drawn as new.

#### Size

Closed, the dock is `closedWidth` wide, 9rem unless you set it. It has to be a real length for the opening to be animated, so set it to fit your label. Open, it is as wide as its container up to 28rem.

The dock grows downwards as rows arrive and pushes what is under it. Give its container a `min-h-*` if that should not move the page.

#### Opening and closing

Opening, the surface widens, the label fades into the field, and the rows follow. Closing runs the other way: the rows fold up first and the surface narrows after them. With reduced motion on, both happen at once.

Escape closes the dock and returns focus to its button. A press outside it closes it too. What was typed, and the rows, are kept.

#### Screen readers

The field is a search landmark and takes `aria-label`. The results are a list that is announced politely as rows arrive, so they do not cut in on typing.

## Example

```tsx
'use client';

import { FileTextIcon, SearchIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { CommandDock } from '@/components/panelui/command-dock';

/** What a search of some meeting notes might turn up. */
const NOTES = [
  { title: 'Pricing review', where: 'Notes from 3 March' },
  { title: 'What we decided about trials', where: 'Notes from 19 February' },
  { title: 'Questions for finance', where: 'Notes from 11 February' },
  { title: 'Draft of the pricing page', where: 'Shared by Imani' },
];

export default function CommandDockFind() {
  const [found, setFound] = useState<typeof NOTES>([]);
  const [busy, setBusy] = useState(false);
  const timers = useRef<number[]>([]);

  // Stands in for a search that answers a row at a time.
  const find = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    setFound([]);
    setBusy(true);
    timers.current = NOTES.map((note, index) =>
      window.setTimeout(() => {
        setFound((current) => [...current, note]);
        if (index === NOTES.length - 1) setBusy(false);
      }, 500 + index * 450)
    );
  };

  return (
    <CommandDock onSubmit={find} busy={busy} closedWidth="10.5rem" className="min-h-72 items-start">
      <CommandDock.Trigger>
        <SearchIcon />
        Search the notes
      </CommandDock.Trigger>
      <CommandDock.Panel>
        <CommandDock.Input placeholder="Try: pricing" aria-label="Search the notes" />
        <CommandDock.Results label="Notes found">
          {found.map((note) => (
            <CommandDock.Row key={note.title}>
              <FileTextIcon />
              <CommandDock.RowTitle>{note.title}</CommandDock.RowTitle>
              <CommandDock.RowMeta>{note.where}</CommandDock.RowMeta>
            </CommandDock.Row>
          ))}
          {busy ? <CommandDock.Status>Reading the notes</CommandDock.Status> : null}
        </CommandDock.Results>
      </CommandDock.Panel>
    </CommandDock>
  );
}
```
