# coss Context Menu

## When to use

- Right-click or long-press action menus anchored to the pointer.
- Surface-specific actions on cards, rows, canvases, or media.
- The same action sets you might also expose in a dropdown `Menu`.

## When NOT to use

- If the user needs a click-to-open trigger button -> use Menu instead.
- If the user needs to search/filter actions -> use Command instead.
- If the content is rich informational (not actions) -> use Popover instead.

## Install

```bash
npx shadcn@latest add @coss/context-menu
```

Manual deps and theme var from docs:

```bash
npm install @base-ui/react
```

Also include the destructive foreground CSS variable snippet from the coss context menu docs when doing manual setup.

## Canonical imports

```tsx
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuGroup,
  ContextMenuGroupLabel,
  ContextMenuItem,
  ContextMenuLinkItem,
  ContextMenuPopup,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubPopup,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
```

## Minimal pattern

```tsx
<ContextMenu>
  <ContextMenuTrigger className="flex h-32 items-center justify-center rounded-lg border border-dashed">
    Right click here
  </ContextMenuTrigger>
  <ContextMenuPopup>
    <ContextMenuItem>Back</ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem>Reload</ContextMenuItem>
  </ContextMenuPopup>
</ContextMenu>
```

Wrap the trigger around the surface that should accept right click or long press. The popup opens at the pointer automatically.

## Patterns from coss particles

- **Portal forwarding**: optional `portalProps` on `ContextMenuPopup` -> Base UI `ContextMenu.Portal` (`keepMounted`, `container`, ...). See [portal-props.md](../portal-props.md).
- Use `ContextMenuTrigger` on a non-interactive wrapper (`div`) around the target surface.
- Use `ContextMenuLinkItem` for navigation links.
- If you were on `ContextMenuItem render={<Link href="..." />}`, switch to `ContextMenuLinkItem` but **keep `render={<Link … />}`** — do not use `href` alone with a router Link.
- Use `href` on `ContextMenuLinkItem` only for plain `<a>` navigation.
- Use `ContextMenuItem closeOnClick` for action items that should dismiss the menu.
- Use `ContextMenuCheckboxItem variant="switch"` for toggle-style preferences.
- Use `ContextMenuRadioGroup` + `ContextMenuRadioItem` for single-choice options.
- Use `variant="destructive"` on dangerous actions.
- Use `ContextMenuSub` + `ContextMenuSubTrigger` + `ContextMenuSubPopup` for nested menus.

## Common pitfalls

- Putting interactive controls inside `ContextMenuTrigger` without careful event handling.
- Forgetting `ContextMenuSubPopup` for nested menus.
- Mixing navigation and action items without clear close behavior (`closeOnClick`).

## Useful particle references

- basic pointer menu: `p-context-menu-1`
- link/navigation with `ContextMenuLinkItem render={<Link … />}`: `p-context-menu-2`
- nested submenu pattern: `p-context-menu-3`
- checkbox item pattern: `p-context-menu-4`
- grouped sections with labels: `p-context-menu-5`
- icons, shortcuts, and destructive actions: `p-context-menu-6`
- radio group pattern: `p-context-menu-7`
- switch-style checkbox items: `p-context-menu-8`

## Related primitives

- dropdown click menu: [menu.md](./menu.md)
- mobile action sheet variant: [drawer.md](./drawer.md)
