/**
 * Tooltip — a small label that names the thing under your finger.
 *
 * A popover is a panel you open and deal with; a tooltip is a whisper. It
 * carries a word or two about what a control does, appears without taking the
 * screen, and goes away on its own. That is why it is inverted by default, why
 * it is not dismissible with a scrim, and why it closes after a beat instead of
 * waiting to be told.
 *
 * The inversion is a default rather than a rule, because the whisper has a
 * larger sibling: a tooltip that carries a heading and a sentence stops reading
 * as a different layer and starts reading as a panel with the wrong colours.
 * `variant="surface"` makes it one, and the sizing props — `width`,
 * `minWidth`, `maxHeight`, `scrollable` — are what let it hold that much.
 *
 * On touch there is no hover to open it, so the gesture is a long press by
 * default — the platform's own "tell me more" gesture — with `openOn="press"`
 * for the cases where a tap should reveal it instead.
 *
 * ```tsx
 * <Tooltip label="Copy link">
 *   <Tooltip.Trigger>
 *     <IconButton icon={<LinkIcon />} />
 *   </Tooltip.Trigger>
 *   <Tooltip.Content>
 *     <Tooltip.Arrow />
 *     Copy link
 *   </Tooltip.Content>
 * </Tooltip>
 * ```
 *
 * Placement is a preference, not a promise: the trigger is measured when it is
 * pressed, the label measures itself on its first layout, and the two are
 * reconciled against the safe area — so `placement="top"` means *above, if
 * above fits*, and a trigger near the top edge shows its tooltip below instead.
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
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type ViewProps,
} from 'react-native';
import Animated, {
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tv } from 'tailwind-variants';
import { Portal } from '../../primitives/portal';
import { Text, type TextProps } from '../../primitives/text';
import { cn } from '../../utils/cn';
import type { ViewRef } from '../../primitives/refs';

/** Gap between the trigger and the label. */
const DEFAULT_OFFSET = 6;
/** Smallest gap allowed between the label and the edge of the safe area. */
const SCREEN_MARGIN = 12;
/** Side of the arrow square before it is rotated 45°. */
const ARROW_SIZE = 10;
/** How long the label stays up before hiding itself, in milliseconds. */
const DEFAULT_DURATION = 1500;

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';
export type TooltipAlign = 'start' | 'center' | 'end';
export type TooltipVariant = 'inverted' | 'surface';

/**
 * Every colour the tooltip has, in one place.
 *
 * They were three literals at three call sites — the panel, the arrow and the
 * default text — which meant retheming a tooltip took three `className`
 * overrides that each had to be kept in step with the others. As a variant it
 * is one prop, and the arrow and the text read it off the context rather than
 * being told again.
 */
const tooltipVariants = tv({
  slots: {
    content: 'rounded-lg px-2.5 py-1.5 shadow-md',
    text: 'text-sm font-medium',
    title: 'text-sm font-semibold',
    description: 'text-sm',
    arrow: 'rounded-[1px]',
  },
  variants: {
    variant: {
      /*
       * The default, and deliberately not a surface colour: a whisper over the
       * page should read as a different layer rather than as another panel of
       * it. It is the treatment a one-line label wants.
       */
      inverted: {
        content: 'bg-foreground',
        text: 'text-background',
        title: 'text-background',
        description: 'text-background/70',
        arrow: 'bg-foreground',
      },
      /*
       * For a tooltip carrying more than a label — a heading, a sentence, a row
       * of controls. At that size the inversion stops reading as a whisper and
       * starts reading as a panel with the wrong colours, so it becomes one.
       */
      surface: {
        content: 'border border-border bg-popover',
        text: 'text-popover-foreground',
        title: 'text-popover-foreground',
        description: 'text-muted-foreground',
        arrow: 'border-border bg-popover',
      },
    },
  },
  defaultVariants: {
    variant: 'inverted',
  },
});

