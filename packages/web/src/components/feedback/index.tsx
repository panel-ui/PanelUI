'use client';

/**
 * Feedback — a dialog whose body is something to write in, and whose actions
 * sit in a band around it.
 *
 * ```tsx
 * <Feedback>
 *   <Feedback.Trigger>Send feedback</Feedback.Trigger>
 *   <Feedback.Content>
 *     <Feedback.Panel>
 *       <Feedback.Title>What should we fix first?</Feedback.Title>
 *       <Feedback.Close />
 *       <Feedback.Field placeholder="Tell us what got in your way" />
 *     </Feedback.Panel>
 *     <Feedback.Footer>
 *       <Feedback.Cancel />
 *       <Feedback.Submit onSubmit={send} />
 *     </Feedback.Footer>
 *   </Feedback.Content>
 * </Feedback>
 * ```
 *
 * ## The panel is a well
 *
 * A dialog that asks for a sentence has two jobs on screen at once: hold what
 * is being written, and offer the two things to do with it. Here the writing
 * surface is set into the dialog and the buttons sit in the band around it.
 * The recess says the field is the page and the rest is its frame, before a
 * word has been read. It is also why the field has no border of its own: an
 * outline inside a well is two edges making one point.
 *
 * ## Nothing is sent empty
 *
 * `Submit` is inert while the field is empty. A dialog that accepts an empty
 * answer produces empty feedback, from somebody who believes they said
 * something. Inert, it drops its fill instead of dimming it, because a tinted
 * accent pill still reads as the thing to press whatever its opacity.
 *
 * ## It does not close itself
 *
 * `Submit` hands the message to `onSubmit` and stays open. Sending has to
 * finish first, and a dialog that closed on the press would take its own error
 * message with it.
 */
import { Dialog } from '@base-ui/react/dialog';
import { ScrollArea } from '@base-ui/react/scroll-area';
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type * as ReactTypes from 'react';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

const feedbackVariants = tv({
  slots: {
    backdrop:
      'fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0',
    viewport: 'fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4',
    /*
     * The shell is the popover surface with black mixed into it. The well it
     * holds is the plain popover surface, so the shell is the darker of the
     * two in a light theme and in a dark one, which a step on a grey scale
     * could not promise: those run darker one way and lighter the other.
     *
     * The hairline ring is for a dark theme over a dimmed page, where the
     * shell and what is behind it are both nearly black and the band would
     * otherwise have no edge.
     *
     * 38 and 30 are one corner. The panel's radius is the shell's less the
     * 8px between them, which is what keeps the two curves concentric.
     */
    shell:
      'relative w-full max-w-sm rounded-[38px] bg-[color-mix(in_oklab,var(--popover),black_5%)] p-2 text-popover-foreground shadow-xl outline-none ring-1 ring-foreground/[0.06] dark:bg-[color-mix(in_oklab,var(--popover),black_14%)]',
    popup:
      'transition-[opacity,scale,translate] duration-200 ease-[cubic-bezier(0.2,0,0,1)] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:translate-y-2 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none',
    panel: 'relative flex flex-col gap-4 rounded-[30px] bg-popover p-5 shadow-xs',
    title: 'pe-9 text-[22px] font-semibold leading-7',
    // Drawn at 22px against the title's cap height; the `after` is the rest
    // of a 44px target, which a circle that size would not fit on the line.
    close:
      'absolute end-5 top-[23px] inline-flex size-[22px] cursor-pointer items-center justify-center rounded-full bg-foreground/10 text-muted-foreground outline-none transition-colors after:absolute after:-inset-[11px] hover:bg-foreground/15 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
    /*
     * The field never scrolls itself. It is always as tall as what is written
     * in it, and the area round it does the scrolling, which is what lets the
     * bar be a drawn one: a thin rounded thumb that shows while the pointer is
     * over the field or the text is moving, in place of the browser's own.
     */
    field:
      'block w-full resize-none overflow-hidden bg-transparent p-0 text-[17px] leading-6 text-foreground outline-none placeholder:text-muted-foreground',
    scroller: 'relative',
    scrollerViewport: 'rounded-[inherit] outline-none data-has-overflow-y:overscroll-y-contain',
    // Moved out into the well's padding, so it runs beside the text and not
    // over the ends of its lines.
    scrollbar:
      'my-1 -me-3.5 flex w-1.5 opacity-0 transition-opacity delay-300 data-hovering:opacity-100 data-hovering:delay-0 data-hovering:duration-100 data-scrolling:opacity-100 data-scrolling:delay-0 data-scrolling:duration-100',
    thumb: 'relative flex-1 rounded-full bg-foreground/20',
    // Body text in the well, set like what is written in the field.
    description: 'text-[17px] leading-6 text-muted-foreground',
    // A line under the field: how much is left to write, or what went wrong.
    message: 'text-sm tabular-nums',
    rating: 'flex flex-col justify-center gap-3',
    ratingScores: 'flex justify-between gap-2',
    ratingScore:
      'flex size-12 cursor-pointer items-center justify-center rounded-full bg-foreground/10 text-lg font-semibold transition-colors hover:bg-primary hover:text-primary-foreground',
    ratingEnds: 'flex justify-between text-sm text-muted-foreground',
    // Held in from the shell's edge further than the panel is. A row the full
    // width would read as a third edge of the dialog, not as two buttons.
    footer: 'flex items-center gap-3.5 px-[18px] pb-2.5 pt-4',
    action:
      'inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-full text-base outline-none transition-[scale,background-color] duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] motion-reduce:transition-none',
  },
  variants: {
    blur: {
      true: { backdrop: 'bg-black/20 backdrop-blur-md' },
    },
    tone: {
      /** The one that discards. A tint of the foreground, not a fill. */
      cancel: { action: 'bg-foreground/10 font-medium text-muted-foreground hover:bg-foreground/15' },
      /** The one that sends. Filled, and the only filled thing on the dialog. */
      submit: { action: 'bg-primary font-semibold text-primary-foreground hover:bg-primary/90' },
    },
    disabled: {
      true: { action: 'cursor-not-allowed active:scale-100' },
    },
    messageTone: {
      muted: { message: 'text-muted-foreground' },
      destructive: { message: 'text-destructive' },
    },
  },
  compoundVariants: [
    // Fainter than Cancel's own tint on purpose. Matched, they would read as
    // two Cancels, not as one live action and one that is not ready.
    {
      tone: 'submit',
      disabled: true,
      class: {
        action: 'bg-foreground/[0.04] font-medium text-muted-foreground/50 hover:bg-foreground/[0.04]',
      },
    },
    { tone: 'cancel', disabled: true, class: { action: 'opacity-45' } },
  ],
});

