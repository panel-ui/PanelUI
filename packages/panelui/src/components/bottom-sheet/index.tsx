import {
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewProps,
} from 'react-native';
import { useCSSVariable } from 'uniwind';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  FadeIn,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useComposedEventHandler,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tv } from 'tailwind-variants';
import { NativeHost, getComposeModifiers, getNativeUI, getSwiftUIModifiers } from '../../native';
import { XIcon } from '../../icons';
import { ModalPortal } from '../../primitives/portal';
import { Scrim } from '../../primitives/scrim';
import { Text, textChildren } from '../../primitives/text';
import { useBackHandler } from '../../hooks/use-back-handler';
import { cn } from '../../utils/cn';
import { impactKnock } from '../../utils/haptics';

/**
 * One spring for the whole surface, in Apple's two designer parameters rather
 * than mass/stiffness/damping — the sheet arriving, the sheet snapping back and
 * the sheet leaving used to be three slightly different springs, which is three
 * different weights for one object.
 *
 * A little under critically damped, so it settles without a bounce. A sheet
 * that overshoots reads as light, and a sheet is not light.
 *
 * Slower than the 300ms a small state change gets, and deliberately. This is a
 * large surface travelling most of the screen, and it is the same category of
 * movement as a screen transition rather than as a toggle — the platform's own
 * sheets are slower still. Taken at toggle speed it arrives before the eye has
 * followed it, which reads as a jump-cut to a different screen rather than as
 * something coming up from the bottom.
 */
const SPRING = { duration: 420, dampingRatio: 0.9 } as const;

/**
 * Leaving, where the far side of the travel is off screen: clamped, because a
 * spring allowed to overshoot past the bottom flashes a gap under the sheet on
 * its way back.
 */
const EXIT_SPRING = { duration: 380, dampingRatio: 1, overshootClamping: true } as const;

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;

/**
 * Where a flick would come to rest if it kept decelerating — Apple's
 * exponential-decay form.
 *
 * Distance alone makes the sheet heavy: a short fast flick downward is
 * unmistakably a dismissal, and asking it to also travel 120 points first means
 * the reader has to throw the sheet twice.
 */
function project(velocity: number): number {
  'worklet';
  const decelerationRate = 0.998;
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

const sheetVariants = tv({
  base: 'border border-border bg-popover px-5 pt-2 shadow-lg',
  variants: {
    detached: {
      // Docked: the sheet is continuous with the bottom of the screen, so the
      // bottom edge is not a real edge and drawing a line along it would be a
      // rule through the middle of nothing.
      false: 'rounded-t-3xl border-b-0',
      // Floating: all four edges are real, so all four are drawn and all four
      // corners are rounded.
      true: 'mx-4 mb-6 rounded-3xl',
    },
  },
  defaultVariants: {
    detached: false,
  },
});

interface BottomSheetContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const BottomSheetContext = createContext<BottomSheetContextValue | null>(null);

function useBottomSheet(component: string): BottomSheetContextValue {
  const context = useContext(BottomSheetContext);
  if (!context) {
    throw new Error(`${component} must be used within a <BottomSheet>`);
  }
  return context;
}

export interface BottomSheetProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  /**
   * Present the platform's own sheet instead of this one, so it gets the
   * system's detents, scroll interaction and dismiss gesture. Requires the
   * optional `@expo/ui` package; without it this prop does nothing.
   *
   * **Theme tokens do not apply to the sheet chrome** — the platform draws the
   * container, so `BottomSheet.Content`'s `className` and its drag handle are
   * ignored. The content inside is still yours.
   */
  native?: boolean;
  /**
   * Heights the native sheet can rest at. Omit to size to the content.
   * `{ fraction }` and `{ height }` are iOS-only; Android snaps them to the
   * nearest of `half` / `full`.
   */
  snapPoints?: ('half' | 'full' | { fraction: number } | { height: number })[];
  /**
   * Paint the native sheet a solid colour instead of the material the platform
   * draws it in by default.
   *
   * The platform's sheet is translucent — on iOS 26 that is Liquid Glass — and
   * what is behind it shows through. That is right for a sheet laid over
   * content worth glimpsing and wrong for one that is a surface of the app's
   * own, where the app's ground shifting under it reads as a mistake.
   *
   * `true` uses the theme's popover surface, so the sheet matches the rest of
   * the app in both schemes. A string paints that colour exactly.
   *
   * It only reaches the platform's sheet, so it does nothing without `native`.
   * On iOS below 16.4 the sheet keeps its material.
   */
  nativeBackground?: boolean | string;
}

