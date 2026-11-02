/**
 * ContextMenu — the actions that belong to a piece of content, opened on it.
 *
 * A `Menu` hangs off a control that exists to be pressed: a ⋯ button, a toolbar
 * item, something whose whole job is to open the menu. A context menu has no
 * such control. The target is the content itself — a message, a note, a photo,
 * a row — and the actions are reached by holding it, by a named accessibility
 * action, or from the keyboard.
 *
 * ```tsx
 * <ContextMenu>
 *   <ContextMenu.Trigger>
 *     <Message>Would you like an interactive todo list?</Message>
 *   </ContextMenu.Trigger>
 *   <ContextMenu.Content>
 *     <ContextMenu.Item icon={<Share2 size={16} />}>Share</ContextMenu.Item>
 *     <ContextMenu.Item icon={<Copy size={16} />}>Copy</ContextMenu.Item>
 *     <ContextMenu.Separator />
 *     <ContextMenu.Item variant="destructive" icon={<Flag size={16} />}>
 *       Report
 *     </ContextMenu.Item>
 *   </ContextMenu.Content>
 * </ContextMenu>
 * ```
 *
 * ## It is a Menu, and deliberately so
 *
 * The rows here *are* `Menu`'s rows — the same components, not a second set
 * styled to match. `ContextMenu.Item` and `Menu.Item` are one implementation,
 * so the destructive colour, the press-in scale, the indicator column and the
 * dismiss-on-select rule cannot drift apart between the two ways of reaching
 * them. The panel is `Menu`'s panel, which is `Popover`'s, so `presentation`,
 * submenus and edge-flipping all arrive already working.
 *
 * What this component owns is what a menu opened on content needs and a menu
 * opened from a button does not: alternate invocation paths, and where the
 * panel goes.
 *
 * ## Anchored to the finger, not to the target
 *
 * A toolbar menu is placed against its trigger, because the trigger is small
 * and its position is the only sensible answer. A context menu's target is
 * often most of the screen — a whole message, a whole card — and the middle of
 * it is not where the finger was. So the anchor is the press point by default,
 * and the panel unfolds from it the way a popover unfolds from a button.
 *
 * `anchor="target"` places it against the target's bounds instead, which is the
 * better answer for something small and list-shaped, where the panel lining up
 * with the row reads as belonging to it.
 *
 * ## Why the gesture is not a Pressable
 *
 * The target usually has a press of its own — open the thread, play the video,
 * follow the link — and the two must not both fire. React Native's `Pressable`
 * decides between them after the fact, and the tap can still get through on the
 * way to a long press; the recogniser here is asked for the arbitration up
 * front instead, so a hold that opens the menu never also counts as a press.
 *
 * It is also what lets the target be anything at all. A cloned `onLongPress`
 * needs a child that takes one, which rules out exactly the plain views —
 * bubbles, cards, images — that content-native actions are usually attached to.
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
  View,
  type AccessibilityActionInfo,
  type ViewProps,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';
import { Portal } from '../../primitives/portal';
import {
  Menu,
  type MenuCheckboxItemProps,
  type MenuContentProps,
  type MenuItemProps,
  type MenuProps,
} from '../menu';
import { usePopoverAnchor } from '../popover';
import { cn } from '../../utils/cn';
import { selectionTick } from '../../utils/haptics';
import {
  contextMenuAccessibilityInvocation,
  contextMenuKeyInvocation,
  type ContextMenuInvocation,
  type ContextMenuKeyDownEvent,
} from './context-menu-invocation';
import type { ViewRef } from '../../primitives/refs';

/**
 * How long the target is held before the menu opens.
 *
 * Long enough not to fire while a finger is on its way to a scroll, short
 * enough that nobody wonders whether the hold is working. The platforms sit
 * either side of this; it is the value the rest of this library holds at.
 */
const DEFAULT_DELAY = 350;

/**
 * How far the finger may travel during the hold before it stops counting.
 *
 * Generous rather than tight, and the reason is what the target usually sits
 * in: a scroller. A threshold small enough to feel precise cancels the menu for
 * anyone whose thumb drifts while holding still, and the gesture it is being
 * told apart from — a scroll — has moved a great deal further than this by the
 * time it matters.
 */
const DEFAULT_SLOP = 12;

