/**
 * NumberInput — a value stepped by two buttons or typed by hand.
 *
 * A number is not a slider: past a handful of steps, dragging to 47 is worse
 * than tapping + a few times or just typing it. So the control keeps both
 * doors open — a − and a + at the ends for nudging, and an editable field in
 * the middle for jumping straight to a value — and reconciles them through a
 * single clamped, step-snapped number.
 *
 * The two ends are not just tap targets. Hold one down and it repeats, after a
 * short delay and then faster, the way a native stepper does — so walking from
 * 0 to 200 is a press, not two hundred of them. The repeat reads the live
 * value from a ref rather than a closure, so it never strides off a stale
 * number, and it stops at a bound on its own rather than waiting for a
 * release a disabled button may never send.
 *
 * Typing is allowed to be briefly invalid — an empty field, a lone `-`, a
 * trailing `.` — because clamping every keystroke fights the person mid-number.
 * The field commits (parses, snaps, clamps) on blur, and falls back to the
 * last good value when what is left cannot be read as a number.
 *
 * ```tsx
 * <NumberInput defaultValue={1} min={0} max={10} />
 * <NumberInput label="Quantity" value={qty} onValueChange={setQty} />
 * ```
 *
 * Runs controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`).
 */
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { TextInput, View, type TextInputProps, type TextStyle } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { MinusIcon, PlusIcon } from '../../icons';
import { AnimatedPressable } from '../../primitives/animated-pressable';
import { Text } from '../../primitives/text';
import { selectionTick } from '../../utils/haptics';
import { Label } from '../label';
import { normalize, precisionOf } from './number-input-math';
import { createRepeater } from './number-input-repeat';

/** Wait before a held button starts repeating — a tap must not trip it. */
const REPEAT_DELAY = 400;
/** Interval between repeats once holding — fast enough to cover ground. */
const REPEAT_INTERVAL = 80;

const numberInputVariants = tv({
  slots: {
    container: 'w-full gap-1.5',
    control: 'w-full flex-row items-center overflow-hidden rounded-lg border',
    button: 'h-full items-center justify-center',
    // The field takes the full height so the digits centre against the same
    // box the two glyphs do, rather than against their own line's height.
    field: 'h-full flex-1 text-center font-medium text-foreground',
    description: 'text-sm text-muted-foreground',
    error: 'text-sm text-destructive',
  },
  variants: {
    variant: {
      // Matches Input: outline draws its own edge on the page; filled sits
      // inside a card, where a second border reads as a seam.
      outline: { control: 'border-input bg-background' },
      filled: { control: 'border-transparent bg-muted' },
    },
    size: {
      sm: { control: 'h-10', button: 'w-10' },
      md: { control: 'h-12', button: 'w-12' },
      lg: { control: 'h-14', button: 'w-14' },
    },
    invalid: {
      true: { control: 'border-destructive' },
    },
    disabled: {
      true: { container: 'opacity-[0.64]' },
    },
  },
  defaultVariants: {
    variant: 'outline',
    size: 'md',
  },
});

/** Icon size per control size — the glyph scales with its target. */
const ICON_SIZE: Record<'sm' | 'md' | 'lg', number> = { sm: 16, md: 18, lg: 20 };

/**
 * The field's job is not to be a box of its own: it has to put the number on
 * exactly the axis the − and the + sit on, and in the exact middle between
 * them. An editable field does not do that unhelped — it arrives with padding
 * and, on Android, with font padding above and below the line, all of which
 * shift the digits off centre. Zeroing both and centring the line in the full
 * height leaves geometry as the only thing placing the number.
 *
 * Tabular figures on top of that, so the digits keep the same advance widths
 * while the value counts — a 1 that is narrower than a 7 makes a centred
 * number appear to shuffle sideways as it steps.
 */
const FIELD_BASE: TextStyle = {
  paddingVertical: 0,
  paddingHorizontal: 0,
  includeFontPadding: false,
  textAlignVertical: 'center',
  fontVariant: ['tabular-nums'],
};

/**
 * Font size is set here rather than by a text class because those bring a line
 * height with them: a 16px number in a 24px line box. The extra leading is
 * added above the digits, so centring that box leaves the number sitting a
 * couple of pixels below the − and the + it is meant to line up with — close
 * enough to look like a mistake rather than a difference. Sized this way the
 * line box is the font's own, and centring it centres the digits.
 */
