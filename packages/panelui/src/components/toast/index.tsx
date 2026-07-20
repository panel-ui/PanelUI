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
  FadeOut,
  SlideInDown,
  SlideInUp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
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
const DISMISS_DISTANCE = 80;
const DISMISS_VELOCITY = 700;

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

/** One queued toast: swipe-dismissable, animated in from its placement edge. */
function ToastSlot({ item }: { item: ToastItem }) {
  const placement = item.placement ?? 'bottom';
  const translateX = useSharedValue(0);
  const hide = useCallback(() => toastStore.hide(item.id), [item.id]);

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onChange((event) => {
      translateX.value += event.changeX;
    })
    .onEnd((event) => {
      const flung =
        Math.abs(translateX.value) > DISMISS_DISTANCE ||
        Math.abs(event.velocityX) > DISMISS_VELOCITY;

      if (flung) {
        const direction = translateX.value > 0 ? 1 : -1;
        translateX.value = withTiming(direction * 500, { duration: 180 }, () => {
          runOnJS(hide)();
        });
      } else {
        translateX.value = withSpring(0, SPRING);
      }
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    // Fade out as it is dragged, so the dismiss reads as intentional.
    opacity: 1 - Math.min(Math.abs(translateX.value) / 240, 0.6),
  }));

  const handle: ToastHandle = { id: item.id, hide };

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        entering={placement === 'top' ? SlideInUp.springify().damping(20) : SlideInDown.springify().damping(20)}
        exiting={FadeOut.duration(150)}
        style={style}
      >
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
      {items.map((item) => (
        <ToastSlot key={item.id} item={item} />
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
