'use client';

/**
 * Toast — a short message about something that just happened, which leaves on its own.
 *
 * ```tsx
 * <Toast.Provider position="bottom-right">
 *   <App />
 * </Toast.Provider>
 *
 * const toast = useToast();
 * toast.add({ title: 'Invoice sent', description: 'Harbour Bakery will get it in a minute.', type: 'success' });
 * toast.promise(save(), { loading: 'Saving draft', success: 'Draft saved', error: 'Could not save' });
 * ```
 *
 * ## The title changes through dither
 *
 * A toast's title is not swapped. When it arrives, it resolves out of a row of
 * dither cells from the start, with a caret riding the edge, the way a line
 * types itself onto a terminal. When it changes — a save going on to say
 * "Draft saved" where it said "Saving draft" — the old words dim, turn
 * monospace, are eaten by an ordered dither and the new ones resolve through
 * the same cells, so a reader
 * sees that this is the same toast with news, not a second one. When it
 * leaves, it dissolves back into the cells before the card fades.
 *
 * The cells and caret are drawn in the toast's colour; the settled text is the
 * ordinary foreground, so it reads as text and not as a highlight. With
 * reduced motion turned on, the title changes in place.
 *
 * ## Versions
 *
 * `effect` on the provider picks one of three. `type`, the default, does the
 * above to the title alone. `materialize` brings the whole card in through an
 * ordered dither first, and only then resolves its title and description
 * through the dither cells, so the toast builds itself in two steps; leaving,
 * the words dissolve and then the card does. `timer` adds a dithered bar along
 * the bottom that runs down the toast's time and pauses while the stack is open.
 *
 * ## The mark is a dither cell too
 *
 * Beside the title, a small square of ordered dither says what kind of toast
 * it is: filled solid in the success, info, warning or destructive colour, or
 * cycling through its densities while a `loading` toast waits.
 *
 * ## Stacked, then spread
 *
 * Several toasts stack into one, with the ones behind peeking out under it.
 * Hovering or focusing the stack spreads them into a list, and pauses their
 * timers while it is open. A toast can be swiped away towards the nearest edge.
 *
 * ## Announced, not focused
 *
 * Toasts are read out by a screen reader as they arrive, politely by default
 * and at once for `priority: 'high'`, without moving focus. F6 moves focus to
 * the stack, so its buttons can be reached from the keyboard. Anything that
 * needs an answer before the reader moves on belongs in an Alert Dialog.
 */
import { Toast as BaseToast } from '@base-ui/react/toast';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { tv } from 'tailwind-variants';
import { maskStyle, prefersReducedMotion, SweepCells, useCardSweep, type SweepPhase } from './dither';
import { DitherText } from './dither-text';

export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
export type ToastType = 'default' | 'success' | 'info' | 'warning' | 'destructive' | 'loading';
export type ToastEffect = 'type' | 'materialize' | 'timer';

