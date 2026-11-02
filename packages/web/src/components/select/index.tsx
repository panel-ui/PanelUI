'use client';

/**
 * Select — a button that opens a list of options, one of which is chosen.
 *
 * ```tsx
 * <Select items={plans} defaultValue="team">
 *   <Select.Trigger>
 *     <Select.Value placeholder="Pick a plan" />
 *   </Select.Trigger>
 *   <Select.Content>
 *     {plans.map((plan) => (
 *       <Select.Item key={plan.value} value={plan.value} description={plan.price}>
 *         {plan.label}
 *       </Select.Item>
 *     ))}
 *   </Select.Content>
 * </Select>
 * ```
 *
 * ## The list opens over the trigger
 *
 * Opened with a pointer, the list is placed so the chosen option sits exactly
 * over the trigger, and the eye does not have to go looking for it. Where
 * there is no room for that, or `alignItemWithTrigger` is false, it opens
 * below. Opened from the keyboard, the arrow keys move through the options,
 * typing jumps to one by its first letters, and Enter chooses.
 *
 * ## Labels
 *
 * Pass `items` to the root, as `{ value, label }` pairs, and `Select.Value`
 * shows the chosen option's label rather than its value. Without `items`,
 * give `Select.Value` a function that turns a value into what to show.
 *
 * ## Three triggers
 *
 * `default` is a field, for a form. `ghost` has no box until it is hovered,
 * for a choice set into a toolbar or a line of text. `pill` is a rounded chip
 * with an edge, for a choice that sits among other chips, such as the model
 * in a prompt.
 */
import { Select as BaseSelect } from '@base-ui/react/select';
import type { ComponentProps, ReactNode } from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

const selectVariants = tv({
  slots: {
    trigger: [
      'group/select-trigger inline-flex min-w-0 cursor-pointer select-none items-center justify-between gap-2 whitespace-nowrap text-foreground outline-none',
      'transition-[background-color,border-color,box-shadow,color] duration-150',
      'focus-visible:ring-[3px] focus-visible:ring-ring/30',
      'data-disabled:cursor-not-allowed data-disabled:opacity-50',
      '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
    ],
    icon: 'flex text-muted-foreground transition-transform duration-200 group-data-popup-open/select-trigger:rotate-180 motion-reduce:transition-none',
    value: 'flex min-w-0 flex-1 items-center gap-2 truncate text-start data-placeholder:text-muted-foreground/80',
    positioner: 'z-50 outline-none',
    popup: [
      'min-w-(--anchor-width) origin-(--transform-origin) overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg outline-none',
      'transition-[opacity,scale] duration-150 ease-out',
      'data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0',
      // Placed over the trigger, it only fades: growing from a point inside
      // the list would look like it came from nowhere.
      'data-[side=none]:data-starting-style:scale-100 data-[side=none]:data-ending-style:scale-100',
      'motion-reduce:transition-none',
    ],
    list: 'max-h-(--available-height) scroll-py-1 overflow-y-auto p-1 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]',
    item: [
      'flex cursor-default items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm outline-none select-none',
      'data-highlighted:bg-accent data-highlighted:text-accent-foreground',
      'data-disabled:pointer-events-none data-disabled:opacity-50',
      'in-data-[side=none]:min-w-[calc(var(--anchor-width)+0.5rem)]',
      '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
    ],
    itemIcon: 'flex size-4 shrink-0 items-center justify-center text-muted-foreground',
    itemBody: 'flex min-w-0 flex-1 flex-col',
    itemText: 'truncate',
    itemDescription: 'truncate text-xs text-muted-foreground',
    // The box is always there, so an option does not change width as it is chosen.
    indicator: 'flex size-4 shrink-0 items-center justify-center text-foreground',
    group: 'flex flex-col',
    groupLabel: 'px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground',
    separator: 'mx-2 my-1 h-px bg-border',
  },
  variants: {
    variant: {
      default: {
        trigger:
          'rounded-lg border border-input bg-background shadow-xs hover:bg-accent/40 data-popup-open:border-ring dark:bg-input/30',
      },
      ghost: {
        trigger:
          'rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground data-popup-open:bg-accent data-popup-open:text-foreground',
      },
      pill: {
        trigger:
          'rounded-full border bg-background shadow-xs hover:bg-accent data-popup-open:bg-accent dark:bg-input/30',
      },
    },
    size: {
      sm: { trigger: 'h-8 px-2.5 text-[0.8125rem]' },
      md: { trigger: 'h-9 px-3 text-sm' },
      lg: { trigger: 'h-11 px-3.5 text-[0.9375rem]' },
    },
  },
  compoundVariants: [
    // A field is as wide as its column; a ghost or a pill is as wide as its label.
    { variant: 'default', className: { trigger: 'w-full' } },
    { variant: 'ghost', size: 'sm', className: { trigger: 'px-2' } },
  ],
  defaultVariants: { variant: 'default', size: 'md' },
});

export type SelectProps<Value = string, Multiple extends boolean | undefined = false> = BaseSelect.Root.Props<
  Value,
  Multiple
>;

/** Holds the chosen value. Takes `value`/`onValueChange`, `defaultValue`, `items`, `name`, `disabled` and `multiple`. */
function SelectRoot<Value = string, Multiple extends boolean | undefined = false>(props: SelectProps<Value, Multiple>) {
  return <BaseSelect.Root {...props} />;
}
SelectRoot.displayName = 'Select';

export interface SelectTriggerProps extends BaseSelect.Trigger.Props {
  /** `default` is a field, `ghost` has no box until hovered, `pill` is a rounded chip. Default `default`. */
  variant?: 'default' | 'ghost' | 'pill';
  /** Its height and text size. Default `md`. */
  size?: 'sm' | 'md' | 'lg';
  /** Replaces the chevron at the end. Pass `null` for none. */
  icon?: ReactNode;
  className?: string;
}