const FIELD_STYLE: Record<'sm' | 'md' | 'lg', TextStyle> = {
  sm: { ...FIELD_BASE, fontSize: 14 },
  md: { ...FIELD_BASE, fontSize: 16 },
  lg: { ...FIELD_BASE, fontSize: 16 },
};

type NumberInputVariantProps = VariantProps<typeof numberInputVariants>;

export interface NumberInputProps
  extends Omit<NumberInputVariantProps, 'invalid' | 'disabled'>,
    Pick<TextInputProps, 'onFocus' | 'onBlur' | 'placeholder' | 'returnKeyType'> {
  className?: string;
  containerClassName?: string;
  /** Controlled value. Leave unset and pass `defaultValue` to run uncontrolled. */
  value?: number;
  /** Starting value when uncontrolled. Defaults to `min`, or 0. */
  defaultValue?: number;
  /** Lower bound. The decrement button disables here. */
  min?: number;
  /** Upper bound. The increment button disables here. */
  max?: number;
  /** Nudge per press, and the granularity the value snaps to. */
  step?: number;
  /** Fires whenever the committed value changes. */
  onValueChange?: (value: number) => void;
  /**
   * Format the displayed number — units, currency, grouping. The field shows
   * this string; typing still reads a bare number back. Defaults to the value
   * rounded to `step`'s precision.
   */
  formatValue?: (value: number) => string;
  /** Let the middle field be typed into. When false it is display-only. */
  editable?: boolean;
  disabled?: boolean;
  /** A label above the control. Doubles as the accessibility label. */
  label?: string;
  /** Helper text below the control. Hidden while an error shows. */
  description?: string;
  /** Error message. When set, the control renders in its invalid state. */
  errorMessage?: string;
  /** Marks the field required — an asterisk on the label, and the a11y state. */
  isRequired?: boolean;
  /**
   * Tick the haptic engine on each step. Needs the optional `expo-haptics`,
   * and is silent without it.
   */
  haptics?: boolean;
}

/**
 * A number stepped by buttons or typed by hand, reconciled to one clamped,
 * step-snapped value. See the file header for why it keeps both affordances.
 */
