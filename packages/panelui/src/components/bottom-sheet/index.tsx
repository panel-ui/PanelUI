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
}

function BottomSheetRoot({
  children,
  open,
  onOpenChange,
  defaultOpen = false,
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

  return (
    <BottomSheetContext.Provider value={context}>
      {children}
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
  children?: ReactNode;
}

function BottomSheetContent({
  className,
  dismissible = true,
  children,
  ...props
}: BottomSheetContentProps) {
  const { open, setOpen } = useBottomSheet('BottomSheet.Content');
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);

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

  if (!open) return null;

  return (
    <Portal>
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
            {children}
          </Animated.View>
        </GestureDetector>
      </View>
    </Portal>
  );
}

export const BottomSheet = Object.assign(BottomSheetRoot, {
  Trigger: BottomSheetTrigger,
  Content: BottomSheetContent,
});
