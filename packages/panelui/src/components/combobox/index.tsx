/**
 * Combobox — a text field that filters a list of options as you type.
 *
 * The difference from Select is where the typing happens, and it is not a
 * detail: a Select is a button that opens a list, and its optional filter lives
 * *inside* the list once it is open. A Combobox is the field itself. You are
 * already typing when the options appear, which is what you want when the value
 * is something you know the name of — a city, a repository, a tag — rather than
 * something you expect to recognise by scrolling.
 *
 * ```tsx
 * <Combobox value={framework} onValueChange={setFramework}>
 *   <Combobox.Item value="expo" label="Expo" />
 *   <Combobox.Item value="next" label="Next.js" />
 * </Combobox>
 * ```
 *
 * ## Two presentations, and why there is no sheet
 *
 * `overlay` (default) floats the list above the page through a portal, anchored
 * under the field and flipped above it when the keyboard leaves no room below.
 * `inline` expands the list in normal layout flow instead, which is right in a
 * form where nothing should be covered.
 *
 * There is deliberately no sheet presentation. A sheet takes the bottom of the
 * screen, which is exactly where the keyboard is, and the field you are typing
 * into would end up behind one or the other. Select can offer a sheet because
 * its trigger stops mattering once the list is open; a Combobox's never does.
 *
 * ## Filtering is yours to turn off
 *
 * Filtering happens here by default, matching case-insensitively on any part of
 * an option's label. That is the whole feature for a list you already have in
 * hand. When the options come from a server that is doing the matching itself,
 * pass `filter={false}` and render whatever came back — the field stops second-
 * guessing results it cannot see the query behind.
 *
 * ## Values it does not know about
 *
 * `allowCustomValue` lets the typed text become the value when it matches no
 * option, which is how a tag field works: the list is a set of suggestions
 * rather than the set of legal answers.
 */
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { tv } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { CheckIcon, ChevronDownIcon, XIcon } from '../../icons';
import { Portal } from '../../primitives/portal';
import { Text, textChildren } from '../../primitives/text';
import { useBackHandler } from '../../hooks/use-back-handler';
import { useKeyboard } from '../../hooks/use-keyboard';
import { cn } from '../../utils/cn';
import { Chip } from '../chip';
import { Spinner } from '../spinner';
import type { TextInputRef, ViewRef } from '../../primitives/refs';

/** Matches Input's focus crossfade, so the two read as the same control. */
const FOCUS_DURATION = 150;

const comboboxVariants = tv({
  slots: {
    root: 'w-full',
    /*
     * `rounded-lg` and the same padding scale as Select's trigger and Input's
     * field: a Combobox sitting in a form beside either of them has to read as
     * the same family of control, not as a text field that happens to be near
     * a picker.
     *
     * The border colour is animated between the resting and focused tokens, so
     * it is deliberately absent from the class.
     */
    field:
      'w-full flex-row items-center gap-2 rounded-lg border bg-background px-4 py-2.5',
    // Chips wrap onto their own lines; the input keeps a sane minimum so it is
    // still tappable once a few of them are in front of it.
    fieldContent: 'flex-1 flex-row flex-wrap items-center gap-1.5 py-1',
    /*
     * A fixed height rather than vertical padding, because the chips beside it
     * have one (`h-6`) and two differently-sized boxes on a `items-center` row
     * centre to two different baselines. `py-0` clears the platform default,
     * which is not the same on iOS and Android.
     *
     * The size is a length rather than a `text-*` step for the reason Input
     * gives: a step sets a size *and* a line height, and the extra leading
     * lands above the glyphs, so inside a box of fixed height the text and the
     * placeholder sit below its middle — a few pixels under the chips they are
     * supposed to be level with. A length leaves the line box the font's own.
     */
    input: 'h-7 min-w-24 flex-1 py-0 text-[16px] font-normal text-foreground',
    action: 'h-6 w-6 items-center justify-center rounded-full',
    list: 'overflow-hidden rounded-xl border border-border bg-popover p-2 shadow-sm',
    item: 'flex-row items-center gap-2 rounded-lg px-3 py-3',
    // Grows to fill the row but keeps its natural width as its basis, so an
    // overlay sized to `content` can measure the longest label.
    itemLabel: 'grow shrink text-base font-medium text-foreground',
    itemIndicator: 'h-5 w-5 items-center justify-center',
    group: 'gap-1',
    groupLabel: 'px-3 pb-1 pt-2',
    status: 'flex-row items-center justify-center gap-2 px-3 py-6',
  },
  variants: {
    selected: {
      true: { item: 'bg-accent' },
    },
    disabled: {
      true: { field: 'opacity-[0.64]' },
    },
    itemDisabled: {
      true: { item: 'opacity-[0.64]' },
    },
    presentation: {
      overlay: { list: 'shadow-lg' },
      inline: { list: 'mt-2' },
    },
  },
  defaultVariants: {
    presentation: 'overlay',
  },
});

