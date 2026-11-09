/**
 * SearchBar — a text field for querying a list, with the two controls a search
 * needs and an ordinary field does not, and a panel of results that opens out
 * of the field itself.
 *
 * ```tsx
 * <SearchBar placeholder="Search orders" onSubmit={run} />
 * <SearchBar variant="filled" shape="pill" cancel="focus" />
 * <SearchBar avoidKeyboard value={query} onChangeText={setQuery}>
 *   <SearchBar.Section label="Suggested">
 *     <SearchBar.Item trailing={<AddButton />} onPress={add}>Claude</SearchBar.Item>
 *   </SearchBar.Section>
 * </SearchBar>
 * ```
 *
 * ## The results are above the field, and the field is above the keyboard
 *
 * A search that is being typed into has a keyboard under it, and a list drawn
 * below the field is a list drawn behind the keyboard. So `avoidKeyboard`
 * lifts the field until it sits `keyboardOffset` points clear of the keyboard's
 * top edge, and the panel opens *upward* out of it into the space that is
 * actually free.
 *
 * That puts the first result nearest the field and the last one furthest away,
 * which is the order a reader walking away from the caret expects. Pass
 * `panelPlacement="bottom"` for a search bar in a header, where the space is
 * the other way round.
 *
 * The panel is positioned absolutely rather than laid out in the flow, so
 * opening it never moves the page underneath — a list that pushes the field it
 * belongs to is a field that walks away from the finger typing into it.
 *
 * ## Touches inside the panel must not close the keyboard
 *
 * The panel scrolls with `keyboardShouldPersistTaps="always"`, and every press
 * inside it holds the field's focus open for a moment afterwards. Both are
 * needed, because a search closes the instant the field blurs and there are
 * two separate ways for a touch in the panel to blur it.
 *
 * `"handled"` only spares presses a child takes responsibility for, which
 * leaves the panel's own padding, the gaps between rows, a section heading and
 * the whole of `SearchBar.Status` as live dismiss surfaces — tapping the word
 * "Searching …" would end the search. `"always"` gives the panel back.
 *
 * The focus guard covers the other way: a control inside a row — an add
 * button, a remove ✕ — takes focus with the press on Android, and returning it
 * a frame later is not enough on its own, because the blur has already closed
 * the panel the control was drawn in. So a press in the panel marks the field
 * as still being used, and a blur arriving under that mark is answered by
 * asking for focus back rather than by ending the search.
 *
 * That guard only knows about presses that go through this component's own
 * parts, and a caller's `Pressable` in a row's `trailing` slot takes the touch
 * itself. So the panel also waits before believing any blur, and asks the
 * keyboard: it is still up, because nothing in the panel dismisses it, and a
 * search whose keyboard is still up has not ended. Focus goes back instead.
 *
 * ## The space kept for the field is not a target
 *
 * The card is one box around the results *and* the field, so it carries a
 * spacer where the field sits. That spacer is a plain view drawn over a
 * focused field, and a touch on a plain view is the platform's cue to dismiss
 * the keyboard — so winning one blurred the field and closed the panel drawn
 * out of that focus. Tapping the search box shut the results, which is exactly
 * backwards. The card and its spacer take no touches at all now.
 *
 * ## What has already been picked goes in the field
 *
 * `tokens` puts the choices made so far inside the field, before the caret, so
 * the query and what it has produced are one control rather than a control and
 * a list somewhere above it. `SearchBar.Token` is the chip; backspace on an
 * empty field fires `onRemoveLastToken`, which is what a token field does
 * everywhere else.
 *
 * They scroll rather than wrap: the field is one line tall, and a row of chips
 * that grew it would move the caret every time something was picked.
 *
 * ## The clear button, and why it is not the platform's
 *
 * A ✕ appears inside the field as soon as there is something to clear, and
 * takes it back to empty without dismissing the keyboard — clearing a query is
 * the start of the next one, not the end of the search. It is drawn here
 * rather than left to `clearButtonMode`, which exists on iOS only, cannot be
 * labelled for a screen reader and cannot be swapped for a spinner while
 * results are in flight.
 *
 * The glyph is 24 points and its touch box is 48, made up with slop rather
 * than with size. A 48-point circle inside a 40-point field either overflows
 * it or forces every search bar in an app to be as tall as the largest one.
 *
 * ## Cancel is a row, not a decoration
 *
 * `cancel="focus"` puts a Cancel button beside the field and slides it in
 * while the field is being edited, which is the platform's own answer to
 * "how do I get out of this search". It is a sibling of the field rather than
 * something inside it, because it acts on the search as a whole: it empties
 * the query, drops focus and calls `onCancel`, and a control that ends the
 * thing it sits inside reads as part of the query it is about to discard.
 *
 * Its width is measured once and animated on the UI thread. The button is
 * always mounted when `cancel` is not `never`, so the measurement is already
 * there the first time the field is touched and the first slide is as smooth
 * as the tenth.
 *
 * ## Debouncing belongs to the caller's search, not to the field
 *
 * `onChangeText` always fires on every keystroke — a controlled field that
 * lags its own input is unusable. `debounce` is about the *query*: it holds
 * `onDebouncedChange` until typing pauses, so a network search runs once per
 * pause instead of once per letter. Submitting flushes it immediately, since
 * a return key is somebody saying they are done waiting.
 */
