/**
 * Popover — a panel anchored to the thing that opened it.
 *
 * A dialog takes the screen and asks to be dealt with; a popover stays next to
 * its trigger and keeps the context around it visible. That difference is the
 * whole reason both exist, and it is why this one is positioned rather than
 * centred.
 *
 * ```tsx
 * <Popover>
 *   <Popover.Trigger>
 *     <Button variant="outline">Options</Button>
 *   </Popover.Trigger>
 *   <Popover.Content placement="bottom" align="end">
 *     <Popover.Title>Export</Popover.Title>
 *     <Popover.Description>Choose a format.</Popover.Description>
 *   </Popover.Content>
 * </Popover>
 * ```
 *
 * Placement is a preference, not a promise. The trigger is measured in window
 * coordinates when it is pressed, the panel measures itself on its first
 * layout, and the two are reconciled against the safe area: a panel that would
 * run off the bottom flips above the trigger, and one that would run off the
 * side slides back inside. So `placement="bottom"` means *below, if below
 * fits* — which is the only behaviour that survives a trigger near an edge.
 *
 * The first frame is rendered transparent, because the panel's own size is not
 * known until it has laid out once. Without that it would appear at the origin
 * and jump into place.
 */
import {
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
import { Portal } from '../../primitives/portal';
import { Scrim } from '../../primitives/scrim';
import { BottomSheet } from '../bottom-sheet';
import { Text, type TextProps } from '../../primitives/text';
import { cn } from '../../utils/cn';

/** Gap between the trigger and the panel. */
const DEFAULT_OFFSET = 8;
/** Smallest gap allowed between the panel and the edge of the safe area. */
const SCREEN_MARGIN = 12;
/** Side of the arrow square before it is rotated 45°. */
const ARROW_SIZE = 12;

export type PopoverPlacement = 'top' | 'bottom' | 'left' | 'right';
export type PopoverAlign = 'start' | 'center' | 'end';

interface TriggerRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  trigger: TriggerRect | null;
  setTrigger: (rect: TriggerRect | null) => void;
  /** Resolved placement, published by Content so Arrow knows which way to point. */
  placement: PopoverPlacement;
  setPlacement: (placement: PopoverPlacement) => void;
  /** Trigger centre along the cross axis, relative to the panel origin. */
  arrowOffset: number;
  setArrowOffset: (offset: number) => void;
  /** Whether Content is presenting as a bottom sheet — Arrow is null then. */
  presentation: PopoverPresentation;
}

export type PopoverPresentation = 'popover' | 'bottom-sheet';

const PopoverContext = createContext<PopoverContextValue | null>(null);

function usePopover(component: string): PopoverContextValue {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error(`${component} must be used within a <Popover>`);
  }
  return context;
}

export interface PopoverProps {
  children: ReactNode;
  /** Controlled open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Initial state when uncontrolled. */
  defaultOpen?: boolean;
  /**
   * `popover` is the anchored panel. `bottom-sheet` presents the content in a
   * draggable sheet instead — better on a small screen, or when the content is
   * a form rather than a menu. Placement, align and the arrow do not apply to a
   * sheet.
   */
  presentation?: PopoverPresentation;
}