interface FeedbackContextValue {
  open: boolean;
  setOpen(open: boolean): void;
  /** What is in the field, so Submit can refuse to send nothing. */
  value: string;
  setValue(value: string): void;
  /** The send Submit would perform, for the field's keyboard shortcut. */
  submit: React.RefObject<(() => void) | null>;
  /** Set by `Feedback.Content`, so the parts inside know which elements to be. */
  inline: boolean;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

function useFeedback(part: string): FeedbackContextValue {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error(`${part} must be used inside a <Feedback>.`);
  return context;
}

export interface FeedbackProps {
  children?: ReactNode;
  /** Whether the dialog is open, when the caller holds that. */
  open?: boolean;
  /** Called when the dialog asks to open or close. */
  onOpenChange?: (open: boolean) => void;
  /** Whether it starts open, when the caller does not hold it. */
  defaultOpen?: boolean;
  /** The message, when the caller holds it. Leave unset to let the field keep it. */
  value?: string;
  /** The message to start with, when the caller does not hold it. */
  defaultValue?: string;
  /** Called with the message each time it changes. */
  onValueChange?: (value: string) => void;
  /**
   * Whether a click outside or the Escape key closes the dialog. Turn it off
   * for a message that would be lost by a stray click; Cancel and the close
   * button still work.
   */
  dismissible?: boolean;
}

function FeedbackRoot({
  children,
  open,
  onOpenChange,
  defaultOpen = false,
  value,
  defaultValue = '',
  onValueChange,
  dismissible = true,
}: FeedbackProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const resolvedOpen = open ?? internalOpen;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const resolvedValue = value ?? internalValue;
  const submit = useRef<(() => void) | null>(null);

  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [open, onOpenChange]
  );

  const setValue = useCallback(
    (next: string) => {
      if (value === undefined) setInternalValue(next);
      onValueChange?.(next);
    },
    [value, onValueChange]
  );

  const context = useMemo(
    () => ({ open: resolvedOpen, setOpen, value: resolvedValue, setValue, submit, inline: false }),
    [resolvedOpen, setOpen, resolvedValue, setValue]
  );

  return (
    <FeedbackContext.Provider value={context}>
      <Dialog.Root
        open={resolvedOpen}
        disablePointerDismissal={!dismissible}
        onOpenChange={(next, details) => {
          // The primitive has a switch for a press outside and none for
          // Escape, so that one is refused here.
          if (!next && !dismissible && details.reason === 'escape-key') return;
          setOpen(next);
        }}
      >
        {children}
      </Dialog.Root>
    </FeedbackContext.Provider>
  );
}
FeedbackRoot.displayName = 'Feedback';

