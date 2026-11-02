'use client';

/**
 * Menu — a list of actions that opens from a button.
 *
 * ```tsx
 * <Menu>
 *   <Menu.Trigger render={<Button variant="outline" />}>Options</Menu.Trigger>
 *   <Menu.Content>
 *     <Menu.Item onClick={rename}>
 *       <PencilIcon /> Rename <Menu.Shortcut>⌘R</Menu.Shortcut>
 *     </Menu.Item>
 *     <Menu.Sub>
 *       <Menu.SubTrigger><ShareIcon /> Share</Menu.SubTrigger>
 *       <Menu.SubContent>
 *         <Menu.Item>Copy link</Menu.Item>
 *       </Menu.SubContent>
 *     </Menu.Sub>
 *     <Menu.Separator />
 *     <Menu.CheckboxItem checked={pinned} onCheckedChange={setPinned}>Pinned</Menu.CheckboxItem>
 *     <Menu.Item variant="destructive">Delete</Menu.Item>
 *   </Menu.Content>
 * </Menu>
 * ```
 *
 * ## One row shape
 *
 * Every row is the same: an icon, the label, and whatever belongs at the end
 * of it, a shortcut, a badge, a check or the chevron of a submenu. Icons are
 * written as the row's first child and sized by the row, so rows with and
 * without them still line up when every row in a group has one.
 *
 * ## Submenus
 *
 * A submenu opens to the side when its row is hovered or pressed, or with
 * the right arrow key, and closes with the left one. The pointer can cross
 * diagonally to it without closing it on the way.
 *
 * ## Items that stay open
 *
 * Pressing an item closes the menu. A check item or a radio item keeps it
 * open, so several can be switched in a row; pass `closeOnClick` to change
 * either.
 */
import { Menu as BaseMenu } from '@base-ui/react/menu';
import type { ComponentProps, ReactNode } from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

const menuVariants = tv({
  slots: {
    positioner: 'z-50 outline-none',
    popup: [
      'min-w-48 origin-(--transform-origin) rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg outline-none',
      'max-h-(--available-height) overflow-y-auto [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]',
      'transition-[opacity,scale] duration-150 ease-out',
      'data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0',
      'motion-reduce:transition-none',
    ],
    item: [
      // The label never wraps; a description beside it is cut short instead.
      'flex min-h-8 cursor-default items-center gap-2.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-sm outline-none select-none',
      'data-highlighted:bg-accent data-highlighted:text-accent-foreground',
      'data-disabled:pointer-events-none data-disabled:opacity-50',
      // A submenu's row stays lit while its submenu is open, so it is clear what it belongs to.
      'data-popup-open:bg-accent',
      '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
      '[&>svg:first-child]:text-muted-foreground data-highlighted:[&>svg:first-child]:text-current',
    ],
    end: 'ms-auto flex items-center ps-3',
    check: 'ms-auto flex size-4 items-center justify-center ps-0 text-foreground',
    description: 'min-w-0 truncate text-muted-foreground',
    shortcut: 'ms-auto ps-3 text-xs tracking-wide text-muted-foreground',
    badge:
      'ms-auto inline-flex h-5 items-center gap-1 rounded-md bg-muted px-1.5 text-xs font-medium tabular-nums text-muted-foreground [&_svg:not([class*=size-])]:size-3',
    chevron: 'ms-auto text-muted-foreground',
    group: 'flex flex-col',
    groupLabel: 'px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground',
    separator: 'mx-2 my-1 h-px bg-border',
  },
  variants: {
    variant: {
      default: {},
      destructive: {
        item: 'text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive [&>svg:first-child]:text-destructive',
      },
    },
  },
});

export interface MenuProps extends BaseMenu.Root.Props {}

/** Holds whether the menu is open. Takes `open`/`onOpenChange`, `defaultOpen` and `modal`. */
function MenuRoot(props: MenuProps) {
  return <BaseMenu.Root {...props} />;
}
MenuRoot.displayName = 'Menu';

export interface MenuTriggerProps extends BaseMenu.Trigger.Props {}

/** The button that opens the menu. `render` draws it as another element, such as a `Button`. */
function MenuTrigger(props: MenuTriggerProps) {
  return <BaseMenu.Trigger data-slot="menu-trigger" {...props} />;
}
MenuTrigger.displayName = 'Menu.Trigger';

