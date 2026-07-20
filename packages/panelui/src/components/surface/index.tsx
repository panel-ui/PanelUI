/**
 * Surface — an elevated container.
 *
 * Adapted from: heroui-inc/heroui-native src/components/surface/
 * (the variant ladder and the nesting model for building hierarchy).
 *
 * Both the fill and the corner radius follow the active theme: the variants
 * resolve to themed `--color-surface-*` tokens, and `rounded-3xl` resolves
 * through the per-theme radius scale — so Moon's surfaces are tight and
 * Grass's are soft, without the component knowing anything about either.
 *
 * ```tsx
 * <Surface>
 *   <Surface variant="secondary">
 *     <Surface variant="tertiary">…</Surface>
 *   </Surface>
 * </Surface>
 * ```
 */
import { forwardRef } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';

const surfaceVariants = tv({
  base: 'overflow-hidden rounded-3xl p-4',
  variants: {
    variant: {
      default: 'bg-surface',
      secondary: 'bg-surface-secondary',
      tertiary: 'bg-surface-tertiary',
      transparent: 'bg-transparent',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface SurfaceProps
  extends ViewProps,
    VariantProps<typeof surfaceVariants> {
  className?: string;
}

export const Surface = forwardRef<View, SurfaceProps>(
  ({ className, variant, style, ...props }, ref) => (
    <View
      ref={ref}
      // `borderCurve` has no Tailwind equivalent. On iOS it gives the
      // continuous (squircle) corner Apple uses, which is visibly smoother
      // than a circular arc at this radius; Android ignores it.
      style={[styles.root, style]}
      className={surfaceVariants({ variant, className })}
      {...props}
    />
  )
);

Surface.displayName = 'Surface';

const styles = StyleSheet.create({
  root: { borderCurve: 'continuous' },
});
