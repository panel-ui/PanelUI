import { forwardRef, type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { Text, textChildren } from '../../primitives/text';
import type { ViewRef } from '../../primitives/refs';

const badgeVariants = tv({
  slots: {
    root: 'flex-row items-center justify-center gap-1 self-start rounded-sm border border-transparent',
    label: 'font-medium',
  },
  variants: {
    /*
     * Listed before `shape` on purpose. Later variants win a conflict, and a
     * dot or a count has to keep its own padding whatever size it is given;
     * their dimensions per size are the compound variants below.
     */
    size: {
      xs: { root: 'px-1 py-px', label: 'text-[10px]' },
      sm: { root: 'px-1.5 py-px', label: 'text-[11px]' },
      md: { root: 'px-2 py-0.5', label: 'text-xs' },
      lg: { root: 'px-2.5 py-1', label: 'text-sm' },
      xl: { root: 'px-3 py-1.5', label: 'text-base' },
    },
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
      destructive: {
        root: 'bg-destructive',
        label: 'text-destructive-solid-foreground',
      },
      success: { root: 'bg-success-subtle', label: 'text-success-foreground' },
      warning: { root: 'bg-warning-subtle', label: 'text-warning-foreground' },
      info: { root: 'bg-info-subtle', label: 'text-info-foreground' },
    },
  },
  compoundVariants: [
    { shape: 'dot', size: 'xs', class: { root: 'h-1 w-1' } },
    { shape: 'dot', size: 'sm', class: { root: 'h-1.5 w-1.5' } },
    { shape: 'dot', size: 'lg', class: { root: 'h-2.5 w-2.5' } },
    { shape: 'dot', size: 'xl', class: { root: 'h-3 w-3' } },
    { shape: 'count', size: 'xs', class: { root: 'h-3.5 min-w-3.5 px-1' } },
    { shape: 'count', size: 'sm', class: { root: 'h-4 min-w-4 px-1' } },
    { shape: 'count', size: 'lg', class: { root: 'h-6 min-w-6 px-2' } },
    { shape: 'count', size: 'xl', class: { root: 'h-7 min-w-7 px-2' } },
  ],
  defaultVariants: {
    variant: 'default',
    shape: 'default',
    size: 'md',
  },
});

/** How big a badge is. */
export type BadgeSize = NonNullable<VariantProps<typeof badgeVariants>['size']>;

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

export const Badge = forwardRef<ViewRef, BadgeProps>(
  ({ children, className, labelClassName, variant, shape, size, count, ...props }, ref) => {
    const resolvedShape = shape ?? (count !== undefined ? 'count' : 'default');
    const { root, label } = badgeVariants({ variant, shape: resolvedShape, size });

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
        {resolvedShape === 'dot'
          ? null
          : textChildren(content, (text) => (
              <Text className={label({ className: labelClassName })}>{text}</Text>
            ))}
      </View>
    );
  }
);

Badge.displayName = 'Badge';
