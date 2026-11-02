/**
 * Swipe — a row that slides aside to reveal the things you can do to it.
 *
 * It is the one list interaction a phone has that a page does not: the actions
 * are not on screen taking up room, they are behind the row, and the gesture
 * that reveals them is the same one everywhere else in the OS. An inbox, a
 * task list, a settings screen — all of them want it, and all of them
 * otherwise end up with a trailing button too small to hit.
 *
 * ```tsx
 * <Swipe>
 *   <Swipe.End>
 *     <Swipe.Action icon={<TrashIcon />} label="Delete" color="destructive" onPress={remove} />
 *   </Swipe.End>
 *   <Item variant="outline">
 *     <Item.Content><Item.Title>Invoice.pdf</Item.Title></Item.Content>
 *   </Item>
 * </Swipe>
 * ```
 *
 * The sides are `start` and `end` rather than left and right, because the
 * gesture mirrors with the reading direction: in a right-to-left app the row
 * that opened toward the right has to open toward the left, and a caller
 * should not have to write that twice. Yoga mirrors where the panels sit; the
 * drag is measured in raw pixels and cannot be mirrored for us, so it reads
 * the direction and turns itself around.
 *
 * Everything that moves runs on the UI thread. A row being dragged does not
 * re-render — the only React work in a swipe is the callback at the end of it.
 *
 * Rows in a `Swipe.Group` close each other, so only one of them is ever open.
 * That is the behaviour of every list on the phone that has this gesture, and
 * a row cannot arrange it alone: it knows when it opens and has no way to hear
 * that a sibling did.
 */
import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { View, type LayoutChangeEvent, type ViewProps } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';
import { tv, type VariantProps } from 'tailwind-variants';
import { useDirectionSign } from '../../hooks/use-direction';
import { IconColorProvider } from '../../icons';
import { AnimatedPressable } from '../../primitives/animated-pressable';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { selectionTick } from '../../utils/haptics';
import type { ViewRef } from '../../primitives/refs';

const SPRING = { damping: 22, stiffness: 220, mass: 0.7 } as const;

/**
 * Past its own width a panel has nothing left to reveal, so the row is let go
 * of gradually rather than stopped dead. 8 is where the rubber band reads as
 * resistance rather than as something broken.
 */
const OVERSHOOT_FRICTION = 8;

/** How far past the panel a drag has to reach before a release fires an action. */
const FULL_SWIPE_RATIO = 1.6;

/** Fraction of the panel a release has to clear for the row to stay open. */
const OPEN_RATIO = 0.5;

/** How much of a fling to count as distance already travelled, in seconds. */
const VELOCITY_LOOKAHEAD = 0.12;

type SwipeSide = 'start' | 'end';

/** The side a row is open on, or `null` while it is closed. */
export type SwipeOpenSide = SwipeSide | null;

export interface SwipeHandle {
  /** Slide the row aside to reveal one side's actions. */
  open: (side: SwipeSide) => void;
  /** Put the row back. */
  close: () => void;
}

interface SwipeContextValue {
  close: () => void;
}

const SwipeContext = createContext<SwipeContextValue | null>(null);

/* -------------------------------------------------------------------------- */
/* Group                                                                      */
/* -------------------------------------------------------------------------- */

interface SwipeGroupContextValue {
  /** Take a slot in the group. Returns the function that gives it back. */
  join: (row: SwipeGroupMember) => () => void;
  /** Say that this row has opened, so every other one can put itself away. */
  opened: (row: SwipeGroupMember) => void;
  /** Shut every row in the group. */
  closeAll: () => void;
}

interface SwipeGroupMember {
  close: () => void;
}

const SwipeGroupContext = createContext<SwipeGroupContextValue | null>(null);

export interface SwipeGroupProps extends ViewProps {
  className?: string;
  children?: ReactNode;
  /**
   * Close the other rows when one opens. On by default — that is the whole
   * reason to reach for a group. Turning it off keeps the container and the
   * `useSwipeGroup` handle while letting several rows stand open at once.
   */
  exclusive?: boolean;
}

