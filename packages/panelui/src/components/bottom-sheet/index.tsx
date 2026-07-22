import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Pressable, useWindowDimensions, View, type ViewProps } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getNativeUI } from '../../native';
import { XIcon } from '../../icons';
import { Portal } from '../../primitives/portal';
import { cn } from '../../utils/cn';

const SPRING = { damping: 22, stiffness: 280, mass: 0.7 } as const;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;

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
}

/**
 * Roughly how tall the platform will make the sheet at a given detent, as a
 * fraction of the screen. Approximate on purpose — it is used as a floor for
 * the content, not as the sheet's real height, which the platform owns.
 */
const DETENT_FRACTION = { half: 0.5, full: 0.9 } as const;

/**
 * The height the content should at least fill for a given set of detents.
 *
 * Without this the hosted content sizes to itself and the platform centres
 * that smaller box inside the taller sheet, which is why a short sheet shows
 * its content floating in the middle. Filling the detent leaves nothing to
 * centre, so the content sits where it was written: at the top.
 */
function detentFloor(
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
 * Set by the root so Content knows the platform is drawing the sheet, and with
 * which detents. Null means the styled sheet renders.
 */
const NativeSheetContext = createContext<{
  nativeUI: NonNullable<ReturnType<typeof getNativeUI>>;
  snapPoints: BottomSheetProps['snapPoints'];
} | null>(null);

function BottomSheetRoot({
  children,
  open,
  onOpenChange,
  defaultOpen = false,
  native,
  snapPoints,
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
    () => (nativeUI ? { nativeUI, snapPoints } : null),
    [nativeUI, snapPoints]
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
   * Show a close button in the top-right corner. On by default for the styled
   * sheet; ignored by the native sheet, which has its own dismiss affordances.
   */
  showClose?: boolean;
  children?: ReactNode;
}

function BottomSheetContent({
  className,
  dismissible = true,
  showClose = true,
  children,
  ...props
}: BottomSheetContentProps) {
  const context = useBottomSheet('BottomSheet.Content');
  const { open, setOpen } = context;
  const nativeSheet = useContext(NativeSheetContext);
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);
  const closeTint = useCSSVariable('--color-muted-foreground');

  const close = useCallback(() => setOpen(false), [setOpen]);

  const pan = Gesture.Pan()
    .onChange((event) => {
      // Rubber-band when dragging upward, follow the finger downward.
      const next = translateY.value + event.changeY;
      translateY.value = next > 0 ? next : next / 3;
    })
    .onEnd((event) => {
      if (
        translateY.value > DISMISS_DISTANCE ||
        event.velocityY > DISMISS_VELOCITY
      ) {
        translateY.value = withTiming(screenHeight, { duration: 200 }, () => {
          runOnJS(close)();
        });
      } else {
        translateY.value = withSpring(0, SPRING);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (nativeSheet) {
    const { Host, BottomSheet: NativeBottomSheet, RNHostView } = nativeSheet.nativeUI;
    // The platform owns presentation, so this stays mounted and toggles
    // isPresented rather than unmounting on close.
    //
    // RNHostView is not optional: our content is React Native, and the native
    // sheet cannot measure RN views directly. Without it the sheet sizes to
    // nothing and the content spills outside its container.
    return (
      <Host matchContents style={{ position: 'absolute' }}>
        <NativeBottomSheet
          isPresented={open}
          onDismiss={dismissible ? close : () => {}}
          snapPoints={nativeSheet.snapPoints}
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
                  minHeight: detentFloor(nativeSheet.snapPoints, screenHeight),
                  paddingBottom: Math.max(insets.bottom, 16),
                }}
              >
                {children}
              </View>
            </BottomSheetContext.Provider>
          </RNHostView>
        </NativeBottomSheet>
      </Host>
    );
  }

  if (!open) return null;

  return (
    <Portal>
      {/* Portal content mounts under PortalHost, outside this provider's
          subtree — re-provide the context so nested consumers keep working. */}
      <BottomSheetContext.Provider value={context}>
        <View className="absolute inset-0 justify-end">
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(180)}
          className="absolute inset-0"
        >
          <Pressable
            accessibilityLabel="Close sheet"
            className="flex-1 bg-black/50"
            onPress={dismissible ? close : undefined}
          />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View
            entering={SlideInDown.springify().damping(22).stiffness(240).mass(0.8)}
            exiting={SlideOutDown.duration(200)}
            style={[sheetStyle, { paddingBottom: Math.max(insets.bottom, 16) }]}
            accessibilityViewIsModal
            className={cn(
              'rounded-t-3xl border border-b-0 border-border bg-popover px-5 pt-2 shadow-lg',
              className
            )}
            {...props}
          >
            <View className="mb-3 self-center">
              <View className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </View>
            {showClose ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={close}
                hitSlop={8}
                className="absolute right-4 top-3 h-8 w-8 items-center justify-center rounded-full bg-muted active:opacity-70"
              >
                <XIcon size={16} color={typeof closeTint === 'string' ? closeTint : undefined} />
              </Pressable>
            ) : null}
            {children}
          </Animated.View>
        </GestureDetector>
        </View>
      </BottomSheetContext.Provider>
    </Portal>
  );
}

export const BottomSheet = Object.assign(BottomSheetRoot, {
  Trigger: BottomSheetTrigger,
  Content: BottomSheetContent,
});
