'use client';

/**
 * Dialog — a task taken out of the page and done in a box over it: renaming
 * something, inviting people, filling in a short form.
 *
 * ```tsx
 * <Dialog>
 *   <Dialog.Trigger render={<Button />}>Rename</Dialog.Trigger>
 *   <Dialog.Content>
 *     <Dialog.Header title="Rename board" description="Everyone on the board sees the new name." />
 *     <Dialog.Body>
 *       <Input defaultValue="Spring launch" aria-label="Name" />
 *     </Dialog.Body>
 *     <Dialog.Footer>
 *       <Dialog.Close render={<Button variant="secondary" />}>Cancel</Dialog.Close>
 *       <Button>Save</Button>
 *     </Dialog.Footer>
 *   </Dialog.Content>
 * </Dialog>
 * ```
 *
 * ## A panel in a band
 *
 * The task sits in a panel, and `Dialog.Footer` moves out of it into the
 * darker band underneath, where the buttons are equal pills: the same shape
 * as Feedback and Alert Dialog, so the three read as one family.
 * `variant="plain"` is a single surface with the footer ruled off at its
 * foot, for a dense form where the band would be one more edge.
 *
 * ## The middle scrolls
 *
 * The dialog is never taller than the screen. The header and footer stay
 * put and `Dialog.Body` scrolls between them, with a thin drawn thumb that
 * shows while it moves.
 *
 * ## Focus goes to the task
 *
 * The close button is drawn in the corner but comes last in the order, so
 * opening the dialog puts focus on its first field rather than on the way
 * out. A press outside, Escape or the close button dismiss it.
 *
 * ## Lists to choose from
 *
 * `Dialog.List` is a list of one-line choices for the body, such as a time
 * zone or a project to move something to: grouped under headings that stay
 * pinned while it scrolls, moved through with the arrow keys, with a check
 * on the chosen one. It opens scrolled to the chosen one.
 *
 * ## On a phone it sits low
 *
 * Under 640px wide it rests at the bottom of the screen, a few pixels clear
 * of the edges, where a thumb reaches its buttons.
 */
import { Dialog as Primitive } from '@base-ui/react/dialog';
import { ScrollArea } from '@base-ui/react/scroll-area';
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  type ComponentProps,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';