import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { tv, type VariantProps } from 'tailwind-variants';
import { useKeyboard } from '../../hooks/use-keyboard';
import { SearchIcon, XIcon } from '../../icons';
import {
  AnimatedPressable,
  type AnimatedPressableProps,
} from '../../primitives/animated-pressable';
import { KeyboardAvoider } from '../../primitives/keyboard-avoider';
import { Text } from '../../primitives/text';
import { Input, type InputProps } from '../input';
import { Spinner } from '../spinner';
import {
  cancelSearchBarDebounce,
  flushSearchBarDebounce,
  scheduleSearchBarDebounce,
  type SearchBarDebounceTimer,
} from './search-bar-debounce';
import type { KeyPressEvent, SubmitEditingEvent, TextInputRef, ViewRef } from '../../primitives/refs';

/** Matches the field's own focus crossfade, so the row settles as one thing. */
const CANCEL_DURATION = 180;

/** Space kept between the field and the Cancel button while it is out. */
const CANCEL_GAP = 8;

/**
 * Slop around the 24-point clear glyph, taking its touch box to 48 without
 * changing the height of the field it sits in.
 */
const CLEAR_HIT_SLOP = 12;

/** The panel's crossfade, matching every other anchored list in the library. */
const PANEL_IN = 140;
const PANEL_OUT = 120;

/** Gap left between the panel's far edge and the edge of the screen. */
const PANEL_EDGE_GAP = 24;

/** Floor for the derived height — below this a list is not worth opening. */
const PANEL_MIN_HEIGHT = 160;

/**
 * Ceiling for the derived height, in points. About six rows and a heading.
 *
 * The room above a lifted field is most of the screen, and a panel that takes
 * all of it is a full-screen list that happens to have a search box under it —
 * the page it was opened over stops being visible, so the search stops reading
 * as something laid over the app. Past this the results scroll, which is what
 * a long list should do anyway.
 *
 * `panelMaxHeight` overrides it for a screen that really is nothing but the
 * search.
 */
const PANEL_MAX_HEIGHT = 320;

/**
 * The field's height per size, matching `Input`'s own `h-10 / h-12 / h-14`.
 *
 * It is the fallback for the slot the panel keeps for the field, which is
 * otherwise the measured height and therefore zero on the frame the panel
 * first opens. A zero slot puts the card's bottom edge at the field's, so the
 * last row is drawn underneath the field — which is painted after the card and
 * takes the touch. The press then reads as a tap on the input.
 */
const FIELD_HEIGHT = { sm: 40, md: 48, lg: 56 } as const;

/**
 * How long a press inside the panel keeps the field's focus. Long enough to
 * cover the blur Android sends with the press and the re-render that follows
 * it, short enough that a real dismissal is never held open.
 */
const FOCUS_GUARD = 400;

/**
 * How long the panel waits after a blur before believing the search is over.
 *
 * The guard above only covers presses that go through this component's own
 * parts. A caller's own `Pressable` in a row's `trailing` slot takes the touch
 * itself and this component never hears about it — so the catch-all is the
 * keyboard: it is still up, because nothing in the panel dismisses it, and a
 * search whose keyboard is still up has not ended. The pause is long enough
 * for focus to come back on its own and short enough that a real dismissal
 * does not leave the panel hanging.
 */
const BLUR_GRACE = 220;

/** Share of the field a row of tokens may take before it starts scrolling. */
const TOKEN_MAX_SHARE = 0.6;

/*
 * The card is pinned to the edge of the field's own slot and grows away from
 * it, so the field's box is the one thing that never moves.
 */
const CARD_ABOVE: ViewStyle = { position: 'absolute', bottom: 0, left: 0, right: 0 };
const CARD_BELOW: ViewStyle = { position: 'absolute', top: 0, left: 0, right: 0 };

/*
 * `zIndex` *and* `elevation`, on the field's own box rather than on the card:
 * Android draws siblings in tree order and takes its stacking from elevation,
 * so a card overlapping the content above the field would otherwise be painted
 * under it — and putting it here keeps the field painting over the card, which
 * is what lets the two be one surface.
 *
 * Applied always, and never toggled. React Native implements `zIndex` on iOS
 * by reordering the parent's subviews, which takes the view out of the
 * hierarchy and puts it back — and a `UITextField` removed from the window
 * resigns first responder. Setting this at the moment the panel opens
 * therefore blurred the field that had just been focused, which closed the
 * panel again: the keyboard came up and went straight back down, and the only
 * way to get a search open was to be quicker than the render.
 *
 * A constant stacking order costs nothing while the panel is shut — there is
 * nothing to stack against — and the elevation draws no shadow, because the
 * box has no background for Android to cast one from.
 */
const RAISED: ViewStyle = { zIndex: 20, elevation: 20 };

