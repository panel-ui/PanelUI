'use client';

/**
 * ScrollHeader — a page header that hands over to a compact sticky bar as the
 * reader scrolls.
 *
 * ```tsx
 * <ScrollHeader>
 *   <ScrollHeader.Cover />
 *   <ScrollHeader.Bar>
 *     <ScrollHeader.Title>Field notes</ScrollHeader.Title>
 *     <ScrollHeader.Actions>
 *       <Button variant="ghost" size="icon" aria-label="Share">
 *         <ShareIcon />
 *       </Button>
 *     </ScrollHeader.Actions>
 *   </ScrollHeader.Bar>
 *   <ScrollHeader.Large>
 *     <ScrollHeader.Description>Issue 12 · November</ScrollHeader.Description>
 *     <ScrollHeader.Title>Field notes from the coast</ScrollHeader.Title>
 *   </ScrollHeader.Large>
 *   <article>{body}</article>
 * </ScrollHeader>
 * ```
 *
 * ## Two states, and the transit between them
 *
 * A page with a title has two states and every app draws both: the title
 * large, at rest, with room around it, and the title small, pinned, once the
 * reader is in the article. Hand-rolling the change is where pages stop
 * matching each other — one snaps, one crossfades at a different point, one
 * forgets the content underneath moved when the header did — so both states
 * and the transit between them are one component here.
 *
 * ## The band collapses; the article does not
 *
 * The header is a sticky band at the top of its scroller. The only thing the
 * scroll drives is the band's height: `bar + max(0, large - offset)`. The bar
 * is anchored to the band's top and the large block to its bottom, so the band
 * shrinking is what carries the block up behind the bar, and `overflow-hidden`
 * is what cuts it off there.
 *
 * The band is wrapped in a sticky box whose height stays at the expanded
 * header, which is the part that keeps the article still. Shrinking the box
 * itself would drag the article up at twice the speed of the scroll; leaving
 * the box alone means the content starts where it always started and simply
 * scrolls, while the visible band above it gets shorter. The article's first
 * line stays flush with the band's bottom edge until the block has gone.
 *
 * ## The two titles cross-fade; neither one morphs
 *
 * The large title and the bar title are separate elements that fade past each
 * other. A single title scaled and translated between the two positions tracks
 * beautifully until the text is long enough to truncate, at which point it is
 * animating between two different strings.
 *
 * Both are therefore in the tree at once, which is a problem for a screen
 * reader — one of them is invisible and would still be read. So the crossing
 * point is published to React as `collapsed`, and whichever title is not being
 * shown is hidden from accessibility. That is one render per crossing and no
 * more: everything that runs per frame is a CSS custom property on the root,
 * written from a `requestAnimationFrame` that reads the scroller once.
 *
 * ## Where the scroll comes from
 *
 * The window, by default. A page with its own scroller passes `scrollRef` an
 * element or a ref to one, and the header listens there instead. The listener
 * is passive, the work is batched into one frame, and no React state is set
 * until the progress reaches an end.
 *
 * ## The bar gains a surface when it takes over
 *
 * The bar's background, blur and hairline are one layer that fades in across
 * the middle of the collapse, so the bar closes behind the large block instead
 * of snapping shut. The bar and the large block cross-fade on ordered ranges:
 * the block is gone before the surface has finished closing, and the bar's
 * title arrives only after that, so nothing is ever legible on top of anything
 * else.
 *
 * ## What it needs
 *
 * To be the first thing in its scroll container, so offset zero is the
 * header's resting position. In a rounded container, the band takes the
 * container's radius at its top corners, so the cover and the blurred bar
 * follow the corner rather than painting square past it. It has no fixed height of its own: the large
 * block is measured, and whatever is put in it — a title, a byline, a row of
 * chips — sets the distance the header collapses over.
 */
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type Ref,
} from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';
import { tv } from 'tailwind-variants';
import { cn } from '../../lib/cn';
import {
  BAR_TITLE_ARRIVE,
  LARGE_EXIT,
  SURFACE_ARRIVE,
  bandHeight,
  collapseProgress,
  contentShift,
  isCrossing,
  snapTarget,
  stretchOf,
  type FadeStep,
} from './scroll-header-math';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