/**
 * Extra height on every row.
 *
 * A context menu is opened by a hold and read with the hand still over it, at
 * whatever angle the phone happened to be held at. A menu dropped from a button
 * is aimed at deliberately; this one is landed on. The rows are taller than
 * `Menu`'s for that reason alone, and it is the only measurement that differs.
 */
const ROW_CLASS = 'py-4 ps-4 pe-3.5';

/**
 * Floor for the panel's width.
 *
 * A context menu has no trigger to take a width from, and a column of one-word
 * verbs left to size itself lands somewhere around a thumb's width — too narrow
 * to aim at, and too narrow to read as a panel belonging to the whole piece of
 * content it was opened on.
 */
const DEFAULT_MIN_WIDTH = 280;

/**
 * The colour an icon falls back to before the stylesheet has been read.
 *
 * A general-purpose icon set defaults an unset colour to `currentColor`, which
 * React Native cannot resolve and refuses to paint. A neutral mid grey is
 * legible on either a light or a dark panel for the frame or two it lasts.
 */
const ICON_FALLBACK = '#737373';

function useTint(variable: string, fallback: string): string {
  const raw = useCSSVariable(variable);
  return typeof raw === 'string' ? raw : fallback;
}

/**
 * Paints a row's glyph to match its label, without the caller saying so twice.
 *
 * The icons on these rows come from whatever set the app already uses, and a
 * general-purpose one has no idea what an overlay's foreground is — left alone
 * it paints `currentColor`, which React Native will not draw at all. Setting it
 * here means a destructive row's icon turns red along with its label, which is
 * the one place the two disagreeing would matter.
 *
 * An explicit colour on the element still wins: a brand mark that carries its
 * own colours is not something to overrule.
 */
function useGlyph(variant: 'default' | 'destructive' | undefined) {
  const foreground = useTint('--color-overlay-foreground', ICON_FALLBACK);
  const destructive = useTint('--color-destructive', ICON_FALLBACK);
  const tint = variant === 'destructive' ? destructive : foreground;

  return useCallback(
    (icon: ReactNode): ReactNode => {
      if (!isValidElement(icon)) return icon;
      const element = icon as ReactElement<{ color?: string }>;
      if (element.props.color !== undefined) return element;
      return cloneElement(element, { color: tint });
    },
    [tint]
  );
}

/** The target's frame in window coordinates, taken as the menu opens. */
interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ContextMenuContextValue {
  /** Where the target was when it was held, or `null` before anything has. */
  target: TargetRect | null;
  setTarget: (rect: TargetRect | null) => void;
  /** The trigger's children, so the preview can draw the same thing again. */
  content: ReactNode;
  setContent: (node: ReactNode) => void;
  /** Whether a `ContextMenu.Preview` was declared inside the panel. */
  hasPreview: boolean;
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);

function useContextMenu(part: string): ContextMenuContextValue {
  const context = useContext(ContextMenuContext);
  if (!context) throw new Error(`${part} must be used inside <ContextMenu>.`);
  return context;
}

/**
 * Whether a `ContextMenu.Preview` appears anywhere in the declared tree.
 *
 * Sniffed from the elements rather than reported by the preview when it mounts,
 * because the answer is needed *before* it does: the trigger has to know at the
 * moment of the hold whether the panel will be sharing the screen with a lifted
 * copy of the target, and by the time a child of the panel exists the anchor has
 * already been set.
 */
function declaresPreview(children: ReactNode): boolean {
  let found = false;
  Children.forEach(children, (child) => {
    if (found || !isValidElement(child)) return;
    if (child.type === ContextMenuPreview) {
      found = true;
      return;
    }
    const inner = (child.props as { children?: ReactNode }).children;
    if (inner && declaresPreview(inner)) found = true;
  });
  return found;
}

/**
 * The root takes exactly what `Menu`'s root takes — `open`, `onOpenChange`,
 * `defaultOpen`, `presentation` and `haptics` — because it *is* that root.
 */
export type ContextMenuProps = MenuProps;

/**
 * The root. Provides the menu's own context and the popover underneath it.
 *
 * It renders a `Menu`, which is not a shortcut — it is the point. Everything a
 * menu is, this is, and the parts below are the only difference.
 */
function ContextMenuRoot({ children, ...props }: ContextMenuProps) {
  const [target, setTarget] = useState<TargetRect | null>(null);
  const [content, setContent] = useState<ReactNode>(null);
  const hasPreview = useMemo(() => declaresPreview(children), [children]);

  const context = useMemo<ContextMenuContextValue>(
    () => ({ target, setTarget, content, setContent, hasPreview }),
    [target, content, hasPreview]
  );

  return (
    <ContextMenuContext.Provider value={context}>
      <Menu {...props}>{children}</Menu>
    </ContextMenuContext.Provider>
  );
}

