/**
 * Textarea — a field for text that runs to several lines.
 *
 * It shares Input's focus treatment: the border crosses between two colours on
 * the UI thread over 150ms rather than snapping, because a border that switches
 * wholesale reads as a redraw instead of as the field answering you.
 *
 * Height comes from `rows` rather than from a class, so it composes with `size`
 * instead of fighting it — three rows of 14px text and three rows of 16px text
 * are different heights, and both are three rows. `autoGrow` then lets the
 * field follow its content up to `maxRows`, after which it scrolls, which is
 * the behaviour a composer wants: it starts small, opens up as you write, and
 * stops before it eats the screen.
 *
 * ```tsx
 * <Textarea label="Notes" placeholder="Anything we should know?" />
 * <Textarea autoGrow rows={2} maxRows={8} showCount maxLength={280} />
 * ```
 *
 * For a single line, reach for `Input`.
 */
import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import {
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputProps,
} from 'react-native';
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
import { textareaIsDisabled } from './textarea-disabled';
import type { ContentSizeChangeEvent, TextInputRef } from '../../primitives/refs';

/** Long enough to read as a transition, short enough not to lag a fast tab. */
const FOCUS_DURATION = 150;

/**
 * Type size and the leading it is given, per `size`.
 *
 * The height of the box is derived from these rather than set as a class,
 * because `rows` is a count and a count only becomes a height once you know how
 * tall a line is. They are the same numbers the classes below carry; keeping
 * them here as well is what lets `rows` and `size` compose.
 */
const METRICS = {
  xs: { fontSize: 13, lineHeight: 18, padding: 8 },
  sm: { fontSize: 14, lineHeight: 20, padding: 10 },
  md: { fontSize: 16, lineHeight: 22, padding: 12 },
  lg: { fontSize: 16, lineHeight: 24, padding: 14 },
  xl: { fontSize: 18, lineHeight: 26, padding: 16 },
} as const;

const textareaVariants = tv({
  slots: {
    container: 'w-full gap-1.5',
    /*
     * No height here: it is computed from `rows` and applied as a style. Text
     * starts at the top rather than floating in the middle of an empty box, and
     * the leading is wanted — between several lines it separates them, where in
     * a one-line field it would push the text off centre.
     */
    /* `font-normal` so an app's --font-normal token reaches a TextInput,
       which inherits nothing from the Text primitive. */
    field: 'w-full rounded-lg border font-normal text-foreground',
    footer: 'w-full flex-row items-start justify-between gap-3',
    description: 'text-sm text-muted-foreground',
    error: 'text-sm text-destructive',
    count: 'shrink-0 text-sm tabular-nums text-muted-foreground',
  },
  variants: {
    variant: {
      // The border colour is animated, so it is deliberately not set here —
      // only the background belongs to the class.
      outline: { field: 'bg-background' },
      filled: { field: 'bg-muted' },
    },
    // The same horizontal padding and type size as Input at each step, so a
    // one-line field and a multi-line one stacked in a form share an edge.
    size: {
      xs: { field: 'px-2.5 text-[13px]' },
      sm: { field: 'px-3 text-[14px]' },
      md: { field: 'px-3.5 text-[16px]' },
      lg: { field: 'px-4 text-[16px]' },
      xl: { field: 'px-5 text-[18px]' },
    },
    disabled: {
      true: { field: 'opacity-[0.64]' },
    },
    /** Past the limit the counter is the error, so it is tinted like one. */
    over: {
      true: { count: 'text-destructive' },
    },
  },
  defaultVariants: {
    variant: 'outline',
    size: 'md',
  },
});

type TextareaVariantProps = VariantProps<typeof textareaVariants>;