/**
 * Height of the pinned bar, in pixels, unless `barHeight` says otherwise. On
 * the web this is the comfortable size for a row of small controls, and the
 * article starts right under it once the large block has gone.
 */
const BAR_HEIGHT = 56;

/** How long a bar with no large block takes to close, when there is no distance to interpolate over. */
const BAR_ONLY_HANDOVER = 200;

/** The collection's curve, so a hand-over here moves like one anywhere else. */
const EASE = 'ease-[cubic-bezier(0.3,0.7,0.1,1)]';

/** The ordered fade ranges, written once as CSS so the browser does the interpolating. */
const LARGE_OPACITY = fadeOut(LARGE_EXIT);
const SURFACE_OPACITY = fadeIn(SURFACE_ARRIVE);
const BAR_TITLE_OPACITY = fadeIn(BAR_TITLE_ARRIVE);

/** One ramp travelling from hidden to shown across a step of the collapse. */
function fadeIn([from, to]: FadeStep): string {
  return `clamp(0, calc((var(--scroll-header-fade, 0) - ${from}) / ${to - from}), 1)`;
}

/** One ramp travelling from shown to hidden across a step of the collapse. */
function fadeOut([from, to]: FadeStep): string {
  return `clamp(0, calc((${to} - var(--scroll-header-fade, 0)) / ${to - from}), 1)`;
}

/**
 * A layout effect that is safe to run while the component is rendered on the
 * server, where there is no layout to read yet.
 */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Sets `inert` as an attribute rather than as a prop.
 *
 * React 18 drops a boolean `inert`; React 19 understands it. Writing the
 * attribute on the node is the one behaviour both versions share, and it is
 * the same pattern the nav rail uses.
 */
function useInert<T extends HTMLElement>(inert: boolean) {
  const ref = useRef<T>(null);
  useIsomorphicLayoutEffect(() => {
    ref.current?.toggleAttribute('inert', inert);
  }, [inert]);
  return ref;
}

const scrollHeaderVariants = tv({
  slots: {
    // The scroller's radius is handed down to the band, because a blurred
    // bar's backdrop is not clipped by an ancestor's rounded corner, only by
    // its own: without it the cover shows square past a rounded frame.
    root: 'relative w-full rounded-[inherit]',
    // The box that keeps its height while the band inside it shrinks.
    sticky: 'pointer-events-none sticky top-0 z-30 w-full rounded-t-[inherit]',
    band: 'pointer-events-auto relative w-full overflow-hidden rounded-t-[inherit]',
    spacer: 'w-full',
    bar: 'absolute inset-x-0 top-0 z-20 flex items-center gap-3 rounded-t-[inherit] px-6',
    surface: 'pointer-events-none absolute inset-0 rounded-t-[inherit] border-b',
    large: 'relative z-10 flex flex-col gap-1.5 px-6 pb-6',
    cover: 'pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-t-[inherit]',
    actions: 'relative ml-auto flex shrink-0 items-center gap-2',
    titleLarge: 'block text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl',
    titleBar: 'relative block min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-foreground',
    description: 'relative text-sm text-muted-foreground',
  },
  variants: {
    /** What the bar is drawn on once it has taken over. */
    surface: {
      // A real material: the content passing under the bar stays legible as
      // shape and colour while losing the detail that would compete with the
      // title on top. The fill behind it is what keeps the title readable.
      blur: { surface: 'border-border bg-background/75 backdrop-blur-xl' },
      plain: { surface: 'border-border bg-background' },
      none: { surface: 'border-transparent bg-transparent' },
    },
    divider: {
      true: {},
      false: { surface: 'border-transparent' },
    },
  },
  defaultVariants: { surface: 'blur', divider: true },
});

/** What the bar is drawn on once the large block has gone. */
export type ScrollHeaderSurface = 'blur' | 'plain' | 'none';

/** Which half of the header a title is standing in. */
type ScrollHeaderSlot = 'bar' | 'large';

