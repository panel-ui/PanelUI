'use client';

/**
 * NavigationMenu — a site's top-level destinations, with panels that open from them.
 *
 * ```tsx
 * <NavigationMenu aria-label="Main">
 *   <NavigationMenu.List>
 *     <NavigationMenu.Item>
 *       <NavigationMenu.Link href="/docs" active>Docs</NavigationMenu.Link>
 *     </NavigationMenu.Item>
 *     <NavigationMenu.Item>
 *       <NavigationMenu.Trigger>More</NavigationMenu.Trigger>
 *       <NavigationMenu.Content>…</NavigationMenu.Content>
 *     </NavigationMenu.Item>
 *   </NavigationMenu.List>
 * </NavigationMenu>
 * ```
 *
 * ## One surface
 *
 * The panel is not a second box that appears under the bar. In `island` and
 * `dock` it is the bar, grown: the popup sits under the bar, the same colour
 * and the same corners, and opens from a clip shaped exactly like the bar to
 * the panel's full size. Closing it runs the same shape back. Its contents
 * come in a beat behind the surface, each one a little after the last, so the
 * eye reads the growth first and the contents second.
 *
 * `bar` is the ordinary header: the panel hangs below the triggers and
 * travels between them, resizing to each one's content and sliding it in
 * from the side the pointer came from, so moving across the triggers never
 * closes and reopens it.
 *
 * ## The highlight
 *
 * A soft pill rests on the current destination and follows the pointer or
 * focus across the others, so the bar always shows one place: where you are,
 * or where you are about to go.
 *
 * ## Built on
 *
 * Base UI's NavigationMenu supplies the triggers, hover intent, keyboard
 * model, focus return and the size variables the popup animates through.
 * This file draws it.
 */
import { NavigationMenu as BaseNavigationMenu } from '@base-ui/react/navigation-menu';
import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';

/** How the menu is drawn: a floating pill, a full header, or a dock. */
export type NavigationMenuVariant = 'island' | 'bar' | 'dock';
/** A theme role for a card's icon tile. */
export type NavigationMenuTone = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'destructive';

const EASE = 'ease-[cubic-bezier(0.32,0.72,0,1)]';

