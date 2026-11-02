/**
 * Separator — a rule between content.
 *
 * React Native has no `<hr>` and no border shorthand that survives a flex row,
 * so a separator here is a view with a size on one axis and a stretch on the
 * other. That is why orientation is a prop rather than something the layout
 * infers: the component has to know which axis carries the thickness.
 *
 * ```tsx
 * <Separator />
 * <Separator orientation="vertical" />
 * <Separator>or</Separator>
 * ```
 *
 * A vertical separator takes its length from the parent, so the parent needs a
 * height — inside a `flex-row` with `items-stretch`, or with an explicit `h-*`
 * on either the row or the separator itself. Without one it measures zero and
 * nothing draws.
 *
 * Passing children turns it into a *labelled* separator: the rule breaks around
 * centred content — the "or continue with" divider in a sign-in form. Only the
 * horizontal axis carries a label, because a stacked word is not a divider; a
 * vertical separator ignores its children and stays a plain hairline.
 */
import { forwardRef, isValidElement, type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';
import type { ViewRef } from '../../primitives/refs';

const separatorVariants = tv({
  base: 'bg-border',
  variants: {
    orientation: {
      horizontal: 'w-full',
      vertical: 'h-full',
    },
    variant: {
      thin: '',
      thick: '',
    },
  },
  compoundVariants: [
    // Thickness is on whichever axis is *not* the length, so it cannot be
    // expressed by the orientation and variant classes independently.
    { orientation: 'horizontal', variant: 'thin', class: 'h-px' },
    { orientation: 'horizontal', variant: 'thick', class: 'h-1' },
    { orientation: 'vertical', variant: 'thin', class: 'w-px' },
    { orientation: 'vertical', variant: 'thick', class: 'w-1' },
  ],
  defaultVariants: {
    orientation: 'horizontal',
    variant: 'thin',
  },
});

export interface SeparatorProps
  extends ViewProps,
    VariantProps<typeof separatorVariants> {
  className?: string;
  /**
   * Thickness in pixels, overriding the variant. Sets the height of a
   * horizontal separator and the width of a vertical one.
   */
  thickness?: number;
  /**
   * Whether the separator is only visual. A decorative separator is skipped by
   * screen readers; set false when the split itself carries meaning — between
   * two groups of menu items, say — and it is announced instead. A labelled
   * separator is never decorative: its label is content, so it is always read.
   */
  decorative?: boolean;
  /**
   * Optional label sitting in the break of a horizontal rule — the "or"
   * between two sign-in paths. A bare string is wrapped in the muted label
   * style; an element is rendered as-is. Ignored on the vertical axis, where a
   * label is not a divider.
   */
  children?: ReactNode;
  /** Styles the label text of a labelled separator. */
  labelClassName?: string;
}

export const Separator = forwardRef<ViewRef, SeparatorProps>(
  (
    {
      className,
      labelClassName,
      orientation = 'horizontal',
      variant,
      thickness,
      decorative = true,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const hasLabel =
      orientation === 'horizontal' && children != null && children !== false;

    // Labelled: two rules flanking centred content. The label carries meaning,
    // so the row announces itself as a separator regardless of `decorative`,
    // and the flanking rules are hidden from the reader. Here `className`
    // styles the wrapping row and `labelClassName` the text.
    if (hasLabel) {
      const rule = separatorVariants({ orientation, variant });
      const ruleStyle =
        thickness !== undefined ? { height: thickness } : undefined;

      return (
        <View
          ref={ref}
          role="separator"
          aria-orientation="horizontal"
          className={cn('w-full flex-row items-center gap-3', className)}
          style={style}
          {...props}
        >
          <View aria-hidden className={rule} style={[styles.flex, ruleStyle]} />
          {isValidElement(children) ? (
            children
          ) : (
            <Text size="xs" muted className={labelClassName}>
              {children}
            </Text>
          )}
          <View aria-hidden className={rule} style={[styles.flex, ruleStyle]} />
        </View>
      );
    }

    return (
      <View
        ref={ref}
        // `role` rather than `accessibilityRole` — React Native's older role list
        // has no separator, the ARIA-aligned one does.
        role={decorative ? 'none' : 'separator'}
        accessible={!decorative}
        aria-orientation={decorative ? undefined : orientation}
        className={separatorVariants({ orientation, variant, className })}
        style={
          thickness !== undefined
            ? [orientation === 'horizontal' ? { height: thickness } : { width: thickness }, style]
            : style
        }
        {...props}
      />
    );
  }
);

Separator.displayName = 'Separator';

const styles = { flex: { flex: 1 } } as const;
