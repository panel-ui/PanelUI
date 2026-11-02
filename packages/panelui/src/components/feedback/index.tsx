/**
 * Feedback — a dialog whose body is something to write in, and whose
 * actions sit in a band around it.
 *
 * ```tsx
 * <Feedback open={open} onOpenChange={setOpen}>
 *   <Feedback.Content>
 *     <Feedback.Panel>
 *       <Feedback.Title>What should we fix first?</Feedback.Title>
 *       <Feedback.Close />
 *       <Feedback.Field value={text} onChangeText={setText} />
 *     </Feedback.Panel>
 *     <Feedback.Footer>
 *       <Feedback.Cancel />
 *       <Feedback.Submit onPress={send} />
 *     </Feedback.Footer>
 *   </Feedback.Content>
 * </Feedback>
 * ```
 *
 * ## Why the panel is a panel and not the dialog
 *
 * A dialog that asks for a sentence has two jobs on screen at once: hold what
 * is being written, and offer the two things to do with it. `Dialog` puts both
 * on one surface, which is right when the body is a line of prose — nothing
 * about it says "this is where you type".
 *
 * Here the writing surface is a well set into the dialog, and the buttons sit
 * in the band around it. The recess is the whole affordance: it says the field
 * is the page and everything else is the frame around it, before a word has
 * been read. It is also why the field has no border of its own — an outline
 * inside a well is two edges saying the same thing.
 *
 * ## The actions are equal, and one of them is not
 *
 * Cancel and Submit take the same width, because they are the same size of
 * decision — this is a sentence somebody wrote, not a deletion. What separates
 * them is weight: Submit is filled in the foreground colour and Cancel is a
 * tint of it, so the difference is legible at a glance without either being
 * hidden.
 *
 * ## Nothing is submitted empty
 *
 * `Submit` disables itself while the field is empty. A dialog that accepts an
 * empty answer produces empty feedback, and the person who sent it believes
 * they said something.
 *
 * Disabled, it drops the fill instead of dimming it. A tinted accent pill
 * still reads as the thing to press, whatever its opacity.
 */