/** Which rectangle the panel is placed against. */
export type ContextMenuAnchor = 'point' | 'target';

export interface ContextMenuTriggerProps extends Omit<ViewProps, 'children' | 'onKeyDown'> {
  /**
   * Classes on the wrapper the content sits in, which lays out like any other
   * view — it does not shrink to its child, because the things held are usually
   * meant to fill their place in the layout. It is also the rect
   * `anchor="target"` measures.
   */
  className?: string;
  /**
   * The content the actions belong to. Anything at all — it is not required to
   * be pressable, and is not cloned or altered.
   */
  children: ReactNode;
  /**
   * `point` anchors the panel where the finger landed, `target` against the
   * bounds of the whole trigger.
   *
   * Point is the default because a context menu's target is usually large, and
   * the middle of a whole message is not where the press was. Reach for
   * `target` when the target is small and list-shaped and the panel should read
   * as lining up with it. Keyboard and accessibility opens always use the target
   * bounds, because those modalities have no pointer coordinate.
   */
  anchor?: ContextMenuAnchor;
  /** How long the hold has to last, in milliseconds. 350 by default. */
  delay?: number;
  /**
   * How far the finger may move during the hold before it stops being one, in
   * points. 12 by default.
   *
   * Loose rather than tight, because the target is usually inside a scroller: a
   * threshold small enough to feel precise cancels the menu for anyone whose
   * thumb drifts while holding still, and a scroll has travelled much further
   * than this by the time the two need telling apart. Tighten it only for a
   * target that cannot be scrolled.
   */
  slop?: number;
  /** A short press on the target, which the hold never also counts as. */
  onPress?: () => void;
  /**
   * Tick the haptic engine as the menu opens. Needs the optional
   * `expo-haptics`, and is silent without it.
   *
   * Worth setting more often than not. A hold has no edge to it the way a press
   * does — nothing moves under the finger at the moment it takes — so the tick
   * is what tells someone the hold has been long enough, before the panel has
   * had time to say so.
   */
  haptics?: boolean;
  /** Nothing opens the menu, and the short press stops firing too. */
  disabled?: boolean;
  /**
   * Called first for keyboard events. Prevent the event to keep ContextMenu
   * from handling it. Context Menu and Shift+F10 open the menu; Enter and Space
   * mirror the trigger's accessible activation.
   */
  onKeyDown?: (event: ContextMenuKeyDownEvent) => void;
}

/**
 * Wraps the content and opens the menu when held, through accessibility
 * actions, or from the keyboard.
 *
 * The wrapper is a plain view and lays out like one, stretching as a view does
 * rather than shrinking to its child. That is the opposite of what a tooltip's
 * trigger wants, and for the opposite reason: a tooltip names a control and
 * belongs over it, while the things held here — a bubble, a card, a row — are
 * usually meant to fill their place in the layout, and a wrapper that collapsed
 * around them would change it.
 *
 * It is also the rect measured under `anchor="target"`, which is why that
 * anchoring lines the panel up with the row rather than with the text in it.
 */
