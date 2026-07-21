import {
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Pressable, View, type ViewProps } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { Portal } from '../../primitives/portal';
import { Scrim } from '../../primitives/scrim';
import { Text, type TextProps } from '../../primitives/text';
import { cn } from '../../utils/cn';

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialog(component: string): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error(`${component} must be used within a <Dialog>`);
  }
  return context;
}

export interface DialogProps {
  children: ReactNode;
  /** Controlled open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Initial state when uncontrolled. */
  defaultOpen?: boolean;
}

function DialogRoot({ children, open, onOpenChange, defaultOpen = false }: DialogProps) {
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

  return <DialogContext.Provider value={context}>{children}</DialogContext.Provider>;
}

interface DialogTriggerProps {
  children: ReactElement<{ onPress?: (...args: unknown[]) => void }>;
}

/** Wraps its child and opens the dialog on press. */
function DialogTrigger({ children }: DialogTriggerProps) {
  const { setOpen } = useDialog('Dialog.Trigger');
  if (!isValidElement(children)) return children;

  return cloneElement(children, {
    onPress: (...args: unknown[]) => {
      children.props.onPress?.(...args);
      setOpen(true);
    },
  });
}

export interface DialogContentProps extends ViewProps {
  className?: string;
  /** Tap on the backdrop closes the dialog. Default true. */
  dismissible?: boolean;
  /**
   * Frost the screen behind the dialog instead of dimming it. Uses `expo-blur`
   * when installed and falls back to the dim when it is not, so it is safe to
   * pass either way.
   */
  blur?: boolean;
  children?: ReactNode;
}

function DialogContent({
  className,
  dismissible = true,
  blur = false,
  children,
  ...props
}: DialogContentProps) {
  const context = useDialog('Dialog.Content');
  const { open, setOpen } = context;

  if (!open) return null;

  return (
    <Portal>
      {/* Portal content mounts under PortalHost, outside this provider's
          subtree — re-provide the context so Dialog.Close etc. keep working. */}
      <DialogContext.Provider value={context}>
        <Animated.View
        entering={FadeIn.duration(150)}
        exiting={FadeOut.duration(150)}
        className="absolute inset-0 items-center justify-center p-6"
      >
        <Scrim blur={blur} />
        <Pressable
          accessibilityLabel="Close dialog"
          className="absolute inset-0"
          onPress={dismissible ? () => setOpen(false) : undefined}
        />
        <Animated.View
          entering={ZoomIn.springify().damping(18).stiffness(250).mass(0.6)}
          exiting={FadeOut.duration(120)}
          accessibilityViewIsModal
          className={cn(
            'w-full max-w-sm gap-1.5 rounded-2xl border border-border bg-popover p-5 shadow-lg',
            className
          )}
          {...props}
          >
            {children}
          </Animated.View>
        </Animated.View>
      </DialogContext.Provider>
    </Portal>
  );
}

const DialogTitle = forwardRef<React.ElementRef<typeof Text>, TextProps>(
  ({ className, ...props }, ref) => (
    <Text
      ref={ref}
      size="lg"
      weight="semibold"
      className={cn('text-popover-foreground', className)}
      {...props}
    />
  )
);
DialogTitle.displayName = 'Dialog.Title';

const DialogDescription = forwardRef<React.ElementRef<typeof Text>, TextProps>(
  ({ className, ...props }, ref) => (
    <Text ref={ref} size="sm" muted className={className} {...props} />
  )
);
DialogDescription.displayName = 'Dialog.Description';

function DialogFooter({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={cn('mt-4 flex-row items-center justify-end gap-2', className)}
      {...props}
    />
  );
}

interface DialogCloseProps {
  children: ReactElement<{ onPress?: (...args: unknown[]) => void }>;
}

/** Wraps its child and closes the dialog on press. */
function DialogClose({ children }: DialogCloseProps) {
  const { setOpen } = useDialog('Dialog.Close');
  if (!isValidElement(children)) return children;

  return cloneElement(children, {
    onPress: (...args: unknown[]) => {
      children.props.onPress?.(...args);
      setOpen(false);
    },
  });
}

export const Dialog = Object.assign(DialogRoot, {
  Trigger: DialogTrigger,
  Content: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Footer: DialogFooter,
  Close: DialogClose,
});