function PopoverRoot({
  children,
  open,
  onOpenChange,
  defaultOpen = false,
  presentation = 'popover',
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [trigger, setTrigger] = useState<TriggerRect | null>(null);
  const [placement, setPlacement] = useState<PopoverPlacement>('bottom');
  const [arrowOffset, setArrowOffset] = useState(0);

  const isControlled = open !== undefined;
  const resolvedOpen = isControlled ? open : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const context = useMemo(
    () => ({
      open: resolvedOpen,
      setOpen,
      trigger,
      setTrigger,
      placement,
      setPlacement,
      arrowOffset,
      setArrowOffset,
      presentation,
    }),
    [resolvedOpen, setOpen, trigger, placement, arrowOffset, presentation]
  );

  return <PopoverContext.Provider value={context}>{children}</PopoverContext.Provider>;
}

export interface PopoverTriggerProps {
  children: ReactElement<{ onPress?: (...args: unknown[]) => void }>;
}

/**
 * Wraps its child and toggles the popover on press.
 *
 * The child is wrapped in a view rather than given a ref directly: the ref has
 * to survive whatever the child is — a Button, a plain Pressable, an icon —
 * and only a wrapper we own is guaranteed to be measurable.
 */
function PopoverTrigger({ children }: PopoverTriggerProps) {
  const { open, setOpen, setTrigger } = usePopover('Popover.Trigger');
  const ref = useRef<View>(null);

  const measureThenToggle = (...args: unknown[]) => {
    if (isValidElement(children)) children.props.onPress?.(...args);

    if (open) {
      setOpen(false);
      return;
    }

    // Measured on every open rather than on layout: the trigger may have
    // scrolled since it was laid out, and a stale rect anchors the panel to
    // where the trigger used to be.
    ref.current?.measureInWindow((x, y, width, height) => {
      setTrigger({ x, y, width, height });
      setOpen(true);
    });
  };

  return (
    <View ref={ref} collapsable={false}>
      {isValidElement(children)
        ? cloneElement(children, { onPress: measureThenToggle })
        : children}
    </View>
  );
}

export interface PopoverContentProps extends ViewProps {
  className?: string;
  /** Preferred side of the trigger. Flipped when that side does not fit. */
  placement?: PopoverPlacement;
  /** Where the panel sits along the trigger's other axis. */
  align?: PopoverAlign;
  /** Gap between the trigger and the panel, in pixels. */
  offset?: number;
  /** Nudge along the alignment axis, in pixels. */
  alignOffset?: number;
  /**
   * `content-fit` sizes to the content, `trigger` matches the trigger's width,
   * `full` spans the safe area, and a number is that many pixels.
   */
  width?: number | 'trigger' | 'full' | 'content-fit';
  /** Tap outside the panel closes it. Default true. */
  dismissible?: boolean;
  /**
   * Frost the background behind the panel instead of dimming it. Uses
   * `expo-blur` when installed and falls back to the dimmed scrim when it is
   * not, so it is safe to pass either way.
   */
  blur?: boolean;
  children?: ReactNode;
}

function PopoverContent({
  className,
  placement = 'bottom',
  align = 'center',
  offset = DEFAULT_OFFSET,
  alignOffset = 0,
  width = 'content-fit',
  dismissible = true,
  blur = false,
  children,
  onLayout: onLayoutProp,
  style,
  ...props
}: PopoverContentProps) {
  const context = usePopover('Popover.Content');
  const { open, setOpen, trigger, setPlacement, setArrowOffset, presentation } = context;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  // Panel size changes with its content, so it is re-measured rather than
  // measured once — a popover whose body grows should not stay the old size.
  const onLayout = (event: LayoutChangeEvent) => {
    const { width: w, height: h } = event.nativeEvent.layout;
    setSize((current) =>
      current && Math.abs(current.width - w) < 1 && Math.abs(current.height - h) < 1
        ? current
        : { width: w, height: h }
    );
    onLayoutProp?.(event);
  };

  const bounds = {
    left: insets.left + SCREEN_MARGIN,
    right: screenWidth - insets.right - SCREEN_MARGIN,
    top: insets.top + SCREEN_MARGIN,
    bottom: screenHeight - insets.bottom - SCREEN_MARGIN,
  };

  const resolvedWidth =
    width === 'content-fit'
      ? undefined
      : width === 'trigger'
        ? trigger?.width
        : width === 'full'
          ? bounds.right - bounds.left
          : width;

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
   * here is the frame *before* the panel knows where it goes, so the whole
   * animation would play at the origin, invisibly, and the panel would then
   * snap into place fully formed. Holding the values until a position exists
   * is the only way to have the animation and the correct position both.
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
    appear.value = withTiming(1, { duration: 120 });
    settle.value = withSpring(1, { damping: 18, stiffness: 250, mass: 0.6 });
  }, [placed, reducedMotion, appear, settle]);

  // Starts slightly small and shifted towards the trigger, so the panel
  // appears to unfold from it rather than fade in over it.
  const origin = ENTRY_SHIFT[resolvedPlacement ?? placement];
  const panelStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [
      { translateX: origin.x * (1 - settle.value) },
      { translateY: origin.y * (1 - settle.value) },
      { scale: 0.94 + 0.06 * settle.value },
    ],
  }));

  // The sheet presentation hands off entirely to BottomSheet — it owns its own
  // portal, backdrop and dismiss gesture, so there is nothing to anchor here.
  // The context is re-provided inside so Popover.Close keeps closing it.
  if (presentation === 'bottom-sheet') {
    return (
      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheet.Content dismissible={dismissible} className={className}>
          <PopoverContext.Provider value={context}>{children}</PopoverContext.Provider>
        </BottomSheet.Content>
      </BottomSheet>
    );
  }

  if (!open || !trigger) return null;

  return (
    <Portal>
      {/* Portal content mounts under PortalHost, outside this provider's
          subtree — re-provide the context so Popover.Close and Popover.Arrow
          keep working. */}
      <PopoverContext.Provider value={context}>
        <View className="absolute inset-0">
          {/* A popover does not dim the screen by default — the backdrop is
              there only to catch the outside tap. `blur` opts into a frost. */}
          {blur ? <Scrim blur intensity={20} dimClassName="bg-black/30" /> : null}
          <Pressable
            accessibilityLabel="Close"
            className="absolute inset-0"
            onPress={dismissible ? () => setOpen(false) : undefined}
          />
          {/*
            Two views, not one, and the reason is a Reanimated rule: a layout
            animation and an animated style may not drive the same property on
            the same component, or the layout animation silently wins. The exit
            fade and `panelStyle`'s opacity both want it — so the outer view
            owns the position and the exit, and the inner one owns the entrance
            and the panel's own surface.
          */}
          <Animated.View
            exiting={FadeOut.duration(120)}
            onLayout={onLayout}
            style={{
              position: 'absolute',
              // Until it has measured itself the panel has no honest position,
              // so it is laid out off-screen rather than at the origin — an
              // invisible view at 0,0 still catches taps.
              top: position?.top ?? -9999,
              left: position?.left ?? -9999,
              maxWidth: bounds.right - bounds.left,
              width: resolvedWidth,
            }}
          >
            <Animated.View
              accessibilityViewIsModal
              style={[panelStyle, style]}
              className={cn(
                'gap-1.5 rounded-2xl border border-border bg-popover p-4 shadow-lg',
                className
              )}
              {...props}
            >
              {children}
            </Animated.View>
          </Animated.View>
        </View>
      </PopoverContext.Provider>
    </Portal>
  );
}

