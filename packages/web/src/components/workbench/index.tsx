'use client';

/**
 * Workbench — the frame of an editor: a canvas with the work on it, a
 * toolbar floating over it, an inspector beside it and a timeline under it.
 *
 * ```tsx
 * <Workbench className="h-[640px]">
 *   <Workbench.Bar><Toolbar>…</Toolbar></Workbench.Bar>
 *   <Workbench.Canvas>
 *     <Workbench.Artboard aspect="16 / 9">…</Workbench.Artboard>
 *   </Workbench.Canvas>
 *   <Workbench.Inspector><Inspector>…</Inspector></Workbench.Inspector>
 *   <Workbench.Timeline><Timeline>…</Timeline></Workbench.Timeline>
 * </Workbench>
 * ```
 *
 * ## The work is in the middle
 *
 * Everything else stands round the canvas as a panel of its own, floating
 * a few pixels clear of its neighbours, so the work reads as the thing on
 * the desk and the tools as things beside it. The artboard sits centred on
 * a field of dots at the largest size its shape fits.
 *
 * ## Focus clears the desk
 *
 * In focus the sidebar, the inspector and the timeline slide away and the
 * canvas takes the room they leave. `\` toggles it from the keyboard, and
 * `useWorkbench()` gives a button of your own the same switch.
 *
 * ## On a narrow screen the inspector becomes a sheet
 *
 * Below `compactBelow` pixels wide there is no room for a column beside the
 * canvas. The inspector then opens as a sheet from the side, and
 * `Workbench.InspectorTrigger` is the button that opens it. The width that
 * counts is the workbench's own, not the window's, so it works in a pane.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { Sheet } from '../sheet';

const EASE = 'ease-[cubic-bezier(0.32,0.72,0,1)]';

const workbenchVariants = tv({
  slots: {
    root: [
      'group/workbench relative grid w-full min-w-0 overflow-hidden rounded-[26px] bg-muted/60 p-2 text-foreground',
      'ring-1 ring-foreground/[0.06] dark:bg-muted/40 dark:ring-foreground/10',
      '[grid-template-areas:"sidebar_canvas_inspector""timeline_timeline_timeline"]',
      'grid-cols-[var(--wb-sidebar)_minmax(0,1fr)_var(--wb-inspector)] grid-rows-[minmax(0,1fr)_var(--wb-timeline)]',
      // No grid gap: each panel carries its own 8px on the canvas side, so a
      // column that closes takes its gap with it.
      `transition-[grid-template-columns,grid-template-rows] duration-500 ${EASE} motion-reduce:transition-none`,
      'data-resizing:transition-none',
    ],
    sidebar: [
      'flex min-h-0 min-w-0 flex-col overflow-hidden pe-2 [grid-area:sidebar]',
      `transition-[opacity,translate] duration-500 ${EASE} motion-reduce:transition-none`,
      'group-data-focus/workbench:-translate-x-4 group-data-focus/workbench:opacity-0',
    ],
    canvas: [
      'relative isolate flex min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-[20px] px-6 pt-[4.5rem] pb-6 [grid-area:canvas] [container-type:size]',
      // The top padding is the floating bar's room, so the work is centred in what is left.
      'bg-background ring-1 ring-foreground/[0.05] dark:bg-background/70',
      'bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_13%,transparent)_1px,transparent_1.5px)] bg-size-[20px_20px] bg-center',
    ],
    artboard: [
      'relative overflow-hidden rounded-xl bg-background shadow-[0_24px_60px_-24px_rgb(0_0_0/0.45)] ring-1 ring-foreground/10',
      'aspect-(--wb-aspect) w-[min(100cqw,100cqh*var(--wb-ratio))]',
      `transition-[width] duration-500 ${EASE} motion-reduce:transition-none`,
    ],
    bar: 'pointer-events-none z-10 mt-3 flex justify-center self-start justify-self-center [grid-area:canvas] *:pointer-events-auto',
    inspector: [
      'flex min-h-0 min-w-0 justify-end overflow-hidden ps-2 [grid-area:inspector]',
      `transition-[opacity,translate] duration-500 ${EASE} motion-reduce:transition-none`,
      'group-data-focus/workbench:translate-x-4 group-data-focus/workbench:opacity-0',
      // The panel inside fills the column's height.
      '[&_[data-slot=inspector]]:h-full [&_[data-slot=inspector-panel]]:h-full',
    ],
    timeline: [
      'relative flex min-h-0 min-w-0 flex-col overflow-hidden pt-2 [grid-area:timeline]',
      `transition-[opacity,translate] duration-500 ${EASE} motion-reduce:transition-none`,
      'group-data-focus/workbench:translate-y-4 group-data-focus/workbench:opacity-0',
      '[&>[data-slot=timeline]]:min-h-0 [&>[data-slot=timeline]]:flex-1',
    ],
    resize: [
      'absolute inset-x-0 top-0 z-20 flex h-2 cursor-row-resize items-center justify-center outline-none',
      "after:h-1 after:w-10 after:rounded-full after:bg-foreground/20 after:transition-[background-color,width] after:duration-150 after:content-['']",
      'hover:after:w-16 hover:after:bg-foreground/40 focus-visible:after:w-16 focus-visible:after:bg-ring data-active:after:w-16 data-active:after:bg-foreground/50',
    ],
    trigger: [
      'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground outline-none',
      'transition-[color,background-color,scale] duration-150 hover:bg-foreground/[0.06] hover:text-foreground active:scale-[0.94]',
      'focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-[1.125rem] [&_svg]:shrink-0',
    ],
    // In the sheet, the sheet is the surface: the inspector's own card gives
    // up its fill, ring and shadow rather than stand as a box in a box.
    sheetBody: [
      'flex min-h-0 flex-1 px-2 pb-2 [&_[data-slot=inspector]]:h-full [&_[data-slot=inspector]]:w-full',
      '[&_[data-slot=inspector-panel]]:h-full [&_[data-slot=inspector-panel]]:w-full [&_[data-slot=inspector-panel]]:bg-transparent',
      '[&_[data-slot=inspector-panel]]:shadow-none [&_[data-slot=inspector-panel]]:ring-0',
    ],
  },
});

interface WorkbenchContextValue {
  focus: boolean;
  setFocus(focus: boolean): void;
  compact: boolean;
  inspectorOpen: boolean;
  setInspectorOpen(open: boolean): void;
  hasSidebar(present: boolean): void;
  hasInspector(present: boolean): void;
  hasTimeline(present: boolean): void;
  timelineHeight: number;
  setTimelineHeight(height: number): void;
  setResizing(resizing: boolean): void;
  rootHeight(): number;
}

const WorkbenchContext = createContext<WorkbenchContextValue | null>(null);

function useWorkbenchContext(part: string) {
  const context = useContext(WorkbenchContext);
  if (!context) throw new Error(`${part} must be used inside a <Workbench>.`);
  return context;
}

/**
 * The workbench's state, for controls of your own: a focus button in the
 * toolbar, a button that opens the inspector on a narrow screen.
 */