function Chevron({ variant }: { variant: SelectTriggerProps['variant'] }) {
  // A field shows both directions, since its list can open either way over it.
  // A chip shows one, and turns over while its list is open.
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {variant === 'default' || variant === undefined ? (
        <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />
      ) : (
        <path d="m6 9 6 6 6-6" />
      )}
    </svg>
  );
}

/** The button that opens the list. Put a `Select.Value` in it. */
function SelectTrigger({ variant, size, icon, className, children, ...props }: SelectTriggerProps) {
  const slots = selectVariants({ variant, size });
  return (
    <BaseSelect.Trigger data-slot="select-trigger" className={slots.trigger({ className })} {...props}>
      {children}
      {icon === null ? null : (
        <BaseSelect.Icon
          data-slot="select-icon"
          className={slots.icon({
            className: variant === 'default' || variant === undefined ? 'rotate-0!' : undefined,
          })}
        >
          {icon ?? <Chevron variant={variant} />}
        </BaseSelect.Icon>
      )}
    </BaseSelect.Trigger>
  );
}
SelectTrigger.displayName = 'Select.Trigger';

export interface SelectValueProps extends BaseSelect.Value.Props {
  className?: string;
}

/** The chosen option's label, or `placeholder` while there is none. */
function SelectValue({ className, ...props }: SelectValueProps) {
  return <BaseSelect.Value data-slot="select-value" className={selectVariants().value({ className })} {...props} />;
}
SelectValue.displayName = 'Select.Value';

export interface SelectContentProps extends BaseSelect.Popup.Props {
  /** Which side of the trigger it opens on, when it is not placed over it. Default `bottom`. */
  side?: BaseSelect.Positioner.Props['side'];
  /** How it lines up with the trigger along that side. Default `start`. */
  align?: BaseSelect.Positioner.Props['align'];
  /** The gap between the trigger and the list, in pixels. Default `6`. */
  sideOffset?: number;
  /** Whether a pointer opens it with the chosen option over the trigger. Default `true`. */
  alignItemWithTrigger?: boolean;
  /** Where in the document the list is put. Default `document.body`. */
  container?: BaseSelect.Portal.Props['container'];
  className?: string;
}

/** The list of options, opened in a layer over the page. */
function SelectContent({
  side = 'bottom',
  align = 'start',
  sideOffset = 6,
  alignItemWithTrigger = true,
  container,
  className,
  children,
  ...props
}: SelectContentProps) {
  const slots = selectVariants();
  return (
    <BaseSelect.Portal container={container}>
      <BaseSelect.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className={slots.positioner()}
      >
        <BaseSelect.Popup data-slot="select-content" className={slots.popup({ className })} {...props}>
          <BaseSelect.List className={slots.list()}>{children}</BaseSelect.List>
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}
SelectContent.displayName = 'Select.Content';

export interface SelectItemProps extends Omit<BaseSelect.Item.Props, 'children'> {
  /** The option's label: what the trigger shows once it is chosen. */
  children?: ReactNode;
  /** A second, quieter line under the label. */
  description?: ReactNode;
  /** An icon before the label. */
  icon?: ReactNode;
  className?: string;
}

/** One option. A check marks the chosen one. */
function SelectItem({ description, icon, className, children, ...props }: SelectItemProps) {
  const slots = selectVariants();
  return (
    <BaseSelect.Item data-slot="select-item" className={slots.item({ className })} {...props}>
      {icon ? (
        <span data-slot="select-item-icon" aria-hidden="true" className={slots.itemIcon()}>
          {icon}
        </span>
      ) : null}
      <span className={slots.itemBody()}>
        <BaseSelect.ItemText className={slots.itemText()}>{children}</BaseSelect.ItemText>
        {description ? <span className={slots.itemDescription()}>{description}</span> : null}
      </span>
      <span className={slots.indicator()}>
        <BaseSelect.ItemIndicator className="flex">
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
        </BaseSelect.ItemIndicator>
      </span>
    </BaseSelect.Item>
  );
}
SelectItem.displayName = 'Select.Item';

export interface SelectGroupProps extends BaseSelect.Group.Props {
  className?: string;
}

/** Options that belong together, under a `Select.GroupLabel`. */
function SelectGroup({ className, ...props }: SelectGroupProps) {
  return <BaseSelect.Group data-slot="select-group" className={selectVariants().group({ className })} {...props} />;
}
SelectGroup.displayName = 'Select.Group';

export interface SelectGroupLabelProps extends BaseSelect.GroupLabel.Props {
  className?: string;
}

/** The heading of a group. Screen readers announce the group by it. */
function SelectGroupLabel({ className, ...props }: SelectGroupLabelProps) {
  return (
    <BaseSelect.GroupLabel
      data-slot="select-group-label"
      className={selectVariants().groupLabel({ className })}
      {...props}
    />
  );
}
SelectGroupLabel.displayName = 'Select.GroupLabel';

export interface SelectSeparatorProps extends ComponentProps<'div'> {}

/** A rule between groups of options. */
function SelectSeparator({ className, render, ...props }: SelectSeparatorProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      { role: 'separator', 'data-slot': 'select-separator', className: selectVariants().separator({ className }) },
      props
    ),
  });
}
SelectSeparator.displayName = 'Select.Separator';

export const Select = Object.assign(SelectRoot, {
  Trigger: SelectTrigger,
  Value: SelectValue,
  Content: SelectContent,
  Item: SelectItem,
  Group: SelectGroup,
  GroupLabel: SelectGroupLabel,
  Separator: SelectSeparator,
});

export { SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectGroupLabel, SelectSeparator };
