'use client';

/**
 * AlertDialog — a question that has to be answered before anything else on
 * the page can be done: delete this, discard that, sign out everywhere.
 *
 * ```tsx
 * <AlertDialog>
 *   <AlertDialog.Trigger render={<Button variant="destructive" />}>Delete project</AlertDialog.Trigger>
 *   <AlertDialog.Content tone="destructive">
 *     <AlertDialog.Title>Delete Orchard?</AlertDialog.Title>
 *     <AlertDialog.Description>Its 14 boards and their history go with it.</AlertDialog.Description>
 *     <AlertDialog.Footer>
 *       <AlertDialog.Cancel />
 *       <AlertDialog.Action onClick={remove}>Delete project</AlertDialog.Action>
 *     </AlertDialog.Footer>
 *   </AlertDialog.Content>
 * </AlertDialog>
 * ```
 *
 * ## A press outside is Cancel
 *
 * A press anywhere outside the dialog, Escape and `AlertDialog.Cancel` all
 * close it without doing anything; an action closes it once it has done its
 * work. `dismissible={false}` takes the outside press away, for a question
 * that should not be waved off by a stray click. While an action is running,
 * nothing closes it.
 *
 * ## The question, then the answers
 *
 * It is drawn as a panel in a darker band, the way Feedback is: the panel
 * holds the question, and `AlertDialog.Footer` moves out of it into the band
 * underneath, where the answers sit side by side at equal widths. Neither
 * answer is made to look like the default by being bigger.
 *
 * ## Actions that take time, or nerve
 *
 * An action whose `onClick` returns a promise shows a spinner and keeps the
 * dialog open, and unclosable, until the promise settles: closed if it
 * resolved, still open if it failed, so the failure can be shown in it.
 * `hold` makes an action one that must be pressed and held while a fill
 * runs across it, for a step that cannot be undone.
 */
// The dialog primitive rather than the alert-dialog one, which refuses every
// press outside; the role is still `alertdialog`, set on the popup.
import { Dialog as Primitive } from '@base-ui/react/dialog';
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { Button, type ButtonProps } from '../button';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

/** The theme role the dialog's media is drawn in, which also sets its action's default colour. */
export type AlertDialogTone = 'neutral' | 'info' | 'success' | 'warning' | 'destructive';

