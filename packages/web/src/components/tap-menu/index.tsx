'use client';

/**
 * TapMenu — a button that opens a handful of actions as small cards over a
 * blurred screen.
 *
 * ```tsx
 * <TapMenu>
 *   <TapMenu.Trigger aria-label="Create" />
 *   <TapMenu.Content>
 *     <TapMenu.Item icon={<FileIcon />} onClick={newDoc}>New doc</TapMenu.Item>
 *     <TapMenu.Item icon={<UsersIcon />} onClick={invite}>Invite people</TapMenu.Item>
 *   </TapMenu.Content>
 * </TapMenu>
 * ```
 *
 * ## What it is for
 *
 * A short list of things to start, three to six of them, reached from one
 * button that stays in the same place on every screen. Each action is a card
 * big enough to tap, with its icon in the top corner and its name in the
 * bottom one, and the screen behind blurs so the cards are the only thing to
 * read while they are open.
 *
 * ## Four layouts
 *
 * `variant` picks how the cards are laid out and how they arrive:
 *
 * - `tiles` drops a row of square cards under the trigger. The card under the
 *   pointer lifts to a solid surface; the rest stay translucent.
 * - `fan` spreads them in an arc around a round button, each tilted a little
 *   and straightening when it is pointed at. For a button in a corner.
 * - `stack` raises them from a button at the bottom as a column of rows, the
 *   nearest first, each with room for a shortcut.
 * - `spotlight` grows a sheet of larger tiles in the middle of the screen, for
 *   a narrow screen where the trigger is far from where the thumb rests.
 *
 * ## Built on a menu
 *
 * It is a menu underneath, so it has a menu's keyboard: the arrow keys move
 * between the cards, Enter picks one, Escape closes it and focus goes back to
 * the trigger. Pressing a card closes it.
 *
 * ## The blur covers a container or the page
 *
 * Without `container`, the backdrop covers the viewport. With it, the cards
 * and the backdrop are put inside that element and the blur stops at its
 * edges; give it `position: relative`. The backdrop leaves a hole over the
 * trigger, so it stays sharp and a press on it closes the menu again.
 */
import { Menu as BaseMenu } from '@base-ui/react/menu';
import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ComponentProps, ReactNode, RefObject } from 'react';
import { tv } from 'tailwind-variants';

export type TapMenuVariant = 'tiles' | 'fan' | 'stack' | 'spotlight';

const EASE = 'ease-[cubic-bezier(0.23,1,0.32,1)]';