function ContextMenuTrigger({
  className,
  children,
  anchor = 'point',
  delay = DEFAULT_DELAY,
  slop = DEFAULT_SLOP,
  onPress,
  haptics = false,
  disabled = false,
  accessible,
  accessibilityActions,
  onAccessibilityAction,
  accessibilityRole,
  accessibilityState,
  focusable,
  tabIndex,
  onKeyDown,
  ...props
}: ContextMenuTriggerProps) {
  const { setOpen, anchorTo } = usePopoverAnchor('ContextMenu.Trigger');
  const { setTarget, setContent, hasPreview } = useContextMenu('ContextMenu.Trigger');
  const ref = useRef<ViewRef>(null);

  /*
   * A preview overrules `anchor`, and has to.
   *
   * The panel is placed outside whatever rectangle it is given, so anchoring to
   * the target is what keeps it clear of the lifted copy of that target. Anchor
   * to the press instead and the panel opens over the very thing the preview
   * exists to show.
   */
  const against: ContextMenuAnchor = hasPreview ? 'target' : anchor;

  /*
   * Both branches end up doing the same thing — set an anchor, then open — and
   * differ only in which rectangle they set. A point is a zero-sized rect,
   * which the popover places a panel against exactly as it does a trigger's
   * bounds; there is no separate code path for it downstream.
   *
   * The target is measured either way, because the preview draws at that rect
   * whatever the panel is placed against.
   */
  const open = useCallback(
    (point?: { x: number; y: number }) => {
      // Ticked here rather than in the gesture callback so it fires once the
      // hold has been accepted, which is the moment there is something to
      // confirm — and on the same side of the bridge as the opening.
      if (haptics) selectionTick();

      // Measured on opening rather than on layout: the target may have
      // scrolled since, and a stale rect anchors the panel to where it was.
      ref.current?.measureInWindow((mx, my, width, height) => {
        setTarget({ x: mx, y: my, width, height });
        setContent(children);

        /*
         * The panel is placed outside the rectangle it is given, so under a
         * preview that rectangle has to be the target's *lifted* bounds rather
         * than its resting ones. The lift grows the target about its middle,
         * and anchoring to the smaller rect left the panel overlapping the
         * last few points of it — where the lifted copy, drawn over the panel,
         * simply hid the row underneath.
         */
        const grown = hasPreview ? (PREVIEW_SCALE - 1) / 2 : 0;
        anchorTo(
          against === 'point' && point
            ? { ...point, width: 0, height: 0 }
            : {
                x: mx - width * grown,
                y: my - height * grown,
                width: width * (1 + grown * 2),
                height: height * (1 + grown * 2),
              }
        );
        setOpen(true);
      });
    },
    [against, anchorTo, setOpen, haptics, setTarget, setContent, children, hasPreview]
  );

  const openAt = useCallback((x: number, y: number) => open({ x, y }), [open]);
  // Keyboard and accessibility actions have no pointer coordinate to honour.
  // The measured target is the only real location they can anchor against.
  const openFromTarget = useCallback(() => open(), [open]);

  const invoke = useCallback(
    (invocation: ContextMenuInvocation) => {
      if (invocation === 'menu') openFromTarget();
      else onPress?.();
    },
    [onPress, openFromTarget]
  );

  const triggerActions = useMemo<readonly AccessibilityActionInfo[] | undefined>(() => {
    if (disabled) return undefined;
    const reserved = new Set(['activate', 'showMenu']);
    return [
      { name: 'activate' },
      { name: 'showMenu', label: 'Show menu' },
      ...(accessibilityActions ?? []).filter(({ name }) => !reserved.has(name)),
    ];
  }, [accessibilityActions, disabled]);

  const handleAccessibilityAction = useCallback<
    NonNullable<ViewProps['onAccessibilityAction']>
  >(
    (event) => {
      const actionName = event.nativeEvent.actionName;
      const invocation = contextMenuAccessibilityInvocation(actionName, !!onPress, disabled);
      if (invocation) {
        invoke(invocation);
        return;
      }
      // Reserved actions cannot bypass a disabled trigger through a consumer
      // handler, while unrelated custom actions still compose normally.
      if (actionName === 'activate' || actionName === 'showMenu') return;
      onAccessibilityAction?.(event);
    },
    [disabled, invoke, onAccessibilityAction, onPress]
  );

  const handleKeyDown = useCallback(
    (event: ContextMenuKeyDownEvent) => {
      onKeyDown?.(event);
      if (event.isDefaultPrevented()) return;
      const invocation = contextMenuKeyInvocation(event.nativeEvent, !!onPress, disabled);
      if (!invocation) return;
      event.preventDefault();
      invoke(invocation);
    },
    [disabled, invoke, onKeyDown, onPress]
  );

  // React Native exposes key events at runtime (and in its generated types),
  // while its compatibility ViewProps declaration does not yet list them.
  const keyboardProps = { onKeyDown: handleKeyDown } as ViewProps;

  const gesture = useMemo(() => {
    /*
     * The hold and the tap are given to the recogniser as alternatives, so it
     * decides between them rather than both firing. That is the whole reason
     * this is a gesture and not a `Pressable`: the target below usually has a
     * press of its own, and a hold that opened the menu must not also count as
     * one.
     *
     * `absoluteX`/`absoluteY` are window coordinates, which is the space the
     * popover places panels in — so the press point needs no conversion.
     */
    const hold = Gesture.LongPress()
      .minDuration(delay)
      .maxDistance(slop)
      .enabled(!disabled)
      .onStart((event) => {
        runOnJS(openAt)(event.absoluteX, event.absoluteY);
      });

    const tap = Gesture.Tap()
      .enabled(!disabled && !!onPress)
      .onEnd((_event, success) => {
        if (success && onPress) runOnJS(onPress)();
      });

    return Gesture.Exclusive(hold, tap);
  }, [delay, slop, disabled, onPress, openAt]);

  return (
    <GestureDetector gesture={gesture}>
      {/*
        `collapsable={false}` keeps the wrapper as a real view on Android, where
        a view that only groups children is otherwise flattened away — and a
        flattened view cannot be measured, which `anchor="target"` needs.
      */}
      <View
        ref={ref}
        collapsable={false}
        accessible={accessible ?? true}
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityState={{
          ...accessibilityState,
          disabled: disabled || accessibilityState?.disabled,
        }}
        accessibilityActions={triggerActions}
        onAccessibilityAction={handleAccessibilityAction}
        focusable={focusable ?? !disabled}
        tabIndex={tabIndex ?? (disabled ? -1 : 0)}
        className={className}
        {...keyboardProps}
        {...props}
      >
        {children}
      </View>
    </GestureDetector>
  );
}