/**
 * Roughly how tall the platform will make the sheet at a given detent, as a
 * fraction of the screen. Approximate on purpose — it is used as a floor for
 * the content, not as the sheet's real height, which the platform owns.
 */
const DETENT_FRACTION = { half: 0.5, full: 0.9 } as const;

/**
 * How long to treat a dismissal *we* asked for as still in flight.
 *
 * A timer, because there is nothing to wait on. The platform reports a
 * dismissal the reader performed — that report is the binding writing its new
 * value back — but not one we asked for, where the binding already holds the
 * value it would have written and the change is suppressed at the source. So
 * the only sheet whose departure can be observed is the one we did not ask to
 * leave.
 *
 * Comfortably past the system's own sheet transition, since the cost of being
 * late is a present held a little longer than it needed to be, and the cost of
 * being early is the platform dropping it and no sheet at all.
 */
const NATIVE_DISMISS_MS = 400;

/**
 * The height the content should at least fill for a given set of detents.
 *
 * Without this the hosted content sizes to itself and the platform centres
 * that smaller box inside the taller sheet, which is why a short sheet shows
 * its content floating in the middle. Filling the detent leaves nothing to
 * centre, so the content sits where it was written: at the top.
 *
 * Exported because a floor is not always enough. Content that is a *column* —
 * a list between a header and a composer — needs a definite height above it
 * before anything in it can be `flex-1`, and a minimum is not definite: the
 * list sizes to its own rows instead and pushes the composer off the bottom of
 * the sheet. Anything building that shape asks for the same number here rather
 * than working out the platform's detents a second time and disagreeing.
 */
export function bottomSheetDetentHeight(
  snapPoints: BottomSheetProps['snapPoints'],
  screenHeight: number
): number | undefined {
  if (!snapPoints?.length) return undefined;

  // The sheet opens at its first detent, so that is the one to fill.
  const first = snapPoints[0];
  if (first === 'half' || first === 'full') {
    return screenHeight * DETENT_FRACTION[first];
  }
  if (typeof first === 'object' && 'fraction' in first) {
    return screenHeight * first.fraction;
  }
  if (typeof first === 'object' && 'height' in first) return first.height;
  return undefined;
}

/**
 * The modifier that paints a native sheet's own surface, for whichever toolkit
 * is drawing it — or nothing, where neither is reachable.
 *
 * A sheet's surface is not the background of anything hosted in it. The
 * grabber's strip at the top and the safe-area inset at the bottom are the
 * sheet's own chrome, and a colour put behind the content stops short of both
 * of them — so the sheet arrives two-tone, and shifts as it moves between
 * detents. These two reach the surface itself.
 *
 * The toolkits do not share a vocabulary, so the question is asked of each in
 * its own terms rather than one answer being sent to both.
 */
function nativeSheetSurface(color: string): unknown[] | undefined {
  const swiftUI = getSwiftUIModifiers();
  if (swiftUI) return [swiftUI.presentationBackground(color)];

  const compose = getComposeModifiers();
  if (compose) return [compose.background(color)];

  return undefined;
}

/**
 * Set by the root so Content knows the platform is drawing the sheet, and with
 * which detents. Null means the styled sheet renders.
 */
const NativeSheetContext = createContext<{
  nativeUI: NonNullable<ReturnType<typeof getNativeUI>>;
  snapPoints: BottomSheetProps['snapPoints'];
  background: BottomSheetProps['nativeBackground'];
} | null>(null);

/**
 * The wiring between the sheet's drag and a scrolling body inside it. Set by
 * `Content`, filled in by `Body` — the two gestures have to agree on where the
 * list is scrolled to before either can decide whose drag it is.
 */
/*
 * Taken off the factory rather than imported by name: the package exports two
 * different `NativeGesture` types, and the one reachable from its entry point
 * is not the one `Gesture.Native()` returns.
 */
type ScrollGesture = ReturnType<typeof Gesture.Native>;