export function useWorkbench() {
  const { focus, setFocus, compact, inspectorOpen, setInspectorOpen } = useWorkbenchContext('useWorkbench');
  return { focus, setFocus, compact, inspectorOpen, setInspectorOpen };
}

export interface WorkbenchProps extends ComponentProps<'div'> {
  /** Whether the panels are cleared away, when the caller holds it. */
  focus?: boolean;
  /** Whether it starts in focus. Default false. */
  defaultFocus?: boolean;
  /** Called when focus turns on or off. */
  onFocusChange?: (focus: boolean) => void;
  /** Toggle focus with the `\` key while nothing is being typed. Default true. */
  focusShortcut?: boolean;
  /** Below this many pixels wide, the inspector opens as a sheet. Default 760. */
  compactBelow?: number;
  /** The inspector column's width in pixels. Default 348, a rail and a panel. */
  inspectorWidth?: number;
  /** The sidebar's width in pixels. Default 240. */
  sidebarWidth?: number;
  /** The timeline's height in pixels to start at. Default 232. */
  defaultTimelineHeight?: number;
}

/** The editor's frame. Give it a height, such as `h-[640px]` or `h-dvh`. */
function WorkbenchRoot({
  focus: focusProp,
  defaultFocus = false,
  onFocusChange,
  focusShortcut = true,
  compactBelow = 760,
  inspectorWidth = 348,
  sidebarWidth = 240,
  defaultTimelineHeight = 232,
  className,
  style,
  children,
  ...props
}: WorkbenchProps) {
  const slots = workbenchVariants();
  const [innerFocus, setInnerFocus] = useState(defaultFocus);
  const focus = focusProp ?? innerFocus;
  const [compact, setCompact] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [parts, setParts] = useState({ sidebar: false, inspector: false, timeline: false });
  const [timelineHeight, setTimelineHeight] = useState(defaultTimelineHeight);
  const [resizing, setResizing] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const live = useRef({ focus, onFocusChange, controlled: focusProp !== undefined });
  live.current = { focus, onFocusChange, controlled: focusProp !== undefined };
  const setFocus = useCallback((next: boolean) => {
    if (!live.current.controlled) setInnerFocus(next);
    live.current.onFocusChange?.(next);
  }, []);

  // The workbench's own width decides, so it works in a pane as on a page.
  useEffect(() => {
    const box = root.current;
    if (!box) return;
    const observer = new ResizeObserver(() => setCompact(box.clientWidth < compactBelow));
    observer.observe(box);
    return () => observer.disconnect();
  }, [compactBelow]);
  useEffect(() => {
    if (!compact) setInspectorOpen(false);
  }, [compact]);

  useEffect(() => {
    if (!focusShortcut) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== '\\' || event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) {
        return;
      }
      event.preventDefault();
      setFocus(!live.current.focus);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [focusShortcut, setFocus]);

  const mark = (part: keyof typeof parts) => (present: boolean) =>
    setParts((all) => (all[part] === present ? all : { ...all, [part]: present }));

  const context = useMemo<WorkbenchContextValue>(
    () => ({
      focus,
      setFocus,
      compact,
      inspectorOpen,
      setInspectorOpen,
      hasSidebar: mark('sidebar'),
      hasInspector: mark('inspector'),
      hasTimeline: mark('timeline'),
      timelineHeight,
      setTimelineHeight,
      setResizing,
      rootHeight: () => root.current?.clientHeight ?? 0,
    }),
    [focus, setFocus, compact, inspectorOpen, timelineHeight]
  );

  const showSidebar = parts.sidebar && !focus && !compact;
  const showInspector = parts.inspector && !focus && !compact;
  const showTimeline = parts.timeline && !focus;

  return (
    <WorkbenchContext.Provider value={context}>
      <div
        ref={root}
        data-slot="workbench"
        data-focus={focus ? '' : undefined}
        data-compact={compact ? '' : undefined}
        data-resizing={resizing ? '' : undefined}
        className={slots.root({ className })}
        style={
          {
            ...style,
            '--wb-sidebar': showSidebar ? `${sidebarWidth}px` : '0px',
            '--wb-inspector': showInspector ? `${inspectorWidth}px` : '0px',
            '--wb-timeline': showTimeline ? `${timelineHeight}px` : '0px',
          } as CSSProperties
        }
        {...props}
      >
        {children}
      </div>
    </WorkbenchContext.Provider>
  );
}
WorkbenchRoot.displayName = 'Workbench';

