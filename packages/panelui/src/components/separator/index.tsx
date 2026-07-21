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
 * ```
 *
 * A vertical separator takes its length from the parent, so the parent needs a
 * height — inside a `flex-row` with `items-stretch`, or with an explicit `h-*`
 * on either the row or the separator itself. Without one it measures zero and
 * nothing draws.
 */
import { forwardRef } from 'react';
import { View, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';

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
   * two groups of menu items, say — and it is announced instead.
   */
  decorative?: boolean;
}

export const Separator = forwardRef<View, SeparatorProps>(
  (
    {
      className,
      orientation = 'horizontal',
      variant,
      thickness,
      decorative = true,
      style,
      ...props
    },
    ref
  ) => (
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
  )
);

Separator.displayName = 'Separator';