const tapMenuVariants = tv({
  slots: {
    trigger: [
      'relative z-50 inline-flex size-10 shrink-0 items-center justify-center rounded-full border bg-background text-foreground shadow-xs outline-none',
      `transition-[background-color,color,border-color,scale] duration-200 ${EASE}`,
      'hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-95',
      'data-popup-open:border-transparent data-popup-open:bg-foreground data-popup-open:text-background',
      '[&_svg]:size-4 [&_svg]:transition-transform [&_svg]:duration-300 [&_svg]:ease-[cubic-bezier(0.23,1,0.32,1)]',
      'data-popup-open:[&_[data-slot=tap-menu-glyph]]:rotate-45',
      'motion-reduce:transition-none motion-reduce:[&_svg]:transition-none',
    ],
    backdrop: [
      'inset-0 z-40 bg-background/50 backdrop-blur-[7px] backdrop-saturate-[0.85]',
      `transition-[opacity,backdrop-filter] duration-300 ${EASE}`,
      'data-starting-style:opacity-0 data-starting-style:backdrop-blur-none',
      'data-ending-style:opacity-0 data-ending-style:backdrop-blur-none data-ending-style:duration-150',
      'motion-reduce:transition-none',
    ],
    positioner: 'z-50 outline-none',
    // The popup carries a short fade of its own, so it stays mounted while
    // the cards inside it play their exit.
    popup: [
      'group/tap outline-none transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0',
      'motion-reduce:transition-none',
    ],
    item: [
      'relative flex cursor-default text-left text-sm font-medium leading-tight text-foreground outline-none select-none',
      'bg-popover/65 ring-1 ring-foreground/[0.06] backdrop-blur-xl',
      `transition-[opacity,translate,scale,rotate,background-color,box-shadow] duration-300 ${EASE}`,
      'delay-(--tap-delay) group-data-ending-style/tap:delay-0 group-data-ending-style/tap:duration-150',
      'data-highlighted:bg-popover data-highlighted:shadow-lg data-highlighted:shadow-black/[0.07] data-highlighted:ring-foreground/[0.08]',
      'dark:bg-popover/55 dark:data-highlighted:bg-[color-mix(in_oklab,var(--popover),white_9%)] dark:data-highlighted:shadow-black/40',
      'data-disabled:pointer-events-none data-disabled:opacity-50',
      '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
      'motion-reduce:transition-none',
    ],
    icon: 'flex text-foreground/80',
    label: 'min-w-0',
    description: 'block text-xs font-normal text-muted-foreground',
    shortcut: 'ms-auto ps-3 text-xs font-normal tracking-wide text-muted-foreground',
    heading: 'col-span-full px-1 pt-0.5 text-xs font-medium text-muted-foreground',
  },
  variants: {
    variant: {
      tiles: {
        popup: 'flex gap-2',
        item: [
          'h-28 w-26 flex-col justify-between rounded-2xl p-3',
          'group-data-starting-style/tap:-translate-y-2 group-data-starting-style/tap:scale-95 group-data-starting-style/tap:opacity-0',
          'group-data-ending-style/tap:-translate-y-1 group-data-ending-style/tap:scale-[0.97] group-data-ending-style/tap:opacity-0',
          'data-highlighted:-translate-y-0.5',
        ],
      },
      fan: {
        // A point at the trigger's centre; the cards are placed around it.
        popup: 'relative size-0',
        item: [
          'absolute top-0 left-0 h-22 w-20 flex-col justify-between rounded-2xl p-2.5 text-[0.8125rem]',
          'translate-x-[calc(var(--tap-x)-50%)] translate-y-[calc(var(--tap-y)-50%)] rotate-(--tap-tilt)',
          'group-data-starting-style/tap:translate-x-[-50%] group-data-starting-style/tap:translate-y-[-50%] group-data-starting-style/tap:rotate-0 group-data-starting-style/tap:scale-50 group-data-starting-style/tap:opacity-0',
          'group-data-ending-style/tap:translate-x-[-50%] group-data-ending-style/tap:translate-y-[-50%] group-data-ending-style/tap:rotate-0 group-data-ending-style/tap:scale-50 group-data-ending-style/tap:opacity-0',
          'data-highlighted:z-10 data-highlighted:rotate-0 data-highlighted:scale-105',
        ],
      },
      stack: {
        popup: 'flex w-60 flex-col gap-1.5',
        item: [
          'h-12 items-center gap-3 rounded-xl px-3',
          'group-data-starting-style/tap:translate-y-[calc(var(--tap-depth)*14px+20px)] group-data-starting-style/tap:scale-90 group-data-starting-style/tap:opacity-0',
          'group-data-ending-style/tap:translate-y-[calc(var(--tap-depth)*8px+10px)] group-data-ending-style/tap:scale-95 group-data-ending-style/tap:opacity-0',
          'data-highlighted:-translate-x-1',
        ],
        icon: 'size-7 items-center justify-center rounded-lg bg-foreground/[0.06]',
      },
      spotlight: {
        // Fills the container or the viewport and centres the sheet; the
        // anchor's position is not used.
        positioner: 'inset-0! flex! transform-none! items-center justify-center p-4',
        popup: [
          'grid w-full max-w-80 grid-cols-3 gap-2 rounded-3xl bg-popover/70 p-3 shadow-2xl shadow-black/10 ring-1 ring-foreground/[0.06] backdrop-blur-2xl',
          `transition-[opacity,scale] duration-300 ${EASE} data-starting-style:scale-95 data-ending-style:scale-[0.97] data-ending-style:duration-150`,
          'dark:shadow-black/50',
        ],
        item: [
          'aspect-square flex-col justify-between rounded-2xl bg-foreground/[0.035] p-3 ring-0 backdrop-blur-none',
          'group-data-starting-style/tap:translate-y-1.5 group-data-starting-style/tap:opacity-0',
          'data-highlighted:bg-popover data-highlighted:ring-1',
        ],
      },
    },
  },
});