/**
 * Several rows that agree only one of them is open at a time.
 *
 * Every list of swipeable rows wants this, and every list has to be told: a
 * row knows when it opens but has no way to learn that a sibling did, so
 * without something above them a list ends up with three rows standing open
 * and a screen that reads as broken. The mail, message and reminder lists on
 * a phone all behave this way, and a list that does not is the odd one out.
 *
 * ```tsx
 * <Swipe.Group>
 *   {rows.map((row) => (
 *     <Swipe key={row.id}>
 *       <Swipe.End>
 *         <Swipe.Action label="Delete" color="destructive" onPress={…} />
 *       </Swipe.End>
 *       <Item>…</Item>
 *     </Swipe>
 *   ))}
 * </Swipe.Group>
 * ```
 *
 * The rows register themselves rather than being found by inspecting children,
 * so a row nested inside anything at all still belongs — wrapped in an
 * `Item.Group`, produced by a `map`, rendered by a component of your own. The
 * alternative, walking the tree for `Swipe` elements, only ever works for the
 * one arrangement it was written against.
 *
 * Nothing here re-renders. The registry is a ref and closing a sibling writes
 * to that row's shared value, so opening a row costs the springs it starts and
 * no React work at all.
 */
const SwipeGroup = forwardRef<ViewRef, SwipeGroupProps>(
  ({ className, children, exclusive = true, ...props }, ref) => {
    /*
     * A ref rather than state: membership changes as rows mount and unmount,
     * and rendering the whole list again because one row arrived would undo
     * the point of a component that never re-renders while it is dragged.
     */
    const members = useRef(new Set<SwipeGroupMember>());

    const context = useMemo<SwipeGroupContextValue>(
      () => ({
        join: (row) => {
          members.current.add(row);
          return () => {
            members.current.delete(row);
          };
        },
        opened: (row) => {
          if (!exclusive) return;
          for (const other of members.current) {
            if (other !== row) other.close();
          }
        },
        closeAll: () => {
          for (const row of members.current) row.close();
        },
      }),
      [exclusive]
    );

    return (
      <SwipeGroupContext.Provider value={context}>
        <View ref={ref} className={className} {...props}>
          {children}
        </View>
      </SwipeGroupContext.Provider>
    );
  }
);
SwipeGroup.displayName = 'Swipe.Group';

/**
 * Shut every row in the enclosing `Swipe.Group`.
 *
 * The one thing a group knows that a single row cannot: a list that scrolls,
 * navigates away, or has just deleted the row that was open wants all of them
 * put back, and holding a ref to each row to do it by hand is bookkeeping the
 * group is already doing.
 *
 * ```tsx
 * const { closeAll } = useSwipeGroup();
 * <ScrollView onScrollBeginDrag={closeAll}>…</ScrollView>
 * ```
 *
 * Outside a group it is inert rather than an error, so a row that is sometimes
 * grouped and sometimes not does not need two versions of its parent.
 */
export function useSwipeGroup(): { closeAll: () => void } {
  const group = useContext(SwipeGroupContext);
  const closeAll = useCallback(() => group?.closeAll(), [group]);
  return { closeAll };
}

/* -------------------------------------------------------------------------- */
/* Action                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A tile is a filled block of colour with its content laid over it, which
 * settles both halves of how it is coloured:
 *
 * - The fill is the status colour at full strength, never a tint of it. A tile
 *   only exists while the row is out of the way, so it has to be legible in the
 *   moment it appears; a 6%-alpha wash of the row's own background is not a
 *   tile at all, it is a hole with a glyph floating in it.
 * - The content is white, because the status colours are chosen to be carried
 *   at full strength with white over them. The `-foreground` token of a status
 *   is the *darker text* form of that hue, meant for a neutral surface — laid
 *   over the fill it is the same hue twice and the label all but disappears.
 *
 * `default` and `primary` are the two that cannot take white. `primary`
 * inverts with the theme and owns a true on-primary token, so it uses it;
 * `default` is a mid grey in every theme, and takes the background colour,
 * which is the neutral furthest from it in whichever direction the theme runs.
 */
const actionVariants = tv({
  slots: {
    root: 'h-full min-w-[80px] items-center justify-center gap-1.5 px-4',
    label: 'text-center text-xs font-semibold',
  },
  variants: {
    color: {
      default: { root: 'bg-muted-foreground', label: 'text-background' },
      primary: { root: 'bg-primary', label: 'text-primary-foreground' },
      success: { root: 'bg-success', label: 'text-success-solid-foreground' },
      warning: { root: 'bg-warning', label: 'text-warning-solid-foreground' },
      info: { root: 'bg-info', label: 'text-info-solid-foreground' },
      destructive: {
        root: 'bg-destructive',
        label: 'text-destructive-solid-foreground',
      },
    },
  },
  defaultVariants: {
    color: 'default',
  },
});