/** An element to read scroll from, or a ref that will hold one. */
export type ScrollHeaderScrollSource =
  | HTMLElement
  | { readonly current: HTMLElement | null };

interface ScrollHeaderContextValue {
  /** Whether the bar has taken over, published once per crossing. */
  collapsed: boolean;
  /** Whether a large block was written as a part, whether measured or not. */
  hasLarge: boolean;
  /** Whether a bar was written as a part. */
  hasBar: boolean;
  /** Height the bar keeps, with no large block's height in it. */
  barBand: number;
  /** Measure or release the large block. */
  setLargeNode: (node: HTMLDivElement | null) => void;
}

const ScrollHeaderContext = createContext<ScrollHeaderContextValue | undefined>(undefined);

function useScrollHeader(component: string): ScrollHeaderContextValue {
  const context = useContext(ScrollHeaderContext);
  if (!context) throw new Error(`${component} must be used within a <ScrollHeader>`);
  return context;
}

/**
 * Which half a part is in. `Title` reads it to know which size to be and which
 * way to fade, so the same element can be written in both places.
 */
const ScrollHeaderSlotContext = createContext<ScrollHeaderSlot>('large');

export interface ScrollHeaderProps extends ComponentProps<'div'> {
  /**
   * Height of the pinned bar in pixels. The large block and the article are
   * laid out around it, so changing it moves the resting state rather than
   * cropping the bar. Default `56`.
   */
  barHeight?: number;
  /**
   * How much of the large block has to leave before the bar has fully taken
   * over, as a fraction of its height. Below 1 the crossing happens early,
   * which suits a tall block whose last few pixels are not worth waiting for.
   * Default `1`.
   */
  threshold?: number;
  /**
   * Settle a part-scrolled band open or closed once the scroller comes to
   * rest, rather than leaving the header half-collapsed. It moves the page, so
   * it is off by default; turn it on for a header that owns the scroll.
   * Default `false`.
   */
  snap?: boolean;
  /**
   * Let the band grow past its resting height when the scroller is pulled
   * down. A cover fills the band, so this is what stretches it. Only a
   * platform that reports a negative scroll offset can do it — Safari and
   * other rubber-banding scrollers — and it is off under reduced motion.
   * Default `true`.
   */
  stretch?: boolean;
  /**
   * The element to read scroll from: the window by default, or an element or a
   * ref to one for a page with its own scroller. The header must be the first
   * thing in that scroller, so offset zero is its resting position.
   */
  scrollRef?: ScrollHeaderScrollSource;
  /**
   * Called as the bar takes over, and again when the large block comes back.
   * Fires on the crossing, not on every frame, and not for a page that merely
   * loaded scrolled.
   */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** The parts, then the page content. Exactly one `Bar` and one `Large` are expected. */
  children?: ReactNode;
}

/**
 * The band, and the content that scrolls under it. Everything that is not a
 * part is treated as the page's content.
 */