interface TapMenuContextValue {
  variant: TapMenuVariant;
  trigger: RefObject<HTMLButtonElement | null>;
}

const TapMenuContext = createContext<TapMenuContextValue>({ variant: 'tiles', trigger: { current: null } });

interface Layout {
  arc: [number, number];
  radius: number;
}

const LayoutContext = createContext<Layout>({ arc: [-180, -90], radius: 148 });

export interface TapMenuProps extends Omit<BaseMenu.Root.Props, 'orientation'> {
  /** How the cards are laid out and arrive: `tiles`, `fan`, `stack` or `spotlight`. Default `tiles`. */
  variant?: TapMenuVariant;
}

/** Holds whether the menu is open. Takes `open`/`onOpenChange` and `defaultOpen`. */
function TapMenuRoot({ variant = 'tiles', ...props }: TapMenuProps) {
  const trigger = useRef<HTMLButtonElement>(null);
  const value = useMemo(() => ({ variant, trigger }), [variant]);
  // A row is moved through with left and right; a column or a grid with up and down.
  const orientation = variant === 'tiles' ? 'horizontal' : 'vertical';
  return (
    <TapMenuContext.Provider value={value}>
      <BaseMenu.Root orientation={orientation} {...props} />
    </TapMenuContext.Provider>
  );
}
TapMenuRoot.displayName = 'TapMenu';