const SheetSurfaceContext = createContext<{
  scrollGesture: ScrollGesture;
  scrollOffset: SharedValue<number>;
  hasScrollable: SharedValue<boolean>;
} | null>(null);

function BottomSheetRoot({
  children,
  open,
  onOpenChange,
  defaultOpen = false,
  native,
  snapPoints,
  nativeBackground,
}: BottomSheetProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
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
    () => ({ open: resolvedOpen, setOpen }),
    [resolvedOpen, setOpen]
  );

  const nativeUI = native ? getNativeUI() : null;
  const nativeSheet = useMemo(
    () => (nativeUI ? { nativeUI, snapPoints, background: nativeBackground } : null),
    [nativeBackground, nativeUI, snapPoints]
  );

  return (
    <BottomSheetContext.Provider value={context}>
      <NativeSheetContext.Provider value={nativeSheet}>
        {children}
      </NativeSheetContext.Provider>
    </BottomSheetContext.Provider>
  );
}

interface BottomSheetTriggerProps {
  children: ReactElement<{ onPress?: (...args: unknown[]) => void }>;
}

function BottomSheetTrigger({ children }: BottomSheetTriggerProps) {
  const { setOpen } = useBottomSheet('BottomSheet.Trigger');
  if (!isValidElement(children)) return children;

  return cloneElement(children, {
    onPress: (...args: unknown[]) => {
      children.props.onPress?.(...args);
      setOpen(true);
    },
  });
}

export interface BottomSheetContentProps extends ViewProps {
  className?: string;
  /** Tap on the backdrop closes the sheet. Default true. */
  dismissible?: boolean;
  /**
   * Show a close button in the top trailing corner — the right in a
   * left-to-right app, the left in a right-to-left one. On by default for the
   * styled sheet; ignored by the native sheet, which has its own dismiss
   * affordances.
   */
  showClose?: boolean;
  /**
   * Show the drag handle at the top of the sheet. On by default, because a
   * sheet that can be dragged should say so.
   *
   * Turn it off when the sheet draws its own — a component wrapping this one
   * to give the surface a material of its own has to put the handle on that
   * material, and a handle floating above it belongs to nothing.
   */
  showGrabber?: boolean;
  /**
   * Float the sheet clear of the screen edges instead of docking it to the
   * bottom, so it reads as a card laid over the app rather than a drawer
   * pulled out of it. All four corners round and the bottom border comes back,
   * since a floating sheet has four real edges where a docked one has three.
   * Ignored by the native sheet, which the platform positions itself.
   */
  detached?: boolean;
  /**
   * Frost the screen behind the sheet instead of dimming it, so what is behind
   * stays legible as shape and colour while losing its detail. Needs the
   * optional `expo-blur`; without it this dims, rather than failing.
   *
   * Someone who has Reduce Transparency switched on gets an opaque
   * backdrop instead, which is the whole point of the setting.
   */
  blur?: boolean;
  /**
   * How tall the sheet opens.
   *
   * `auto` sizes to the content, which is right for a sheet that is a handful
   * of rows. `half` and `full` fix the height instead, for content that has to
   * be given the room rather than allowed to ask for it — a list, a form, a
   * document. Either way the sheet is clamped to leave the status bar clear,
   * so `full` is as tall as the screen allows rather than as tall as the screen.
   *
   * On the native sheet this maps onto the platform's detents.
   */
  size?: 'auto' | 'half' | 'full';
  children?: ReactNode;
}

/**
 * Fractions of the screen the sized sheets aim for. `full` is not 1: a sheet
 * that reached the top would have nothing behind it to read as laid *over*,
 * and the gap is what says the app is still there underneath.
 */
const SIZE_FRACTION = { half: 0.5, full: 0.94 } as const;

