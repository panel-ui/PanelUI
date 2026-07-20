import { forwardRef, type ReactNode } from 'react';
import type { View } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import {
  AnimatedPressable,
  type AnimatedPressableProps,
} from '../../primitives/animated-pressable';
import { Text } from '../../primitives/text';
import { IconColorProvider } from '../../icons';
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
      /** Neutral surface for third-party sign-in, sized for a full-width stack. */
      social: {
        root: 'border-input bg-card shadow-sm',
        label: 'text-foreground',
        spinner: 'border-muted border-t-foreground',
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

/**
 * The theme token each variant's content reads against. Icons in the content
 * slots inherit the resolved value, so they follow the theme automatically.
 *
 * `destructive` is absent on purpose: its background is a saturated red in
 * every theme, so its content is always white rather than a themed token.
 */
const CONTENT_COLOR_VAR: Record<
  Exclude<NonNullable<ButtonVariantProps['variant']>, 'destructive'>,
  string
> = {
  primary: '--color-primary-foreground',
  secondary: '--color-secondary-foreground',
  outline: '--color-foreground',
  ghost: '--color-foreground',
  social: '--color-foreground',
};

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

    // Icons in the content slots inherit this, so they stay legible when the
    // theme inverts the button's background. Without it every caller has to
    // hardcode a hex that is wrong in one theme or the other.
    const themedColor = useCSSVariable(
      CONTENT_COLOR_VAR[
        variant === 'destructive' ? 'primary' : (variant ?? 'primary')
      ]
    );
    const contentColor =
      variant === 'destructive'
        ? '#ffffff'
        : typeof themedColor === 'string'
          ? themedColor
          : undefined;

    return (
      <IconColorProvider color={contentColor}>
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
      </IconColorProvider>
    );
  }
);

Button.displayName = 'Button';