const navigationMenuVariants = tv({
  slots: {
    root: 'group/navigation-menu relative isolate flex min-w-0 text-foreground',
    bar: [
      'relative z-10 flex max-w-full min-w-0 items-center',
      `transition-[background-color,box-shadow] duration-300 ${EASE} motion-reduce:transition-none`,
    ],
    // Scrolls sideways when the bar is wider than the screen, with room kept
    // for focus rings at its edges.
    list: [
      'relative -m-0.5 flex min-w-0 list-none items-center gap-0.5 overflow-x-auto overscroll-x-contain p-0.5',
      '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
      // Overflowing, its edges fade, so a clipped word reads as more to scroll to.
      'data-overflow:[mask-image:linear-gradient(to_right,transparent,black_1rem,black_calc(100%-1rem),transparent)]',
    ],
    highlight: [
      'pointer-events-none absolute top-0.5 left-0 z-0 m-0 list-none h-[calc(100%-0.25rem)] rounded-full bg-foreground/[0.08]',
      'translate-x-(--navigation-menu-highlight-x) w-(--navigation-menu-highlight-w) opacity-(--navigation-menu-highlight-o)',
      `transition-[translate,width,opacity] duration-300 ${EASE} motion-reduce:transition-none`,
      'data-instant:transition-none',
    ],
    item: 'relative z-10 m-0 list-none',
    link: [
      'group/link relative flex h-9 cursor-pointer items-center gap-2 rounded-full px-3.5 text-sm font-medium whitespace-nowrap outline-none select-none',
      'text-muted-foreground transition-colors duration-150 hover:text-foreground',
      'data-active:text-foreground data-popup-open:text-foreground',
      'focus-visible:ring-2 focus-visible:ring-ring',
      '[&_svg]:size-4 [&_svg]:shrink-0',
    ],
    linkLabel: '',
    trigger: '',
    chevron: [
      'flex size-3.5 items-center justify-center text-muted-foreground transition-transform duration-300 data-popup-open:rotate-180',
      `${EASE} motion-reduce:transition-none [&_svg]:size-3.5`,
    ],
    positioner: [
      'z-0 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width)',
      `transition-[top,left,right,bottom] duration-[350ms] ${EASE} data-instant:transition-none motion-reduce:transition-none`,
    ],
    popup: [
      'relative h-(--popup-height) w-(--popup-width) origin-(--transform-origin) bg-popover text-popover-foreground outline-none',
      `transition-[width,height,clip-path,opacity,scale] duration-[420ms] ${EASE} motion-reduce:transition-none`,
    ],
    viewport: 'relative size-full overflow-hidden rounded-[inherit]',
    // A soft sheen from the top edge, so the panel reads as lit from where it grew.
    sheen: [
      'pointer-events-none absolute inset-x-0 top-0 h-40 rounded-t-[inherit]',
      'bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--foreground)_5%,transparent),transparent)]',
    ],
    // The outer box keeps clear of the bar; the inner one is the layout, and
    // takes the className.
    content: [
      'group/content w-max max-w-[min(var(--available-width),40rem)]',
      `transition-[opacity,translate] duration-[350ms] ${EASE} motion-reduce:transition-none`,
      'data-starting-style:opacity-0 data-ending-style:opacity-0',
      'data-starting-style:data-[activation-direction=left]:-translate-x-1/4 data-starting-style:data-[activation-direction=right]:translate-x-1/4',
      'data-ending-style:data-[activation-direction=left]:translate-x-1/4 data-ending-style:data-[activation-direction=right]:-translate-x-1/4',
    ],
    contentInner: [
      // At least as wide as the panel, which is never narrower than the bar.
      'flex min-w-full flex-col gap-2 p-2',
      // Each child arrives a beat after the one before it, out of a short blur.
      '*:transition-[opacity,filter,translate] *:duration-500 *:ease-out motion-reduce:*:transition-none',
      'group-data-starting-style/content:*:translate-y-1 group-data-starting-style/content:*:opacity-0 group-data-starting-style/content:*:blur-[6px]',
      'motion-reduce:group-data-starting-style/content:*:blur-none',
      '[&>:nth-child(2)]:delay-[40ms] [&>:nth-child(3)]:delay-[80ms] [&>:nth-child(4)]:delay-[120ms] [&>:nth-child(5)]:delay-[160ms]',
      '[&>:nth-child(6)]:delay-[200ms] [&>:nth-child(7)]:delay-[240ms] [&>:nth-child(n+8)]:delay-[280ms]',
      'group-data-ending-style/content:*:delay-0 group-data-ending-style/content:*:duration-150',
    ],
    brand: [
      'flex shrink-0 items-center gap-2 rounded-full pe-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring',
    ],
    brandMark: [
      'flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground text-background',
      '[&_img]:size-full [&_img]:object-cover [&_svg]:size-4.5',
    ],
    actions: 'flex shrink-0 items-center gap-1',
    // Washed with its tone from the tile's corner, so each card carries its
    // own colour without a coloured border or background.
    card: [
      'group/card relative isolate flex min-h-[4.5rem] cursor-pointer items-center gap-3.5 overflow-hidden rounded-[20px] p-3 pe-5 text-start outline-none',
      'bg-foreground/[0.045] ring-1 ring-foreground/[0.04] ring-inset',
      'transition-[background-color,box-shadow] duration-200 hover:bg-foreground/[0.07] hover:ring-foreground/[0.08]',
      'focus-visible:ring-2 focus-visible:ring-ring data-active:bg-foreground/[0.07]',
    ],
    cardWash: [
      'pointer-events-none absolute inset-0 -z-10',
      'bg-[radial-gradient(120%_160%_at_0%_0%,color-mix(in_oklab,var(--navigation-menu-tone)_24%,transparent),transparent_62%)]',
      'opacity-80 transition-opacity duration-200 group-hover/card:opacity-100 motion-reduce:transition-none',
    ],
    cardMedia: 'flex size-12 shrink-0 items-center justify-center rounded-[14px] [&_svg]:size-5.5',
    cardBody: 'flex min-w-0 flex-1 flex-col gap-0.5',
    cardEyebrow: 'truncate text-[13px] leading-4 text-muted-foreground',
    cardTitle: 'truncate text-[15px] leading-5 font-semibold text-foreground',
    cardArrow: [
      'size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover/card:translate-x-0.5',
      'rtl:-scale-x-100 rtl:group-hover/card:-translate-x-0.5',
    ],
    group: 'm-0 flex list-none flex-col gap-0.5 p-0',
    groupLabel: 'px-2.5 pt-2 pb-1 text-xs font-medium text-muted-foreground',
    row: [
      'group/row flex cursor-pointer items-start gap-3 rounded-xl px-2.5 py-2 text-start outline-none',
      'transition-colors duration-150 hover:bg-foreground/[0.05] focus-visible:ring-2 focus-visible:ring-ring',
      'data-active:bg-foreground/[0.05]',
    ],
    rowIcon: [
      'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.05] text-foreground',
      '[&_svg]:size-4',
    ],
    rowBody: 'flex min-w-0 flex-col',
    rowTitle: 'text-sm font-medium text-foreground',
    rowDescription: 'text-xs leading-5 text-muted-foreground',
    setting: 'flex min-h-11 items-center justify-between gap-6 ps-1 text-[15px]',
    settingLabel: 'text-muted-foreground',
    separator: 'mx-1 my-1 h-px shrink-0 bg-foreground/[0.07]',
    footer: [
      'flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-foreground/[0.07] px-1 pt-3 pb-0.5',
      'text-[13px] text-muted-foreground',
    ],
    hint: 'inline-flex items-center gap-1.5',
    kbd: [
      'inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-foreground/[0.08] px-1.5',
      'font-sans text-xs font-medium text-foreground/80',
    ],
    profile: 'flex items-start justify-between gap-4 px-1 pt-1 pb-1',
    profileBody: 'flex min-w-0 flex-col gap-0.5',
    profileTitle: 'truncate text-[17px] leading-6 font-semibold text-foreground',
    profileDescription: 'truncate text-sm text-muted-foreground',
    profileStatus: 'shrink-0',
    inline: 'flex min-h-11 items-center justify-between gap-3 ps-1 text-[15px] text-foreground',
    inlineText: 'min-w-0 truncate',
    inlineActions: 'flex shrink-0 items-center gap-2',
    pills: 'flex flex-wrap gap-2',
    pill: [
      'inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-foreground/[0.07] px-4 text-sm font-medium text-foreground outline-none select-none',
      'transition-[background-color,scale] duration-150 hover:bg-foreground/[0.11] active:scale-[0.97] motion-reduce:transition-none',
      'focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
      'data-[icon-only]:w-9 data-[icon-only]:px-0 [&_svg]:size-4 [&_svg]:shrink-0',
    ],
    pillExternal: 'size-3.5! text-muted-foreground rtl:-scale-x-100',
    options: 'flex shrink-0 items-center gap-0.5 rounded-full bg-foreground/[0.05] p-1',
    option: [
      'inline-flex h-8 cursor-pointer items-center justify-center rounded-full px-3.5 text-sm text-muted-foreground outline-none select-none',
      'transition-[background-color,color] duration-200 hover:text-foreground motion-reduce:transition-none',
      'focus-visible:ring-2 focus-visible:ring-ring data-checked:bg-foreground/[0.1] data-checked:font-medium data-checked:text-foreground',
      'data-disabled:pointer-events-none data-disabled:opacity-50',
    ],
  },
  variants: {
    variant: {
      island: {
        root: 'w-fit max-w-full flex-col items-center',
        bar: [
          'h-14 gap-1.5 rounded-[28px] bg-popover p-2 shadow-[0_1px_2px_rgb(0_0_0/0.05),0_12px_32px_-14px_rgb(0_0_0/0.4)]',
          'ring-1 ring-foreground/[0.07] dark:ring-foreground/10',
          // Open, the popup underneath is the surface, so the bar gives up its own.
          'group-data-open/navigation-menu:bg-transparent group-data-open/navigation-menu:shadow-none group-data-open/navigation-menu:ring-0',
        ],
        link: 'h-10 px-4 text-[15px]',
        // A trigger is a control rather than a destination, so it keeps a fill of its own.
        trigger: 'bg-foreground/[0.06] data-popup-open:bg-transparent',
        popup: [
          'rounded-[28px] ring-1 ring-foreground/[0.07] dark:ring-foreground/10',
          'shadow-[0_2px_6px_rgb(0_0_0/0.05),0_36px_80px_-30px_rgb(0_0_0/0.55)]',
          '[clip-path:inset(-80px_round_28px)]',
        ],
        content: 'min-w-(--navigation-menu-bar-w) pt-[calc(var(--navigation-menu-bar-h)-0.25rem)]',
        contentInner: 'p-3',
      },
      dock: {
        root: 'w-fit max-w-full flex-col items-center',
        bar: [
          'h-16 gap-1 rounded-[24px] bg-popover p-2 shadow-[0_1px_2px_rgb(0_0_0/0.05),0_10px_30px_-14px_rgb(0_0_0/0.35)]',
          'ring-1 ring-foreground/[0.07] dark:ring-foreground/10',
          'group-data-open/navigation-menu:bg-transparent group-data-open/navigation-menu:shadow-none group-data-open/navigation-menu:ring-0',
        ],
        highlight: 'rounded-[16px]',
        // Never scrolled, so the labels floating above the icons are not clipped.
        list: 'overflow-visible',
        link: [
          'h-12 min-w-12 justify-center gap-0 rounded-[16px] px-3.5 [&_svg]:size-5',
          'data-active:after:absolute data-active:after:bottom-1 data-active:after:left-1/2 data-active:after:size-1 data-active:after:-translate-x-1/2 data-active:after:rounded-full data-active:after:bg-foreground',
        ],
        // Icons only. The label floats above the icon when it is pointed at or
        // reached by the keyboard, so the dock never changes width under the pointer.
        linkLabel: [
          'pointer-events-none absolute bottom-[calc(100%+0.75rem)] left-1/2 -translate-x-1/2 translate-y-1 rounded-lg px-2.5 py-1',
          'bg-foreground text-xs font-medium whitespace-nowrap text-background opacity-0 shadow-md',
          `transition-[opacity,translate] duration-200 ${EASE} motion-reduce:transition-none`,
          'group-hover/link:translate-y-0 group-hover/link:opacity-100',
          'group-focus-visible/link:translate-y-0 group-focus-visible/link:opacity-100',
          // Open, the panel is above the dock, so the label gives way to it.
          'group-data-open/navigation-menu:opacity-0!',
        ],
        popup: [
          'rounded-[24px] ring-1 ring-foreground/[0.07] dark:ring-foreground/10',
          'shadow-[0_2px_6px_rgb(0_0_0/0.05),0_30px_70px_-28px_rgb(0_0_0/0.5)]',
          '[clip-path:inset(-80px_round_24px)]',
        ],
        content: 'min-w-(--navigation-menu-bar-w) pb-[calc(var(--navigation-menu-bar-h)-0.25rem)]',
      },
      bar: {
        root: 'w-full',
        bar: ['h-14 w-full gap-2 rounded-2xl bg-background px-3 ring-1 ring-foreground/[0.07] dark:ring-foreground/10'],
        link: 'rounded-lg px-3',
        highlight: 'rounded-lg',
        popup: [
          'rounded-2xl ring-1 ring-foreground/[0.07] dark:ring-foreground/10',
          'shadow-[0_2px_6px_rgb(0_0_0/0.05),0_24px_60px_-24px_rgb(0_0_0/0.45)]',
          'data-starting-style:scale-[0.97] data-starting-style:opacity-0',
          'data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-ending-style:duration-150',
        ],
      },
    },
    side: {
      bottom: {},
      top: {},
    },
  },
  compoundVariants: [
    // The clip opens from the bar's own shape: centred on it, as wide and as
    // tall as it is, with its radius.
    {
      variant: ['island', 'dock'],
      side: 'bottom',
      className: {
        popup: [
          'data-starting-style:[clip-path:inset(0_calc(50%-var(--navigation-menu-bar-w)/2)_calc(100%-var(--navigation-menu-bar-h))_round_var(--navigation-menu-bar-r))]',
          'data-ending-style:[clip-path:inset(0_calc(50%-var(--navigation-menu-bar-w)/2)_calc(100%-var(--navigation-menu-bar-h))_round_var(--navigation-menu-bar-r))]',
        ],
      },
    },
    {
      variant: ['island', 'dock'],
      side: 'top',
      className: {
        popup: [
          'data-starting-style:[clip-path:inset(calc(100%-var(--navigation-menu-bar-h))_calc(50%-var(--navigation-menu-bar-w)/2)_0_round_var(--navigation-menu-bar-r))]',
          'data-ending-style:[clip-path:inset(calc(100%-var(--navigation-menu-bar-h))_calc(50%-var(--navigation-menu-bar-w)/2)_0_round_var(--navigation-menu-bar-r))]',
        ],
        content: 'pt-0',
      },
    },
    { variant: 'island', side: 'top', className: { content: 'pt-0 pb-[calc(var(--navigation-menu-bar-h)-0.25rem)]' } },
    { variant: 'dock', side: 'bottom', className: { content: 'pt-[calc(var(--navigation-menu-bar-h)-0.25rem)] pb-0' } },
  ],
  defaultVariants: { variant: 'island', side: 'bottom' },
});