function PlusGlyph() {
  return (
    <svg
      data-slot="tap-menu-glyph"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export interface TapMenuTriggerProps extends Omit<BaseMenu.Trigger.Props, 'className' | 'ref'> {
  /**
   * What the button shows. Default a plus that turns into a cross while the
   * menu is open. Give your own glyph `data-slot="tap-menu-glyph"` to have it
   * turn too.
   */
  children?: ReactNode;
  className?: string;
}

/** The round button that opens and closes the cards. Give it an `aria-label`. */
function TapMenuTrigger({ children, className, ...props }: TapMenuTriggerProps) {
  const slots = tapMenuVariants();
  const { trigger } = useContext(TapMenuContext);
  return (
    <BaseMenu.Trigger data-slot="tap-menu-trigger" className={slots.trigger({ className })} {...props} ref={trigger}>
      {children ?? <PlusGlyph />}
    </BaseMenu.Trigger>
  );
}
TapMenuTrigger.displayName = 'TapMenu.Trigger';

export interface TapMenuContentProps extends Omit<BaseMenu.Popup.Props, 'className'> {
  /**
   * The element the cards and the blur are put in. The blur stops at its
   * edges; give it `position: relative`. Default the page, with the blur over
   * the whole viewport.
   */
  container?: HTMLElement | null | { current: HTMLElement | null };
  /** Whether the screen behind is blurred. Default `true`. */
  backdrop?: boolean;
  /** Which side of the trigger the cards open on, for `tiles` and `stack`. Default `bottom` for tiles, `top` for stack. */
  side?: BaseMenu.Positioner.Props['side'];
  /** How they line up with the trigger, for `tiles` and `stack`. Default `start` for tiles, `end` for stack. */
  align?: BaseMenu.Positioner.Props['align'];
  /** The gap between the trigger and the cards, in pixels. Default `10`. */
  sideOffset?: number;
  /**
   * For `fan`: the arc the cards are spread over, in degrees, where 0 points
   * right and -90 points up. Default `[-180, -90]`, from left round to up,
   * for a button in the bottom trailing corner.
   */
  arc?: [number, number];
  /** For `fan`: how far the cards' centres are from the trigger's, in pixels. Default `148`. */
  radius?: number;
  className?: string;
}

const STAGGER = 35;

/** The cards, opened over a blurred screen. Put `TapMenu.Item`s in it. */
function TapMenuContent({
  container,
  backdrop = true,
  side,
  align,
  sideOffset = 10,
  arc = [-180, -90],
  radius = 148,
  className,
  children,
  ...props
}: TapMenuContentProps) {
  const { variant } = useContext(TapMenuContext);
  const slots = tapMenuVariants({ variant });
  const contained = container != null;

  const layout = useMemo(() => ({ arc, radius }), [arc[0], arc[1], radius]);

  // The fan is centred on the trigger: a point at its middle, placed by
  // pulling the popup back over the trigger by half its height.
  const positioning =
    variant === 'fan'
      ? { side: 'top' as const, align: 'center' as const, sideOffset: -20 }
      : variant === 'stack'
        ? { side: side ?? ('top' as const), align: align ?? ('end' as const), sideOffset }
        : { side: side ?? ('bottom' as const), align: align ?? ('start' as const), sideOffset };

  return (
    <BaseMenu.Portal container={container}>
      {backdrop && (
        <TapMenuBackdrop
          container={container}
          className={slots.backdrop({ className: contained ? 'absolute' : 'fixed' })}
        />
      )}
      <BaseMenu.Positioner
        {...positioning}
        collisionAvoidance={variant === 'fan' ? { side: 'none', align: 'none' } : undefined}
        positionMethod={contained ? 'absolute' : 'fixed'}
        className={slots.positioner({ className: variant === 'spotlight' && contained ? 'absolute!' : undefined })}
      >
        <BaseMenu.Popup
          data-slot="tap-menu-content"
          data-variant={variant}
          className={slots.popup({ className })}
          {...props}
        >
          <LayoutContext.Provider value={layout}>{children}</LayoutContext.Provider>
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}
TapMenuContent.displayName = 'TapMenu.Content';

/**
 * The blur, with a round hole cut over the trigger. Lifting the trigger above
 * the backdrop with `z-index` fails whenever one of its ancestors makes a
 * stacking context of its own, which a card or a transformed parent does; a
 * hole in the backdrop leaves it sharp wherever it sits. A press in the hole
 * lands on the backdrop and closes the menu, as pressing the trigger would.
 */
function TapMenuBackdrop({ container, className }: { container: TapMenuContentProps['container']; className: string }) {
  const { trigger } = useContext(TapMenuContext);
  const [mask, setMask] = useState<string>();
  useLayoutEffect(() => {
    const button = trigger.current;
    if (!button) return;
    const box = button.getBoundingClientRect();
    const element = container && 'current' in container ? container.current : container;
    const origin = element ? element.getBoundingClientRect() : { left: 0, top: 0 };
    const x = box.left - origin.left + box.width / 2;
    const y = box.top - origin.top + box.height / 2;
    const r = Math.max(box.width, box.height) / 2 + 1;
    setMask(`radial-gradient(circle at ${x}px ${y}px, transparent ${r}px, #000 ${r + 0.75}px)`);
  }, [container, trigger]);
  return (
    <BaseMenu.Backdrop
      data-slot="tap-menu-backdrop"
      className={className}
      style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
    />
  );
}

function placement(variant: TapMenuVariant, index: number, count: number, arc: [number, number], radius: number) {
  // The card nearest the trigger arrives first.
  const depth = variant === 'stack' ? count - 1 - index : index;
  const style: Record<string, string> = { '--tap-delay': `${depth * STAGGER}ms`, '--tap-depth': String(depth) };
  if (variant === 'fan') {
    const [from, to] = arc;
    const step = count > 1 ? (to - from) / (count - 1) : 0;
    const angle = count > 1 ? from + step * index : (from + to) / 2;
    const middle = (from + to) / 2;
    const radians = (angle * Math.PI) / 180;
    style['--tap-x'] = `${(Math.cos(radians) * radius).toFixed(1)}px`;
    style['--tap-y'] = `${(Math.sin(radians) * radius).toFixed(1)}px`;
    // Tilted along the arc, a quarter as far as the card is from its middle.
    style['--tap-tilt'] = `${((angle - middle) * 0.22).toFixed(1)}deg`;
  }
  return style as CSSProperties;
}

export interface TapMenuItemProps extends Omit<BaseMenu.Item.Props, 'className' | 'children' | 'ref'> {
  /** The glyph in the card's top corner. */
  icon?: ReactNode;
  /** The action's name, in the bottom corner. Two short words read best: "New invoice". */
  children: ReactNode;
  /** A line under the name, for `stack` and `spotlight`. */
  description?: ReactNode;
  /** A key or chord at the row's end, for `stack`: "⌘N". */
  shortcut?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** One action, drawn as a card. Pressing it closes the menu. */
function TapMenuItem({ icon, description, shortcut, className, style, children, ...props }: TapMenuItemProps) {
  const { variant } = useContext(TapMenuContext);
  const { arc, radius } = useContext(LayoutContext);
  const slots = tapMenuVariants({ variant });
  const row = variant === 'stack';
  const ref = useRef<HTMLDivElement>(null);
  // Where the card is among the others decides its delay and, in a fan, its
  // place on the arc. It is read from the document rather than from the
  // children, so items wrapped in components of your own count too. A layout
  // effect sets it before the first paint, while the cards are still in their
  // starting style.
  const [position, setPosition] = useState({ index: 0, count: 1 });
  useLayoutEffect(() => {
    const element = ref.current;
    const popup = element?.closest('[data-slot=tap-menu-content]');
    if (!element || !popup) return;
    const all = Array.from(popup.querySelectorAll('[data-slot=tap-menu-item]'));
    const next = { index: all.indexOf(element), count: all.length };
    setPosition((current) => (current.index === next.index && current.count === next.count ? current : next));
  });
  const placed = placement(variant, position.index, position.count, arc, radius);
  return (
    <BaseMenu.Item
      data-slot="tap-menu-item"
      className={slots.item({ className })}
      style={{ ...placed, ...style }}
      {...props}
      ref={ref}
    >
      {icon != null && (
        <span data-slot="tap-menu-icon" className={slots.icon()}>
          {icon}
        </span>
      )}
      <span className={slots.label()}>
        {children}
        {description != null && <span className={slots.description()}>{description}</span>}
      </span>
      {row && shortcut != null && <span className={slots.shortcut()}>{shortcut}</span>}
    </BaseMenu.Item>
  );
}
TapMenuItem.displayName = 'TapMenu.Item';

export interface TapMenuHeadingProps extends ComponentProps<'div'> {}

/** A small heading over the cards, for `spotlight`, where they sit away from the trigger. */
function TapMenuHeading({ className, ...props }: TapMenuHeadingProps) {
  const slots = tapMenuVariants();
  return <div data-slot="tap-menu-heading" className={slots.heading({ className })} {...props} />;
}
TapMenuHeading.displayName = 'TapMenu.Heading';

export const TapMenu = Object.assign(TapMenuRoot, {
  Trigger: TapMenuTrigger,
  Content: TapMenuContent,
  Item: TapMenuItem,
  Heading: TapMenuHeading,
});

export { TapMenuTrigger, TapMenuContent, TapMenuItem, TapMenuHeading };