export type ComboboxPresentation = 'overlay' | 'inline';

/** Which selection shape a `mode` produces. */
export type ComboboxMode = 'single' | 'multiple';

export interface ComboboxSelection {
  single: string | undefined;
  multiple: string[];
}

interface ComboboxContextValue {
  values: string[];
  onSelect: (value: string, label: string) => void;
}

const ComboboxContext = createContext<ComboboxContextValue | null>(null);

export interface ComboboxItemProps {
  value: string;
  label: string;
  /**
   * Shows the option but refuses it. Kept in the list rather than dropped from
   * it, because an option that vanishes reads as one that never existed.
   */
  disabled?: boolean;
  /** Anything to draw before the label — an avatar, a flag, a status dot. */
  start?: ReactNode;
  /** A second line under the label, for what the label alone cannot say. */
  description?: string;
}

/** Declarative option. Rendered inside whichever surface is presenting. */
function ComboboxItem({
  value,
  label,
  disabled,
  start,
  description,
}: ComboboxItemProps) {
  const context = useContext(ComboboxContext);
  if (!context) {
    throw new Error('Combobox.Item must be used within a <Combobox>');
  }

  const selected = context.values.includes(value);
  const { item, itemLabel, itemIndicator } = comboboxVariants({
    selected,
    itemDisabled: !!disabled,
  });
  const checkColor = useCSSVariable('--color-muted-foreground');

  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => context.onSelect(value, label)}
      // The rows sit flush against each other, so the 4pt either side of the
      // gap between two of them belongs to neither without this.
      hitSlop={{ top: 2, bottom: 2 }}
      className={item()}
    >
      {start}
      <View className="flex-1">
        <Text className={itemLabel()}>{label}</Text>
        {description ? (
          <Text size="sm" muted numberOfLines={1}>
            {description}
          </Text>
        ) : null}
      </View>
      <View className={itemIndicator()}>
        {selected ? (
          <CheckIcon
            size={16}
            color={typeof checkColor === 'string' ? checkColor : '#737373'}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

export interface ComboboxGroupProps {
  /**
   * Heading over the run of options. Announced as a header, so a screen reader
   * reaching the group is told what it is before walking into it.
   */
  label?: string;
  /** Extra classes for the group wrapper. */
  className?: string;
  /** Extra classes for the heading. */
  labelClassName?: string;
  children: ReactNode;
}

/**
 * A titled run of options.
 *
 * Presentational only: a grouped Combobox reports the same values a flat one
 * would, and `Combobox.Item` needs to know nothing about being inside one.
 */
function ComboboxGroup({
  label,
  className,
  labelClassName,
  children,
}: ComboboxGroupProps) {
  const { group, groupLabel } = comboboxVariants();

  return (
    <View className={cn(group(), className)}>
      {label ? (
        <View accessibilityRole="header" className={cn(groupLabel(), labelClassName)}>
          <Text size="xs" weight="medium" muted className="uppercase tracking-wide">
            {label}
          </Text>
        </View>
      ) : null}
      {textChildren(children)}
    </View>
  );
}

/**
 * Walk the declared children, visiting every option — including the ones nested
 * inside a `Combobox.Group`.
 *
 * The flat set is what the field's own text needs: the label to show for a
 * selected value, and the chips to draw for several of them. Rendering keeps
 * the tree; only the lookup is flattened.
 */
function eachOption(children: ReactNode, visit: (option: ComboboxItemProps) => void) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === ComboboxGroup) {
      eachOption((child.props as ComboboxGroupProps).children, visit);
      return;
    }
    if (child.type !== ComboboxItem) return;
    visit(child.props as ComboboxItemProps);
  });
}

/**
 * The children a query leaves standing.
 *
 * A group is rebuilt around whatever survives inside it and dropped when that
 * is nothing — a heading over no options reads as a section that failed to load
 * rather than one the query emptied.
 *
 * Every kept node is given a key on the way out. This walk builds a plain array
 * rather than going through `Children.map`, which is the one that hands out keys
 * of its own, so options written as literal JSX — the ordinary way to write a
 * short, fixed list — arrive here with none. An option's `value` is already
 * unique within a list, and a group is named by its label, so both key
 * themselves; an explicit key on the element still wins.
 */