/** The colour a card is washed with, by tone. */
const TONE_COLOR: Record<NavigationMenuTone, string> = {
  neutral: 'var(--foreground)',
  primary: 'var(--primary)',
  info: 'var(--info)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  destructive: 'var(--destructive)',
};

const TONE: Record<NavigationMenuTone, string> = {
  neutral: 'bg-foreground/[0.07] text-foreground',
  primary: 'bg-primary text-primary-foreground',
  info: 'bg-info text-white',
  success: 'bg-success text-white',
  warning: 'bg-warning text-black',
  destructive: 'bg-destructive text-white',
};

interface NavigationMenuContextValue {
  variant: NavigationMenuVariant;
  side: 'top' | 'bottom';
  openOn: 'press' | 'hover';
}
const NavigationMenuContext = createContext<NavigationMenuContextValue | null>(null);
/** True inside a panel, where a link is drawn as a row rather than a pill. */
const InPanelContext = createContext(false);

function useNavigationMenu(part: string): NavigationMenuContextValue {
  const context = useContext(NavigationMenuContext);
  if (!context) throw new Error(`${part} must be used within a <NavigationMenu>`);
  return context;
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export interface NavigationMenuProps extends Omit<
  BaseNavigationMenu.Root.Props,
  'className' | 'render' | 'orientation' | 'children'
> {
  /**
   * `island` is a floating pill that grows into its panel; `dock` is the same
   * with icon rows whose labels appear when pointed at; `bar` is a full-width
   * header with a panel that hangs below it. Default `island`.
   */
  variant?: NavigationMenuVariant;
  /** Which way the panel opens. Default `bottom`, or `top` for `dock`. */
  side?: 'top' | 'bottom';
  /**
   * What opens a panel. `press` waits for a click, Enter or Space, and keeps
   * the panel open until it is dismissed, so a pointer drifting off it while
   * someone types or chooses does not close it. `hover` also opens it under
   * the pointer and closes it when the pointer leaves. Default `press` for
   * `island` and `dock`, `hover` for `bar`.
   */
  openOn?: 'press' | 'hover';
  /** The brand, the list and any actions, in reading order. */
  children?: ReactNode;
  className?: string;
  /** Classes for the bar that holds the list. */
  barClassName?: string;
}

/** The menu: the bar, and the panel its triggers open. */
function NavigationMenuRoot({
  variant = 'island',
  side: sideProp,
  openOn: openOnProp,
  value: valueProp,
  defaultValue,
  onValueChange,
  delay = 60,
  closeDelay = 120,
  className,
  barClassName,
  children,
  ...props
}: NavigationMenuProps) {
  const side = sideProp ?? (variant === 'dock' ? 'top' : 'bottom');
  const slots = navigationMenuVariants({ variant, side });
  // Held in state, so the portal mounts into the menu only once the menu is on
  // the page; a ref read at the portal's first render can still be empty.
  const [rootElement, setRootElement] = useState<HTMLElement | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  const grows = variant !== 'bar';
  const openOn = openOnProp ?? (grows ? 'press' : 'hover');

  // Open is mirrored here so the bar can hand its surface to the popup.
  const [innerValue, setInnerValue] = useState<unknown>(defaultValue ?? null);
  const value = valueProp !== undefined ? valueProp : innerValue;
  const open = value != null;

  // The bar's box, written onto the menu as the variables the popup's opening
  // clip and the panel's offset are drawn from. Attached to the bar itself, so
  // it always measures the element on the page.
  const observer = useRef<ResizeObserver | null>(null);
  const measureBar = useCallback((node: HTMLDivElement | null) => {
    bar.current = node;
    observer.current?.disconnect();
    observer.current = null;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const write = () => {
      const host = node.parentElement;
      if (!host) return;
      host.style.setProperty('--navigation-menu-bar-w', `${node.offsetWidth}px`);
      host.style.setProperty('--navigation-menu-bar-h', `${node.offsetHeight}px`);
      // A pill's radius is computed as an enormous length; the clip needs the one it draws.
      const radius = Math.min(parseFloat(getComputedStyle(node).borderTopLeftRadius) || 0, node.offsetHeight / 2);
      host.style.setProperty('--navigation-menu-bar-r', `${radius}px`);
    };
    write();
    observer.current = new ResizeObserver(write);
    observer.current.observe(node);
  }, []);

  return (
    <NavigationMenuContext.Provider value={{ variant, side, openOn }}>
      <BaseNavigationMenu.Root
        ref={setRootElement}
        data-slot="navigation-menu"
        data-variant={variant}
        data-side={side}
        data-open={open ? '' : undefined}
        value={value}
        onValueChange={(next, details) => {
          // Opened by press only: the pointer passing over a trigger, or leaving
          // the panel, changes nothing.
          if (openOn === 'press' && details.reason === 'trigger-hover') return;
          if (valueProp === undefined) setInnerValue(next);
          onValueChange?.(next, details);
        }}
        delay={delay}
        closeDelay={closeDelay}
        className={slots.root({ className })}
        {...props}
      >
        <div ref={measureBar} data-slot="navigation-menu-bar" className={slots.bar({ className: barClassName })}>
          {children}
        </div>
        {/* Grown from the bar, the popup is drawn inside the menu, beneath the bar. */}
        {grows && !rootElement ? null : (
          <BaseNavigationMenu.Portal container={grows ? rootElement : undefined}>
            <BaseNavigationMenu.Positioner
              data-slot="navigation-menu-positioner"
              className={slots.positioner()}
              // Grown from the bar, the popup is laid over it: same edge, same centre.
              anchor={grows ? bar : undefined}
              side={side}
              // A header's panel starts under its trigger and runs on along the bar,
              // so the first trigger's panel never hangs off the page's edge.
              align={grows ? 'center' : 'start'}
              sideOffset={grows ? (state) => -state.anchor.height : 8}
              collisionPadding={12}
              collisionAvoidance={{ side: 'none' }}
            >
              <BaseNavigationMenu.Popup data-slot="navigation-menu-popup" className={slots.popup()}>
                {grows ? <span aria-hidden="true" className={slots.sheen()} /> : null}
                <BaseNavigationMenu.Viewport data-slot="navigation-menu-viewport" className={slots.viewport()} />
              </BaseNavigationMenu.Popup>
            </BaseNavigationMenu.Positioner>
          </BaseNavigationMenu.Portal>
        )}
      </BaseNavigationMenu.Root>
    </NavigationMenuContext.Provider>
  );
}
NavigationMenuRoot.displayName = 'NavigationMenu';

export interface NavigationMenuListProps extends Omit<BaseNavigationMenu.List.Props, 'className'> {
  className?: string;
}

/**
 * The destinations and triggers. A highlight rests on the current one and
 * follows the pointer and focus across the rest.
 */
function NavigationMenuList({
  className,
  children,
  onPointerMove,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: NavigationMenuListProps) {
  const { variant, side } = useNavigationMenu('NavigationMenu.List');
  const slots = navigationMenuVariants({ variant, side });
  const list = useRef<HTMLUListElement | null>(null);
  const highlight = useRef<HTMLLIElement>(null);
  const placed = useRef(false);
  const pointed = useRef<HTMLElement | null>(null);

  const place = useCallback((target: HTMLElement | null) => {
    const host = list.current;
    const mark = highlight.current;
    if (!host || !mark) return;
    if (!target) {
      mark.style.setProperty('--navigation-menu-highlight-o', '0');
      return;
    }
    // The first placement lands without travelling from the list's corner.
    if (!placed.current) mark.setAttribute('data-instant', '');
    // Measured against the list, not the item it sits in.
    const box = target.getBoundingClientRect();
    const origin = host.getBoundingClientRect();
    mark.style.setProperty('--navigation-menu-highlight-x', `${box.left - origin.left + host.scrollLeft}px`);
    mark.style.setProperty('--navigation-menu-highlight-w', `${box.width}px`);
    mark.style.setProperty('--navigation-menu-highlight-o', '1');
    if (!placed.current) {
      placed.current = true;
      requestAnimationFrame(() => mark.removeAttribute('data-instant'));
    }
  }, []);

  /** Where the highlight rests when nothing is pointed at: the open trigger, else the current page. */
  const rest = useCallback(() => {
    const host = list.current;
    if (!host) return;
    const target =
      host.querySelector<HTMLElement>(':scope > li > [data-popup-open]') ??
      host.querySelector<HTMLElement>(':scope > li > [data-active]');
    place(target);
  }, [place]);

  useIsomorphicLayoutEffect(() => {
    if (!pointed.current) rest();
  });

  useEffect(() => {
    const host = list.current;
    if (!host) return;
    // The current page or the open trigger can change without a render here.
    const observer = new MutationObserver(() => {
      if (!pointed.current) rest();
    });
    observer.observe(host, { attributes: true, subtree: true, attributeFilter: ['data-active', 'data-popup-open'] });
    const measure = () => {
      // Only a list that scrolls can overflow; a dock's labels float outside it on purpose.
      const scrolls = getComputedStyle(host).overflowX !== 'visible';
      host.toggleAttribute('data-overflow', scrolls && host.scrollWidth > host.clientWidth + 1);
      if (pointed.current) place(pointed.current);
      else rest();
    };
    measure();
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    resize?.observe(host);
    return () => {
      observer.disconnect();
      resize?.disconnect();
    };
  }, [rest, place]);

  const itemOf = (node: EventTarget | null) => {
    const host = list.current;
    const element = node instanceof Element ? node.closest<HTMLElement>('[data-navigation-menu-target]') : null;
    return element && host?.contains(element) ? element : null;
  };

  return (
    <BaseNavigationMenu.List
      ref={list}
      data-slot="navigation-menu-list"
      className={slots.list({ className })}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        const target = itemOf(event.target);
        if (target && target !== pointed.current) {
          pointed.current = target;
          place(target);
        }
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        pointed.current = null;
        rest();
      }}
      onFocus={(event) => {
        onFocus?.(event);
        const target = itemOf(event.target);
        if (target?.matches(':focus-visible')) {
          pointed.current = target;
          place(target);
        }
      }}
      onBlur={(event) => {
        onBlur?.(event);
        if (!list.current?.contains(event.relatedTarget as Node)) {
          pointed.current = null;
          rest();
        }
      }}
      {...props}
    >
      {/* A list item, since a list holds nothing else; presentational and hidden. */}
      <li
        ref={highlight}
        role="presentation"
        aria-hidden="true"
        data-slot="navigation-menu-highlight"
        className={slots.highlight()}
      />
      {children}
    </BaseNavigationMenu.List>
  );
}
NavigationMenuList.displayName = 'NavigationMenu.List';