/** How far the lifted target grows. Enough to read as off the page. */
const PREVIEW_SCALE = 1.04;

/** Coming off the page. Soft, because the target is large and close to the eye. */
const PREVIEW_SPRING = { damping: 20, stiffness: 220, mass: 0.7 } as const;

export interface ContextMenuPreviewProps {
  /**
   * Drawn instead of the target itself. For a target that would be wrong to
   * repeat — one carrying a video, a live map, a text field with a cursor in
   * it — or one that should show more of itself once it has the screen.
   *
   * Left out, the target is drawn again as it stands, which is what makes the
   * lift read as the content coming forward rather than as a picture of it
   * appearing.
   */
  children?: ReactNode;
  /** Extra classes on the lifted copy. */
  className?: string;
}

/**
 * The target, lifted off the page while its actions are up.
 *
 * Declared inside `ContextMenu.Content`, but not drawn there — it floats over
 * the dimmed screen at the place the target was measured, and the panel is
 * anchored to that same rectangle so the two never overlap. Its presence is
 * what switches the anchor: a panel placed at the press point would open across
 * the very content the preview exists to hold up.
 *
 * What it draws is the trigger's own children, rendered a second time. That
 * keeps the lift honest — it is the content itself coming forward, at the size
 * and in the place it already occupied — and it is why a target that should not
 * simply be repeated can pass its own `children` instead.
 *
 * It takes no touches. The actions are in the panel; the lifted content is
 * there to say what they are about, and a second live copy of a pressable card
 * would be a second place to press.
 */
function ContextMenuPreview({ children, className }: ContextMenuPreviewProps) {
  const { target, content } = useContextMenu('ContextMenu.Preview');
  const lift = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    lift.value = reduced ? 1 : withSpring(1, PREVIEW_SPRING);
  }, [lift, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: lift.value,
    transform: [{ scale: 1 + lift.value * (PREVIEW_SCALE - 1) }],
  }));

  if (!target) return null;

  return (
    <Portal>
      <Animated.View
        pointerEvents="none"
        exiting={reduced ? undefined : FadeOut.duration(140)}
        style={[
          style,
          {
            position: 'absolute',
            left: target.x,
            top: target.y,
            width: target.width,
          },
        ]}
        className={className}
      >
        {children ?? content}
      </Animated.View>
    </Portal>
  );
}

ContextMenuPreview.displayName = 'ContextMenu.Preview';

export interface ContextMenuItemProps extends MenuItemProps {
  /**
   * The row's glyph, drawn at the trailing edge rather than in front of the
   * label. Painted to match the label unless it carries a colour of its own.
   */
  icon?: ReactNode;
}

/**
 * One row: the verb at the leading edge, its glyph at the trailing one.
 *
 * The other way round is right for a menu dropped from a button, where the
 * glyphs form a column the eye runs down to find the row it wants. A context
 * menu is not read that way. It appears under the hand that opened it, already
 * over the content, and what is being scanned is the *words* — so the words
 * start at the edge, flush with one another, and the glyph sits at the far side
 * confirming the row rather than introducing it.
 *
 * It is still `Menu.Item` underneath, handed the glyph as its trailing slot. So
 * the press-in fill, the destructive colour and the dismiss-on-select rule are
 * one implementation shared with `Menu`, and only the arrangement differs.
 */