interface TriggerRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TooltipContextValue {
  open: boolean;
  show: () => void;
  hide: () => void;
  trigger: TriggerRect | null;
  setTrigger: (rect: TriggerRect | null) => void;
  /** Resolved placement, published by Content so Arrow knows which way to point. */
  placement: TooltipPlacement;
  setPlacement: (placement: TooltipPlacement) => void;
  /** Trigger centre along the cross axis, relative to the label origin. */
  arrowOffset: number;
  setArrowOffset: (offset: number) => void;
  /** How the trigger opens the tooltip. */
  openOn: TooltipOpenOn;
  /** Accessibility label carried onto the trigger. */
  label?: string;
  /** Which set of colours the panel, arrow and text draw from. */
  variant: TooltipVariant;
  setVariant: (variant: TooltipVariant) => void;
}

export type TooltipOpenOn = 'longPress' | 'press';

const TooltipContext = createContext<TooltipContextValue | null>(null);

function useTooltip(component: string): TooltipContextValue {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error(`${component} must be used within a <Tooltip>`);
  }
  return context;
}

export interface TooltipProps {
  children: ReactNode;
  /** Controlled open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Initial state when uncontrolled. */
  defaultOpen?: boolean;
  /**
   * Whether a long press or a plain press reveals the label. Long press is the
   * default because it does not steal a tappable control's own press.
   */
  openOn?: TooltipOpenOn;
  /**
   * How long the label stays up before hiding itself, in milliseconds. `0`
   * keeps it up until it is dismissed by a tap outside or the trigger again.
   */
  duration?: number;
  /**
   * The label's text, mirrored onto the trigger as its accessibility label so
   * a screen reader announces what the tooltip says without opening it. Set it
   * whenever the trigger has no text of its own — an icon-only button.
   */
  label?: string;
}

function TooltipRoot({
  children,
  open,
  onOpenChange,
  defaultOpen = false,
  openOn = 'longPress',
  duration = DEFAULT_DURATION,
  label,
}: TooltipProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [trigger, setTrigger] = useState<TriggerRect | null>(null);
  const [placement, setPlacement] = useState<TooltipPlacement>('top');
  const [arrowOffset, setArrowOffset] = useState(0);
  /*
   * Published by Content rather than passed to it, because the arrow and the
   * text sit beside the panel in the tree and would otherwise each have to be
   * told which colours to use.
   */
  const [variant, setVariant] = useState<TooltipVariant>('inverted');

  const isControlled = open !== undefined;
  const resolvedOpen = isControlled ? open : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const show = useCallback(() => setOpen(true), [setOpen]);
  const hide = useCallback(() => setOpen(false), [setOpen]);

  // A tooltip is not a thing you deal with, so it hides itself after a beat.
  // The timer is armed on open and cleared on close, and `duration` of 0 opts
  // out — for a tooltip that stays until the next tap.
  useEffect(() => {
    if (!resolvedOpen || duration <= 0) return;
    const timer = setTimeout(() => setOpen(false), duration);
    return () => clearTimeout(timer);
  }, [resolvedOpen, duration, setOpen]);

  const context = useMemo(
    () => ({
      open: resolvedOpen,
      show,
      hide,
      trigger,
      setTrigger,
      placement,
      setPlacement,
      arrowOffset,
      setArrowOffset,
      openOn,
      label,
      variant,
      setVariant,
    }),
    [resolvedOpen, show, hide, trigger, placement, arrowOffset, openOn, label, variant]
  );

  return <TooltipContext.Provider value={context}>{children}</TooltipContext.Provider>;
}

export interface TooltipTriggerProps {
  /**
   * Classes on the wrapper the child is measured through. It shrinks to the
   * child by default; widen it only if the label should be anchored to
   * something bigger than the control.
   */
  className?: string;
  children: ReactElement<{
    onPress?: (...args: unknown[]) => void;
    onLongPress?: (...args: unknown[]) => void;
    accessibilityLabel?: string;
    accessibilityHint?: string;
  }>;
}

/**
 * Wraps its child and reveals the label on it — a long press by default, a
 * press when the root asks for one. It is also what gets measured, so the
 * label knows where to sit.
 *
 * The child is wrapped in a view rather than handed a ref: the ref has to
 * survive whatever the child is — a button, a plain Pressable, an icon — and
 * only a wrapper we own is guaranteed to be measurable.
 *
 * That wrapper shrinks to its child on purpose. A view stretches to its parent
 * by default, and a wrapper that filled the row would be measured as the whole
 * row — putting a centred label over the middle of the screen rather than over
 * the control it names.
 */