export type SwipeActionColor =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'info'
  | 'destructive';

/**
 * The fill a panel takes behind its tiles, so that dragging past the tiles
 * extends the outermost action's colour instead of opening a hole.
 */
const PANEL_FILL: Record<SwipeActionColor, string> = {
  default: 'bg-muted-foreground',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-info',
  destructive: 'bg-destructive',
};

export interface SwipeActionProps
  extends Omit<ViewProps, 'children'>,
    VariantProps<typeof actionVariants> {
  className?: string;
  /** What the action does. Also what a screen reader is offered. */
  label: string;
  /**
   * Drawn above the label and tinted to match it. Pass the glyph, not a colour
   * and not a size — a tile sizes it to read at a glance, since it is the part
   * of an action the eye reaches before the word underneath it.
   */
  icon?: ReactNode;
  /** Run when the tile is tapped, or when a full swipe reaches it. */
  onPress?: () => void;
  /**
   * Leave the row open after the action runs. Off by default: an action that
   * has already happened has nothing left to offer, and a row left standing
   * open is the most common way a swipe list ends up feeling stuck.
   */
  keepOpen?: boolean;
  /** Extra classes for the label. */
  labelClassName?: string;
}

/**
 * One tile behind the row. Sized by its own content down to a minimum wide
 * enough to hit, so a one-word action and a two-word one still line up.
 */
const SwipeAction = forwardRef<ViewRef, SwipeActionProps>(
  (
    {
      className,
      labelClassName,
      color = 'default',
      label,
      icon,
      onPress,
      keepOpen = false,
      ...props
    },
    ref
  ) => {
    const context = useContext(SwipeContext);
    const slots = actionVariants({ color });
    const tint = useActionTint(color);

    return (
      <AnimatedPressable
        ref={ref}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => {
          if (!keepOpen) context?.close();
          onPress?.();
        }}
        className={slots.root({ className })}
        {...props}
      >
        {icon ? (
          <IconColorProvider color={tint}>{sizeIcon(icon)}</IconColorProvider>
        ) : null}
        <Text className={slots.label({ className: labelClassName })} numberOfLines={1}>
          {label}
        </Text>
      </AnimatedPressable>
    );
  }
);
SwipeAction.displayName = 'Swipe.Action';

/**
 * How big a glyph is drawn on a tile. The icons default to the 16 that suits
 * them inline in a row of text, which is too small here: a tile is 80 wide and
 * mostly empty, and the icon is the part of it read first — at 16 it looks
 * like a mistake rather than a target.
 */
const ICON_SIZE = 22;

/**
 * The icon at tile size, unless the caller asked for one. Sizing it here rather
 * than asking every call site to is what keeps two tiles beside each other
 * matching, which is the whole reason a panel of them reads as a set.
 */
function sizeIcon(icon: ReactNode): ReactNode {
  if (!isValidElement<{ size?: number }>(icon)) return icon;
  if (icon.props.size !== undefined) return icon;
  return cloneElement(icon, { size: ICON_SIZE });
}

/**
 * The colour a tile's glyph is drawn in — the same colour as its label, so the
 * two read as one thing. Resolved from the theme rather than written down as a
 * hex wherever the theme has an answer, since a hex stops being right the
 * moment the theme inverts; white is the exception, because a status fill is
 * the same saturated colour in every theme and white is what it carries.
 *
 * Both tokens are resolved on every render because a hook cannot be called for
 * one branch only. They are variable lookups, not work.
 */
function useActionTint(color: SwipeActionColor): string | undefined {
  const background = useCSSVariable('--color-background');
  const primary = useCSSVariable('--color-primary-foreground');

  if (color === 'default') return typeof background === 'string' ? background : undefined;
  if (color === 'primary') return typeof primary === 'string' ? primary : undefined;
  return '#ffffff';
}

/* -------------------------------------------------------------------------- */
/* Panels                                                                     */
/* -------------------------------------------------------------------------- */

export interface SwipePanelProps extends Omit<ViewProps, 'children'> {
  className?: string;
  children?: ReactNode;
}

/**
 * The panels are markers rather than renderers: the root lifts their children
 * out and lays them out itself, because it is the root that knows how wide the
 * gap behind the row currently is. Declaring them as elements is still how a
 * caller says which side an action belongs to, and it keeps both sides
 * readable in source rather than hidden inside two render props.
 */
