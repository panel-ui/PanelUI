/**
 * Toast — transient notification.
 *
 * Adapted from: heroui-inc/heroui-native src/components/toast/
 * (the three usage patterns — string, config object, custom component — the
 * Title / Description / Action / Close anatomy, placement, and swipe-to-
 * dismiss). Styled with Coss UI tokens and PanelUI's Alert status palette.
 *
 * The viewport is mounted for you by PanelUIProvider; `useToast()` works
 * anywhere below it.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { View, type ViewProps } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  FadeInDown,
  FadeInUp,
  Keyframe,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { Portal } from '../../primitives/portal';
import { Text, type TextProps } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { AlertTriangleIcon, CheckCircleIcon, InfoIcon, XIcon } from '../../icons';
import { Button, type ButtonProps } from '../button';
import {
  toast,
  toastStore,
  type ToastHandle,
  type ToastItem,
  type ToastPlacement,
  type ToastVariant,
} from './toast-store';

const SPRING = { damping: 20, stiffness: 260, mass: 0.6 } as const;
/** Drag distance past which a release dismisses. */
const DISMISS_DISTANCE = 50;
/** Fling speed past which a release dismisses regardless of distance. */
const DISMISS_VELOCITY = 500;
/** How far a toast can be dragged away from its edge before it stops moving. */
const RUBBER_BAND_LIMIT = 40;
/** How far a toast travels on entry. Short, so the spring has little to settle. */
const ENTER_OFFSET = 100;
/** Newest toasts only; older ones are dropped rather than stacking off-screen. */
const MAX_VISIBLE = 3;

/*
 * Entering/exiting animations, from heroui-inc/heroui-native
 * src/components/toast/toast.animation.ts.
 *
 * `mass(3)` is doing the important work: a heavy spring settles without the
 * visible overshoot a default-mass one gives. `withInitialValues` keeps
 * opacity at 1 so the toast slides rather than fades, and starts it
 * ENTER_OFFSET px away instead of off-screen.
 */
const enteringTop = FadeInUp.springify()
  .withInitialValues({ opacity: 1, transform: [{ translateY: -ENTER_OFFSET }] })
  .mass(3);

const enteringBottom = FadeInDown.springify()
  .withInitialValues({ opacity: 1, transform: [{ translateY: ENTER_OFFSET }] })
  .mass(3);

const exitKeyframe = (offset: number) =>
  new Keyframe({
    0: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
    100: {
      opacity: 0.5,
      transform: [{ translateY: offset }, { scale: 0.97 }],
      easing: Easing.bezier(0.4, 0, 1, 1),
    },
  }).duration(150);

const exitingTop = exitKeyframe(-ENTER_OFFSET);
const exitingBottom = exitKeyframe(ENTER_OFFSET);

