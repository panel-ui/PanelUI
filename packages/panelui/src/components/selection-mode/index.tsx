/**
 * SelectionMode — turning a list into one you can pick several things out of.
 *
 * ```tsx
 * <SelectionMode values={ids} onSelectedChange={setSelected}>
 *   <SelectionMode.Header title="Choose" />
 *   <FlashList
 *     data={threads}
 *     renderItem={({ item }) => (
 *       <SelectionMode.Item value={item.id} onPress={() => open(item)}>
 *         <Item>…</Item>
 *       </SelectionMode.Item>
 *     )}
 *   />
 *   <SelectionMode.Bar>
 *     <SelectionMode.Action icon={<TrashIcon size={20} />} destructive onPress={remove}>
 *       Delete
 *     </SelectionMode.Action>
 *   </SelectionMode.Bar>
 * </SelectionMode>
 * ```
 *
 * ## Two ways to present it
 *
 * On a screen it is a *mode*: the list is there to be read, and a long press
 * turns it into one you can pick from. In a sheet it is a *picker*:
 * `SelectionMode.Sheet` was opened in order to choose something, so it is
 * choosing from the moment it appears, with the actions in the sheet's footer.
 *
 * ## The items stay yours
 *
 * `SelectionMode.Item` wraps whatever you put in it rather than replacing it.
 * It adds the circle and takes over what a press means; what the item looks
 * like is yours. That is what lets one component hold a row of people, a grid
 * of colours, a run of slides and a list of files without growing a prop for
 * each of them.
 *
 * ## A mode has to be obvious
 *
 * There are two states and the list behaves differently in each: normally a tap
 * opens a row, and in selection a tap picks it. That is only safe if leaving is
 * always available and never hidden — hence a cancel in the header, the Android
 * back button, and the count in front of the reader the whole time.
 *
 * Entering is a long press on a row, which is the gesture the platform has used
 * for this for fifteen years, and the row you pressed is the first one picked.
 * Entering with nothing selected leaves the reader in a changed list with no
 * explanation of what changed.
 *
 * ## Selection is a set of values, not of rows
 *
 * The component holds ids, never indices or elements. A list that reorders,
 * pages in more rows or drops one underneath the reader would invalidate
 * anything positional; a set of ids survives all three, and is also the shape
 * the action at the end needs — deleting takes ids.
 */
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, ScrollView, View, type ViewProps } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { useBackHandler } from '../../hooks/use-back-handler';
import { CheckIcon, IconColorProvider, XIcon } from '../../icons';
import { AnimatedPressable } from '../../primitives/animated-pressable';
import { Collapse } from '../../primitives/collapse';
import { Text, textChildren } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { selectionTick } from '../../utils/haptics';
import { BottomSheet } from '../bottom-sheet';
import {
  canEnterSelection,
  handleSelectionItemPress,
  selectAllValues,
  selectionOwnsPress,
  selectionTarget,
  selectValue,
  toggleValue,
} from './selection-mode-contracts';

/** How long the circle takes to come and go, in milliseconds. */
const REVEAL_DURATION = 180;

/**
 * The circle's width, and the gap after it — both in points, and both mirrors
 * of classes on the parts below (`h-6 w-6`, `gap-3`). Written out because the
 * circle's slot is animated between nothing and its full size, and an animation
 * needs the number rather than the class.
 */
const INDICATOR_SIZE = 24;
const ROW_GAP = 12;

/** The spring the tick lands with — the same one the checkbox uses. */
const TICK_SPRING = { damping: 15, stiffness: 300, mass: 0.5 } as const;

/** How far a floating action bar sits from the edges, in points. */
const DEFAULT_BAR_OFFSET = 16;

/**
 * Fill a height that is offered, and take the content's own when none is.
 *
 * `flexBasis: 'auto'` rather than the `0` that `flex: 1` sets. A `flex: 1` box
 * inside a parent of indefinite height resolves to *nothing* — its basis is
 * zero and there is no free space to grow into — so a selection list dropped
 * into a scrolling page would collapse to a hairline instead of showing its
 * rows.
 */
const FILL = { flexGrow: 1, flexShrink: 1, flexBasis: 'auto' } as const;

