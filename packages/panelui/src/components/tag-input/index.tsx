/**
 * TagInput — a field whose value is a list of tokens rather than a string.
 *
 * The value is whatever gets typed. That is the whole distinction from a
 * `Combobox` in `multiple` mode: a Combobox picks from a set of options you
 * supply, so it needs a list, a filter and a surface to float that list on. A
 * tag field has no options and no list — labels on a task, recipients on a
 * message, keywords on a post — so it carries none of that machinery and never
 * opens a portal.
 *
 * ```tsx
 * <TagInput
 *   label="Topics"
 *   defaultValue={['expo', 'reanimated']}
 *   placeholder="Add a topic"
 * />
 * ```
 *
 * ## Three ways a tag gets committed
 *
 * Return commits what has been typed. So does any of `delimiters` — a comma by
 * default — which is what makes pasting `design, research, ops` land as three
 * tags instead of one long one. And `blurBehavior` decides what a field that
 * loses focus mid-word does with the leftover.
 *
 * ## Backspace asks first
 *
 * Backspace on an empty field marks the last tag rather than taking it: the
 * tag turns destructive, and a second backspace removes it. A held backspace
 * repeats, and a field that deleted on the first one would empty itself in the
 * time it takes to notice — the mark is the beat that lets you stop.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Pressable,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputProps,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { XIcon } from '../../icons';
import { Text } from '../../primitives/text';
import { selectionTick } from '../../utils/haptics';
import { Chip, type ChipSize, type ChipVariant } from '../chip';
import { Label } from '../label';
import { reconcileMarkedTag, type MarkedTag } from './tag-input-state';
import type { KeyPressEvent, TextInputRef } from '../../primitives/refs';

/** Matches Input and Combobox, so the three read as the same control focused. */
const FOCUS_DURATION = 150;
/** Long enough to see a tag arrive or leave, short enough not to queue up. */
const ENTER_DURATION = 140;
const EXIT_DURATION = 120;
const REFLOW_DURATION = 180;

