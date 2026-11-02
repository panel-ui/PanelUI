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
 * <Input label="Note" startContent={<PencilIcon size={18} />} />
 * ```
 *
 * ## An icon inside the field, and why it lives here
 *
 * `startContent` and `endContent` are measured and turned into padding on the
 * text, so a value never runs underneath them however wide they turn out to
 * be. They are positioned against the *field box* rather than against the
 * component, which is the whole reason they are a prop rather than something
 * you compose: a label and a description are laid out above and below the
 * field, so anything centred on the component as a whole drifts upward the
 * moment a label is added.
 *
 * Both are pressable. A button dropped in there — a clear ✕, a show-password
 * eye — gets its own touches, while the padding around it stays transparent so
 * a tap that misses still lands on the field and puts the caret in it. An icon
 * that is only decoration should say so with `interactiveContent={false}`,
 * which gives the whole field back to the caret and takes the icon out of the
 * accessibility tree.
 *
 * `InputGroup` is still the right answer for a decorator that is not part of
 * the field — a button attached to its end, a select bolted to its start, an
 * addon with its own background. It measures the same way; it just spans a
 * different box.
 */
import { forwardRef, useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  TextInput,
  View,
  type LayoutChangeEvent,
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
import { IconColorProvider } from '../../icons';
import { KeyboardAvoider } from '../../primitives/keyboard-avoider';
import { Text, textChildren } from '../../primitives/text';
import { Label } from '../label';
import { inputContentPadding } from './input-content-padding';
import type { TextInputRef } from '../../primitives/refs';

/** Long enough to read as a transition, short enough not to lag a fast tab. */
const FOCUS_DURATION = 150;

const inputVariants = tv({
  slots: {
    container: 'w-full gap-1.5',
    /*
     * `font-normal` on a field that is not bold: this is a TextInput, so it
     * does not go through the Text primitive and inherits nothing. The class
     * is what an app's `--font-normal` token attaches to, and without it a
     * custom font would stop at the edge of every field in the library.
     */
    field: 'w-full rounded-lg border font-normal text-foreground',
    description: 'text-sm text-muted-foreground',
    error: 'text-sm text-destructive',
    /*
     * The box the content is positioned against, and the reason this works
     * where wrapping the whole component does not: it is the field alone, so
     * a label above it and a description below it cannot move what is inside.
     */
    fieldBox: 'relative w-full',
    startContent:
      'absolute bottom-0 start-0 top-0 z-10 flex-row items-center justify-center gap-2',
    endContent:
      'absolute bottom-0 end-0 top-0 z-10 flex-row items-center justify-center gap-2',
  },
  variants: {
    variant: {
      // The border colour is animated, so it is deliberately not set here —
      // only the background and the resting border width belong to the class.
      outline: { field: 'bg-background' },
      filled: { field: 'bg-muted' },
    },
    size: {
      /*
       * The font size is given as a length rather than through a `text-*`
       * step, because those set a size and a line height together — 16px text
       * in a 24px line box. The extra leading lands above the glyphs, so in a
       * field of fixed height the text and the placeholder end up sitting
       * below the middle of the box, a few pixels off whatever is beside them.
       * A length sets the size alone and leaves the line box the font's own.
       */
      // The content boxes take the field's own horizontal padding, so an icon
      // sits at exactly the inset the text would have started at.
      //
      // Eight points a step, 32 to 64. `xs` is for a field inside something
      // else that is already compact, such as a table cell or a toolbar; `xl`
      // is for the one field a screen is about, such as a search or an amount.
      xs: { field: 'h-8 px-2.5 text-[13px]', startContent: 'px-2.5', endContent: 'px-2.5' },
      sm: { field: 'h-10 px-3 text-[14px]', startContent: 'px-3', endContent: 'px-3' },
      md: { field: 'h-12 px-3.5 text-[16px]', startContent: 'px-3.5', endContent: 'px-3.5' },
      lg: { field: 'h-14 px-4 text-[16px]', startContent: 'px-4', endContent: 'px-4' },
      xl: { field: 'h-16 px-5 text-[18px]', startContent: 'px-5', endContent: 'px-5' },
    },
    multiline: {
      // A multiline field grows, so a fixed height would crop it. Text starts
      // at the top rather than floating in the middle of an empty box — and
      // once there are several lines the leading is wanted back, since here it
      // separates the lines instead of pushing one off centre.
      //
      // The content follows the text to the top for the same reason: centred
      // in a box that grows, an icon slides further from the line it belongs
      // to with every line typed.
      true: {
        field: 'h-auto min-h-24 py-3 leading-normal',
        startContent: 'bottom-auto py-3',
        endContent: 'bottom-auto py-3',
      },
    },
    disabled: {
      true: {
        field: 'opacity-[0.64]',
        startContent: 'opacity-[0.64]',
        endContent: 'opacity-[0.64]',
      },
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
   * Content inside the field, before the text — usually an icon. Measured, so
   * the text is padded clear of it however wide it is.
   *
   * `start`, not `left`: it follows the reading direction, and swaps sides
   * under `Direction dir="rtl"` along with the text it introduces.
   */
  startContent?: ReactNode;
  /** Content inside the field, after the text — an icon, a unit, a count. */
  endContent?: ReactNode;
  /**
   * Whether touches reach the content.
   *
   * On by default, so a button placed in the field — a clear ✕, a
   * show-password eye, a unit picker — is pressable without anything else
   * being passed. Only the content itself takes those touches: the padding
   * around it is transparent, so a tap that misses the button still lands on
   * the field and puts the caret in it.
   *
   * Turn it off for pure decoration, where the icon should not be a target at
   * all and every pixel of the field should focus it. That also drops the
   * content from the accessibility tree, which is right for an icon that only
   * restates the label.
   */
  interactiveContent?: boolean;
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

export const Input = forwardRef<TextInputRef, InputProps>(
  (
    {
      className,
      containerClassName,
      label,
      description,
      errorMessage,
      isRequired,
      disabled,
      startContent,
      endContent,
      interactiveContent = true,
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
    // Measured so the text can be padded clear of the content, whatever it
    // turns out to be — an icon, a unit, a two-word label.
    const [startWidth, setStartWidth] = useState(0);
    const [endWidth, setEndWidth] = useState(0);

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

    const handleStartLayout = useCallback((event: LayoutChangeEvent) => {
      setStartWidth(event.nativeEvent.layout.width);
    }, []);

    const handleEndLayout = useCallback((event: LayoutChangeEvent) => {
      setEndWidth(event.nativeEvent.layout.width);
    }, []);

    const startPadding = inputContentPadding(startWidth, !!startContent);
    const endPadding = inputContentPadding(endWidth, !!endContent);

    /*
     * The content is quieter than the value. An icon at the same weight as the
     * text reads as part of what was typed, and the placeholder colour is
     * already the field's own word for "not the value".
     */
    const iconColor = typeof placeholderColor === 'string' ? placeholderColor : undefined;

    const field = (
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
        style={[
          borderStyle,
          // Only the side that has content, and only once it has been
          // measured — a 0 here would wipe out the field's own padding.
          startPadding ? { paddingStart: startPadding } : null,
          endPadding ? { paddingEnd: endPadding } : null,
          // Caller styles come last so InputGroup can pad the field around its
          // decorators, but never last enough to drop the animated border.
          style,
        ]}
        placeholderTextColor={
          typeof placeholderColor === 'string' ? placeholderColor : undefined
        }
        {...props}
      />
    );

    const body = (
      <>
        {label ? (
          <Label isRequired={isRequired} isInvalid={invalid} isDisabled={!!disabled}>
            {label}
          </Label>
        ) : null}
        {startContent || endContent ? (
          /*
           * Only wrapped when there is something to position. An extra view
           * around every field in an app is a real cost in a long form, and
           * the field is `w-full` either way so the wrapper changes nothing
           * else about the layout.
           */
          <View className={slots.fieldBox()}>
            {startContent ? (
              <View
                onLayout={handleStartLayout}
                pointerEvents={interactiveContent ? 'box-none' : 'none'}
                accessibilityElementsHidden={!interactiveContent}
                importantForAccessibility={
                  interactiveContent ? 'auto' : 'no-hide-descendants'
                }
                className={slots.startContent()}
              >
                <IconColorProvider color={iconColor}>
                  {textChildren(startContent)}
                </IconColorProvider>
              </View>
            ) : null}
            {field}
            {endContent ? (
              <View
                onLayout={handleEndLayout}
                pointerEvents={interactiveContent ? 'box-none' : 'none'}
                accessibilityElementsHidden={!interactiveContent}
                importantForAccessibility={
                  interactiveContent ? 'auto' : 'no-hide-descendants'
                }
                className={slots.endContent()}
              >
                <IconColorProvider color={iconColor}>
                  {textChildren(endContent)}
                </IconColorProvider>
              </View>
            ) : null}
          </View>
        ) : (
          field
        )}
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