const searchBarVariants = tv({
  slots: {
    row: 'w-full flex-row items-center',
    /*
     * The box the panel is positioned against — the field alone, so the panel
     * is the field's width rather than the row's and does not run out under a
     * Cancel button that is only sometimes there.
     */
    anchor: 'relative',
    field: '',
    /*
     * One card around the results *and* the field, with the field drawn over
     * the space kept for it at the bottom.
     *
     * It has to be one box because the outline is one outline. Drawn as two —
     * a bordered panel above a bordered field — the field's edge is the focus
     * ring, since a field with a panel open is a field being typed into, and
     * the card ends up with a brighter box welded to a dimmer one.
     *
     * `bg-popover`, not `bg-card`: this floats over the page rather than
     * sitting in it, and a card is one step from the background — close enough
     * that in dark mode the whole thing dissolves into the screen behind it.
     */
    panel: 'overflow-hidden rounded-2xl border border-border bg-popover shadow-lg',
    panelList: 'p-1.5',
    /** The hairline between the results and the field. */
    panelDivider: 'w-full bg-border',
    /*
     * A gap between the rows, because a selected one is drawn as a filled
     * shape. Stacked flush, its fill runs into the row underneath and the two
     * read as one block with a coloured top half — a row's rounded corners are
     * only visible when there is background either side of them to round
     * against. Two points separates the fills and still reads as a list rather
     * than a set of cards.
     */
    section: 'gap-0.5',
    sectionLabel: 'px-3 pb-1 pt-2 text-sm text-muted-foreground',
    item: 'flex-row items-center gap-3 rounded-lg px-3 py-2.5',
    itemLabel: 'flex-1 text-base text-foreground',
    status: 'flex-row items-center justify-center gap-2 px-3 py-8',
    // Clipped, because this is what the Cancel button is revealed out of: the
    // button keeps its measured width and the container's grows past it.
    //
    // `self-stretch` gives it the row's height, which it has no other way of
    // getting — its only child is positioned absolutely, so it has no content
    // to be as tall as.
    cancelClip: 'self-stretch overflow-hidden',
    cancelButton: 'absolute bottom-0 end-0 top-0 items-center justify-center ps-2',
    cancelLabel: 'font-medium text-primary',
    clear: 'items-center justify-center rounded-full',
    /*
     * The chips sit in the field's start content, which `Input` measures and
     * turns into padding on the text — so the caret starts after them however
     * many there are, and nothing typed ever runs underneath them.
     */
    tokenRow: 'flex-row items-center gap-1.5',
    token: 'flex-row items-center gap-1 rounded-full bg-accent ps-2 pe-1',
    tokenLabel: 'text-accent-foreground',
    tokenRemove: 'items-center justify-center rounded-full',
  },
  variants: {
    size: {
      sm: {
        cancelLabel: 'text-[14px]',
        clear: 'h-6 w-6',
        token: 'h-6',
        tokenLabel: 'text-[13px]',
        tokenRemove: 'h-4 w-4',
      },
      md: {
        cancelLabel: 'text-[16px]',
        clear: 'h-6 w-6',
        token: 'h-7',
        tokenLabel: 'text-[14px]',
        tokenRemove: 'h-5 w-5',
      },
      lg: {
        cancelLabel: 'text-[16px]',
        clear: 'h-7 w-7',
        token: 'h-8',
        tokenLabel: 'text-[15px]',
        tokenRemove: 'h-5 w-5',
      },
    },
    /**
     * The field's corner. `pill` is the shape a search field takes when it is
     * chrome — sitting above a list, in a header — and `rounded` the one it
     * takes inside a form beside other fields.
     */
    shape: {
      rounded: { field: '' },
      pill: { field: 'rounded-full' },
    },
    /**
     * Which edge of the field the card grows out of. The field's corners on
     * that edge go square and its border comes off entirely — the card around
     * both of them is what draws the edge.
     */
    attached: {
      none: {},
      top: { field: 'rounded-t-none rounded-b-2xl border-0' },
      bottom: { field: 'rounded-b-none rounded-t-2xl border-0' },
    },
    selected: {
      true: { item: 'bg-accent', itemLabel: 'text-accent-foreground' },
    },
  },
  defaultVariants: {
    size: 'md',
    shape: 'rounded',
    attached: 'none',
  },
});

type SearchBarVariantProps = VariantProps<typeof searchBarVariants>;

/** Glyph sizes per field size — the icon tracks the text, not the box. */
const ICON_SIZE = { sm: 16, md: 18, lg: 20 } as const;

interface SearchBarContextValue {
  /** The field's size, so a chip drawn in it matches the text beside it. */
  size: NonNullable<SearchBarVariantProps['size']>;
  /**
   * Marks the field as still in use and asks for focus back. Called by
   * anything pressable the panel or the field contains, before the press has
   * had a chance to blur the field and close the search around it.
   */
  retainFocus: () => void;
}

const SearchBarContext = createContext<SearchBarContextValue | null>(null);

/** Where the results open. */
export type SearchBarPanelPlacement = 'top' | 'bottom';

/** When the results are shown. */
export type SearchBarPanelMode = 'never' | 'focus' | 'always';

/**
 * What SearchBar takes from Input, minus everything it owns itself. The form
 * furniture is dropped along with it: a label and an error line stack above
 * and below the field, and Cancel sits beside the whole stack rather than
 * beside the field it belongs to. Use `Field` for a search that is one answer
 * in a form.
 *
 * The keyboard props go too. Input's would move the field and leave the Cancel
 * button and the panel where they were; SearchBar lifts all three together.
 */
type InheritedInputProps = Omit<
  InputProps,
  | 'avoidKeyboard'
  | 'defaultValue'
  | 'description'
  | 'endContent'
  | 'errorMessage'
  | 'interactiveContent'
  | 'isRequired'
  | 'keyboardBottomInset'
  | 'keyboardMode'
  | 'keyboardOffset'
  | 'label'
  | 'multiline'
  | 'onChangeText'
  | 'size'
  | 'startContent'
  | 'value'
>;