function ScrollHeaderRoot({
  className,
  barHeight = BAR_HEIGHT,
  threshold = 1,
  snap = false,
  stretch = true,
  scrollRef,
  onCollapsedChange,
  children,
  style,
  ref,
  ...props
}: ScrollHeaderProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const largeRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const { parts, content } = useMemo(() => splitChildren(children), [children]);
  const hasLarge = parts.large !== null;
  const hasBar = parts.bar !== null;
  const barBand = hasBar ? barHeight : 0;

  // Everything the frame loop needs is read through refs, so the loop and its
  // listener are created once rather than rebuilt whenever a prop changes.
  const state = useRef({ offset: 0, large: 0, collapsed: false });
  // The first read after mount positions the bar; it is not a crossing, and a
  // page that arrived scrolled should not be told that it just scrolled.
  const mounted = useRef(false);
  const config = useRef({
    barBand,
    threshold,
    snap,
    stretch,
    hasBar,
    reducedMotion,
    scrollSource: scrollRef,
    onCollapsedChange,
  });
  config.current = {
    barBand,
    threshold,
    snap,
    stretch,
    hasBar,
    reducedMotion,
    scrollSource: scrollRef,
    onCollapsedChange,
  };

  /**
   * The one write the scroll makes: the collapse's numbers as custom
   * properties, and React state only where the progress reached an end.
   */
  const apply = useCallback((offset: number) => {
    const root = rootRef.current;
    const large = state.current.large;
    const { threshold, stretch, hasBar, reducedMotion, onCollapsedChange } = config.current;

    const stretchPx = stretchOf(offset, stretch && !reducedMotion);
    const progress = hasBar ? collapseProgress(offset, large, threshold) : 0;
    // Under reduced motion the bar still condenses; it is the fades that stop
    // travelling. They change once, at the crossing, and a short transition
    // spends them there rather than across the whole scroll.
    const fade = reducedMotion ? (progress >= 1 ? 1 : 0) : progress;
    const band = bandHeight(config.current.barBand, large, offset, stretchPx);
    const shift = contentShift(offset, large, stretchPx);

    if (root) {
      root.style.setProperty('--scroll-header-fade', String(fade));
      root.style.setProperty('--scroll-header-band', `${band}px`);
      root.style.setProperty('--scroll-header-shift', `${shift}px`);
      root.style.setProperty('--scroll-header-rest', `${config.current.barBand + large}px`);
    }

    state.current.offset = offset;
    const next = progress >= 1;
    if (!mounted.current) {
      // A page can arrive already scrolled. Put the bar in its right state
      // without reporting it as something that just happened.
      state.current.collapsed = next;
      setCollapsed(next);
    } else if (isCrossing(next, state.current.collapsed)) {
      state.current.collapsed = next;
      setCollapsed(next);
      onCollapsedChange?.(next);
    }
  }, []);

  /** Take a fresh height for the large block and re-apply the current offset. */
  const measure = useCallback(() => {
    const next = largeRef.current?.offsetHeight ?? 0;
    if (Math.abs(next - state.current.large) >= 0.5) state.current.large = next;
    apply(state.current.offset);
  }, [apply]);

  const setLargeNode = useCallback(
    (node: HTMLDivElement | null) => {
      // Only a node is measured here. React detaches the old ref before it
      // attaches the new one, and measuring the gap would read a header with
      // no large block for a frame.
      largeRef.current = node;
      if (node) measure();
    },
    [measure]
  );

  // Measure and sync before the first paint this component is part of. The
  // server renders the expanded state, and so does the first client frame:
  // the measurement is of content that is already laid out.
  useIsomorphicLayoutEffect(() => {
    measure();
    const scrollSource = config.current.scrollSource;
    const resolved = resolveSource(scrollSource);
    // A ref to a parent scroller is not attached yet, so do not read the
    // window in its place. The passive effect reads it once it exists.
    apply(resolved || !scrollSource ? offsetOf(resolved) : 0);
  }, [apply, measure, hasLarge, barHeight, threshold, snap, stretch, reducedMotion, scrollRef]);

  // Content changes and font loading both change the distance the header
  // collapses over. The observer is the only thing that notices either.
  useIsomorphicLayoutEffect(() => {
    const node = largeRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(node);
    return () => observer.disconnect();
  }, [measure, hasLarge]);

  useEffect(() => {
    const source = resolveSource(config.current.scrollSource);
    const target: HTMLElement | Window = source ?? window;
    let frame = 0;
    let idle: ReturnType<typeof setTimeout> | undefined;

    const read = () => {
      frame = 0;
      apply(offsetOf(resolveSource(config.current.scrollSource)));
      if (config.current.snap) {
        clearTimeout(idle);
        idle = setTimeout(settle, 160);
      }
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(read);
    };

    /**
     * Finish a part-scrolled hand-over once the scroller is still. The target
     * never goes past what the scroller can actually reach, so a short page
     * settles at its end rather than asking for a scroll it cannot make.
     */
    const settle = () => {
      const current = resolveSource(config.current.scrollSource);
      const offset = offsetOf(current);
      const next = snapTarget(offset, state.current.large);
      if (next === null) return;
      const limit = current
        ? current.scrollHeight - current.clientHeight
        : document.documentElement.scrollHeight - window.innerHeight;
      const top = Math.min(next, Math.max(limit, 0));
      if (Math.abs(top - offset) <= 1) return;
      const behavior: ScrollBehavior = config.current.reducedMotion ? 'auto' : 'smooth';
      if (current) current.scrollTo({ top, behavior });
      else window.scrollTo({ top, behavior });
    };

    // A page restored mid-scroll has a header that is already collapsed.
    read();
    // Only now is the first position settled; anything after this is a real
    // crossing.
    mounted.current = true;
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      target.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
      clearTimeout(idle);
    };
  }, [apply, scrollRef]);

  const context = useMemo<ScrollHeaderContextValue>(
    () => ({ collapsed, hasLarge, hasBar, barBand, setLargeNode }),
    [collapsed, hasLarge, hasBar, barBand, setLargeNode]
  );

  const { root, sticky, band, spacer } = scrollHeaderVariants();

  return (
    <ScrollHeaderContext.Provider value={context}>
      <div
        {...props}
        ref={composeRefs(rootRef, ref)}
        data-slot="scroll-header"
        data-collapsed={collapsed ? '' : undefined}
        className={root({ className })}
        style={style}
      >
        <div
          className={sticky()}
          data-slot="scroll-header-sticky"
          style={{
            // A global nav above the page can be cleared from CSS without a prop.
            top: 'var(--scroll-header-top, 0px)',
            height: 'var(--scroll-header-rest, auto)',
          }}
        >
          <div
            className={band()}
            data-slot="scroll-header-band"
            style={{ height: 'var(--scroll-header-band, auto)' }}
          >
            {parts.cover}
            <div
              aria-hidden="true"
              className={spacer()}
              data-slot="scroll-header-spacer"
              style={{ height: barBand }}
            />
            {parts.large}
            {parts.bar}
          </div>
        </div>
        {content}
      </div>
    </ScrollHeaderContext.Provider>
  );
}
ScrollHeaderRoot.displayName = 'ScrollHeader';