const selectionVariants = tv({
  slots: {
    circle: 'h-6 w-6 items-center justify-center rounded-full border-2 border-muted-foreground',
    fill: 'absolute inset-0 items-center justify-center rounded-full bg-primary',
    header: 'h-14 flex-row items-center gap-3 border-b border-border px-4',
    title: 'flex-1 text-center text-base font-semibold text-foreground',
    close: 'h-10 w-10 items-center justify-center rounded-full bg-muted',
    group: 'overflow-hidden rounded-2xl',
    ring: 'rounded-full border-2 border-transparent p-0.5',
    bar: 'flex-row items-stretch',
    action: 'flex-1 items-center justify-center gap-1.5 px-2 py-3',
    actionLabel: 'text-xs font-medium text-foreground',
    groupLabel: 'pb-2 ps-1',
  },
  variants: {
    selected: {
      true: { circle: 'border-primary', ring: 'border-foreground' },
    },
    /**
     * The action laid out along its label instead of above it.
     *
     * A screen's bar carries three or four actions side by side, so each one is
     * a narrow column and the label belongs under the glyph. A sheet's footer
     * usually carries one, full width — stacked there it is a tall block that
     * costs the list a row of its own for no gain.
     */
    compact: {
      true: { action: 'flex-row gap-2 px-4 py-2.5', actionLabel: 'text-sm' },
    },
    destructive: {
      true: { actionLabel: 'text-destructive' },
    },
    disabled: {
      true: { action: 'opacity-[0.44]' },
    },
    /**
     * The group's surface, which depends on what is behind it.
     *
     * `card` is a step *down* from the background on a screen, which is what a
     * grouped list wants there. A sheet is already `popover`, and popover sits
     * above card in every dark theme — so the same card inside a sheet is
     * darker than the sheet around it and reads as a hole rather than a raised
     * set of rows.
     *
     * `muted` is an alpha tint, so it steps up from whatever it is drawn on and
     * is correct against either. It is only used in the sheet because the
     * screen's card is right where it is.
     */
    surface: {
      screen: { group: 'bg-card' },
      sheet: { group: 'bg-muted' },
    },
    /**
     * Flush to the bottom edge, or lifted off it.
     *
     * `bar` is the platform shape — full width against the edge, a hairline
     * along the top, and the same background as the screen's own chrome. It is
     * the default because it is what a list with a selection in it does on both
     * platforms, and because it does not take width away from the list.
     */
    placement: {
      bar: { bar: 'border-t border-border bg-popover' },
      floating: { bar: 'rounded-2xl border border-border bg-popover shadow-lg' },
    },
  },
  defaultVariants: {
    placement: 'bar',
    surface: 'screen',
  },
});

type SelectionVariantProps = VariantProps<typeof selectionVariants>;

interface SelectionModeContextValue {
  active: boolean;
  enter: (value?: string) => void;
  exit: () => void;
  selected: string[];
  isSelected: (value: string) => boolean;
  toggle: (value: string) => void;
  selectAll: () => void;
  clear: () => void;
  /** True when everything selectable is picked, and there is something to pick. */
  allSelected: boolean;
  count: number;
  /** How many rows `values` says there are, or 0 when it was not given. */
  total: number;
  max?: number;
  haptics: boolean;
  /**
   * Whether the selection is being presented in a sheet.
   *
   * A sheet is opened *in order to* pick something, so there is no mode to
   * enter and nothing to long-press for — and the action bar belongs to the
   * sheet's footer rather than floating over the screen.
   */
  sheet: boolean;
}

const SelectionModeContext = createContext<SelectionModeContextValue | null>(null);

/**
 * Read the selection from anywhere inside a `SelectionMode` — for a header of
 * your own, a count somewhere else on the screen, or an action that has to know
 * what is picked.
 */
export function useSelectionMode(): SelectionModeContextValue {
  const context = useContext(SelectionModeContext);
  if (!context) {
    throw new Error('useSelectionMode must be used within a <SelectionMode>');
  }
  return context;
}

export interface SelectionModeProps extends ViewProps {
  className?: string;
  /**
   * Every value that can be picked, in list order.
   *
   * Only "select all" and the "n of m" in the header need it — picking rows one
   * at a time works without it. Give it the same ids you give the list.
   */
  values?: string[];
  /** Controlled selection mode. Leave it out and a long press turns it on. */
  active?: boolean;
  /** Whether selection mode starts on. */
  defaultActive?: boolean;
  onActiveChange?: (active: boolean) => void;
  /** Controlled selection. */
  selected?: string[];
  defaultSelected?: string[];
  onSelectedChange?: (selected: string[]) => void;
  /**
   * The most that can be picked at once.
   *
   * A row that would go over it does not toggle on, and "select all" stops at
   * the limit rather than refusing. Leave it out for no limit.
   */
  max?: number;
  /**
   * A tick when a row is picked and when the mode is entered. Off by default —
   * needs the optional `expo-haptics`, and is silent without it.
   */
  haptics?: boolean;
  children: ReactNode;
}

