# Command

A launcher: type to find a page, an app or an action, and run it with Enter.

```tsx
import { Command } from "@/components/panelui/command"
```

From npm the path is `panelui-web/command`. Install with `npx shadcn@latest add @panelui/command`.

## When to use it

Use it for a launcher that is opened from a hotkey: search the pages of an app, its settings and its actions in one place, and run one with Enter. For a field that answers a question in rows under it, use [Command Dock](/docs/web/components/command-dock). For actions on one thing, opened from a button beside it, use a [Menu](/docs/web/components/menu).

Items are written as children. Each hides itself when it does not match what is typed: every word has to appear in its title, its `subtitle`, its `kind` or its `keywords`, in any order. A group with nothing left in it hides too, and `Command.Empty` shows when nothing is left at all. The first match is highlighted, so a few letters and Enter run it.

The default layout, `spotlight`, is the large launcher: a tall field with a mark at its start, slim rows with the kind of each at their end, and a floating footer the last rows fade out under.

Put it in a `Command.Dialog` to open it over the page with ⌘K, or Ctrl+K, or leave it in the page. Opened from its hotkey it appears at once, with no animation, because a launcher is opened many times a day.

## Usage

```tsx
<Command.Dialog hotkey="mod+k">
  <Command>
    <Command.Input placeholder="Search for pages and actions…" />
    <Command.List>
      <Command.Group heading="Pages">
        <Command.Item icon={<BookIcon />} kind="Guide" onSelect={() => go('/docs')}>
          Documentation
        </Command.Item>
      </Command.Group>
      <Command.Empty />
    </Command.List>
    <Command.Footer>
      <Command.FooterAction keys={['↵']}>Open</Command.FooterAction>
    </Command.Footer>
  </Command>
</Command.Dialog>
```

## Parts

```tsx
<Command.Dialog>
  <Command>
    <Command.Input>
      <Command.InputAction />
    </Command.Input>
    <Command.List>
      <Command.Group>
        <Command.Item />
      </Command.Group>
      <Command.Separator />
      <Command.Loading />
      <Command.Empty />
    </Command.List>
    <Command.Footer>
      <Command.FooterButton />
      <Command.FooterAction />
      <Command.FooterDivider />
    </Command.Footer>
  </Command>
</Command.Dialog>
```

- `Command.Dialog` — Opens the launcher in a panel over the page, from its `hotkey` (`mod+k` by default, `null` for none) or from a `trigger`. Choosing an item closes it, unless the item has `closeOnSelect={false}`. Escape closes it too.
- `Command.Input` — The field. It has focus while the launcher is open, and the arrow keys and Enter work from it. `icon` replaces the magnifying glass and `prefix` puts a chip before the text, such as the page a nested list is on. Its children go at its end.
- `Command.InputAction` — A button at the end of the field, with its `keys` after its label, such as switching the field to asking an assistant.
- `Command.List` — The results, scrolling inside the launcher. In the `split` layout the preview of the highlighted item sits beside it.
- `Command.Group` — Items under a `heading`. It hides when none of its items match.
- `Command.Item` — One result: `icon`, the title as its children, a quieter `subtitle`, and at its end a `badge`, its `kind` and its `shortcut`. `onSelect` runs when it is pressed or Enter is pressed on it. `keywords` are more words to find it by, and `forceMount` keeps it whatever is typed.
- `Command.Empty` — Shown when no item is left.
- `Command.Loading` — A spinner and a line, for results still on their way.
- `Command.Separator` — A rule between groups.
- `Command.Footer` — The foot of the launcher: `lead` at its start, such as a `Command.FooterButton`, and its actions at its end. In `spotlight` it floats over the list as a round button and a pill of actions, and the last rows fade out under it; in the other layouts it is a bar.
- `Command.FooterAction` — An action in the footer, with its `keys` after its label. The first is usually what Enter does.
- `Command.FooterButton` — An icon button for the footer's start, such as one that opens a menu of settings. It needs an `aria-label`. Round in `spotlight`.
- `Command.FooterDivider` — A thin rule between two footer actions.
- `Command.Keys` — Keys drawn as key caps, for anywhere else in the launcher.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `CommandProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `CommandVariant` | `'spotlight'` | The layout: `spotlight`, `compact`, `grid`, `split` or `inline`. Default `spotlight`. |
| `search` | `string` | — | What is typed in the field, when the caller holds it. |
| `onSearchChange` | `(search: string) => void` | — | Called with the text in the field as it changes. |
| `filter` | `boolean` | `true` | Whether items hide when they do not match. Turn it off for results already filtered elsewhere, such as by a server. Default `true`. |
| `columns` | `number` | `5` | Tiles to a row, for the `grid` layout. Default `5`. |
| `label` | `string` | `'Commands'` | What a screen reader calls the list. Default `Commands`. |

#### `CommandInputProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `icon` | `ReactNode` | — | What sits before the field. Default a magnifying glass; pass `null` for none. |
| `prefix` | `ReactNode` | — | A chip before the text, such as the page a nested list is on. |
| `className` | `string` | — | — |