const dialogVariants = tv({
  slots: {
    backdrop:
      'fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none',
    viewport: 'fixed inset-0 z-50 grid place-items-center overflow-hidden p-4 max-sm:items-end max-sm:p-2',
    shell: [
      'relative flex max-h-[calc(100dvh-2rem)] w-full min-h-0 flex-col text-popover-foreground outline-none max-sm:max-h-[calc(100dvh-1rem)]',
      // A dialog opened from this one steps it back, smaller and veiled, so
      // the depth can be counted.
      'origin-top scale-[calc(1-0.05*var(--nested-dialogs,0))] translate-y-[calc(-0.75rem*var(--nested-dialogs,0))]',
      "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-black/0 after:transition-colors after:duration-200 after:content-[''] data-nested-dialog-open:after:bg-black/10 dark:data-nested-dialog-open:after:bg-black/30",
    ],
    popup:
      'transition-[opacity,scale,translate] duration-200 ease-[cubic-bezier(0.2,0,0,1)] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:translate-y-2 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none',
    panel: 'relative flex min-h-0 flex-1 flex-col',
    header: 'flex shrink-0 flex-col gap-1',
    title: 'text-[19px] font-semibold leading-6 tracking-[-0.01em]',
    description: 'text-[15px] leading-[22px] text-muted-foreground',
    body: [
      'relative flex min-h-0 flex-1 flex-col',
      // A hairline at an edge the content has been scrolled past, so what is
      // cut off reads as going under the header, not as stopping there.
      "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-20 before:h-px before:bg-border before:opacity-0 before:transition-opacity before:content-[''] data-overflow-y-start:before:opacity-100",
    ],
    bodyViewport: 'min-h-0 flex-1 overscroll-contain rounded-[inherit] outline-none',
    bodyContent: 'flex flex-col gap-4',
    scrollbar:
      'my-2 me-1 flex w-1.5 opacity-0 transition-opacity delay-300 data-hovering:opacity-100 data-hovering:delay-0 data-scrolling:opacity-100 data-scrolling:delay-0',
    thumb: 'relative flex-1 rounded-full bg-foreground/20',
    footer: [
      'flex shrink-0 items-center',
      // The footer sits on a tinted surface, and the secondary fill is a tint
      // too, so the button all but disappears into it. There it takes the
      // panel's own surface instead, which keeps it lighter than the band.
      '*:data-[variant=secondary]:bg-popover *:data-[variant=secondary]:shadow-xs',
      '*:data-[variant=secondary]:hover:not-disabled:bg-[color-mix(in_oklab,var(--popover),var(--foreground)_5%)]',
    ],
    close: [
      'absolute end-4 top-4 z-10 inline-flex size-8 cursor-pointer items-center justify-center rounded-full',
      'bg-muted text-muted-foreground outline-none transition-[background-color,color,scale] duration-150',
      'after:absolute after:-inset-1.5 hover:bg-foreground/10 hover:text-foreground active:scale-95',
      'focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none [&_svg]:size-4',
    ],
    // Pulled out by the rows' own padding, so a row's text lines up with the
    // header's, and no further: the scrollbar runs in the 12px left at each
    // side, and a heading or a row reaching into it shows through the thumb.
    list: '-mx-2 flex flex-col outline-none',
    listGroup: 'flex flex-col [&+&]:mt-2',
    listGroupLabel:
      'sticky top-0 z-10 bg-popover px-2 pb-1.5 pt-2 text-xs font-medium text-muted-foreground',
    listItem: [
      'flex h-10 shrink-0 cursor-pointer select-none items-center gap-3 rounded-xl px-2 text-sm outline-none',
      // Room for the pinned heading above it when the arrow keys scroll it into view.
      'scroll-mb-2 scroll-mt-10 transition-colors duration-100 hover:bg-foreground/[0.05]',
      'focus-visible:bg-foreground/[0.06] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60',
      'data-selected:bg-[color-mix(in_oklab,var(--primary)_9%,transparent)] data-selected:font-medium',
      'aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-transparent motion-reduce:transition-none',
    ],
    listItemLabel: 'min-w-0 flex-1 truncate',
    listItemMeta: 'shrink-0 text-xs font-normal tabular-nums text-muted-foreground',
    listItemCheck: 'flex size-4 shrink-0 items-center justify-center text-primary [&_svg]:size-4',
  },
  variants: {
    variant: {
      /*
       * The band is the popover surface with black mixed in, so it is the
       * darker of the two in either theme. 38 and 30 are one corner: the
       * panel's radius is the band's less the 8px between them.
       */
      inset: {
        shell:
          'rounded-[38px] bg-[color-mix(in_oklab,var(--popover),black_5%)] p-2 shadow-xl ring-1 ring-foreground/[0.06] dark:bg-[color-mix(in_oklab,var(--popover),black_14%)]',
        panel: 'overflow-hidden rounded-[30px] bg-popover shadow-xs',
        header: 'px-5 pb-3 pt-5',
        body: 'first:pt-5',
        bodyContent: 'px-5 pb-5',
        // Held in from the band's edge further than the panel is, with the
        // buttons as equal pills: a row of decisions, not a third edge.
        footer: 'gap-3 px-[10px] pb-0.5 pt-2.5 *:h-11 *:min-w-0 *:flex-1 *:rounded-full',
      },
      plain: {
        shell: 'overflow-hidden rounded-[28px] border bg-popover shadow-xl',
        header: 'px-6 pb-4 pt-6',
        body: 'first:pt-6',
        bodyContent: 'px-6 pb-6',
        footer: 'justify-end gap-2 border-t bg-muted/50 px-6 py-3.5',
      },
    },
    size: {
      sm: { shell: 'max-w-sm' },
      md: { shell: 'max-w-md' },
      lg: { shell: 'max-w-xl' },
    },
    blur: {
      true: { backdrop: 'bg-black/20 backdrop-blur-md' },
    },
  },
  defaultVariants: { variant: 'inset', size: 'md' },
});

