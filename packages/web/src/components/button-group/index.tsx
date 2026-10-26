/**
 * ButtonGroup — related actions held together in one control.
 *
 * ```tsx
 * <ButtonGroup aria-label="History">
 *   <Button variant="outline">Undo</Button>
 *   <Button variant="outline">Redo</Button>
 * </ButtonGroup>
 * ```
 *
 * ## A track, like the segmented Tabs
 *
 * The group is drawn the way the segmented `Tabs` are: a muted track with
 * rounded corners, and the buttons inside it at the radius one step smaller,
 * so every corner follows the track's. Outline and ghost buttons lie flat in
 * the track with muted labels; the one under the pointer rises out of it the
 * way the chosen tab does, and the short dividers on either side of it fade.
 * A field or a filled button keeps its own surface, so it reads as raised
 * from the start.
 *
 * It does this with child selectors rather than props, so any `Button`,
 * `Input`, `Menu.Trigger` or `ButtonGroup.Text` placed directly inside takes
 * part without being told to.
 *
 * ## Split buttons
 *
 * A group with a `ButtonGroup.Separator` in it is a split button instead: no
 * track, and its filled halves joined edge to edge, with the separator
 * carrying their fill across the seam.
 *
 * ## Groups of groups
 *
 * A group whose children are groups spaces them apart, which is how a
 * toolbar is built: one track per kind of action.
 */
import type { ComponentProps } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

/*
 * Which of the three a group is depends on what it holds, so the rules below
 * are scoped by selector rather than by prop:
 *
 *   track  &:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))
 *   split  &:has(>[data-slot=button-group-separator])
 *
 * Tailwind reads class names whole, so each selector is written out in full
 * in every class that uses it.
 */
export const buttonGroupVariants = tv({
  slots: {
    root: [
      'flex w-fit items-stretch',
      // A focused child draws its ring over its neighbours, not under them.
      '*:focus-visible:relative *:focus-visible:z-10',
      // A field takes the room the buttons leave.
      '[&>[data-slot=input]]:min-w-0 [&>[data-slot=input]]:flex-1',

      // The track, in the segmented Tabs' colour and radius. Its children
      // take the radius one step down, which is the track's less its padding.
      '[&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))]:gap-1 [&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))]:rounded-xl [&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))]:bg-muted [&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))]:p-1',
      '[&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>*]:relative [&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>*]:rounded-lg',
      // Outline and ghost buttons lie flat, with muted labels, and rise out
      // of the track under the pointer like the chosen tab.
      '[&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>:is([data-variant=outline],[data-variant=ghost])]:border-transparent [&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>:is([data-variant=outline],[data-variant=ghost])]:bg-transparent [&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>:is([data-variant=outline],[data-variant=ghost])]:text-muted-foreground [&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>:is([data-variant=outline],[data-variant=ghost])]:shadow-none',
      '[&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>:is([data-variant=outline],[data-variant=ghost]):hover:not(:disabled)]:bg-background [&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>:is([data-variant=outline],[data-variant=ghost]):hover:not(:disabled)]:text-foreground [&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>:is([data-variant=outline],[data-variant=ghost]):hover:not(:disabled)]:shadow-sm',
      '[&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>:is([data-variant=outline],[data-variant=ghost]):hover:not(:disabled)]:inset-ring [&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>:is([data-variant=outline],[data-variant=ghost]):hover:not(:disabled)]:inset-ring-foreground/[0.06]',
      'dark:[&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>:is([data-variant=outline],[data-variant=ghost]):hover:not(:disabled)]:bg-input dark:[&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>:is([data-variant=outline],[data-variant=ghost]):hover:not(:disabled)]:inset-ring-foreground/10',
      // Short dividers in the gaps, drawn by the second child of each pair so
      // the first never gets one. None beside a field, which has its own
      // edge, and none beside the child under the pointer.
      "[&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>*+*]:before:pointer-events-none [&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>*+*]:before:absolute [&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>*+*]:before:bg-foreground/10 [&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>*+*]:before:transition-opacity [&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>*+*]:before:duration-150 [&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>*+*]:before:content-['']",
      '[&>[data-slot=input]+*]:before:hidden [&>*+[data-slot=input]]:before:hidden',
      '[&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>*+*:hover:not(:disabled)]:before:opacity-0 [&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>*:hover:not(:disabled)+*]:before:opacity-0',

      // Groups inside a group are spaced, one track each.
      'has-[>[data-slot=button-group]]:gap-2',
    ],
    separator: [
      'relative shrink-0 self-stretch bg-border',
      // Between filled buttons the separator carries their fill across the
      // seam, and a short line in their text colour divides it.
      "before:absolute before:content-['']",
      'has-[+[data-variant=default]]:bg-primary has-[+[data-variant=default]]:before:bg-primary-foreground/25',
      'has-[+[data-variant=secondary]]:bg-secondary has-[+[data-variant=secondary]]:before:bg-secondary-foreground/15',
      'has-[+[data-variant=destructive]]:bg-destructive has-[+[data-variant=destructive]]:before:bg-white/30',
    ],
    text: [
      'relative flex shrink-0 items-center gap-2 whitespace-nowrap font-medium text-muted-foreground',
      '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
    ],
  },
  variants: {
    orientation: {
      horizontal: {
        root: [
          '[&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>*+*]:before:inset-y-2 [&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>*+*]:before:-left-0.5 [&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>*+*]:before:w-px',
          // A split button's halves meet edge to edge.
          '[&:has(>[data-slot=button-group-separator])>*:not(:first-child)]:rounded-l-none [&:has(>[data-slot=button-group-separator])>*:not(:last-child)]:rounded-r-none',
        ],
        separator: 'w-px before:inset-y-2 before:inset-x-0',
      },
      vertical: {
        root: [
          'flex-col',
          '[&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>*+*]:before:inset-x-2 [&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>*+*]:before:-top-0.5 [&:not(:has(>[data-slot=button-group-separator],>[data-slot=button-group]))>*+*]:before:h-px',
          '[&:has(>[data-slot=button-group-separator])>*:not(:first-child)]:rounded-t-none [&:has(>[data-slot=button-group-separator])>*:not(:last-child)]:rounded-b-none',
        ],
        separator: 'h-px before:inset-x-2 before:inset-y-0',
      },
    },
    /** Matches the heights of `Button` and `Input` at the same size. */
    size: {
      sm: { text: 'h-8 px-2.5 text-[0.8125rem]' },
      md: { text: 'h-9 px-3 text-sm' },
      lg: { text: 'h-11 px-3.5 text-[0.9375rem]' },
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
 * The divider of a split button. A group with one in it drops its track and
 * joins its children edge to edge. Before a primary, secondary or destructive
 * button the separator takes that button's fill, so the two halves read as
 * one, and draws a short line in the button's text colour. It is decorative
 * and hidden from assistive technology.
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