function SelectionModeRoot({
  className,
  values,
  active: activeProp,
  defaultActive = false,
  onActiveChange,
  selected: selectedProp,
  defaultSelected,
  onSelectedChange,
  max,
  haptics = false,
  children,
  ...props
}: SelectionModeProps) {
  const [internalActive, setInternalActive] = useState(defaultActive);
  const [internalSelected, setInternalSelected] = useState<string[]>(defaultSelected ?? []);

  const active = activeProp ?? internalActive;
  const selected = selectedProp ?? internalSelected;

  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const setSelected = useCallback(
    (next: string[]) => {
      if (selectedProp === undefined) setInternalSelected(next);
      onSelectedChange?.(next);
    },
    [selectedProp, onSelectedChange]
  );

  const setActive = useCallback(
    (next: boolean) => {
      if (activeProp === undefined) setInternalActive(next);
      onActiveChange?.(next);
    },
    [activeProp, onActiveChange]
  );

  const enter = useCallback(
    (value?: string) => {
      if (haptics) selectionTick();
      setActive(true);
      // Entering with the row that was pressed already picked. Entering with
      // nothing picked leaves the reader in a list that has changed under them
      // with nothing to show for it.
      if (value !== undefined) {
        const next = selectValue(selectedRef.current, value, max);
        if (next !== selectedRef.current) setSelected(next);
      }
    },
    [haptics, max, setActive, setSelected]
  );

  /*
   * Leaving clears the selection.
   *
   * A selection that outlived the mode would come back the next time it was
   * entered, and the reader who left by pressing cancel is exactly the reader
   * who meant "not those". Keep it across a mode change by controlling
   * `selected` yourself.
   */
  const exit = useCallback(() => {
    setActive(false);
    setSelected([]);
  }, [setActive, setSelected]);

  const isSelected = useCallback(
    (value: string) => selectedRef.current.includes(value),
    []
  );

  const toggle = useCallback(
    (value: string) => {
      const current = selectedRef.current;
      const next = toggleValue(current, value, max);
      if (next === current) return;
      if (!current.includes(value) && haptics) selectionTick();
      setSelected(next);
    },
    [max, haptics, setSelected]
  );

  const selectAll = useCallback(() => {
    if (!values) return;
    // At the limit rather than refusing: somebody who asked for all of them and
    // can only have twenty wants the twenty, not an error.
    setSelected(selectAllValues(values, max));
  }, [values, max, setSelected]);

  const clear = useCallback(() => setSelected([]), [setSelected]);

  const total = values?.length ?? 0;
  const count = selected.length;
  const target = selectionTarget(total, max);
  const allSelected = target > 0 && count >= target;

  // An open mode owns the back button: back should leave the mode, not the
  // screen the list is on.
  useBackHandler(active, exit);

  const context = useMemo<SelectionModeContextValue>(
    () => ({
      active,
      enter,
      exit,
      selected,
      isSelected,
      toggle,
      selectAll,
      clear,
      allSelected,
      count,
      total,
      max,
      haptics,
      sheet: false,
    }),
    [
      active,
      enter,
      exit,
      selected,
      isSelected,
      toggle,
      selectAll,
      clear,
      allSelected,
      count,
      total,
      max,
      haptics,
    ]
  );

  return (
    <SelectionModeContext.Provider value={context}>
      <View style={FILL} className={className} {...props}>
        {textChildren(children)}
      </View>
    </SelectionModeContext.Provider>
  );
}

/* -------------------------------------------------------------------------- *
 * Indicator
 * -------------------------------------------------------------------------- */

export interface SelectionModeIndicatorProps {
  className?: string;
  /** Which row this stands for. Defaults to the row it is inside. */
  value?: string;
}

/**
 * The circle at the left of a row.
 *
 * Round rather than square, and that is the convention doing real work: a
 * square box is a form control the reader is filling in, a round one is a thing
 * they are picking out of a list. `Checkbox` is the former and stays that way.
 *
 * `Item` draws one for you. This is exported for a row that wants it somewhere
 * else — over a photo's corner, at the end instead of the start.
 */
function SelectionModeIndicator({ className, value }: SelectionModeIndicatorProps) {
  const { isSelected } = useSelectionMode();
  const row = useContext(SelectionModeItemContext);
  const target = value ?? row?.value;
  const selected = target !== undefined && isSelected(target);

  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(selected ? 1 : 0);
  const tickColor = useCSSVariable('--color-primary-foreground');
  const slots = selectionVariants({ selected });

  useEffect(() => {
    if (reducedMotion) {
      progress.value = selected ? 1 : 0;
      return;
    }
    progress.value = selected
      ? withSpring(1, TICK_SPRING)
      : withTiming(0, { duration: 120 });
  }, [selected, reducedMotion, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.6 + progress.value * 0.4 }],
  }));

  return (
    <View className={cn(slots.circle(), className)}>
      <Animated.View style={fillStyle} className={slots.fill()}>
        <CheckIcon size={14} color={typeof tickColor === 'string' ? tickColor : '#fff'} />
      </Animated.View>
    </View>
  );
}

