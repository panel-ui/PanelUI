'use client';

/**
 * Sheet — a panel that rises over the page from one of its edges, floating
 * clear of them, and leaves with a swipe.
 *
 * ```tsx
 * <Sheet>
 *   <Sheet.Trigger render={<Button />}>Edit profile</Sheet.Trigger>
 *   <Sheet.Content>
 *     <Sheet.Header title="Edit profile" description="Shown on your public page." />
 *     <Sheet.Body>…</Sheet.Body>
 *     <Sheet.Footer>
 *       <Button>Save</Button>
 *       <Sheet.Close render={<Button variant="ghost" />}>Cancel</Sheet.Close>
 *     </Sheet.Footer>
 *   </Sheet.Content>
 * </Sheet>
 * ```
 *
 * ## It floats
 *
 * A sheet that holds a task for the page is a card laid over it, so by
 * default it stands a few pixels off every edge with all four corners rounded.
 * The corners are large and concentric with the gap around them, which is what
 * makes the card read as belonging to the screen it sits in rather than as a
 * box dropped onto it. `size="full"` or `detached={false}` gives the gap up and
 * meets the edges, for a sheet that needs every pixel.
 *
 * ## Sheets stack
 *
 * A sheet opened from inside another slides over it from the same edge, and
 * the one underneath steps back: a little smaller, pushed inward so its edge
 * still shows, and dimmed. Only the first sheet darkens the page, so two open
 * sheets do not stack two shades of black.
 *
 * The next sheet is declared once, as `Sheet.Next` with a `name`, and opened
 * by any `Sheet.Trigger to="name"` in the sheet: a row in the body, an icon in
 * the header, a button in the footer. The trigger and the sheet it opens are
 * apart in the markup because they are apart on the screen: a list of rows
 * that each open a sheet should not have to wrap every row in one. A trigger
 * can carry a `payload`, so one `Sheet.Next` serves every row of a list.
 *
 * ## The hand decides
 *
 * Every sheet follows a drag and leaves on a flick toward its own edge. The
 * grabber on a top or bottom sheet says so before anybody tries.
 *
 * With a mouse, the text in a sheet is for reading: a press on the title,
 * the description, the body or the footer selects text the way it does on the
 * page, and the sheet is dragged by its grabber and the padding around the
 * header. A finger still swipes the sheet from anywhere.
 *
 * ## The close button
 *
 * Every sheet has a round close button in its top trailing corner. Write a
 * bare `<Sheet.Close />` somewhere in the sheet to put it there instead, for
 * example first in `Sheet.Header` to stand before the title, and the one in
 * the corner steps aside. `showClose={false}` leaves the sheet with none.
 *
 * ## Slides
 *
 * `Sheet.Slides` takes the place of the body with a column of rounded
 * slides, for photos or a deck. By default it is a deck: each slide fills
 * the sheet's height, a turn of the wheel or a swipe of the trackpad glides
 * to the next slide, an arrow key moves one, and a counter under it says
 * which. Without `snap` it is a numbered column of smaller slides that
 * scrolls freely, the way a presentation's slide panel does, and pressing
 * one chooses it.
 */
