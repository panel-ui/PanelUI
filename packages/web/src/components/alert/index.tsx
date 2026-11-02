'use client';

/**
 * Alert — a message set into the page, which stays there until it has been
 * dealt with: a payment that failed, a trial running out, a form that needs
 * another look.
 *
 * ```tsx
 * <Alert tone="destructive">
 *   <Alert.Icon />
 *   <Alert.Title>Your payment did not go through</Alert.Title>
 *   <Alert.Description>The card ending 4242 was declined.</Alert.Description>
 *   <Alert.Actions>
 *     <Button size="sm">Update card</Button>
 *   </Alert.Actions>
 *   <Alert.Close />
 * </Alert>
 * ```
 *
 * ## A card in a tray of its tone
 *
 * By default the message is a card set into a tray tinted in its tone, and
 * the actions sit in the strip of tray left under the card. What the alert
 * says and what can be done about it are two surfaces, so a row of buttons
 * never crowds the sentence it answers. `plain` is a single tinted box, for
 * inside a form or a dialog that already draws an edge; `banner` is one line
 * across the top of a page or a panel.
 *
 * ## It folds away
 *
 * Closing it, with `Alert.Close` or `open`, folds it to no height instead of
 * removing it, so what is under it slides up rather than jumping. Nothing in
 * a closed alert can be focused.
 *
 * ## Interrupting is for trouble
 *
 * A `destructive` or `warning` alert is announced the moment it appears; the
 * others are read when the reader gets to them, because a note about a trial
 * should not cut across what a screen reader is in the middle of saying.
 */
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
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type * as ReactTypes from 'react';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

/** The theme role an alert is drawn in. */
export type AlertTone = 'neutral' | 'info' | 'success' | 'warning' | 'destructive';

/** `default` is the card in a tray, `plain` one tinted box, `banner` a strip across a page. */
export type AlertVariant = 'default' | 'plain' | 'banner';

/** The fold every opening and closing here uses, the one the Prompt's bands use. */
const FOLD =
  'grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none';

