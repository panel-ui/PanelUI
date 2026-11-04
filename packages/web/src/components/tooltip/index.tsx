'use client';

/**
 * Tooltip — a short hint about a control, shown while it is hovered or focused.
 *
 * ```tsx
 * <Tooltip.Provider>
 *   <Tooltip>
 *     <Tooltip.Trigger render={<Button variant="ghost" size="icon" aria-label="Bold" />}>
 *       <BoldIcon />
 *     </Tooltip.Trigger>
 *     <Tooltip.Content variant="shortcut">
 *       Bold <Tooltip.Shortcut keys={['⌘', 'B']} />
 *     </Tooltip.Content>
 *   </Tooltip>
 * </Tooltip.Provider>
 * ```
 *
 * ## Five looks
 *
 * `solid` is a small pill in the inverse of the page, for one or two words.
 * `outline` is the popover surface with a hairline edge, for a hint that
 * should sit quietly beside the content. `shortcut` sets the name and its
 * keys side by side on a frosted chip. `rich` is a small card with a title
 * and a line or two under it, for explaining what a control does. `tone`
 * tints it in a status colour with a dot, for a hint that is a warning or a
 * confirmation.
 *
 * ## Timing
 *
 * The first tooltip waits half a second, so passing over a toolbar does not
 * flash one at every button. Once one is open, moving to the next opens it at
 * once and without animating, so reading along a row of icons is quick. That
 * hand-off is the provider's job: put one `Tooltip.Provider` round a group of
 * tooltips, or round the app.
 *
 * ## Motion
 *
 * It grows out of its trigger, from 97% and transparent, in 125ms. Growing
 * from the trigger's side rather than its own centre keeps it attached to the
 * thing it is about.
 *
 * ## Not for anything that matters
 *
 * A tooltip cannot be reached on a touch screen and is easy to miss. Put
 * nothing in it that a person needs in order to use the page, and nothing
 * that can be pressed: for that, use a popover.
 */
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { createContext, useContext, type ComponentProps, type ReactNode } from 'react';
import { tv } from 'tailwind-variants';

export type TooltipVariant = 'solid' | 'outline' | 'shortcut' | 'rich' | 'tone';
export type TooltipTone = 'info' | 'success' | 'warning' | 'destructive';