export interface SearchBarProps
  extends InheritedInputProps,
    Omit<SearchBarVariantProps, 'attached' | 'selected'> {
  /**
   * The field's background, from `Input`. `outline` draws its own edge, for a
   * search bar sitting on the page; `filled` drops it, for one inside a card
   * or a header where a second border reads as a seam. Defaults to `outline`.
   */
  variant?: InputProps['variant'];
  /** The query, when the caller holds it. Leave unset to let the field keep it. */
  value?: string;
  /** Starting query for an uncontrolled field. Ignored once `value` is passed. */
  defaultValue?: string;
  /** Fires on every keystroke. For a search that costs something, see `debounce`. */
  onChangeText?: (value: string) => void;
  /** The return key, which is labelled Search. Flushes `onDebouncedChange` first. */
  onSubmit?: (value: string) => void;
  /**
   * How long typing has to pause before `onDebouncedChange` runs, in
   * milliseconds. `0` runs it on every keystroke, which is only right for a
   * filter over a list already in memory.
   */
  debounce?: number;
  /** The query, once typing has paused for `debounce` milliseconds. */
  onDebouncedChange?: (value: string) => void;
  /** Fires after the ✕ empties the field. The field keeps focus. */
  onClear?: () => void;
  /** Fires after Cancel empties the field and drops focus. */
  onCancel?: () => void;
  /** Whether the ✕ appears once there is a query. */
  isClearable?: boolean;
  /**
   * When the Cancel button is beside the field. `focus` slides it in while the
   * field is being edited and away again when it is not, which is what a
   * search bar above a list wants. `always` keeps it out, for a screen that is
   * nothing but the search.
   */
  cancel?: 'never' | 'focus' | 'always';
  /** The Cancel button's word. */
  cancelLabel?: string;
  /** How the ✕ announces itself. */
  clearLabel?: string;
  /**
   * Results are on their way. A spinner takes the ✕'s place, because the two
   * would otherwise sit on top of one another at exactly the moment a query is
   * both non-empty and running.
   */
  loading?: boolean;
  /** The leading glyph, for a search over something with a symbol of its own. */
  icon?: ReactNode;
  /**
   * Lift the whole search — field, Cancel button and panel — until it sits
   * clear of the software keyboard, and put it back on blur. Without it the
   * field stays where the page left it, which on most screens is behind the
   * keyboard it just opened.
   *
   * Install `react-native-keyboard-controller` for this to behave on Android.
   *
   * Do not toggle it at runtime: it changes which component wraps the row, so
   * the field would remount and lose focus.
   */
  avoidKeyboard?: boolean;
  /** Gap kept between the field's bottom edge and the keyboard. */
  keyboardOffset?: number;
  /**
   * When the results panel is shown. `focus` opens it while the field is being
   * typed into, `always` keeps it out for a screen that is nothing but the
   * search, `never` ignores the children entirely.
   */
  panel?: SearchBarPanelMode;
  /**
   * Which side of the field the panel opens out of. `top` is the default,
   * because the space under a focused field belongs to the keyboard.
   */
  panelPlacement?: SearchBarPanelPlacement;
  /**
   * Cap on the panel's height, in points.
   *
   * The panel takes the smaller of this and the room between the field and the
   * edge of the screen, so it never runs off the top of the display. Unset, it
   * is capped at about six rows: the space above a lifted field is most of the
   * screen, and a panel that takes all of it stops reading as something laid
   * over the app. Longer lists scroll.
   */
  panelMaxHeight?: number;
  /**
   * What has been picked so far, drawn inside the field before the caret.
   * `SearchBar.Token` is the chip; anything else that fits on one line works
   * too. Tokens scroll rather than wrap, so the field stays one line tall.
   */
  tokens?: ReactNode;
  /**
   * Fires when backspace is pressed in an empty field. Remove the last token
   * here — it is the gesture every token field answers, and without it the
   * only way back out of a choice is its own ✕.
   */
  onRemoveLastToken?: () => void;
  /** The panel's contents — `SearchBar.Section`, `.Item` and `.Status`. */
  children?: ReactNode;
}