#### `CommandKeysProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `keys` | `readonly string[]` | **required** | The keys, each drawn as a key cap: `['⌘', 'K']`. |

#### `CommandInputActionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `keys` | `readonly string[]` | — | The keys that do the same, drawn after the label. |

#### `CommandGroupProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `heading` | `ReactNode` | — | The group's heading. |

#### `CommandItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `string` | — | What identifies it. Default its text. Two items must not share one. |
| `textValue` | `string` | — | The text it is matched against, when its children are not plain text. |
| `keywords` | `readonly string[]` | — | More words it should be found by: `['settings', 'preferences']`. |
| `icon` | `ReactNode` | — | An icon or an app's picture before the title. |
| `subtitle` | `ReactNode` | — | Quieter words after the title: the app it belongs to, a handle. |
| `kind` | `ReactNode` | — | What kind of thing it is, at the end of the row: `Command`, `Application`. |
| `badge` | `ReactNode` | — | A short flag before the kind, such as `Pro`. |
| `shortcut` | `readonly string[]` | — | Keys that run it, drawn at the end of the row. |
| `preview` | `ReactNode` | — | What the `split` layout shows beside the list while it is highlighted. |
| `onSelect` | `() => void` | — | Called when it is pressed, or Enter is pressed while it is highlighted. |
| `closeOnSelect` | `boolean` | `true` | Whether choosing it closes the dialog it is in. Default `true`. |
| `forceMount` | `boolean` | `false` | Whether it shows whatever is typed. Use it for an item such as "Search the web for …". |
| `disabled` | `boolean` | — | Whether it can be chosen. |

#### `CommandFooterProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `lead` | `ReactNode` | — | What sits at the start of the bar: where the launcher is, or a hint. |

#### `CommandFooterActionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `keys` | `readonly string[]` | — | The keys that do the same, drawn after the label. |

#### `CommandDialogProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `open` | `boolean` | — | Whether it is open, when the caller holds it. |
| `defaultOpen` | `boolean` | `false` | Whether it is open to begin with. |
| `onOpenChange` | `(open: boolean) => void` | — | Called when it opens or closes. |
| `hotkey` | `string \| null` | `'mod+k'` | Keys that open and close it from anywhere on the page. `mod` is ⌘ on a Mac and Ctrl elsewhere. Default `mod+k`; `null` for none. |
| `trigger` | `ReactElement` | — | A button that opens it, such as a search field in a header. |
| `label` | `string` | `'Command menu'` | What a screen reader calls the dialog. Default `Command menu`. |
| `className` | `string` | — | Classes for the panel. |

## In a Server Component

`Command` is a client component. A Server Component cannot read `Command.Dialog` off the import, so import each part by name: `CommandDialog`, `CommandInput`, `CommandInputAction`, `CommandList`, `CommandGroup`, `CommandItem`, `CommandEmpty`, `CommandLoading`, `CommandSeparator`, `CommandFooter`, `CommandFooterAction`, `CommandFooterButton`, `CommandFooterDivider`, `CommandKeys`.

## Notes

#### Keyboard

The arrow keys move the highlight, Enter runs the highlighted item, and Escape closes a dialog. In the `grid` layout Left and Right move across a row. The hotkey opens and closes the dialog from anywhere on the page.

#### Choosing a hotkey

A page never receives the keys a browser keeps for itself, such as ⌘T, ⌘W or ⌘1 to ⌘9. ⌘K and Ctrl+K are free to use and are what most launchers use. With more than one `Command.Dialog` on a page, or a search of your own already on ⌘K, give only one of them the hotkey and pass `hotkey={null}` to the rest.

#### Accessibility

