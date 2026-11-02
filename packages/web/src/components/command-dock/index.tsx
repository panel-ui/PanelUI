'use client';

/**
 * CommandDock — a small button that opens into a place to ask for something,
 * with the answer arriving under it a row at a time.
 *
 * ```tsx
 * <CommandDock onSubmit={ask}>
 *   <CommandDock.Trigger>Ask</CommandDock.Trigger>
 *   <CommandDock.Panel>
 *     <CommandDock.Input placeholder="What do you want to find?" />
 *     <CommandDock.Results>
 *       {rows.map((row) => (
 *         <CommandDock.Row key={row.id}>
 *           <CommandDock.RowTitle>{row.title}</CommandDock.RowTitle>
 *           <CommandDock.RowMeta>{row.where}</CommandDock.RowMeta>
 *         </CommandDock.Row>
 *       ))}
 *     </CommandDock.Results>
 *   </CommandDock.Panel>
 * </CommandDock>
 * ```
 *
 * ## One surface that opens
 *
 * The button and the panel are the same surface. Closed, it is a pill as
 * wide as its label. Opened, it widens, the label fades into a field in the
 * same place, and it grows downwards as rows arrive. Closing runs the same
 * steps backwards: the rows fold up, then it narrows. Nothing appears from
 * elsewhere, so it is clear what was pressed and where the answer belongs.
 *
 * ## It runs nothing
 *
 * The dock does not know where answers come from. `onSubmit` is handed what
 * was typed, and the rows are whatever you render. A row that mounts slides
 * in after the one before it, so rows added one by one read as an answer
 * being written, whether they come from a search, a model or a list you
 * already had.
 *
 * ## Closing
 *
 * Escape closes it and gives focus back to where it was, and so does a press
 * anywhere outside it.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type * as ReactTypes from 'react';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

const commandDockVariants = tv({
  slots: {
    root: 'relative flex w-full justify-center',
    /*
     * The widths are both real lengths, so the change between them can be
     * animated; `auto` cannot. The easing has no overshoot: a surface this
     * size that bounces as it closes reads as a mistake.
     */
    surface:
      'overflow-hidden border bg-card text-card-foreground shadow-sm transition-[width,border-radius,box-shadow] duration-[400ms] ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none',
    // The label keeps its row whether or not it can be seen, so the surface
    // is never shorter than one row and never jumps as the two trade places.
    trigger:
      'flex h-11 w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap px-4 text-sm font-medium outline-none transition-[opacity,background-color] duration-200 hover:bg-accent focus-visible:bg-accent [&_svg]:size-4 [&_svg]:shrink-0',
    // Pulled up over the label's row: the field sits exactly where the label
    // was, and the two fade through each other.
    panel: '-mt-11 flex flex-col',
    form: 'flex h-11 items-center gap-2 pe-1.5 ps-4 transition-opacity duration-200 motion-reduce:transition-none',
    input: 'h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground',
    submit:
      'inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground outline-none transition-[opacity,scale] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card active:scale-95 disabled:cursor-default disabled:opacity-30 [&_svg]:size-4',
    // Two rows of a grid, the second going from no height to its own, which
    // is how the panel grows to whatever the rows come to.
    results: 'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
    resultsClip: 'min-h-0 overflow-hidden',
    resultsInner: 'flex flex-col gap-0.5 border-t p-1.5',
    row: 'flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-[opacity,translate] duration-300 ease-out starting:translate-y-1.5 starting:opacity-0 motion-reduce:transition-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground',
    // A row's subject takes the room and truncates; its meta keeps its width.
    rowTitle: 'min-w-0 flex-1 truncate font-medium',
    rowMeta: 'shrink-0 text-muted-foreground',
    status: 'flex items-center gap-2 px-2.5 py-2 text-sm text-muted-foreground',
    dots: 'flex gap-1',
    dot: 'size-1 animate-pulse rounded-full bg-muted-foreground',
  },
  variants: {
    /*
     * Opening and closing are the same steps in opposite orders. Opening, the
     * surface widens and the rows follow it down. Closing, the rows fold up
     * first and the surface narrows after them, so what is seen is one thing
     * putting itself away and not two things changing at once.
     */
    open: {
      true: {
        // One length, not a width and a limit on it: a change of width is
        // animated from the width as written, and `100%` with a `max-width`
        // would start the closing from the full width of whatever it is in.
        surface: 'w-[min(100%,28rem)] rounded-3xl shadow-lg',
        trigger: 'pointer-events-none opacity-0',
        form: 'opacity-100 delay-150',
      },
      false: {
        surface: 'w-[var(--pu-closed)] rounded-[1.375rem] delay-200',
        trigger: 'opacity-100 delay-300',
        form: 'pointer-events-none opacity-0',
      },
    },
    filled: {
      true: { results: 'grid-rows-[1fr] delay-200' },
      false: { results: 'grid-rows-[0fr]' },
    },
    interactive: {
      true: { row: 'cursor-pointer hover:bg-accent focus-visible:bg-accent focus-visible:outline-none' },
    },
  },
});