const SearchBarRoot = forwardRef<TextInputRef, SearchBarProps>(
  (
    {
      value: valueProp,
      defaultValue,
      onChangeText,
      onSubmit,
      debounce = 0,
      onDebouncedChange,
      onClear,
      onCancel,
      isClearable = true,
      cancel = 'never',
      cancelLabel = 'Cancel',
      clearLabel = 'Clear search',
      loading = false,
      icon,
      shape,
      size = 'md',
      className,
      containerClassName,
      disabled,
      avoidKeyboard = false,
      keyboardOffset = 12,
      panel = 'focus',
      panelPlacement = 'top',
      panelMaxHeight,
      tokens,
      onRemoveLastToken,
      children,
      onFocus,
      onBlur,
      onKeyPress,
      onSubmitEditing,
      ...props
    },
    ref
  ) => {
    const controlled = valueProp !== undefined;
    const [internal, setInternal] = useState(defaultValue ?? '');
    const text = controlled ? valueProp : internal;

    const [focused, setFocused] = useState(false);
    const inputRef = useRef<TextInputRef | null>(null);
    useImperativeHandle(ref, () => inputRef.current as TextInputRef, []);

    /*
     * Counted rather than tested for truthiness: `{results.map(…)}` over an
     * empty array is a child, and a panel that opens on nothing is a card of
     * padding.
     */
    const hasPanel = useMemo(() => {
      let found = false;
      Children.forEach(children, (child) => {
        if (isValidElement(child)) found = true;
      });
      return found;
    }, [children]);

    const panelOpen =
      !disabled &&
      panel !== 'never' &&
      hasPanel &&
      (panel === 'always' || focused);

    const attached = panelOpen ? panelPlacement : 'none';
    const slots = searchBarVariants({ size, shape, attached });

    const setText = useCallback(
      (next: string) => {
        if (!controlled) setInternal(next);
        onChangeText?.(next);
      },
      [controlled, onChangeText]
    );

    /*
     * The debounced callback is read through a ref so an inline arrow function
     * — which is what a caller writes — does not restart the timer on every
     * render and push the pause out forever.
     */
    const debouncedRef = useRef(onDebouncedChange);
    const debounceTimerRef = useRef<SearchBarDebounceTimer['current']>(null);
    useEffect(() => {
      debouncedRef.current = onDebouncedChange;
    });

    // Skipped on mount: nothing was typed, so there is no pause to be at the
    // end of, and firing here would run a search for the initial value.
    const settled = useRef(false);
    useEffect(() => {
      if (!settled.current) {
        settled.current = true;
        return;
      }
      scheduleSearchBarDebounce(debounceTimerRef, debouncedRef.current, text, debounce);
      return () => {
        cancelSearchBarDebounce(debounceTimerRef);
      };
    }, [text, debounce]);

    /*
     * Set while a press inside the panel or the field is being served. A blur
     * arriving under it is the press taking focus rather than the search
     * ending, so it is answered by asking for focus back — the panel is drawn
     * out of `focused`, and letting it through would close the panel the
     * pressed control is standing in.
     */
    const guarded = useRef(false);
    const guardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(
      () => () => {
        if (guardTimer.current) clearTimeout(guardTimer.current);
      },
      []
    );

    const retainFocus = useCallback(() => {
      if (disabled) return;
      guarded.current = true;
      if (guardTimer.current) clearTimeout(guardTimer.current);
      guardTimer.current = setTimeout(() => {
        guarded.current = false;
      }, FOCUS_GUARD);
      inputRef.current?.focus();
    }, [disabled]);

    /*
     * Set while the search is being ended deliberately — Cancel, or a caller
     * calling `blur()`. Without it the recovery below would fight the very
     * thing that is trying to close the search.
     */
    const ending = useRef(false);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clearCloseTimer = useCallback(() => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }, []);

    useEffect(() => clearCloseTimer, [clearCloseTimer]);

    // Read inside a timer, so it has to be a ref rather than the render value.
    const keyboardUp = useRef(false);

    const handleFocus = useCallback<NonNullable<InputProps['onFocus']>>(
      (event) => {
        clearCloseTimer();
        ending.current = false;
        setFocused(true);
        onFocus?.(event);
      },
      [clearCloseTimer, onFocus]
    );

    const handleBlur = useCallback<NonNullable<InputProps['onBlur']>>(
      (event) => {
        // The caller asked for the event, so it goes out now rather than at
        // the end of the pause — this is about what the *panel* believes.
        onBlur?.(event);

        if (guarded.current) {
          inputRef.current?.focus();
          return;
        }

        clearCloseTimer();
        closeTimer.current = setTimeout(() => {
          closeTimer.current = null;
          /*
           * A keyboard that never went down is not on its own proof that the
           * focus is still inside this search.
           *
           * Put two search bars on one screen and they hand the keyboard
           * between them: the first blurs, the keyboard stays up because the
           * second now has it, and the first takes it straight back — then the
           * second does the same, and both draw themselves as the field being
           * typed into. A screen showing sizes or variants is four of them in a
           * column, so this is the arrangement, not a corner case.
           *
           * So ask who actually holds it. Another field means somebody moved
           * on deliberately; a focus that has landed nowhere is one of this
           * search's own buttons taking it, which is what the recovery is for.
           */
          const holder = TextInput.State.currentlyFocusedInput();
          const elsewhere = holder != null && holder !== inputRef.current;
          if (!ending.current && keyboardUp.current && !elsewhere) {
            inputRef.current?.focus();
            return;
          }
          setFocused(false);
        }, BLUR_GRACE);
      },
      [clearCloseTimer, onBlur]
    );

    const handleKeyPress = useCallback(
      (event: KeyPressEvent) => {
        // Only on an empty field: while there is a query, backspace is editing
        // it, and eating a token instead would delete something nobody aimed at.
        if (event.nativeEvent.key === 'Backspace' && text.length === 0) {
          onRemoveLastToken?.();
        }
        onKeyPress?.(event);
      },
      [onKeyPress, onRemoveLastToken, text.length]
    );

    const handleSubmit = useCallback(
      (event: SubmitEditingEvent) => {
        if (disabled) return;
        // A return key is somebody saying they are done waiting, so the
        // pending pause is spent rather than waited out.
        flushSearchBarDebounce(debounceTimerRef, debouncedRef.current, text);
        onSubmit?.(text);
        onSubmitEditing?.(event);
      },
      [disabled, onSubmit, onSubmitEditing, text]
    );

    const handleClear = useCallback(() => {
      if (disabled) return;
      setText('');
      onClear?.();
      // The keyboard stays: clearing a query is the start of the next one.
      // Android takes focus away with the press, so it is asked back.
      inputRef.current?.focus();
    }, [disabled, onClear, setText]);

    const handleCancel = useCallback(() => {
      if (disabled) return;
      // Deliberate: the recovery above must not answer this blur by handing
      // the focus straight back.
      ending.current = true;
      guarded.current = false;
      setText('');
      setFocused(false);
      inputRef.current?.blur();
      onCancel?.();
    }, [disabled, onCancel, setText]);

    /*
     * Cancel's width is measured once and driven from a shared value, so the
     * slide costs no re-render. `cancelWidth` is a shared value rather than
     * state for the same reason — a measurement that arrives as state would
     * re-render the field it is beside.
     */
    const cancelWidth = useSharedValue(0);
    const cancelOut = cancel === 'always' || (cancel === 'focus' && focused);
    const cancelProgress = useSharedValue(cancel === 'always' ? 1 : 0);

    useEffect(() => {
      if (cancel === 'never') return;
      cancelProgress.value = withTiming(cancelOut ? 1 : 0, {
        duration: CANCEL_DURATION,
      });
    }, [cancel, cancelOut, cancelProgress]);

    const cancelStyle = useAnimatedStyle(() => ({
      width: (cancelWidth.value + CANCEL_GAP) * cancelProgress.value,
      opacity: cancelProgress.value,
    }));

    const handleCancelLayout = useCallback(
      (event: LayoutChangeEvent) => {
        cancelWidth.value = event.nativeEvent.layout.width;
      },
      [cancelWidth]
    );

    /*
     * How much room the panel has, in the direction it opens. Measured on the
     * JS side because it decides a layout constraint rather than a frame of an
     * animation: a `maxHeight` that changed every frame would re-lay out the
     * list under the finger scrolling it.
     */
    const { height: windowHeight } = useWindowDimensions();
    const { height: keyboardHeight } = useKeyboard();
    useEffect(() => {
      keyboardUp.current = keyboardHeight > 0;
    }, [keyboardHeight]);
    const anchorRef = useRef<ViewRef | null>(null);
    const [anchorBox, setAnchorBox] = useState<{
      top: number;
      height: number;
      width: number;
    } | null>(null);

    const measureAnchor = useCallback(() => {
      anchorRef.current?.measureInWindow((_x, y, width, height) => {
        setAnchorBox((current) =>
          current &&
          current.top === y &&
          current.height === height &&
          current.width === width
            ? current
            : { top: y, height, width }
        );
      });
    }, []);

    useEffect(() => {
      if (!panelOpen) return;
      measureAnchor();
    }, [panelOpen, keyboardHeight, measureAnchor]);

    const resolvedMaxHeight = useMemo(() => {
      const fieldHeight = anchorBox?.height ?? 0;
      /*
       * While the field is riding the keyboard, where it has come to rest is
       * computed rather than measured: the lift is a transform applied on the
       * UI thread, so a measurement taken from JavaScript is a frame behind it
       * for the whole of the animation.
       */
      const fieldTop =
        avoidKeyboard && keyboardHeight > 0
          ? windowHeight - keyboardHeight - keyboardOffset - fieldHeight
          : (anchorBox?.top ?? 0);
      const room =
        panelPlacement === 'top'
          ? fieldTop - PANEL_EDGE_GAP
          : windowHeight - keyboardHeight - fieldTop - fieldHeight - PANEL_EDGE_GAP;
      /*
       * The smaller of what it is allowed and what it actually has, floored so
       * a cramped screen still opens something worth reading. A caller's cap
       * is clamped to the room too — a cap taller than the space available is
       * a panel running off the top of the display.
       */
      const cap = panelMaxHeight ?? PANEL_MAX_HEIGHT;
      return Math.max(Math.min(cap, room), PANEL_MIN_HEIGHT);
    }, [
      anchorBox,
      avoidKeyboard,
      keyboardHeight,
      keyboardOffset,
      panelMaxHeight,
      panelPlacement,
      windowHeight,
    ]);

    const glyph = (
      /*
       * Decorative, and said so here rather than through Input's
       * `interactiveContent` — that flag covers both ends of the field, and
       * turning it off to quieten the magnifier would take the clear button's
       * touches with it.
       */
      <View
        key="glyph"
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {icon ?? <SearchIcon size={ICON_SIZE[size]} />}
      </View>
    );

    /*
     * Capped and scrolling rather than wrapping. The field is one line tall, so
     * a row of chips allowed to grow would move the caret every time something
     * was picked; and left uncapped it would take the whole field and leave
     * nowhere to type the next query.
     */
    const tokenRow = tokens ? (
      <ScrollView
        key="tokens"
        horizontal
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}
        style={{
          maxWidth: anchorBox ? anchorBox.width * TOKEN_MAX_SHARE : undefined,
        }}
        contentContainerClassName={slots.tokenRow()}
      >
        {tokens}
      </ScrollView>
    ) : null;

    const startContent = tokenRow ? (
      <>
        {glyph}
        {tokenRow}
      </>
    ) : (
      glyph
    );

    const endContent = loading ? (
      <Spinner size="sm" />
    ) : isClearable && text.length > 0 ? (
      <AnimatedPressable
        onPress={handleClear}
        disabled={disabled}
        hitSlop={CLEAR_HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel={clearLabel}
        className={slots.clear()}
      >
        <XIcon size={ICON_SIZE[size]} />
      </AnimatedPressable>
    ) : null;

    const field = (
      <Input
        ref={inputRef}
        size={size}
        disabled={disabled}
        className={slots.field({ className })}
        containerClassName="w-full"
        startContent={startContent}
        endContent={endContent}
        value={text}
        onChangeText={setText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyPress={handleKeyPress}
        onSubmitEditing={handleSubmit}
        accessibilityRole="search"
        returnKeyType="search"
        // The platform's own ✕ would sit on top of this component's, and only
        // on iOS.
        clearButtonMode="never"
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        placeholder="Search"
        {...props}
      />
    );

    const context = useMemo<SearchBarContextValue>(
      () => ({ size, retainFocus }),
      [retainFocus, size]
    );

    // Nothing beside it and nothing under it: the field is the whole component,
    // and a wrapper around it would only be a box for the caller's layout to
    // fight.
    if (cancel === 'never' && !avoidKeyboard && !hasPanel) {
      return (
        <SearchBarContext.Provider value={context}>
          <View ref={anchorRef} onLayout={measureAnchor} className={containerClassName}>
            {field}
          </View>
        </SearchBarContext.Provider>
      );
    }

    /*
     * The results, the hairline and the room the field occupies, in the order
     * they are stacked. The field itself is drawn over that last piece rather
     * than inside the card: it has to keep its own place in the layout, and a
     * text field that moved into an absolutely positioned box on focus would
     * remount and lose the keyboard it just opened.
     */
    const list = (
      <ScrollView
        key="list"
        style={{ maxHeight: resolvedMaxHeight }}
        /*
         * `always`, not `handled`: everything in the panel that is not itself
         * a button — the padding, the gaps between rows, a section heading,
         * the whole of `SearchBar.Status` — would otherwise spend the first
         * tap dismissing the keyboard, which ends the search.
         */
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
        bounces={false}
        className={slots.panelList()}
      >
        {children}
      </ScrollView>
    );
    const divider = (
      <View
        key="divider"
        pointerEvents="none"
        style={{ height: StyleSheet.hairlineWidth }}
        className={slots.panelDivider()}
      />
    );
    /*
     * The room the card keeps for the field, and the reason it is inert.
     *
     * It is a spacer drawn at exactly the field's position, inside the card and
     * therefore outside the list's `keyboardShouldPersistTaps`. Any touch it
     * wins is a touch on a plain view while a field is focused, which is the
     * platform's cue to dismiss the keyboard — so the field blurs, and the
     * panel drawn out of that focus closes. From the outside that is "tapping
     * the search box closes the results", which is exactly backwards.
     *
     * It has nothing to be pressed for. `none` puts the touch through to the
     * field underneath it, where it was aimed.
     */
    const fieldSlot = (
      <View
        key="slot"
        pointerEvents="none"
        style={{ height: anchorBox?.height ?? FIELD_HEIGHT[size] }}
      />
    );

    const anchor = (
      <View
        ref={anchorRef}
        onLayout={measureAnchor}
        style={RAISED}
        className={slots.anchor({ className: cancel === 'never' ? 'w-full' : 'flex-1' })}
      >
        {panelOpen ? (
          <Animated.View
            entering={FadeIn.duration(PANEL_IN)}
            exiting={FadeOut.duration(PANEL_OUT)}
            // `box-none`: the card is a surface, not a target. Only the rows
            // inside it answer a touch, and the space kept for the field lets
            // one through to the field.
            pointerEvents="box-none"
            style={panelPlacement === 'top' ? CARD_ABOVE : CARD_BELOW}
            className={slots.panel()}
          >
            {panelPlacement === 'top'
              ? [list, divider, fieldSlot]
              : [fieldSlot, divider, list]}
          </Animated.View>
        ) : null}
        {field}
      </View>
    );

    const body =
      cancel === 'never' ? (
        anchor
      ) : (
        <>
          {anchor}
          <Animated.View
            style={cancelStyle}
            className={slots.cancelClip()}
            pointerEvents={cancelOut ? 'auto' : 'none'}
            accessibilityElementsHidden={!cancelOut}
            importantForAccessibility={cancelOut ? 'auto' : 'no-hide-descendants'}
          >
            {/*
             * Absolute, and pinned to the end edge: it keeps its natural width
             * inside a container whose width is animating, so the clip reveals
             * it from the edge instead of squeezing the word as it arrives. It
             * is also what makes the measurement possible at all — a child laid
             * out against a container of width 0 would otherwise report 0.
             */}
            <AnimatedPressable
              onLayout={handleCancelLayout}
              onPress={handleCancel}
              disabled={disabled}
              focusable={!disabled}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityState={{ disabled: !!disabled }}
              className={slots.cancelButton()}
            >
              <Text className={slots.cancelLabel()}>{cancelLabel}</Text>
            </AnimatedPressable>
          </Animated.View>
        </>
      );

    /*
     * The keyboard hook is behind a component boundary rather than a flag.
     * Calling it at all has global consequences — without the keyboard
     * controller installed it falls back to Reanimated's useAnimatedKeyboard,
     * which switches Android out of adjustResize for the whole app. A search
     * bar that never asked to avoid the keyboard must not do that to every
     * other screen.
     */
    if (avoidKeyboard) {
      return (
        <SearchBarContext.Provider value={context}>
          <KeyboardAvoider
            // Only while *this* field is the one being typed into. Without it
            // every avoiding field on the screen lifts the moment any field
            // anywhere is tapped, and since they all aim at the same gap above
            // the keyboard, they arrive stacked on top of one another.
            active={focused}
            mode="lift"
            offset={keyboardOffset}
            className={slots.row({ className: containerClassName })}
          >
            {body}
          </KeyboardAvoider>
        </SearchBarContext.Provider>
      );
    }

    return (
      <SearchBarContext.Provider value={context}>
        <View className={slots.row({ className: containerClassName })}>{body}</View>
      </SearchBarContext.Provider>
    );
  }
);