const alertVariants = tv({
  slots: {
    root: ['group/alert', FOLD],
    clip: 'min-h-0 overflow-hidden',
    /*
     * The tray. The card fills it, so its one hairline is the alert's only
     * edge; a rim of tint round the card read as a heavy frame. The tint
     * shows in the strip under the card when there are actions, and at the
     * card's lower corners, which round off over it.
     */
    tray: 'flex flex-col overflow-hidden rounded-[20px] border',
    /*
     * The parts are laid out by column, not by wrapper: the icon spans the
     * rows at the start, the words run down the middle, and the close button
     * holds the top of the end column. So the parts can be written in a flat
     * list and still land where they belong.
     */
    body: [
      'grid grid-cols-[auto_minmax(0,1fr)_auto] items-start text-sm',
      // 19px is the tray's 20 less its hairline: one corner, two curves.
      'group-data-[variant=default]/alert:rounded-[19px] group-data-[variant=default]/alert:bg-card group-data-[variant=default]/alert:px-3.5 group-data-[variant=default]/alert:py-3 group-data-[variant=default]/alert:text-card-foreground group-data-[variant=default]/alert:shadow-xs',
      'group-data-[variant=plain]/alert:rounded-2xl group-data-[variant=plain]/alert:border group-data-[variant=plain]/alert:px-3.5 group-data-[variant=plain]/alert:py-3',
      // One line: the parts sit in a row and wrap under each other when narrow.
      'group-data-[variant=banner]/alert:flex group-data-[variant=banner]/alert:flex-wrap group-data-[variant=banner]/alert:items-center group-data-[variant=banner]/alert:gap-x-3 group-data-[variant=banner]/alert:gap-y-1 group-data-[variant=banner]/alert:border-b group-data-[variant=banner]/alert:px-4 group-data-[variant=banner]/alert:py-2.5',
    ],
    icon: [
      'col-start-1 row-span-3 row-start-1 me-3 flex shrink-0 items-center justify-center text-[var(--pu-tone)] [&_svg]:shrink-0',
      // In the card the glyph sits in a disc of its tone, the alert's one patch of colour.
      'group-data-[variant=default]/alert:size-8 group-data-[variant=default]/alert:rounded-full group-data-[variant=default]/alert:bg-[color-mix(in_oklab,var(--pu-tone)_14%,transparent)] group-data-[variant=default]/alert:[&_svg:not([class*=size-])]:size-4',
      // Elsewhere it is the glyph alone, centred on the title's line.
      'group-data-[variant=plain]/alert:h-5 group-data-[variant=plain]/alert:[&_svg:not([class*=size-])]:size-4',
      'group-data-[variant=banner]/alert:me-0 group-data-[variant=banner]/alert:[&_svg:not([class*=size-])]:size-4',
    ],
    title: [
      'col-start-2 font-medium text-foreground',
      // Beside the disc, the first line of the title sits on the disc's middle,
      // and a title that wraps simply runs on below it.
      'leading-5 group-data-[variant=default]/alert:pt-1.5',
      // On its own it takes the line and wraps beside the icon; beside a description it keeps its width.
      'group-data-[variant=banner]/alert:min-w-0 group-data-[variant=banner]/alert:flex-1 group-data-[variant=banner]/alert:basis-40 group-data-[variant=banner]/alert:group-has-[[data-slot=alert-description]]/alert:flex-none',
    ],
    description: [
      'col-start-2 text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4',
      // Alone beside the disc its first line sits on the disc's middle, as a title's would.
      'group-data-[variant=default]/alert:pt-1.5 [[data-slot=alert-title]~&]:mt-0.5 group-data-[variant=default]/alert:[[data-slot=alert-title]~&]:pt-0',
      'group-data-[variant=banner]/alert:min-w-0 group-data-[variant=banner]/alert:flex-1 group-data-[variant=banner]/alert:basis-48',
    ],
    actions: [
      'flex flex-wrap items-center gap-2',
      // In the tray's strip, at its end: what can be done follows what was said.
      'group-data-[variant=default]/alert:justify-end group-data-[variant=default]/alert:p-2.5',
      'group-data-[variant=plain]/alert:col-start-2 group-data-[variant=plain]/alert:mt-2.5',
      'group-data-[variant=banner]/alert:ms-auto',
    ],
    close: [
      'relative col-start-3 row-start-1 ms-2 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none',
      'transition-[background-color,color,scale] duration-150 after:absolute after:-inset-1.5 hover:bg-foreground/10 hover:text-foreground active:scale-95',
      'focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none [&_svg]:size-3.5',
      'group-data-[variant=default]/alert:-me-1 group-data-[variant=default]/alert:mt-0.5',
      'group-data-[variant=plain]/alert:-me-1 group-data-[variant=plain]/alert:-mt-1',
      'group-data-[variant=banner]/alert:-me-1.5',
    ],
    details: 'col-start-2 mt-2 flex flex-col',
    detailsToggle: [
      'inline-flex w-fit cursor-pointer items-center gap-1 rounded-md font-medium text-foreground outline-none',
      'transition-colors hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring',
    ],
    detailsChevron: 'size-4 transition-transform duration-200 motion-reduce:transition-none',
    detailsList: 'flex flex-col gap-1.5 pt-2',
    item: [
      'relative ps-4 text-muted-foreground',
      // A dot in the tone, centred on the first line of the item.
      "before:absolute before:start-1 before:top-[0.5lh] before:size-1.5 before:-translate-y-1/2 before:rounded-full before:bg-[var(--pu-tone)] before:content-['']",
    ],
  },
  variants: {
    tone: {
      neutral: { root: '[--pu-tone:var(--muted-foreground)]' },
      info: { root: '[--pu-tone:var(--info)]' },
      success: { root: '[--pu-tone:var(--success)]' },
      warning: { root: '[--pu-tone:var(--warning)]' },
      destructive: { root: '[--pu-tone:var(--destructive)]' },
    },
    variant: {
      default: {},
      plain: {},
      banner: {},
    },
    shown: {
      true: { root: 'grid-rows-[1fr] opacity-100' },
      false: { root: 'grid-rows-[0fr] opacity-0' },
    },
  },
  compoundVariants: [
    // The tray takes a little of the tone into the muted surface; neutral is the muted surface itself.
    { variant: 'default', tone: 'neutral', className: { tray: 'bg-muted' } },
    {
      variant: 'default',
      tone: ['info', 'success', 'warning', 'destructive'],
      className: {
        tray: 'border-[color-mix(in_oklab,var(--pu-tone)_30%,var(--border))] bg-[color-mix(in_oklab,var(--pu-tone)_10%,var(--muted))]',
      },
    },
    { variant: 'plain', tone: 'neutral', className: { body: 'bg-muted/50' } },
    {
      variant: 'plain',
      tone: ['info', 'success', 'warning', 'destructive'],
      className: {
        body: 'border-[color-mix(in_oklab,var(--pu-tone)_28%,var(--border))] bg-[color-mix(in_oklab,var(--pu-tone)_6%,var(--background))]',
      },
    },
    { variant: 'banner', tone: 'neutral', className: { body: 'bg-muted' } },
    {
      variant: 'banner',
      tone: ['info', 'success', 'warning', 'destructive'],
      className: {
        body: 'border-[color-mix(in_oklab,var(--pu-tone)_24%,var(--border))] bg-[color-mix(in_oklab,var(--pu-tone)_10%,var(--background))]',
      },
    },
  ],
  defaultVariants: { tone: 'neutral', variant: 'default', shown: true },
});

