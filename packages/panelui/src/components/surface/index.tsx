/**
 * Surface — an elevated container.
 *
 * The variants form a ladder rather than a palette: each step is one level
 * further from the background, and nesting them is how you build depth without
 * hardcoding a colour anywhere.
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
  base: 'overflow-hidden rounded-3xl',
  variants: {
    variant: {
      default: 'bg-surface',
      secondary: 'bg-surface-secondary',
      tertiary: 'bg-surface-tertiary',
      transparent: 'bg-transparent',
    },
    padding: {
      none: '',
      sm: 'p-2.5',
      default: 'p-4',
      lg: 'p-6',
    },
    bordered: {
      true: 'border border-border',
    },
    elevated: {
      true: 'shadow-sm',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'default',
  },
});

export interface SurfaceProps
  extends ViewProps,
    VariantProps<typeof surfaceVariants> {
  className?: string;
  /**
   * A hairline border. A surface the same colour as what it sits on needs one
   * to read as a distinct plane rather than dissolving into the background.
   */
  bordered?: boolean;
  /**
   * A soft shadow lifting the surface off the page. Off by default because a
   * nested surface reads its depth from its fill, not from a shadow it would
   * only cast onto its parent.
   */
  elevated?: boolean;
  /** Inner spacing. `none` is for a surface wrapping a bled image or a chart. */
  padding?: 'none' | 'sm' | 'default' | 'lg';
}

export const Surface = forwardRef<View, SurfaceProps>(
  ({ className, variant, padding, bordered, elevated, style, ...props }, ref) => (
    <View
      ref={ref}
      // `borderCurve` has no Tailwind equivalent. On iOS it gives the
      // continuous (squircle) corner Apple uses, which is visibly smoother
      // than a circular arc at this radius; Android ignores it.
      style={[styles.root, style]}
      className={surfaceVariants({ variant, padding, bordered, elevated, className })}
      {...props}
    />
  )
);

Surface.displayName = 'Surface';

const styles = StyleSheet.create({
  root: { borderCurve: 'continuous' },
});
