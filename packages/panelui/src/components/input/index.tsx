import { forwardRef, useCallback, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { tv } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { Text } from '../../primitives/text';

const inputVariants = tv({
  slots: {
    container: 'w-full gap-1.5',
    field:
      'h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground dark:bg-white/4',
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

    return (
      <View className={slots.container({ className: containerClassName })}>
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
      </View>
    );
  }
);

Input.displayName = 'Input';