function TooltipTrigger({ className, children }: TooltipTriggerProps) {
  const { open, show, hide, setTrigger, openOn, label } = useTooltip('Tooltip.Trigger');
  const ref = useRef<ViewRef>(null);

  const measureThenShow = () => {
    // Measured on every open rather than on layout: the trigger may have
    // scrolled since it was laid out, and a stale rect anchors the label to
    // where the trigger used to be.
    ref.current?.measureInWindow((x, y, width, height) => {
      setTrigger({ x, y, width, height });
      show();
    });
  };

  const handleLongPress = (...args: unknown[]) => {
    if (isValidElement(children)) children.props.onLongPress?.(...args);
    if (openOn === 'longPress') measureThenShow();
  };

  const handlePress = (...args: unknown[]) => {
    if (isValidElement(children)) children.props.onPress?.(...args);
    if (openOn !== 'press') return;
    if (open) hide();
    else measureThenShow();
  };

  // A trigger that is not an element has nothing to clone handlers onto, so it
  // is passed through — wrapped, if it is bare text, since a string cannot be
  // a child of a view.
  if (!isValidElement(children)) {
    return typeof children === 'string' || typeof children === 'number' ? (
      <Text>{children}</Text>
    ) : (
      <>{children}</>
    );
  }

  return (
    <View ref={ref} collapsable={false} className={cn('self-start', className)}>
      {cloneElement(children, {
        onPress: handlePress,
        onLongPress: handleLongPress,
        // An icon-only trigger has nothing for a screen reader to read; the
        // label fills that in without the sighted user having to open it.
        accessibilityLabel: children.props.accessibilityLabel ?? label,
      })}
    </View>
  );
}

export interface TooltipContentProps extends ViewProps {
  className?: string;
  /** Preferred side of the trigger. Flipped when that side does not fit. */
  placement?: TooltipPlacement;
  /** Where the label sits along the trigger's other axis. */
  align?: TooltipAlign;
  /** Gap between the trigger and the label, in pixels. */
  offset?: number;
  /** Nudge along the alignment axis, in pixels. */
  alignOffset?: number;
  /**
   * Which set of colours the panel, its arrow and its text draw from.
   *
   * `inverted` is the default and right for a label: a whisper over the page
   * should read as a different layer rather than as another panel of it.
   * `surface` matches the popover — reach for it once the tooltip carries a
   * heading and a sentence, where the inversion stops reading as a whisper.
   */
  variant?: TooltipVariant;
  /**
   * `content-fit` sizes to the content, `trigger` matches the trigger's width,
   * `full` spans the safe area, and a number is that many pixels. Worth setting
   * for anything longer than a label, which would otherwise run to whatever
   * width the sentence happens to want.
   */
  width?: number | 'trigger' | 'full' | 'content-fit';
  /** Floor for the panel's width, in pixels. */
  minWidth?: number;
  /**
   * Ceiling for the panel's height, in pixels. Always clamped to the room
   * inside the safe area, which is also the default.
   */
  maxHeight?: number;
  /**
   * Scroll the body when it is taller than `maxHeight`. Off by default — a
   * label has nothing to scroll, and a scroller around one only adds a bounce.
   */
  scrollable?: boolean;
  children?: ReactNode;
}

