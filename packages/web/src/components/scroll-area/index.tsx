/**
 * ScrollArea — a box that scrolls, with a thin scrollbar drawn over its
 * content instead of the browser's own.
 *
 * ```tsx
 * <ScrollArea className="h-80 rounded-2xl border">
 *   <article>…</article>
 * </ScrollArea>
 *
 * <ScrollArea.Root className="h-80 rounded-2xl border">
 *   <ScrollArea.Viewport ref={viewport}>
 *     <ScrollArea.Content>…</ScrollArea.Content>
 *   </ScrollArea.Viewport>
 *   <ScrollArea.Scrollbar />
 * </ScrollArea.Root>
 * ```
 *
 * ## The bar takes no room
 *
 * A native scrollbar takes a gutter out of the box on most desktops, so the
 * content is narrower than the frame and anything drawn edge to edge, such as
 * a header's cover, stops short of the right-hand side. Here the bar is laid
 * over the content, so the content keeps the full width. It shows while the
 * box is hovered or scrolled, then fades.
 *
 * ## The corners clip everything
 *
 * The root clips its content and isolates it, and the viewport takes the
 * root's radius. A sticky, blurred or transformed child is painted on a layer
 * of its own, and a scroller's rounded corner does not always clip that
 * layer; the root's clip does. Give the radius to the root, not the viewport.
 *
 * ## The viewport is the scroller
 *
 * Code that listens to scrolling, such as a table of contents or a header
 * that collapses, wants the element that moves. That is the viewport, so it
 * is the one a `ref` reaches: `viewportRef` on `ScrollArea`, or `ref` on
 * `ScrollArea.Viewport`.
 */
import { ScrollArea as Primitive } from '@base-ui/react/scroll-area';
import { forwardRef, type ComponentProps, type ReactNode, type Ref } from 'react';
import { tv } from 'tailwind-variants';

export type ScrollAreaOrientation = 'vertical' | 'horizontal' | 'both';

const scrollAreaVariants = tv({
  slots: {
    root: 'relative isolate flex min-h-0 flex-col overflow-hidden',
    viewport: [
      'min-h-0 flex-1 rounded-[inherit] outline-none',
      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
      'data-has-overflow-y:overscroll-y-contain data-has-overflow-x:overscroll-x-contain',
    ],
    // Passes the radius on, for children that round their own top corners.
    content: 'rounded-[inherit]',
    scrollbar: [
      'z-10 m-1 flex touch-none select-none rounded-full p-px opacity-0 transition-opacity delay-300 duration-150',
      'data-[orientation=vertical]:w-2 data-[orientation=horizontal]:h-2 data-[orientation=horizontal]:flex-col',
      'data-hovering:opacity-100 data-hovering:delay-0 data-scrolling:opacity-100 data-scrolling:delay-0',
      'motion-reduce:transition-none',
    ],
    thumb: [
      'relative flex-1 rounded-full bg-foreground/20 transition-colors duration-150',
      'hover:bg-foreground/35 active:bg-foreground/40',
      // A larger target than the drawn thumb, so it can be caught with a pointer.
      'before:absolute before:-inset-1 before:content-[""]',
    ],
    corner: 'bg-transparent',
  },
  variants: {
    /**
     * Fades the content out where more of it is scrolled past, by the amount
     * that is hidden, so an edge with nothing beyond it stays sharp.
     */
    fade: {
      true: {
        viewport: [
          '[--scroll-area-fade:1.5rem]',
          'mask-t-from-[calc(100%-min(var(--scroll-area-fade),var(--scroll-area-overflow-y-start)))]',
          'mask-b-from-[calc(100%-min(var(--scroll-area-fade),var(--scroll-area-overflow-y-end)))]',
          'mask-l-from-[calc(100%-min(var(--scroll-area-fade),var(--scroll-area-overflow-x-start)))]',
          'mask-r-from-[calc(100%-min(var(--scroll-area-fade),var(--scroll-area-overflow-x-end)))]',
        ],
      },
    },
    /**
     * Keeps the content clear of the bar while it overflows, for rows with
     * something at their far end that the thumb would otherwise cover.
     */
    gutter: {
      true: { viewport: 'data-has-overflow-y:pe-3 data-has-overflow-x:pb-3' },
    },
  },
});

export interface ScrollAreaProps extends Omit<ComponentProps<'div'>, 'dir'> {
  /** Which ways it scrolls. Each gets its own bar. Default `vertical`. */
  orientation?: ScrollAreaOrientation;
  /** Fades the content out at an edge it continues past. Default `false`. */
  fade?: boolean;
  /**
   * Holds the content clear of the bar while there is something to scroll,
   * instead of letting the bar sit over it. Default `false`.
   */
  gutter?: boolean;
  /**
   * The element that scrolls, for code that listens to it: pass it as a
   * table of contents' `root` or a scroll header's `scrollRef`.
   */
  viewportRef?: Ref<HTMLDivElement>;
  /** Classes for the viewport, the element that scrolls. */
  viewportClassName?: string;
  /** Classes for the element that holds the content inside the viewport. */
  contentClassName?: string;
  children?: ReactNode;
}