import { Drawer } from '@base-ui/react/drawer';
import { ScrollArea } from '@base-ui/react/scroll-area';
import {
  Children,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';

/*
 * One curve for every movement: the sheet arriving, the one behind it stepping
 * back, the page receding. A fast start that eases into place reads as weight,
 * where a symmetric ease reads as a slide show.
 */
const MOVE =
  '[transition:transform_450ms_cubic-bezier(0.32,0.72,0,1),border-radius_450ms_cubic-bezier(0.32,0.72,0,1),margin_450ms_cubic-bezier(0.32,0.72,0,1),height_450ms_cubic-bezier(0.32,0.72,0,1)]';

const sheetVariants = tv({
  slots: {
    backdrop: [
      'fixed inset-0 z-50 bg-black opacity-[calc(var(--sheet-dim)*(1-var(--drawer-swipe-progress,0)))]',
      '[--sheet-dim:0.28] dark:[--sheet-dim:0.5]',
      'transition-opacity duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:duration-0',
      'data-starting-style:opacity-0 data-ending-style:opacity-0',
      'data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*400ms)] motion-reduce:transition-none',
    ],
    /*
     * The viewport holds the gap. The sheet is laid out inside it, so the
     * distance to every edge is one number, and the corner radius below is
     * that number's companion.
     */
    viewport: 'pointer-events-none fixed inset-0 z-50 flex [--sheet-gap:0.5rem] sm:[--sheet-gap:0.75rem]',
    popup: [
      'group/sheet pointer-events-auto relative flex min-h-0 flex-col bg-popover text-popover-foreground outline-none',
      'shadow-[0_24px_64px_-16px_rgb(0_0_0/0.3)] ring-1 ring-foreground/[0.06] dark:ring-foreground/10',
      MOVE,
      'data-swiping:select-none data-swiping:duration-0 data-nested-drawer-swiping:duration-0',
      'data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*400ms)]',
      'motion-reduce:transition-none',
      /*
       * The stack. Each sheet behind the front one is 4% smaller and pushed
       * 14px inward from its edge, so a strip of it shows past the one in front
       * and the depth can be counted. It scales about its inner edge, so the
       * strip stays put while it shrinks.
       */
      '[--sheet-scale:calc(1-var(--nested-drawers,0)*0.04)] [--sheet-push:calc(var(--nested-drawers,0)*14px)]',
      // A veil in the sheet's own colour: what is on the sheet behind fades, the
      // same way in either theme, instead of going grey under a black tint.
      "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-popover after:opacity-0 after:transition-opacity after:duration-[450ms] after:content-['']",
      'data-nested-drawer-open:after:opacity-50',
    ],
    /*
     * A top or bottom sheet behind another takes the front one's height, so
     * the strip that shows past it is the same whichever of the two is taller.
     * A taller sheet behind would otherwise stand above the stack, and a
     * shorter one would vanish behind the front one entirely.
     */
    stacked: [
      'data-nested-drawer-open:h-(--drawer-frontmost-height) data-nested-drawer-open:overflow-hidden',
      // Lets the height animate to and from `auto` where the browser can.
      '[interpolate-size:allow-keywords]',
    ],
    grabber: [
      'pointer-events-none absolute inset-x-0 z-10 mx-auto flex h-6 w-24 justify-center',
      'before:h-[5px] before:w-9 before:rounded-full before:bg-muted-foreground/35',
    ],
    close: [
      'relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full',
      'bg-muted text-muted-foreground outline-none transition-[background-color,color,scale] duration-150',
      'after:absolute after:-inset-1.5 hover:bg-foreground/10 hover:text-foreground active:scale-95',
      'focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
    ],
    closeCorner: 'absolute end-4 top-4 z-10',
    /*
     * A close button written into the header shares the title's line: the
     * header becomes three columns, the button takes the first or the last
     * depending on where it was written, and the text keeps the middle.
     */
    header: [
      'flex shrink-0 flex-col gap-1 px-6 pt-6 pb-3',
      'has-[>[data-slot=sheet-close]]:grid has-[>[data-slot=sheet-close]]:grid-cols-[auto_minmax(0,1fr)_auto] has-[>[data-slot=sheet-close]]:gap-x-3',
      '[&>*]:col-start-2',
      '[&>[data-slot=sheet-close]]:row-span-2 [&>[data-slot=sheet-close]]:row-start-1 [&>[data-slot=sheet-close]]:-my-1 [&>[data-slot=sheet-close]]:self-start',
      '[&>[data-slot=sheet-close]:first-child]:col-start-1 [&>[data-slot=sheet-close]:not(:first-child)]:col-start-3',
    ],
    title: 'text-[19px] font-semibold leading-6 tracking-[-0.01em]',
    description: 'text-[15px] leading-5 text-muted-foreground',
    body: 'relative flex min-h-0 flex-1 flex-col',
    bodyViewport: 'min-h-0 flex-1 overscroll-contain outline-none',
    bodyContent: 'px-6 pb-2',
    scrollbar:
      'my-3 me-1 flex w-1.5 opacity-0 transition-opacity delay-300 data-hovering:opacity-100 data-hovering:delay-0 data-scrolling:opacity-100 data-scrolling:delay-0',
    thumb: 'relative flex-1 rounded-full bg-foreground/20',
    footer: 'flex shrink-0 flex-col gap-2 px-6 pt-3 pb-6',
    /*
     * Slides. As a deck the viewport is a size container, so a slide can be
     * exactly its height less the padding, which is what lets one flick land
     * on one slide. The minimum height is for a sheet that sizes itself to
     * its content, where a deck would otherwise have no height to fill.
     */
    slides: 'relative flex min-h-0 flex-1 flex-col',
    // Focus is shown on the current slide, not as a square round the scroller.
    slidesViewport: 'group/slides min-h-0 flex-1 overscroll-contain outline-none',
    slidesContent: 'flex flex-col gap-3 px-3',
    // 20px is the sheet's 32 less the 12px it is set in by: one corner, two curves.
    slide: [
      'relative shrink-0 overflow-hidden rounded-[20px] bg-muted',
      '[&>img]:size-full [&>img]:object-cover [&>video]:size-full [&>video]:object-cover',
      // A hairline over the picture, so a photo keeps an edge on a sheet of its own colour.
      "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-inset after:ring-foreground/[0.08] after:content-['']",
      'group-focus-visible/slides:data-current:ring-2 group-focus-visible/slides:data-current:ring-ring',
    ],
    slideRow: 'grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-2.5',
    slideNumber: 'pt-1 text-end text-xs font-medium tabular-nums text-muted-foreground',
    slideButton: [
      'group/slide block w-full cursor-pointer rounded-[14px] text-start outline-none transition-shadow duration-150',
      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover',
    ],
    // No blur behind it: a filter over a scrolling picture repaints on every frame.
    counter:
      'pointer-events-none absolute inset-x-0 bottom-5 mx-auto w-fit rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium tabular-nums text-white',
    /*
     * The page behind steps back by 3%, not more: enough to read as a layer
     * underneath, not so much that the page looks like it shrank. It keeps its
     * own colours and draws no outline of its own: the only edge is the strip
     * of the surface it steps back onto, which is the muted tone of the theme
     * rather than black, so it is quiet in light and dark alike. A rim on top
     * of that strip doubles every border the page sits inside.
     *
     * It shrinks about its centre, so the strip is the same width on every
     * side, and its corners take `--stage-radius`: set that to the radius of
     * whatever the stage sits in, less the strip, and the two outlines are
     * concentric instead of a second, tighter curve inside the first.
     */
    stage: 'relative isolate overflow-hidden [--stage-radius:1rem]',
    stageBackground: 'absolute inset-0 -z-10 bg-muted',
    stagePage: [
      'relative h-full origin-center bg-background will-change-transform',
      'transition-[transform,border-radius] duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
      '[--stage-progress:calc(1-var(--drawer-swipe-progress,0))]',
      'data-active:[transform:scale(calc(1-0.03*var(--stage-progress)))]',
      'data-active:overflow-hidden data-active:rounded-[calc(var(--stage-radius)*var(--stage-progress))]',
    ],
  },
  variants: {
    side: {
      bottom: {
        grabber: 'top-0 items-start pt-1.5',
        viewport:
          'items-end justify-center px-(--sheet-gap) pt-12 pb-[max(var(--sheet-gap),env(safe-area-inset-bottom))]',
        popup: [
          'max-h-full w-full max-w-lg origin-[50%_0] rounded-[32px]',
          '[transform:translateY(calc(var(--drawer-swipe-movement-y,0px)-var(--sheet-push)))_scale(var(--sheet-scale))]',
          'data-starting-style:[transform:translateY(calc(100%+var(--sheet-gap)+2rem))]',
          'data-ending-style:[transform:translateY(calc(100%+var(--sheet-gap)+2rem))]',
        ],
      },
      top: {
        // Swiped up, so the grabber sits on the edge the hand pushes.
        grabber: 'bottom-0 items-end pb-1.5',
        viewport:
          'items-start justify-center px-(--sheet-gap) pb-12 pt-[max(var(--sheet-gap),env(safe-area-inset-top))]',
        popup: [
          'max-h-full w-full max-w-lg origin-[50%_100%] rounded-[32px]',
          '[transform:translateY(calc(var(--drawer-swipe-movement-y,0px)+var(--sheet-push)))_scale(var(--sheet-scale))]',
          'data-starting-style:[transform:translateY(calc(-100%-var(--sheet-gap)-2rem))]',
          'data-ending-style:[transform:translateY(calc(-100%-var(--sheet-gap)-2rem))]',
        ],
      },
      left: {
        viewport: 'items-stretch justify-start p-(--sheet-gap)',
        popup: [
          'h-full w-[min(24rem,calc(100vw-2*var(--sheet-gap)))] origin-[100%_50%] rounded-[28px]',
          '[transform:translateX(calc(var(--drawer-swipe-movement-x,0px)+var(--sheet-push)))_scale(var(--sheet-scale))]',
          'data-starting-style:[transform:translateX(calc(-100%-var(--sheet-gap)-2rem))]',
          'data-ending-style:[transform:translateX(calc(-100%-var(--sheet-gap)-2rem))]',
        ],
      },
      right: {
        viewport: 'items-stretch justify-end p-(--sheet-gap)',
        popup: [
          'h-full w-[min(24rem,calc(100vw-2*var(--sheet-gap)))] origin-[0_50%] rounded-[28px]',
          '[transform:translateX(calc(var(--drawer-swipe-movement-x,0px)-var(--sheet-push)))_scale(var(--sheet-scale))]',
          'data-starting-style:[transform:translateX(calc(100%+var(--sheet-gap)+2rem))]',
          'data-ending-style:[transform:translateX(calc(100%+var(--sheet-gap)+2rem))]',
        ],
      },
    },
    size: {
      auto: {},
      half: { popup: 'h-[min(50dvh,100%)]' },
      full: { popup: 'h-full' },
    },
    // Meets the edges it rises from instead of standing clear of them.
    attached: {
      true: {},
    },
    blur: {
      true: { backdrop: 'backdrop-blur-sm [--sheet-dim:0.16] dark:[--sheet-dim:0.36]' },
    },
  },
  compoundVariants: [
    {
      side: 'bottom',
      attached: true,
      class: {
        popup:
          '-mx-(--sheet-gap) -mb-[max(var(--sheet-gap),env(safe-area-inset-bottom))] max-w-[calc(100%+2*var(--sheet-gap))] rounded-b-none pb-[env(safe-area-inset-bottom)] sm:mx-0 sm:max-w-2xl',
      },
    },
    {
      side: 'top',
      attached: true,
      class: {
        popup:
          '-mx-(--sheet-gap) -mt-[max(var(--sheet-gap),env(safe-area-inset-top))] max-w-[calc(100%+2*var(--sheet-gap))] rounded-t-none sm:mx-0 sm:max-w-2xl',
      },
    },
    { side: 'left', attached: true, class: { popup: '-my-(--sheet-gap) -ms-(--sheet-gap) rounded-s-none' } },
    { side: 'right', attached: true, class: { popup: '-my-(--sheet-gap) -me-(--sheet-gap) rounded-e-none' } },
  ],
  defaultVariants: { side: 'bottom', size: 'auto' },
});

/** Where the sheet rises from, which is also the direction it leaves in. */
export type SheetSide = 'bottom' | 'top' | 'left' | 'right';

const SWIPE: Record<SheetSide, 'down' | 'up' | 'left' | 'right'> = {
  bottom: 'down',
  top: 'up',
  left: 'left',
  right: 'right',
};

/**
 * The sheets declared with `Sheet.Next` in one stack, by name. One map serves
 * the whole stack, so a trigger finds its sheet wherever each of them sits.
 */
interface SheetStack {
  handle(name: string): DrawerHandle<unknown>;
}

type DrawerHandle<Payload> = ReturnType<typeof Drawer.createHandle<Payload>>;

function createStack(): SheetStack {
  const handles = new Map<string, DrawerHandle<unknown>>();
  return {
    handle(name) {
      let handle = handles.get(name);
      if (!handle) {
        handle = Drawer.createHandle<unknown>();
        handles.set(name, handle);
      }
      return handle;
    },
  };
}

interface SheetContextValue {
  side: SheetSide;
  stack: SheetStack;
  /** Opened from inside another sheet, which already darkens the page. */
  nested: boolean;
  /** Set by `Sheet.Content`. */
  inline: boolean;
  /** Whether a swipe can close it, which is what the grabber offers. */
  dismissible: boolean;
  /** Whether the round close button stands in the corner. */
  showClose: boolean;
  /**
   * Called by a bare `Sheet.Close` written into the sheet, which takes the
   * corner button's place. Returns the undo.
   */
  claimClose(): () => void;
  /** Lets a sheet opened from this one be closed with it. Returns the undo. */
  register(child: SheetHandle): () => void;
  /** Closes this sheet and every sheet opened from it. */
  closeTree(): void;
  /** Whether a sheet opened from this one is open. */
  hasOpenChild(): boolean;
}

interface SheetHandle {
  isOpen(): boolean;
  closeTree(): void;
}

const SheetContext = createContext<SheetContextValue | null>(null);

function useSheet(part: string): SheetContextValue {
  const context = useContext(SheetContext);
  if (!context) throw new Error(`${part} must be used inside a <Sheet>.`);
  return context;
}

export interface SheetProps {
  children?: ReactNode;
  /** Whether the sheet is open, when the caller holds that. */
  open?: boolean;
  /** Called when the sheet asks to open or close. */
  onOpenChange?: (open: boolean) => void;
  /** Whether it starts open, when the caller does not hold it. */
  defaultOpen?: boolean;
  /** The edge it rises from and is swiped back to. Default `bottom`. */
  side?: SheetSide;
  /**
   * Whether a click outside, a swipe or Escape closes it. Turn it off for a
   * sheet that must be answered; `Sheet.Close` still works.
   */
  dismissible?: boolean;
}

function SheetRoot(props: SheetProps) {
  return <SheetFrame {...props} />;
}
SheetRoot.displayName = 'Sheet';

interface SheetFrameProps extends Omit<SheetProps, 'children'> {
  children?: ReactNode | ((payload: unknown) => ReactNode);
  /** Set by `Sheet.Next`: the handle its triggers open it through. */
  handle?: DrawerHandle<unknown>;
}

function SheetFrame({
  children,
  open,
  onOpenChange,
  defaultOpen = false,
  side = 'bottom',
  dismissible = true,
  handle: drawerHandle,
}: SheetFrameProps) {
  // A sheet inside another sheet's content finds that sheet's context.
  const parent = useContext(SheetContext);
  const nested = parent !== null && !parent.inline;
  const [ownStack] = useState(createStack);
  const stack = nested && parent ? parent.stack : ownStack;
  // Held here as well as by the primitive, so a sheet opened from this one
  // can close it.
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open ?? internalOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [open, onOpenChange]
  );
  // The sheets opened from this one, so a press on the page behind them all
  // can close the whole stack. The primitive gives that press to no one
  // while a second sheet is open.
  const opened = useRef(new Set<SheetHandle>());
  const live = useRef({ isOpen, setOpen });
  live.current = { isOpen, setOpen };
  const handle = useMemo<SheetHandle>(
    () => ({
      isOpen: () => live.current.isOpen,
      closeTree: () => {
        opened.current.forEach((child) => child.closeTree());
        if (live.current.isOpen) live.current.setOpen(false);
      },
    }),
    []
  );
  useEffect(() => (nested && parent ? parent.register(handle) : undefined), [nested, parent, handle]);

  const context = useMemo<SheetContextValue>(
    () => ({
      side,
      stack,
      nested,
      inline: false,
      dismissible,
      showClose: true,
      claimClose: () => () => {},
      register: (child) => {
        opened.current.add(child);
        return () => opened.current.delete(child);
      },
      closeTree: handle.closeTree,
      hasOpenChild: () => [...opened.current].some((child) => child.isOpen()),
    }),
    [side, stack, nested, dismissible, handle]
  );

  return (
    <SheetContext.Provider value={context}>
      <Drawer.Root
        open={isOpen}
        handle={drawerHandle}
        swipeDirection={SWIPE[side]}
        disablePointerDismissal={!dismissible}
        onOpenChange={(next, details) => {
          // The primitive has a switch for a press outside and none for
          // Escape or a swipe, so those are refused here.
          if (
            !next &&
            !dismissible &&
            details.reason !== 'close-press' &&
            details.reason !== 'imperative-action'
          ) {
            return;
          }
          setOpen(next);
        }}
      >
        {typeof children === 'function'
          ? ({ payload }: { payload: unknown }) => children(payload)
          : children}
      </Drawer.Root>
    </SheetContext.Provider>
  );
}

