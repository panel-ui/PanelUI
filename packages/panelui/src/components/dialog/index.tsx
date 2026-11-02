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
import { tv, type VariantProps } from 'tailwind-variants';
import { ModalPortal } from '../../primitives/portal';
import { Scrim } from '../../primitives/scrim';
import { Text, type TextProps, textChildren } from '../../primitives/text';
import { useBackHandler } from '../../hooks/use-back-handler';
import { cn } from '../../utils/cn';
import type { TextRef } from '../../primitives/refs';

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
   *
   * Someone who has Reduce Transparency switched on gets an opaque
   * backdrop instead, which is the whole point of the setting.
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

  // While the dialog is up, the Android back button closes it rather than
  // popping the screen behind — but only when tapping outside would too.
  useBackHandler(open && dismissible, () => setOpen(false));

  if (!open) return null;

  return (
    <ModalPortal>
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
          // `p-5` is `DIALOG_PADDING` above — a panel footer bleeds back out
          // through exactly this much, so the two move together.
          className={cn(
            'w-full max-w-sm gap-1.5 rounded-2xl border border-border bg-popover p-5 shadow-lg',
            className
          )}
          {...props}
          >
            {textChildren(children)}
          </Animated.View>
        </Animated.View>
      </DialogContext.Provider>
    </ModalPortal>
  );
}

const DialogTitle = forwardRef<TextRef, TextProps>(
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

const DialogDescription = forwardRef<TextRef, TextProps>(
  ({ className, ...props }, ref) => (
    <Text ref={ref} size="sm" muted className={className} {...props} />
  )
);
DialogDescription.displayName = 'Dialog.Description';

/**
 * The dialog's padding, in points. The panel footer bleeds back out through it,
 * so the two have to agree — a mismatch is a band inset from one edge.
 */
const DIALOG_PADDING = 20;

const dialogFooterVariants = tv({
  base: 'flex-row items-center justify-end gap-2',
  variants: {
    /**
     * Whether the footer draws a surface of its own.
     *
     * `plain` is part of the dialog: same background, sitting under the content
     * with a gap above it. `panel` is a band set into it — a rule across the
     * top, a step darker, and the dialog's own bottom corners — which separates
     * what the dialog says from what you can do about it. Worth it on a dialog
     * with a form in it, where the buttons are otherwise one more row of it.
     */
    variant: {
      plain: 'mt-4',
      panel: 'mt-5 rounded-b-2xl border-t border-border bg-inset',
    },
  },
  defaultVariants: {
    variant: 'plain',
  },
});

export interface DialogFooterProps extends ViewProps, VariantProps<typeof dialogFooterVariants> {
  className?: string;
}

function DialogFooter({ className, variant, style, ...props }: DialogFooterProps) {
  return (
    <View
      /*
       * The bleed is a style rather than a class because it is arithmetic on the
       * dialog's own padding, and a class would be a second copy of that number
       * waiting to disagree with the first.
       */
      style={
        variant === 'panel'
          ? [
              {
                marginHorizontal: -DIALOG_PADDING,
                marginBottom: -DIALOG_PADDING,
                paddingHorizontal: DIALOG_PADDING,
                paddingVertical: 16,
              },
              style,
            ]
          : style
      }
      className={cn(dialogFooterVariants({ variant }), className)}
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