interface DialogContextValue {
  /** Set by `Dialog.Content`. */
  inline: boolean;
  showClose: boolean;
  variant: 'inset' | 'plain';
}

const DialogContext = createContext<DialogContextValue>({ inline: false, showClose: true, variant: 'inset' });

export interface DialogProps {
  children?: ReactNode;
  /** Whether it is open, when the caller holds that. */
  open?: boolean;
  /** Whether it starts open, when the caller does not hold it. */
  defaultOpen?: boolean;
  /** Called when it opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /**
   * Whether a press outside it closes it. Turn it off while a form in it has
   * changes that would be lost; Escape and the close button still work.
   * Default `true`.
   */
  dismissible?: boolean;
}

function DialogRoot({
  children,
  open,
  defaultOpen,
  onOpenChange,
  dismissible = true,
}: DialogProps) {
  return (
    <Primitive.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange ? (next) => onOpenChange(next) : undefined}
      disablePointerDismissal={!dismissible}
    >
      {children}
    </Primitive.Root>
  );
}
DialogRoot.displayName = 'Dialog';

export interface DialogTriggerProps extends Omit<ComponentProps<'button'>, 'children'> {
  children?: ReactNode;
  /**
   * Your own element to be the trigger, such as a styled button. It is given
   * the click handler and the attributes that tie it to the dialog.
   */
  render?: ReactElement;
}

/** What opens the dialog. A plain button unless `render` supplies one. */
function DialogTrigger({ render, children, ...props }: DialogTriggerProps) {
  return (
    <Primitive.Trigger render={render} {...props}>
      {children}
    </Primitive.Trigger>
  );
}
DialogTrigger.displayName = 'Dialog.Trigger';

export interface DialogContentProps extends Omit<ComponentProps<'div'>, 'children'> {
  children?: ReactNode;
  /**
   * `inset` sets the task in a panel inside a darker band that holds the
   * footer. `plain` is one surface with the footer ruled off. Default `inset`.
   */
  variant?: 'inset' | 'plain';
  /** How wide it may grow: `sm` 24rem, `md` 28rem, `lg` 36rem. Default `md`. */
  size?: 'sm' | 'md' | 'lg';
  /** Show the round close button in the top trailing corner. Default `true`. */
  showClose?: boolean;
  /** Frost the page behind it instead of only dimming it. */
  blur?: boolean;
  /**
   * Draw it in the page instead of over it: no backdrop, no trigger, always
   * there. For previews; `open` is ignored.
   */
  inline?: boolean;
}

const isFooter = (child: ReactNode) => isValidElement(child) && child.type === DialogFooter;

/** The dialog itself, with the dimmed page behind it. */
function DialogContent({
  variant = 'inset',
  size = 'md',
  showClose = true,
  blur = false,
  inline = false,
  className,
  children,
  ...props
}: DialogContentProps) {
  const slots = dialogVariants({ variant, size, blur });
  const context = useMemo(() => ({ inline, showClose, variant }), [inline, showClose, variant]);

  // In the inset look the footer leaves the panel for the band under it.
  const all = Children.toArray(children);
  const footer = variant === 'inset' ? all.filter(isFooter) : [];
  const rest = variant === 'inset' ? all.filter((child) => !isFooter(child)) : all;
  const inside = (
    <DialogContext.Provider value={context}>
      <div data-slot="dialog-panel" className={slots.panel()}>
        {rest}
        {/* Last in the order, so focus starts on the task, not the way out. */}
        {showClose ? <DialogClose aria-label="Close" className={slots.close()} icon /> : null}
      </div>
      {footer}
    </DialogContext.Provider>
  );

  if (inline) {
    return (
      <div data-slot="dialog-content" data-variant={variant} className={slots.shell({ className })} {...props}>
        {inside}
      </div>
    );
  }

  return (
    <Primitive.Portal>
      <Primitive.Backdrop className={slots.backdrop()} />
      <Primitive.Viewport className={slots.viewport()}>
        <Primitive.Popup
          data-slot="dialog-content"
          data-variant={variant}
          className={slots.shell({ className: [slots.popup(), className] })}
          {...props}
        >
          {inside}
        </Primitive.Popup>
      </Primitive.Viewport>
    </Primitive.Portal>
  );
}
DialogContent.displayName = 'Dialog.Content';