function BottomSheetContent({
  className,
  dismissible = true,
  showClose = true,
  showGrabber = true,
  detached = false,
  blur = false,
  size = 'auto',
  children,
  ...props
}: BottomSheetContentProps) {
  const context = useBottomSheet('BottomSheet.Content');
  const { open, setOpen } = context;
  const nativeSheet = useContext(NativeSheetContext);
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  /*
   * Starts off screen, and the entrance is this value moving to zero.
   *
   * It used to start at rest and hand the travel to a `SlideInDown` layout
   * animation, which is a different mechanism with a different owner: the
   * backdrop is interpolated from `translateY`, so a sheet parked at that
   * animation's initial offset while `translateY` read zero drew a fully opaque
   * scrim over an empty screen. A layout animation that does not replay on a
   * remount inside the portal — two sheets sharing a screen is enough — left it
   * there for good, with no way back.
   *
   * Under reduced motion there is no travel to make, so it starts at rest and
   * the scrim's fade carries the change on its own.
   */
  const translateY = useSharedValue(reducedMotion ? 0 : screenHeight);
  const closeTint = useCSSVariable('--color-muted-foreground');
  // Read unconditionally, used only by the native branch: the platform draws
  // that sheet's container, so a token can only reach it as a colour handed
  // over, never as a class.
  const popoverSurface = useCSSVariable('--color-popover');

  /*
   * The scrolling body's gesture, if there is one. It is built here rather
   * than in `BottomSheet.Body` because the drag below has to name it, and a
   * gesture is composed before its children have mounted. `Body` attaches it
   * to its own scroll view; with no `Body` it is simply never attached, and
   * the drag reverts to owning every touch.
   */
  const scrollGesture = useMemo(() => Gesture.Native(), []);
  const scrollOffset = useSharedValue(0);
  const hasScrollable = useSharedValue(false);

  const close = useCallback(() => setOpen(false), [setOpen]);

  // The sheet closes on the Android back button while it is up, the same as a
  // backdrop tap — but only when it is dismissible.
  useBackHandler(open && dismissible, close);

  /*
   * The sheet outlives `open`, and this is what keeps it alive.
   *
   * It used to be removed from the tree in the same commit `open` flipped,
   * while an `exiting` layout animation was still declared on it. Reanimated
   * then held the detached views until that spring settled — and a `duration`
   * on a `springify()` animation is a target rather than a stop, so how long
   * that took was not something this file decided. Reopening inside that window
   * put a second sheet on screen with nothing coordinating the two.
   *
   * Now one animation owns the whole travel. Closing springs the sheet down and
   * clears `presented` from the spring's own completion callback, so the tree
   * comes down *after* the movement rather than during it. The backdrop is
   * derived from the same value, so it goes with it.
   *
   * Reopening mid-exit is the case this really fixes: `presented` is still
   * true, so nothing remounts and nothing new is scheduled — the spring is
   * cancelled and the same sheet is caught on its way down.
   */
  const [presented, setPresented] = useState(open);

  useEffect(() => {
    if (open) {
      cancelAnimation(translateY);
      if (!presented) {
        /*
         * A fresh mount starts off screen and this effect's own re-run — it
         * depends on `presented` — springs it up. Catching one that is still on
         * screen must not reset it under the finger, so this only runs when the
         * sheet had actually gone.
         */
        translateY.value = reducedMotion ? 0 : screenHeight;
        setPresented(true);
        return;
      }
      translateY.value = reducedMotion
        ? withTiming(0, { duration: 150 })
        : withSpring(0, SPRING);
      return;
    }

    if (!presented) return;

    const land = (finished?: boolean) => {
      'worklet';
      if (finished) runOnJS(setPresented)(false);
    };
    translateY.value = reducedMotion
      ? withTiming(screenHeight, { duration: 150 }, land)
      : withSpring(screenHeight, EXIT_SPRING, land);
  }, [open, presented, reducedMotion, screenHeight, translateY]);

  /*
   * The native sheet's own presentation queue, which the platform does not have.
   *
   * UIKit refuses to present a sheet while the previous one is still being
   * dismissed, and the request is dropped rather than queued — so a close
   * followed immediately by an open leaves nothing on screen, and the reader
   * sees a sheet that "took a moment" or never came at all.
   *
   * `isPresented` is therefore driven from here rather than straight from
   * `open`: a present that arrives during a dismissal is held, and let through
   * once that dismissal is over.
   *
   * Knowing when it is over is the hard half, because it depends on who asked.
   * A dismissal the reader performed is reported — that report is the platform
   * writing the new value back to us. One we asked for is not: the value is
   * already what the platform would have written, so the change is suppressed
   * at the source and no report is ever sent. A queue that waits for one
   * regardless waits for ever, and every present after the first is held —
   * which is a sheet that opens once and then never again, whether the flag was
   * raised by the reader's swipe or by a Close button inside the sheet.
   *
   * So the two are ended by their own means: the reader's by the report, ours
   * by {@link NATIVE_DISMISS_MS} — and by the report as well, if one turns up,
   * since arriving early is only ever an improvement.
   */
  const [nativePresented, setNativePresented] = useState(open);
  const nativeOnScreen = useRef(open);
  const nativeDismissing = useRef(false);
  const nativeDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openRef = useRef(open);
  openRef.current = open;

  /** The dismissal is over: let a held present through, if one is waiting. */
  const endNativeDismissal = useCallback(() => {
    if (nativeDismissTimer.current !== null) {
      clearTimeout(nativeDismissTimer.current);
      nativeDismissTimer.current = null;
    }
    if (!nativeDismissing.current) return;
    nativeDismissing.current = false;

    if (openRef.current) {
      nativeOnScreen.current = true;
      setNativePresented(true);
    }
  }, []);

  useEffect(() => {
    if (!nativeSheet) return;

    if (open) {
      if (nativeDismissing.current) return;
      nativeOnScreen.current = true;
      setNativePresented(true);
      return;
    }

    // Only a sheet the platform still has on screen can be in the middle of
    // leaving. One the reader already swiped away has reported itself gone.
    if (nativeOnScreen.current) {
      nativeOnScreen.current = false;
      nativeDismissing.current = true;
      if (nativeDismissTimer.current !== null) clearTimeout(nativeDismissTimer.current);
      nativeDismissTimer.current = setTimeout(endNativeDismissal, NATIVE_DISMISS_MS);
    }
    setNativePresented(false);
  }, [endNativeDismissal, nativeSheet, open]);

  useEffect(
    () => () => {
      if (nativeDismissTimer.current !== null) clearTimeout(nativeDismissTimer.current);
    },
    []
  );

  const onNativeDismiss = useCallback(() => {
    // The platform reporting that its sheet has gone. Whatever asked for it,
    // there is nothing on screen now.
    nativeOnScreen.current = false;

    // Ours, or the reader's? A dismissal we asked for hands the queue back
    // ahead of its window; one the reader performed is a close to report.
    if (nativeDismissing.current) {
      endNativeDismissal();
      return;
    }

    if (dismissible) close();
  }, [close, dismissible, endNativeDismissal]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        /*
         * A locked sheet does not take the drag at all.
         *
         * Refusing the close is not enough on its own: the drag still moves
         * the sheet, and a controlled caller that declines `onOpenChange`
         * leaves it parked off the bottom of the screen — open as far as the
         * caller is concerned, invisible, and still taking every touch behind
         * a fully transparent backdrop. The backdrop press and the back
         * gesture were already gated; this is the third way out.
         */
        .enabled(dismissible)
        /*
         * A drag has to travel before it takes the touch. This detector wraps
         * the whole sheet, close button included, and an unqualified Pan
         * activates on a few pixels of drift — cancelling the press the button
         * is in the middle of, so a tap with any finger travel does nothing.
         */
        .activeOffsetY([-12, 12])
        /*
         * A scrolling body runs its own gesture, and without this the two
         * compete: whichever wins takes the touch outright, so either the
         * list never scrolls or the sheet never drags. Running them together
         * lets the rule below decide which one a given drag belongs to.
         */
        .simultaneousWithExternalGesture(scrollGesture)
        .onChange((event) => {
          /*
           * The list gets the drag until it has nothing left to scroll. Once
           * it is at the top the sheet takes over, which is the gesture people
           * already expect: pulling down on a list that cannot go further
           * pulls the sheet instead. The second clause keeps a sheet that is
           * already part-way dragged following the finger, so releasing the
           * drag halfway does not strand it.
           */
          if (hasScrollable.value && scrollOffset.value > 0 && translateY.value <= 0) {
            return;
          }
          // Rubber-band when dragging upward, follow the finger downward.
          const next = translateY.value + event.changeY;
          translateY.value = next > 0 ? next : next / 3;
        })
        .onEnd((event) => {
          /*
           * Velocity decides as much as distance does, and it is handed to the
           * animation rather than only consulted by it. A flat timing from
           * wherever the finger let go ignores how fast it was moving, so the
           * frame the touch ends is a visible seam between a fast drag and a
           * slow slide — the single detail that separates a sheet that follows
           * your hand from one that merely goes where you put it.
           */
          const projected = translateY.value + project(event.velocityY);
          /*
           * `dismissible` again, behind `.enabled()` rather than instead of
           * it. Disabling a gesture does not cancel a touch already in flight,
           * so a sheet locked mid-drag still arrives here — and without this
           * it would fling itself away on the strength of a decision the
           * caller has since revoked. Falling through snaps it back instead.
           */
          if (
            dismissible &&
            (projected > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY)
          ) {
            translateY.value = withSpring(
              screenHeight,
              { ...EXIT_SPRING, velocity: event.velocityY },
              (finished) => {
                if (finished) runOnJS(close)();
              }
            );
          } else {
            translateY.value = withSpring(0, { ...SPRING, velocity: event.velocityY });
            // It caught rather than went. Fired here, at the moment the sheet
            // commits to staying, not when it finishes arriving.
            runOnJS(impactKnock)();
          }
        }),
    // Rebuilt only when one of these changes. Built inline it would be a new
    // gesture on every render — and the sheet re-renders while it is being
    // used, each time re-attaching the handler and dropping the live touch.
    [
      close,
      dismissible,
      screenHeight,
      translateY,
      scrollGesture,
      scrollOffset,
      hasScrollable,
    ]
  );

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, screenHeight],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  /*
   * A sized sheet is clamped rather than handed its fraction outright.
   * `insets.top` is the status bar and the notch, and content that runs under
   * those is unreadable at exactly the moment the sheet is at its tallest.
   */
  const sizedHeight =
    size === 'auto'
      ? undefined
      : Math.min(
          screenHeight * SIZE_FRACTION[size],
          screenHeight - insets.top - (detached ? 24 : 8)
        );

  const surface = useMemo(
    () => ({ scrollGesture, scrollOffset, hasScrollable }),
    [scrollGesture, scrollOffset, hasScrollable]
  );

  if (nativeSheet) {
    const { Host, BottomSheet: NativeBottomSheet, RNHostView } = nativeSheet.nativeUI;
    /*
     * `snapPoints` on the root is the finer control and wins; `size` is the
     * shorthand, and maps onto the platform's own detents rather than a
     * height, so a native sheet keeps the system's snapping.
     */
    const snapPoints =
      nativeSheet.snapPoints ?? (size === 'auto' ? undefined : [size]);
    /*
     * `true` means the theme's surface, and a string means itself. A token
     * that did not resolve is dropped rather than passed on — an unresolved
     * colour reaching the platform is a sheet painted some default, which is
     * further from the material than leaving the material alone.
     */
    const requested = nativeSheet.background;
    const surface =
      requested === true
        ? typeof popoverSurface === 'string'
          ? popoverSurface
          : undefined
        : typeof requested === 'string'
          ? requested
          : undefined;
    const modifiers = surface ? nativeSheetSurface(surface) : undefined;
    // The platform owns presentation, so this stays mounted and toggles
    // isPresented rather than unmounting on close.
    //
    // RNHostView is not optional: our content is React Native, and the native
    // sheet cannot measure RN views directly. Without it the sheet sizes to
    // nothing and the content spills outside its container.
    return (
      <NativeHost
        host={Host}
        matchContents
        ignoreSafeArea="keyboard"
        style={{ position: 'absolute' }}
      >
        <NativeBottomSheet
          isPresented={nativePresented}
          onDismiss={onNativeDismiss}
          snapPoints={snapPoints}
          modifiers={modifiers}
        >
          <RNHostView matchContents>
            <BottomSheetContext.Provider value={context}>
              <View
                {...props}
                className={cn(
                  // The platform draws the container, but it hands us a bare
                  // box — padding and safe-area are still ours. The top
                  // padding has to clear the platform's grabber, which sits
                  // inside the sheet rather than above the content.
                  'justify-start gap-2 px-5 pb-2 pt-5',
                  className
                )}
                style={{
                  // An explicit width, not `w-full`. Inside the native host
                  // there is no parent width for a percentage to resolve
                  // against, so `100%` measures against nothing and the
                  // content lays out wider than the sheet it sits in.
                  width: screenWidth,
                  minHeight: bottomSheetDetentHeight(snapPoints, screenHeight),
                  paddingBottom: Math.max(insets.bottom, 16),
                }}
              >
                {textChildren(children)}
              </View>
            </BottomSheetContext.Provider>
          </RNHostView>
        </NativeBottomSheet>
      </NativeHost>
    );
  }

  // `presented`, not `open`: the sheet stays in the tree until its own exit
  // animation has finished putting it away.
  if (!presented) return null;

  return (
    <ModalPortal>
      {/* Portal content mounts under PortalHost, outside this provider's
          subtree — re-provide the context so nested consumers keep working. */}
      <BottomSheetContext.Provider value={context}>
        <View className="absolute inset-0 justify-end">
        {/* Derived from the same value the sheet moves on, so the backdrop
            cannot disagree with it: dragging the sheet halfway down lightens
            the screen behind it by half. Left to its own fade the scrim stayed
            fully dark until the sheet had gone, which reads as a dimmed screen
            with nothing on it. */}
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          {/* Scrim draws the backdrop and its own fade; the Pressable over it
              is what closes the sheet, since the scrim takes no touches. */}
          <Scrim blur={blur} />
          <Pressable
            accessibilityLabel="Close sheet"
            className="flex-1"
            onPress={dismissible ? close : undefined}
          />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View
            /*
             * The same spring the drag settles with, so a sheet caught halfway
             * through arriving and a sheet released after a drag are the same
             * object moving at the same weight.
             *
             * Reduced motion keeps the scrim's fade and drops the slide: the
             * state change still has to be legible, and it is the travel that
             * setting is about.
             */
            entering={reducedMotion ? FadeIn.duration(150) : undefined}
            accessibilityViewIsModal
            className={sheetVariants({ detached, className })}
            {...props}
            // After the spread, and with the caller's own style folded in
            // rather than replacing the array: spread last, a caller passing
            // `style` for a height would silently drop the drag transform and
            // the safe-area padding with it.
            style={[
              sheetStyle,
              // A detached sheet's own bottom margin already clears the home
              // indicator, so it takes plain padding rather than stacking the
              // inset on top of the gap.
              { paddingBottom: detached ? 16 : Math.max(insets.bottom, 16) },
              sizedHeight === undefined ? null : { height: sizedHeight },
              props.style,
            ]}
          >
            <SheetSurfaceContext.Provider value={surface}>
              {showGrabber ? (
                <View className="mb-3 self-center">
                  <View className="h-1 w-10 rounded-full bg-muted-foreground/30" />
                </View>
              ) : null}
              {textChildren(children)}
              {/*
                * Last, and lifted above the content.
                *
                * Drawn before the children it was covered by whichever of them
                * reached the top-right corner — a title spanning the sheet's
                * width is enough — and in React Native a later sibling wins
                * the touch. The button still looked untouched, so the failure
                * read as intermittent: taps landing on the sliver above the
                * title worked, taps anywhere else went to the title and did
                * nothing. `hitSlop` made it worse by growing the part of the
                * target that was already buried.
                */}
              {showClose ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  onPress={close}
                  hitSlop={8}
                  className="absolute end-4 top-3 z-10 h-8 w-8 items-center justify-center rounded-full bg-muted active:opacity-70"
                >
                  <XIcon
                    size={16}
                    color={typeof closeTint === 'string' ? closeTint : undefined}
                  />
                </Pressable>
              ) : null}
            </SheetSurfaceContext.Provider>
          </Animated.View>
        </GestureDetector>
        </View>
      </BottomSheetContext.Provider>
    </ModalPortal>
  );
}