export const NumberInput = forwardRef<TextInput, NumberInputProps>(
  (
    {
      className,
      containerClassName,
      value: controlledValue,
      defaultValue,
      min = -Infinity,
      max = Infinity,
      step = 1,
      onValueChange,
      formatValue,
      editable = true,
      variant = 'outline',
      size = 'md',
      disabled,
      label,
      description,
      errorMessage,
      isRequired,
      haptics,
      placeholder,
      onFocus,
      onBlur,
      returnKeyType,
    },
    ref
  ) => {
    const isControlled = controlledValue !== undefined;
    const initial = normalize(
      controlledValue ?? defaultValue ?? (isFinite(min) ? min : 0),
      min,
      max,
      step
    );
    const [uncontrolled, setUncontrolled] = useState(initial);
    const value = isControlled ? normalize(controlledValue!, min, max, step) : uncontrolled;

    // The repeat timers read the live value through a ref, so a held button
    // keeps counting from where it is rather than from the value it closed over.
    const valueRef = useRef(value);
    valueRef.current = value;

    const invalid = !!errorMessage;
    const foreground = useCSSVariable('--color-foreground');
    const iconColor = typeof foreground === 'string' ? foreground : undefined;
    const slots = numberInputVariants({ variant, size, invalid, disabled: !!disabled });

    const format = useCallback(
      (v: number) => (formatValue ? formatValue(v) : String(v)),
      [formatValue]
    );

    // `text` is what the field shows while focused; it is allowed to be
    // half-typed. Away from focus it always mirrors the committed value.
    const [text, setText] = useState(() => format(value));
    const [focused, setFocused] = useState(false);
    useEffect(() => {
      if (!focused) setText(format(value));
    }, [value, focused, format]);

    const commit = useCallback(
      (next: number, tick: boolean) => {
        const clamped = normalize(next, min, max, step);
        if (tick && haptics) selectionTick();
        if (!isControlled) setUncontrolled(clamped);
        if (clamped !== valueRef.current) onValueChange?.(clamped);
        // Advance the ref now, so the next repeat steps from here even if the
        // render carrying this value has not landed yet.
        valueRef.current = clamped;
      },
      [min, max, step, haptics, isControlled, onValueChange]
    );

    // --- hold-to-repeat -----------------------------------------------------
    // The timer outlives the render that started it, so it calls the latest
    // `commit` through a ref instead of the one it was created with.
    const commitRef = useRef(commit);
    commitRef.current = commit;

    const repeaterRef = useRef<ReturnType<typeof createRepeater> | null>(null);
    if (!repeaterRef.current) repeaterRef.current = createRepeater(REPEAT_DELAY, REPEAT_INTERVAL);
    const repeater = repeaterRef.current;

    const stopRepeat = repeater.stop;
    useEffect(() => stopRepeat, [stopRepeat]);
    useEffect(() => {
      if (disabled) stopRepeat();
    }, [disabled, stopRepeat]);

    const startRepeat = useCallback(
      (direction: 1 | -1) => {
        repeater.start(() => {
          const current = valueRef.current;
          const next = normalize(current + direction * step, min, max, step);
          if (next === current) return false;
          commitRef.current(next, true);
          // Keep going only while there is room for another step.
          return direction > 0 ? next < max : next > min;
        });
      },
      [repeater, step, min, max]
    );

    const atMin = value <= min;
    const atMax = value >= max;

    const handleEndEditing = useCallback(() => {
      const parsed = parseFloat(text);
      // An empty or unreadable field falls back to the last good value rather
      // than snapping to a surprising 0.
      commit(Number.isNaN(parsed) ? value : parsed, false);
      setFocused(false);
      setText(format(Number.isNaN(parsed) ? value : normalize(parsed, min, max, step)));
    }, [text, value, commit, format, min, max, step]);

    return (
      <View className={slots.container({ className: containerClassName })}>
        {label ? (
          <Label isRequired={isRequired} isInvalid={invalid} isDisabled={!!disabled}>
            {label}
          </Label>
        ) : null}
        <View className={slots.control({ className })}>
          <AnimatedPressable
            className={slots.button()}
            disabled={disabled || atMin}
            pressOpacity={0.6}
            onPressIn={() => {
              if (!disabled && !atMin) startRepeat(-1);
            }}
            onPressOut={stopRepeat}
            accessibilityRole="button"
            accessibilityLabel={`Decrease ${label ?? 'value'}`}
            accessibilityState={{ disabled: disabled || atMin }}
            style={atMin ? { opacity: 0.4 } : undefined}
          >
            {/* Same weight as the +, or the two ends read as different glyphs. */}
            <MinusIcon size={ICON_SIZE[size]} color={iconColor} strokeWidth={2} />
          </AnimatedPressable>

          <TextInput
            ref={ref}
            editable={editable && !disabled}
            value={text}
            keyboardType={precisionOf(step) > 0 ? 'decimal-pad' : 'number-pad'}
            placeholder={placeholder}
            returnKeyType={returnKeyType}
            selectTextOnFocus
            onChangeText={setText}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              handleEndEditing();
              onBlur?.(e);
            }}
            onSubmitEditing={handleEndEditing}
            accessibilityLabel={label}
            accessibilityState={{ disabled: !!disabled }}
            aria-required={isRequired}
            aria-invalid={invalid}
            className={slots.field()}
            style={FIELD_STYLE[size]}
          />

          <AnimatedPressable
            className={slots.button()}
            disabled={disabled || atMax}
            pressOpacity={0.6}
            onPressIn={() => {
              if (!disabled && !atMax) startRepeat(1);
            }}
            onPressOut={stopRepeat}
            accessibilityRole="button"
            accessibilityLabel={`Increase ${label ?? 'value'}`}
            accessibilityState={{ disabled: disabled || atMax }}
            style={atMax ? { opacity: 0.4 } : undefined}
          >
            <PlusIcon size={ICON_SIZE[size]} color={iconColor} />
          </AnimatedPressable>
        </View>
        {errorMessage ? (
          <Text className={slots.error()}>{errorMessage}</Text>
        ) : description ? (
          <Text className={slots.description()}>{description}</Text>
        ) : null}
      </View>
    );
  }
);

NumberInput.displayName = 'NumberInput';