export interface SheetTriggerProps extends Omit<ComponentProps<'button'>, 'children'> {
  children?: ReactNode;
  /**
   * Your own element to be the trigger, such as a styled button. It is given
   * the click handler and the attributes that tie it to the sheet.
   */
  render?: ReactElement;
  /**
   * The `name` of a `Sheet.Next` to open instead of the sheet this trigger is
   * in. Any button in a sheet can open the next one this way, wherever it sits.
   */
  to?: string;
  /**
   * Handed to the `Sheet.Next` that `to` names, as the argument of its
   * children function. Use it to open one sheet for every row of a list.
   */
  payload?: unknown;
}

/**
 * What opens a sheet: its own, or with `to`, the `Sheet.Next` of that name.
 * A plain button unless `render` supplies one.
 */
function SheetTrigger({ render, children, to, payload, ...props }: SheetTriggerProps) {
  const sheet = useContext(SheetContext);
  if (to !== undefined) {
    if (!sheet) throw new Error('Sheet.Trigger with `to` must be used inside a <Sheet>.');
    return (
      <Drawer.Trigger handle={sheet.stack.handle(to)} payload={payload} render={render} {...props}>
        {children}
      </Drawer.Trigger>
    );
  }
  return (
    <Drawer.Trigger render={render} {...props}>
      {children}
    </Drawer.Trigger>
  );
}
SheetTrigger.displayName = 'Sheet.Trigger';

