/**
 * Input — a text field with a label, a description and an error line.
 *
 * The field's focus state is animated rather than switched. A border that
 * snaps between two colours reads as a redraw; one that crosses over in
 * 150ms reads as the field responding to you. The interpolation runs on the
 * UI thread, so it costs nothing and keeps up with a fast tab through a form.
 *
 * Two backgrounds, because a field's job changes with what surrounds it:
 * `outline` sits on the page and draws its own edge; `filled` sits inside a
 * card or a sheet, where a second border next to the container's own reads as
 * a seam.
 *
 * ```tsx
 * <Input label="Email" placeholder="you@example.com" />
 * <Input variant="filled" size="lg" label="Name" isRequired />
 * ```
 *
 * For a field with an icon or a button attached, reach for `InputGroup` — it
 * measures its decorators and pads this field around them.
 */
import { forwardRef, useCallback, useEffect, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import type { KeyboardAvoidanceMode } from '../../hooks/use-keyboard-avoidance';
import { KeyboardAvoider } from '../../primitives/keyboard-avoider';
import { Text } from '../../primitives/text';
import { Label } from '../label';

/** Long enough to read as a transition, short enough not to lag a fast tab. */
const FOCUS_DURATION = 150;

const inputVariants = tv({
  slots: {
    container: 'w-full gap-1.5',
    field: 'w-full rounded-lg border text-foreground',
    description: 'text-sm text-muted-foreground',
    error: 'text-sm text-destructive',
  },
  variants: {
    variant: {
      // The border colour is animated, so it is deliberately not set here —
      // only the background and the resting border width belong to the class.
      outline: { field: 'bg-background' },
      filled: { field: 'bg-muted' },
    },
    size: {
      sm: { field: 'h-10 px-3 text-sm' },
      md: { field: 'h-12 px-3.5 text-base' },
      lg: { field: 'h-14 px-4 text-base' },
    },
    multiline: {
      // A multiline field grows, so a fixed height would crop it. Text starts
      // at the top rather than floating in the middle of an empty box.
      true: { field: 'h-auto min-h-24 py-3' },
    },
    disabled: {
      true: { field: 'opacity-[0.64]' },
    },
  },
  defaultVariants: {
    variant: 'outline',
    size: 'md',
  },
});

type InputVariantProps = VariantProps<typeof inputVariants>;

export interface InputProps
  extends TextInputProps,
    Omit<InputVariantProps, 'disabled' | 'multiline'> {
  className?: string;
  containerClassName?: string;
  label?: string;
  description?: string;
  /** Error message. When set, the field renders in its invalid state. */
  errorMessage?: string;
  /** Marks the field required — an asterisk on the label, and the a11y state. */
  isRequired?: boolean;
  disabled?: boolean;
  /**
   * Keep the field clear of the software keyboard. Moves by exactly the
   * overlap, and not at all when the field is already clear — or when the
   * keyboard belongs to a different field. The overlap is re-read every frame
   * while the field is focused, so the field keeps its place in the page as it
   * scrolls under and back out of the keyboard.
   *
   * Install `react-native-keyboard-controller` for this to behave on Android.
   *
   * Do not toggle this at runtime — it changes which component renders the
   * container, which would remount the field and drop focus.
   */
  avoidKeyboard?: boolean;
  /**
   * How the field gets clear. `lift` moves it up by its overlap and follows
   * the scroll — right for a field in the flow of a page. `dock` makes it
   * travel with the keyboard, for a composer already pinned near the bottom
   * edge; pair it with `keyboardBottomInset`.
   */
  keyboardMode?: KeyboardAvoidanceMode;
  /** Gap kept between the field and the keyboard. `keyboardMode="lift"` only. */
  keyboardOffset?: number;
  /**
   * How far above the bottom edge the field already sits — usually the safe
   * area inset. `keyboardMode="dock"` only.
   */
  keyboardBottomInset?: number;
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      className,
      containerClassName,
      label,
      description,
      errorMessage,
      isRequired,
      disabled,
      variant,
      size,
      avoidKeyboard = false,
      keyboardMode = 'lift',
      keyboardOffset = 16,
      keyboardBottomInset = 0,
      onFocus,
      onBlur,
      style,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);
    const invalid = !!errorMessage;

    const placeholderColor = useCSSVariable('--color-muted-foreground');
    const restColor = useCSSVariable('--color-input');
    const focusColor = useCSSVariable('--color-ring');
    const errorColor = useCSSVariable('--color-destructive');

    const slots = inputVariants({
      variant,
      size,
      multiline: !!props.multiline,
      disabled: !!disabled,
    });

    /*
     * Border colour is driven by one 0..1 value rather than by a class per
     * state. Uniwind can only swap a class wholesale, which is the snap this
     * is here to avoid, and a shared value crosses between the two colours on
     * the UI thread without a re-render.
     */
    const focus = useSharedValue(0);
    useEffect(() => {
      focus.value = withTiming(focused ? 1 : 0, { duration: FOCUS_DURATION });
    }, [focused, focus]);

    const resting = typeof restColor === 'string' ? restColor : '#e5e5e5';
    const active = invalid
      ? typeof errorColor === 'string'
        ? errorColor
        : '#ef4444'
      : typeof focusColor === 'string'
        ? focusColor
        : '#a3a3a3';
    // An invalid field is tinted even at rest — the error is a fact about the
    // value, not about whether the field happens to be focused.
    const idle = invalid ? active : resting;

    const borderStyle = useAnimatedStyle(() => ({
      borderColor: interpolateColor(focus.value, [0, 1], [idle, active]),
    }));

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
        {label ? (
          <Label isRequired={isRequired} isInvalid={invalid} isDisabled={!!disabled}>
            {label}
          </Label>
        ) : null}
        <AnimatedTextInput
          ref={ref}
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          accessibilityLabel={label}
          accessibilityState={{ disabled: !!disabled }}
          aria-required={isRequired}
          aria-invalid={invalid}
          className={slots.field({ className })}
          // Caller styles come last so InputGroup can pad the field around its
          // decorators, but never last enough to drop the animated border.
          style={[borderStyle, style]}
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
        <KeyboardAvoider
          // Only while *this* field is the one being typed into. Without it
          // every avoiding field on the screen lifts the moment any field
          // anywhere is tapped, and since they all aim at the same gap above
          // the keyboard, they arrive stacked on top of one another.
          active={focused}
          mode={keyboardMode}
          offset={keyboardOffset}
          bottomInset={keyboardBottomInset}
          className={containerClasses}
        >
          {body}
        </KeyboardAvoider>
      );
    }

    return <View className={containerClasses}>{body}</View>;
  }
);

Input.displayName = 'Input';