interface CommandDockContextValue {
  open: boolean;
  setOpen(open: boolean): void;
  value: string;
  setValue(value: string): void;
  submit(): void;
  busy: boolean;
  panelId: string;
}

const CommandDockContext = createContext<CommandDockContextValue | null>(null);

function useDock(part: string): CommandDockContextValue {
  const dock = useContext(CommandDockContext);
  if (!dock) throw new Error(`${part} must be used inside a <CommandDock>.`);
  return dock;
}

export interface CommandDockProps extends Omit<ComponentProps<'div'>, 'onSubmit' | 'defaultValue'> {
  /** Whether it is open, when the caller holds that. */
  open?: boolean;
  /** Whether it starts open, when the caller does not. */
  defaultOpen?: boolean;
  /** Called when it opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** What is typed in the field, when the caller holds it. */
  value?: string;
  /** Called with what is typed, each time it changes. */
  onValueChange?: (value: string) => void;
  /** Called with what was typed when it is sent. */
  onSubmit?: (value: string) => void;
  /** While true, the field cannot be sent again and `CommandDock.Status` is shown. */
  busy?: boolean;
  /** How wide it is while closed, as a CSS length. */
  closedWidth?: string;
}

function CommandDockRoot({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  value: controlledValue,
  onValueChange,
  onSubmit,
  busy = false,
  closedWidth = '9rem',
  className,
  style,
  children,
  ...props
}: CommandDockProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [internalValue, setInternalValue] = useState('');
  const open = controlledOpen ?? internalOpen;
  const value = controlledValue ?? internalValue;
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const slots = commandDockVariants({ open });

  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange]
  );

  const setValue = useCallback(
    (next: string) => {
      if (controlledValue === undefined) setInternalValue(next);
      onValueChange?.(next);
    },
    [controlledValue, onValueChange]
  );

  const submit = useCallback(() => {
    const text = value.trim();
    if (text && !busy) onSubmit?.(text);
  }, [value, busy, onSubmit]);

  // A press outside closes it. Escape does too, and puts focus back on the
  // surface so the next key goes somewhere sensible.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !root.current?.contains(document.activeElement)) return;
      setOpen(false);
      requestAnimationFrame(() => root.current?.querySelector<HTMLElement>('[data-dock-trigger]')?.focus());
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, setOpen]);

  const context = useMemo(
    () => ({ open, setOpen, value, setValue, submit, busy, panelId }),
    [open, setOpen, value, setValue, submit, busy, panelId]
  );

  return (
    <CommandDockContext.Provider value={context}>
      <div ref={root} className={slots.root({ className })} {...props}>
        <div
          data-open={open ? '' : undefined}
          className={slots.surface()}
          style={{ ['--pu-closed' as string]: closedWidth, ...style }}
        >
          {children}
        </div>
      </div>
    </CommandDockContext.Provider>
  );
}
CommandDockRoot.displayName = 'CommandDock';