function ContextMenuItem({ className, icon, variant, ...props }: ContextMenuItemProps) {
  const glyph = useGlyph(variant);

  return (
    <Menu.Item
      variant={variant}
      className={cn(ROW_CLASS, className)}
      trailing={icon ? glyph(icon) : undefined}
      {...props}
    />
  );
}

ContextMenuItem.displayName = 'ContextMenu.Item';

/**
 * A row carrying a state. Its tick stays at the leading edge, where `Menu` puts
 * it, because a tick is not a glyph naming the row — it is the answer to it,
 * and a column of them is what makes a set of choices readable as one.
 */
function ContextMenuCheckboxItem({ className, ...props }: MenuCheckboxItemProps) {
  return <Menu.CheckboxItem className={cn(ROW_CLASS, className)} {...props} />;
}

ContextMenuCheckboxItem.displayName = 'ContextMenu.CheckboxItem';

/**
 * Everything `Menu.Content` takes. The four listed here are the ones whose
 * defaults differ, and they are listed so the difference is visible.
 */
export interface ContextMenuContentProps extends MenuContentProps {
  /** Which side of the anchor the panel opens on. Down from the press, flipping
   * above it near the bottom of the screen. */
  placement?: MenuContentProps['placement'];
  /** Where it sits along the other axis. From the press, not centred on it. */
  align?: MenuContentProps['align'];
  /** Gap between the anchor and the panel. Small, so it reads as coming out of
   * the press rather than floating near it. */
  offset?: number;
  /**
   * Floor for the panel's width. A context menu has no trigger to take its
   * width from, and a column of one-word verbs is too narrow to aim at.
   */
  minWidth?: number;
  /** Dim the screen behind the panel. On here, unlike a plain popover. */
  scrim?: boolean;
}

/**
 * The panel, with the defaults a context menu wants rather than a popover's.
 *
 * It unfolds down and from the press rather than being centred on it —
 * centring is right for a panel under a button, and wrong for one at a
 * fingertip, where it would put half the panel back under the hand that opened
 * it. Near the bottom of the screen `Popover` flips it above the press and
 * clamps it into the safe area, so the one case where down does not work
 * answers itself.
 *
 * The gap to the anchor is small, so the panel reads as coming out of the press
 * rather than floating near it.
 *
 * The screen dims behind it, which a popover does not do. A context menu is
 * modal in practice — the content underneath is what the actions are *about*,
 * so nothing else on the screen is available while it is up, and the dim is
 * what says so.
 */
function ContextMenuContent({
  placement = 'bottom',
  align = 'start',
  offset = 8,
  minWidth = DEFAULT_MIN_WIDTH,
  scrim = true,
  children,
  ...props
}: ContextMenuContentProps) {
  // The panel is portalled, so it mounts outside this provider's subtree.
  // Re-provided here so `ContextMenu.Preview`, which is declared among these
  // rows, can still reach the rectangle the trigger measured.
  const context = useContextMenu('ContextMenu.Content');

  return (
    <Menu.Content
      placement={placement}
      align={align}
      offset={offset}
      minWidth={minWidth}
      scrim={scrim}
      {...props}
    >
      <ContextMenuContext.Provider value={context}>{children}</ContextMenuContext.Provider>
    </Menu.Content>
  );
}

/*
 * Everything not listed here is Menu's, passed straight through. The three that
 * are listed are wrappers rather than second implementations — they set a class
 * or move a slot and hand the row back to `Menu.Item`, so the press-in fill,
 * the destructive colour and the dismiss-on-select rule stay in one place and
 * cannot drift between the two ways of reaching a list of verbs.
 */
export const ContextMenu = Object.assign(ContextMenuRoot, {
  Trigger: ContextMenuTrigger,
  Content: ContextMenuContent,
  Preview: ContextMenuPreview,
  Background: Menu.Background,
  Label: Menu.Label,
  Item: ContextMenuItem,
  CheckboxItem: ContextMenuCheckboxItem,
  RadioGroup: Menu.RadioGroup,
  RadioItem: Menu.RadioItem,
  Separator: Menu.Separator,
  Sub: Menu.Sub,
  SubTrigger: Menu.SubTrigger,
  SubContent: Menu.SubContent,
});