const toastVariants = tv({
  slots: {
    viewport: [
      'fixed z-[60] flex w-[calc(100%-2*var(--toast-inset))] max-w-[22.5rem] outline-none [--toast-inset:1rem] sm:[--toast-inset:1.5rem]',
      'data-[position^=top]:top-(--toast-inset) data-[position^=bottom]:bottom-(--toast-inset)',
      'data-[position$=left]:left-(--toast-inset) data-[position$=right]:right-(--toast-inset)',
      'data-[position$=center]:left-1/2 data-[position$=center]:-translate-x-1/2',
    ],
    // In place, for a preview: as tall as the front toast, in the flow of the page.
    inlineViewport: 'relative w-full max-w-[22.5rem] [--toast-inset:0px] h-(--toast-frontmost-height,5rem) min-h-16',
    root: [
      'group/toast absolute inset-x-0 z-[calc(100-var(--toast-index))] select-none',
      'rounded-xl border bg-popover text-popover-foreground shadow-lg shadow-black/5 dark:shadow-black/30',
      '[--gap:0.625rem] [--peek:0.5rem] [--shrink:calc(var(--toast-index)*0.05)]',
      // Collapsed, every toast is as tall as the front one, so the ones behind show only as edges.
      'h-(--toast-frontmost-height,var(--toast-height)) data-expanded:h-(--toast-height)',
      '[transition:transform_0.45s_cubic-bezier(0.22,1,0.36,1),opacity_0.3s,height_0.2s]',
      'data-[position^=bottom]:bottom-0 data-[position^=bottom]:origin-bottom',
      'data-[position^=top]:top-0 data-[position^=top]:origin-top',
      // Collapsed: peeking out behind the front one, a little smaller each.
      'data-[position^=bottom]:transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-var(--toast-index)*var(--peek)))_scale(calc(1-var(--shrink)))]',
      'data-[position^=top]:transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+var(--toast-index)*var(--peek)))_scale(calc(1-var(--shrink)))]',
      // Spread: each at its own place in the list.
      'data-[position^=bottom]:data-expanded:transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-var(--toast-offset-y)-var(--toast-index)*var(--gap)))]',
      'data-[position^=top]:data-expanded:transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+var(--toast-offset-y)+var(--toast-index)*var(--gap)))]',
      // A bridge over the gap, so moving the pointer between spread toasts does not collapse them.
      "after:absolute after:inset-x-0 after:h-(--gap) after:content-[''] data-[position^=bottom]:after:top-full data-[position^=top]:after:bottom-full",
      // Arriving from the edge it is pinned to.
      'data-[position^=bottom]:data-starting-style:transform-[translateY(calc(100%+var(--toast-inset)))]',
      'data-[position^=top]:data-starting-style:transform-[translateY(calc(-100%-var(--toast-inset)))]',
      'data-starting-style:opacity-0 data-limited:opacity-0',
      // Leaving: the title dissolves first, then the card fades. A swipe goes at once.
      'data-ending-style:opacity-0 data-ending-style:not-data-swipe-direction:[transition-delay:0s,0.32s,0s]',
      // Materialize holds the card until its text and then the card itself have dithered out.
      'data-[effect=materialize]:data-ending-style:not-data-swipe-direction:[transition-delay:0s,0.9s,0s]',
      'data-ending-style:data-[swipe-direction=left]:transform-[translateX(calc(var(--toast-swipe-movement-x)-100%-var(--toast-inset)))]',
      'data-ending-style:data-[swipe-direction=right]:transform-[translateX(calc(var(--toast-swipe-movement-x)+100%+var(--toast-inset)))]',
      'data-ending-style:data-[swipe-direction=up]:transform-[translateY(calc(var(--toast-swipe-movement-y)-100%-var(--toast-inset)))]',
      'data-ending-style:data-[swipe-direction=down]:transform-[translateY(calc(var(--toast-swipe-movement-y)+100%+var(--toast-inset)))]',
      'motion-reduce:transition-[opacity]',
    ],
    // A layer under or over the content, clipped to the card's corners.
    surface: 'pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]',
    timer: 'absolute inset-x-0 bottom-0 h-[3px] origin-left bg-(--toast-color) group-data-expanded/toast:[animation-play-state:paused] motion-reduce:[animation:none!important]',
    content: [
      'relative flex items-start gap-3 overflow-hidden p-4 transition-opacity duration-200',
      // Behind the front one, collapsed, its content would show through the edge.
      'not-data-expanded:data-behind:opacity-0',
    ],
    mark: 'mt-[0.3125rem] grid size-2.5 shrink-0 grid-cols-2 grid-rows-2 gap-px text-(--toast-color)',
    body: 'flex min-w-0 flex-1 flex-col gap-1',
    title: 'text-sm font-medium leading-5 text-foreground',
    description: 'text-[0.8125rem] leading-5 text-muted-foreground',
    action: [
      'inline-flex h-7 shrink-0 cursor-pointer items-center rounded-md border bg-background px-2.5 text-xs font-medium text-foreground shadow-xs outline-none',
      'hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30',
    ],
    close: [
      'relative -me-1 -mt-1 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none',
      'opacity-0 transition-opacity group-hover/toast:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring',
      'hover:bg-accent hover:text-foreground pointer-coarse:opacity-100',
    ],
  },
});

/** The colour each type's mark and dither are drawn in. */
const COLOR: Record<ToastType, string> = {
  default: 'var(--foreground)',
  success: 'var(--success)',
  info: 'var(--info)',
  warning: 'var(--warning)',
  destructive: 'var(--destructive)',
  loading: 'var(--info)',
};

/** The order the mark's four cells light in while loading: a 2×2 Bayer matrix, read as thresholds. */
const BAYER_2 = [0, 2, 3, 1];

function Mark({ type }: { type: ToastType }) {
  const slots = toastVariants();
  const loading = type === 'loading';
  return (
    <span data-slot="toast-mark" aria-hidden="true" className={slots.mark()}>
      {BAYER_2.map((threshold, index) => (
        <span
          key={index}
          className={loading ? 'rounded-[1px] bg-current motion-safe:animate-pulse' : 'rounded-[1px] bg-current'}
          style={loading ? { animationDelay: `${threshold * 0.25}s`, animationDuration: '1s' } : undefined}
        />
      ))}
    </span>
  );
}

