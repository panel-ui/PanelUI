/**
 * OtpInput — a one-time-code field drawn as a row of separate cells.
 *
 * The problem this solves is that a code is read and typed one character at a
 * time, and a single text box hides that: you cannot see, at a glance, how
 * many digits are left. So the value is spread across `length` cells, each its
 * own box, and the caret sits in the cell you are about to fill.
 *
 * There is still exactly one text field underneath — a transparent input laid
 * over the whole row — because the software keyboard, autofill and paste all
 * belong to a real `TextInput`, and splitting the value across N inputs fights
 * every one of them. The cells are drawn from the value; the input owns it.
 * Tapping any cell focuses that one input, so the platform never sees the seam.
 *
 * The active cell's border crosses to the focus colour on the UI thread rather
 * than snapping, matching the rest of the field family, and a caret blinks in
 * the cell awaiting input. Each digit zooms in as it lands, so a fast type or a
 * one-tap autofill reads as the code arriving rather than the box redrawing.
 *
 * ```tsx
 * const [code, setCode] = useState('');
 * <OtpInput value={code} onChangeText={setCode} onComplete={submit} />
 * <OtpInput length={4} mask groupEvery={2} type="numeric" />
 * ```
 */
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { Text } from '../../primitives/text';

/** Long enough to read as a transition, short enough not to lag a fast type. */
const FOCUS_DURATION = 150;
/** A caret that is on for the same time it is off reads as a resting cursor. */
const CARET_PERIOD = 560;

const otpVariants = tv({
  slots: {
    container: 'gap-1.5',
    row: 'flex-row items-center',
    cell: 'items-center justify-center rounded-lg border border-input bg-background',
    char: 'text-foreground',
    caret: 'w-0.5 rounded-full bg-foreground',
    separator: 'h-0.5 rounded-full bg-border',
    error: 'text-sm text-destructive',
  },
  variants: {
    size: {
      sm: { cell: 'h-10 w-9', char: 'text-base', caret: 'h-5', separator: 'w-2' },
      md: { cell: 'h-12 w-11', char: 'text-lg', caret: 'h-6', separator: 'w-2.5' },
      lg: { cell: 'h-14 w-12', char: 'text-xl', caret: 'h-7', separator: 'w-3' },
    },
    disabled: {
      true: { row: 'opacity-[0.64]' },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

type OtpVariantProps = VariantProps<typeof otpVariants>;

export interface OtpInputProps
  extends Omit<
      TextInputProps,
      'value' | 'defaultValue' | 'onChangeText' | 'maxLength' | 'children'
    >,
    Omit<OtpVariantProps, 'disabled'> {
  className?: string;
  /** Class applied to every cell — for a taller box or a different radius. */
  cellClassName?: string;
  /** How many cells, i.e. the length of the code. */
  length?: number;
  /** Controlled value. Longer strings and stray characters are trimmed to fit. */
  value?: string;
  /** Starting value when the field manages its own state. */
  defaultValue?: string;
  onChangeText?: (value: string) => void;
  /** Fires once, the moment the last cell is filled. */
  onComplete?: (value: string) => void;
  /**
   * What the keyboard offers and what the field accepts. `numeric` keeps
   * digits only and asks for the number pad; `text` accepts any character.
   */
  type?: 'numeric' | 'text';
  /** Hide each filled character behind a dot, the way a passcode field does. */
  mask?: boolean;
  /** A single character shown, dimmed, in every cell still waiting for input. */
  placeholder?: string;
  /** Draw a separator between groups of this many cells — 3 gives `xxx — xxx`. */
  groupEvery?: number;
  disabled?: boolean;
  /** Tint the field in its error colour and announce it as invalid. */
  isInvalid?: boolean;
  /** Error line under the field. Setting it also puts the field in its invalid state. */
  errorMessage?: string;
  /** Announced by a screen reader as the field's name. */
  accessibilityLabel?: string;
}

interface CellProps {
  char: string;
  active: boolean;
  focused: boolean;
  mask: boolean;
  placeholder?: string;
  invalid: boolean;
  className: string;
  charClassName: string;
  caretClassName: string;
}

/**
 * One box. It owns three animations, all on the UI thread: the border crossing
 * to the focus (or error) colour when it becomes the active cell, the caret
 * blinking while it waits, and the entrance of the character that lands in it.
 */
function OtpCell({
  char,
  active,
  focused,
  mask,
  placeholder,
  invalid,
  className,
  charClassName,
  caretClassName,
}: CellProps) {
  const restColor = useCSSVariable('--color-input');
  const focusColor = useCSSVariable('--color-ring');
  const errorColor = useCSSVariable('--color-destructive');
  const placeholderColor = useCSSVariable('--color-muted-foreground');

  const resting = typeof restColor === 'string' ? restColor : '#e5e5e5';
  const activeColor = invalid
    ? typeof errorColor === 'string'
      ? errorColor
      : '#ef4444'
    : typeof focusColor === 'string'
      ? focusColor
      : '#a3a3a3';
  // An invalid field carries its tint even when it is not the active cell —
  // the error is a fact about the value, not about where the caret happens to be.
  const idle = invalid ? activeColor : resting;

  const lit = active && focused;

  const border = useSharedValue(lit ? 1 : 0);
  useEffect(() => {
    border.value = withTiming(lit ? 1 : 0, { duration: FOCUS_DURATION });
  }, [lit, border]);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(border.value, [0, 1], [idle, activeColor]),
    // A ring only when lit — the resting cells keep their hairline.
    borderWidth: 1 + border.value,
  }));

  const caret = useSharedValue(0);
  useEffect(() => {
    if (lit && char.length === 0) {
      caret.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1 }),
          withTiming(1, { duration: CARET_PERIOD }),
          withTiming(0, { duration: CARET_PERIOD })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(caret);
      caret.value = 0;
    }
    return () => cancelAnimation(caret);
  }, [lit, char.length, caret]);

  const caretStyle = useAnimatedStyle(() => ({ opacity: caret.value }));

  return (
    <Animated.View style={borderStyle} className={className}>
      {char.length > 0 ? (
        <Animated.Text
          // Keyed by the character so a change re-mounts and replays the pop.
          key={char}
          entering={ZoomIn.duration(140)}
          className={charClassName}
        >
          {mask ? '•' : char}
        </Animated.Text>
      ) : lit ? (
        <Animated.View
          style={caretStyle}
          className={caretClassName}
          pointerEvents="none"
        />
      ) : placeholder ? (
        <Text
          className={charClassName}
          style={{
            color:
              typeof placeholderColor === 'string' ? placeholderColor : '#a3a3a3',
          }}
        >
          {placeholder}
        </Text>
      ) : null}
    </Animated.View>
  );
}