export interface NavigationMenuItemProps extends Omit<BaseNavigationMenu.Item.Props, 'className'> {
  className?: string;
}

/** One entry in the list: a link, or a trigger with its content. */
function NavigationMenuItem({ className, ...props }: NavigationMenuItemProps) {
  const { variant, side } = useNavigationMenu('NavigationMenu.Item');
  const slots = navigationMenuVariants({ variant, side });
  return <BaseNavigationMenu.Item data-slot="navigation-menu-item" className={slots.item({ className })} {...props} />;
}
NavigationMenuItem.displayName = 'NavigationMenu.Item';

export interface NavigationMenuTriggerProps extends Omit<BaseNavigationMenu.Trigger.Props, 'className'> {
  /** Drawn before the label. In a dock it is the whole row until pointed at. */
  icon?: ReactNode;
  /** Hides the chevron after the label. */
  hideChevron?: boolean;
  className?: string;
}

/** Opens its item's content. Pointing at it opens it too, after a short pause. */
function NavigationMenuTrigger({
  icon,
  hideChevron = false,
  className,
  children,
  onMouseEnter,
  ...props
}: NavigationMenuTriggerProps) {
  const { variant, side, openOn } = useNavigationMenu('NavigationMenu.Trigger');
  const slots = navigationMenuVariants({ variant, side });
  const chevron = !hideChevron && variant !== 'dock';
  return (
    <BaseNavigationMenu.Trigger
      data-slot="navigation-menu-trigger"
      data-navigation-menu-target=""
      // Opened by press only, the pointer arriving must not open the panel, nor
      // arm the short window in which a click after a hover-open is ignored.
      onMouseEnter={(event) => {
        if (openOn === 'press') event.preventBaseUIHandler();
        onMouseEnter?.(event);
      }}
      className={slots.link({ className: [slots.trigger(), className] })}
      {...props}
    >
      {icon}
      <span data-slot="navigation-menu-label" className={slots.linkLabel()}>
        {children}
      </span>
      {chevron ? (
        <BaseNavigationMenu.Icon data-slot="navigation-menu-chevron" className={slots.chevron()}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </BaseNavigationMenu.Icon>
      ) : null}
    </BaseNavigationMenu.Trigger>
  );
}
NavigationMenuTrigger.displayName = 'NavigationMenu.Trigger';