export interface ScrollHeaderBarProps extends ComponentProps<'div'> {
  /**
   * What the bar is drawn on once it has taken over. `blur` frosts it, so the
   * content passing under the bar stays legible as shape and colour. `plain`
   * is the background token, and `none` leaves it clear for a bar over a cover
   * that should stay visible. Default `blur`.
   */
  surface?: ScrollHeaderSurface;
  /** A hairline under the bar, drawn with its surface. Default `true`. */
  divider?: boolean;
}

/**
 * The pinned bar. Its contents never move; its surface fades in as the large
 * block leaves, which is what makes the change read as one crossfade rather
 * than two things happening at once.
 */
function ScrollHeaderBar({
  className,
  surface = 'blur',
  divider = true,
  children,
  style,
  render,
  ...props
}: ScrollHeaderBarProps & RenderProp<'div'>) {
  const { barBand, hasLarge } = useScrollHeader('ScrollHeader.Bar');
  const slots = scrollHeaderVariants({ surface, divider });

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'scroll-header-bar',
        'data-surface': surface,
        className: slots.bar({ className }),
        style: { height: barBand, ...style },
        children: (
          <>
            {/*
              The surface is one layer rather than a class toggled at the
              crossing: the opacity travels with the scroll, and the divider is
              inside it, so the hairline cannot arrive on a different curve.
            */}
            <div
              aria-hidden="true"
              data-slot="scroll-header-surface"
              className={cn(
                slots.surface(),
                'motion-reduce:transition-opacity motion-reduce:duration-200',
                EASE,
                !hasLarge && 'transition-opacity'
              )}
              style={{
                opacity: SURFACE_OPACITY,
                transitionDuration: hasLarge ? undefined : `${BAR_ONLY_HANDOVER}ms`,
              }}
            />
            <ScrollHeaderSlotContext.Provider value="bar">
              {children}
            </ScrollHeaderSlotContext.Provider>
          </>
        ),
      },
      props
    ),
  });
}
ScrollHeaderBar.displayName = 'ScrollHeader.Bar';

export interface ScrollHeaderLargeProps extends ComponentProps<'div'> {}

