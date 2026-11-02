/**
 * Tour — the walkthrough that introduces a screen one control at a time.
 *
 * An empty state explains a screen before there is anything on it; a tour
 * explains it once there is. It dims everything, cuts a hole around one control
 * and puts a card beside it, then moves the hole to the next control. What
 * makes that work is the hole: a caption alone has to describe where to look,
 * and "the button at the top right" is a sentence people read twice and still
 * get wrong.
 *
 * ```tsx
 * <Tour open={onboarding} onOpenChange={setOnboarding}>
 *   <Tour.Step order={0} title="Your library" description="Everything you save lands here.">
 *     <IconButton icon={<BookmarkIcon />} onPress={openLibrary} />
 *   </Tour.Step>
 *
 *   <Tour.Step order={1} title="Start writing" description="A new note, from anywhere." shape="circle">
 *     <Fab icon={<PlusIcon />} onPress={compose} />
 *   </Tour.Step>
 * </Tour>
 * ```
 *
 * A step wraps the control it is about, so the two live together in the tree
 * and cannot drift apart — a step whose target has been deleted goes with it
 * rather than pointing at empty space. `order` is what puts the steps in a
 * sequence, and it is the author's numbering rather than the tree's, because a
 * walkthrough usually crosses a header, a list and a tab bar in an order the
 * layout knows nothing about.
 *
 * The target is measured in window coordinates each time its step becomes
 * current, and again when the window changes size — a rect measured in portrait
 * describes nothing after a rotation, and a spotlight in the wrong place is
 * worse than none. A target that has scrolled out of view is the one case this
 * cannot fix by itself: bring it back with `onStepChange`, which fires with the
 * step about to be shown.
 *
 * The hole is one path with an even-odd fill — the screen rectangle and the
 * cutout in a single `d`, animated on the UI thread — rather than four views
 * arranged around a gap. Four views cannot have rounded corners between them,
 * and the corner is most of what makes the hole read as *this control* instead
 * of as a rectangle that happens to contain it.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type ViewProps,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { ChevronLeftIcon, XIcon } from '../../icons';
import { useBackHandler } from '../../hooks/use-back-handler';
import { Portal } from '../../primitives/portal';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { Button } from '../button';
import {
  currentTourCardHeight,
  nextTourCardMeasurement,
  type TourCardMeasurement,
} from './tour-card-measurement';
import type { ViewRef } from '../../primitives/refs';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Room left between the cutout and the target inside it. */
const DEFAULT_PADDING = 8;
/** Corner radius of a rectangular cutout. */
const DEFAULT_RADIUS = 12;
/** Gap between the cutout and the card. */
const CARD_OFFSET = 12;
/** Smallest gap allowed between the card and the edge of the safe area. */
const SCREEN_MARGIN = 16;
/** Ceiling on the card's width, so it does not run edge to edge on a tablet. */
const MAX_CARD_WIDTH = 420;
/** How the spotlight travels from one target to the next. */
const SPRING = { damping: 20, stiffness: 180, mass: 0.6 };
/** The dim laid over everything outside the cutout. */
const DEFAULT_OVERLAY = 'rgba(0, 0, 0, 0.66)';

export type TourShape = 'rect' | 'circle';
export type TourPlacement = 'top' | 'bottom' | 'auto';

/** The words on the card's controls, for a tour that is not in English. */
export interface TourLabels {
  next?: string;
  back?: string;
  done?: string;
  skip?: string;
  close?: string;
}

const DEFAULT_LABELS: Required<TourLabels> = {
  next: 'Next',
  back: 'Back',
  done: 'Done',
  skip: 'Skip',
  close: 'End tour',
};

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * One step as the root sees it: what to draw the hole around, and what to say
 * about it. The ref rather than a measured rect, because a rect taken at
 * registration is stale by the time the step comes up.
 */
interface TourStepEntry {
  order: number;
  title?: string;
  description?: string;
  shape?: TourShape;
  padding?: number;
  radius?: number;
  placement?: TourPlacement;
  target: RefObject<ViewRef | null>;
}

interface TourContextValue {
  register: (entry: TourStepEntry) => void;
  unregister: (entry: TourStepEntry) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

function useTour(component: string): TourContextValue {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error(`${component} must be used within a <Tour>`);
  }
  return context;
}