function TooltipContent({
  className,
  placement = 'top',
  align = 'center',
  offset = DEFAULT_OFFSET,
  alignOffset = 0,
  variant = 'inverted',
  width = 'content-fit',
  minWidth,
  maxHeight,
  scrollable = false,
  children,
  onLayout: onLayoutProp,
  style,
  ...props
}: TooltipContentProps) {
  const context = useTooltip('Tooltip.Content');
  const { open, hide, trigger, setPlacement, setArrowOffset, setVariant } = context;
  const slots = tooltipVariants({ variant });

  // The arrow and the text sit beside this panel in the tree, so the chosen
  // colours are published rather than passed down.
  useEffect(() => {
    setVariant(variant);
  }, [variant, setVariant]);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  // Label size changes with its text, so it is re-measured rather than measured
  // once — a tooltip whose text is swapped should not stay the old size.
  const onLayout = (event: LayoutChangeEvent) => {
    const { width: w, height: h } = event.nativeEvent.layout;
    setSize((current) =>
      current && Math.abs(current.width - w) < 1 && Math.abs(current.height - h) < 1
        ? current
        : { width: w, height: h }
    );
    onLayoutProp?.(event);
  };

  /*
   * Forgetting the size on close is what makes the second open behave like the
   * first. Held, it would place the reopened label using the last label's
   * dimensions for a frame — and, because the entrance is driven off whether a
   * position exists at all, a size that never went away means a tooltip that
   * animates in once and afterwards just appears.
   */
  useEffect(() => {
    if (!open) setSize(null);
  }, [open]);

  const bounds = {
    left: insets.left + SCREEN_MARGIN,
    right: screenWidth - insets.right - SCREEN_MARGIN,
    top: insets.top + SCREEN_MARGIN,
    bottom: screenHeight - insets.bottom - SCREEN_MARGIN,
  };

  const available = bounds.right - bounds.left;
  const requestedWidth =
    width === 'content-fit'
      ? undefined
      : width === 'trigger'
        ? trigger?.width
        : width === 'full'
          ? available
          : width;

  // The floor never wins past the space there actually is — a panel wider than
  // the screen is worse than a cramped one.
  const resolvedWidth =
    requestedWidth === undefined
      ? minWidth === undefined
        ? undefined
        : Math.min(minWidth, available)
      : Math.min(Math.max(requestedWidth, minWidth ?? 0), available);

  const room = bounds.bottom - bounds.top;
  const resolvedMaxHeight = Math.min(maxHeight ?? room, room);

  const position =
    trigger && size
      ? place({ trigger, size, placement, align, offset, alignOffset, bounds })
      : null;

  // Publish the side actually used and where the trigger centre landed, so the
  // arrow points at the trigger even after a flip or a clamp.
  const resolvedPlacement = position?.placement;
  const resolvedArrow = position?.arrowOffset;
  useEffect(() => {
    if (resolvedPlacement) setPlacement(resolvedPlacement);
    if (resolvedArrow !== undefined) setArrowOffset(resolvedArrow);
  }, [resolvedPlacement, resolvedArrow, setPlacement, setArrowOffset]);

  /*
   * The entrance is driven by hand rather than by an `entering` preset, and the
   * reason is the measuring frame. A layout animation fires on mount — which
   * here is the frame *before* the label knows where it goes, so the whole
   * animation would play at the origin, invisibly, and the label would then
   * snap into place fully formed. Holding the values until a position exists is
   * the only way to have both the animation and the correct position.
   */
  const appear = useSharedValue(0);
  const settle = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const placed = !!position;

  useEffect(() => {
    if (!placed) {
      appear.value = 0;
      settle.value = 0;
      return;
    }
    if (reducedMotion) {
      appear.value = 1;
      settle.value = 1;
      return;
    }
    appear.value = withTiming(1, { duration: 100 });
    settle.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.5 });
  }, [placed, reducedMotion, appear, settle]);

  // Starts slightly small and shifted towards the trigger, so the label
  // appears to unfold from it rather than fade in over it.
  const origin = ENTRY_SHIFT[resolvedPlacement ?? placement];
  const labelStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [
      { translateX: origin.x * (1 - settle.value) },
      { translateY: origin.y * (1 - settle.value) },
      { scale: 0.9 + 0.1 * settle.value },
    ],
  }));

  if (!open || !trigger) return null;

  return (
    <Portal>
      {/* Portal content mounts under PortalHost, outside this provider's
          subtree — re-provide the context so Tooltip.Arrow keeps working. */}
      <TooltipContext.Provider value={context}>
        <View className="absolute inset-0">
          {/* No scrim — a tooltip does not dim the screen. The transparent
              catcher only lets a tap anywhere dismiss the label. */}
          <Pressable
            accessibilityLabel="Dismiss"
            className="absolute inset-0"
            onPress={hide}
          />
          {/*
            Two views, not one: a Reanimated rule forbids a layout animation and
            an animated style driving the same property on one component, or the
            layout animation silently wins. The exit fade and `labelStyle`'s
            opacity both want it — so the outer view owns the position and the
            exit, the inner one the entrance and the label's own surface.
          */}
          <Animated.View
            exiting={FadeOut.duration(100)}
            onLayout={onLayout}
            style={{
              position: 'absolute',
              pointerEvents: 'box-none',
              // Until it has measured itself the label has no honest position,
              // so it is laid out off-screen rather than at the origin.
              top: position?.top ?? -9999,
              left: position?.left ?? -9999,
              maxWidth: available,
              maxHeight: resolvedMaxHeight,
              width: resolvedWidth,
            }}
          >
            <Animated.View
              // A panel with a heading and a paragraph is a group, not a run of
              // text — the flat role would have a screen reader read it as one
              // string with no structure.
              accessibilityRole={scrollable || width !== 'content-fit' ? undefined : 'text'}
              style={[labelStyle, style]}
              className={cn(
                slots.content(),
                scrollable ? 'overflow-hidden' : undefined,
                className
              )}
              {...props}
            >
              {/*
                Wrapped one child at a time, not all-or-nothing. The label is
                almost always written as an arrow followed by its text, which
                makes `children` an array — so a check against the whole of it
                is never a string, and the text underneath would reach this
                view bare. Only the text nodes need the treatment; an element
                is already responsible for itself.
              */}
              {scrollable ? (
                <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                  {wrapTooltipText(children)}
                </ScrollView>
              ) : (
                wrapTooltipText(children)
              )}
            </Animated.View>
          </Animated.View>
        </View>
      </TooltipContext.Provider>
    </Portal>
  );
}

