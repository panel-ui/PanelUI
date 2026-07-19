import { forwardRef, isValidElement, type ReactNode } from 'react';
import type { View } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import {
  AnimatedPressable,
  type AnimatedPressableProps,
} from '../../primitives/animated-pressable';
import { Text } from '../../primitives/text';

const buttonVariants = tv({
  slots: {
    root: 'flex-row items-center justify-center gap-2 rounded-lg border border-transparent',
    label: 'font-medium',
  },
  variants: {
    variant: {
      primary: {
        root: 'border-primary bg-primary shadow-sm',
        label: 'text-primary-foreground',
      },
      secondary: {
        root: 'bg-black/6 dark:bg-white/10',
        label: 'text-foreground',
      },
      outline: {
        root: 'border-input bg-popover shadow-sm',
        label: 'text-foreground',
      },
      ghost: {
        root: 'bg-transparent',
        label: 'text-foreground',
      },
      destructive: {
        root: 'border-destructive bg-destructive shadow-sm',
        label: 'text-white',
      },
    },
    size: {
      sm: { root: 'h-9 gap-1.5 px-2.5', label: 'text-sm' },
      md: { root: 'h-11 px-4', label: 'text-base' },
      lg: { root: 'h-12 px-6', label: 'text-lg' },
      icon: { root: 'h-11 w-11 px-0' },
    },
    disabled: {
      true: { root: 'opacity-[0.64]' },
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export interface ButtonProps
  extends Omit<AnimatedPressableProps, 'children' | 'disabled'>,
    Omit<ButtonVariantProps, 'disabled'> {
  children?: ReactNode;
  disabled?: boolean;
  /** Extra classes for the label when children is a string. */
  labelClassName?: string;
}

export const Button = forwardRef<View, ButtonProps>(
  (
    { children, className, labelClassName, variant, size, disabled, ...props },
    ref
  ) => {
    const { root, label } = buttonVariants({ variant, size, disabled: !!disabled });

    return (
      <AnimatedPressable
        ref={ref}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        className={root({ className })}
        {...props}
      >
        {typeof children === 'string' ? (
          <Text className={label({ className: labelClassName })}>{children}</Text>
        ) : isValidElement(children) ? (
          children
        ) : (
          children
        )}
      </AnimatedPressable>
    );
  }
);

Button.displayName = 'Button';