interface PlacementProps {
  /** Which side of the trigger it opens on. Default `bottom`; a submenu opens to the side. */
  side?: BaseMenu.Positioner.Props['side'];
  /** How it lines up with the trigger along that side. Default `start`. */
  align?: BaseMenu.Positioner.Props['align'];
  /** The gap between the trigger and the menu, in pixels. Default `6`. */
  sideOffset?: number;
  /** Moves it along the side, in pixels. */
  alignOffset?: number;
}

export interface MenuContentProps extends BaseMenu.Popup.Props, PlacementProps {
  /** Where in the document the menu is put. Default `document.body`. */
  container?: BaseMenu.Portal.Props['container'];
  /** What it is placed against instead of the trigger: an element or a ref to one. */
  anchor?: BaseMenu.Positioner.Props['anchor'];
  className?: string;
}

/** The list, opened in a layer over the page. It moves to the other side when there is no room. */
function MenuContent({
  side = 'bottom',
  align = 'start',
  sideOffset = 6,
  alignOffset,
  container,
  anchor,
  className,
  ...props
}: MenuContentProps) {
  const slots = menuVariants();
  return (
    <BaseMenu.Portal container={container}>
      <BaseMenu.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        anchor={anchor}
        className={slots.positioner()}
      >
        <BaseMenu.Popup data-slot="menu-content" className={slots.popup({ className })} {...props} />
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}
MenuContent.displayName = 'Menu.Content';

export interface MenuItemProps extends BaseMenu.Item.Props {
  /** `destructive` draws it in the destructive colour, for an action that cannot be undone. Default `default`. */
  variant?: 'default' | 'destructive';
  className?: string;
}

/** One action. Put an icon first, then the label, then a `Menu.Shortcut` or `Menu.Badge` if it has one. */
function MenuItem({ variant, className, ...props }: MenuItemProps) {
  return <BaseMenu.Item data-slot="menu-item" className={menuVariants({ variant }).item({ className })} {...props} />;
}
MenuItem.displayName = 'Menu.Item';

const Check = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export interface MenuCheckboxItemProps extends BaseMenu.CheckboxItem.Props {
  className?: string;
}

/** An item that is switched on and off, with a check at its end while on. The menu stays open. */
function MenuCheckboxItem({ className, children, ...props }: MenuCheckboxItemProps) {
  const slots = menuVariants();
  return (
    <BaseMenu.CheckboxItem data-slot="menu-checkbox-item" className={slots.item({ className })} {...props}>
      {children}
      <span className={slots.check()}>
        <BaseMenu.CheckboxItemIndicator className="flex">
          <Check />
        </BaseMenu.CheckboxItemIndicator>
      </span>
    </BaseMenu.CheckboxItem>
  );
}
MenuCheckboxItem.displayName = 'Menu.CheckboxItem';

export interface MenuRadioGroupProps extends BaseMenu.RadioGroup.Props {
  className?: string;
}

/** Radio items of which one is chosen. Takes `value` and `onValueChange`. */
function MenuRadioGroup({ className, ...props }: MenuRadioGroupProps) {
  return (
    <BaseMenu.RadioGroup data-slot="menu-radio-group" className={menuVariants().group({ className })} {...props} />
  );
}
MenuRadioGroup.displayName = 'Menu.RadioGroup';

export interface MenuRadioItemProps extends BaseMenu.RadioItem.Props {
  className?: string;
}

/** One choice in a radio group, with a check at its end while chosen. */
function MenuRadioItem({ className, children, ...props }: MenuRadioItemProps) {
  const slots = menuVariants();
  return (
    <BaseMenu.RadioItem data-slot="menu-radio-item" className={slots.item({ className })} {...props}>
      {children}
      <span className={slots.check()}>
        <BaseMenu.RadioItemIndicator className="flex">
          <Check />
        </BaseMenu.RadioItemIndicator>
      </span>
    </BaseMenu.RadioItem>
  );
}
MenuRadioItem.displayName = 'Menu.RadioItem';

export interface MenuSubProps extends BaseMenu.SubmenuRoot.Props {}

/** A submenu: a `Menu.SubTrigger` row and the `Menu.SubContent` it opens. */
function MenuSub(props: MenuSubProps) {
  return <BaseMenu.SubmenuRoot {...props} />;
}
MenuSub.displayName = 'Menu.Sub';

export interface MenuSubTriggerProps extends BaseMenu.SubmenuTrigger.Props {
  className?: string;
  /** Something before the chevron, such as a `Menu.Badge`. */
  end?: ReactNode;
}

/** The row that opens a submenu, with a chevron at its end. It opens on hover as well as on press. */
function MenuSubTrigger({ className, children, end, openOnHover = true, delay = 80, ...props }: MenuSubTriggerProps) {
  const slots = menuVariants();
  return (
    <BaseMenu.SubmenuTrigger
      data-slot="menu-sub-trigger"
      openOnHover={openOnHover}
      delay={delay}
      className={slots.item({ className })}
      {...props}
    >
      {children}
      <span className={slots.end()}>
        {end}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={slots.chevron({ className: end ? 'ms-2' : undefined })}
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </span>
    </BaseMenu.SubmenuTrigger>
  );
}
MenuSubTrigger.displayName = 'Menu.SubTrigger';

export interface MenuSubContentProps extends Omit<MenuContentProps, 'side'> {
  /** Default `inline-end`: to the right in a left-to-right page. */
  side?: BaseMenu.Positioner.Props['side'];
}

/** The submenu's list, opened beside its row with the first item level with it. */
function MenuSubContent({
  side = 'inline-end',
  align = 'start',
  sideOffset = 6,
  alignOffset = -5,
  ...props
}: MenuSubContentProps) {
  return <MenuContent side={side} align={align} sideOffset={sideOffset} alignOffset={alignOffset} {...props} />;
}
MenuSubContent.displayName = 'Menu.SubContent';

export interface MenuGroupProps extends BaseMenu.Group.Props {
  className?: string;
}

/** Items that belong together, under a `Menu.GroupLabel`. */
function MenuGroup({ className, ...props }: MenuGroupProps) {
  return <BaseMenu.Group data-slot="menu-group" className={menuVariants().group({ className })} {...props} />;
}
MenuGroup.displayName = 'Menu.Group';

export interface MenuGroupLabelProps extends BaseMenu.GroupLabel.Props {
  className?: string;
}

/** The heading of a group. Screen readers announce the group by it. */
function MenuGroupLabel({ className, ...props }: MenuGroupLabelProps) {
  return (
    <BaseMenu.GroupLabel data-slot="menu-group-label" className={menuVariants().groupLabel({ className })} {...props} />
  );
}
MenuGroupLabel.displayName = 'Menu.GroupLabel';

export interface MenuSeparatorProps extends ComponentProps<'div'> {}

/** A rule between groups of items. */
function MenuSeparator({ className, render, ...props }: MenuSeparatorProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      { role: 'separator', 'data-slot': 'menu-separator', className: menuVariants().separator({ className }) },
      props
    ),
  });
}
MenuSeparator.displayName = 'Menu.Separator';

