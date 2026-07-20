import { forwardRef, type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { Text } from '../../primitives/text';

const badgeVariants = tv({
  slots: {
    root: 'flex-row items-center justify-center gap-1 self-start rounded-sm border border-transparent px-2 py-0.5',
    label: 'text-xs font-medium',
  },
  variants: {
    shape: {
      default: {},
      /** A bare status dot, no label. */
      dot: { root: 'h-2 w-2 rounded-full px-0 py-0' },
      /** Circular, for a count sitting over an avatar or an icon. */
      count: { root: 'h-5 min-w-5 rounded-full px-1.5 py-0' },
    },
    variant: {
      default: { root: 'bg-primary', label: 'text-primary-foreground' },
      secondary: { root: 'bg-secondary', label: 'text-secondary-foreground' },
      outline: { root: 'border-border bg-transparent', label: 'text-foreground' },
      destructive: { root: 'bg-destructive', label: 'text-white' },
      success: { root: 'bg-success-subtle', label: 'text-success-foreground' },
      warning: { root: 'bg-warning-subtle', label: 'text-warning-foreground' },
      info: { root: 'bg-info-subtle', label: 'text-info-foreground' },
    },
  },
  defaultVariants: {
    variant: 'default',
    shape: 'default',
  },
});

/** Counts past this render as "99+" so the badge keeps its shape. */
const MAX_COUNT = 99;

export interface BadgeProps
  extends ViewProps,
    VariantProps<typeof badgeVariants> {
  children?: ReactNode;
  className?: string;
  labelClassName?: string;
  /**
   * Renders a number instead of children, clamped to "99+". Implies the
   * `count` shape unless you set one.
   */
  count?: number;
}

export const Badge = forwardRef<View, BadgeProps>(
  ({ children, className, labelClassName, variant, shape, count, ...props }, ref) => {
    const resolvedShape = shape ?? (count !== undefined ? 'count' : 'default');
    const { root, label } = badgeVariants({ variant, shape: resolvedShape });

    const content =
      count !== undefined
        ? `${Math.min(count, MAX_COUNT)}${count > MAX_COUNT ? '+' : ''}`
        : children;

    return (
      <View
        ref={ref}
        accessibilityLabel={
          count !== undefined ? `${count} unread` : undefined
        }
        className={root({ className })}
        {...props}
      >
        {resolvedShape === 'dot' ? null : typeof content === 'string' ? (
          <Text className={label({ className: labelClassName })}>{content}</Text>
        ) : (
          content
        )}
      </View>
    );
  }
);

Badge.displayName = 'Badge';