/**
 * The expanded block. Its measured height is the distance the header
 * collapses over, so whatever is put in it — a title, a byline, a row of
 * chips — sets the scroll distance rather than a prop having to agree with
 * it.
 */
function ScrollHeaderLarge({
  className,
  style,
  children,
  render,
  ref,
  ...props
}: ScrollHeaderLargeProps & RenderProp<'div'>) {
  const { collapsed, hasBar, setLargeNode } = useScrollHeader('ScrollHeader.Large');
  const slots = scrollHeaderVariants();
  const hidden = hasBar && collapsed;
  const inertRef = useInert<HTMLDivElement>(hidden);

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'scroll-header-large',
        // The block is carried up by the same amount the band shrank, which
        // keeps its bottom edge on the band's.
        ref: composeRefs(setLargeNode, ref, inertRef),
        className: cn(
          slots.large({ className }),
          'motion-reduce:transition-opacity motion-reduce:duration-200',
          EASE
        ),
        style: {
          transform: 'translateY(var(--scroll-header-shift, 0px))',
          opacity: LARGE_OPACITY,
          pointerEvents: hidden ? 'none' : undefined,
          ...style,
        },
        // `inert` is the whole answer: it takes the block out of the tab order
        // and out of the accessibility tree together, without a second state
        // to keep in step with this one. It is written to the node by
        // `inertRef`, so it works in React 18 and 19 alike.
        'aria-hidden': hidden || undefined,
        children: (
          <ScrollHeaderSlotContext.Provider value="large">{children}</ScrollHeaderSlotContext.Provider>
        ),
      },
      props
    ),
  });
}
ScrollHeaderLarge.displayName = 'ScrollHeader.Large';

export interface ScrollHeaderTitleProps extends ComponentProps<'span'> {}

/**
 * The page's title. Written in both halves and styled from whichever it is in:
 * large and at rest in the block, compact and fading in on the bar.
 *
 * It is a `span` with a heading role so the same part works in both places;
 * `render={<h1 />}` gives a page a real heading element where one is wanted.
 */
function ScrollHeaderTitle({
  className,
  style,
  render,
  ...props
}: ScrollHeaderTitleProps & RenderProp<'span'>) {
  const slot = useContext(ScrollHeaderSlotContext);
  const { collapsed, hasLarge } = useScrollHeader('ScrollHeader.Title');
  const slots = scrollHeaderVariants();
  // The large title is the one being read until the bar has taken over. Both
  // are in the tree the whole time, and only one of them should be — unless
  // there is no large title, in which case the bar's is always read.
  const hidden = slot === 'bar' && hasLarge && !collapsed;

  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps(
      {
        'data-slot': 'scroll-header-title',
        role: 'heading',
        'aria-level': 1,
        'aria-hidden': hidden || undefined,
        className: cn(
          slot === 'bar' ? slots.titleBar({ className }) : slots.titleLarge({ className }),
          'motion-reduce:transition-opacity motion-reduce:duration-200',
          EASE
        ),
        style: {
          opacity: slot === 'bar' ? (hasLarge ? BAR_TITLE_OPACITY : 1) : undefined,
          ...style,
        },
      },
      props
    ),
  });
}
ScrollHeaderTitle.displayName = 'ScrollHeader.Title';

export interface ScrollHeaderDescriptionProps extends ComponentProps<'p'> {}

/** The quiet line under the title — a count, a byline, a date. */
function ScrollHeaderDescription({
  className,
  render,
  ...props
}: ScrollHeaderDescriptionProps & RenderProp<'p'>) {
  return useRender({
    defaultTagName: 'p',
    render,
    props: mergeProps(
      { 'data-slot': 'scroll-header-description', className: scrollHeaderVariants().description({ className }) },
      props
    ),
  });
}
ScrollHeaderDescription.displayName = 'ScrollHeader.Description';

export interface ScrollHeaderActionsProps extends ComponentProps<'div'> {}

/**
 * The controls at the trailing end of the bar. They stay put and stay
 * reachable — only the bar's surface and title are part of the transition.
 */