export interface SheetNextProps extends Omit<SheetContentProps, 'children' | 'inline'> {
  /** What a `Sheet.Trigger` passes as `to` to open this sheet. Unique within one stack of sheets. */
  name: string;
  /**
   * The sheet's parts. Pass a function to read the `payload` of the trigger
   * that opened it; it is `undefined` when that trigger has none.
   */
  children?: ReactNode | ((payload: any) => ReactNode);
  /** The edge it rises from. Default: the edge of the sheet it is declared in. */
  side?: SheetSide;
  /** Whether a click outside, a swipe or Escape closes it. Default true. */
  dismissible?: boolean;
  /** Called when it opens or closes. */
  onOpenChange?: (open: boolean) => void;
}

/**
 * A sheet opened from the one it is declared in, by any `Sheet.Trigger` whose
 * `to` is its `name`. Put it anywhere inside the first sheet's content; it
 * takes `Sheet.Content`'s props and draws its own content, so its children are
 * the header, body and footer.
 */
function SheetNext({ name, children, side, dismissible, onOpenChange, ...content }: SheetNextProps) {
  const parent = useSheet('Sheet.Next');
  return (
    <SheetFrame
      handle={parent.stack.handle(name)}
      side={side ?? parent.side}
      dismissible={dismissible}
      onOpenChange={onOpenChange}
    >
      {(payload) => (
        <SheetContent {...content}>
          {typeof children === 'function' ? <NextParts render={children} payload={payload} /> : children}
        </SheetContent>
      )}
    </SheetFrame>
  );
}
SheetNext.displayName = 'Sheet.Next';