const alertDialogVariants = tv({
  slots: {
    backdrop:
      'fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none',
    viewport: 'fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4',
    /*
     * The band is the popover surface with black mixed in, so it is the
     * darker of the two in a light theme and a dark one alike. 38 and 30 are
     * one corner: the panel's radius is the band's less the 8px between them.
     */
    shell:
      'relative flex w-full flex-col rounded-[38px] bg-[color-mix(in_oklab,var(--popover),black_5%)] p-2 text-popover-foreground shadow-xl outline-none ring-1 ring-foreground/[0.06] dark:bg-[color-mix(in_oklab,var(--popover),black_14%)]',
    popup:
      'transition-[opacity,scale,translate] duration-200 ease-[cubic-bezier(0.2,0,0,1)] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:translate-y-2 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none',
    panel: 'flex flex-col gap-2 rounded-[30px] bg-popover p-5 shadow-xs',
    media: [
      'mb-2 flex size-12 shrink-0 items-center justify-center rounded-full',
      'bg-[color-mix(in_oklab,var(--pu-tone)_14%,transparent)] text-[var(--pu-tone)] [&_svg:not([class*=size-])]:size-6',
    ],
    title: 'text-[19px] font-semibold leading-6 tracking-[-0.01em]',
    description: 'text-[15px] leading-[22px] text-muted-foreground',
    // Held in from the band's edge further than the panel is, so the row of
    // answers does not read as a third edge of the dialog.
    footer: 'flex items-center gap-3 px-[18px] pb-2.5 pt-4',
    action: 'relative isolate h-11 min-w-0 flex-1 overflow-hidden rounded-full px-4 text-[15px]',
    // Drawn under the label and over the button's own fill, from the start edge.
    fill: 'pointer-events-none absolute inset-0 -z-10 origin-left scale-x-0 bg-[color-mix(in_oklab,currentColor_24%,transparent)] rtl:origin-right',
  },
  variants: {
    palette: {
      neutral: { shell: '[--pu-tone:var(--muted-foreground)]' },
      info: { shell: '[--pu-tone:var(--info)]' },
      success: { shell: '[--pu-tone:var(--success)]' },
      warning: { shell: '[--pu-tone:var(--warning)]' },
      destructive: { shell: '[--pu-tone:var(--destructive)]' },
    },
    size: {
      default: { shell: 'max-w-md' },
      // Narrow, so the question is centred over the two answers.
      sm: { shell: 'max-w-xs', panel: 'items-center text-center' },
    },
    blur: {
      true: { backdrop: 'bg-black/20 backdrop-blur-md' },
    },
    /** How much an answer asks to be pressed: filled, or a tint of its colour. */
    weight: {
      solid: {},
      soft: {},
    },
    actionTone: {
      primary: {},
      destructive: {},
      neutral: {},
    },
  },
  compoundVariants: [
    {
      weight: 'soft',
      actionTone: 'primary',
      className: {
        action:
          'bg-foreground/10 text-foreground hover:not-disabled:bg-foreground/15 hover:not-disabled:text-foreground',
      },
    },
    {
      weight: 'soft',
      actionTone: 'neutral',
      className: {
        action:
          'bg-foreground/10 text-muted-foreground hover:not-disabled:bg-foreground/15 hover:not-disabled:text-foreground',
      },
    },
    {
      weight: 'soft',
      actionTone: 'destructive',
      className: {
        action:
          'bg-[color-mix(in_oklab,var(--destructive)_12%,transparent)] text-destructive hover:not-disabled:bg-[color-mix(in_oklab,var(--destructive)_18%,transparent)] hover:not-disabled:text-destructive',
      },
    },
  ],
  defaultVariants: { palette: 'neutral', size: 'default' },
});

interface AlertDialogContextValue {
  open: boolean;
  setOpen(open: boolean): void;
  /** An action is running; nothing may close the dialog until it settles. */
  busy: boolean;
  setBusy(busy: boolean): void;
  tone: AlertDialogTone;
  /** Set by `AlertDialog.Content`. */
  inline: boolean;
}

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null);

function useAlertDialog(part: string): AlertDialogContextValue {
  const context = useContext(AlertDialogContext);
  if (!context) throw new Error(`${part} must be used inside an <AlertDialog>.`);
  return context;
}

export interface AlertDialogProps {
  children?: ReactNode;
  /** Whether it is open, when the caller holds that. */
  open?: boolean;
  /** Whether it starts open, when the caller does not hold it. */
  defaultOpen?: boolean;
  /** Called when it opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /**
   * Called once it has finished opening or closing, after its transition has
   * ended. `false` means the exit is over, so a dialog mounted from state can
   * be unmounted.
   */
  onOpenChangeComplete?: (open: boolean) => void;
  /** Whether a press outside it closes it, as Cancel would. Escape always does. Default `true`. */
  dismissible?: boolean;
}

function AlertDialogRoot({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  onOpenChangeComplete,
  dismissible = true,
}: AlertDialogProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const resolvedOpen = open ?? internalOpen;
  const [busy, setBusy] = useState(false);
  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [open, onOpenChange]
  );
  const context = useMemo<AlertDialogContextValue>(
    () => ({ open: resolvedOpen, setOpen, busy, setBusy, tone: 'neutral', inline: false }),
    [resolvedOpen, setOpen, busy]
  );

  return (
    <AlertDialogContext.Provider value={context}>
      <Primitive.Root
        open={resolvedOpen}
        disablePointerDismissal={!dismissible}
        onOpenChangeComplete={onOpenChangeComplete}
        onOpenChange={(next) => {
          // While an action runs, the answer is already being acted on.
          if (!next && busy) return;
          setOpen(next);
        }}
      >
        {children}
      </Primitive.Root>
    </AlertDialogContext.Provider>
  );
}
AlertDialogRoot.displayName = 'AlertDialog';