/* -------------------------------------------------------------------------- *
 * Item
 * -------------------------------------------------------------------------- */

/** What an indicator inside a row needs to know, without being told twice. */
const SelectionModeItemContext = createContext<{ value: string } | null>(null);

export interface SelectionModeItemProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** This row's id. What ends up in `selected`. */
  value: string;
  /** What the row does whenever selection does not own its press. */
  onPress?: () => void;
  /**
   * Stop this row entering selection mode, and being picked once in it. Its
   * ordinary `onPress` still runs, including while selection is active. For a
   * header row, an advert, a "load more" — anything in the list that is not one
   * of the things being chosen between.
   */
  disabled?: boolean;
  /** Draw the circle without waiting for the mode. */
  alwaysShowIndicator?: boolean;
  /**
   * How being picked is drawn.
   *
   * `leading` puts the circle in front of the item, which is what a row wants.
   * `ring` draws a ring around whatever you gave it instead — for a swatch, a
   * thumbnail or a photo, where a circle beside it would be a second thing to
   * look at and the item itself can carry the state. `none` draws nothing and
   * leaves it to you; read `useSelectionMode().isSelected`.
   */
  indicator?: 'leading' | 'ring' | 'none';
  children: ReactNode;
}

/**
 * One row, with the circle in front of it.
 *
 * The press behaviour is the whole component: off mode, a press is the row's
 * own and a long press turns the mode on with this row picked; in it, a press
 * picks and unpicks. A row excluded from selection keeps its ordinary press in
 * both states. Two meanings for one gesture is exactly why the mode has to be
 * visible from the header.
 */
function SelectionModeItem({
  className,
  value,
  onPress,
  disabled = false,
  alwaysShowIndicator = false,
  indicator = 'leading',
  children,
  ...props
}: SelectionModeItemProps) {
  const { active, enter, toggle, isSelected, sheet } = useSelectionMode();
  const selected = isSelected(value);
  const showing = alwaysShowIndicator || active;
  const selecting = selectionOwnsPress(active, disabled);
  const reducedMotion = useReducedMotion();

  const context = useMemo(() => ({ value }), [value]);

  /*
   * The circle's arrival and departure, as width rather than as opacity.
   *
   * Fading a circle that has already been taken out of the row's layout fades
   * it over content that has finished moving: the row snaps left the frame the
   * mode ends, and a ghost of the circle dissolves where it used to be. The
   * space is what the reader sees change, so the space is what animates, and
   * the negative margin takes the row's own gap with it — a zero-width child
   * still costs a gap, so without it the row would still jump the last twelve
   * points.
   */
  const reveal = useSharedValue(showing ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      reveal.value = showing ? 1 : 0;
      return;
    }
    reveal.value = withTiming(showing ? 1 : 0, { duration: REVEAL_DURATION });
  }, [showing, reducedMotion, reveal]);

  const slotStyle = useAnimatedStyle(() => ({
    width: reveal.value * INDICATOR_SIZE,
    opacity: reveal.value,
    marginEnd: (reveal.value - 1) * ROW_GAP,
  }));

  return (
    <SelectionModeItemContext.Provider value={context}>
      <Pressable
        accessibilityRole={selecting ? 'checkbox' : 'button'}
        accessibilityState={selecting ? { checked: selected } : undefined}
        // Eligible rows become checkboxes only while selection owns their
        // press. Excluded rows remain ordinary buttons because their action is
        // still available.
        accessibilityHint={
          active || disabled ? undefined : 'Long press to select'
        }
        onPress={() => {
          handleSelectionItemPress(active, disabled, () => toggle(value), onPress);
        }}
        onLongPress={
          canEnterSelection(active, disabled, sheet) ? () => enter(value) : undefined
        }
        className={cn(
          indicator === 'leading' ? 'flex-row items-center gap-3 px-4 py-2.5' : '',
          className
        )}
        {...props}
      >
        {indicator === 'leading' ? (
          <>
            <Animated.View style={slotStyle} className="overflow-hidden">
              <SelectionModeIndicator value={value} />
            </Animated.View>
            {/*
             * `minWidth: 0` as well as growing. Without it a long title refuses
             * to be narrower than its own text, pushes the row past the screen
             * and takes the layout with it — which is what a flex child does by
             * default, and why a name ends up broken across lines mid-word.
             */}
            <View style={{ flexGrow: 1, flexShrink: 1, minWidth: 0 }}>
              {textChildren(children)}
            </View>
          </>
        ) : indicator === 'ring' && showing ? (
          <View className={selectionVariants({ selected }).ring()}>
            {textChildren(children)}
          </View>
        ) : (
          textChildren(children)
        )}
      </Pressable>
    </SelectionModeItemContext.Provider>
  );
}