The field is a combobox and the results are a listbox, so a screen reader announces the highlighted item as the arrow keys move. The dialog is named by its `label`, `Command menu` by default. Shortcuts drawn by `shortcut` and `Command.Keys` are only shown; handle the keys where the action lives.

## Example

```tsx
'use client';

import {
  BookOpenIcon,
  BugIcon,
  StarIcon,
  KeyboardIcon,
  EqualIcon,
  BoxIcon,
  ClipboardListIcon,
  MoonStarIcon,
  PackagePlusIcon,
  PaletteIcon,
  RocketIcon,
  SparklesIcon,
  TerminalIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Command } from '@/components/panelui/command';

/** An app's picture: an icon on a tile in one of the theme's colours. */
function Tile({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`flex size-full items-center justify-center ${tone === 'bg-foreground' ? 'text-background' : 'text-white'} [&_svg]:size-3.5 ${tone}`}>{children}</span>;
}

export default function CommandOverview() {
  return (
    <Command className="max-w-2xl">
      <Command.Input
        placeholder="Search components and actions…"
        icon={
          <>
            <img src="/logo-light.png" alt="" className="dark:hidden" />
            <img src="/logo-dark.png" alt="" className="hidden dark:block" />
          </>
        }
      >
        <Command.InputAction keys={['⇥']}>Ask AI</Command.InputAction>
      </Command.Input>
      <Command.List className="max-h-[27rem]">
        <Command.Group>
          <Command.Item icon={<Tile tone="bg-destructive"><SparklesIcon /></Tile>} subtitle="v0.12.0" kind="Changelog">
            See what’s new
          </Command.Item>
        </Command.Group>
        <Command.Group heading="Suggestions">
          <Command.Item icon={<Tile tone="bg-info"><BoxIcon /></Tile>} subtitle="Components" kind="Page">
            Model Picker
          </Command.Item>
          <Command.Item icon={<Tile tone="bg-warning"><ClipboardListIcon /></Tile>} subtitle="Components" kind="Page">
            Usage
          </Command.Item>
          <Command.Item icon={<Tile tone="bg-success"><PaletteIcon /></Tile>} subtitle="Theming" kind="Guide" keywords={['colours', 'tokens']}>
            Choose a theme
          </Command.Item>
          <Command.Item icon={<Tile tone="bg-foreground"><TerminalIcon /></Tile>} subtitle="Installation" kind="Guide">
            Add with the CLI
          </Command.Item>
        </Command.Group>
        <Command.Group heading="Actions">
          <Command.Item icon={<Tile tone="bg-info"><PackagePlusIcon /></Tile>} subtitle="npm" kind="Command" shortcut={['⌘', 'I']}>
            Install panelui-web
          </Command.Item>
          <Command.Item icon={<Tile tone="bg-foreground"><MoonStarIcon /></Tile>} kind="Command" keywords={['dark', 'light', 'appearance']}>
            Switch theme
          </Command.Item>
          <Command.Item icon={<Tile tone="bg-success"><RocketIcon /></Tile>} subtitle="Templates" badge="New" kind="Command">
            Start a new app
          </Command.Item>
          <Command.Item icon={<Tile tone="bg-warning"><BookOpenIcon /></Tile>} subtitle="Reference" kind="Page">
            Read the API reference
          </Command.Item>
          <Command.Item icon={<Tile tone="bg-destructive"><BugIcon /></Tile>} subtitle="GitHub" kind="Link">
            Report a bug
          </Command.Item>
          <Command.Item icon={<Tile tone="bg-warning"><StarIcon /></Tile>} subtitle="panel-ui/PanelUI" kind="Link">
            Star the repository
          </Command.Item>
          <Command.Item icon={<Tile tone="bg-info"><KeyboardIcon /></Tile>} kind="Command" shortcut={['⌘', '/']}>
            Keyboard shortcuts
          </Command.Item>
        </Command.Group>
        <Command.Empty>No components or pages match</Command.Empty>
      </Command.List>
      <Command.Footer
        lead={
          <Command.FooterButton aria-label="Settings">
            <EqualIcon />
          </Command.FooterButton>
        }
      >
        <Command.FooterAction keys={['↵']}>Open Page</Command.FooterAction>
        <Command.FooterDivider />
        <Command.FooterAction keys={['⌘', 'K']}>Actions</Command.FooterAction>
      </Command.Footer>
    </Command>
  );
}
```