function filterOptions(
  children: ReactNode,
  matches: (option: ComboboxItemProps) => boolean
): ReactNode[] {
  const kept: ReactNode[] = [];

  Children.forEach(children, (child, index) => {
    if (!isValidElement(child)) return;

    if (child.type === ComboboxGroup) {
      const props = child.props as ComboboxGroupProps;
      const inner = filterOptions(props.children, matches);
      if (inner.length) {
        kept.push(
          cloneElement(
            child as ReactElement<ComboboxGroupProps>,
            { key: child.key ?? `group:${props.label ?? index}` },
            inner
          )
        );
      }
      return;
    }

    if (child.type === ComboboxItem && matches(child.props as ComboboxItemProps)) {
      const props = child.props as ComboboxItemProps;
      kept.push(
        cloneElement(child as ReactElement<ComboboxItemProps>, {
          key: child.key ?? `option:${props.value}`,
        })
      );
    }
  });

  return kept;
}

/** Field frame in window coordinates, measured when the list opens. */
interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComboboxProps<Mode extends ComboboxMode = 'single'>
  extends Omit<ViewProps, 'children' | 'onLayout'> {
  className?: string;
  /**
   * One value or several. `multiple` draws the chosen options as removable
   * chips in front of the input and keeps the list open between picks.
   */
  mode?: Mode;
  /** Controlled selection. Its shape follows `mode`. */
  value?: ComboboxSelection[Mode];
  /** Starting selection when uncontrolled. */
  defaultValue?: ComboboxSelection[Mode];
  onValueChange?: (value: ComboboxSelection[Mode]) => void;
  /**
   * Controlled query — the text actually in the field. Pair it with
   * `onInputValueChange` when the options are fetched for it.
   */
  inputValue?: string;
  /** Starting query when uncontrolled. */
  defaultInputValue?: string;
  onInputValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Where the options appear. */
  presentation?: ComboboxPresentation;
  /**
   * Narrow the options to the query here. `true` matches case-insensitively on
   * any part of an option's label; pass a function to match on something else —
   * a description, an alias list, an initialism.
   *
   * Pass `false` when a server is doing the matching: the options you render
   * are then shown exactly as given, since a second filter over results the
   * field cannot see the query behind would only remove correct answers.
   */
  filter?: boolean | ((option: ComboboxItemProps, query: string) => boolean);
  /**
   * Let the typed text become the value when it matches no option, committed on
   * submit. Turns the list into a set of suggestions rather than the set of
   * legal answers — which is what a tag field is.
   */
  allowCustomValue?: boolean;
  /** Show a spinner in place of the list. For options still being fetched. */
  loading?: boolean;
  /** Shown in place of the list when nothing matches. */
  emptyMessage?: string;
  /** Shown in place of the list while `loading`. */
  loadingMessage?: string;
  /** Offer a ✕ that clears the query and the selection. */
  clearable?: boolean;
  /** Open the list as soon as the field takes focus, before anything is typed. */
  openOnFocus?: boolean;
  /** Called when the list opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /**
   * Width of the floating list. `field` matches the field, `content` sizes to
   * the longest option, or pass a pixel value. A list wider than the field
   * moves left to stay on screen. `overlay` only.
   */
  contentWidth?: 'field' | 'content' | number;
  /** Gap between the field and the floating list. `overlay` only. */
  offset?: number;
  /** Extra classes for the list surface. */
  listClassName?: string;
  /** Accessible name for the field. */
  accessibilityLabel?: string;
  children: ReactNode;
}

/** Space kept between a floating list and the side of the screen. */
const OVERLAY_EDGE = 8;

/**
 * Where a floating list starts. It lines up with the field, and moves left
 * when a list wider than the field would run off the right of the screen.
 */
function overlayLeft(anchor: { x: number }, width: number, screenWidth: number) {
  const furthest = screenWidth - OVERLAY_EDGE - width;
  return Math.max(Math.min(anchor.x, furthest), Math.min(anchor.x, OVERLAY_EDGE));
}

