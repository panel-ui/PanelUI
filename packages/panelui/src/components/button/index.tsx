import { forwardRef, type ReactNode } from 'react';
import type { View } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import {
  AnimatedPressable,
  type AnimatedPressableProps,
} from '../../primitives/animated-pressable';
import { Text } from '../../primitives/text';
import { Spinner } from '../spinner';

const buttonVariants = tv({
  slots: {
    root: 'flex-row items-center justify-center gap-2 rounded-lg border border-transparent',
    label: 'font-medium',
    spinner: '',
  },
  variants: {
    variant: {
      primary: {
        root: 'border-primary bg-primary shadow-sm',
        label: 'text-primary-foreground',
        spinner: 'border-primary-foreground/32 border-t-primary-foreground',
      },
      secondary: {
        root: 'bg-secondary',
        label: 'text-secondary-foreground',
        spinner: 'border-secondary-foreground/24 border-t-secondary-foreground',
      },
      outline: {
        root: 'border-input bg-popover shadow-sm',
        label: 'text-foreground',
        spinner: 'border-muted border-t-foreground',
      },
      ghost: {
        root: 'bg-transparent',
        label: 'text-foreground',
        spinner: 'border-muted border-t-foreground',
      },
      destructive: {
        root: 'border-destructive bg-destructive shadow-sm',
        label: 'text-white',
        spinner: 'border-white/32 border-t-white',
      },
    },
    size: {
      sm: { root: 'h-9 gap-1.5 px-2.5', label: 'text-sm' },
      md: { root: 'h-11 px-4', label: 'text-base' },
      lg: { root: 'h-12 px-6', label: 'text-lg' },
      icon: { root: 'h-11 w-11 px-0' },
    },
    fullWidth: {
      true: { root: 'w-full' },
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

const SPINNER_SIZE = { sm: 'sm', md: 'sm', lg: 'md', icon: 'sm' } as const;

export interface ButtonProps
  extends Omit<AnimatedPressableProps, 'children' | 'disabled'>,
    Omit<ButtonVariantProps, 'disabled'> {
  children?: ReactNode;
  disabled?: boolean;
  /** Show a spinner and block presses while an action is in flight. */
  loading?: boolean;
  /** Content rendered before the label (replaced by the spinner while loading). */
  startContent?: ReactNode;
  /** Content rendered after the label. */
  endContent?: ReactNode;
  /** Extra classes for the label when children is a string. */
  labelClassName?: string;
}

export const Button = forwardRef<View, ButtonProps>(
  (
    {
      children,
      className,
      labelClassName,
      variant,
      size,
      fullWidth,
      disabled,
      loading = false,
      startContent,
      endContent,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const { root, label, spinner } = buttonVariants({
      variant,
      size,
      fullWidth,
      disabled: isDisabled,
    });

    return (
      <AnimatedPressable
        ref={ref}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        className={root({ className })}
        {...props}
      >
        {loading ? (
          <Spinner size={SPINNER_SIZE[size ?? 'md']} className={spinner()} />
        ) : (
          startContent
        )}
        {typeof children === 'string' ? (
          <Text className={label({ className: labelClassName })}>{children}</Text>
        ) : (
          children
        )}
        {endContent}
      </AnimatedPressable>
    );
  }
);

Button.displayName = 'Button';