export interface PopoverArrowProps extends ViewProps {
  className?: string;
}

/**
 * A small square rotated into a diamond, half-buried under the panel so only
 * the point shows. It needs the panel to have a border for its own two visible
 * edges to line up with — without one it reads as a floating lozenge.
 *
 * It points at the trigger's centre, which the panel resolves and publishes:
 * when `align` shifts the panel off-centre, or a clamp slides it back on
 * screen, the arrow stays over the trigger rather than over the panel's middle.
 */
function PopoverArrow({ className, style, ...props }: PopoverArrowProps) {
  const { trigger, placement, arrowOffset, presentation } = usePopover('Popover.Arrow');
  // A sheet has no trigger edge to point at.
  if (!trigger || presentation === 'bottom-sheet') return null;

  const vertical = placement === 'top' || placement === 'bottom';
  // The arrow sits on the edge facing the trigger, which is the opposite edge
  // to the placement: a panel placed below has its arrow on top.
  const edge = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[placement];

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          position: 'absolute',
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
      // Only the two edges that face outwards are drawn; the other two sit
      // under the panel and would show as a seam across it.
      className={cn(
        'border-border bg-popover',
        placement === 'bottom' && 'border-l border-t',
        placement === 'top' && 'border-b border-r',
        placement === 'right' && 'border-b border-l',
        placement === 'left' && 'border-r border-t',
        className
      )}
      {...props}
    />
  );
}

const PopoverTitle = ({ className, ...props }: TextProps) => (
  <Text
    size="base"
    weight="semibold"
    className={cn('text-popover-foreground', className)}
    {...props}
  />
);
PopoverTitle.displayName = 'Popover.Title';

const PopoverDescription = ({ className, ...props }: TextProps) => (
  <Text size="sm" muted className={className} {...props} />
);
PopoverDescription.displayName = 'Popover.Description';

export interface PopoverCloseProps {
  children: ReactElement<{ onPress?: (...args: unknown[]) => void }>;
}

/** Wraps its child and closes the popover on press. */
function PopoverClose({ children }: PopoverCloseProps) {
  const { setOpen } = usePopover('Popover.Close');
  if (!isValidElement(children)) return children;

  return cloneElement(children, {
    onPress: (...args: unknown[]) => {
      children.props.onPress?.(...args);
      setOpen(false);
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Placement                                                                  */
/* -------------------------------------------------------------------------- */

interface PlaceArgs {
  trigger: TriggerRect;
  size: { width: number; height: number };
  placement: PopoverPlacement;
  align: PopoverAlign;
  offset: number;
  alignOffset: number;
  bounds: { left: number; right: number; top: number; bottom: number };
}

/**
 * Resolves the panel's window position.
 *
 * Two passes, in this order, because they answer different questions: the flip
 * picks a *side* and only fires when the preferred one genuinely has less room
 * than its opposite; the clamp then slides the panel along the other axis to
 * keep it on screen. Doing the clamp first would let a panel be nudged inside
 * the bounds and so look like it fits, hiding the fact that the wrong side was
 * chosen.
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
    // `max < min` when the panel is wider than the space it has; pinning to the
    // start edge at least keeps its beginning readable.
    Math.max(min, Math.min(value, Math.max(min, max)));

  // The arrow points at the trigger's centre, not the panel's — those differ
  // whenever `align` is not center, or the panel was clamped inside the screen.
  // It is expressed relative to the panel origin and clamped so it can never
  // slide off the panel edge.
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
 * Where the panel starts, relative to where it ends: towards the trigger, on
 * whichever side was resolved. A preset like `ZoomIn` always grows from the
 * centre, which reads the same whichever way the panel opened.
 */
const ENTRY_SHIFT: Record<PopoverPlacement, { x: number; y: number }> = {
  bottom: { x: 0, y: -8 },
  top: { x: 0, y: 8 },
  right: { x: -8, y: 0 },
  left: { x: 8, y: 0 },
};

export const Popover = Object.assign(PopoverRoot, {
  Trigger: PopoverTrigger,
  Content: PopoverContent,
  Arrow: PopoverArrow,
  Title: PopoverTitle,
  Description: PopoverDescription,
  Close: PopoverClose,
});