import {
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
import {
  Pressable,
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { tv } from 'tailwind-variants';
import { XIcon } from '../../icons';
import { AnimatedPressable } from '../../primitives/animated-pressable';
import { KeyboardAvoider } from '../../primitives/keyboard-avoider';
import { ModalPortal } from '../../primitives/portal';
import { Scrim } from '../../primitives/scrim';
import { Text, textChildren, type TextProps } from '../../primitives/text';
import { useBackHandler } from '../../hooks/use-back-handler';
import { cn } from '../../utils/cn';
import type { TextInputRef, TextRef, ViewRef } from '../../primitives/refs';

/**
 * The shell's padding, in points, and the corner it draws.
 *
 * The panel's corner is the shell's less that padding, which is what keeps the
 * two curves concentric — a well whose radius does not account for the band
 * around it leaves a crescent of shell at each corner, thicker there than it is
 * along the sides.
 */
const SHELL_PADDING = 8;
const SHELL_RADIUS = 38;
const PANEL_RADIUS = SHELL_RADIUS - SHELL_PADDING;

/**
 * How far the action row is held in from the shell's own edge, beyond the
 * padding the panel gets.
 *
 * The buttons are narrower than the well above them on purpose: a row that ran
 * the full width would read as a third edge of the dialog rather than as two
 * things to press.
 */
const FOOTER_INSET = 26;

/** Room to write in before the field starts growing. */
const FIELD_MIN_HEIGHT = 200;

/**
 * The ✕'s drawn size, and the slop that takes its touch box to 48.
 *
 * Made up with slop rather than with size, because the glyph is set against
 * the title's cap height and a circle large enough to press comfortably would
 * be taller than the line it sits on.
 */
const CLOSE_SIZE = 22;
const CLOSE_HIT_SLOP = 13;

const feedbackVariants = tv({
  slots: {
    /*
     * The shell is `bg-popover` with an `inset` band laid over it rather than
     * a colour of its own. `--color-inset` is a translucent black in every
     * theme, so the shell always comes out darker than the panel it holds —
     * which is the one thing this design cannot get from the surface ladder,
     * because that ladder runs darker in a light theme and lighter in a dark
     * one, and the recess has to read the same way in both.
     */
    shell: 'w-full max-w-sm overflow-hidden bg-popover shadow-xl',
    recess: 'absolute inset-0 bg-inset',
    panel: 'overflow-hidden bg-popover',
    title: 'pe-9 text-[22px] font-semibold leading-[28px] text-popover-foreground',
    close: 'absolute items-center justify-center rounded-full bg-foreground/10',
    field: 'p-0 text-[17px] leading-[24px] text-muted-foreground',
    footer: 'flex-row items-center gap-3.5',
    action: 'h-11 flex-1 items-center justify-center rounded-full',
    actionLabel: 'text-[16px]',
  },
  variants: {
    tone: {
      /** The one that discards. A tint of the foreground, not a fill. */
      cancel: {
        action: 'bg-foreground/10',
        actionLabel: 'font-medium text-muted-foreground',
      },
      /** The one that sends. Filled, and the only filled thing on the dialog. */
      submit: {
        action: 'bg-primary',
        actionLabel: 'font-semibold text-primary-foreground',
      },
    },
    disabled: {
      true: {},
    },
  },
  compoundVariants: [
    /*
     * A disabled Submit loses its fill rather than dimming it.
     *
     * A tinted accent pill is still an accent pill: at any opacity it reads as
     * the thing on the dialog to press, so an inert one gets pressed and then
     * gets reported as broken. Dropping the fill is what makes the state
     * legible before the press.
     *
     * The tint is fainter than Cancel's own on purpose. Matched fills would
     * read as two Cancels rather than as one live action and one dead one.
     */
    {
      tone: 'submit',
      disabled: true,
      class: {
        action: 'bg-foreground/[0.04]',
        actionLabel: 'font-medium text-muted-foreground/50',
      },
    },
    { tone: 'cancel', disabled: true, class: { action: 'opacity-[0.45]' } },
  ],
});

interface FeedbackContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** What is in the field, so Submit can refuse to send nothing. */
  value: string;
  setValue: (value: string) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

function useFeedback(component: string): FeedbackContextValue {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error(`${component} must be used within a <Feedback>`);
  }
  return context;
}

export interface FeedbackProps {
  children: ReactNode;
  /** Controlled open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Initial state when uncontrolled. */
  defaultOpen?: boolean;
  /** The message, when the caller holds it. Leave unset to let the field keep it. */
  value?: string;
  /** Starting message for an uncontrolled field. Ignored once `value` is passed. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

function FeedbackRoot({
  children,
  open,
  onOpenChange,
  defaultOpen = false,
  value,
  defaultValue = '',
  onValueChange,
}: FeedbackProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const openControlled = open !== undefined;
  const resolvedOpen = openControlled ? open : internalOpen;

  const [internalValue, setInternalValue] = useState(defaultValue);
  const valueControlled = value !== undefined;
  const resolvedValue = valueControlled ? value : internalValue;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!openControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [openControlled, onOpenChange]
  );

  const setValue = useCallback(
    (next: string) => {
      if (!valueControlled) setInternalValue(next);
      onValueChange?.(next);
    },
    [valueControlled, onValueChange]
  );

  const context = useMemo(
    () => ({ open: resolvedOpen, setOpen, value: resolvedValue, setValue }),
    [resolvedOpen, setOpen, resolvedValue, setValue]
  );

  return (
    <FeedbackContext.Provider value={context}>
      {children}
    </FeedbackContext.Provider>
  );
}
FeedbackRoot.displayName = 'Feedback';

interface FeedbackTriggerProps {
  children: ReactElement<{ onPress?: (...args: unknown[]) => void }>;
}

/** Wraps its child and opens the dialog on press. */
function FeedbackTrigger({ children }: FeedbackTriggerProps) {
  const { setOpen } = useFeedback('Feedback.Trigger');
  if (!isValidElement(children)) return children;
  return (
    <Pressable onPress={() => setOpen(true)}>
      <View pointerEvents="none">{children}</View>
    </Pressable>
  );
}
FeedbackTrigger.displayName = 'Feedback.Trigger';

export interface FeedbackContentProps extends ViewProps {
  className?: string;
  /** Whether tapping outside or pressing back closes it. */
  dismissible?: boolean;
  /** Frost the screen behind instead of dimming it. Needs `expo-blur`. */
  blur?: boolean;
  children?: ReactNode;
}

/** The shell: the recessed band, and everything laid in it. */
function FeedbackContent({
  className,
  dismissible = true,
  blur = false,
  children,
  ...props
}: FeedbackContentProps) {
  const context = useFeedback('Feedback.Content');
  const { open, setOpen } = context;
  const slots = feedbackVariants();

  useBackHandler(open && dismissible, () => setOpen(false));

  if (!open) return null;

  return (
    <ModalPortal>
      {/* Portal content mounts under PortalHost, outside this provider's
          subtree — re-provide the context so Close and Submit keep working. */}
      <FeedbackContext.Provider value={context}>
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
          {/*
            The body is a field, so the dialog gets out of the keyboard's way
            rather than sitting behind it. `lift` and not `dock`: it is centred
            on the screen rather than pinned to an edge, so it only has to move
            by however much the keyboard actually overlaps it.
          */}
          <KeyboardAvoider mode="lift" offset={16} className="w-full items-center">
            <Animated.View
              entering={ZoomIn.springify().damping(18).stiffness(250).mass(0.6)}
              exiting={FadeOut.duration(120)}
              accessibilityViewIsModal
              className={slots.shell({ className })}
              style={{ borderRadius: SHELL_RADIUS, padding: SHELL_PADDING }}
              {...props}
            >
              <View pointerEvents="none" className={slots.recess()} />
              {textChildren(children)}
            </Animated.View>
          </KeyboardAvoider>
        </Animated.View>
      </FeedbackContext.Provider>
    </ModalPortal>
  );
}
FeedbackContent.displayName = 'Feedback.Content';

export interface FeedbackPanelProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** The well set into the shell: the title, the ✕ and the field. */
const FeedbackPanel = forwardRef<ViewRef, FeedbackPanelProps>(
  ({ className, children, ...props }, ref) => {
    const slots = feedbackVariants();
    return (
      <View
        ref={ref}
        className={cn(slots.panel(), 'gap-4 p-5', className)}
        style={{ borderRadius: PANEL_RADIUS }}
        {...props}
      >
        {textChildren(children)}
      </View>
    );
  }
);
FeedbackPanel.displayName = 'Feedback.Panel';

const FeedbackTitle = forwardRef<TextRef, TextProps>(
  ({ className, ...props }, ref) => {
    const slots = feedbackVariants();
    return <Text ref={ref} className={slots.title({ className })} {...props} />;
  }
);
FeedbackTitle.displayName = 'Feedback.Title';

export interface FeedbackCloseProps extends ViewProps {
  className?: string;
  /** How the ✕ announces itself. */
  label?: string;
  /** Runs instead of closing. Call `onOpenChange` yourself if you pass this. */
  onPress?: () => void;
}

/** The ✕ in the panel's corner. */
function FeedbackClose({
  className,
  label = 'Close',
  onPress,
  ...props
}: FeedbackCloseProps) {
  const { setOpen } = useFeedback('Feedback.Close');
  const slots = feedbackVariants();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={CLOSE_HIT_SLOP}
      pressScale={1}
      pressOpacity={0.55}
      onPress={onPress ?? (() => setOpen(false))}
      className={slots.close({ className })}
      style={{ top: 20, right: 20, width: CLOSE_SIZE, height: CLOSE_SIZE }}
      {...props}
    >
      <XIcon size={12} />
    </AnimatedPressable>
  );
}
FeedbackClose.displayName = 'Feedback.Close';

export interface FeedbackFieldProps
  extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  className?: string;
  /** The message. Leave unset to let the dialog hold it. */
  value?: string;
  onChangeText?: (value: string) => void;
  /** Room to write in before the field starts growing. */
  minHeight?: number;
}