export interface NavigationMenuContentProps extends Omit<BaseNavigationMenu.Content.Props, 'className'> {
  className?: string;
}

/**
 * What a trigger opens. Its children arrive one after another as it opens.
 * `className` lays out the panel itself: its width, a grid, its padding.
 */
function NavigationMenuContent({ className, children, ...props }: NavigationMenuContentProps) {
  const { variant, side } = useNavigationMenu('NavigationMenu.Content');
  const slots = navigationMenuVariants({ variant, side });
  return (
    <InPanelContext.Provider value={true}>
      <BaseNavigationMenu.Content data-slot="navigation-menu-content" className={slots.content()} {...props}>
        <div data-slot="navigation-menu-panel" className={slots.contentInner({ className })}>
          {children as ReactNode}
        </div>
      </BaseNavigationMenu.Content>
    </InPanelContext.Provider>
  );
}
NavigationMenuContent.displayName = 'NavigationMenu.Content';

export interface NavigationMenuLinkProps extends Omit<BaseNavigationMenu.Link.Props, 'className'> {
  /** Drawn before the label: in the bar, beside it; in a panel, in a square of its own. */
  icon?: ReactNode;
  /** In a panel, a quieter line under the label. */
  description?: ReactNode;
  className?: string;
}

/**
 * A destination. In the bar it is a pill; in a panel it is a row with an
 * optional icon and description. Mark the current page with `active`.
 */