export interface AlertDialogTriggerProps extends Omit<ComponentProps<'button'>, 'children'> {
  children?: ReactNode;
  /**
   * Your own element to be the trigger, such as a styled button. It is given
   * the click handler and the attributes that tie it to the dialog.
   */
  render?: ReactElement;
}

/** What opens the dialog. A plain button unless `render` supplies one. */
function AlertDialogTrigger({ render, children, ...props }: AlertDialogTriggerProps) {
  return (
    <Primitive.Trigger render={render} {...props}>
      {children}
    </Primitive.Trigger>
  );
}
AlertDialogTrigger.displayName = 'AlertDialog.Trigger';

export interface AlertDialogContentProps extends Omit<ComponentProps<'div'>, 'children'> {
  children?: ReactNode;
  /**
   * The theme role it is drawn in: the colour of `AlertDialog.Media`, and of
   * an action that is not given its own. `destructive` makes the action red.
   * Default `neutral`.
   */
  tone?: AlertDialogTone;
  /** `sm` is narrower, with the question centred over the answers. Default `default`. */
  size?: 'default' | 'sm';
  /** Frost the page behind the dialog instead of only dimming it. */
  blur?: boolean;
  /**
   * Draw it in the page instead of over it: no backdrop, no trigger, always
   * there. For previews; `open` is ignored.
   */
  inline?: boolean;
}

const isFooter = (child: ReactNode) => isValidElement(child) && child.type === AlertDialogFooter;

/** The dialog: the panel with the question, in a band that holds the answers. */
function AlertDialogContent({
  tone = 'neutral',
  size = 'default',
  blur = false,
  inline = false,
  className,
  children,
  ...props
}: AlertDialogContentProps) {
  const dialog = useAlertDialog('AlertDialog.Content');
  const slots = alertDialogVariants({ palette: tone, size, blur });
  const context = useMemo(() => ({ ...dialog, tone, inline }), [dialog, tone, inline]);

  // The footer leaves the panel for the band under it.
  const all = Children.toArray(children);
  const footer = all.filter(isFooter);
  const inside = (
    <AlertDialogContext.Provider value={context}>
      <div data-slot="alert-dialog-panel" className={slots.panel()}>
        {all.filter((child) => !isFooter(child))}
      </div>
      {footer}
    </AlertDialogContext.Provider>
  );

  if (inline) {
    return (
      <div data-slot="alert-dialog-content" data-tone={tone} className={slots.shell({ className })} {...props}>
        {inside}
      </div>
    );
  }

  return (
    <Primitive.Portal>
      <Primitive.Backdrop className={slots.backdrop()} />
      <Primitive.Viewport className={slots.viewport()}>
        <Primitive.Popup
          role="alertdialog"
          data-slot="alert-dialog-content"
          data-tone={tone}
          className={slots.shell({ className: [slots.popup(), className] })}
          {...props}
        >
          {inside}
        </Primitive.Popup>
      </Primitive.Viewport>
    </Primitive.Portal>
  );
}
AlertDialogContent.displayName = 'AlertDialog.Content';

export interface AlertDialogMediaProps extends ComponentProps<'div'> {}

/** A glyph in a disc of the dialog's tone, above the title. */
function AlertDialogMedia({ className, render, ...props }: AlertDialogMediaProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'alert-dialog-media',
        'aria-hidden': 'true',
        className: alertDialogVariants().media({ className }),
      },
      props
    ),
  });
}
AlertDialogMedia.displayName = 'AlertDialog.Media';

export interface AlertDialogTitleProps extends ComponentProps<'h2'> {}