/**
 * What is being written.
 *
 * No border and no background of its own: it is already inside a well, and an
 * outline drawn inside one is two edges making the same point.
 *
 * The caret is deliberately left to the platform. Every system draws its own
 * accent there, and a field that overrides it is a field that looks like it
 * belongs to a different phone.
 */
const FeedbackField = forwardRef<TextInputRef, FeedbackFieldProps>(
  (
    {
      className,
      value,
      onChangeText,
      minHeight = FIELD_MIN_HEIGHT,
      placeholder = 'Tell us what you think',
      style,
      ...props
    },
    ref
  ) => {
    const dialog = useFeedback('Feedback.Field');
    const slots = feedbackVariants();
    const text = value ?? dialog.value;

    return (
      <TextInput
        ref={ref}
        multiline
        textAlignVertical="top"
        placeholder={placeholder}
        value={text}
        onChangeText={(next) => {
          dialog.setValue(next);
          onChangeText?.(next);
        }}
        className={slots.field({ className })}
        style={[{ minHeight }, style]}
        {...props}
      />
    );
  }
);
FeedbackField.displayName = 'Feedback.Field';

export interface FeedbackFooterProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** The action row, in the band under the panel. */
const FeedbackFooter = forwardRef<ViewRef, FeedbackFooterProps>(
  ({ className, children, style, ...props }, ref) => {
    const slots = feedbackVariants();
    return (
      <View
        ref={ref}
        className={slots.footer({ className })}
        style={[{ marginTop: 16, marginHorizontal: FOOTER_INSET - SHELL_PADDING }, style]}
        {...props}
      >
        {children}
      </View>
    );
  }
);
FeedbackFooter.displayName = 'Feedback.Footer';