/**
 * The screen with a rounded rectangle taken out of it, as one path.
 *
 * Two subpaths and `fillRule="evenodd"`: the outer one covers the screen, the
 * inner one falls inside it, and even-odd makes the overlap a hole regardless
 * of which way either is wound. That last part is why the inner rectangle is
 * written in the natural direction rather than reversed — the winding is not
 * load-bearing, and a reversed path is the kind of thing that gets tidied up
 * by someone who cannot see why it was backwards.
 */
function cutoutPath(
  screenWidth: number,
  screenHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): string {
  'worklet';
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const right = x + width;
  const bottom = y + height;

  return (
    `M0 0H${screenWidth}V${screenHeight}H0Z ` +
    `M${x + r} ${y}` +
    `H${right - r}A${r} ${r} 0 0 1 ${right} ${y + r}` +
    `V${bottom - r}A${r} ${r} 0 0 1 ${right - r} ${bottom}` +
    `H${x + r}A${r} ${r} 0 0 1 ${x} ${bottom - r}` +
    `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  );
}

/**
 * The target's bounds grown into the shape the hole will take.
 *
 * A circle is squared around the target's centre rather than drawn inside its
 * bounds, because the controls that want one — an avatar, a floating action
 * button — are square already, and squaring off the longer side is what keeps
 * a hole round instead of letting it collapse to a slot.
 */
function spotlightFor(
  rect: Rect,
  shape: TourShape,
  padding: number,
  radius: number
): Rect & { radius: number } {
  if (shape === 'circle') {
    const diameter = Math.max(rect.width, rect.height) + padding * 2;
    return {
      x: rect.x + rect.width / 2 - diameter / 2,
      y: rect.y + rect.height / 2 - diameter / 2,
      width: diameter,
      height: diameter,
      radius: diameter / 2,
    };
  }

  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
    radius,
  };
}

export interface TourProps {
  children?: ReactNode;
  /** Whether the walkthrough is running. */
  open?: boolean;
  /** Whether it is running when uncontrolled. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * The current step's `order`, controlled. Note that this is the author's
   * numbering and not a position in the sequence — the two differ as soon as a
   * step is conditional.
   */
  step?: number;
  /** Where an uncontrolled tour starts. Defaults to the lowest `order`. */
  defaultStep?: number;
  /**
   * Fires with the `order` about to be shown, before it is. This is where a
   * target inside a scroller is brought back into view: the step is measured
   * on the next frame, so a `scrollTo` issued here lands first.
   */
  onStepChange?: (step: number) => void;
  /** The last step was acknowledged. */
  onFinish?: () => void;
  /** The tour was ended early — the skip control, the backdrop, or Android back. */
  onSkip?: () => void;
  /** Room left around every target, in pixels. 8 by default. A step may override it. */
  padding?: number;
  /** Corner radius of a rectangular cutout, in pixels. 12 by default. A step may override it. */
  radius?: number;
  /** Shape of every cutout. A step may override it. */
  shape?: TourShape;
  /**
   * Which side of the target the card prefers. `auto` puts it below when below
   * fits and above when it does not, which is the only behaviour that survives
   * a target near an edge.
   */
  placement?: TourPlacement;
  /** Ending the tour by pressing the dimmed area, or Android back. Default true. */
  dismissible?: boolean;
  /** Show "2 of 5" above the step's title. Default true. */
  showProgress?: boolean;
  /** Show the skip control. Default true. */
  showSkip?: boolean;
  /**
   * Leave the spotlit control pressable.
   *
   * Off by default: a tour is usually read rather than used, and a control that
   * reacts under the dim invites people to start doing the thing before they
   * have been told what it does. Turn it on for the walkthrough that asks you
   * to try the step — the target keeps its own `onPress`, so advancing the tour
   * from it is the app's call.
   */
  interactive?: boolean;
  /**
   * The dim laid over everything outside the cutout. Black at 66% by default —
   * dark enough that the hole reads as the only lit thing, light enough that
   * the screen behind it is still recognisable as the screen you were on.
   */
  overlayColor?: string;
  /** The words on the card's controls. */
  labels?: TourLabels;
  /** Extra classes for the card. */
  cardClassName?: string;
}

function TourRoot({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  step,
  defaultStep,
  onStepChange,
  onFinish,
  onSkip,
  padding = DEFAULT_PADDING,
  radius = DEFAULT_RADIUS,
  shape = 'rect',
  placement = 'auto',
  dismissible = true,
  showProgress = true,
  showSkip = true,
  interactive = false,
  overlayColor = DEFAULT_OVERLAY,
  labels,
  cardClassName,
}: TourProps) {
  const [steps, setSteps] = useState<TourStepEntry[]>([]);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [internalStep, setInternalStep] = useState<number | null>(defaultStep ?? null);

  const isOpenControlled = open !== undefined;
  const isStepControlled = step !== undefined;
  const resolvedOpen = isOpenControlled ? open : internalOpen;

  const words = { ...DEFAULT_LABELS, ...labels };

  /*
   * Steps sort themselves by `order` rather than arriving in it, because the
   * tree decides when each one mounts and a tour that crosses a header, a list
   * and a tab bar mounts them in whatever order those render.
   */
  const register = useCallback((entry: TourStepEntry) => {
    setSteps((current) =>
      [...current.filter((other) => other.order !== entry.order), entry].sort(
        (a, b) => a.order - b.order
      )
    );
  }, []);

  const unregister = useCallback((entry: TourStepEntry) => {
    setSteps((current) => current.filter((other) => other !== entry));
  }, []);

  const context = useMemo(() => ({ register, unregister }), [register, unregister]);

  const activeOrder = isStepControlled ? step : (internalStep ?? steps[0]?.order ?? null);
  const index = steps.findIndex((entry) => entry.order === activeOrder);
  const active = index >= 0 ? steps[index] : undefined;
  const isFirst = index <= 0;
  const isLast = index === steps.length - 1;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isOpenControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isOpenControlled, onOpenChange]
  );

  const goTo = useCallback(
    (order: number) => {
      onStepChange?.(order);
      if (!isStepControlled) setInternalStep(order);
    },
    [isStepControlled, onStepChange]
  );

  // Reopening starts the tour over rather than resuming where it was ended.
  // Somebody who dismissed a walkthrough and asked for it again wants it from
  // the top; resuming a half-read tour is a state nobody asked to be in.
  useEffect(() => {
    if (resolvedOpen && !isStepControlled) setInternalStep(defaultStep ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedOpen]);

  const finish = useCallback(() => {
    setOpen(false);
    onFinish?.();
  }, [setOpen, onFinish]);

  const skip = useCallback(() => {
    setOpen(false);
    onSkip?.();
  }, [setOpen, onSkip]);

  const next = useCallback(() => {
    const following = steps[index + 1];
    if (following) goTo(following.order);
    else finish();
  }, [steps, index, goTo, finish]);

  const back = useCallback(() => {
    const previous = steps[index - 1];
    if (previous) goTo(previous.order);
  }, [steps, index, goTo]);

  useBackHandler(resolvedOpen && dismissible, skip);

  return (
    <TourContext.Provider value={context}>
      {children}
      {resolvedOpen && steps.length > 0 ? (
        <Portal>
          <TourOverlay
            active={active}
            index={index}
            total={steps.length}
            isFirst={isFirst}
            isLast={isLast}
            padding={padding}
            radius={radius}
            shape={shape}
            placement={placement}
            dismissible={dismissible}
            showProgress={showProgress}
            showSkip={showSkip}
            interactive={interactive}
            overlayColor={overlayColor}
            words={words}
            cardClassName={cardClassName}
            onNext={next}
            onBack={back}
            onSkip={skip}
          />
        </Portal>
      ) : null}
    </TourContext.Provider>
  );
}

interface TourOverlayProps {
  active: TourStepEntry | undefined;
  index: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
  padding: number;
  radius: number;
  shape: TourShape;
  placement: TourPlacement;
  dismissible: boolean;
  showProgress: boolean;
  showSkip: boolean;
  interactive: boolean;
  overlayColor: string;
  words: Required<TourLabels>;
  cardClassName?: string;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

function TourOverlay({
  active,
  index,
  total,
  isFirst,
  isLast,
  padding,
  radius,
  shape,
  placement,
  dismissible,
  showProgress,
  showSkip,
  interactive,
  overlayColor,
  words,
  cardClassName,
  onNext,
  onBack,
  onSkip,
}: TourOverlayProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [spot, setSpot] = useState<(Rect & { radius: number }) | null>(null);
  const [cardMeasurement, setCardMeasurement] = useState<TourCardMeasurement | null>(
    null
  );
  const cardHeight = currentTourCardHeight(active, cardMeasurement);

  const stepPadding = active?.padding ?? padding;
  const stepRadius = active?.radius ?? radius;
  const stepShape = active?.shape ?? shape;

  /*
   * Measured when the step becomes current and again whenever the window
   * changes size. The second half is the part that is easy to leave out and
   * impossible to miss once it is wrong: a rect taken in portrait describes
   * nothing after a rotation, and the hole ends up over the wrong half of a
   * screen the target is no longer on.
   */
  useEffect(() => {
    const target = active?.target.current;
    if (!target) {
      setSpot(null);
      return;
    }

    let cancelled = false;
    // A frame late on purpose: a step whose target was just scrolled back into
    // view is measured where it lands, not where it was leaving.
    const frame = requestAnimationFrame(() => {
      target.measureInWindow((x, y, width, height) => {
        if (cancelled || (width === 0 && height === 0)) return;
        setSpot(
          spotlightFor({ x, y, width, height }, stepShape, stepPadding, stepRadius)
        );
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [active, stepShape, stepPadding, stepRadius, screenWidth, screenHeight]);

  /*
   * The hole's geometry lives on the UI thread so travelling between two
   * targets is one spring rather than a state update per frame. `settled`
   * distinguishes the first target — which appears where it belongs — from
   * every later one, which slides there.
   */
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const cornerRadius = useSharedValue(0);
  const settled = useSharedValue(false);

  useEffect(() => {
    // A step with nothing to point at collapses the hole rather than leaving
    // the last one open: the previous target is no longer what is being talked
    // about, and a hole over it says it is.
    if (!spot) {
      width.value = 0;
      height.value = 0;
      settled.value = false;
      return;
    }

    const animate = settled.value && !reducedMotion;
    const to = (value: typeof x, next: number) => {
      value.value = animate ? withSpring(next, SPRING) : next;
    };

    to(x, spot.x);
    to(y, spot.y);
    to(width, spot.width);
    to(height, spot.height);
    to(cornerRadius, spot.radius);
    settled.value = true;
  }, [spot, reducedMotion, x, y, width, height, cornerRadius, settled]);

  const pathProps = useAnimatedProps(() => ({
    d: cutoutPath(
      screenWidth,
      screenHeight,
      x.value,
      y.value,
      width.value,
      height.value,
      cornerRadius.value
    ),
  }));

  /*
   * A step with no measurable target — a welcome card, or one whose control has
   * gone — gets no hole and a card in the middle of the screen. Dimming the
   * whole screen and saying nothing about where to look is honest; cutting a
   * hole at the origin is not.
   */
  const card = cardFrame({
    spot,
    cardHeight,
    placement: active?.placement ?? placement,
    screenWidth,
    screenHeight,
    insets,
  });

  const onCardLayout = (event: LayoutChangeEvent) => {
    const measured = event.nativeEvent.layout.height;
    setCardMeasurement((current) =>
      nextTourCardMeasurement(active, measured, current)
    );
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/*
        The dim is one path with a hole in it and takes no touches, so what
        handles them is the layer under it. That layer is a full-screen
        Pressable normally and a ring of four around the cutout when the target
        is meant to stay usable — the hole is the gap between them, which is
        the only way to leave a rectangle of the screen pressable.
      */}
      <TourBackdrop
        interactive={interactive}
        dismissible={dismissible}
        spot={spot}
        screenWidth={screenWidth}
        screenHeight={screenHeight}
        onDismiss={onSkip}
      />

      <Animated.View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        entering={reducedMotion ? undefined : FadeIn.duration(180)}
        exiting={reducedMotion ? undefined : FadeOut.duration(140)}
      >
        <Svg width={screenWidth} height={screenHeight}>
          <AnimatedPath
            animatedProps={pathProps}
            fill={overlayColor}
            fillRule="evenodd"
          />
        </Svg>
      </Animated.View>

      {/*
       * Two views, and the split is not cosmetic. The entering animation
       * drives opacity, and so does the gate below that hides the card for the
       * frame it is being measured in — put on one view they fight, and
       * Reanimated says so: a layout animation may overwrite a property the
       * style also sets, and which of them wins is not something to rely on.
       * The outer view owns the animation and the placement; the inner one
       * owns the measurement and the gate.
       */}
      <Animated.View
        key={active?.order ?? 'none'}
        entering={reducedMotion ? undefined : FadeIn.duration(200)}
        style={{
          position: 'absolute',
          left: card.left,
          top: card.top,
          width: card.width,
        }}
      >
        <View
          onLayout={onCardLayout}
          accessibilityViewIsModal
          accessibilityLiveRegion="polite"
          style={{
            // Held off the first frame's opacity rather than off the screen:
            // the card has to be laid out to be measured, and its height is
            // what decides whether it goes above the target or below it.
            opacity: cardHeight === null ? 0 : 1,
          }}
          className={cn(
            'gap-3 rounded-2xl border border-border bg-overlay p-4 shadow-lg',
            cardClassName
          )}
        >
          {dismissible ? (
            <Button
              variant="ghost"
              size="icon"
              accessibilityLabel={words.close}
              onPress={onSkip}
              className="absolute end-1 top-1 h-9 w-9"
            >
              <XIcon size={16} />
            </Button>
          ) : null}

          <View className="gap-1 pe-8">
            {showProgress && total > 1 && index >= 0 ? (
              <Text
                size="xs"
                muted
                accessibilityLabel={`Step ${index + 1} of ${total}`}
              >{`${index + 1} of ${total}`}</Text>
            ) : null}
            {active?.title ? (
              <Text
                accessibilityRole="header"
                weight="semibold"
                className="text-overlay-foreground"
              >
                {active.title}
              </Text>
            ) : null}
            {active?.description ? (
              <Text size="sm" muted>
                {active.description}
              </Text>
            ) : null}
          </View>

          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-row items-center gap-1">
              {showSkip && !isLast ? (
                <Button variant="ghost" size="sm" onPress={onSkip}>
                  {words.skip}
                </Button>
              ) : null}
            </View>

            <View className="flex-row items-center gap-2">
              {!isFirst ? (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={onBack}
                  startContent={<ChevronLeftIcon size={16} />}
                >
                  {words.back}
                </Button>
              ) : null}
              <Button variant="primary" size="sm" onPress={onNext}>
                {isLast ? words.done : words.next}
              </Button>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

/**
 * Where the card goes, given the hole and the card's own height.
 *
 * Below the target when below fits, above it when it does not, and centred on
 * the screen when there is no target at all. The card is as wide as the safe
 * area allows up to a ceiling, because a card narrower than that on a phone
 * only means a shorter line length and one more thing to get wrong.
 */
function cardFrame({
  spot,
  cardHeight,
  placement,
  screenWidth,
  screenHeight,
  insets,
}: {
  spot: Rect | null;
  cardHeight: number | null;
  placement: TourPlacement;
  screenWidth: number;
  screenHeight: number;
  insets: { top: number; bottom: number; left: number; right: number };
}): { left: number; top: number; width: number } {
  const minX = insets.left + SCREEN_MARGIN;
  const maxX = screenWidth - insets.right - SCREEN_MARGIN;
  const width = Math.min(maxX - minX, MAX_CARD_WIDTH);
  const left = minX + (maxX - minX - width) / 2;

  const minY = insets.top + SCREEN_MARGIN;
  const maxY = screenHeight - insets.bottom - SCREEN_MARGIN;
  const height = cardHeight ?? 0;

  if (!spot) {
    return { left, top: Math.max(minY, (screenHeight - height) / 2), width };
  }

  const below = spot.y + spot.height + CARD_OFFSET;
  const above = spot.y - CARD_OFFSET - height;
  const fitsBelow = below + height <= maxY;
  const fitsAbove = above >= minY;

  const goBelow =
    placement === 'bottom'
      ? fitsBelow || !fitsAbove
      : placement === 'top'
        ? !fitsAbove
        : fitsBelow;

  // Neither side fits — a target taller than the room around it. Clamping keeps
  // the card on screen and lets it overlap the dim rather than the other way
  // round, which is the lesser of the two failures.
  const top = goBelow ? Math.min(below, maxY - height) : Math.max(above, minY);

  return { left, top: Math.max(minY, top), width };
}

/**
 * The layer that takes the touches the dim does not.
 *
 * One Pressable over everything, or four around the cutout when the target has
 * to stay usable. Four rather than one with a hole, because a view cannot have
 * a hole — the gap between them is the hole, and it is the only construction
 * that leaves a rectangle of the screen reachable.
 */
function TourBackdrop({
  interactive,
  dismissible,
  spot,
  screenWidth,
  screenHeight,
  onDismiss,
}: {
  interactive: boolean;
  dismissible: boolean;
  spot: Rect | null;
  screenWidth: number;
  screenHeight: number;
  onDismiss: () => void;
}) {
  const blocking = { onStartShouldSetResponder: () => true };
  const press = dismissible
    ? { onStartShouldSetResponder: () => true, onResponderRelease: onDismiss }
    : blocking;

  if (!interactive || !spot) {
    return <View style={StyleSheet.absoluteFill} {...press} />;
  }

  const bottom = spot.y + spot.height;
  const right = spot.x + spot.width;

  return (
    <>
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          height: Math.max(0, spot.y),
        }}
        {...press}
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: bottom,
          right: 0,
          height: Math.max(0, screenHeight - bottom),
        }}
        {...press}
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: spot.y,
          width: Math.max(0, spot.x),
          height: spot.height,
        }}
        {...press}
      />
      <View
        style={{
          position: 'absolute',
          left: right,
          top: spot.y,
          width: Math.max(0, screenWidth - right),
          height: spot.height,
        }}
        {...press}
      />
    </>
  );
}

export interface TourStepProps extends Omit<ViewProps, 'children'> {
  /**
   * Where this step falls in the walkthrough. The author's numbering rather
   * than the tree's, and unique within a tour — two steps sharing an order
   * means one of them replaces the other.
   */
  order: number;
  /** The step's heading. */
  title?: string;
  /** The sentence under it. */
  description?: string;
  /** Shape of this step's cutout, overriding the tour's. */
  shape?: TourShape;
  /** Room around this target, overriding the tour's. */
  padding?: number;
  /** Corner radius of this cutout, overriding the tour's. */
  radius?: number;
  /** Which side of this target the card prefers, overriding the tour's. */
  placement?: TourPlacement;
  className?: string;
  /** The control this step is about. */
  children?: ReactNode;
}

/**
 * Wraps the control a step is about, and is what gets measured.
 *
 * The child is wrapped in a view rather than handed a ref, because the ref has
 * to survive whatever the child is — a button, a card, a tab bar — and only a
 * wrapper we own is guaranteed to be measurable. That wrapper is a plain view
 * with no sizing of its own, so it takes the width its parent gives it: put
 * layout classes on the step rather than on the child, the way you would on any
 * other view in that position.
 *
 * It renders its child and nothing else while the tour is closed, and stays
 * mounted either way — a step is a description of a control that is already on
 * the screen, not something that appears with the walkthrough.
 */
function TourStep({
  order,
  title,
  description,
  shape,
  padding,
  radius,
  placement,
  className,
  children,
  ...props
}: TourStepProps) {
  const { register, unregister } = useTour('Tour.Step');
  const target = useRef<ViewRef>(null);

  const entry = useMemo<TourStepEntry>(
    () => ({
      order,
      title,
      description,
      shape,
      padding,
      radius,
      placement,
      target,
    }),
    [order, title, description, shape, padding, radius, placement]
  );

  useEffect(() => {
    register(entry);
    return () => unregister(entry);
  }, [entry, register, unregister]);

  return (
    <View ref={target} collapsable={false} className={className} {...props}>
      {children}
    </View>
  );
}
TourStep.displayName = 'Tour.Step';

TourRoot.displayName = 'Tour';

export const Tour = Object.assign(TourRoot, {
  Step: TourStep,
});