/** A box that scrolls, with a thin bar drawn over its content. */
const ScrollAreaBase = forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(
  {
    orientation = 'vertical',
    fade = false,
    gutter = false,
    viewportRef,
    viewportClassName,
    contentClassName,
    className,
    children,
    ...props
  },
  ref
) {
  const slots = scrollAreaVariants({ fade, gutter });
  const vertical = orientation !== 'horizontal';
  const horizontal = orientation !== 'vertical';
  return (
    <Primitive.Root ref={ref} data-slot="scroll-area" className={slots.root({ className })} {...props}>
      <Primitive.Viewport
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        className={slots.viewport({ className: viewportClassName })}
      >
        <Primitive.Content
          data-slot="scroll-area-content"
          className={slots.content({ className: contentClassName })}
          // Lets wide content wrap to the viewport, unless it is meant to scroll sideways.
          style={horizontal ? undefined : { minWidth: 0 }}
        >
          {children}
        </Primitive.Content>
      </Primitive.Viewport>
      {vertical ? <ScrollAreaScrollbar orientation="vertical" /> : null}
      {horizontal ? <ScrollAreaScrollbar orientation="horizontal" /> : null}
      {vertical && horizontal ? <ScrollAreaCorner /> : null}
    </Primitive.Root>
  );
});
ScrollAreaBase.displayName = 'ScrollArea';

export interface ScrollAreaRootProps extends Omit<ComponentProps<'div'>, 'dir'> {}

/** The frame, for composing the parts yourself. It clips and holds the radius. */
const ScrollAreaRoot = forwardRef<HTMLDivElement, ScrollAreaRootProps>(function ScrollAreaRoot(
  { className, ...props },
  ref
) {
  return (
    <Primitive.Root ref={ref} data-slot="scroll-area" className={scrollAreaVariants().root({ className })} {...props} />
  );
});
ScrollAreaRoot.displayName = 'ScrollArea.Root';

export interface ScrollAreaViewportProps extends ComponentProps<'div'> {
  /** Fades the content out at an edge it continues past. Default `false`. */
  fade?: boolean;
  /** Holds the content clear of the bar while there is something to scroll. Default `false`. */
  gutter?: boolean;
}

/** The element that scrolls. Its `ref` is what scroll listeners want. */
const ScrollAreaViewport = forwardRef<HTMLDivElement, ScrollAreaViewportProps>(function ScrollAreaViewport(
  { fade = false, gutter = false, className, ...props },
  ref
) {
  return (
    <Primitive.Viewport
      ref={ref}
      data-slot="scroll-area-viewport"
      className={scrollAreaVariants({ fade, gutter }).viewport({ className })}
      {...props}
    />
  );
});
ScrollAreaViewport.displayName = 'ScrollArea.Viewport';

export interface ScrollAreaContentProps extends ComponentProps<'div'> {}

/** What is scrolled. Measured to size the thumb. */
const ScrollAreaContent = forwardRef<HTMLDivElement, ScrollAreaContentProps>(function ScrollAreaContent(
  { className, ...props },
  ref
) {
  return (
    <Primitive.Content
      ref={ref}
      data-slot="scroll-area-content"
      className={scrollAreaVariants().content({ className })}
      {...props}
    />
  );
});
ScrollAreaContent.displayName = 'ScrollArea.Content';

export interface ScrollAreaScrollbarProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** Which way this bar moves. Default `vertical`. */
  orientation?: 'vertical' | 'horizontal';
}

/** The track and its thumb, laid over the content's edge. */
function ScrollAreaScrollbar({ orientation = 'vertical', className, ...props }: ScrollAreaScrollbarProps) {
  const slots = scrollAreaVariants();
  return (
    <Primitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={slots.scrollbar({ className })}
      {...props}
    >
      <Primitive.Thumb data-slot="scroll-area-thumb" className={slots.thumb()} />
    </Primitive.Scrollbar>
  );
}
ScrollAreaScrollbar.displayName = 'ScrollArea.Scrollbar';

export interface ScrollAreaCornerProps extends ComponentProps<'div'> {}

/** The square where two bars meet, when it scrolls both ways. */
function ScrollAreaCorner({ className, ...props }: ScrollAreaCornerProps) {
  return (
    <Primitive.Corner
      data-slot="scroll-area-corner"
      className={scrollAreaVariants().corner({ className })}
      {...props}
    />
  );
}
ScrollAreaCorner.displayName = 'ScrollArea.Corner';

export const ScrollArea = Object.assign(ScrollAreaBase, {
  Root: ScrollAreaRoot,
  Viewport: ScrollAreaViewport,
  Content: ScrollAreaContent,
  Scrollbar: ScrollAreaScrollbar,
  Corner: ScrollAreaCorner,
});

export {
  ScrollAreaRoot,
  ScrollAreaViewport,
  ScrollAreaContent,
  ScrollAreaScrollbar,
  ScrollAreaCorner,
  scrollAreaVariants,
};