interface AlertContextValue {
  tone: AlertTone;
  setOpen(open: boolean): void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

function useAlert(part: string): AlertContextValue {
  const alert = useContext(AlertContext);
  if (!alert) throw new Error(`${part} must be used inside an <Alert>.`);
  return alert;
}

export interface AlertProps extends ComponentProps<'div'> {
  /** The theme role it is drawn in, which also says how urgent it is. Default `neutral`. */
  tone?: AlertTone;
  /**
   * `default` sets the message in a card inside a tray of its tone, with the
   * actions in the tray under it. `plain` is one tinted box, for inside a form
   * or a dialog. `banner` is one line across the top of a page or panel.
   */
  variant?: AlertVariant;
  /** Whether it is shown, when the caller holds that. It folds away when it is not. */
  open?: boolean;
  /** Whether it starts shown, when the caller does not hold it. Default `true`. */
  defaultOpen?: boolean;
  /** Called when `Alert.Close` asks for it to close. */
  onOpenChange?: (open: boolean) => void;
}

const isActions = (child: ReactNode) => isValidElement(child) && child.type === AlertActions;

function AlertRoot({
  tone = 'neutral',
  variant = 'default',
  open,
  defaultOpen = true,
  onOpenChange,
  role,
  className,
  children,
  ...props
}: AlertProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const shown = open ?? internalOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [open, onOpenChange]
  );
  const clip = useRef<HTMLDivElement>(null);
  // Nothing in a closed alert can be reached. Set on the element: how React
  // writes a boolean `inert` differs between versions.
  useEffect(() => {
    clip.current?.toggleAttribute('inert', !shown);
  }, [shown]);

  const slots = alertVariants({ tone, variant, shown });
  const context = useMemo(() => ({ tone, setOpen }), [tone, setOpen]);

  // In the tray the actions leave the card for the strip under it.
  const all = Children.toArray(children);
  const actions = variant === 'default' ? all.filter(isActions) : [];
  const rest = variant === 'default' ? all.filter((child) => !isActions(child)) : all;

  const body = (
    <div data-slot="alert-body" className={slots.body()}>
      {rest}
    </div>
  );

  return (
    <AlertContext.Provider value={context}>
      <div
        data-slot="alert"
        data-tone={tone}
        data-variant={variant}
        data-open={shown ? '' : undefined}
        role={role ?? (tone === 'destructive' || tone === 'warning' ? 'alert' : 'status')}
        className={slots.root({ className })}
        {...props}
      >
        <div ref={clip} className={slots.clip()}>
          {variant === 'default' ? (
            <div data-slot="alert-tray" className={slots.tray()}>
              {body}
              {actions}
            </div>
          ) : (
            body
          )}
        </div>
      </div>
    </AlertContext.Provider>
  );
}
AlertRoot.displayName = 'Alert';

/* The glyph each tone draws when `Alert.Icon` is given none of its own. */
const GLYPHS: Record<AlertTone, ReactNode> = {
  neutral: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.5h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.5h.01" />
    </>
  ),
  success: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </>
  ),
  warning: (
    <>
      <path d="M10.3 4.2 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4M12 17h.01" />
    </>
  ),
  destructive: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5M12 16h.01" />
    </>
  ),
};

export interface AlertIconProps extends ComponentProps<'span'> {}

/** The glyph at the start, in the tone's colour. Without children it draws the tone's own. */
function AlertIcon({ className, children, render, ...props }: AlertIconProps & RenderProp<'span'>) {
  const { tone } = useAlert('Alert.Icon');
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps(
      {
        'data-slot': 'alert-icon',
        'aria-hidden': 'true',
        className: alertVariants().icon({ className }),
        children: (
          <>
            {children ?? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {GLYPHS[tone]}
              </svg>
            )}
          </>
        ),
      },
      props
    ),
  });
}
AlertIcon.displayName = 'Alert.Icon';

export interface AlertTitleProps extends ComponentProps<'div'> {}