SearchBarRoot.displayName = 'SearchBar';

export interface SearchBarSectionProps extends ViewProps {
  className?: string;
  /**
   * The heading over the run of rows — "Suggested", "Results". Announced as a
   * header, so a screen reader reaching the group is told what it is before
   * walking into it.
   */
  label?: string;
  children?: ReactNode;
}

/** A labelled run of rows inside the panel. */
function SearchBarSection({ className, label, children, ...props }: SearchBarSectionProps) {
  const { section, sectionLabel } = searchBarVariants();
  return (
    <View {...props} className={section({ className })}>
      {label ? (
        <Text accessibilityRole="header" className={sectionLabel()}>
          {label}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

SearchBarSection.displayName = 'SearchBar.Section';

export interface SearchBarItemProps extends Omit<AnimatedPressableProps, 'children'> {
  className?: string;
  /** Anything before the label — an avatar, a logo, a status dot. */
  leading?: ReactNode;
  /**
   * Anything after it. A slot rather than a built-in button, because what a
   * result row offers differs per search: an add, a pin, a count, nothing.
   */
  trailing?: ReactNode;
  /** A second line under the label, for what the label alone cannot say. */
  description?: string;
  /** Draws the row as the one the search has settled on. */
  selected?: boolean;
  /** The row's label. */
  children?: ReactNode;
}

/** One result. */
function SearchBarItem({
  className,
  leading,
  trailing,
  description,
  selected,
  children,
  onPressIn,
  ...props
}: SearchBarItemProps) {
  const { item, itemLabel } = searchBarVariants({ selected: !!selected });
  const search = useContext(SearchBarContext);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!props.disabled }}
      /*
       * Before the press, not after it: the blur it may cause is what closes
       * the panel this row is drawn in, and by the time `onPress` runs the row
       * can already be gone.
       */
      onPressIn={(event) => {
        search?.retainFocus();
        onPressIn?.(event);
      }}
      // A row is a wide target, and a target that shrinks when pressed reads as
      // a card rather than a line in a list. The dim is the whole feedback.
      pressScale={1}
      pressOpacity={0.6}
      // The two points of gap the section leaves between rows belong to
      // neither of them otherwise, and a dead line across a list of targets is
      // a tap that does nothing.
      hitSlop={{ top: 2, bottom: 2 }}
      {...props}
      className={item({ className })}
    >
      {leading}
      <View className="flex-1">
        <Text numberOfLines={1} className={itemLabel()}>
          {children}
        </Text>
        {description ? (
          <Text size="sm" muted numberOfLines={1}>
            {description}
          </Text>
        ) : null}
      </View>
      {trailing}
    </AnimatedPressable>
  );
}

SearchBarItem.displayName = 'SearchBar.Item';

export interface SearchBarStatusProps extends ViewProps {
  className?: string;
  /** A spinner beside the line, for a search that is still running. */
  loading?: boolean;
  children?: ReactNode;
}

/**
 * The one line a panel shows instead of rows — nothing typed yet, a search in
 * flight, or a query that matched nothing. It is a sentence rather than an
 * empty box because those three states look identical when they are blank, and
 * which one it is decides what the person does next.
 */
function SearchBarStatus({
  className,
  loading = false,
  children,
  ...props
}: SearchBarStatusProps) {
  const { status } = searchBarVariants();
  return (
    <View accessibilityRole="text" {...props} className={status({ className })}>
      {loading ? <Spinner size="sm" /> : null}
      <Text size="sm" muted>
        {children}
      </Text>
    </View>
  );
}

SearchBarStatus.displayName = 'SearchBar.Status';

export interface SearchBarActionProps extends AnimatedPressableProps {
  className?: string;
  children?: ReactNode;
}

/**
 * A button inside a row — an add, a pin, a remove — for the `trailing` slot.
 *
 * It exists rather than being left to a plain `Pressable` because a control
 * nested inside a row takes the touch itself, so the row above it never sees
 * the press and cannot hold the field's focus on its behalf. Pressed, this one
 * ends up blurring the field, and a blurred field closes the panel the button
 * was standing in — the press lands and the search disappears under it.
 */
function SearchBarAction({ className, children, onPressIn, ...props }: SearchBarActionProps) {
  const search = useContext(SearchBarContext);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      hitSlop={12}
      pressScale={1}
      pressOpacity={0.5}
      onPressIn={(event) => {
        search?.retainFocus();
        onPressIn?.(event);
      }}
      {...props}
      className={className}
    >
      {children}
    </AnimatedPressable>
  );
}