/** Tells the workbench a part is in it, so its column or row gets room. */
function usePresence(register: (present: boolean) => void) {
  useEffect(() => {
    register(true);
    return () => register(false);
  }, []);
}

export interface WorkbenchBarProps extends ComponentProps<'div'> {}

/** The strip floating at the top of the canvas, for a toolbar. */
function WorkbenchBar({ className, ...props }: WorkbenchBarProps) {
  useWorkbenchContext('Workbench.Bar');
  const slots = workbenchVariants();
  return <div data-slot="workbench-bar" className={slots.bar({ className })} {...props} />;
}
WorkbenchBar.displayName = 'Workbench.Bar';

export interface WorkbenchSidebarProps extends ComponentProps<'aside'> {}

/** A column before the canvas, for layers, pages or assets. It is hidden on a narrow screen and in focus. */
function WorkbenchSidebar({ className, ...props }: WorkbenchSidebarProps) {
  const workbench = useWorkbenchContext('Workbench.Sidebar');
  usePresence(workbench.hasSidebar);
  const slots = workbenchVariants();
  return (
    <aside
      data-slot="workbench-sidebar"
      inert={workbench.focus || workbench.compact || undefined}
      className={slots.sidebar({ className })}
      {...props}
    />
  );
}
WorkbenchSidebar.displayName = 'Workbench.Sidebar';