/**
 * Calls a `Sheet.Next` children function. As a component of its own it only
 * runs once the sheet is open and its content mounted, which is when the
 * trigger has handed over its payload.
 */
function NextParts({ render, payload }: { render: (payload: any) => ReactNode; payload: unknown }) {
  return <>{render(payload)}</>;
}

export interface SheetContentProps extends Omit<ComponentProps<'div'>, 'children'> {
  children?: ReactNode;
  /**
   * Stand clear of the screen edges with every corner rounded. On by default;
   * off, the sheet meets the edges it rises from.
   */
  detached?: boolean;
  /**
   * How tall a top or bottom sheet is. `auto` fits the content; `half` and
   * `full` take that share of the screen, and `full` meets the edges.
   */
  size?: 'auto' | 'half' | 'full';
  /**
   * Show the grabber. On by default for a top or bottom sheet that a swipe
   * can close, and off when `dismissible` is.
   */
  showGrabber?: boolean;
  /**
   * Show the round close button in the top trailing corner. Default true.
   * Write a bare `<Sheet.Close />` into the sheet to place it somewhere else,
   * or set this to `false` for a sheet with no close button at all.
   */
  showClose?: boolean;
  /** Frost the page behind the sheet instead of only dimming it. */
  blur?: boolean;
  /**
   * Draw the sheet in the page instead of over it: no backdrop, no trigger,
   * always there. For previews and for a layout that shows the sheet as part
   * of a screen.
   */
  inline?: boolean;
}

/** The sheet itself, with the backdrop behind it. */
function SheetContent({
  children,
  detached = true,
  size = 'auto',
  showGrabber,
  showClose = true,
  blur = false,
  inline = false,
  className,
  ...props
}: SheetContentProps) {
  const sheet = useSheet('Sheet.Content');
  const vertical = sheet.side === 'bottom' || sheet.side === 'top';
  const slots = sheetVariants({
    side: sheet.side,
    size: vertical ? size : undefined,
    attached: !detached || (vertical && size === 'full'),
    blur,
  });
  // Bare close buttons written into the sheet. While there is one, the
  // corner button is not drawn.
  const [placed, setPlaced] = useState(0);
  const claimClose = useCallback(() => {
    setPlaced((count) => count + 1);
    return () => setPlaced((count) => count - 1);
  }, []);
  const corner = showClose && placed === 0;
  const context = useMemo(
    () => ({ ...sheet, inline, showClose: corner, claimClose }),
    [sheet, inline, corner, claimClose]
  );

  const inside = (
    <>
      {(showGrabber ?? (vertical && sheet.dismissible)) ? <div aria-hidden className={slots.grabber()} /> : null}
      {corner ? <CloseButton className={slots.closeCorner()} /> : null}
      {children}
    </>
  );

  if (inline) {
    return (
      <SheetContext.Provider value={context}>
        <div className={slots.popup({ className: ['[transform:none]', className] })} {...props}>
          {inside}
        </div>
      </SheetContext.Provider>
    );
  }

  return (
    <Drawer.Portal>
      {/* The first sheet darkens the page; one opened from it does not add a second shade. */}
      {sheet.nested ? null : (
        <Drawer.Backdrop
          className={slots.backdrop()}
          // With a second sheet open, a press here is outside both, and closes both.
          onClick={() => {
            if (sheet.hasOpenChild()) sheet.closeTree();
          }}
        />
      )}
      <Drawer.Viewport className={slots.viewport()}>
        <Drawer.Popup className={slots.popup({ className: [vertical && slots.stacked(), className] })} {...props}>
          {/* The popup is portalled out from under the provider, so the
              context is given again for the parts inside it. */}
          <SheetContext.Provider value={context}>{inside}</SheetContext.Provider>
        </Drawer.Popup>
      </Drawer.Viewport>
    </Drawer.Portal>
  );
}
SheetContent.displayName = 'Sheet.Content';

export interface SheetHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** The heading. In an open sheet it is also what the sheet is announced as. */
  title?: ReactNode;
  /** A line under the heading. */
  description?: ReactNode;
}

/**
 * The heading block. It leaves room for the close button beside the title,
 * so the two share the top line instead of stacking.
 */
function SheetHeader({ title, description, className, children, ...props }: SheetHeaderProps) {
  const { showClose } = useSheet('Sheet.Header');
  const slots = sheetVariants();
  return (
    <div className={slots.header({ className: [showClose && 'pe-14', className] })} {...props}>
      {title !== undefined ? <SheetTitle>{title}</SheetTitle> : null}
      {description !== undefined ? <SheetDescription>{description}</SheetDescription> : null}
      {children}
    </div>
  );
}
SheetHeader.displayName = 'Sheet.Header';

export interface SheetTitleProps extends ComponentProps<'h2'> {}