function ScrollHeaderActions({
  className,
  render,
  ...props
}: ScrollHeaderActionsProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      { 'data-slot': 'scroll-header-actions', className: scrollHeaderVariants().actions({ className }) },
      props
    ),
  });
}
ScrollHeaderActions.displayName = 'ScrollHeader.Actions';

export interface ScrollHeaderCoverProps extends ComponentProps<'div'> {
  /** A picture behind the header, laid out to fill the band rather than cropped by the document. */
  src?: string;
  /** Alt text for `src`. Empty by default: the cover is decoration behind the title. */
  alt?: string;
  /** A wash over the cover, so the title stays legible on a bright picture. Default `true`. */
  scrim?: boolean;
}

/**
 * A picture or a gradient filling the band. It has no height of its own — the
 * band's height is its height, which is why it stretches on an over-scroll by
 * being laid out larger rather than by being scaled up and going soft.
 *
 * With no `src` it draws a gradient from the theme's chart tokens, so an app
 * that puts its charts on brand puts this on brand with them.
 */
function ScrollHeaderCover({
  className,
  src,
  alt = '',
  scrim = true,
  children,
  style,
  render,
  ...props
}: ScrollHeaderCoverProps & RenderProp<'div'>) {
  const slots = scrollHeaderVariants();

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'scroll-header-cover',
        'aria-hidden': alt ? undefined : true,
        className: slots.cover({ className }),
        style,
        children: (
          <>
            {src ? (
              <img alt={alt} className="absolute inset-0 size-full object-cover" src={src} />
            ) : (
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, var(--chart-1, var(--primary)), var(--chart-2, var(--primary)))',
                }}
              />
            )}
            {scrim ? (
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent"
              />
            ) : null}
            {children}
          </>
        ),
      },
      props
    ),
  });
}
ScrollHeaderCover.displayName = 'ScrollHeader.Cover';

/**
 * Sort the children into the three band slots and the page's content. Sorting
 * by component rather than by order is what lets a page read top-down — bar,
 * block, article — while the band still draws the cover behind both.
 */
function splitChildren(children: ReactNode): {
  parts: { cover: ReactNode; large: ReactNode; bar: ReactNode };
  content: ReactNode;
} {
  let cover: ReactNode = null;
  let large: ReactNode = null;
  let bar: ReactNode = null;
  const content: ReactNode[] = [];

  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) {
      content.push(child);
      continue;
    }
    if (child.type === ScrollHeaderCover) cover = child;
    else if (child.type === ScrollHeaderLarge) large = child;
    else if (child.type === ScrollHeaderBar) bar = child;
    else content.push(child);
  }

  return { parts: { cover, large, bar }, content };
}

/** The element a `scrollRef` names, or null for the window. */
function resolveSource(source: ScrollHeaderScrollSource | undefined): HTMLElement | null {
  if (!source) return null;
  return 'current' in source ? source.current : source;
}

/** How far the page or the given element has scrolled. */
function offsetOf(source: HTMLElement | null): number {
  if (source) return source.scrollTop;
  if (typeof window === 'undefined') return 0;
  return window.scrollY;
}

/** Point several refs at one node, skipping the ones that were not given. */
function composeRefs<T>(...refs: (Ref<T> | undefined)[]): (node: T | null) => void {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    }
  };
}

/**
 * Whether the reader asked for less motion.
 *
 * Read once on mount and kept current, rather than asked per frame. The
 * server has no answer, so it renders the answer that needs no animation and
 * the first client render agrees with it.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return reduced;
}

export const ScrollHeader = Object.assign(ScrollHeaderRoot, {
  Bar: ScrollHeaderBar,
  Large: ScrollHeaderLarge,
  Title: ScrollHeaderTitle,
  Description: ScrollHeaderDescription,
  Actions: ScrollHeaderActions,
  Cover: ScrollHeaderCover,
});

export {
  ScrollHeaderBar,
  ScrollHeaderLarge,
  ScrollHeaderTitle,
  ScrollHeaderDescription,
  ScrollHeaderActions,
  ScrollHeaderCover,
};