const tooltipVariants = tv({
  slots: {
    positioner: 'z-50',
    popup: [
      'relative origin-(--transform-origin) outline-none',
      'transition-[opacity,scale] duration-[125ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
      'data-starting-style:scale-[0.97] data-starting-style:opacity-0 data-ending-style:scale-[0.97] data-ending-style:opacity-0',
      // A second tooltip opened while one is showing appears in place.
      'data-instant:transition-none motion-reduce:transition-none',
    ],
    // A square turned 45° and half hidden, so it can carry the popup's border.
    arrow: [
      'relative block h-1.5 w-3 overflow-clip',
      'data-[side=top]:-bottom-1.5 data-[side=top]:rotate-180',
      'data-[side=bottom]:-top-1.5',
      'data-[side=left]:-right-[9px] data-[side=left]:rotate-90',
      'data-[side=right]:-left-[9px] data-[side=right]:-rotate-90',
      "before:absolute before:bottom-0 before:left-1/2 before:size-[calc(6px*sqrt(2))] before:content-['']",
      'before:[transform:translate(-50%,50%)_rotate(45deg)]',
    ],
    title: 'font-medium',
    description: '',
    shortcut: 'ms-auto flex items-center gap-0.5 ps-2',
    key: 'inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] px-1 font-sans text-[0.6875rem] leading-none font-medium',
    dot: 'size-1.5 shrink-0 rounded-full bg-(--tooltip-tone)',
  },
  variants: {
    variant: {
      solid: {
        popup: 'max-w-64 rounded-md bg-foreground px-2 py-1 text-xs leading-4 font-medium text-background',
        arrow: 'before:bg-foreground',
        description: 'opacity-70',
        key: 'bg-background/15 text-background',
      },
      outline: {
        popup:
          'max-w-64 rounded-lg border bg-popover px-2.5 py-1.5 text-xs leading-4 text-popover-foreground shadow-md shadow-black/5',
        arrow: 'before:border before:bg-popover',
        description: 'text-muted-foreground',
        key: 'border bg-muted text-muted-foreground',
      },
      shortcut: {
        popup: [
          'flex max-w-72 items-center gap-1 rounded-lg border bg-popover/85 py-1 ps-2.5 pe-1 text-xs leading-5 text-popover-foreground',
          'shadow-lg shadow-black/10 backdrop-blur-md backdrop-saturate-150',
        ],
        arrow: 'hidden',
        description: 'text-muted-foreground',
        key: 'border border-b-2 bg-background text-foreground',
      },
      rich: {
        popup:
          'flex w-64 flex-col gap-1 rounded-xl border bg-popover p-3 text-[0.8125rem] leading-5 text-popover-foreground shadow-lg shadow-black/10',
        arrow: 'before:border before:bg-popover',
        title: 'text-sm text-foreground',
        description: 'text-muted-foreground',
        key: 'border bg-muted text-muted-foreground',
      },
      tone: {
        popup: [
          'flex max-w-72 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs leading-4 font-medium',
          'border-[color-mix(in_oklab,var(--tooltip-tone)_28%,var(--background))]',
          'bg-[color-mix(in_oklab,var(--tooltip-tone)_10%,var(--background))] dark:bg-[color-mix(in_oklab,var(--tooltip-tone)_18%,var(--background))]',
          'text-[color-mix(in_oklab,var(--tooltip-tone),var(--foreground)_35%)] shadow-md shadow-black/5',
        ],
        arrow: [
          'before:border before:border-[color-mix(in_oklab,var(--tooltip-tone)_28%,var(--background))]',
          'before:bg-[color-mix(in_oklab,var(--tooltip-tone)_10%,var(--background))] dark:before:bg-[color-mix(in_oklab,var(--tooltip-tone)_18%,var(--background))]',
        ],
        description: 'font-normal opacity-80',
        key: 'bg-background/60',
      },
    },
    tone: {
      info: { popup: '[--tooltip-tone:var(--info)]' },
      success: { popup: '[--tooltip-tone:var(--success)]' },
      warning: { popup: '[--tooltip-tone:var(--warning)]' },
      destructive: { popup: '[--tooltip-tone:var(--destructive)]' },
    },
  },
  defaultVariants: { variant: 'solid', tone: 'info' },
});

const TooltipLook = createContext<TooltipVariant>('solid');

export interface TooltipProviderProps extends BaseTooltip.Provider.Props {}

/**
 * Shares the timing between the tooltips inside it, so that once one is open
 * the next opens at once. Default `delay` 500ms, `closeDelay` 0.
 */
function TooltipProvider({ delay = 500, closeDelay = 0, ...props }: TooltipProviderProps) {
  return <BaseTooltip.Provider delay={delay} closeDelay={closeDelay} {...props} />;
}
TooltipProvider.displayName = 'Tooltip.Provider';

export type TooltipProps = BaseTooltip.Root.Props;

/** One tooltip: its trigger and its content. Takes `open`/`onOpenChange`, `defaultOpen` and `trackCursorAxis`. */
function TooltipRoot(props: TooltipProps) {
  return <BaseTooltip.Root {...props} />;
}
TooltipRoot.displayName = 'Tooltip';

export interface TooltipTriggerProps extends BaseTooltip.Trigger.Props {
  className?: string;
}

/** What the tooltip is about. A button unless `render` draws it as something else. */
function TooltipTrigger(props: TooltipTriggerProps) {
  return <BaseTooltip.Trigger data-slot="tooltip-trigger" {...props} />;
}
TooltipTrigger.displayName = 'Tooltip.Trigger';