/* -------------------------------------------------------------------------- *
 * Group
 * -------------------------------------------------------------------------- */

export interface SelectionModeGroupProps extends ViewProps {
  className?: string;
  /**
   * Lay the items out in a grid this many across instead of stacking them.
   *
   * For things recognised by sight rather than read — swatches, thumbnails,
   * slides. A grid of six colours is one glance; the same six as rows is a
   * scroll.
   *
   * Ignored when `horizontal` is set.
   */
  columns?: number;
  /**
   * Lay the items out in one row that scrolls sideways.
   *
   * For a strip of small things next to other controls — swatches above a
   * slider, filters above a list. A grid of the same items claims as many rows
   * as it needs and pushes everything below it off the sheet; a strip costs one
   * row whatever the count.
   *
   * Wins over `columns`, which asks for the opposite arrangement.
   */
  horizontal?: boolean;
  /** How wide each item is in a horizontal strip, in points. */
  itemWidth?: number;
  /** Space between items in a grid or a strip, in points. */
  gap?: number;
  /**
   * A caption above the items, on the leading edge.
   *
   * Worth setting on anything picked by sight. A strip of colours with nothing
   * in front of it is a row of circles the reader has to work out the purpose
   * of, and a screen reader has nothing at all to announce it by — so this is
   * also the group's accessibility label.
   */
  label?: string;
  /** Extra classes for that caption. */
  labelClassName?: string;
  /** Hairlines between stacked items. On by default; off in a grid or a strip. */
  separators?: boolean;
  children: ReactNode;
}

/**
 * A rounded card holding a run of items.
 *
 * Grouping is what makes a sheet of choices readable: one card of options with
 * hairlines between them reads as a set, and the same rows loose on the sheet's
 * background read as a list that has not finished loading. It is also what the
 * platform's own sheets do.
 *
 * Stacked by default, with a rule between each item. Pass `columns` for a grid.
 */
function SelectionModeGroup({
  className,
  columns,
  horizontal = false,
  itemWidth = 44,
  gap = 12,
  label,
  labelClassName,
  separators = true,
  children,
  style,
  ...props
}: SelectionModeGroupProps) {
  const items = Children.toArray(children).filter(Boolean);
  // A sheet's own surface already sits above a card's, so which fill the group
  // takes depends on where it is. Every other part reads the context too.
  const { sheet } = useSelectionMode();
  const slots = selectionVariants({ surface: sheet ? 'sheet' : 'screen' });

  /**
   * The caption, and the wrapper that carries it. A group with no `label` is
   * the view it always was, so nothing gains a level of nesting for a prop it
   * did not pass.
   */
  const captioned = (content: ReactNode) =>
    label === undefined ? (
      content
    ) : (
      <View accessibilityLabel={label}>
        <Text size="sm" weight="medium" muted className={cn(slots.groupLabel(), labelClassName)}>
          {label}
        </Text>
        {content}
      </View>
    );

  if (horizontal) {
    /*
     * `gap` on the row rather than padding inside each cell, which is the
     * opposite of the grid below. A strip is not dividing a fixed width between
     * its items, so there is no wrap to protect against — and the gap has to be
     * between them rather than around them, or the strip starts inset from
     * whatever it is in.
     */
    return captioned(
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', gap }}
        style={style}
        className={className}
        {...props}
      >
        {items.map((item, index) => (
          <View key={index} style={{ width: itemWidth }}>
            {item}
          </View>
        ))}
      </ScrollView>
    );
  }

  if (columns && columns > 0) {
    /*
     * The gap is padding inside each cell, not `gap` on the row.
     *
     * A row of cells `100 / columns` wide with a gap between them is wider than
     * the row by the gaps, so the last column wraps and the grid loses a
     * column. Padding inside the cell keeps every cell an exact share of the
     * width, and the negative margin cancels the outer half so the grid still
     * sits flush against whatever it is in.
     */
    const half = gap / 2;
    return captioned(
      <View
        style={[{ flexDirection: 'row', flexWrap: 'wrap', margin: -half }, style]}
        className={className}
        {...props}
      >
        {items.map((item, index) => (
          <View key={index} style={{ width: `${100 / columns}%`, padding: half }}>
            {item}
          </View>
        ))}
      </View>
    );
  }

  return captioned(
    <View className={cn(slots.group(), className)} style={style} {...props}>
      {items.map((item, index) => (
        <View key={index}>
          {separators && index > 0 ? (
            // Inset from the left so the rule starts under the text rather than
            // under the circle, which is what a grouped list does.
            <View className="ml-14 h-px bg-border" />
          ) : null}
          {item}
        </View>
      ))}
    </View>
  );
}