/** Keeps an element out of the tab order and the accessibility tree while it cannot be seen. */
function useInert<T extends HTMLElement>(inert: boolean) {
  const ref = useRef<T>(null);
  // Before anything else runs: the field asks for focus as the dock opens,
  // and an element inside something still inert cannot take it.
  useLayoutEffect(() => {
    // Set on the element, not passed as a prop: how a boolean `inert` prop is
    // written to the page differs between React versions.
    ref.current?.toggleAttribute('inert', inert);
  }, [inert]);
  return ref;
}

export interface CommandDockTriggerProps extends ComponentProps<'button'> {}

/** The closed form: a button that opens the dock. */
function CommandDockTrigger({ className, onClick, render, ...props }: CommandDockTriggerProps & RenderProp<'button'>) {
  const dock = useDock('CommandDock.Trigger');
  const ref = useInert<HTMLButtonElement>(dock.open);
  return useRender({
    defaultTagName: 'button',
    render,
    props: mergeProps(
      {
        ref: ref,
        type: 'button',
        'data-dock-trigger': '',
        'aria-expanded': dock.open,
        'aria-controls': dock.panelId,
        className: commandDockVariants({ open: dock.open }).trigger({ className }),
        onClick: (event: ReactTypes.MouseEvent<HTMLButtonElement>) => {
          onClick?.(event);
          if (!event.defaultPrevented) dock.setOpen(true);
        },
      },
      props
    ),
  });
}
CommandDockTrigger.displayName = 'CommandDock.Trigger';

export interface CommandDockPanelProps extends ComponentProps<'div'> {}

/** The open form: the field, and the rows under it. */
function CommandDockPanel({ className, render, ...props }: CommandDockPanelProps & RenderProp<'div'>) {
  const dock = useDock('CommandDock.Panel');
  // Kept in the page while closed, so it can be seen folding away. Inert, so
  // nothing in it can be reached while it cannot be seen.
  const ref = useInert<HTMLDivElement>(!dock.open);
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        ref: ref,
        id: dock.panelId,
        'data-open': dock.open ? '' : undefined,
        className: commandDockVariants().panel({ className }),
      },
      props
    ),
  });
}
CommandDockPanel.displayName = 'CommandDock.Panel';

export interface CommandDockInputProps extends Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
  /** What a screen reader calls the send button. */
  submitLabel?: string;
}

/** The field, with a button to send what is in it. Enter sends too. */
function CommandDockInput({
  className,
  submitLabel = 'Send',
  'aria-label': ariaLabel = 'Ask',
  ...props
}: CommandDockInputProps) {
  const dock = useDock('CommandDock.Input');
  const slots = commandDockVariants({ open: dock.open });
  const field = useRef<HTMLInputElement>(null);

  // It is opened in order to type in it. Asked for without scrolling: the
  // surface is still on its way to its size, and the page should not chase it.
  useEffect(() => {
    if (dock.open) field.current?.focus({ preventScroll: true });
  }, [dock.open]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    dock.submit();
  };

  return (
    <form role="search" className={slots.form()} onSubmit={send}>
      <input
        ref={field}
        type="text"
        aria-label={ariaLabel}
        value={dock.value}
        onChange={(event) => dock.setValue(event.target.value)}
        className={slots.input({ className })}
        {...props}
      />
      <button
        type="submit"
        aria-label={submitLabel}
        disabled={dock.busy || dock.value.trim() === ''}
        className={slots.submit()}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
    </form>
  );
}
CommandDockInput.displayName = 'CommandDock.Input';

export interface CommandDockResultsProps extends ComponentProps<'div'> {
  /** What a screen reader calls the list of rows. */
  label?: string;
}