function NavigationMenuLink({ icon, description, className, children, ...props }: NavigationMenuLinkProps) {
  const { variant, side } = useNavigationMenu('NavigationMenu.Link');
  const inPanel = useContext(InPanelContext);
  const slots = navigationMenuVariants({ variant, side });
  if (inPanel) {
    return (
      <BaseNavigationMenu.Link data-slot="navigation-menu-row" className={slots.row({ className })} {...props}>
        {icon ? <span className={slots.rowIcon()}>{icon}</span> : null}
        <span className={slots.rowBody()}>
          <span className={slots.rowTitle()}>{children}</span>
          {description ? <span className={slots.rowDescription()}>{description}</span> : null}
        </span>
      </BaseNavigationMenu.Link>
    );
  }
  return (
    <BaseNavigationMenu.Link
      data-slot="navigation-menu-link"
      data-navigation-menu-target=""
      className={slots.link({ className })}
      {...props}
    >
      {icon}
      <span data-slot="navigation-menu-label" className={slots.linkLabel()}>
        {children}
      </span>
    </BaseNavigationMenu.Link>
  );
}
NavigationMenuLink.displayName = 'NavigationMenu.Link';

export interface NavigationMenuBrandProps extends Omit<ComponentProps<'a'>, 'children'> {
  /** The mark: an image or an icon, drawn in a round tile. */
  icon?: ReactNode;
  /** The name beside the mark. Leave it out for the mark alone, and pass `aria-label`. */
  children?: ReactNode;
}

/** The product's mark at the start of the bar. With `href` it is a link home. */
function NavigationMenuBrand({ icon, className, children, href, ...props }: NavigationMenuBrandProps) {
  const { variant, side } = useNavigationMenu('NavigationMenu.Brand');
  const slots = navigationMenuVariants({ variant, side });
  const inner = (
    <>
      {icon ? <span className={slots.brandMark()}>{icon}</span> : null}
      {children}
    </>
  );
  if (href === undefined) {
    return (
      <span data-slot="navigation-menu-brand" className={slots.brand({ className: [!children && 'pe-0', className] })}>
        {inner}
      </span>
    );
  }
  return (
    <a
      data-slot="navigation-menu-brand"
      href={href}
      className={slots.brand({ className: [!children && 'pe-0', className] })}
      {...props}
    >
      {inner}
    </a>
  );
}
NavigationMenuBrand.displayName = 'NavigationMenu.Brand';

export interface NavigationMenuActionsProps extends ComponentProps<'div'> {}

/** Controls at the end of the bar that are not destinations: a search, a sign-in. */
function NavigationMenuActions({ className, ...props }: NavigationMenuActionsProps) {
  const { variant, side } = useNavigationMenu('NavigationMenu.Actions');
  const slots = navigationMenuVariants({ variant, side });
  return <div data-slot="navigation-menu-actions" className={slots.actions({ className })} {...props} />;
}
NavigationMenuActions.displayName = 'NavigationMenu.Actions';