/* -------------------------------------------------------------------------- *
 * Header
 * -------------------------------------------------------------------------- */

export interface SelectionModeHeaderProps extends ViewProps {
  className?: string;
  /** The word in front of the count. */
  title?: string;
  /** Hide the select-all control, for a list where picking everything is wrong. */
  hideSelectAll?: boolean;
  /** Replaces the whole header's contents, keeping only its layout. */
  children?: ReactNode;
}

/**
 * The bar that says the mode is on: a way out, how many are picked, and all
 * of them at once.
 *
 * Rendered only while the mode is on, and it is the thing that makes the mode
 * legible — a list whose rows have quietly changed what a tap does, with no
 * banner saying so, is a list that loses somebody's work.
 */
function SelectionModeHeader({
  className,
  title = 'Select',
  hideSelectAll = false,
  children,
  ...props
}: SelectionModeHeaderProps) {
  const { active, exit, count, total, allSelected, selectAll, clear, sheet } =
    useSelectionMode();
  const slots = selectionVariants({});

  /*
   * Collapsed rather than unmounted.
   *
   * A fade on a view that has already been taken out of the flow fades nothing
   * — the list under it has jumped up 56 points on the frame the mode ended,
   * and what is left dissolving is a header nobody is looking at any more.
   * Giving up the height *is* the transition, so that is the part that animates.
   */
  return (
    <Collapse
      open={active}
      duration={REVEAL_DURATION}
      className={cn(slots.header(), className)}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
      {...props}
    >
      {children ? (
        textChildren(children)
      ) : (
        <>
          {/*
           * The two ends are the same width, so the title between them is
           * centred on the screen rather than on whatever is left over. A title
           * that shifts sideways as the count goes from 9 to 10 reads as the
           * header being rebuilt.
           */}
          <View className="w-20 items-start">
            {/* A sheet dismisses itself — by its handle, its scrim or the back
                gesture — so a second way out inside it is one too many. */}
            {sheet ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel selection"
                onPress={exit}
                hitSlop={12}
                className={slots.close()}
              >
                <XIcon size={20} />
              </Pressable>
            )}
          </View>

          <Text numberOfLines={1} className={slots.title()}>
            {count > 0 ? `${title} (${count})` : title}
          </Text>

          <View className="w-20 items-end">
            {hideSelectAll || total === 0 ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={allSelected ? 'Clear selection' : 'Select all'}
                accessibilityState={{ checked: allSelected }}
                onPress={allSelected ? clear : selectAll}
                hitSlop={12}
              >
                <Text size="sm" weight="medium" className="text-primary">
                  {allSelected ? 'Clear' : 'All'}
                </Text>
              </Pressable>
            )}
          </View>
        </>
      )}
    </Collapse>
  );
}

/* -------------------------------------------------------------------------- *
 * Bar
 * -------------------------------------------------------------------------- */

export interface SelectionModeBarProps
  extends ViewProps,
    Pick<SelectionVariantProps, 'placement'> {
  className?: string;
  /**
   * Room under the actions, in points — your safe-area inset.
   *
   * A bar against the bottom edge sits over the home indicator on a phone that
   * has one, and an action under a home indicator is an action that takes two
   * tries. `floating` uses it as the gap on all four sides instead.
   */
  inset?: number;
  /**
   * Keep the bar up with nothing picked.
   *
   * Off by default: every action on it needs something to act on, and a row of
   * buttons that all refuse is worse than a row that is not there yet.
   */
  showWhenEmpty?: boolean;
  children: ReactNode;
}

/**
 * The actions, across the bottom of the list.
 *
 * Over the list rather than under it, because the list is as long as it is and
 * a bar in the flow would be somewhere off the end of it. **Pad the bottom of
 * your list so the last row can clear this** — nothing here can work out how
 * tall the list is.
 *
 * Flush to the edge by default. A bar inset from the sides is a card floating
 * over a list, which reads as something that arrived rather than as the mode
 * the screen is in — and it takes width away from the actions, which are the
 * one row of controls on screen that must not be cramped.
 */