const toastVariants = tv({
  slots: {
    root: 'w-full flex-row items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-lg',
    indicator: 'pt-px',
    content: 'flex-1 gap-0.5',
    title: 'text-sm font-medium',
    description: 'text-sm text-muted-foreground',
  },
  variants: {
    variant: {
      default: { root: 'border-border bg-popover', title: 'text-popover-foreground' },
      info: { root: 'border-info/32 bg-popover', title: 'text-info-foreground' },
      success: { root: 'border-success/32 bg-popover', title: 'text-success-foreground' },
      warning: { root: 'border-warning/32 bg-popover', title: 'text-warning-foreground' },
      destructive: {
        root: 'border-destructive/32 bg-popover',
        title: 'text-destructive-foreground',
      },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const INDICATOR_COLOR_VAR: Record<ToastVariant, string> = {
  default: '--color-muted-foreground',
  info: '--color-info-foreground',
  success: '--color-success-foreground',
  warning: '--color-warning-foreground',
  destructive: '--color-destructive-foreground',
};

const INDICATOR_ICON: Record<ToastVariant, typeof InfoIcon> = {
  default: InfoIcon,
  info: InfoIcon,
  success: CheckCircleIcon,
  warning: AlertTriangleIcon,
  destructive: AlertTriangleIcon,
};

interface ToastContextValue {
  variant: ToastVariant;
  hide: () => void;
}

const ToastContext = createContext<ToastContextValue>({
  variant: 'default',
  hide: () => {},
});

export interface ToastProps extends ViewProps, VariantProps<typeof toastVariants> {
  className?: string;
  /** Called when the close button is pressed or the toast is swiped away. */
  onHide?: () => void;
  children?: ReactNode;
}

/**
 * Presentational toast surface. Render it yourself only for custom toasts —
 * `toast.show(...)` builds one for you from a config object.
 */
const ToastRoot = ({ className, variant = 'default', onHide, children, ...props }: ToastProps) => {
  const context = useMemo<ToastContextValue>(
    () => ({ variant, hide: onHide ?? (() => {}) }),
    [variant, onHide]
  );
  const { root } = toastVariants({ variant });

  return (
    <ToastContext.Provider value={context}>
      <View accessibilityRole="alert" accessibilityLiveRegion="polite" className={root({ className })} {...props}>
        {children}
      </View>
    </ToastContext.Provider>
  );
};
ToastRoot.displayName = 'Toast';

export interface ToastIndicatorProps extends ViewProps {
  className?: string;
  iconProps?: { size?: number; color?: string };
  children?: ReactNode;
}

const ToastIndicator = ({ className, iconProps, children, ...props }: ToastIndicatorProps) => {
  const { variant } = useContext(ToastContext);
  const { indicator } = toastVariants({ variant });
  const themeColor = useCSSVariable(INDICATOR_COLOR_VAR[variant]);
  const Icon = INDICATOR_ICON[variant];
  const color = iconProps?.color ?? (typeof themeColor === 'string' ? themeColor : undefined);

  return (
    <View className={indicator({ className })} {...props}>
      {children ?? <Icon size={iconProps?.size ?? 18} color={color} />}
    </View>
  );
};
ToastIndicator.displayName = 'Toast.Indicator';

const ToastContent = ({ className, ...props }: ViewProps & { className?: string }) => {
  const { variant } = useContext(ToastContext);
  const { content } = toastVariants({ variant });
  return <View className={content({ className })} {...props} />;
};
ToastContent.displayName = 'Toast.Content';

const ToastTitle = ({ className, ...props }: TextProps) => {
  const { variant } = useContext(ToastContext);
  const { title } = toastVariants({ variant });
  return <Text className={cn(title(), className)} {...props} />;
};
ToastTitle.displayName = 'Toast.Title';

const ToastDescription = ({ className, ...props }: TextProps) => {
  const { variant } = useContext(ToastContext);
  const { description } = toastVariants({ variant });
  return <Text className={cn(description(), className)} {...props} />;
};
ToastDescription.displayName = 'Toast.Description';

/** Trailing action button. Defaults to a subtle variant that reads on the popover surface. */
const ToastAction = ({ variant = 'secondary', size = 'sm', onPress, ...props }: ButtonProps) => {
  const { hide } = useContext(ToastContext);
  return (
    <Button
      variant={variant}
      size={size}
      onPress={(event) => {
        onPress?.(event);
        hide();
      }}
      {...props}
    />
  );
};
ToastAction.displayName = 'Toast.Action';

export interface ToastCloseProps extends ViewProps {
  className?: string;
}

const ToastClose = ({ className, ...props }: ToastCloseProps) => {
  const { hide } = useContext(ToastContext);
  const color = useCSSVariable('--color-muted-foreground');

  return (
    <View className={cn('pt-px', className)} {...props}>
      <Button
        variant="ghost"
        size="icon"
        accessibilityLabel="Dismiss notification"
        className="h-6 w-6 rounded-full"
        onPress={hide}
      >
        <XIcon size={14} color={typeof color === 'string' ? color : undefined} />
      </Button>
    </View>
  );
};
ToastClose.displayName = 'Toast.Close';

export const Toast = Object.assign(ToastRoot, {
  Indicator: ToastIndicator,
  Content: ToastContent,
  Title: ToastTitle,
  Description: ToastDescription,
  Action: ToastAction,
  Close: ToastClose,
});

/* -------------------------------------------------------------------------- */
/* Viewport                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * One queued toast.
 *
 * The entering spring is deliberately heavy (`mass(3)`) and travels only
 * ENTER_OFFSET px rather than the full screen height. A default-mass spring
 * across that distance overshoots visibly — it reads as a bounce, and arrives
 * too fast to follow.
 *
 * Swiping is vertical and direction-aware: dragging toward the screen edge the
 * toast came from dismisses it, dragging the other way rubber-bands against a
 * hard limit. Matches heroui-native's toast.animation.ts.
 */
function ToastSlot({ item, depth }: { item: ToastItem; depth: number }) {
  const placement = item.placement ?? 'bottom';
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const hide = useCallback(() => toastStore.hide(item.id), [item.id]);

  /** +1 when a downward drag dismisses (bottom), -1 when an upward one does. */
  const dismissSign = placement === 'top' ? -1 : 1;

  const pan = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .onBegin(() => {
      scale.value = withTiming(0.995, { duration: 120 });
    })
    .onChange((event) => {
      const next = translateY.value + event.changeY;
      // Toward the edge: follow the finger. Away from it: rubber-band, so the
      // toast never detaches from where it belongs.
      translateY.value =
        next * dismissSign > 0
          ? next
          : interpolate(
              Math.abs(next),
              [0, 400],
              [0, RUBBER_BAND_LIMIT],
              Extrapolation.CLAMP
            ) * -dismissSign;
    })
    .onFinalize((event) => {
      scale.value = withTiming(1, { duration: 120 });

      const towardEdge = translateY.value * dismissSign > 0;
      const shouldDismiss =
        towardEdge &&
        (Math.abs(translateY.value) > DISMISS_DISTANCE ||
          Math.abs(event.velocityY) > DISMISS_VELOCITY);

      if (shouldDismiss) {
        // Carry the flick's momentum instead of stopping dead, clamped so it
        // can only continue toward the edge.
        translateY.value = withDecay({
          velocity: event.velocityY * 1.5,
          clamp:
            dismissSign > 0
              ? [0, Number.POSITIVE_INFINITY]
              : [Number.NEGATIVE_INFINITY, 0],
        });
        runOnJS(hide)();
      } else {
        translateY.value = withSpring(0, SPRING);
      }
    });

  // Gesture transform only — the layout animations below own opacity and
  // their own translate, and Reanimated cannot drive a property from both.
  const gestureStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const handle: ToastHandle = { id: item.id, hide };

  return (
    <Animated.View
      entering={placement === 'top' ? enteringTop : enteringBottom}
      exiting={placement === 'top' ? exitingTop : exitingBottom}
      // Toasts further down the stack sit back a little.
      style={{ opacity: 1 - depth * 0.15, transform: [{ scale: 1 - depth * 0.03 }] }}
    >
      <GestureDetector gesture={pan}>
        <Animated.View style={gestureStyle}>
          {item.component ? (
            item.component(handle)
          ) : (
            <Toast variant={item.variant ?? 'default'} onHide={hide}>
              {item.icon === null ? null : (
                <Toast.Indicator>{item.icon ?? undefined}</Toast.Indicator>
              )}
              <Toast.Content>
                {item.label ? <Toast.Title>{item.label}</Toast.Title> : null}
                {item.description ? (
                  <Toast.Description>{item.description}</Toast.Description>
                ) : null}
              </Toast.Content>
              {item.actionLabel ? (
                <Toast.Action onPress={() => item.onActionPress?.(handle)}>
                  {item.actionLabel}
                </Toast.Action>
              ) : null}
              {(item.closable ?? !item.actionLabel) ? <Toast.Close /> : null}
            </Toast>
          )}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

/** Absolutely positioned stack for one edge of the screen. */
function ToastStack({
  items,
  placement,
}: {
  items: readonly ToastItem[];
  placement: ToastPlacement;
}) {
  const insets = useSafeAreaInsets();
  if (items.length === 0) return null;

  // Only the newest few are shown; older ones are dropped rather than piling
  // up off-screen. Newest sits closest to the edge it entered from.
  const visible = items.slice(-MAX_VISIBLE);
  const ordered = placement === 'top' ? visible : [...visible].reverse();

  return (
    <View
      pointerEvents="box-none"
      className={cn(
        'absolute left-0 right-0 gap-2 px-4',
        placement === 'top' ? 'top-0' : 'bottom-0'
      )}
      style={{
        paddingTop: placement === 'top' ? insets.top + 8 : 0,
        paddingBottom: placement === 'bottom' ? insets.bottom + 8 : 0,
      }}
    >
      {ordered.map((item, index) => (
        <ToastSlot key={item.id} item={item} depth={index} />
      ))}
    </View>
  );
}

/**
 * Renders the toast queue. PanelUIProvider mounts this automatically — you
 * only need it directly if you build your own provider.
 */
export function ToastViewport() {
  const items = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot);

  if (items.length === 0) return null;

  const top = items.filter((item) => item.placement === 'top');
  const bottom = items.filter((item) => item.placement !== 'top');

  return (
    <Portal>
      <ToastStack items={top} placement="top" />
      <ToastStack items={bottom} placement="bottom" />
    </Portal>
  );
}

/**
 * Access the toast API.
 *
 * ```tsx
 * const { toast } = useToast();
 * toast.show({ variant: 'success', label: 'Saved' });
 * ```
 */
export function useToast() {
  return { toast };
}

export { toast, type ToastItem, type ToastPlacement, type ToastVariant, type ToastHandle };
export type { ToastOptions } from './toast-store';