/** Bare strings become the label's default text; elements speak for themselves. */
function wrapTooltipText(children: ReactNode) {
  return Children.map(children, (child) =>
    typeof child === 'string' || typeof child === 'number' ? (
      <TooltipText>{child}</TooltipText>
    ) : (
      child
    )
  );
}

/** The label's default text, coloured to whatever the panel is made of. */
function TooltipText({ className, ...props }: TextProps) {
  const { variant } = useTooltip('Tooltip.Text');
  const { text } = tooltipVariants({ variant });

  return <Text className={cn(text(), className)} {...props} />;
}
TooltipText.displayName = 'Tooltip.Text';
TooltipTitle.displayName = 'Tooltip.Title';
TooltipDescription.displayName = 'Tooltip.Description';

export interface TooltipTitleProps extends TextProps {
  className?: string;
}

/** A heading, for a tooltip carrying more than a label. */
function TooltipTitle({ className, ...props }: TooltipTitleProps) {
  const { variant } = useTooltip('Tooltip.Title');
  const { title } = tooltipVariants({ variant });

  return (
    <Text {...props} accessibilityRole="header" className={cn(title(), className)} />
  );
}

export interface TooltipDescriptionProps extends TextProps {
  className?: string;
}

/** The sentence under a `Tooltip.Title`, in the panel's secondary colour. */
function TooltipDescription({ className, ...props }: TooltipDescriptionProps) {
  const { variant } = useTooltip('Tooltip.Description');
  const { description } = tooltipVariants({ variant });

  return <Text className={cn(description(), className)} {...props} />;
}

export interface TooltipArrowProps extends ViewProps {
  className?: string;
}

/**
 * A small square rotated into a diamond, half-buried under the label so only
 * the point shows. It shares the label's fill and points at the trigger's
 * centre, which Content resolves and publishes — so when `align` shifts the
 * label off-centre, or a clamp slides it back on screen, the arrow stays over
 * the trigger rather than over the label's middle.
 */