export interface NavigationMenuCardProps extends Omit<BaseNavigationMenu.Link.Props, 'className'> {
  /** Drawn in the card's tile. */
  icon?: ReactNode;
  /** The tile's colour, as a theme role. Default `neutral`. */
  tone?: NavigationMenuTone;
  /** A small line above the title: "Start here", "New". */
  eyebrow?: ReactNode;
  className?: string;
}

/** A featured destination in a panel: a tile, a small line, a title and an arrow. */
function NavigationMenuCard({
  icon,
  tone = 'neutral',
  eyebrow,
  className,
  children,
  ...props
}: NavigationMenuCardProps) {
  const { variant, side } = useNavigationMenu('NavigationMenu.Card');
  const slots = navigationMenuVariants({ variant, side });
  return (
    <BaseNavigationMenu.Link
      data-slot="navigation-menu-card"
      data-tone={tone}
      className={slots.card({ className })}
      {...props}
    >
      <span
        aria-hidden="true"
        className={slots.cardWash()}
        style={{ '--navigation-menu-tone': TONE_COLOR[tone] } as CSSProperties}
      />
      {icon ? <span className={slots.cardMedia({ className: TONE[tone] })}>{icon}</span> : null}
      <span className={slots.cardBody()}>
        {eyebrow ? <span className={slots.cardEyebrow()}>{eyebrow}</span> : null}
        <span className={slots.cardTitle()}>{children}</span>
      </span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={slots.cardArrow()}
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </BaseNavigationMenu.Link>
  );
}
NavigationMenuCard.displayName = 'NavigationMenu.Card';

export interface NavigationMenuGroupProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** The small heading over the group. */
  label?: ReactNode;
}

/** A set of rows under one heading, inside a panel. */
function NavigationMenuGroup({ label, className, children, ...props }: NavigationMenuGroupProps) {
  const { variant, side } = useNavigationMenu('NavigationMenu.Group');
  const slots = navigationMenuVariants({ variant, side });
  const id = useId();
  return (
    <div
      data-slot="navigation-menu-group"
      role="group"
      aria-labelledby={label ? id : undefined}
      className={slots.group({ className })}
      {...props}
    >
      {label ? (
        <span id={id} className={slots.groupLabel()}>
          {label}
        </span>
      ) : null}
      {children}
    </div>
  );
}
NavigationMenuGroup.displayName = 'NavigationMenu.Group';

export interface NavigationMenuSettingProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** What the control beside it sets: "Theme", "Labels". */
  label: ReactNode;
}

/** A labelled row with a control at its end, for preferences kept in the menu. */
function NavigationMenuSetting({ label, className, children, ...props }: NavigationMenuSettingProps) {
  const { variant, side } = useNavigationMenu('NavigationMenu.Setting');
  const slots = navigationMenuVariants({ variant, side });
  return (
    <div data-slot="navigation-menu-setting" className={slots.setting({ className })} {...props}>
      <span className={slots.settingLabel()}>{label}</span>
      {children}
    </div>
  );
}
NavigationMenuSetting.displayName = 'NavigationMenu.Setting';

export interface NavigationMenuSeparatorProps extends ComponentProps<'div'> {}

/** A rule between parts of a panel. */
function NavigationMenuSeparator({ className, ...props }: NavigationMenuSeparatorProps) {
  const { variant, side } = useNavigationMenu('NavigationMenu.Separator');
  const slots = navigationMenuVariants({ variant, side });
  return (
    <div data-slot="navigation-menu-separator" role="separator" className={slots.separator({ className })} {...props} />
  );
}
NavigationMenuSeparator.displayName = 'NavigationMenu.Separator';

export interface NavigationMenuFooterProps extends ComponentProps<'div'> {}

/** The strip along a panel's foot, for keyboard hints. */
function NavigationMenuFooter({ className, ...props }: NavigationMenuFooterProps) {
  const { variant, side } = useNavigationMenu('NavigationMenu.Footer');
  const slots = navigationMenuVariants({ variant, side });
  return <div data-slot="navigation-menu-footer" className={slots.footer({ className })} {...props} />;
}
NavigationMenuFooter.displayName = 'NavigationMenu.Footer';

export interface NavigationMenuHintProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** The keys, each drawn in its own cap: `['⌘', 'K']`. */
  keys: readonly string[];
  /** What the keys do. */
  children: ReactNode;
}

/** One keyboard hint in the footer: its keys, then what they do. */
function NavigationMenuHint({ keys, className, children, ...props }: NavigationMenuHintProps) {
  const { variant, side } = useNavigationMenu('NavigationMenu.Hint');
  const slots = navigationMenuVariants({ variant, side });
  return (
    <span data-slot="navigation-menu-hint" className={slots.hint({ className })} {...props}>
      {keys.map((key) => (
        <kbd key={key} className={slots.kbd()}>
          {key}
        </kbd>
      ))}
      <span>{children}</span>
    </span>
  );
}
NavigationMenuHint.displayName = 'NavigationMenu.Hint';

export interface NavigationMenuProfileProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** A quieter line under the name: a role, a place, a plan. */
  description?: ReactNode;
  /** Something at the row's end, such as a Badge saying whether they are available. */
  status?: ReactNode;
}

/** Who or what the panel is about, at its top: a name, a line under it and a status. */
function NavigationMenuProfile({ description, status, className, children, ...props }: NavigationMenuProfileProps) {
  const { variant, side } = useNavigationMenu('NavigationMenu.Profile');
  const slots = navigationMenuVariants({ variant, side });
  return (
    <div data-slot="navigation-menu-profile" className={slots.profile({ className })} {...props}>
      <div className={slots.profileBody()}>
        <span className={slots.profileTitle()}>{children}</span>
        {description ? <span className={slots.profileDescription()}>{description}</span> : null}
      </div>
      {status ? <div className={slots.profileStatus()}>{status}</div> : null}
    </div>
  );
}
NavigationMenuProfile.displayName = 'NavigationMenu.Profile';