function SelectionModeBar({
  className,
  placement,
  inset = 0,
  showWhenEmpty = false,
  children,
  style,
  ...props
}: SelectionModeBarProps) {
  const { active, count, sheet } = useSelectionMode();
  const reducedMotion = useReducedMotion();
  const floating = placement === 'floating';
  const slots = selectionVariants({ placement });

  if (!active || (count === 0 && !showWhenEmpty)) return null;

  /*
   * In a sheet the bar is the sheet's footer: it is already at the bottom of
   * something, already the width of it, and the footer draws the rule above it.
   * Positioning it absolutely there would take it out of the sheet's layout and
   * hang it over the content instead of under it.
   */
  if (sheet) {
    return (
      <View className={cn(slots.bar(), 'border-t-0', className)} {...props}>
        {textChildren(children)}
      </View>
    );
  }

  const edge = floating ? inset || DEFAULT_BAR_OFFSET : 0;

  return (
    <Animated.View
      entering={reducedMotion ? FadeIn : SlideInDown.duration(220)}
      exiting={reducedMotion ? FadeOut : SlideOutDown.duration(180)}
      style={[{ position: 'absolute', left: edge, right: edge, bottom: edge }, style]}
      {...props}
    >
      <View
        // Padding rather than a margin, so the bar's own background runs all
        // the way to the edge and the safe area is filled rather than left as a
        // stripe of whatever is behind it.
        style={floating ? undefined : { paddingBottom: inset }}
        className={cn(slots.bar(), className)}
      >
        {textChildren(children)}
      </View>
    </Animated.View>
  );
}

/* -------------------------------------------------------------------------- *
 * Action
 * -------------------------------------------------------------------------- */

export interface SelectionModeActionProps
  extends Omit<ViewProps, 'children'>,
    Pick<SelectionVariantProps, 'destructive'> {
  className?: string;
  /** The glyph above the label. */
  icon?: ReactNode;
  /**
   * What it does. Handed the selection, so the common case needs no other
   * wiring — and leaving the mode afterwards is up to you, because whether the
   * list still makes sense depends on what you did to it.
   */
  onPress?: (selected: string[]) => void;
  /** Leave selection mode after the action runs. */
  exitOnPress?: boolean;
  disabled?: boolean;
  /** Extra classes for the label. */
  labelClassName?: string;
  children?: ReactNode;
}

/**
 * One action in the bar: a glyph with its name under it.
 *
 * Labelled, always. A row of bare glyphs at the bottom of a screen is a row of
 * guesses, and one of them usually deletes something.
 */
function SelectionModeAction({
  className,
  icon,
  onPress,
  exitOnPress = false,
  disabled = false,
  destructive,
  labelClassName,
  children,
  ...props
}: SelectionModeActionProps) {
  const { selected, exit, count, sheet } = useSelectionMode();
  const destructiveColor = useCSSVariable('--color-destructive');
  // Nothing picked is nothing to act on, so the action is off rather than
  // pressable-and-inert.
  const off = disabled || count === 0;
  // A sheet's footer is one action wide, not four, so it lies down.
  const slots = selectionVariants({ destructive, disabled: off, compact: sheet });

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off }}
      disabled={off}
      onPress={() => {
        onPress?.(selected);
        if (exitOnPress) exit();
      }}
      className={cn(slots.action(), className)}
      {...props}
    >
      <IconColorProvider
        color={destructive && typeof destructiveColor === 'string' ? destructiveColor : undefined}
      >
        {icon}
      </IconColorProvider>
      {textChildren(children, (text) => (
        <Text className={cn(slots.actionLabel(), labelClassName)}>{text}</Text>
      ))}
    </AnimatedPressable>
  );
}

/* -------------------------------------------------------------------------- *
 * Sheet
 * -------------------------------------------------------------------------- */

export interface SelectionModeSheetProps {
  className?: string;
  /** Controlled open state of the sheet. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The word in front of the count. */
  title?: string;
  /** Hide the select-all control. */
  hideSelectAll?: boolean;
  /**
   * How tall the sheet opens.
   *
   * `full` by default. `auto` sizes the sheet to its rows, up to the height
   * of the screen, and suits a short list.
   *
   * Full rather than half because a picker spends a header and a footer before
   * it draws a single row. At half a screen that leaves four or five rows for
   * the thing the sheet was opened to do, and the reader scrolls a list that
   * would have fitted. Pass `half` for a sheet of two or three choices.
   */
  size?: 'auto' | 'half' | 'full';
  /**
   * The things to pick between, and optionally a `SelectionMode.Bar` of
   * actions. The bar is lifted into the sheet's footer wherever it is written.
   */
  children: ReactNode;
}