export interface WorkbenchCanvasProps extends ComponentProps<'div'> {}

/** The stage in the middle: a field of dots with the work centred on it. */
function WorkbenchCanvas({ className, ...props }: WorkbenchCanvasProps) {
  useWorkbenchContext('Workbench.Canvas');
  const slots = workbenchVariants();
  return <div data-slot="workbench-canvas" className={slots.canvas({ className })} {...props} />;
}
WorkbenchCanvas.displayName = 'Workbench.Canvas';

export interface WorkbenchArtboardProps extends ComponentProps<'div'> {
  /** The work's shape, as a CSS aspect ratio such as `16 / 9` or `4 / 5`. Default `16 / 9`. */
  aspect?: string;
}

/** The work itself: as large as its shape fits on the canvas, clear of the floating bar. */
function WorkbenchArtboard({ aspect = '16 / 9', className, style, ...props }: WorkbenchArtboardProps) {
  const slots = workbenchVariants();
  const [wide, tall] = aspect.split('/').map((part) => Number(part.trim()) || 1);
  return (
    <div
      data-slot="workbench-artboard"
      className={slots.artboard({ className })}
      style={{ ...style, '--wb-aspect': aspect, '--wb-ratio': (wide ?? 1) / (tall ?? 1) } as CSSProperties}
      {...props}
    />
  );
}
WorkbenchArtboard.displayName = 'Workbench.Artboard';

export interface WorkbenchInspectorProps extends ComponentProps<'div'> {
  /** The sheet's heading on a narrow screen, read out when it opens. Default `Inspector`. */
  title?: string;
  children?: ReactNode;
}

/**
 * The column after the canvas, for an `Inspector`. On a narrow screen the
 * same children open in a sheet from the side instead.
 */
function WorkbenchInspector({ title = 'Inspector', className, children, ...props }: WorkbenchInspectorProps) {
  const workbench = useWorkbenchContext('Workbench.Inspector');
  usePresence(workbench.hasInspector);
  const slots = workbenchVariants();
  if (workbench.compact) {
    return (
      <Sheet side="right" open={workbench.inspectorOpen} onOpenChange={workbench.setInspectorOpen}>
        <Sheet.Content size="full">
          <Sheet.Header title={title} />
          <div data-slot="workbench-inspector" className={slots.sheetBody()}>
            {children}
          </div>
        </Sheet.Content>
      </Sheet>
    );
  }
  return (
    <div data-slot="workbench-inspector" inert={workbench.focus || undefined} className={slots.inspector({ className })} {...props}>
      {children}
    </div>
  );
}
WorkbenchInspector.displayName = 'Workbench.Inspector';