function swipeOf(position: ToastPosition): ('up' | 'down' | 'left' | 'right')[] {
  const vertical = position.startsWith('top') ? 'up' : 'down';
  if (position.endsWith('center')) return [vertical];
  return [position.endsWith('left') ? 'left' : 'right', vertical];
}

function textOf(node: ReactNode): string | null {
  return typeof node === 'string' || typeof node === 'number' ? String(node) : null;
}

/** What a toast can carry in `data`. */
export interface ToastData {
  /** Which dither this one toast is drawn with, overriding the provider's `effect`. */
  effect?: ToastEffect;
}

const DEFAULT_TIMEOUT = 5000;

/** The keyframes the timer bar runs on, written once per provider. */
const KEYFRAMES =
  '@keyframes panelui-toast-timer{from{transform:scaleX(1)}to{transform:scaleX(0)}}' +
  '@keyframes panelui-toast-sweep{from{transform:translateX(-100%)}to{transform:translateX(250%)}}';

/** How long the card takes to dither in or out, in `materialize`. */
const CARD_MS = 520;
/** How long the text takes to dissolve before the card follows it out. */
const TEXT_OUT_MS = 380;

/**
 * A line of text that is held at its full size while it dithers in and out,
 * so the toast keeps its height and the stack does not jump as letters arrive.
 */
function Dithered({ text, show, accent, caret }: { text: string; show: boolean; accent: string; caret?: boolean }) {
  return (
    <span className="grid">
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">
        {text}
      </span>
      <span className="col-start-1 row-start-1">
        <DitherText text={show ? text : ''} accent={accent} caret={caret} />
      </span>
    </span>
  );
}

function ToastItem({
  toast,
  index,
  position,
  swipe,
  effect: fallback,
  timeout: defaultTimeout,
}: {
  toast: ReturnType<typeof BaseToast.useToastManager>['toasts'][number];
  index: number;
  position: ToastPosition;
  swipe: ('up' | 'down' | 'left' | 'right')[];
  effect: ToastEffect;
  timeout: number;
}) {
  const slots = toastVariants();
  const type: ToastType = toast.type && toast.type in COLOR ? (toast.type as ToastType) : 'default';
  const effect = (toast.data as ToastData | undefined)?.effect ?? fallback;
  const title = textOf(toast.title);
  const leaving = toast.transitionStatus === 'ending';
  const timeout = toast.timeout ?? defaultTimeout;
  const description = textOf(toast.description);
  const materialize = effect === 'materialize';

  // Materialize runs in order: the card dithers in, then its text resolves
  // through dither; leaving, the text dissolves first and the card follows.
  const [textIn, setTextIn] = useState(!materialize || prefersReducedMotion());
  const [cardOut, setCardOut] = useState(false);
  useEffect(() => {
    if (textIn) return;
    const timer = setTimeout(() => setTextIn(true), CARD_MS);
    return () => clearTimeout(timer);
  }, [textIn]);
  useEffect(() => {
    if (!materialize || !leaving) return;
    const timer = setTimeout(() => setCardOut(true), prefersReducedMotion() ? 0 : TEXT_OUT_MS);
    return () => clearTimeout(timer);
  }, [materialize, leaving]);

  const phase: SweepPhase = !materialize ? 'done' : cardOut ? 'out' : textIn ? 'done' : 'in';
  const sweep = useCardSweep(phase, CARD_MS);
  const showText = textIn && !leaving;

  return (
    <BaseToast.Root
      toast={toast}
      swipeDirection={swipe}
      data-slot="toast"
      data-type={type}
      data-effect={effect}
      data-position={position}
      data-behind={index > 0 ? '' : undefined}
      className={slots.root()}
      style={{ '--toast-color': COLOR[type], ...sweep.mask } as CSSProperties}
    >
      {materialize && phase !== 'done' ? (
        <span aria-hidden="true" className={slots.surface({ className: 'z-20' })}>
          <SweepCells phase={phase} edge={sweep.edge} color={COLOR[type]} className="absolute inset-0 size-full" />
        </span>
      ) : null}
      <BaseToast.Content className={slots.content()}>
        <Mark type={type} />
        <div className={slots.body()}>
          <BaseToast.Title data-slot="toast-title" className={slots.title()}>
            {title !== null ? <Dithered text={title} show={showText} accent={COLOR[type]} /> : toast.title}
          </BaseToast.Title>
          {toast.description ? (
            <BaseToast.Description data-slot="toast-description" className={slots.description()}>
              {materialize && description !== null ? (
                <Dithered text={description} show={showText} accent={COLOR[type]} caret={false} />
              ) : (
                toast.description
              )}
            </BaseToast.Description>
          ) : null}
        </div>
        {toast.actionProps ? <BaseToast.Action data-slot="toast-action" className={slots.action()} /> : null}
        <BaseToast.Close data-slot="toast-close" aria-label="Dismiss" className={slots.close()}>
          <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" className="size-3.5">
            <path d="M4.5 4.5l7 7m0-7l-7 7" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
          </svg>
        </BaseToast.Close>
      </BaseToast.Content>
      {effect === 'timer' ? (
        <span aria-hidden="true" className={slots.surface()}>
          {timeout > 0 ? (
            // Restarted by every update, which also restarts the toast's own timer.
            <span
              key={toast.updateKey ?? 0}
              data-slot="toast-timer"
              className={slots.timer()}
              style={{ ...maskStyle(10, 1), animation: `panelui-toast-timer ${timeout}ms linear forwards` }}
            />
          ) : (
            // No timeout: it waits, so the bar sweeps instead of running down.
            <span
              data-slot="toast-timer"
              className={slots.timer({ className: 'w-2/5 origin-center' })}
              style={{ ...maskStyle(10, 1), animation: 'panelui-toast-sweep 1.4s cubic-bezier(0.45,0,0.55,1) infinite' }}
            />
          )}
        </span>
      ) : null}
    </BaseToast.Root>
  );
}