/** The question. It is what the dialog is announced as. */
function AlertDialogTitle({ className, ...props }: AlertDialogTitleProps) {
  const { inline } = useAlertDialog('AlertDialog.Title');
  const slots = alertDialogVariants();
  if (inline) return <h2 data-slot="alert-dialog-title" className={slots.title({ className })} {...props} />;
  return <Primitive.Title data-slot="alert-dialog-title" className={slots.title({ className })} {...props} />;
}
AlertDialogTitle.displayName = 'AlertDialog.Title';

export interface AlertDialogDescriptionProps extends ComponentProps<'p'> {}

/** What follows from each answer, read out after the title. */
function AlertDialogDescription({ className, ...props }: AlertDialogDescriptionProps) {
  const { inline } = useAlertDialog('AlertDialog.Description');
  const slots = alertDialogVariants();
  if (inline) return <p data-slot="alert-dialog-description" className={slots.description({ className })} {...props} />;
  return (
    <Primitive.Description
      data-slot="alert-dialog-description"
      className={slots.description({ className })}
      {...props}
    />
  );
}
AlertDialogDescription.displayName = 'AlertDialog.Description';

export interface AlertDialogFooterProps extends ComponentProps<'div'> {}

/**
 * The answers, side by side at equal widths in the band under the panel.
 * Keep it a direct child of `AlertDialog.Content`, so the band can find it.
 */
function AlertDialogFooter({ className, render, ...props }: AlertDialogFooterProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      { 'data-slot': 'alert-dialog-footer', className: alertDialogVariants().footer({ className }) },
      props
    ),
  });
}
AlertDialogFooter.displayName = 'AlertDialog.Footer';

export interface AlertDialogCancelProps extends Omit<ButtonProps, 'variant' | 'size'> {}

/** Closes the dialog without doing anything. It reads "Cancel" unless given children. */
function AlertDialogCancel({ className, children = 'Cancel', disabled, ...props }: AlertDialogCancelProps) {
  const dialog = useAlertDialog('AlertDialog.Cancel');
  const slots = alertDialogVariants({ weight: 'soft', actionTone: 'neutral' });
  const button = (
    <Button
      variant="ghost"
      data-slot="alert-dialog-cancel"
      disabled={disabled || dialog.busy}
      className={slots.action({ className })}
      {...props}
    />
  );
  if (dialog.inline) return <Button {...button.props}>{children}</Button>;
  return <Primitive.Close render={button}>{children}</Primitive.Close>;
}
AlertDialogCancel.displayName = 'AlertDialog.Cancel';

export interface AlertDialogActionProps extends Omit<ButtonProps, 'variant' | 'size' | 'onClick'> {
  /**
   * What it does. When it returns a promise, the button shows a spinner and
   * the dialog stays open, and cannot be closed, until it settles: it closes
   * when the promise resolves and stays open when it rejects. Call
   * `event.preventDefault()` to keep the dialog open after a plain handler.
   */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void | Promise<unknown>;
  /** Its colour. Default: `destructive` in a destructive dialog, `primary` otherwise. */
  tone?: 'primary' | 'destructive';
  /** `solid` is filled; `soft` is a tint of its colour, for an answer that is not the main one. Default `solid`. */
  variant?: 'solid' | 'soft';
  /**
   * Makes it an action that must be pressed and held, for this many
   * milliseconds, while a fill runs across it. Letting go early drains the
   * fill. Space and Enter can be held the same way.
   */
  hold?: number;
}

