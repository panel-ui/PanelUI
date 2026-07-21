import { forwardRef, useCallback, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { tv } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { KeyboardAvoider } from '../../primitives/keyboard-avoider';
import { Text } from '../../primitives/text';

const inputVariants = tv({
  slots: {
    container: 'w-full gap-1.5',
    field:
      'h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground',
    label: 'text-sm font-medium text-foreground',
    description: 'text-sm text-muted-foreground',
    error: 'text-sm text-destructive',
  },
  variants: {
    focused: {
      true: { field: 'border-ring' },
    },
    invalid: {
      true: { field: 'border-destructive/40' },
    },
    disabled: {
      true: { field: 'opacity-[0.64]' },
    },
  },
});

export interface InputProps extends TextInputProps {
  className?: string;
  containerClassName?: string;
  label?: string;
  description?: string;
  /** Error message. When set, the field renders in its invalid state. */
  errorMessage?: string;
  disabled?: boolean;
  /**
   * Lift the field above the software keyboard when it would otherwise be
   * covered. Moves by exactly the overlap, and not at all when the field is
   * already clear.
   *
   * Install `react-native-keyboard-controller` for this to behave on Android.
   *
   * Do not toggle this at runtime — it changes which component renders the
   * container, which would remount the field and drop focus.
   */
  avoidKeyboard?: boolean;
  /** Gap kept between the field and the keyboard when `avoidKeyboard` is set. */
  keyboardOffset?: number;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      className,
      containerClassName,
      label,
      description,
      errorMessage,
      disabled,
      avoidKeyboard = false,
      keyboardOffset = 16,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);
    const placeholderColor = useCSSVariable('--color-muted-foreground');
    const slots = inputVariants({
      focused,
      invalid: !!errorMessage,
      disabled: !!disabled,
    });

    const handleFocus = useCallback<NonNullable<TextInputProps['onFocus']>>(
      (event) => {
        setFocused(true);
        onFocus?.(event);
      },
      [onFocus]
    );

    const handleBlur = useCallback<NonNullable<TextInputProps['onBlur']>>(
      (event) => {
        setFocused(false);
        onBlur?.(event);
      },
      [onBlur]
    );

    const body = (
      <>
        {label ? <Text className={slots.label()}>{label}</Text> : null}
        <TextInput
          ref={ref}
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          accessibilityLabel={label}
          accessibilityState={{ disabled: !!disabled }}
          className={slots.field({ className })}
          placeholderTextColor={
            typeof placeholderColor === 'string' ? placeholderColor : undefined
          }
          {...props}
        />
        {errorMessage ? (
          <Text className={slots.error()}>{errorMessage}</Text>
        ) : description ? (
          <Text className={slots.description()}>{description}</Text>
        ) : null}
      </>
    );

    const containerClasses = slots.container({ className: containerClassName });

    /*
     * The keyboard hook is deliberately behind a component boundary rather
     * than an `enabled` flag. Calling it at all has global consequences —
     * without the keyboard controller installed it falls back to Reanimated's
     * useAnimatedKeyboard, which switches Android out of adjustResize for the
     * whole app. A field that never asked to avoid the keyboard must not do
     * that to every other screen.
     */
    if (avoidKeyboard) {
      return (
        <KeyboardAvoider offset={keyboardOffset} className={containerClasses}>
          {body}
        </KeyboardAvoider>
      );
    }

    return <View className={containerClasses}>{body}</View>;
  }
);

Input.displayName = 'Input';