/** The sheet's name, announced when it opens. */
function SheetTitle({ className, ...props }: SheetTitleProps) {
  const { inline } = useSheet('Sheet.Title');
  const slots = sheetVariants();
  if (inline) return <h2 className={slots.title({ className })} {...props} />;
  return <Drawer.Content render={<Drawer.Title className={slots.title({ className })} {...props} />} />;
}
SheetTitle.displayName = 'Sheet.Title';

export interface SheetDescriptionProps extends ComponentProps<'p'> {}

/** A sentence under the title, read out after it. */
function SheetDescription({ className, ...props }: SheetDescriptionProps) {
  const { inline } = useSheet('Sheet.Description');
  const slots = sheetVariants();
  if (inline) return <p className={slots.description({ className })} {...props} />;
  return (
    <Drawer.Content render={<Drawer.Description className={slots.description({ className })} {...props} />} />
  );
}
SheetDescription.displayName = 'Sheet.Description';

export interface SheetBodyProps extends ComponentProps<'div'> {}

/**
 * The part that scrolls. The header and footer stay put while it moves, and
 * the scrollbar is a thin drawn thumb that shows while the content is moving.
 */
function SheetBody({ className, children, ...props }: SheetBodyProps) {
  const { inline } = useSheet('Sheet.Body');
  const slots = sheetVariants();
  const content = (
    <ScrollArea.Content className={slots.bodyContent({ className })} {...props}>
      {children}
    </ScrollArea.Content>
  );
  return (
    <ScrollArea.Root className={slots.body()}>
      <ScrollArea.Viewport className={slots.bodyViewport()}>
        {inline ? content : <Drawer.Content render={content} />}
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation="vertical" className={slots.scrollbar()}>
        <ScrollArea.Thumb className={slots.thumb()} />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}
SheetBody.displayName = 'Sheet.Body';

export interface SheetFooterProps extends ComponentProps<'div'> {}

/** The actions, stacked full width at the bottom of the sheet. */
function SheetFooter({ className, ...props }: SheetFooterProps) {
  const { inline } = useSheet('Sheet.Footer');
  const slots = sheetVariants();
  const footer = <div className={slots.footer({ className })} {...props} />;
  return inline ? footer : <Drawer.Content render={footer} />;
}
SheetFooter.displayName = 'Sheet.Footer';

export interface SheetCloseProps extends ComponentProps<'button'> {
  /**
   * Your own element to close the sheet with, such as a Cancel button.
   * Without it, and without children, this is the round close button, drawn
   * where it is written in place of the one in the corner.
   */
  render?: ReactElement;
  /** Draw the round close button. A `Sheet.Close` with nothing inside it already is one. */
  icon?: boolean;
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Closes the sheet. Works even when `dismissible` is off. Written bare, it is
 * the round close button, and the sheet stops drawing its own in the corner.
 */
function SheetClose({ render, icon = false, children, ...props }: SheetCloseProps) {
  const sheet = useSheet('Sheet.Close');
  const bare = icon || (render === undefined && children === undefined);
  const { claimClose } = sheet;
  useIsomorphicLayoutEffect(() => (bare ? claimClose() : undefined), [bare, claimClose]);
  if (bare) return <CloseButton {...props} />;
  if (sheet.inline) {
    return (
      <button type="button" data-slot="sheet-close" {...props}>
        {children}
      </button>
    );
  }
  return (
    <Drawer.Close data-slot="sheet-close" render={render} {...props}>
      {children}
    </Drawer.Close>
  );
}
SheetClose.displayName = 'Sheet.Close';

/** The round button with a cross in it. */
function CloseButton({ className, 'aria-label': label = 'Close', ...props }: ComponentProps<'button'>) {
  const { inline } = useSheet('Sheet.Close');
  const slots = sheetVariants();
  const glyph = (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
  const shared = { 'data-slot': 'sheet-close', 'aria-label': label, className: slots.close({ className }), ...props };
  if (inline) {
    return (
      <button type="button" {...shared}>
        {glyph}
      </button>
    );
  }
  return <Drawer.Close {...shared}>{glyph}</Drawer.Close>;
}

/* ----------------------------------------------------------------- slides */

interface SlidesContextValue {
  snap: boolean;
  count: number;
  current: number;
  choose(index: number): void;
  /** Set when pressing a slide chooses it. */
  pressable: boolean;
}

const SlidesContext = createContext<SlidesContextValue | null>(null);

/** The rounded frame of a slide: the slide itself in a deck, inside its row in a column. */
const frameOf = (slide: HTMLElement) => slide.querySelector<HTMLElement>('[data-slide-frame]') ?? slide;
const SlideIndexContext = createContext(0);

function reduceMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface SheetSlidesProps extends Omit<ComponentProps<'div'>, 'onChange'> {
  /**
   * `true` makes it a deck: each slide fills the height, and a scroll
   * glides to the next one. `false` makes it a numbered column of smaller
   * slides that scrolls freely. Default `true`.
   */
  snap?: boolean;
  /** The current slide, counted from 0, when the caller holds it. Setting it scrolls that slide into view. */
  index?: number;
  /** The slide to start on, when the caller does not hold it. Default `0`. */
  defaultIndex?: number;
  /**
   * Called with the new index when the current slide changes: scrolled to
   * in a deck, pressed in a column. In a column, passing it makes each
   * slide a button.
   */
  onIndexChange?: (index: number) => void;
  /** Show "3 / 8" under the current slide. Default: on in a deck. */
  counter?: boolean;
  /** The shape of a slide in a column, as a CSS aspect ratio. Default `16 / 9`. */
  aspect?: string;
}

/**
 * A column of rounded slides in place of `Sheet.Body`: a deck that moves one
 * slide at a time, or with `snap={false}`, a numbered column to choose from.
 */
function SheetSlides({
  snap = true,
  index,
  defaultIndex = 0,
  onIndexChange,
  counter,
  aspect = '16 / 9',
  className,
  style,
  children,
  'aria-label': label = 'Slides',
  ...props
}: SheetSlidesProps) {
  const slots = sheetVariants();
  const viewport = useRef<HTMLDivElement>(null);
  const slides = Children.toArray(children);
  const count = slides.length;
  const [internal, setInternal] = useState(defaultIndex);
  const current = Math.min(Math.max(index ?? internal, 0), Math.max(count - 1, 0));
  const live = useRef({ current, onIndexChange, controlled: index !== undefined });
  live.current = { current, onIndexChange, controlled: index !== undefined };

  const slideAt = (at: number) =>
    viewport.current?.querySelectorAll<HTMLElement>('[data-slot=sheet-slide]')[at] ?? null;
  // Scrolls the slides alone. `scrollIntoView` would move every scroller
  // above them too, the page included when a sheet is drawn inline.
  const reveal = useCallback(
    (at: number, smooth: boolean) => {
      const root = viewport.current;
      const slide = slideAt(at);
      if (!root || !slide) return;
      const box = root.getBoundingClientRect();
      const frame = frameOf(slide).getBoundingClientRect();
      const above = frame.top - box.top;
      const below = frame.bottom - box.bottom;
      const by = snap ? above - (box.height - frame.height) / 2 : above < 0 ? above - 8 : below > 0 ? below + 8 : 0;
      if (by === 0) return;
      const behavior = smooth && !reduceMotion() ? 'smooth' : 'auto';
      if (!snap) {
        root.scrollBy({ top: by, behavior });
        return;
      }
      // A deck stops at every slide on the way, which is right for a hand
      // and wrong for Home or End. Snapping is off for the length of a jump.
      root.style.scrollSnapType = 'none';
      root.scrollBy({ top: by, behavior });
      let restored = false;
      const restore = () => {
        if (restored) return;
        restored = true;
        root.style.scrollSnapType = '';
      };
      if (behavior === 'smooth' && 'onscrollend' in window) {
        root.addEventListener('scrollend', restore, { once: true });
        window.setTimeout(restore, 1200);
      } else {
        requestAnimationFrame(restore);
      }
    },
    [snap]
  );

  // The slide last brought into view. One that became current by being
  // scrolled to is already in view, and must not be scrolled to again: that
  // would pull a deck back to it in the middle of a longer scroll.
  const shown = useRef<number | null>(null);

  const settle = useCallback((next: number) => {
    shown.current = next;
    if (next === live.current.current) return;
    if (!live.current.controlled) setInternal(next);
    live.current.onIndexChange?.(next);
  }, []);

  // A deck's current slide is the one most in view.
  useEffect(() => {
    const root = viewport.current;
    if (!snap || !root || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) settle(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { root, threshold: 0.6 }
    );
    root.querySelectorAll('[data-slot=sheet-slide]').forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [snap, count, settle]);

  // Opens on the current slide, and follows `index` when it is set from outside.
  useEffect(() => {
    const first = shown.current === null;
    if (!first && shown.current === current) return;
    shown.current = current;
    if (first && current === 0) return;
    const box = viewport.current?.getBoundingClientRect();
    const slide = slideAt(current);
    const frame = slide ? frameOf(slide).getBoundingClientRect() : undefined;
    const visible = box && frame && frame.top >= box.top - 1 && frame.bottom <= box.bottom + 1;
    // A deck that scrolled there by itself is already on it.
    if (!visible || (first && snap)) reveal(current, !first);
  }, [current, reveal, snap]);

  const go = (next: number) => {
    const at = Math.min(Math.max(next, 0), count - 1);
    if (snap) reveal(at, true);
    else {
      settle(at);
      reveal(at, true);
      slideAt(at)?.querySelector<HTMLElement>('button')?.focus();
    }
  };
  const goNow = useRef(go);
  goNow.current = go;

  /*
   * A wheel or a trackpad turns a deck one slide per gesture. Left to the
   * browser, a slow scroll drifts part of the way, eases off and springs
   * back, and a fast one runs past several slides. Here a deliberate scroll
   * glides to the next slide, and the rest of the same gesture, the
   * trackpad's momentum included, is absorbed rather than fought. A touch
   * screen keeps the browser's own snapping, which follows the finger.
   */
  useEffect(() => {
    const root = viewport.current;
    if (!snap || !root) return;
    let pending = 0;
    let lastWheel = 0;
    let lockedUntil = 0;
    const onWheel = (event: WheelEvent) => {
      // Sideways scrolling and pinch-zoom are not turns.
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      const now = performance.now();
      const gap = now - lastWheel;
      lastWheel = now;
      if (now < lockedUntil) {
        // Still the same gesture: keep it from turning a second slide.
        lockedUntil = Math.max(lockedUntil, now + 140);
        return;
      }
      if (gap > 200) pending = 0;
      pending += event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      if (Math.abs(pending) < 24) return;
      const step = Math.sign(pending);
      pending = 0;
      lockedUntil = now + 500;
      goNow.current(live.current.current + step);
    };
    root.addEventListener('wheel', onWheel, { passive: false });
    return () => root.removeEventListener('wheel', onWheel);
  }, [snap]);

  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === 'ArrowDown' || event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey)
        ? 1
        : event.key === 'ArrowUp' || event.key === 'PageUp' || (event.key === ' ' && event.shiftKey)
          ? -1
          : 0;
    if (step !== 0) {
      event.preventDefault();
      go(current + step);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      go(event.key === 'Home' ? 0 : count - 1);
    }
  };

  const context = useMemo<SlidesContextValue>(
    () => ({ snap, count, current, choose: settle, pressable: !snap && onIndexChange !== undefined }),
    [snap, count, current, settle, onIndexChange]
  );

  return (
    <SlidesContext.Provider value={context}>
      <ScrollArea.Root
        data-slot="sheet-slides"
        data-snap={snap ? '' : undefined}
        className={slots.slides({ className })}
        style={{ ...style, ['--slide-aspect' as string]: aspect } as CSSProperties}
        {...props}
      >
        <ScrollArea.Viewport
          ref={viewport}
          tabIndex={0}
          aria-roledescription="carousel"
          aria-label={label}
          onKeyDown={keys}
          className={slots.slidesViewport({
            className: snap
              ? 'min-h-[min(60dvh,32rem)] snap-y snap-mandatory [container-type:size]'
              : undefined,
          })}
        >
          <ScrollArea.Content className={slots.slidesContent({ className: snap ? 'py-1.5' : 'gap-2 pb-3 pt-1' })}>
            {slides.map((slide, at) => (
              <SlideIndexContext.Provider key={at} value={at}>
                {slide}
              </SlideIndexContext.Provider>
            ))}
          </ScrollArea.Content>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className={slots.scrollbar()}>
          <ScrollArea.Thumb className={slots.thumb()} />
        </ScrollArea.Scrollbar>
        {(counter ?? snap) && count > 1 ? (
          <div data-slot="sheet-slides-counter" aria-hidden="true" className={slots.counter()}>
            {current + 1} / {count}
          </div>
        ) : null}
      </ScrollArea.Root>
    </SlidesContext.Provider>
  );
}
SheetSlides.displayName = 'Sheet.Slides';

export interface SheetSlideProps extends ComponentProps<'div'> {
  /**
   * What a screen reader calls it, after its place: "3 of 8, Harbour at
   * dawn". An image's `alt` usually says it already.
   */
  label?: string;
  /** Its shape in a column, overriding `Sheet.Slides`' `aspect`. */
  aspect?: string;
}

/** One slide: a rounded frame that fills with an image, a video or anything drawn. */
function SheetSlide({ label, aspect, className, style, children, ...props }: SheetSlideProps) {
  const slides = useContext(SlidesContext);
  if (!slides) throw new Error('Sheet.Slide must be used inside <Sheet.Slides>.');
  const at = useContext(SlideIndexContext);
  const slots = sheetVariants();
  const place = `${at + 1} of ${slides.count}`;
  const selected = at === slides.current;
  const name = label ? `${place}, ${label}` : place;
  const frameClass = slots.slide({
    className: [
      slides.snap
        ? 'h-[calc(100cqh-0.75rem)] snap-center'
        : // In a column a slide sits on the sheet's own colour, so it takes the
          // theme's border as a real edge, and a shadow to stand off the sheet.
          'aspect-(--slide-aspect) rounded-[14px] shadow-xs ring-1 ring-border transition-shadow duration-150 after:hidden',
      !slides.snap && !selected && slides.pressable && 'group-hover/slide:ring-foreground/25',
      // Chosen in a column: a ring in the info colour, the theme's colour for
      // something switched on, clear of the slide's edge.
      !slides.snap && selected && 'shadow-none ring-2 ring-[var(--info)] ring-offset-2 ring-offset-popover',
      className,
    ],
  });
  const frameStyle = aspect ? { ...style, aspectRatio: aspect } : style;

  // In a deck the slide is the frame, so the observer that finds the current
  // one has a box to watch.
  if (slides.snap) {
    return (
      <div
        data-slot="sheet-slide"
        data-slide-frame=""
        data-index={at}
        data-current={selected ? '' : undefined}
        role="group"
        aria-roledescription="slide"
        aria-label={name}
        className={frameClass}
        style={frameStyle}
        {...props}
      >
        {children}
      </div>
    );
  }

  const frame = (
    <div data-slide-frame="" data-current={selected ? '' : undefined} className={frameClass} style={frameStyle}>
      {children}
    </div>
  );

  return (
    <div data-slot="sheet-slide" data-index={at} data-selected={selected ? '' : undefined} className={slots.slideRow()} {...props}>
      <span aria-hidden="true" className={slots.slideNumber({ className: selected ? 'text-[var(--info)]' : undefined })}>
        {at + 1}
      </span>
      {slides.pressable ? (
        <button
          type="button"
          aria-label={label ? name : `Slide ${place}`}
          aria-current={selected ? 'true' : undefined}
          className={slots.slideButton()}
          onClick={() => slides.choose(at)}
        >
          {frame}
        </button>
      ) : (
        <div role="group" aria-roledescription="slide" aria-label={name}>
          {frame}
        </div>
      )}
    </div>
  );
}
SheetSlide.displayName = 'Sheet.Slide';

export interface SheetStageProps extends ComponentProps<'div'> {}

/**
 * Wrap the app — or the part of the page a sheet belongs to — in this, and
 * the page steps back slightly while a sheet is open. Sheets opened anywhere
 * inside it take part.
 */
function SheetStage({ className, children, ...props }: SheetStageProps) {
  const slots = sheetVariants();
  return (
    <Drawer.Provider>
      <div className={slots.stage({ className })} {...props}>
        <Drawer.IndentBackground className={slots.stageBackground()} />
        <Drawer.Indent className={slots.stagePage()}>{children}</Drawer.Indent>
      </div>
    </Drawer.Provider>
  );
}
SheetStage.displayName = 'Sheet.Stage';

export const Sheet = Object.assign(SheetRoot, {
  Trigger: SheetTrigger,
  Next: SheetNext,
  Content: SheetContent,
  Header: SheetHeader,
  Title: SheetTitle,
  Description: SheetDescription,
  Body: SheetBody,
  Footer: SheetFooter,
  Close: SheetClose,
  Stage: SheetStage,
  Slides: SheetSlides,
  Slide: SheetSlide,
});

export {
  SheetTrigger,
  SheetNext,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
  SheetClose,
  SheetStage,
  SheetSlides,
  SheetSlide,
};