export interface TooltipContentProps extends Omit<BaseTooltip.Popup.Props, 'children'> {
  /** Its look: `solid`, `outline`, `shortcut`, `rich` or `tone`. Default `solid`. */
  variant?: TooltipVariant;
  /** The status colour of a `tone` tooltip. Default `info`. */
  tone?: TooltipTone;
  /** Which side of the trigger it opens on. It moves to the other side where there is no room. Default `top`. */
  side?: BaseTooltip.Positioner.Props['side'];
  /** How it lines up with the trigger along that side. Default `center`. */
  align?: BaseTooltip.Positioner.Props['align'];
  /** The gap between the trigger and the tooltip, in pixels. Default `8`, or `6` without an arrow. */
  sideOffset?: number;
  /** Whether a small arrow points at the trigger. The `shortcut` look never has one. Default `true`. */
  arrow?: boolean;
  /** Where in the document it is put. Default `document.body`. */
  container?: BaseTooltip.Portal.Props['container'];
  className?: string;
  children?: ReactNode;
}

/** The hint itself, in a layer over the page. */
function TooltipContent({
  variant = 'solid',
  tone,
  side = 'top',
  align = 'center',
  sideOffset,
  arrow = true,
  container,
  className,
  children,
  ...props
}: TooltipContentProps) {
  const slots = tooltipVariants({ variant, tone });
  const pointed = arrow && variant !== 'shortcut';
  return (
    <BaseTooltip.Portal container={container}>
      <BaseTooltip.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset ?? (pointed ? 8 : 6)}
        collisionPadding={8}
        className={slots.positioner()}
      >
        <BaseTooltip.Popup
          data-slot="tooltip-content"
          data-variant={variant}
          className={slots.popup({ className })}
          {...props}
        >
          {pointed ? <BaseTooltip.Arrow data-slot="tooltip-arrow" className={slots.arrow()} /> : null}
          {variant === 'tone' ? <span aria-hidden="true" data-slot="tooltip-dot" className={slots.dot()} /> : null}
          <TooltipLook.Provider value={variant}>{children}</TooltipLook.Provider>
        </BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}
TooltipContent.displayName = 'Tooltip.Content';

export interface TooltipTitleProps extends ComponentProps<'p'> {}

/** The first line of a `rich` tooltip, in a heavier weight. */
function TooltipTitle({ className, ...props }: TooltipTitleProps) {
  const variant = useContext(TooltipLook);
  return <p data-slot="tooltip-title" className={tooltipVariants({ variant }).title({ className })} {...props} />;
}
TooltipTitle.displayName = 'Tooltip.Title';

export interface TooltipDescriptionProps extends ComponentProps<'p'> {}

/** Quieter words under the title, or after the label. */
function TooltipDescription({ className, ...props }: TooltipDescriptionProps) {
  const variant = useContext(TooltipLook);
  return (
    <p data-slot="tooltip-description" className={tooltipVariants({ variant }).description({ className })} {...props} />
  );
}
TooltipDescription.displayName = 'Tooltip.Description';

export interface TooltipShortcutProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** The keys, each drawn as a key cap: `['⌘', 'K']`. */
  keys: readonly string[];
}

/** The keys for the action, at the end of the line. It only shows them; handle the keys where the action lives. */
function TooltipShortcut({ keys, className, ...props }: TooltipShortcutProps) {
  const variant = useContext(TooltipLook);
  const slots = tooltipVariants({ variant });
  return (
    <span data-slot="tooltip-shortcut" className={slots.shortcut({ className })} {...props}>
      {keys.map((key, index) => (
        <kbd key={`${key}-${index}`} className={slots.key()}>
          {key}
        </kbd>
      ))}
    </span>
  );
}
TooltipShortcut.displayName = 'Tooltip.Shortcut';

export const Tooltip = Object.assign(TooltipRoot, {
  Provider: TooltipProvider,
  Trigger: TooltipTrigger,
  Content: TooltipContent,
  Title: TooltipTitle,
  Description: TooltipDescription,
  Shortcut: TooltipShortcut,
});

export { TooltipProvider, TooltipTrigger, TooltipContent, TooltipTitle, TooltipDescription, TooltipShortcut };