export interface MenuDescriptionProps extends ComponentProps<'span'> {}

/** What an item does, in quieter words after its label. */
function MenuDescription({ className, render, ...props }: MenuDescriptionProps & RenderProp<'span'>) {
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps({ 'data-slot': 'menu-description', className: menuVariants().description({ className }) }, props),
  });
}
MenuDescription.displayName = 'Menu.Description';

export interface MenuShortcutProps extends ComponentProps<'kbd'> {}

/** The keys for an item, at its end. It only shows them: wire the keys up where the action lives. */
function MenuShortcut({ className, render, ...props }: MenuShortcutProps & RenderProp<'kbd'>) {
  return useRender({
    defaultTagName: 'kbd',
    render,
    props: mergeProps({ 'data-slot': 'menu-shortcut', className: menuVariants().shortcut({ className }) }, props),
  });
}
MenuShortcut.displayName = 'Menu.Shortcut';

export interface MenuBadgeProps extends ComponentProps<'span'> {}

/** A small count or flag at an item's end: how many need attention, or that something is new. */
function MenuBadge({ className, render, ...props }: MenuBadgeProps & RenderProp<'span'>) {
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps({ 'data-slot': 'menu-badge', className: menuVariants().badge({ className }) }, props),
  });
}
MenuBadge.displayName = 'Menu.Badge';

export const Menu = Object.assign(MenuRoot, {
  Trigger: MenuTrigger,
  Content: MenuContent,
  Item: MenuItem,
  CheckboxItem: MenuCheckboxItem,
  RadioGroup: MenuRadioGroup,
  RadioItem: MenuRadioItem,
  Sub: MenuSub,
  SubTrigger: MenuSubTrigger,
  SubContent: MenuSubContent,
  Group: MenuGroup,
  GroupLabel: MenuGroupLabel,
  Separator: MenuSeparator,
  Description: MenuDescription,
  Shortcut: MenuShortcut,
  Badge: MenuBadge,
});

export {
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuCheckboxItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSub,
  MenuSubTrigger,
  MenuSubContent,
  MenuGroup,
  MenuGroupLabel,
  MenuSeparator,
  MenuDescription,
  MenuShortcut,
  MenuBadge,
};