export interface FeedbackTriggerProps extends Omit<ComponentProps<'button'>, 'children'> {
  children?: ReactNode;
  /**
   * Your own element to be the trigger, such as a styled button. It is given
   * the click handler and the attributes that tie it to the dialog.
   */
  render?: ReactElement;
}

/** What opens the dialog. A plain button unless `render` supplies one. */
function FeedbackTrigger({ render, children, ...props }: FeedbackTriggerProps) {
  return (
    <Dialog.Trigger render={render} {...props}>
      {children}
    </Dialog.Trigger>
  );
}
FeedbackTrigger.displayName = 'Feedback.Trigger';

export interface FeedbackContentProps extends Omit<ComponentProps<'div'>, 'children'> {
  children?: ReactNode;
  /**
   * Draw it in the page instead of over it: no backdrop, no trigger, always
   * there. For a feedback box that is part of the page, such as the end of an
   * article. `open` is ignored, and Cancel and the close button only report
   * through `onOpenChange`.
   */
  inline?: boolean;
  /** Frost the page behind the dialog instead of only dimming it. */
  blur?: boolean;
}

/** The shell: the darker band, and everything set in it. */
function FeedbackContent({ inline = false, blur = false, className, children, ...props }: FeedbackContentProps) {
  const feedback = useFeedback('Feedback.Content');
  const slots = feedbackVariants({ blur });
  const context = useMemo(() => ({ ...feedback, inline }), [feedback, inline]);

  if (inline) {
    return (
      <FeedbackContext.Provider value={context}>
        <div className={slots.shell({ className })} {...props}>
          {children}
        </div>
      </FeedbackContext.Provider>
    );
  }

  return (
    <Dialog.Portal>
      <Dialog.Backdrop className={slots.backdrop()} />
      <Dialog.Viewport className={slots.viewport()}>
        <Dialog.Popup className={slots.shell({ className: [slots.popup(), className] })} {...props}>
          {/* The popup is portalled out from under the provider, so the
              context is given again for the parts inside it. */}
          <FeedbackContext.Provider value={context}>{children}</FeedbackContext.Provider>
        </Dialog.Popup>
      </Dialog.Viewport>
    </Dialog.Portal>
  );
}
FeedbackContent.displayName = 'Feedback.Content';

export interface FeedbackPanelProps extends ComponentProps<'div'> {}

/** The well set into the shell: the title, the close button and the field. */
function FeedbackPanel({ className, render, ...props }: FeedbackPanelProps & RenderProp<'div'>) {
  const slots = feedbackVariants();
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ className: slots.panel({ className }) }, props),
  });
}
FeedbackPanel.displayName = 'Feedback.Panel';

export interface FeedbackTitleProps extends ComponentProps<'h2'> {}

/** The question. In a dialog it is also what the dialog is announced as. */
function FeedbackTitle({ className, ...props }: FeedbackTitleProps) {
  const { inline } = useFeedback('Feedback.Title');
  const slots = feedbackVariants();
  if (inline) return <h2 className={slots.title({ className })} {...props} />;
  return <Dialog.Title className={slots.title({ className })} {...props} />;
}
FeedbackTitle.displayName = 'Feedback.Title';

export interface FeedbackCloseProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** How the button announces itself to a screen reader. */
  label?: string;
}

/** The ✕ in the panel's corner. */
function FeedbackClose({
  label = 'Close',
  className,
  onClick,
  render,
  ...props
}: FeedbackCloseProps & RenderProp<'button'>) {
  const { setOpen } = useFeedback('Feedback.Close');
  const slots = feedbackVariants();
  return useRender({
    defaultTagName: 'button',
    render,
    props: mergeProps(
      {
        type: 'button',
        'aria-label': label,
        className: slots.close({ className }),
        onClick: (event: ReactTypes.MouseEvent<HTMLButtonElement>) => {
          onClick?.(event);
          if (!event.defaultPrevented) setOpen(false);
        },
        children: (
          <>
            <svg
              viewBox="0 0 10 10"
              aria-hidden="true"
              className="size-2.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M2 2l6 6M8 2l-6 6" />
            </svg>
          </>
        ),
      },
      props
    ),
  });
}
FeedbackClose.displayName = 'Feedback.Close';

