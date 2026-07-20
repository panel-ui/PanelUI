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
  },
});

export interface BadgeProps
  extends ViewProps,
    VariantProps<typeof badgeVariants> {
  children?: ReactNode;
  className?: string;
  labelClassName?: string;
}

export const Badge = forwardRef<View, BadgeProps>(
  ({ children, className, labelClassName, variant, ...props }, ref) => {
    const { root, label } = badgeVariants({ variant });

    return (
      <View ref={ref} className={root({ className })} {...props}>
        {typeof children === 'string' ? (
          <Text className={label({ className: labelClassName })}>{children}</Text>
        ) : (
          children
        )}
      </View>
    );
  }
);

Badge.displayName = 'Badge';