export interface NavigationMenuValueProps extends ComponentProps<'div'> {
  /** Pills at the row's end that act on the value: a copy, a share. */
  actions?: ReactNode;
}

/** A value worth taking away, such as an address or a command, with the pills that act on it. */
function NavigationMenuValue({ actions, className, children, ...props }: NavigationMenuValueProps) {
  const { variant, side } = useNavigationMenu('NavigationMenu.Value');
  const slots = navigationMenuVariants({ variant, side });
  return (
    <div data-slot="navigation-menu-value" className={slots.inline({ className })} {...props}>
      <span className={slots.inlineText()}>{children}</span>
      {actions ? <span className={slots.inlineActions()}>{actions}</span> : null}
    </div>
  );
}
NavigationMenuValue.displayName = 'NavigationMenu.Value';

export interface NavigationMenuPillsProps extends ComponentProps<'div'> {}

/** A row of pills that wraps onto a second line when it runs out of room. */
function NavigationMenuPills({ className, ...props }: NavigationMenuPillsProps) {
  const { variant, side } = useNavigationMenu('NavigationMenu.Pills');
  const slots = navigationMenuVariants({ variant, side });
  return <div data-slot="navigation-menu-pills" className={slots.pills({ className })} {...props} />;
}
NavigationMenuPills.displayName = 'NavigationMenu.Pills';

type PillOwnProps = {
  /** Drawn before the label. Alone, with no label, it makes a round icon pill: pass `aria-label`. */
  icon?: ReactNode;
  /** Adds an arrow after the label and opens the link in a new tab. Only with `href`. */
  external?: boolean;
  className?: string;
};

export type NavigationMenuPillProps = PillOwnProps &
  (
    | ({ href: string } & Omit<ComponentProps<'a'>, 'className'>)
    | ({ href?: undefined } & Omit<ComponentProps<'button'>, 'className'>)
  );

/**
 * A small round control in a panel: a button such as Copy, or with `href`
 * a link such as one to a profile elsewhere.
 */
function NavigationMenuPill({ icon, external = false, className, children, ...props }: NavigationMenuPillProps) {
  const { variant, side } = useNavigationMenu('NavigationMenu.Pill');
  const slots = navigationMenuVariants({ variant, side });
  const iconOnly = icon != null && (children == null || children === false);
  const inner = (
    <>
      {icon}
      {children}
      {external ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={slots.pillExternal()}
        >
          <path d="M7 17 17 7M8 7h9v9" />
        </svg>
      ) : null}
    </>
  );
  const shared = {
    'data-slot': 'navigation-menu-pill',
    'data-icon-only': iconOnly ? '' : undefined,
    className: slots.pill({ className }),
  };
  if (props.href !== undefined) {
    const { href, ...rest } = props as ComponentProps<'a'>;
    return (
      <a {...shared} href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : null)} {...rest}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" {...shared} {...(props as ComponentProps<'button'>)}>
      {inner}
    </button>
  );
}
NavigationMenuPill.displayName = 'NavigationMenu.Pill';

export interface NavigationMenuOptionsProps extends Omit<RadioGroup.Props, 'className'> {
  className?: string;
}

/**
 * A choice of a few options in one track, for a preference kept in the
 * menu. Arrow keys move the choice; it is a radio group to assistive
 * technology. Give it an `aria-label`, or put it in a `NavigationMenu.Setting`.
 */
function NavigationMenuOptions({ className, ...props }: NavigationMenuOptionsProps) {
  const { variant, side } = useNavigationMenu('NavigationMenu.Options');
  const slots = navigationMenuVariants({ variant, side });
  return <RadioGroup data-slot="navigation-menu-options" className={slots.options({ className })} {...props} />;
}
NavigationMenuOptions.displayName = 'NavigationMenu.Options';

export interface NavigationMenuOptionProps extends Omit<Radio.Root.Props, 'className'> {
  className?: string;
}

/** One option in a `NavigationMenu.Options` track. */
function NavigationMenuOption({ className, ...props }: NavigationMenuOptionProps) {
  const { variant, side } = useNavigationMenu('NavigationMenu.Option');
  const slots = navigationMenuVariants({ variant, side });
  return <Radio.Root data-slot="navigation-menu-option" className={slots.option({ className })} {...props} />;
}
NavigationMenuOption.displayName = 'NavigationMenu.Option';

export const NavigationMenu = Object.assign(NavigationMenuRoot, {
  List: NavigationMenuList,
  Item: NavigationMenuItem,
  Trigger: NavigationMenuTrigger,
  Content: NavigationMenuContent,
  Link: NavigationMenuLink,
  Brand: NavigationMenuBrand,
  Actions: NavigationMenuActions,
  Card: NavigationMenuCard,
  Group: NavigationMenuGroup,
  Setting: NavigationMenuSetting,
  Separator: NavigationMenuSeparator,
  Footer: NavigationMenuFooter,
  Hint: NavigationMenuHint,
  Profile: NavigationMenuProfile,
  Value: NavigationMenuValue,
  Pills: NavigationMenuPills,
  Pill: NavigationMenuPill,
  Options: NavigationMenuOptions,
  Option: NavigationMenuOption,
});

export {
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
  NavigationMenuBrand,
  NavigationMenuActions,
  NavigationMenuCard,
  NavigationMenuGroup,
  NavigationMenuSetting,
  NavigationMenuSeparator,
  NavigationMenuFooter,
  NavigationMenuHint,
  NavigationMenuProfile,
  NavigationMenuValue,
  NavigationMenuPills,
  NavigationMenuPill,
  NavigationMenuOptions,
  NavigationMenuOption,
  navigationMenuVariants,
};