/** Clamp and filter a raw string down to what this field will hold. */
function sanitize(raw: string, length: number, type: 'numeric' | 'text'): string {
  const filtered = type === 'numeric' ? raw.replace(/[^0-9]/g, '') : raw;
  return filtered.slice(0, length);
}

export const OtpInput = forwardRef<TextInput, OtpInputProps>(
  (
    {
      className,
      cellClassName,
      length = 6,
      value: valueProp,
      defaultValue = '',
      onChangeText,
      onComplete,
      type = 'numeric',
      mask = false,
      placeholder,
      groupEvery = 0,
      size,
      disabled,
      isInvalid,
      errorMessage,
      accessibilityLabel,
      onFocus,
      onBlur,
      style,
      ...props
    },
    ref
  ) => {
    const controlled = valueProp != null;
    const [internal, setInternal] = useState(() =>
      sanitize(defaultValue, length, type)
    );
    const value = sanitize(controlled ? valueProp! : internal, length, type);
    const invalid = isInvalid || !!errorMessage;

    const [focused, setFocused] = useState(false);
    const inputRef = useRef<TextInput | null>(null);

    // A one-shot guard so onComplete fires on the transition to full, not on
    // every keystroke that leaves the field full (e.g. a trailing focus event).
    const completedRef = useRef(false);

    const slots = otpVariants({ size, disabled: !!disabled });

    const setRef = useCallback(
      (node: TextInput | null) => {
        inputRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );

    const handleChange = useCallback(
      (raw: string) => {
        const next = sanitize(raw, length, type);
        if (!controlled) setInternal(next);
        onChangeText?.(next);
        if (next.length === length) {
          if (!completedRef.current) {
            completedRef.current = true;
            onComplete?.(next);
          }
        } else {
          completedRef.current = false;
        }
      },
      [controlled, length, type, onChangeText, onComplete]
    );

    // Keep the guard honest when the value is driven from outside (a reset, a
    // paste through the controlled prop) rather than through the keyboard.
    useEffect(() => {
      completedRef.current = value.length === length;
    }, [value.length, length]);

    const focus = useCallback(() => {
      if (!disabled) inputRef.current?.focus();
    }, [disabled]);

    const activeIndex = Math.min(value.length, length - 1);

    const cells = useMemo(() => Array.from({ length }, (_, i) => i), [length]);

    return (
      <View className={slots.container({ className })}>
        {/* The row is one big hit target; the field underneath is the a11y node. */}
        <Pressable onPress={focus} disabled={disabled} accessible={false}>
          <View className={slots.row()}>
            {cells.map((i) => (
              <View key={i} className="flex-row items-center">
                <OtpCell
                  char={value[i] ?? ''}
                  active={i === activeIndex}
                  focused={focused}
                  mask={mask}
                  placeholder={placeholder}
                  invalid={invalid}
                  className={slots.cell({
                    className: `${i > 0 ? 'ml-2' : ''} ${cellClassName ?? ''}`,
                  })}
                  charClassName={slots.char()}
                  caretClassName={slots.caret()}
                />
                {groupEvery > 0 &&
                (i + 1) % groupEvery === 0 &&
                i < length - 1 ? (
                  <View className={`${slots.separator()} ml-2`} />
                ) : null}
              </View>
            ))}
          </View>

          {/*
           * The real field: one transparent input stretched over the whole row.
           * It carries the keyboard, autofill and paste, and its value is the
           * source the cells are drawn from — there is no per-cell input to keep
           * in sync. `pointerEvents` off so taps fall through to the Pressable,
           * which focuses this exact input.
           */}
          <TextInput
            ref={setRef}
            value={value}
            onChangeText={handleChange}
            editable={!disabled}
            keyboardType={type === 'numeric' ? 'number-pad' : 'default'}
            // The OS one-time-code affordances: iOS surfaces the SMS code above
            // the keyboard, Android offers to autofill it.
            textContentType="oneTimeCode"
            autoComplete={type === 'numeric' ? 'sms-otp' : 'one-time-code'}
            maxLength={length}
            caretHidden
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ disabled: !!disabled }}
            aria-invalid={invalid}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0,
                // Taps fall through to the Pressable, which focuses this input —
                // so the caret lands wherever the row is touched.
                pointerEvents: 'none',
              },
              style,
            ]}
            {...props}
          />
        </Pressable>

        {errorMessage ? (
          <Text className={slots.error()}>{errorMessage}</Text>
        ) : null}
      </View>
    );
  }
);

OtpInput.displayName = 'OtpInput';