function ToastList({
  position,
  inline,
  effect,
  timeout,
}: {
  position: ToastPosition;
  inline: boolean;
  effect: ToastEffect;
  timeout: number;
}) {
  const { toasts } = BaseToast.useToastManager();
  const slots = toastVariants();
  const swipe = swipeOf(position);

  const viewport = (
    <BaseToast.Viewport
      data-slot="toast-viewport"
      data-position={position}
      data-inline={inline ? '' : undefined}
      className={inline ? slots.inlineViewport() : slots.viewport()}
    >
      <style>{KEYFRAMES}</style>
      {toasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          index={index}
          position={position}
          swipe={swipe}
          effect={effect}
          timeout={timeout}
        />
      ))}
    </BaseToast.Viewport>
  );

  return inline ? viewport : <BaseToast.Portal>{viewport}</BaseToast.Portal>;
}

export interface ToastProviderProps extends Omit<BaseToast.Provider.Props, 'children'> {
  /** Which corner or edge of the screen the toasts gather at. Default `bottom-right`. */
  position?: ToastPosition;
  /**
   * Draws the stack where the provider is, in the flow of the page, instead
   * of pinned to a corner of the screen. For a preview or a thumbnail.
   */
  inline?: boolean;
  /**
   * How the toasts are dithered. `type` writes the title through dither
   * cells. `materialize` dithers the whole card in, then resolves its title and
   * description through dither inside it, and runs the same backwards when it
   * leaves. `timer` writes the title as `type` does and runs a dithered bar down
   * the toast's time. One toast can choose its own with `data: { effect }`.
   * Default `type`.
   */
  effect?: ToastEffect;
  children?: ReactNode;
}

/**
 * Holds the toasts and draws them. Put it once near the root; `useToast()`
 * works anywhere inside it. Takes `timeout` (ms, default 5000, `0` to stay),
 * `limit` (default 3) and a `toastManager` from `createToaster()` for
 * toasts raised outside React.
 */
function ToastProvider({
  position = 'bottom-right',
  inline = false,
  effect = 'type',
  children,
  ...props
}: ToastProviderProps) {
  return (
    <BaseToast.Provider {...props}>
      {children}
      <ToastList position={position} inline={inline} effect={effect} timeout={props.timeout ?? DEFAULT_TIMEOUT} />
    </BaseToast.Provider>
  );
}
ToastProvider.displayName = 'Toast.Provider';

/**
 * Raises, updates and closes toasts. `add({ title, description, type, timeout,
 * actionProps })` returns an id; `update(id, …)` changes one in place, and its
 * title dissolves into the new one; `promise(p, { loading, success, error })`
 * follows a promise through the three; `close(id)` dismisses one, or all.
 */
export const useToast = BaseToast.useToastManager;

/** A toast manager for code outside React. Pass it to `Toast.Provider` as `toastManager`. */
export const createToaster = BaseToast.createToastManager;

export const Toast = { Provider: ToastProvider };

export { ToastProvider };