const SwipeStart = forwardRef<ViewRef, SwipePanelProps>(() => null);
SwipeStart.displayName = 'Swipe.Start';

const SwipeEnd = forwardRef<ViewRef, SwipePanelProps>(() => null);
SwipeEnd.displayName = 'Swipe.End';

/* -------------------------------------------------------------------------- */
/* Reading the declared actions                                               */
/* -------------------------------------------------------------------------- */

interface DeclaredAction {
  label: string;
  color: SwipeActionColor;
  onPress?: () => void;
}

/**
 * The actions a panel declared, in source order. Only direct `Swipe.Action`
 * children count — anything else in a panel is decoration, and calling a
 * stranger's `onPress` because it happened to have one would be worse than
 * ignoring it.
 */
function collectActions(node: ReactNode): DeclaredAction[] {
  const found: DeclaredAction[] = [];

  for (const child of Children.toArray(node)) {
    if (!isValidElement(child) || child.type !== SwipeAction) continue;
    const { label, color, onPress } = (child as ReactElement<SwipeActionProps>).props;
    found.push({ label, color: (color as SwipeActionColor) ?? 'default', onPress });
  }

  return found;
}

/* -------------------------------------------------------------------------- */
/* Root                                                                       */
/* -------------------------------------------------------------------------- */

export interface SwipeProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /**
   * The row itself, plus a `Swipe.Start` and/or `Swipe.End` holding its
   * actions. Order does not matter — the panels are recognised by type.
   */
  children?: ReactNode;
  /**
   * Let a drag carried well past the panel fire its outermost action on
   * release, without the tile ever being tapped. On by default, and the reason
   * the far end of a panel is the destructive slot by convention.
   */
  fullSwipe?: boolean;
  /** Turn the gesture off and leave the row static. The tiles stay tappable. */
  disabled?: boolean;
  /** Tick when a drag crosses the point at which letting go fires an action. */
  haptics?: boolean;
  /** Told which side opened, or `null` when the row closed. */
  onOpenChange?: (side: SwipeOpenSide) => void;
  /** Extra classes for the moving row. */
  contentClassName?: string;
}

/**
 * A row that opens sideways.
 *
 * The panels sit behind the row rather than beside it, so nothing about the
 * layout changes when one opens: the row is the only thing that moves, and it
 * moves as a transform. Each panel stretches to exactly the gap the row has
 * left behind, which is what keeps an overshoot showing the outermost action's
 * colour rather than a hole through to the screen underneath.
 */