SearchBarAction.displayName = 'SearchBar.Action';

export interface SearchBarTokenProps extends ViewProps {
  className?: string;
  /** Anything before the label — an avatar, a logo, a status dot. */
  leading?: ReactNode;
  /** Fires when the chip's ✕ is pressed. Without it no ✕ is drawn. */
  onRemove?: () => void;
  /** How the ✕ announces itself. Defaults to `Remove <label>`. */
  removeLabel?: string;
  /** The chip's label. */
  children?: ReactNode;
}

/**
 * One choice already made, drawn inside the field before the caret.
 *
 * It sits in the field rather than in a list above it so that the query and
 * what the query has produced are one control. A search that files its results
 * somewhere else asks the reader to look in two places to know where they are.
 */
function SearchBarToken({
  className,
  leading,
  onRemove,
  removeLabel,
  children,
  ...props
}: SearchBarTokenProps) {
  const search = useContext(SearchBarContext);
  const slots = searchBarVariants({ size: search?.size ?? 'md' });
  const label = typeof children === 'string' ? children : undefined;
  return (
    <View {...props} className={slots.token({ className })}>
      {leading}
      <Text numberOfLines={1} className={slots.tokenLabel()}>
        {children}
      </Text>
      {onRemove ? (
        <SearchBarAction
          accessibilityLabel={removeLabel ?? (label ? `Remove ${label}` : 'Remove')}
          onPress={onRemove}
          className={slots.tokenRemove()}
        >
          <XIcon size={12} />
        </SearchBarAction>
      ) : null}
    </View>
  );
}

SearchBarToken.displayName = 'SearchBar.Token';

export const SearchBar = Object.assign(SearchBarRoot, {
  Section: SearchBarSection,
  Item: SearchBarItem,
  Action: SearchBarAction,
  Token: SearchBarToken,
  Status: SearchBarStatus,
});