export interface WorkbenchInspectorTriggerProps extends ComponentProps<'button'> {}

/**
 * The button that opens the inspector's sheet on a narrow screen. It is
 * only there when the inspector is a sheet, so put it where it belongs on
 * either size: in the bar, beside the tools.
 */
function WorkbenchInspectorTrigger({ className, children, onClick, ...props }: WorkbenchInspectorTriggerProps) {
  const workbench = useWorkbenchContext('Workbench.InspectorTrigger');
  const slots = workbenchVariants();
  if (!workbench.compact) return null;
  return (
    <button
      type="button"
      data-slot="workbench-inspector-trigger"
      aria-label="Open inspector"
      aria-expanded={workbench.inspectorOpen}
      className={slots.trigger({ className })}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) workbench.setInspectorOpen(true);
      }}
      {...props}
    >
      {children ?? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
          <circle cx="16" cy="6" r="2" />
          <circle cx="10" cy="12" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
      )}
    </button>
  );
}
WorkbenchInspectorTrigger.displayName = 'Workbench.InspectorTrigger';

export interface WorkbenchTimelineProps extends ComponentProps<'div'> {
  /** Let its top edge be dragged to make it taller or shorter. Default true. */
  resizable?: boolean;
  /** The shortest it can be dragged to, in pixels. Default 140. */
  minHeight?: number;
}

/** The row under everything, for a `Timeline`. Its top edge drags to resize it. */
function WorkbenchTimeline({ resizable = true, minHeight = 140, className, children, ...props }: WorkbenchTimelineProps) {
  const workbench = useWorkbenchContext('Workbench.Timeline');
  usePresence(workbench.hasTimeline);
  const slots = workbenchVariants();
  const [active, setActive] = useState(false);
  const maxHeight = () => Math.max(minHeight, workbench.rootHeight() * 0.6);

  const drag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const startY = event.clientY;
    const startHeight = workbench.timelineHeight;
    setActive(true);
    workbench.setResizing(true);
    const target = event.currentTarget;
    const move = (next: PointerEvent) =>
      workbench.setTimelineHeight(Math.round(Math.min(Math.max(startHeight + startY - next.clientY, minHeight), maxHeight())));
    const end = () => {
      setActive(false);
      workbench.setResizing(false);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', end);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
  };

  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    const by = event.key === 'ArrowUp' ? 16 : event.key === 'ArrowDown' ? -16 : 0;
    if (!by) return;
    event.preventDefault();
    workbench.setTimelineHeight(Math.min(Math.max(workbench.timelineHeight + by, minHeight), maxHeight()));
  };

  return (
    <div data-slot="workbench-timeline" inert={workbench.focus || undefined} className={slots.timeline({ className })} {...props}>
      {resizable ? (
        <div
          role="separator"
          tabIndex={0}
          aria-orientation="horizontal"
          aria-label="Timeline height"
          aria-valuenow={workbench.timelineHeight}
          aria-valuemin={minHeight}
          data-slot="workbench-resize"
          data-active={active ? '' : undefined}
          className={slots.resize()}
          onPointerDown={drag}
          onKeyDown={keys}
        />
      ) : null}
      {children}
    </div>
  );
}
WorkbenchTimeline.displayName = 'Workbench.Timeline';

export const Workbench = Object.assign(WorkbenchRoot, {
  Bar: WorkbenchBar,
  Sidebar: WorkbenchSidebar,
  Canvas: WorkbenchCanvas,
  Artboard: WorkbenchArtboard,
  Inspector: WorkbenchInspector,
  InspectorTrigger: WorkbenchInspectorTrigger,
  Timeline: WorkbenchTimeline,
});

export {
  WorkbenchBar,
  WorkbenchSidebar,
  WorkbenchCanvas,
  WorkbenchArtboard,
  WorkbenchInspector,
  WorkbenchInspectorTrigger,
  WorkbenchTimeline,
  workbenchVariants,
};