export interface DialogHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** The heading. It is also what the dialog is announced as. */
  title?: ReactNode;
  /** A line under the heading. */
  description?: ReactNode;
}

/** The heading block. It leaves room for the close button beside the title. */
function DialogHeader({ title, description, className, children, ...props }: DialogHeaderProps) {
  const { showClose, variant } = useContext(DialogContext);
  const slots = dialogVariants({ variant });
  return (
    <div data-slot="dialog-header" className={slots.header({ className: [showClose && 'pe-14', className] })} {...props}>
      {title !== undefined ? <DialogTitle>{title}</DialogTitle> : null}
      {description !== undefined ? <DialogDescription>{description}</DialogDescription> : null}
      {children}
    </div>
  );
}
DialogHeader.displayName = 'Dialog.Header';

export interface DialogTitleProps extends ComponentProps<'h2'> {}

/** The dialog's name, announced when it opens. */
function DialogTitle({ className, ...props }: DialogTitleProps) {
  const { inline } = useContext(DialogContext);
  const slots = dialogVariants();
  if (inline) return <h2 data-slot="dialog-title" className={slots.title({ className })} {...props} />;
  return <Primitive.Title data-slot="dialog-title" className={slots.title({ className })} {...props} />;
}
DialogTitle.displayName = 'Dialog.Title';

export interface DialogDescriptionProps extends ComponentProps<'p'> {}

/** A sentence under the title, read out after it. */
function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  const { inline } = useContext(DialogContext);
  const slots = dialogVariants();
  if (inline) return <p data-slot="dialog-description" className={slots.description({ className })} {...props} />;
  return <Primitive.Description data-slot="dialog-description" className={slots.description({ className })} {...props} />;
}
DialogDescription.displayName = 'Dialog.Description';

export interface DialogBodyProps extends ComponentProps<'div'> {}

/**
 * The part that scrolls, between the header and the footer. Its children are
 * laid out in a column with a gap, so a form's fields need no wrapper.
 */
function DialogBody({ className, children, ...props }: DialogBodyProps) {
  const { variant } = useContext(DialogContext);
  const slots = dialogVariants({ variant });
  return (
    // With no header above it, it keeps the dialog's top padding itself.
    <ScrollArea.Root data-slot="dialog-body" className={slots.body()}>
      <ScrollArea.Viewport className={slots.bodyViewport()}>
        <ScrollArea.Content className={slots.bodyContent({ className })} {...props}>
          {children}
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation="vertical" className={slots.scrollbar()}>
        <ScrollArea.Thumb className={slots.thumb()} />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}
DialogBody.displayName = 'Dialog.Body';

export interface DialogFooterProps extends ComponentProps<'div'> {}

/**
 * The buttons. In the inset look they sit in the band under the panel as
 * equal pills; in `plain` they sit at the end of a ruled strip. Keep it a
 * direct child of `Dialog.Content`, so the band can find it.
 */
function DialogFooter({ className, ...props }: DialogFooterProps) {
  const { variant } = useContext(DialogContext);
  return <div data-slot="dialog-footer" className={dialogVariants({ variant }).footer({ className })} {...props} />;
}
DialogFooter.displayName = 'Dialog.Footer';

export interface DialogCloseProps extends ComponentProps<'button'> {
  /** Your own element to close the dialog with, such as a Cancel button. */
  render?: ReactElement;
  /** Draw the cross glyph. Set for you on the built-in close button. */
  icon?: boolean;
}

/** Closes the dialog. */
function DialogClose({
  render,
  icon = false,
  children,
  ...props
}: DialogCloseProps) {
  const { inline } = useContext(DialogContext);
  const content = icon ? (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ) : (
    children
  );
  if (inline) {
    return (
      <button type="button" data-slot="dialog-close" {...props}>
        {content}
      </button>
    );
  }
  return (
    <Primitive.Close data-slot="dialog-close" render={render} {...props}>
      {content}
    </Primitive.Close>
  );
}
DialogClose.displayName = 'Dialog.Close';

export interface DialogListProps extends ComponentProps<'div'> {}

/**
 * A list of one-line choices in the body. The arrow keys, Home and End move
 * between its items, and it opens scrolled to the selected one.
 */
function DialogList({ className, onKeyDown, children, ...props }: DialogListProps) {
  const list = useRef<HTMLDivElement>(null);
  const items = () =>
    [...(list.current?.querySelectorAll<HTMLElement>('[data-slot=dialog-list-item]:not([aria-disabled=true])') ?? [])];

  useEffect(() => {
    const all = items();
    const selected = all.find((item) => item.dataset.selected !== undefined);
    // One item takes Tab: the chosen one, or the first when none is.
    if (!selected && all[0]) all[0].tabIndex = 0;
    selected?.scrollIntoView({ block: 'center' });
  }, []);

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    const all = items();
    const index = all.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === 'ArrowDown'
        ? all[index < 0 ? 0 : Math.min(index + 1, all.length - 1)]
        : event.key === 'ArrowUp'
          ? all[Math.max(index - 1, 0)]
          : event.key === 'Home'
            ? all[0]
            : event.key === 'End'
              ? all[all.length - 1]
              : undefined;
    if (!next) return;
    event.preventDefault();
    next.focus();
  };

  return (
    <div ref={list} role="listbox" data-slot="dialog-list" className={dialogVariants().list({ className })} onKeyDown={move} {...props}>
      {children}
    </div>
  );
}
DialogList.displayName = 'Dialog.List';