/** Where the rows go. It takes no room until there is something in it. */
function CommandDockResults({
  className,
  label = 'Results',
  children,
  render,
  ...props
}: CommandDockResultsProps & RenderProp<'div'>) {
  const dock = useDock('CommandDock.Results');
  const rows = Array.isArray(children) ? children.flat().filter(Boolean).length : children ? 1 : 0;
  // Closed, it folds away whatever it holds.
  const filled = dock.open && (rows > 0 || dock.busy);
  const slots = commandDockVariants({ filled });
  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        role: 'list',
        'aria-label': label,
        'aria-live': 'polite',
        className: slots.resultsInner({ className }),
        children: <>{children}</>,
      },
      props
    ),
  });
  return (
    <div className={slots.results()}>
      <div className={slots.resultsClip()}>
        {/* Polite: rows are read as they arrive, without cutting in on typing. */}
        {element}
      </div>
    </div>
  );
}
CommandDockResults.displayName = 'CommandDock.Results';

export interface CommandDockRowProps extends ComponentProps<'div'> {
  /** Called when the row is pressed. Passing this makes the row a button. */
  onSelect?: () => void;
}

/** One row of the answer. It slides in when it is added. */
function CommandDockRow({ className, onSelect, children, render, ...props }: CommandDockRowProps & RenderProp<'div'>) {
  const slots = commandDockVariants({ interactive: onSelect !== undefined });
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        role: 'listitem',
        children: (
          <>
            {onSelect ? (
              <button
                type="button"
                onClick={onSelect}
                className={slots.row({ className: ['w-full text-start', className] })}
              >
                {children}
              </button>
            ) : (
              <div className={slots.row({ className })}>{children}</div>
            )}
          </>
        ),
      },
      props
    ),
  });
}
CommandDockRow.displayName = 'CommandDock.Row';

export interface CommandDockRowTitleProps extends ComponentProps<'span'> {}

/** What a row is, in a line that takes the row's spare width and truncates. */
function CommandDockRowTitle({ className, render, ...props }: CommandDockRowTitleProps & RenderProp<'span'>) {
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps(
      { 'data-slot': 'command-dock-row-title', className: commandDockVariants().rowTitle({ className }) },
      props
    ),
  });
}
CommandDockRowTitle.displayName = 'CommandDock.RowTitle';

export interface CommandDockRowMetaProps extends ComponentProps<'span'> {}

/** Something short at the end of a row, quieter than its title: a date, a place. */
function CommandDockRowMeta({ className, render, ...props }: CommandDockRowMetaProps & RenderProp<'span'>) {
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps(
      { 'data-slot': 'command-dock-row-meta', className: commandDockVariants().rowMeta({ className }) },
      props
    ),
  });
}
CommandDockRowMeta.displayName = 'CommandDock.RowMeta';

export interface CommandDockStatusProps extends ComponentProps<'div'> {
  children?: ReactNode;
}

/** Shown under the rows while `busy`: three dots, and words if you give it some. */
function CommandDockStatus({
  className,
  children = 'Working',
  render,
  ...props
}: CommandDockStatusProps & RenderProp<'div'>) {
  const slots = commandDockVariants();
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        role: 'status',
        className: slots.status({ className }),
        children: (
          <>
            <span aria-hidden="true" className={slots.dots()}>
              <span className={slots.dot()} />
              <span className={slots.dot({ className: '[animation-delay:150ms]' })} />
              <span className={slots.dot({ className: '[animation-delay:300ms]' })} />
            </span>
            {children}
          </>
        ),
      },
      props
    ),
  });
}
CommandDockStatus.displayName = 'CommandDock.Status';

export const CommandDock = Object.assign(CommandDockRoot, {
  Trigger: CommandDockTrigger,
  Panel: CommandDockPanel,
  Input: CommandDockInput,
  Results: CommandDockResults,
  Row: CommandDockRow,
  RowTitle: CommandDockRowTitle,
  RowMeta: CommandDockRowMeta,
  Status: CommandDockStatus,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export {
  CommandDockTrigger,
  CommandDockPanel,
  CommandDockInput,
  CommandDockResults,
  CommandDockRow,
  CommandDockRowTitle,
  CommandDockRowMeta,
  CommandDockStatus,
};