export interface FeedbackActionProps extends ViewProps {
  className?: string;
  labelClassName?: string;
  disabled?: boolean;
  onPress?: () => void;
  children?: ReactNode;
}

/** Shared body for the two buttons, so they can only differ in the ways they should. */
function Action({
  tone,
  className,
  labelClassName,
  disabled,
  onPress,
  children,
  ...props
}: FeedbackActionProps & { tone: 'cancel' | 'submit' }) {
  const slots = feedbackVariants({ tone, disabled: !!disabled });
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      pressScale={0.97}
      pressOpacity={0.9}
      onPress={onPress}
      className={slots.action({ className })}
      {...props}
    >
      {textChildren(children, (label) => (
        <Text className={slots.actionLabel({ className: labelClassName })}>{label}</Text>
      ))}
    </AnimatedPressable>
  );
}

/** Discards and closes. Give it `onPress` to do something else first. */
function FeedbackCancel({
  children = 'Cancel',
  onPress,
  ...props
}: FeedbackActionProps) {
  const { setOpen } = useFeedback('Feedback.Cancel');
  return (
    <Action tone="cancel" onPress={onPress ?? (() => setOpen(false))} {...props}>
      {children}
    </Action>
  );
}
FeedbackCancel.displayName = 'Feedback.Cancel';

export interface FeedbackSubmitProps extends FeedbackActionProps {
  /**
   * Hand the message to the caller. The dialog does not close itself here —
   * sending usually has to finish first, and a dialog that closed on the press
   * would take its own error message with it.
   */
  onSubmit?: (value: string) => void;
}

/** Sends. Inert while the field is empty. */
function FeedbackSubmit({
  children = 'Submit',
  disabled,
  onPress,
  onSubmit,
  ...props
}: FeedbackSubmitProps) {
  const { value } = useFeedback('Feedback.Submit');
  // Empty feedback is worse than none: it is sent by somebody who believes
  // they said something.
  const empty = value.trim().length === 0;
  return (
    <Action
      tone="submit"
      disabled={disabled ?? empty}
      onPress={() => {
        onPress?.();
        onSubmit?.(value);
      }}
      {...props}
    >
      {children}
    </Action>
  );
}
FeedbackSubmit.displayName = 'Feedback.Submit';

export const Feedback = Object.assign(FeedbackRoot, {
  Trigger: FeedbackTrigger,
  Content: FeedbackContent,
  Panel: FeedbackPanel,
  Title: FeedbackTitle,
  Close: FeedbackClose,
  Field: FeedbackField,
  Footer: FeedbackFooter,
  Cancel: FeedbackCancel,
  Submit: FeedbackSubmit,
});