export interface FeedbackFieldProps extends Omit<ComponentProps<'textarea'>, 'value' | 'defaultValue' | 'onChange'> {
  /** The message. Leave unset to let the dialog hold it. */
  value?: string;
  /** Called with the message each time it changes. */
  onValueChange?: (value: string) => void;
  /** Room to write in, in pixels, before the field starts to grow. */
  minHeight?: number;
  /** How tall the field may grow, in pixels, before the area round it scrolls. */
  maxHeight?: number;
}

/**
 * What is being written. No border and no background of its own: it is
 * already inside a well.
 */
function FeedbackField({
  value,
  onValueChange,
  minHeight = 200,
  maxHeight = 360,
  className,
  style,
  onKeyDown,
  ref,
  'aria-label': ariaLabel = 'Your message',
  ...props
}: FeedbackFieldProps) {
  const feedback = useFeedback('Feedback.Field');
  const slots = feedbackVariants();
  const field = useRef<HTMLTextAreaElement | null>(null);
  const text = value ?? feedback.value;

  // As tall as what is written, and never shorter than the room it starts
  // with. Measured with the height let go first, or a field that has grown
  // could never shrink.
  useLayoutEffect(() => {
    const node = field.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.max(minHeight, node.scrollHeight)}px`;
  }, [text, minHeight]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    // Enter makes a new line, as it does in any text box. Command or Control
    // with it sends, which is the shortcut for it everywhere else.
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      feedback.submit.current?.();
    }
  };

  return (
    <ScrollArea.Root className={slots.scroller()}>
      <ScrollArea.Viewport className={slots.scrollerViewport()} style={{ maxHeight }}>
        <ScrollArea.Content style={{ minWidth: 0 }}>
          <textarea
            ref={(node) => {
              field.current = node;
              if (typeof ref === 'function') ref(node);
              else if (ref) ref.current = node;
            }}
            aria-label={ariaLabel}
            value={text}
            onChange={(event) => {
              feedback.setValue(event.target.value);
              onValueChange?.(event.target.value);
            }}
            onKeyDown={handleKeyDown}
            className={slots.field({ className })}
            style={{ minHeight, ...style }}
            {...props}
          />
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation="vertical" className={slots.scrollbar()}>
        <ScrollArea.Thumb className={slots.thumb()} />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}
FeedbackField.displayName = 'Feedback.Field';

export interface FeedbackDescriptionProps extends ComponentProps<'p'> {}

/**
 * Body text in the panel, in place of the field: a thank-you once the message
 * has gone. In a dialog it is also what the dialog is described as.
 */
function FeedbackDescription({ className, ...props }: FeedbackDescriptionProps) {
  const { inline } = useFeedback('Feedback.Description');
  const slots = feedbackVariants();
  if (inline) return <p className={slots.description({ className })} {...props} />;
  return <Dialog.Description className={slots.description({ className })} {...props} />;
}
FeedbackDescription.displayName = 'Feedback.Description';

export interface FeedbackMessageProps extends ComponentProps<'p'> {
  /**
   * `muted` for a running note, read out politely as it changes: how much is
   * left to write. `destructive` for a failure, announced at once. Default
   * `muted`.
   */
  tone?: 'muted' | 'destructive';
}

/** A short line under the field. Figures in it keep their width as they change. */
function FeedbackMessage({ tone = 'muted', className, render, ...props }: FeedbackMessageProps & RenderProp<'p'>) {
  const slots = feedbackVariants({ messageTone: tone });
  return useRender({
    defaultTagName: 'p',
    render,
    props: mergeProps(
      {
        role: tone === 'destructive' ? 'alert' : undefined,
        'aria-live': tone === 'destructive' ? undefined : 'polite',
        className: slots.message({ className }),
      },
      props
    ),
  });
}
FeedbackMessage.displayName = 'Feedback.Message';

export interface FeedbackRatingProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** The highest score. The scores run from 1 to this. Default 5. */
  max?: number;
  /** Called with the score that was pressed. */
  onValueChange?: (value: number) => void;
  /** The word under the lowest score. */
  startLabel?: ReactNode;
  /** The word under the highest score. */
  endLabel?: ReactNode;
  /**
   * The least height it takes, in pixels. Match the field's `minHeight` on the
   * step that follows, so the dialog keeps its size between the two.
   */
  minHeight?: number;
}

/**
 * A row of round buttons, one per score, with a word under each end. Use it
 * as the first step of a dialog, and ask for the words once a score is in.
 */
function FeedbackRating({
  max = 5,
  onValueChange,
  startLabel,
  endLabel,
  minHeight,
  className,
  style,
  render,
  ...props
}: FeedbackRatingProps & RenderProp<'div'>) {
  const slots = feedbackVariants();
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        className: slots.rating({ className }),
        style: { minHeight, ...style },
        children: (
          <>
            <div className={slots.ratingScores()}>
              {Array.from({ length: max }, (_, index) => index + 1).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`${value} out of ${max}`}
                  onClick={() => onValueChange?.(value)}
                  className={slots.ratingScore()}
                >
                  {value}
                </button>
              ))}
            </div>
            {startLabel !== undefined || endLabel !== undefined ? (
              <div className={slots.ratingEnds()}>
                <span>{startLabel}</span>
                <span>{endLabel}</span>
              </div>
            ) : null}
          </>
        ),
      },
      props
    ),
  });
}
FeedbackRating.displayName = 'Feedback.Rating';

export interface FeedbackFooterProps extends ComponentProps<'div'> {}

/** The action row, in the band under the panel. */
function FeedbackFooter({ className, render, ...props }: FeedbackFooterProps & RenderProp<'div'>) {
  const slots = feedbackVariants();
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ className: slots.footer({ className }) }, props),
  });
}
FeedbackFooter.displayName = 'Feedback.Footer';

export interface FeedbackActionProps extends ComponentProps<'button'> {}

/** Discards and closes. Call `preventDefault` in `onClick` to keep it open. */
function FeedbackCancel({
  children = 'Cancel',
  className,
  disabled,
  onClick,
  render,
  ...props
}: FeedbackActionProps & RenderProp<'button'>) {
  const { setOpen } = useFeedback('Feedback.Cancel');
  const slots = feedbackVariants({ tone: 'cancel', disabled: !!disabled });
  return useRender({
    defaultTagName: 'button',
    render,
    props: mergeProps(
      {
        type: 'button',
        disabled: disabled,
        className: slots.action({ className }),
        onClick: (event: ReactTypes.MouseEvent<HTMLButtonElement>) => {
          onClick?.(event);
          if (!event.defaultPrevented) setOpen(false);
        },
        children: <>{children}</>,
      },
      props
    ),
  });
}
FeedbackCancel.displayName = 'Feedback.Cancel';

export interface FeedbackSubmitProps extends Omit<FeedbackActionProps, 'onSubmit'> {
  /**
   * Called with the message. The dialog stays open: close it yourself once
   * the message has been sent, so a failure still has somewhere to be shown.
   */
  onSubmit?: (value: string) => void;
}

/** Sends. Inert while the field is empty, unless `disabled` says otherwise. */
function FeedbackSubmit({
  children = 'Submit',
  className,
  disabled,
  onClick,
  onSubmit,
  render,
  ...props
}: FeedbackSubmitProps & RenderProp<'button'>) {
  const feedback = useFeedback('Feedback.Submit');
  // Empty feedback is worse than none: it is sent by somebody who believes
  // they said something.
  const inert = disabled ?? feedback.value.trim().length === 0;
  const slots = feedbackVariants({ tone: 'submit', disabled: inert });

  // What the field's shortcut calls. Kept current on every render, so it
  // sends what is in the field now and not what was there when it mounted.
  feedback.submit.current = inert ? null : () => onSubmit?.(feedback.value);

  return useRender({
    defaultTagName: 'button',
    render,
    props: mergeProps(
      {
        type: 'button',
        disabled: inert,
        className: slots.action({ className }),
        onClick: (event: ReactTypes.MouseEvent<HTMLButtonElement>) => {
          onClick?.(event);
          if (!event.defaultPrevented) onSubmit?.(feedback.value);
        },
        children: <>{children}</>,
      },
      props
    ),
  });
}
FeedbackSubmit.displayName = 'Feedback.Submit';

export const Feedback = Object.assign(FeedbackRoot, {
  Trigger: FeedbackTrigger,
  Content: FeedbackContent,
  Panel: FeedbackPanel,
  Title: FeedbackTitle,
  Close: FeedbackClose,
  Field: FeedbackField,
  Description: FeedbackDescription,
  Message: FeedbackMessage,
  Rating: FeedbackRating,
  Footer: FeedbackFooter,
  Cancel: FeedbackCancel,
  Submit: FeedbackSubmit,
});

/* The parts by name, for a Server Component, which cannot dot into a client
   module. `<FeedbackContent>` there is `<Feedback.Content>` everywhere else. */
export {
  FeedbackTrigger,
  FeedbackContent,
  FeedbackPanel,
  FeedbackTitle,
  FeedbackClose,
  FeedbackField,
  FeedbackDescription,
  FeedbackMessage,
  FeedbackRating,
  FeedbackFooter,
  FeedbackCancel,
  FeedbackSubmit,
};