const SwipeRoot = forwardRef<SwipeHandle, SwipeProps>(
  (
    {
      className,
      contentClassName,
      children,
      fullSwipe = true,
      disabled = false,
      haptics = false,
      onOpenChange,
      ...props
    },
    ref
  ) => {
    const sign = useDirectionSign();

    /** Logical offset of the row in points; positive reveals the start side. */
    const offset = useSharedValue(0);
    /**
     * Where the offset stood when this drag began. A pan reports translation
     * from the touch down, so without it a row that is already open snaps shut
     * the instant a second drag starts.
     */
    const origin = useSharedValue(0);
    /** Natural width of each panel's tiles, measured once and then only read. */
    const startWidth = useSharedValue(0);
    const endWidth = useSharedValue(0);
    /** Whether a full swipe is currently armed, so the tick fires just once. */
    const armed = useSharedValue(false);

    const { startNode, endNode, row } = useMemo(() => {
      let start: ReactNode = null;
      let end: ReactNode = null;
      const rest: ReactNode[] = [];

      for (const child of Children.toArray(children)) {
        if (isValidElement(child) && child.type === SwipeStart) {
          start = (child as ReactElement<SwipePanelProps>).props.children;
        } else if (isValidElement(child) && child.type === SwipeEnd) {
          end = (child as ReactElement<SwipePanelProps>).props.children;
        } else {
          rest.push(child);
        }
      }

      return { startNode: start, endNode: end, row: rest };
    }, [children]);

    const startActions = useMemo(() => collectActions(startNode), [startNode]);
    const endActions = useMemo(() => collectActions(endNode), [endNode]);

    const hasStart = startNode != null;
    const hasEnd = endNode != null;

    /**
     * The side the row is open on, held in a ref rather than in state: nothing
     * here renders from it, and a row that re-rendered every time a drag
     * settled would be paying for the one thing this component exists to
     * avoid.
     */
    const openSide = useRef<SwipeOpenSide>(null);

    /**
     * Only a genuine change is reported. The gesture cannot know whether the
     * row was already closed when it settles it closed, so the comparison has
     * to happen here rather than at each call site.
     *
     * The comparison and the callback both have to sit outside React's state,
     * because `onOpenChange` is the caller's and will usually set state of its
     * own. Run from inside a state updater — which React is free to call while
     * rendering — that lands as a set during another component's render, and
     * React says so.
     */
    const reportOpen = useCallback(
      (side: SwipeOpenSide) => {
        if (openSide.current === side) return;
        openSide.current = side;
        onOpenChange?.(side);
      },
      [onOpenChange]
    );

    const close = useCallback(() => {
      offset.value = withSpring(0, SPRING);
      reportOpen(null);
    }, [offset, reportOpen]);

    /*
     * Membership in a `Swipe.Group`, if there is one above this row.
     *
     * The registered member is a stable object rather than the `close`
     * function itself, because `close` changes identity whenever
     * `onOpenChange` does and the group would then be holding a stale entry
     * alongside a live one. The object never changes; what it closes is read
     * off a ref at the moment it is asked.
     */
    const group = useContext(SwipeGroupContext);
    const closeRef = useRef(close);
    closeRef.current = close;
    const member = useRef<SwipeGroupMember>({ close: () => closeRef.current() }).current;

    useEffect(() => group?.join(member), [group, member]);

    /**
     * Told when this row settles open, so the group can put its siblings away.
     * A row closing says nothing — the others are already closed, and telling
     * them so would be a round of work per settle for no change.
     */
    const announce = useCallback(
      (side: SwipeOpenSide) => {
        reportOpen(side);
        if (side !== null) group?.opened(member);
      },
      [reportOpen, group, member]
    );

    useImperativeHandle(
      ref,
      () => ({
        open: (side) => {
          const width = side === 'start' ? startWidth.value : endWidth.value;
          if (width === 0) return;
          offset.value = withSpring(side === 'start' ? width : -width, SPRING);
          announce(side);
        },
        close,
      }),
      [offset, startWidth, endWidth, announce, close]
    );

    /**
     * The action a full swipe fires: the one furthest from the row, since that
     * is the one the gesture travelled all the way to. The panels pack their
     * tiles against the row, so on the start side that is the first declared
     * and on the end side the last.
     */
    const fire = useCallback(
      (side: SwipeSide) => {
        const action =
          side === 'start' ? startActions[0] : endActions[endActions.length - 1];
        action?.onPress?.();
      },
      [startActions, endActions]
    );

    const tick = useCallback(() => selectionTick(), []);

    /**
     * The drag has to lose to a scroll, or a list of swipeable rows could not
     * be scrolled without rows twitching open under the finger.
     * `activeOffsetX` makes it wait for clearly horizontal intent, and
     * `failOffsetY` hands the touch to the scroller outright the moment the
     * finger commits vertically.
     */
    const pan = useMemo(
      () =>
        Gesture.Pan()
          .enabled(!disabled && (hasStart || hasEnd))
          .activeOffsetX([-12, 12])
          .failOffsetY([-14, 14])
          .onBegin(() => {
            origin.value = offset.value;
            armed.value = false;
          })
          .onUpdate((event) => {
            // The gesture is raw pixels and the offset is logical, so a
            // right-to-left subtree runs all of this backwards.
            const next = origin.value + event.translationX * sign;
            const limit = next > 0 ? startWidth.value : endWidth.value;

            if (limit === 0) {
              // Nothing to reveal on this side: hold the row at rest rather
              // than letting it drift open over an empty panel.
              offset.value = 0;
              return;
            }

            const beyond = Math.abs(next) - limit;
            offset.value =
              beyond > 0
                ? Math.sign(next) * (limit + beyond / OVERSHOOT_FRICTION)
                : next;

            if (!fullSwipe) return;
            const reached = Math.abs(offset.value) > limit * FULL_SWIPE_RATIO;
            if (reached !== armed.value) {
              armed.value = reached;
              if (reached && haptics) runOnJS(tick)();
            }
          })
          .onEnd((event) => {
            const current = offset.value;
            const toStart = current > 0;
            const side: SwipeSide = toStart ? 'start' : 'end';
            const limit = toStart ? startWidth.value : endWidth.value;

            if (limit === 0) {
              offset.value = withSpring(0, SPRING);
              return;
            }

            if (fullSwipe && armed.value) {
              armed.value = false;
              offset.value = withSpring(0, SPRING);
              runOnJS(fire)(side);
              runOnJS(reportOpen)(null);
              return;
            }

            // Part of the fling counts as distance already covered, so a short
            // flick opens the row where a slow drag to the same point does not.
            const projected = Math.abs(
              current + event.velocityX * sign * VELOCITY_LOOKAHEAD
            );

            if (projected > limit * OPEN_RATIO) {
              offset.value = withSpring(toStart ? limit : -limit, SPRING);
              runOnJS(announce)(side);
            } else {
              offset.value = withSpring(0, SPRING);
              runOnJS(reportOpen)(null);
            }
          }),
      [
        disabled,
        hasStart,
        hasEnd,
        sign,
        fullSwipe,
        haptics,
        offset,
        origin,
        armed,
        startWidth,
        endWidth,
        fire,
        tick,
        reportOpen,
        announce,
      ]
    );

    const contentStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: offset.value * sign }],
    }));

    /**
     * A panel is exactly the gap the row has left behind — no wider, so it can
     * never paint over the row, and no narrower, so an overshoot extends the
     * outermost action's colour instead of opening a hole onto the screen
     * underneath. At rest both are zero wide and neither is on screen at all.
     */
    const startStyle = useAnimatedStyle(() => ({
      width: Math.max(offset.value, 0),
    }));

    const endStyle = useAnimatedStyle(() => ({
      width: Math.max(-offset.value, 0),
    }));

    /**
     * Measured from the tiles rather than from the panel around them. The panel
     * is as wide as the gesture has made it, which is the number being derived
     * here — reading it back off the panel would only ever report the animation
     * to itself, and the width would stay at the zero it starts from.
     */
    const measure = (target: SharedValue<number>) => (event: LayoutChangeEvent) => {
      target.value = event.nativeEvent.layout.width;
    };

    /**
     * A swipe is invisible to a screen reader, so every action is offered as an
     * accessibility action on the row as well. That is the whole of the
     * alternative path: there is no other way to reach a tile that stays off
     * screen until a gesture nobody announced has been performed.
     */
    const allActions = useMemo(
      () => [...startActions, ...endActions],
      [startActions, endActions]
    );

    const a11yActions = useMemo(
      () => allActions.map(({ label }) => ({ name: label, label })),
      [allActions]
    );

    const context = useMemo(() => ({ close }), [close]);

    return (
      <SwipeContext.Provider value={context}>
        <View
          accessibilityActions={a11yActions.length > 0 ? a11yActions : undefined}
          onAccessibilityAction={(event) => {
            allActions
              .find(({ label }) => label === event.nativeEvent.actionName)
              ?.onPress?.();
          }}
          className={cn('relative w-full overflow-hidden', className)}
          {...props}
        >
          {hasStart ? (
            // Yoga puts the panel on the edge text begins at and mirrors it for
            // us; only the transform above had to be turned around.
            <Animated.View
              className={cn(
                'absolute bottom-0 start-0 top-0 overflow-hidden',
                PANEL_FILL[startActions[0]?.color ?? 'default']
              )}
              style={startStyle}
            >
              {/*
               * The tiles are absolute so they size to themselves rather than
               * to the panel clipping them, and pinned to the edge nearest the
               * row so they emerge from under it as it moves — rather than
               * sitting at the far edge with a growing gap in front of them.
               */}
              <View
                className="absolute bottom-0 end-0 top-0 flex-row items-stretch"
                onLayout={measure(startWidth)}
              >
                {startNode}
              </View>
            </Animated.View>
          ) : null}

          {hasEnd ? (
            <Animated.View
              className={cn(
                'absolute bottom-0 end-0 top-0 overflow-hidden',
                PANEL_FILL[endActions[endActions.length - 1]?.color ?? 'default']
              )}
              style={endStyle}
            >
              <View
                className="absolute bottom-0 start-0 top-0 flex-row items-stretch"
                onLayout={measure(endWidth)}
              >
                {endNode}
              </View>
            </Animated.View>
          ) : null}

          <GestureDetector gesture={pan}>
            <Animated.View
              style={contentStyle}
              className={cn('w-full', contentClassName)}
            >
              {row}
            </Animated.View>
          </GestureDetector>
        </View>
      </SwipeContext.Provider>
    );
  }
);
SwipeRoot.displayName = 'Swipe';

export const Swipe = Object.assign(SwipeRoot, {
  Group: SwipeGroup,
  Start: SwipeStart,
  End: SwipeEnd,
  Action: SwipeAction,
});