/** Holding starts on a press and ends on a release; a click on its own does nothing. */
function useHold(duration: number | undefined, onDone: () => void) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  // When the last press or key went down, so a click that no press preceded,
  // as a screen reader sends, can be told apart.
  const pressedAt = useRef(0);
  const done = useRef(onDone);
  done.current = onDone;

  const stop = useCallback(() => {
    window.clearTimeout(timer.current);
    setHolding(false);
  }, []);
  const start = useCallback(() => {
    if (duration === undefined) return;
    pressedAt.current = Date.now();
    window.clearTimeout(timer.current);
    setHolding(true);
    timer.current = window.setTimeout(() => {
      setHolding(false);
      done.current();
    }, duration);
  }, [duration]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return {
    holding,
    pressed: () => Date.now() - pressedAt.current < (duration ?? 0) + 1000,
    handlers:
      duration === undefined
        ? {}
        : {
            onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
              if (event.button === 0) start();
            },
            onPointerUp: stop,
            onPointerLeave: stop,
            onPointerCancel: stop,
            onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
              if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
                // Enter would click at once; the hold decides instead.
                event.preventDefault();
                start();
              }
            },
            onKeyUp: (event: KeyboardEvent<HTMLButtonElement>) => {
              if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault();
                stop();
              }
            },
            onContextMenu: (event: MouseEvent<HTMLButtonElement>) => event.preventDefault(),
          },
  };
}

/** Does what the dialog asks about, then closes it. */
function AlertDialogAction({
  onClick,
  tone,
  variant = 'solid',
  hold,
  loading,
  disabled,
  className,
  children,
  ...props
}: AlertDialogActionProps) {
  const dialog = useAlertDialog('AlertDialog.Action');
  const resolvedTone = tone ?? (dialog.tone === 'destructive' ? 'destructive' : 'primary');
  const slots = alertDialogVariants({ weight: variant, actionTone: resolvedTone });
  const [pending, setPending] = useState(false);
  const hintId = useId();

  const run = (event: MouseEvent<HTMLButtonElement>) => {
    const result = onClick?.(event);
    if (event.defaultPrevented) return;
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      setPending(true);
      dialog.setBusy(true);
      (result as Promise<unknown>).then(
        () => {
          setPending(false);
          dialog.setBusy(false);
          dialog.setOpen(false);
        },
        () => {
          setPending(false);
          dialog.setBusy(false);
        }
      );
      return;
    }
    dialog.setOpen(false);
  };

  // A hold that completes acts as a click on the button would.
  const button = useRef<HTMLButtonElement>(null);
  const confirmed = useRef(false);
  const { holding, pressed, handlers } = useHold(hold, () => {
    confirmed.current = true;
    button.current?.click();
  });

  return (
    <Button
      ref={button}
      data-slot="alert-dialog-action"
      data-holding={holding ? '' : undefined}
      variant={variant === 'solid' ? (resolvedTone === 'destructive' ? 'destructive' : 'default') : 'ghost'}
      loading={loading || pending}
      disabled={disabled || (dialog.busy && !pending)}
      aria-describedby={hold !== undefined ? hintId : undefined}
      className={slots.action({ className })}
      {...handlers}
      onClick={(event) => {
        if (hold !== undefined) {
          const wasHeld = confirmed.current;
          confirmed.current = false;
          // A click no press or key preceded comes from assistive technology,
          // which cannot hold; it confirms. Any other click must be a hold.
          if (!wasHeld && pressed()) return;
        }
        run(event);
      }}
      {...props}
    >
      {hold !== undefined ? (
        <>
          <span
            aria-hidden="true"
            data-slot="alert-dialog-action-fill"
            className={slots.fill({ className: holding ? 'scale-x-100' : undefined })}
            style={{
              transitionProperty: 'scale, transform',
              transitionDuration: holding ? `${hold}ms` : '250ms',
              transitionTimingFunction: holding ? 'linear' : 'cubic-bezier(0.2,0,0,1)',
            }}
          />
          <span id={hintId} className="sr-only">
            Press and hold to confirm
          </span>
        </>
      ) : null}
      {children}
    </Button>
  );
}
AlertDialogAction.displayName = 'AlertDialog.Action';

export const AlertDialog = Object.assign(AlertDialogRoot, {
  Trigger: AlertDialogTrigger,
  Content: AlertDialogContent,
  Media: AlertDialogMedia,
  Title: AlertDialogTitle,
  Description: AlertDialogDescription,
  Footer: AlertDialogFooter,
  Cancel: AlertDialogCancel,
  Action: AlertDialogAction,
});

export {
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
};