export interface TextareaProps
  extends Omit<TextInputProps, 'multiline' | 'numberOfLines'>,
    Omit<TextareaVariantProps, 'disabled' | 'over'> {
  className?: string;
  containerClassName?: string;
  label?: string;
  description?: string;
  /** Error message. When set, the field renders in its invalid state. */
  errorMessage?: string;
  /** Marks the field required — an asterisk on the label, and the a11y state. */
  isRequired?: boolean;
  disabled?: boolean;
  /** How many lines of text the field is tall before it scrolls or grows. */
  rows?: number;
  /**
   * Grow with the text, one line at a time, up to `maxRows` — after which the
   * field holds its height and scrolls instead. Without it the field stays at
   * `rows` and scrolls from the first line past it.
   */
  autoGrow?: boolean;
  /** The tallest `autoGrow` will go. Ignored without it. */
  maxRows?: number;
  /**
   * Show how much of `maxLength` is used, under the field. Needs `maxLength`;
   * a counter with no limit to count towards says nothing.
   */
  showCount?: boolean;
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

export const Textarea = forwardRef<TextInputRef, TextareaProps>(
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
      size = 'md',
      rows = 4,
      autoGrow = false,
      maxRows = 10,
      showCount = false,
      avoidKeyboard = false,
      keyboardMode = 'lift',
      keyboardOffset = 16,
      keyboardBottomInset = 0,
      onFocus,
      onBlur,
      onContentSizeChange,
      editable,
      accessibilityState,
      style,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);
    const invalid = !!errorMessage;
    const isDisabled = textareaIsDisabled(disabled, editable);

    const metrics = METRICS[size];
    /* Both paddings plus the lines themselves — the box a row count asks for. */
    const heightFor = useCallback(
      (lines: number) => lines * metrics.lineHeight + metrics.padding * 2,
      [metrics]
    );

    const minHeight = heightFor(rows);
    const maxHeight = autoGrow ? heightFor(Math.max(rows, maxRows)) : undefined;

    /*
     * What the text actually measures, once it has been laid out. It only ever
     * raises the floor — the field never shrinks below `rows`, and never grows
     * past `maxRows`, so the clamping happens here rather than in the style.
     */
    const [contentHeight, setContentHeight] = useState(0);
    const grownHeight = autoGrow
      ? Math.min(
          Math.max(minHeight, contentHeight + metrics.padding * 2),
          maxHeight ?? Number.POSITIVE_INFINITY
        )
      : minHeight;

    const length = props.value?.length ?? props.defaultValue?.length ?? 0;
    const over = !!props.maxLength && length >= props.maxLength;

    const placeholderColor = useCSSVariable('--color-muted-foreground');
    const restColor = useCSSVariable('--color-input');
    const focusColor = useCSSVariable('--color-ring');
    const errorColor = useCSSVariable('--color-destructive');

    const slots = textareaVariants({
      variant,
      size,
      disabled: isDisabled,
      over,
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

    const handleContentSizeChange = useCallback(
      (event: ContentSizeChangeEvent) => {
        if (autoGrow) {
          setContentHeight(event.nativeEvent.contentSize.height);
        }
        onContentSizeChange?.(event);
      },
      [autoGrow, onContentSizeChange]
    );

    /*
     * Type metrics go through `style` rather than through classes because the
     * height is computed from them, and a line height set in two places is a
     * line height that will disagree with itself.
     */
    const boxStyle = useMemo(
      () => ({
        height: grownHeight,
        lineHeight: metrics.lineHeight,
        paddingTop: metrics.padding,
        paddingBottom: metrics.padding,
        // Android starts the caret in the middle of the box without it.
        textAlignVertical: 'top' as const,
      }),
      [grownHeight, metrics]
    );

    const footer =
      errorMessage || description || (showCount && props.maxLength) ? (
        <View className={slots.footer()}>
          {errorMessage ? (
            <Text className={slots.error()}>{errorMessage}</Text>
          ) : description ? (
            <Text className={slots.description()}>{description}</Text>
          ) : (
            <View className="flex-1" />
          )}
          {showCount && props.maxLength ? (
            <Text className={slots.count()}>
              {length}/{props.maxLength}
            </Text>
          ) : null}
        </View>
      ) : null;

    const body = (
      <>
        {label ? (
          <Label isRequired={isRequired} isInvalid={invalid} isDisabled={isDisabled}>
            {label}
          </Label>
        ) : null}
        <AnimatedTextInput
          ref={ref}
          multiline
          editable={!isDisabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onContentSizeChange={handleContentSizeChange}
          accessibilityLabel={label}
          accessibilityState={{ ...accessibilityState, disabled: isDisabled }}
          aria-required={isRequired}
          aria-invalid={invalid}
          className={slots.field({ className })}
          // Caller styles come last, but never last enough to drop the
          // animated border or the height the row count asked for.
          style={[boxStyle, borderStyle, style]}
          placeholderTextColor={
            typeof placeholderColor === 'string' ? placeholderColor : undefined
          }
          {...props}
        />
        {footer}
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

Textarea.displayName = 'Textarea';