export interface BottomSheetHeaderProps extends ViewProps {
  className?: string;
  /** Heading for the sheet. Strings are wrapped; anything else is drawn as given. */
  title?: ReactNode;
  /** A line under the title, for what the sheet is asking. */
  description?: ReactNode;
  children?: ReactNode;
}

/**
 * A fixed heading above the sheet's body.
 *
 * It exists mostly to reserve the top-right corner. The close button is
 * absolutely positioned there, so anything full-width at the top of a sheet
 * sits under it — a title is exactly that shape, and the end padding here is
 * what keeps the two from meeting. Being outside `Body` is the other half:
 * it stays put while the content scrolls under it, so the sheet still says
 * what it is once the list has moved.
 */
function BottomSheetHeader({
  className,
  title,
  description,
  children,
  ...props
}: BottomSheetHeaderProps) {
  return (
    <View className={cn('gap-1 pb-3 pe-12', className)} {...props}>
      {textChildren(title, (text) => (
        <Text size="lg" weight="semibold">
          {text}
        </Text>
      ))}
      {textChildren(description, (text) => (
        <Text size="sm" muted>
          {text}
        </Text>
      ))}
      {textChildren(children)}
    </View>
  );
}
BottomSheetHeader.displayName = 'BottomSheet.Header';

export interface BottomSheetBodyProps
  extends Omit<ComponentProps<typeof Animated.ScrollView>, 'ref'> {
  className?: string;
  children?: ReactNode;
}

