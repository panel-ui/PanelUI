# Menu

A list of actions that opens from a button, with shortcuts, checks and submenus.

```tsx
import { Menu } from "@/components/panelui/menu"
```

From npm the path is `panelui-web/menu`. Install with `npx shadcn@latest add @panelui/menu`.

## When to use it

Use it for actions on one thing that do not all fit beside it: a document's rename, share and delete, a row's more button. For choosing a value that then shows in the button, use [Select](/docs/web/components/select).

Every row has the same shape: an icon, the label, and at its end a shortcut, a badge, a check or a submenu's chevron.

It opens from `Menu.Trigger`, which is a plain button until you give it `render`. Pass a [Button](/docs/web/components/button) there to draw it as one.

## Usage

```tsx
<Menu>
  <Menu.Trigger render={<Button variant="outline" />}>Document</Menu.Trigger>
  <Menu.Content>
    <Menu.Item onClick={rename}>
      <PencilIcon />
      Rename
      <Menu.Shortcut>⌘R</Menu.Shortcut>
    </Menu.Item>
    <Menu.Separator />
    <Menu.Item variant="destructive">Delete</Menu.Item>
  </Menu.Content>
</Menu>
```

## Parts

```tsx
<Menu>
  <Menu.Trigger />
  <Menu.Content>
    <Menu.Item>
      <Menu.Description />
      <Menu.Shortcut />
      <Menu.Badge />
    </Menu.Item>
    <Menu.Sub>
      <Menu.SubTrigger />
      <Menu.SubContent />
    </Menu.Sub>
    <Menu.Separator />
    <Menu.Group>
      <Menu.GroupLabel />
      <Menu.CheckboxItem />
      <Menu.RadioGroup>
        <Menu.RadioItem />
      </Menu.RadioGroup>
    </Menu.Group>
  </Menu.Content>
</Menu>
```

- `Menu.Trigger` — The button that opens the menu. `render` draws it as another element, such as a `Button`.
- `Menu.Content` — The list, in a layer over the page. `side` and `align` place it against the trigger, and it moves to the other side when there is no room. `anchor` places it against another element instead.
- `Menu.Item` — One action, which closes the menu when pressed. `variant="destructive"` is for one that cannot be undone.
- `Menu.CheckboxItem` — An item switched on and off, with a check at its end while on. The menu stays open.
- `Menu.RadioGroup` — Radio items of which one is chosen, held by `value` and `onValueChange`.
- `Menu.RadioItem` — One choice in a radio group.
- `Menu.Sub` — A submenu: its row and the list it opens.
- `Menu.SubTrigger` — The row that opens a submenu, on hover or press, with a chevron at its end. `end` puts something before the chevron, such as a badge.
- `Menu.SubContent` — The submenu's list, opened beside its row.
- `Menu.Group` — Items that belong together. A screen reader announces them by their `Menu.GroupLabel`.
- `Menu.GroupLabel` — The heading of a group.
- `Menu.Separator` — A rule between groups.
- `Menu.Shortcut` — The keys for an item, at its end. It only shows them; the keys have to be handled where the action lives.
- `Menu.Badge` — A small count or flag at an item's end.
- `Menu.Description` — What an item does, in quieter words after its label.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `MenuContentProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `container` | `BaseMenu.Portal.Props['container']` | — | Where in the document the menu is put. Default `document.body`. |
| `anchor` | `BaseMenu.Positioner.Props['anchor']` | — | What it is placed against instead of the trigger: an element or a ref to one. |
| `className` | `string` | — | — |

#### `MenuItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `variant` | `'default' \| 'destructive'` | — | `destructive` draws it in the destructive colour, for an action that cannot be undone. Default `default`. |
| `className` | `string` | — | — |

#### `MenuCheckboxItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `MenuRadioGroupProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `MenuRadioItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `MenuSubTriggerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |
| `end` | `ReactNode` | — | Something before the chevron, such as a `Menu.Badge`. |

#### `MenuSubContentProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `side` | `BaseMenu.Positioner.Props['side']` | `'inline-end'` | Default `inline-end`: to the right in a left-to-right page. |

#### `MenuGroupProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `MenuGroupLabelProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `className` | `string` | — | — |

#### `MenuSeparatorProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'div',` | **required** | — |
| `props` | `mergeProps(` | **required** | — |

#### `MenuDescriptionProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'span',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'menu-description', className: menuVariants().description({ className }) }, props),` | **required** | — |

#### `MenuShortcutProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'kbd',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'menu-shortcut', className: menuVariants().shortcut({ className }) }, props),` | **required** | — |

#### `MenuBadgeProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'span',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'menu-badge', className: menuVariants().badge({ className }) }, props),` | **required** | — |

## In a Server Component

`Menu` is a client component. A Server Component cannot read `Menu.Trigger` off the import, so import each part by name: `MenuTrigger`, `MenuContent`, `MenuItem`, `MenuCheckboxItem`, `MenuRadioGroup`, `MenuRadioItem`, `MenuSub`, `MenuSubTrigger`, `MenuSubContent`, `MenuGroup`, `MenuGroupLabel`, `MenuSeparator`, `MenuDescription`, `MenuShortcut`, `MenuBadge`.

## Notes

#### Keyboard

With the trigger focused, Enter, Space or the down arrow opens the menu on its first item. The arrow keys move between items, typing jumps to one by its first letters, Enter presses it, and Escape closes the menu and puts focus back on the trigger. The right arrow opens a submenu and the left arrow closes it.

#### Submenus

A submenu opens when its row is hovered, after a short delay, or pressed. The pointer can cross diagonally from the row to the submenu without closing it.

#### Closing

Pressing an item closes the menu; pressing a check or radio item does not. Pass `closeOnClick` to change either.

## Example

```tsx
import { Button } from '@/components/panelui/button';
import { Menu } from '@/components/panelui/menu';

export default function MenuDemo() {
  return (
    <Menu>
      <Menu.Trigger render={<Button variant="outline" />}>Open</Menu.Trigger>
      <Menu.Content className="w-56">
        <Menu.Group>
          <Menu.GroupLabel>Workspace</Menu.GroupLabel>
          <Menu.Item>
            Profile
            <Menu.Shortcut>⇧⌘P</Menu.Shortcut>
          </Menu.Item>
          <Menu.Item>
            Plan and billing
            <Menu.Shortcut>⌘B</Menu.Shortcut>
          </Menu.Item>
          <Menu.Item>
            Preferences
            <Menu.Shortcut>⌘,</Menu.Shortcut>
          </Menu.Item>
        </Menu.Group>
        <Menu.Separator />
        <Menu.Group>
          <Menu.Item>Members</Menu.Item>
          <Menu.Sub>
            <Menu.SubTrigger>Invite people</Menu.SubTrigger>
            <Menu.SubContent>
              <Menu.Item>By email</Menu.Item>
              <Menu.Item>With a link</Menu.Item>
              <Menu.Separator />
              <Menu.Item>From another workspace</Menu.Item>
            </Menu.SubContent>
          </Menu.Sub>
          <Menu.Item>
            New project
            <Menu.Shortcut>⌘N</Menu.Shortcut>
          </Menu.Item>
        </Menu.Group>
        <Menu.Separator />
        <Menu.Item>Help centre</Menu.Item>
        <Menu.Item disabled>Status page</Menu.Item>
        <Menu.Separator />
        <Menu.Item>
          Sign out
          <Menu.Shortcut>⇧⌘Q</Menu.Shortcut>
        </Menu.Item>
      </Menu.Content>
    </Menu>
  );
}
```