/**
 * The whole selection, presented in a bottom sheet.
 *
 * A picker rather than a mode. The list on a screen has to be *turned into* one
 * you can pick from — hence the long press, the cancel and the count — but a
 * sheet was opened in order to pick something, so it is picking from the moment
 * it appears and there is nothing to enter or leave.
 *
 * What goes in it is anything: a column of friends, a grid of colours, a run of
 * slides. `SelectionMode.Item` wraps whatever you give it, so the sheet does
 * not need to know what it is holding.
 *
 * ```tsx
 * <SelectionMode values={ids} selected={selected} onSelectedChange={setSelected}>
 *   <SelectionMode.Sheet open={open} onOpenChange={setOpen} title="Share with">
 *     {people.map((person) => (
 *       <SelectionMode.Item key={person.id} value={person.id}>
 *         <Item>…</Item>
 *       </SelectionMode.Item>
 *     ))}
 *     <SelectionMode.Bar>
 *       <SelectionMode.Action icon={<SendIcon size={20} />} onPress={share}>Send</SelectionMode.Action>
 *     </SelectionMode.Bar>
 *   </SelectionMode.Sheet>
 * </SelectionMode>
 * ```
 */
function SelectionModeSheet({
  className,
  open,
  defaultOpen,
  onOpenChange,
  title = 'Select',
  hideSelectAll = false,
  size = 'full',
  children,
}: SelectionModeSheetProps) {
  const parent = useSelectionMode();

  /*
   * The bar is pulled out of the children and put in the sheet's footer,
   * wherever it was written. A footer is a place in the sheet's layout rather
   * than a thing you can position into from the middle of the body — and
   * writing the bar last, after the items, is how it reads.
   */
  const { bar, rest } = useMemo(() => {
    const others: ReactNode[] = [];
    let found: ReactNode = null;
    Children.forEach(children, (child) => {
      if (isValidElement(child) && child.type === SelectionModeBar) found = child;
      else others.push(child);
    });
    return { bar: found, rest: others };
  }, [children]);

  // Picking from the moment it opens: a sheet is not a mode to be entered.
  const context = useMemo<SelectionModeContextValue>(
    () => ({ ...parent, active: true, sheet: true }),
    [parent]
  );

  return (
    <BottomSheet open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {/*
       * No close button. The sheet's own sits in the top trailing corner, which
       * is where the header puts "All" — two targets a few points apart, one of
       * which throws the selection away. The sheet is still dismissed by its
       * handle, by the scrim and by the back gesture, which is the same reason
       * the header does not draw an X of its own in here.
       */}
      <BottomSheet.Content size={size} showClose={false} className={className}>
        {/*
         * The provider goes *inside* the sheet's content, not around the sheet.
         *
         * A sheet renders its content through a portal, which mounts it at the
         * app root — nowhere below this component. A provider wrapped around
         * the outside is therefore not an ancestor of anything in the sheet,
         * and every part inside it throws for want of a context that is on
         * screen but in the wrong branch of the tree.
         */}
        <SelectionModeContext.Provider value={context}>
          {/*
           * `pe-0` gives the trailing edge back. `BottomSheet.Header` reserves
           * room there for the close button, and this sheet draws none — left
           * alone, the reserved 48 points push the centred title off the middle
           * of the sheet and hold "All" that far in from the corner.
           */}
          <BottomSheet.Header className="pe-0">
            {/* The sheet already draws the rule and the padding. */}
            <SelectionModeHeader
              title={title}
              hideSelectAll={hideSelectAll}
              className="h-auto border-b-0 px-0"
            />
          </BottomSheet.Header>
          <BottomSheet.Body contentContainerStyle={{ gap: 16, paddingBottom: 8 }}>
            {textChildren(rest)}
          </BottomSheet.Body>
          {bar ? <BottomSheet.Footer>{bar}</BottomSheet.Footer> : null}
        </SelectionModeContext.Provider>
      </BottomSheet.Content>
    </BottomSheet>
  );
}

SelectionModeRoot.displayName = 'SelectionMode';
SelectionModeSheet.displayName = 'SelectionMode.Sheet';
SelectionModeItem.displayName = 'SelectionMode.Item';
SelectionModeGroup.displayName = 'SelectionMode.Group';
SelectionModeIndicator.displayName = 'SelectionMode.Indicator';
SelectionModeHeader.displayName = 'SelectionMode.Header';
SelectionModeBar.displayName = 'SelectionMode.Bar';
SelectionModeAction.displayName = 'SelectionMode.Action';

export const SelectionMode = Object.assign(SelectionModeRoot, {
  Sheet: SelectionModeSheet,
  Group: SelectionModeGroup,
  Item: SelectionModeItem,
  Indicator: SelectionModeIndicator,
  Header: SelectionModeHeader,
  Bar: SelectionModeBar,
  Action: SelectionModeAction,
});