/**
 * The scrolling part of a sized sheet.
 *
 * A plain `ScrollView` works here too, but only one of the two gestures can
 * win a given drag and neither knows about the other, so the list and the
 * sheet fight over every downward swipe. This one reports where it is
 * scrolled to, which is what lets the sheet hold off until the list has run
 * out — pull down on a list at its top and the sheet comes with you, pull
 * down anywhere else and the list scrolls.
 */
const BottomSheetBody = forwardRef<
  ComponentRef<typeof Animated.ScrollView>,
  BottomSheetBodyProps
>(function BottomSheetBody({ className, children, onScroll, ...props }, ref) {
  const surface = useContext(SheetSurfaceContext);

  useEffect(() => {
    if (!surface) return;
    surface.hasScrollable.value = true;
    return () => {
      surface.hasScrollable.value = false;
      surface.scrollOffset.value = 0;
    };
  }, [surface]);

  /*
   * Pulled out before the handler rather than read off `surface` inside it.
   * A scroll handler is a worklet, and everything it closes over is copied to
   * the UI thread — closing over the context object would drag the gesture
   * along with it, and a gesture is not a value that can be copied.
   */
  const scrollOffset = surface?.scrollOffset;

  const handler = useAnimatedScrollHandler((event) => {
    if (scrollOffset) scrollOffset.value = event.contentOffset.y;
  });

  /*
   * Composed, not replaced. A caller's `onScroll` arriving after this one used
   * to take its place, which silently cost the sheet the position report its
   * whole drag arrangement is built on — the list and the sheet went back to
   * fighting over every downward swipe, and nothing said why.
   *
   * It has to be an animated handler for the same reason this one is.
   */
  const composed = useComposedEventHandler([
    handler,
    (onScroll as typeof handler | undefined) ?? null,
  ]);

  const body = (
    <Animated.ScrollView
      ref={ref}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      className={cn('flex-1', className)}
      {...props}
      onScroll={composed}
    >
      {textChildren(children)}
    </Animated.ScrollView>
  );

  /*
   * The detector is what gives the scroll a handler the sheet's drag can name.
   * Without one the two are strangers, and the first to activate takes the
   * touch outright — which is the whole bug this part exists to solve.
   */
  if (!surface) return body;
  return <GestureDetector gesture={surface.scrollGesture}>{body}</GestureDetector>;
});
BottomSheetBody.displayName = 'BottomSheet.Body';

export interface BottomSheetFooterProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * A row pinned below the body, for whatever the sheet is asking to be decided.
 * Outside `Body` so it stays reachable however far the content scrolls — an
 * action that has to be scrolled to is one people do not find.
 */
function BottomSheetFooter({
  className,
  children,
  ...props
}: BottomSheetFooterProps) {
  return (
    <View
      className={cn('gap-2 border-t border-border pt-3', className)}
      {...props}
    >
      {textChildren(children)}
    </View>
  );
}
BottomSheetFooter.displayName = 'BottomSheet.Footer';

export const BottomSheet = Object.assign(BottomSheetRoot, {
  Trigger: BottomSheetTrigger,
  Content: BottomSheetContent,
  Header: BottomSheetHeader,
  Body: BottomSheetBody,
  Footer: BottomSheetFooter,
});