function ComboboxRoot<Mode extends ComboboxMode = 'single'>({
  className,
  mode,
  value,
  defaultValue,
  onValueChange,
  inputValue,
  defaultInputValue = '',
  onInputValueChange,
  placeholder = 'Search',
  disabled = false,
  presentation = 'overlay',
  filter = true,
  allowCustomValue = false,
  loading = false,
  emptyMessage = 'No matches',
  loadingMessage = 'Searching',
  clearable = false,
  openOnFocus = false,
  onOpenChange,
  contentWidth = 'field',
  offset = 8,
  listClassName,
  accessibilityLabel,
  children,
  ...props
}: ComboboxProps<Mode>) {
  const multiple = mode === 'multiple';
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  /*
   * Which side the list settled on, latched for as long as it stays open.
   *
   * The side is decided from the list's measured height, which is 0 on the
   * frame it opens — so the honest answer changes once, from "below" to
   * whatever fits, and the list jumps. A finger already on its way down to an
   * option lands where the option used to be, which is the whole of "sometimes
   * it takes two taps". Deciding once and holding it costs a list that opens
   * downwards for one frame in a cramped viewport, which the fade covers.
   */
  const [flipped, setFlipped] = useState<boolean | null>(null);
  /*
   * The anchor is measured off the plain wrapper rather than off the animated
   * field inside it. In `overlay` the wrapper *is* the field's box — the list
   * is portalled out — and a host View is the thing with a dependable
   * `measureInWindow`. `inline` never reads the anchor, so the list it also
   * wraps cannot skew anything.
   */
  const fieldRef = useRef<ViewRef>(null);
  const inputRef = useRef<TextInputRef>(null);
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const [listWidth, setListWidth] = useState(0);
  /*
   * The keyboard is up whenever this list is open — the field is a text input
   * and opening the list is what typing in it does. So the space the list has
   * to work with is never the window: it is the window above the keyboard, and
   * measuring against the window would put the options behind it.
   */
  const { height: keyboardHeight } = useKeyboard();

  const [internalValue, setInternalValue] = useState<ComboboxSelection[Mode]>(
    () =>
      (defaultValue ??
        (mode === 'multiple' ? [] : undefined)) as ComboboxSelection[Mode]
  );
  const selection = (value !== undefined ? value : internalValue) as
    | string
    | string[]
    | undefined;

  const [internalQuery, setInternalQuery] = useState(defaultInputValue);
  const query = inputValue !== undefined ? inputValue : internalQuery;

  /*
   * Which chip a second backspace would take, in `multiple` mode. A held
   * backspace repeats, and a field that removed on the first one would empty
   * itself in the time it takes to notice — the mark is the beat that lets you
   * stop. It is an index rather than a value because the same label can appear
   * twice once the caller allows a custom value that matches an option.
   */
  const [marked, setMarked] = useState<number | null>(null);

  /** The selection as a list, which is the shape everything downstream wants. */
  const values = useMemo(() => {
    if (selection == null) return [];
    return Array.isArray(selection) ? selection : [selection];
  }, [selection]);

  const options = useMemo(() => {
    const collected: ComboboxItemProps[] = [];
    eachOption(children, (option) => collected.push(option));
    return collected;
  }, [children]);

  const labelOf = useCallback(
    (candidate: string) =>
      options.find((option) => option.value === candidate)?.label ?? candidate,
    [options]
  );

  const setQuery = useCallback(
    (next: string) => {
      if (inputValue === undefined) setInternalQuery(next);
      onInputValueChange?.(next);
    },
    [inputValue, onInputValueChange]
  );

  const commit = useCallback(
    (next: ComboboxSelection[Mode]) => {
      if (value === undefined) setInternalValue(next);
      onValueChange?.(next);
    },
    [value, onValueChange]
  );

  const setOpenState = useCallback(
    (next: boolean) => {
      setOpen((current) => {
        if (current === next) return current;
        onOpenChange?.(next);
        return next;
      });
    },
    [onOpenChange]
  );

  /**
   * The floating list is positioned in window coordinates, so it has to know
   * where the field actually landed — not where layout said it would.
   */
  const openList = useCallback(() => {
    if (disabled) return;
    if (presentation !== 'overlay') {
      setOpenState(true);
      return;
    }
    fieldRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpenState(true);
    });
  }, [disabled, presentation, setOpenState]);

  const close = useCallback(() => setOpenState(false), [setOpenState]);

  // A closed list has no side. Clearing the latch here rather than in `close`
  // covers the caller closing it through `open` as well.
  useEffect(() => {
    if (!open) setFlipped(null);
  }, [open]);

  // An open overlay list catches the Android back button, closing itself
  // instead of popping the screen behind it.
  useBackHandler(open && presentation === 'overlay', close);

  /*
   * The anchor is a snapshot, and the keyboard invalidates it: a scroll view
   * that lifts its content clear of the keyboard moves the field after it was
   * measured, and the list would stay at the old position. Re-measure whenever
   * the keyboard's height changes while the list is open.
   *
   * Except while the list is being dragged. The list dismisses the keyboard on
   * drag, so the first finger movement changes the keyboard's height, which
   * lands a new anchor, which recomputes the panel's `top` *and* its
   * `maxHeight` — the panel resizes and moves under the finger that is
   * scrolling it, which is the stutter. The measurement is only stale once the
   * keyboard has finished leaving, so it is deferred to the end of the drag,
   * which is also the first moment it can be taken correctly.
   */
  const draggingList = useRef(false);
  const anchorStale = useRef(false);

  const remeasure = useCallback(() => {
    fieldRef.current?.measureInWindow((x, y, width, height) =>
      setAnchor({ x, y, width, height })
    );
  }, []);

  useEffect(() => {
    if (!open || presentation !== 'overlay') return;
    if (draggingList.current) {
      anchorStale.current = true;
      return;
    }
    remeasure();
  }, [open, presentation, keyboardHeight, remeasure]);

  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelSettle = useCallback(() => {
    if (settleTimer.current === null) return;
    clearTimeout(settleTimer.current);
    settleTimer.current = null;
  }, []);

  const onListDragStart = useCallback(() => {
    cancelSettle();
    draggingList.current = true;
  }, [cancelSettle]);

  const onListSettled = useCallback(() => {
    cancelSettle();
    draggingList.current = false;
    if (!anchorStale.current) return;
    anchorStale.current = false;
    remeasure();
  }, [cancelSettle, remeasure]);

  /*
   * A fling ends the drag and then keeps moving, and momentum begins a frame
   * *after* the drag ends — so the end of the drag cannot tell the two apart by
   * itself. It arms a short timer instead, which momentum starting cancels; a
   * drag that stops dead has no momentum to cancel it and settles on the timer.
   */
  const onListDragEnd = useCallback(() => {
    cancelSettle();
    settleTimer.current = setTimeout(onListSettled, 80);
  }, [cancelSettle, onListSettled]);

  useEffect(() => cancelSettle, [cancelSettle]);

  /*
   * A single-select field shows the chosen option's label when it is not being
   * typed into. Re-deriving it on every keystroke would fight the typing, so it
   * is only written back when the selection itself changes and the field is not
   * focused — which covers a value arriving from outside, and the blur after a
   * pick. A custom-value field is left alone: the text *is* the value there.
   */
  const singleValue = multiple ? undefined : (selection as string | undefined);
  useEffect(() => {
    if (multiple || focused || allowCustomValue) return;
    setQuery(singleValue == null ? '' : labelOf(singleValue));
    // `setQuery` is stable per controlled-ness; re-running on every identity
    // change would overwrite the query the caller is controlling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiple, focused, allowCustomValue, singleValue, labelOf]);

  const matcher = useCallback(
    (option: ComboboxItemProps) => {
      if (filter === false) return true;
      const needle = query.trim().toLowerCase();
      if (!needle) return true;
      if (typeof filter === 'function') return filter(option, query.trim());
      return option.label.toLowerCase().includes(needle);
    },
    [filter, query]
  );

  /*
   * `null` means "render the children as given" — nothing is being narrowed, so
   * an unfiltered list does no per-option work at all.
   */
  const filtered = useMemo(() => {
    if (filter === false) return null;
    if (!query.trim()) return null;
    return filterOptions(children, matcher);
  }, [children, filter, query, matcher]);

  const exactMatch = useMemo(
    () =>
      options.some(
        (option) => option.label.toLowerCase() === query.trim().toLowerCase()
      ),
    [options, query]
  );

  const select = useCallback(
    (next: string) => {
      if (multiple) {
        const current = Array.isArray(selection) ? selection : [];
        const without = current.filter((entry) => entry !== next);
        // Toggling: picking a chosen option again removes it, which is the only
        // way to undo a pick without reaching for its chip.
        const updated = without.length === current.length ? [...current, next] : without;
        commit(updated as ComboboxSelection[Mode]);
        // The query has done its job once the pick is made, and leaving it
        // would hide every option that does not also match it.
        setQuery('');
        return;
      }

      commit(next as ComboboxSelection[Mode]);
      setQuery(labelOf(next));
      close();
      inputRef.current?.blur();
    },
    [multiple, selection, commit, setQuery, labelOf, close]
  );

  /** Enter, or the keyboard's Done: take the typed text if it can be taken. */
  const submit = useCallback(() => {
    const typed = query.trim();
    if (!typed) return;

    const match = options.find(
      (option) => option.label.toLowerCase() === typed.toLowerCase()
    );
    if (match && !match.disabled) {
      select(match.value);
      return;
    }

    if (!allowCustomValue) return;

    if (multiple) {
      const current = Array.isArray(selection) ? selection : [];
      if (!current.includes(typed)) {
        commit([...current, typed] as ComboboxSelection[Mode]);
      }
      setQuery('');
      return;
    }

    commit(typed as ComboboxSelection[Mode]);
    close();
  }, [
    query,
    options,
    allowCustomValue,
    multiple,
    selection,
    select,
    commit,
    setQuery,
    close,
  ]);

  const remove = useCallback(
    (target: string) => {
      const current = Array.isArray(selection) ? selection : [];
      commit(current.filter((entry) => entry !== target) as ComboboxSelection[Mode]);
    },
    [selection, commit]
  );

  /**
   * Removal by position, which is what the backspace mark holds. Removing by
   * value would take both of a repeated label rather than the marked one.
   */
  const removeAt = useCallback(
    (index: number) => {
      const current = Array.isArray(selection) ? selection : [];
      if (index < 0 || index >= current.length) return;
      commit(
        current.filter((_, position) => position !== index) as ComboboxSelection[Mode]
      );
    },
    [selection, commit]
  );

  const clear = useCallback(() => {
    setQuery('');
    setMarked(null);
    commit((multiple ? [] : undefined) as ComboboxSelection[Mode]);
    inputRef.current?.focus();
  }, [setQuery, commit, multiple]);

  /*
   * The chips can also change from outside — a form reset, a pick undone in the
   * list — which would leave the mark pointing past the end of them. A stale
   * mark is a chip deleted by a backspace meant for the one that used to be
   * there.
   */
  useEffect(() => {
    if (marked !== null && marked >= values.length) setMarked(null);
  }, [marked, values.length]);

  const context = useMemo<ComboboxContextValue>(
    () => ({ values, onSelect: (next) => select(next) }),
    [values, select]
  );

  const slots = comboboxVariants({ disabled, presentation });
  const mutedColor = useCSSVariable('--color-muted-foreground');
  const restColor = useCSSVariable('--color-input');
  const focusColor = useCSSVariable('--color-ring');
  const placeholderColor = typeof mutedColor === 'string' ? mutedColor : '#737373';

  const focus = useSharedValue(0);
  useEffect(() => {
    focus.value = withTiming(focused ? 1 : 0, { duration: FOCUS_DURATION });
  }, [focused, focus]);

  const fieldStyle = useAnimatedStyle(() => {
    const idle = typeof restColor === 'string' ? restColor : 'rgba(0,0,0,0.1)';
    const active = typeof focusColor === 'string' ? focusColor : '#a3a3a3';
    return {
      borderColor: interpolateColor(focus.value, [0, 1], [idle, active]),
    };
  });

  const chevron = useSharedValue(0);
  useEffect(() => {
    chevron.value = withTiming(open ? 1 : 0, { duration: 160 });
  }, [open, chevron]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevron.value * 180}deg` }],
  }));

  const hasContent = query.length > 0 || values.length > 0;

  /*
   * The list body, built once and handed to whichever surface is presenting.
   * The two differ in where they put it, not in what it is.
   */
  /*
   * `filtered === null` means nothing was narrowed — either there is no query
   * or a server is doing the matching — so the children are rendered as given
   * and emptiness is a question about the options themselves. A server that
   * came back with nothing still has to say so, which is why this is not just
   * `filtered.length`.
   */
  const shown = filtered === null ? textChildren(children) : filtered;
  const isEmpty = filtered === null ? options.length === 0 : filtered.length === 0;

  const body = loading ? (
    <View className={slots.status()}>
      <Spinner size="sm" />
      <Text size="sm" muted>
        {loadingMessage}
      </Text>
    </View>
  ) : isEmpty ? (
    <Text className="px-3 py-6 text-center text-sm text-muted-foreground">
      {allowCustomValue && query.trim() && !exactMatch
        ? `Press return to add “${query.trim()}”`
        : emptyMessage}
    </Text>
  ) : (
    shown
  );

  const list = (
    <ScrollView
      bounces={false}
      showsVerticalScrollIndicator={false}
      // The field above the list is a text input: without this a tap on an
      // option would be swallowed by the keyboard dismissing first.
      keyboardShouldPersistTaps="always"
      keyboardDismissMode="on-drag"
      // Both ends are wired: a slow drag that stops where it started never
      // gets a momentum event, and a fling reports the drag ending long before
      // the list has stopped.
      onScrollBeginDrag={onListDragStart}
      onScrollEndDrag={onListDragEnd}
      onMomentumScrollBegin={cancelSettle}
      onMomentumScrollEnd={onListSettled}
    >
      <View className="gap-1">{body}</View>
    </ScrollView>
  );

  const field = (
    <Animated.View
      style={fieldStyle}
      className={slots.field()}
      // The field is one control made of several views. Announcing it as a
      // combobox that owns an expandable list is what makes the chips and the
      // input read as parts of it rather than as loose siblings.
      accessibilityRole="combobox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, expanded: open }}
    >
      <View className={slots.fieldContent()}>
        {multiple
          ? values.map((entry, index) => (
              <Chip
                key={entry}
                size="sm"
                // The marked chip turns destructive rather than growing an
                // outline: it is about to be deleted, and that is the one
                // colour in the theme that already means exactly that.
                variant={marked === index ? 'destructive' : 'default'}
                // A chip is `self-start` by default, which overrides the row's
                // `items-center` and leaves it riding high against the input.
                // Inside a field it is one of several things sharing a line.
                className="self-center"
                onClose={disabled ? undefined : () => remove(entry)}
                closeLabel={`Remove ${labelOf(entry)}`}
              >
                {labelOf(entry)}
              </Chip>
            ))
          : null}
        <TextInput
          ref={inputRef}
          className={slots.input()}
          value={query}
          onChangeText={(next) => {
            // Typing takes the mark off: the backspace that would have removed
            // a chip has been overtaken by a new query.
            setMarked(null);
            setQuery(next);
            if (!open) openList();
          }}
          onFocus={() => {
            setFocused(true);
            if (openOnFocus) openList();
          }}
          onBlur={() => {
            setFocused(false);
            setMarked(null);
          }}
          onSubmitEditing={submit}
          onKeyPress={({ nativeEvent }) => {
            if (!multiple) return;
            if (nativeEvent.key !== 'Backspace') {
              setMarked(null);
              return;
            }
            // There is still a character in front of the cursor: backspace
            // means what it always means, and the chips are none of its
            // business.
            if (query.length > 0 || values.length === 0) return;

            // Backspace on an empty field reaches the thing in front of the
            // cursor when there is no character left to delete — but it marks
            // that chip first, and only the next one takes it.
            if (marked !== null && marked < values.length) {
              removeAt(marked);
              setMarked(null);
              return;
            }
            setMarked(values.length - 1);
          }}
          editable={!disabled}
          // Android lays a single-line input's text against the top of its box
          // unless told otherwise; iOS centres it. Without this the text sits
          // above the chips on one platform and level with them on the other.
          textAlignVertical="center"
          placeholder={values.length && multiple ? undefined : placeholder}
          placeholderTextColor={placeholderColor}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          returnKeyType={allowCustomValue ? 'done' : 'search'}
          submitBehavior={multiple ? 'submit' : 'blurAndSubmit'}
          accessibilityLabel={accessibilityLabel ?? placeholder}
        />
      </View>

      {clearable && hasContent && !disabled ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear"
          onPress={clear}
          className={slots.action()}
        >
          <XIcon size={16} color={placeholderColor} />
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? 'Hide options' : 'Show options'}
        accessibilityState={{ expanded: open }}
        disabled={disabled}
        onPress={() => {
          if (open) {
            close();
            return;
          }
          openList();
          inputRef.current?.focus();
        }}
        className={slots.action()}
      >
        <Animated.View style={chevronStyle}>
          <ChevronDownIcon color={placeholderColor} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );

  if (presentation === 'inline') {
    return (
      <ComboboxContext.Provider value={context}>
        <View ref={fieldRef} className={cn(slots.root(), className)} {...props}>
          {field}
          {open ? (
            <Animated.View
              entering={FadeIn.duration(140)}
              exiting={FadeOut.duration(120)}
              className={cn(slots.list(), 'max-h-80', listClassName)}
            >
              {list}
            </Animated.View>
          ) : null}
        </View>
      </ComboboxContext.Provider>
    );
  }

  // Flip above the field when the list would run off the bottom — where the
  // bottom is the top of the keyboard, not the bottom of the screen. The list
  // has no height until it has been laid out, so the side is decided on that
  // first measurement and then held; see `flipped`.
  const viewportBottom = screenHeight - keyboardHeight;
  const spaceBelow = anchor ? viewportBottom - (anchor.y + anchor.height) - offset : 0;
  const flip = flipped ?? false;

  const overlayPosition = anchor
    ? {
        position: 'absolute' as const,
        left: overlayLeft(anchor, contentWidth === 'field' ? anchor.width : listWidth, screenWidth),
        ...(flip
          ? { bottom: screenHeight - anchor.y + offset }
          : { top: anchor.y + anchor.height + offset }),
        // Above the dismiss strips it shares the portal with. They are earlier
        // siblings so paint order already puts the list on top on iOS, but on
        // Android a sibling without an elevation is not reliably ordered.
        zIndex: 1,
        elevation: 1,
        ...(contentWidth === 'field'
          ? { width: anchor.width }
          : typeof contentWidth === 'number'
            ? { width: contentWidth, maxWidth: screenWidth - OVERLAY_EDGE * 2 }
            : { minWidth: anchor.width, maxWidth: screenWidth - OVERLAY_EDGE * 2 }),
        // Never collapse to nothing in a cramped viewport — the list scrolls.
        maxHeight: Math.max((flip ? anchor.y : spaceBelow) - offset, 160),
      }
    : null;

  /** The window minus the field: above it, below it, and either side of it. */
  const catcherRects: ViewStyle[] = anchor
    ? [
        { top: 0, left: 0, right: 0, height: Math.max(anchor.y, 0) },
        { top: anchor.y + anchor.height, left: 0, right: 0, bottom: 0 },
        { top: anchor.y, height: anchor.height, left: 0, width: Math.max(anchor.x, 0) },
        {
          top: anchor.y,
          height: anchor.height,
          left: anchor.x + anchor.width,
          right: 0,
        },
      ]
    : [];

  return (
    <ComboboxContext.Provider value={context}>
      <View ref={fieldRef} className={cn(slots.root(), className)} {...props}>
        {field}
      </View>

      {open && overlayPosition ? (
        <Portal>
          {/*
           * Full-screen catcher so a press anywhere else dismisses the list.
           *
           * Hidden from assistive tech, and deliberately: it is a dismiss
           * affordance for a pointer, and announcing it would put an unlabelled
           * full-screen "button" ahead of the options in the reading order.
           * Escaping the list is the back gesture's job.
           *
           * "Anywhere else" has to exclude the field, and one window-sized view
           * cannot: covering the control that opened the list means a tap on
           * the input to carry on typing, or on the chevron to close it, is
           * spent dismissing instead and the field only answers on the second
           * try. A view cannot have a hole cut in it, so the catcher is the
           * four strips around the field's measured rect — which leaves the
           * field uncovered and directly tappable.
           */}
          {catcherRects.map((rect, index) => (
            <Pressable
              key={index}
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
              onPress={() => {
                close();
                inputRef.current?.blur();
              }}
              style={[{ position: 'absolute' }, rect]}
            />
          ))}
          {/* Portalled out of this subtree — re-provide the context so
              Combobox.Item keeps working. */}
          <ComboboxContext.Provider value={context}>
            <Animated.View
              entering={FadeIn.duration(140)}
              exiting={FadeOut.duration(120)}
              onLayout={(event: LayoutChangeEvent) => {
                // The first measurement decides the side, and nothing after it
                // does — see `flipped`.
                setListWidth(event.nativeEvent.layout.width);
                const measured = event.nativeEvent.layout.height;
                setFlipped((current) =>
                  current === null ? measured > spaceBelow : current
                );
              }}
              style={overlayPosition}
              /*
               * The floating list covers the screen with a catcher and takes
               * the back button, so it is a modal layer. Without this the page
               * behind it stays in the accessibility tree and a screen reader
               * could walk out of the open list into content it is covering.
               */
              accessibilityViewIsModal
              className={cn(slots.list(), listClassName)}
            >
              {list}
            </Animated.View>
          </ComboboxContext.Provider>
        </Portal>
      ) : null}
    </ComboboxContext.Provider>
  );
}

ComboboxItem.displayName = 'Combobox.Item';
ComboboxGroup.displayName = 'Combobox.Group';

export const Combobox = Object.assign(ComboboxRoot, {
  Item: ComboboxItem,
  Group: ComboboxGroup,
});
