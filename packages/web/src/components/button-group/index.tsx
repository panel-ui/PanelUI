/**
 * ButtonGroup — related actions joined into one control.
 *
 * ```tsx
 * <ButtonGroup aria-label="History">
 *   <Button variant="outline">Undo</Button>
 *   <Button variant="outline">Redo</Button>
 * </ButtonGroup>
 * ```
 *
 * ## Joining
 *
 * The group does not draw anything of its own. It squares the corners where
 * two children meet and drops the border one of them would otherwise double,
 * so outline buttons read as one strip with dividers. It does that with child
 * selectors rather than props, so any `Button`, `Input`, `Menu.Trigger` or
 * `Select.Trigger` placed directly inside joins without being told to.
 *
 * Filled buttons have no border to share, so put a `ButtonGroup.Separator`
 * between them; without one, two primary buttons become one long button.
 *
 * ## Groups of groups
 *
 * A group whose children are groups spaces them apart instead of joining
 * them, which is how a toolbar is built: one group per kind of action.
 */
import type { ComponentProps } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

export const buttonGroupVariants = tv({
  slots: {
    root: [
      'flex w-fit items-stretch',
      // A focused child draws its ring over its neighbours, not under them.
      '*:focus-visible:relative *:focus-visible:z-10',
      // Groups inside a group are spaced, not joined.
      'has-[>[data-slot=button-group]]:gap-2',
      // A field takes the room the buttons leave.
      '[&>[data-slot=input]]:min-w-0 [&>[data-slot=input]]:flex-1',
    ],
    separator: 'shrink-0 self-stretch bg-border',
    text: [
      'flex shrink-0 items-center gap-2 whitespace-nowrap border bg-muted font-medium text-muted-foreground shadow-xs dark:bg-input/30',
      '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
    ],
  },
  variants: {
    orientation: {
      horizontal: {
        root: [
          '[&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none',
          '[&>*:not(:first-child)]:border-l-0',
        ],
        separator: 'w-px',
      },
      vertical: {
        root: [
          'flex-col',
          '[&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none',
          '[&>*:not(:first-child)]:border-t-0',
        ],
        separator: 'h-px',
      },
    },
    /** Matches the heights of `Button` and `Input` at the same size. */
    size: {
      sm: { text: 'h-8 rounded-md px-2.5 text-[0.8125rem]' },
      md: { text: 'h-9 rounded-lg px-3 text-sm' },
      lg: { text: 'h-11 rounded-xl px-3.5 text-[0.9375rem]' },
    },
  },
  defaultVariants: { orientation: 'horizontal', size: 'md' },
});

export type ButtonGroupOrientation = NonNullable<
  VariantProps<typeof buttonGroupVariants>['orientation']
>;
export type ButtonGroupTextSize = NonNullable<VariantProps<typeof buttonGroupVariants>['size']>;

export interface ButtonGroupProps extends ComponentProps<'div'> {
  /** Lay the children out in a row or a column. Default `horizontal`. */
  orientation?: ButtonGroupOrientation;
}

/**
 * The group. It is a `role="group"`, so give it an `aria-label` that names
 * what its actions have in common.
 */
function ButtonGroupRoot({ orientation = 'horizontal', className, ...props }: ButtonGroupProps) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={buttonGroupVariants({ orientation }).root({ className })}
      {...props}
    />
  );
}
ButtonGroupRoot.displayName = 'ButtonGroup';

export interface ButtonGroupSeparatorProps extends ComponentProps<'span'> {
  /**
   * Which way the line runs. It follows the group: a row of buttons is divided
   * by upright lines, a column by flat ones. Default `vertical`, for a row.
   */
  orientation?: 'vertical' | 'horizontal';
}

/**
 * A line between two children that have no border to share, such as filled
 * buttons. It is decorative and hidden from assistive technology.
 */
function ButtonGroupSeparator({
  orientation = 'vertical',
  className,
  ...props
}: ButtonGroupSeparatorProps) {
  const slots = buttonGroupVariants({
    orientation: orientation === 'vertical' ? 'horizontal' : 'vertical',
  });
  return (
    <span
      aria-hidden="true"
      data-slot="button-group-separator"
      data-orientation={orientation}
      className={slots.separator({ className })}
      {...props}
    />
  );
}
ButtonGroupSeparator.displayName = 'ButtonGroup.Separator';

export interface ButtonGroupTextProps extends ComponentProps<'div'> {
  /** The height, matching the buttons and fields beside it. Default `md`. */
  size?: ButtonGroupTextSize;
}

/**
 * A cell that is read rather than pressed: a prefix such as `https://`, a unit,
 * or the value a pair of buttons changes.
 */
function ButtonGroupText({ size, className, ...props }: ButtonGroupTextProps) {
  return (
    <div
      data-slot="button-group-text"
      className={buttonGroupVariants({ size }).text({ className })}
      {...props}
    />
  );
}
ButtonGroupText.displayName = 'ButtonGroup.Text';

export const ButtonGroup = Object.assign(ButtonGroupRoot, {
  Separator: ButtonGroupSeparator,
  Text: ButtonGroupText,
});

export { ButtonGroupSeparator, ButtonGroupText };