/** What happened, in a few words. */
function AlertTitle({ className, render, ...props }: AlertTitleProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'alert-title', className: alertVariants().title({ className }) }, props),
  });
}
AlertTitle.displayName = 'Alert.Title';

export interface AlertDescriptionProps extends ComponentProps<'div'> {}

/** The sentence under the title: why, and what follows from it. A link in it is underlined. */
function AlertDescription({ className, render, ...props }: AlertDescriptionProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      { 'data-slot': 'alert-description', className: alertVariants().description({ className }) },
      props
    ),
  });
}
AlertDescription.displayName = 'Alert.Description';

export interface AlertActionsProps extends ComponentProps<'div'> {}

/**
 * The buttons. In the default variant they sit in the tray under the card, at
 * its end; in `plain` under the words; in `banner` at the end of the line.
 * Keep it a direct child of `Alert`, so the tray can find it.
 */
function AlertActions({ className, render, ...props }: AlertActionsProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'alert-actions', className: alertVariants().actions({ className }) }, props),
  });
}
AlertActions.displayName = 'Alert.Actions';

export interface AlertCloseProps extends ComponentProps<'button'> {}

/** A round cross at the end that folds the alert away. */
function AlertClose({
  className,
  onClick,
  'aria-label': label = 'Dismiss',
  render,
  ...props
}: AlertCloseProps & RenderProp<'button'>) {
  const { setOpen } = useAlert('Alert.Close');
  return useRender({
    defaultTagName: 'button',
    render,
    props: mergeProps(
      {
        type: 'button',
        'data-slot': 'alert-close',
        'aria-label': label,
        className: alertVariants().close({ className }),
        onClick: (event: ReactTypes.MouseEvent<HTMLButtonElement>) => {
          onClick?.(event);
          if (!event.defaultPrevented) setOpen(false);
        },
        children: (
          <>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </>
        ),
      },
      props
    ),
  });
}
AlertClose.displayName = 'Alert.Close';

export interface AlertDetailsProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** The line that opens the list: "Show the 3 fields". */
  label: ReactNode;
  /** Whether the list is open, when the caller holds that. */
  open?: boolean;
  /** Whether the list starts open, when the caller does not hold it. Default `false`. */
  defaultOpen?: boolean;
  /** Called when the line is pressed to open or close the list. */
  onOpenChange?: (open: boolean) => void;
}

/**
 * A line under the description that opens into a list of `Alert.Item`s, for
 * an alert that sums up several things: the fields a form still needs, the
 * files an upload skipped.
 */
function AlertDetails({
  label,
  open,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
  render,
  ...props
}: AlertDetailsProps & RenderProp<'div'>) {
  useAlert('Alert.Details');
  const slots = alertVariants();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const expanded = open ?? internalOpen;
  const listId = useId();
  const clip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    clip.current?.toggleAttribute('inert', !expanded);
  }, [expanded]);

  const toggle = () => {
    if (open === undefined) setInternalOpen(!expanded);
    onOpenChange?.(!expanded);
  };

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'alert-details',
        'data-open': expanded ? '' : undefined,
        className: slots.details({ className }),
        children: (
          <>
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={listId}
              onClick={toggle}
              className={slots.detailsToggle()}
            >
              {label}
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={slots.detailsChevron({ className: expanded ? 'rotate-180' : undefined })}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div className={[FOLD, expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] opacity-0'].join(' ')}>
              <div ref={clip} className="min-h-0 overflow-hidden">
                <ul id={listId} className={slots.detailsList()}>
                  {children}
                </ul>
              </div>
            </div>
          </>
        ),
      },
      props
    ),
  });
}
AlertDetails.displayName = 'Alert.Details';

export interface AlertItemProps extends ComponentProps<'li'> {}

/** One entry in `Alert.Details`, marked with a dot in the alert's tone. */
function AlertItem({ className, render, ...props }: AlertItemProps & RenderProp<'li'>) {
  return useRender({
    defaultTagName: 'li',
    render,
    props: mergeProps({ 'data-slot': 'alert-item', className: alertVariants().item({ className }) }, props),
  });
}
AlertItem.displayName = 'Alert.Item';

export const Alert = Object.assign(AlertRoot, {
  Icon: AlertIcon,
  Title: AlertTitle,
  Description: AlertDescription,
  Actions: AlertActions,
  Close: AlertClose,
  Details: AlertDetails,
  Item: AlertItem,
});

export { AlertIcon, AlertTitle, AlertDescription, AlertActions, AlertClose, AlertDetails, AlertItem };