function TooltipArrow({ className, style, ...props }: TooltipArrowProps) {
  const { trigger, placement, arrowOffset, variant } = useTooltip('Tooltip.Arrow');
  const { arrow } = tooltipVariants({ variant });
  if (!trigger) return null;

  const vertical = placement === 'top' || placement === 'bottom';
  // The arrow sits on the edge facing the trigger, the opposite edge to the
  // placement: a label placed above the trigger has its arrow on the bottom.
  const edge = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[placement];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          position: 'absolute',
          pointerEvents: 'none',
          [edge]: -ARROW_SIZE / 2,
          width: ARROW_SIZE,
          height: ARROW_SIZE,
          transform: [{ rotate: '45deg' }],
          // Centred on the trigger along the cross axis. `marginLeft/Top` backs
          // it off by half its own size so `arrowOffset` lands on its centre.
          ...(vertical
            ? { left: arrowOffset, marginLeft: -ARROW_SIZE / 2 }
            : { top: arrowOffset, marginTop: -ARROW_SIZE / 2 }),
        },
        style,
      ]}
      className={cn(arrow(), className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Placement                                                                  */
/* -------------------------------------------------------------------------- */

interface PlaceArgs {
  trigger: TriggerRect;
  size: { width: number; height: number };
  placement: TooltipPlacement;
  align: TooltipAlign;
  offset: number;
  alignOffset: number;
  bounds: { left: number; right: number; top: number; bottom: number };
}

/**
 * Resolves the label's window position.
 *
 * Two passes, in this order: the flip picks a *side* and only fires when the
 * preferred one genuinely has less room than its opposite; the clamp then
 * slides the label along the other axis to keep it on screen. Doing the clamp
 * first would let a label be nudged inside the bounds and so look like it fits,
 * hiding the fact that the wrong side was chosen.
 */
function place({ trigger, size, placement, align, offset, alignOffset, bounds }: PlaceArgs) {
  const roomAfter = {
    bottom: bounds.bottom - (trigger.y + trigger.height + offset),
    top: trigger.y - offset - bounds.top,
    right: bounds.right - (trigger.x + trigger.width + offset),
    left: trigger.x - offset - bounds.left,
  };
  const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const;

  const needed = placement === 'top' || placement === 'bottom' ? size.height : size.width;
  const resolved =
    roomAfter[placement] < needed && roomAfter[opposite[placement]] > roomAfter[placement]
      ? opposite[placement]
      : placement;

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(value, Math.max(min, max)));

  if (resolved === 'top' || resolved === 'bottom') {
    const top =
      resolved === 'bottom'
        ? trigger.y + trigger.height + offset
        : trigger.y - size.height - offset;

    const left =
      align === 'start'
        ? trigger.x + alignOffset
        : align === 'end'
          ? trigger.x + trigger.width - size.width + alignOffset
          : trigger.x + trigger.width / 2 - size.width / 2 + alignOffset;

    const clampedLeft = clamp(left, bounds.left, bounds.right - size.width);
    const triggerCentreX = trigger.x + trigger.width / 2;

    return {
      placement: resolved,
      top: clamp(top, bounds.top, bounds.bottom - size.height),
      left: clampedLeft,
      arrowOffset: clamp(triggerCentreX - clampedLeft, ARROW_SIZE, size.width - ARROW_SIZE),
    };
  }

  const left =
    resolved === 'right' ? trigger.x + trigger.width + offset : trigger.x - size.width - offset;

  const top =
    align === 'start'
      ? trigger.y + alignOffset
      : align === 'end'
        ? trigger.y + trigger.height - size.height + alignOffset
        : trigger.y + trigger.height / 2 - size.height / 2 + alignOffset;

  const clampedTop = clamp(top, bounds.top, bounds.bottom - size.height);
  const triggerCentreY = trigger.y + trigger.height / 2;

  return {
    placement: resolved,
    top: clampedTop,
    left: clamp(left, bounds.left, bounds.right - size.width),
    arrowOffset: clamp(triggerCentreY - clampedTop, ARROW_SIZE, size.height - ARROW_SIZE),
  };
}

/**
 * Where the label starts, relative to where it ends: towards the trigger, on
 * whichever side was resolved, so it appears to grow out of the control.
 */
const ENTRY_SHIFT: Record<TooltipPlacement, { x: number; y: number }> = {
  bottom: { x: 0, y: -6 },
  top: { x: 0, y: 6 },
  right: { x: -6, y: 0 },
  left: { x: 6, y: 0 },
};

export const Tooltip = Object.assign(TooltipRoot, {
  Trigger: TooltipTrigger,
  Content: TooltipContent,
  Arrow: TooltipArrow,
  Title: TooltipTitle,
  Description: TooltipDescription,
  Text: TooltipText,
});