export interface DialogListGroupProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** The heading over the group, which stays pinned while its items scroll under it. */
  label: ReactNode;
}

/** A run of items in `Dialog.List` under a heading of their own. */
function DialogListGroup({ label, className, children, ...props }: DialogListGroupProps) {
  const slots = dialogVariants();
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} data-slot="dialog-list-group" className={slots.listGroup({ className })} {...props}>
      <div id={id} className={slots.listGroupLabel()}>
        {label}
      </div>
      {children}
    </div>
  );
}
DialogListGroup.displayName = 'Dialog.ListGroup';

export interface DialogListItemProps extends Omit<ComponentProps<'div'>, 'onSelect'> {
  /** Whether it is the chosen one: it is tinted and checked. */
  selected?: boolean;
  /** Called when it is pressed, or chosen with Enter or Space. */
  onSelect?: () => void;
  /** Quieter text at its end, in figures that line up: a time, a count. */
  meta?: ReactNode;
  /** Shown, but cannot be chosen. */
  disabled?: boolean;
}

/** One choice in `Dialog.List`, on one line. */
function DialogListItem({
  selected = false,
  onSelect,
  meta,
  disabled = false,
  className,
  onClick,
  onKeyDown,
  children,
  ...props
}: DialogListItemProps) {
  const slots = dialogVariants();
  return (
    <div
      role="option"
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      tabIndex={selected ? 0 : -1}
      data-slot="dialog-list-item"
      data-selected={selected ? '' : undefined}
      className={slots.listItem({ className })}
      onClick={(event) => {
        onClick?.(event);
        if (!disabled) onSelect?.();
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
          event.preventDefault();
          onSelect?.();
        }
      }}
      {...props}
    >
      <span className={slots.listItemLabel()}>{children}</span>
      {meta !== undefined ? <span className={slots.listItemMeta()}>{meta}</span> : null}
      <span aria-hidden="true" className={slots.listItemCheck()}>
        {selected ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        ) : null}
      </span>
    </div>
  );
}
DialogListItem.displayName = 'Dialog.ListItem';

export const Dialog = Object.assign(DialogRoot, {
  Trigger: DialogTrigger,
  Content: DialogContent,
  Header: DialogHeader,
  Title: DialogTitle,
  Description: DialogDescription,
  Body: DialogBody,
  Footer: DialogFooter,
  Close: DialogClose,
  List: DialogList,
  ListGroup: DialogListGroup,
  ListItem: DialogListItem,
});

export {
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogClose,
  DialogList,
  DialogListGroup,
  DialogListItem,
};