const tagInputVariants = tv({
  slots: {
    container: 'w-full gap-1.5',
    /*
     * The border colour is animated between the resting and focused tokens, so
     * it is deliberately absent from the class. `flex-wrap` is the load-bearing
     * part: a tag field grows down, because the alternative is a row that
     * scrolls sideways and hides the tags you just added.
     */
    field: 'w-full flex-row flex-wrap items-center rounded-lg border',
    /*
     * A length rather than a `text-*` step, for the reason Input gives: a step
     * sets a size and a line height together, and the extra leading lands above
     * the glyphs, so in a box of fixed height the text sits below the tags it
     * is supposed to be level with.
     */
    input: 'min-w-24 flex-1 py-0 font-normal text-foreground',
    clear: 'items-center justify-center rounded-full',
    description: 'text-sm text-muted-foreground',
    error: 'text-sm text-destructive',
    count: 'text-xs text-muted-foreground',
  },
  variants: {
    variant: {
      outline: { field: 'bg-background' },
      filled: { field: 'bg-muted' },
    },
    size: {
      sm: {
        field: 'gap-1 px-2.5 py-1.5',
        input: 'h-7 text-[14px]',
        clear: 'h-5 w-5',
      },
      md: {
        field: 'gap-1.5 px-3 py-2',
        input: 'h-8 text-[16px]',
        clear: 'h-6 w-6',
      },
      lg: {
        field: 'gap-2 px-3.5 py-2.5',
        input: 'h-10 text-[16px]',
        clear: 'h-7 w-7',
      },
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

type TagInputVariantProps = VariantProps<typeof tagInputVariants>;
export type TagInputVariant = NonNullable<TagInputVariantProps['variant']>;
export type TagInputSize = NonNullable<TagInputVariantProps['size']>;

/** A tag sits inside the field, so it is a step smaller than the field is. */
const CHIP_SIZE: Record<TagInputSize, ChipSize> = {
  sm: 'sm',
  md: 'sm',
  lg: 'md',
};

/** Why a tag was turned away, for a caller that wants to say so. */
export type TagRejection = 'duplicate' | 'max' | 'invalid';

/** What a field that loses focus mid-word does with the leftover text. */
export type TagBlurBehavior = 'add' | 'clear' | 'keep';

/**
 * Splitting without a regex, so a delimiter never has to be escaped — `.` and
 * `|` are ordinary characters to someone listing the separators they use.
 */
function splitOn(text: string, delimiters: string[]): string[] {
  let parts = [text];
  for (const delimiter of delimiters) {
    if (!delimiter) continue;
    parts = parts.flatMap((part) => part.split(delimiter));
  }
  return parts;
}

export interface TagInputProps
  extends Omit<
      TextInputProps,
      | 'value'
      | 'defaultValue'
      | 'onChangeText'
      | 'editable'
      | 'multiline'
      | 'children'
    >,
    Omit<TagInputVariantProps, 'disabled'> {
  /** Classes for the field box — the bordered container the tags sit in. */
  className?: string;
  /** Classes for the outer column that also holds the label and the error. */
  containerClassName?: string;
  /** The tags, controlled. Pair it with `onValueChange`. */
  value?: string[];
  /** The tags to start with, when the field keeps its own value. */
  defaultValue?: string[];
  /** Called with the whole list whenever a tag is added or removed. */
  onValueChange?: (tags: string[]) => void;
  /**
   * The text being typed, controlled. Only needed to drive the draft from
   * outside — the tags themselves are `value`.
   */
  inputValue?: string;
  /** Called as the draft text changes, before it becomes a tag. */
  onInputValueChange?: (text: string) => void;
  /** The label above the field, and what the input is announced as. */
  label?: string;
  /** A line under the field, replaced by `errorMessage` when there is one. */
  description?: string;
  /** Error message. When set, the field renders in its invalid state. */
  errorMessage?: string;
  /** Marks the field required — an asterisk on the label, and the a11y state. */
  isRequired?: boolean;
  /** Dims the field and stops it being reached at all. */
  disabled?: boolean;
  /** Shows the tags but takes away the input and the ✕ on each one. */
  readOnly?: boolean;
  /**
   * The most tags the field accepts. Past it nothing more is committed and
   * `onReject` is called with `'max'`, unless `allowOverflow` is set.
   */
  max?: number;
  /**
   * Let the list go past `max` anyway. The field reports itself invalid while
   * it is over, which is the point: some forms want the count shown as wrong
   * rather than the typing refused.
   */
  allowOverflow?: boolean;
  /** Accept a tag the list already holds. Off by default. */
  allowDuplicates?: boolean;
  /**
   * Characters that end a tag as they are typed. A comma by default, which is
   * what makes a pasted `a, b, c` land as three tags rather than one.
   */
  delimiters?: string[];
  /**
   * What happens to text still in the field when it loses focus. `add` commits
   * it and clears it if it was accepted, leaving it in place if it was not, so
   * a rejected word is still there to fix. `clear` drops it. `keep` leaves it
   * exactly as typed.
   */
  blurBehavior?: TagBlurBehavior;
  /**
   * Decide whether a tag may be added, given the list it would join. Return
   * `false` to turn it away — `onReject` is then called with `'invalid'`.
   */
  validate?: (tag: string, tags: string[]) => boolean;
  /** Called when a tag was turned away, with the reason it was. */
  onReject?: (tag: string, reason: TagRejection) => void;
  /** Which Chip variant the tags are drawn as. */
  chipVariant?: ChipVariant;
  /** Draw the tag yourself — an avatar before the label, a count after it. */
  renderTag?: (tag: string, index: number) => ReactNode;
  /** A ✕ at the end of the field that empties it. */
  clearable?: boolean;
  /** Shows `3 / 8` under the field. Needs `max`. */
  showCount?: boolean;
  /**
   * A tick under the finger as a tag lands or leaves. Off by default — needs
   * the optional `expo-haptics`, and is silent without it.
   */
  haptics?: boolean;
}

export const TagInput = forwardRef<TextInputRef, TagInputProps>(
  (
    {
      className,
      containerClassName,
      value,
      defaultValue,
      onValueChange,
      inputValue,
      onInputValueChange,
      label,
      description,
      errorMessage,
      isRequired,
      disabled = false,
      readOnly = false,
      max,
      allowOverflow = false,
      allowDuplicates = false,
      delimiters = [','],
      blurBehavior = 'add',
      validate,
      onReject,
      chipVariant = 'default',
      renderTag,
      clearable = false,
      showCount = false,
      haptics = false,
      variant,
      size = 'md',
      placeholder,
      onFocus,
      onBlur,
      onKeyPress,
      onSubmitEditing,
      accessibilityLabel,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<TextInputRef>(null);
    useImperativeHandle(ref, () => inputRef.current as TextInputRef);

    const [ownTags, setOwnTags] = useState<string[]>(defaultValue ?? []);
    const tags = value ?? ownTags;

    const [ownText, setOwnText] = useState('');
    const text = inputValue ?? ownText;

    const [focused, setFocused] = useState(false);
    /*
     * Which tag a second backspace would take. An index rather than the tag
     * itself, because with `allowDuplicates` two tags can read the same and
     * marking "the last one" has to mean the last one.
     */
    const [marked, setMarked] = useState<MarkedTag | null>(null);

    const overflowing = max !== undefined && tags.length > max;
    const invalid = !!errorMessage || overflowing;
    const interactive = !disabled && !readOnly;

    // A controlled list can be replaced or reordered between the two
    // backspaces. Keep the mark only while the exact tag it armed still owns
    // that slot, so a key press aimed at the old value cannot delete the new one.
    useEffect(() => {
      setMarked((current) => reconcileMarkedTag(current, tags));
    }, [tags]);

    const setText = useCallback(
      (next: string) => {
        if (inputValue === undefined) setOwnText(next);
        onInputValueChange?.(next);
      },
      [inputValue, onInputValueChange]
    );

    const commit = useCallback(
      (next: string[]) => {
        if (value === undefined) setOwnTags(next);
        onValueChange?.(next);
      },
      [value, onValueChange]
    );

    /**
     * Adds every candidate that survives the rules, in order, and reports the
     * ones that do not. Returns whether anything was actually taken, which is
     * what tells the caller whether the draft text has been consumed.
     */
    const addTags = useCallback(
      (candidates: string[]) => {
        const incoming = candidates
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0);
        if (incoming.length === 0) return false;

        const next = [...tags];
        let added = false;

        for (const tag of incoming) {
          if (!allowDuplicates && next.includes(tag)) {
            onReject?.(tag, 'duplicate');
            continue;
          }
          if (max !== undefined && next.length >= max && !allowOverflow) {
            onReject?.(tag, 'max');
            continue;
          }
          if (validate && !validate(tag, next)) {
            onReject?.(tag, 'invalid');
            continue;
          }
          next.push(tag);
          added = true;
        }

        if (!added) return false;
        if (haptics) selectionTick();
        commit(next);
        return true;
      },
      [tags, allowDuplicates, max, allowOverflow, validate, onReject, haptics, commit]
    );

    const removeAt = useCallback(
      (index: number) => {
        if (index < 0 || index >= tags.length) return;
        if (haptics) selectionTick();
        commit(tags.filter((_, position) => position !== index));
      },
      [tags, haptics, commit]
    );

    const handleChangeText = useCallback(
      (next: string) => {
        // Any typing at all takes the mark off: the backspace that would have
        // removed a tag has been overtaken by a new word.
        setMarked(null);

        if (delimiters.length > 0 && delimiters.some((entry) => next.includes(entry))) {
          const parts = splitOn(next, delimiters);
          // The last piece is what comes *after* the final delimiter — still
          // being typed, so it stays in the field rather than becoming a tag.
          const trailing = parts.pop() ?? '';
          addTags(parts);
          setText(trailing);
          return;
        }

        setText(next);
      },
      [delimiters, addTags, setText]
    );

    const handleSubmit = useCallback<
      NonNullable<TextInputProps['onSubmitEditing']>
    >(
      (event) => {
        if (addTags([text])) setText('');
        onSubmitEditing?.(event);
      },
      [addTags, text, setText, onSubmitEditing]
    );

    const handleKeyPress = useCallback(
      (event: KeyPressEvent) => {
        onKeyPress?.(event);
        if (event.nativeEvent.key !== 'Backspace') {
          setMarked(null);
          return;
        }
        // There is still a character in front of the cursor: backspace means
        // what it always means, and the tags are none of its business.
        if (text.length > 0 || tags.length === 0) return;

        if (marked !== null && reconcileMarkedTag(marked, tags)) {
          removeAt(marked.index);
          setMarked(null);
          return;
        }
        const index = tags.length - 1;
        setMarked({ index, tag: tags[index]! });
      },
      [onKeyPress, text.length, tags, marked, removeAt]
    );

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
        setMarked(null);

        if (blurBehavior === 'clear') {
          setText('');
        } else if (blurBehavior === 'add') {
          // Only cleared when it was taken. Text that was refused stays in the
          // field, because a word that vanishes on blur looks like it was
          // accepted and a rejected tag has to remain visible to be fixed.
          if (addTags([text])) setText('');
        }

        onBlur?.(event);
      },
      [blurBehavior, setText, addTags, text, onBlur]
    );

    const focusField = useCallback(() => {
      inputRef.current?.focus();
    }, []);

    const clear = useCallback(() => {
      setText('');
      setMarked(null);
      commit([]);
      inputRef.current?.focus();
    }, [setText, commit]);

    const slots = tagInputVariants({ variant, size, disabled });

    const placeholderColor = useCSSVariable('--color-muted-foreground');
    const restColor = useCSSVariable('--color-input');
    const focusColor = useCSSVariable('--color-ring');
    const errorColor = useCSSVariable('--color-destructive');
    const mutedColor =
      typeof placeholderColor === 'string' ? placeholderColor : '#737373';

    /*
     * One 0..1 value rather than a class per state: Uniwind can only swap a
     * class wholesale, which is the snap this is here to avoid, and a shared
     * value crosses between the two colours on the UI thread without a
     * re-render for every frame of it.
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
    // An invalid field is tinted at rest too — the error is a fact about the
    // value, not about whether the field happens to be focused.
    const idle = invalid ? active : resting;

    const borderStyle = useAnimatedStyle(() => ({
      borderColor: interpolateColor(focus.value, [0, 1], [idle, active]),
    }));

    const hasContent = tags.length > 0 || text.length > 0;
    const fieldLabel = accessibilityLabel ?? label ?? placeholder;

    const countLine = useMemo(() => {
      if (!showCount || max === undefined) return null;
      return `${tags.length} / ${max}`;
    }, [showCount, max, tags.length]);

    return (
      <View className={slots.container({ className: containerClassName })}>
        {label ? (
          <Label isRequired={isRequired} isInvalid={invalid} isDisabled={disabled}>
            {label}
          </Label>
        ) : null}

        <Pressable
          onPress={focusField}
          disabled={!interactive}
          // The box is a way to reach the input, not a control of its own — the
          // input below it already carries the label and the state.
          accessible={false}
        >
          <Animated.View style={borderStyle} className={slots.field({ className })}>
            {tags.map((tag, index) => (
              <Animated.View
                key={`${tag}-${index}`}
                entering={FadeIn.duration(ENTER_DURATION)}
                exiting={FadeOut.duration(EXIT_DURATION)}
                layout={LinearTransition.duration(REFLOW_DURATION)}
              >
                {renderTag ? (
                  renderTag(tag, index)
                ) : (
                  <Chip
                    size={CHIP_SIZE[size]}
                    // The marked tag turns destructive rather than growing an
                    // outline: it is about to be deleted, and that is the one
                    // colour in the theme that already means exactly that.
                    variant={marked?.index === index ? 'destructive' : chipVariant}
                    onClose={interactive ? () => removeAt(index) : undefined}
                    closeLabel={`Remove ${tag}`}
                    haptics={haptics}
                  >
                    {tag}
                  </Chip>
                )}
              </Animated.View>
            ))}

            {readOnly ? null : (
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={handleChangeText}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyPress={handleKeyPress}
                onSubmitEditing={handleSubmit}
                editable={!disabled}
                // Return commits a tag and the field stays open for the next
                // one — dismissing the keyboard after every tag would make
                // adding three of them three separate visits to the field.
                submitBehavior="submit"
                returnKeyType="done"
                // Android lays a single-line input's text against the top of
                // its box unless told otherwise; iOS centres it. Without this
                // the text sits above the tags on one platform and level with
                // them on the other.
                textAlignVertical="center"
                placeholder={tags.length > 0 ? undefined : placeholder}
                placeholderTextColor={mutedColor}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                accessibilityLabel={fieldLabel}
                accessibilityState={{ disabled }}
                aria-required={isRequired}
                aria-invalid={invalid}
                className={slots.input()}
                {...props}
              />
            )}

            {clearable && hasContent && interactive ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear all tags"
                hitSlop={8}
                onPress={clear}
                className={slots.clear()}
              >
                <XIcon size={16} color={mutedColor} />
              </Pressable>
            ) : null}
          </Animated.View>
        </Pressable>

        {errorMessage ? (
          <Text className={slots.error()}>{errorMessage}</Text>
        ) : description ? (
          <Text className={slots.description()}>{description}</Text>
        ) : null}

        {countLine ? (
          <Text className={slots.count({ className: overflowing ? 'text-destructive' : undefined })}>
            {countLine}
          </Text>
        ) : null}
      </View>
    );
  }
);

TagInput.displayName = 'TagInput';
