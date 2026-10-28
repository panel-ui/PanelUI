'use client';

/**
 * Timeline — time laid out left to right: tracks of clips under a ruler,
 * with a playhead, for editing a recording, an animation or a schedule.
 *
 * ```tsx
 * <Timeline duration={150} defaultZoom={12}>
 *   <Timeline.Header>
 *     <Timeline.Time />
 *     <Timeline.Zoom />
 *   </Timeline.Header>
 *   <Timeline.Viewport>
 *     <Timeline.Ruler />
 *     <Timeline.Track label="Zooms">
 *       <Timeline.Clip start={12} end={20} color="chart-4" variant="block" onChange={…} />
 *     </Timeline.Track>
 *     <Timeline.Playhead />
 *   </Timeline.Viewport>
 * </Timeline>
 * ```
 *
 * ## Clips you take hold of
 *
 * A clip with `onChange` is moved by dragging its middle and trimmed by
 * dragging either end. It cannot be pushed into its neighbour on the same
 * track, and near another clip's edge, the playhead or either end of the
 * timeline it snaps there, with a guide line drawn the length of the
 * timeline so the alignment can be seen.
 *
 * ## Three kinds of clip
 *
 * `bar` is a flat segment on a thin track, for something that only has a
 * span: a cut, a caption. `block` is a tall pill with grips, for an effect
 * placed on top of the footage: a zoom, a highlight. `media` is the
 * footage itself, a wide band that holds a `Timeline.Waveform`.
 *
 * ## The ruler keeps its distance
 *
 * Labels on the ruler stay at least 64 pixels apart at any zoom: zoomed
 * out, it counts in minutes; zoomed in, in fractions of a second. Pinch,
 * or ⌘ or Ctrl with the wheel, zooms about the pointer, so the moment under
 * the hand stays under it.
 */
import { ScrollArea } from '@base-ui/react/scroll-area';
import {
  Children,
  createContext,
  isValidElement,
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
  type RefObject,
} from 'react';
import { tv } from 'tailwind-variants';
import { Slider } from '../slider';

export type TimelineColor =
  | 'primary'
  | 'info'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'chart-1'
  | 'chart-2'
  | 'chart-3'
  | 'chart-4'
  | 'chart-5';
export type TimelineClipVariant = 'bar' | 'block' | 'media';
export type TimelineTrackSize = 'sm' | 'md' | 'lg';

/** Space before the first second and after the last, in pixels. */
const GUTTER = 16;
/** How close, in pixels, an edge has to come to something before it snaps there. */
const SNAP = 8;
/** The narrowest a clip can be trimmed to, in pixels at the current zoom. */
const MIN_WIDTH = 12;
/** How far apart, at least, the ruler's labels stand. */
const LABEL_GAP = 64;
/** Steps the ruler can count in, in seconds. */
const STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];

const COLORS: Record<TimelineColor, string> = {
  primary: 'var(--primary)',
  info: 'var(--info)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  destructive: 'var(--destructive)',
  'chart-1': 'var(--chart-1)',
  'chart-2': 'var(--chart-2)',
  'chart-3': 'var(--chart-3)',
  'chart-4': 'var(--chart-4)',
  'chart-5': 'var(--chart-5)',
};

/**
 * A time as a reader expects it. On a timeline under a minute long, seconds
 * with a unit: `0.5s`, `12s`. Longer, `m:ss`, and `h:mm:ss` past an hour.
 * `tenths` adds a tenth of a second either way.
 */
export function formatTime(seconds: number, tenths = false, short = false) {
  const sign = seconds < 0 ? '−' : '';
  const total = Math.abs(seconds);
  if (short) return `${sign}${tenths ? total.toFixed(1) : Math.round(total)}s`;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total - hours * 3600) / 60);
  const rest = total - hours * 3600 - minutes * 60;
  const whole = Math.floor(rest + 1e-6);
  const second = String(whole).padStart(2, '0');
  const fraction = tenths ? `.${Math.floor((rest - whole) * 10 + 1e-6)}` : '';
  return hours
    ? `${sign}${hours}:${String(minutes).padStart(2, '0')}:${second}${fraction}`
    : `${sign}${minutes}:${second}${fraction}`;
}

/** Under a minute, a timeline counts in seconds rather than minutes. */
const isShort = (duration: number) => duration < 60;

/** The ruler's step at a zoom: the smallest that keeps labels `LABEL_GAP` apart. */
export function rulerStep(zoom: number) {
  return STEPS.find((step) => step * zoom >= LABEL_GAP) ?? STEPS[STEPS.length - 1]!;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const timelineVariants = tv({
  slots: {
    root: [
      'group/timeline relative flex w-full min-w-0 flex-col overflow-hidden rounded-[22px] bg-popover text-popover-foreground select-none',
      'shadow-[0_10px_30px_-12px_rgb(0_0_0/0.3)] ring-1 ring-foreground/[0.06] dark:ring-foreground/10',
    ],
    header: 'flex min-h-12 items-center gap-2 px-3 pt-1.5',
    time: 'px-1 text-xs font-medium tabular-nums text-muted-foreground [&>b]:font-medium [&>b]:text-foreground',
    zoom: 'ms-auto flex w-44 items-center',
    viewport: 'relative min-w-0 flex-1 overscroll-x-contain outline-none',
    content: 'relative isolate pb-3',
    scrollbar:
      'mx-3 mb-1 flex h-1.5 opacity-0 transition-opacity delay-300 data-hovering:opacity-100 data-hovering:delay-0 data-scrolling:opacity-100 data-scrolling:delay-0',
    thumb: 'relative flex-1 rounded-full bg-foreground/20',
    // Past the end, a strip of diagonal lines says there is nothing more.
    end: [
      'pointer-events-none absolute top-8 bottom-0 -z-10',
      'bg-[repeating-linear-gradient(-45deg,color-mix(in_oklab,var(--foreground)_12%,transparent)_0_2px,transparent_2px_7px)]',
    ],
    ruler: 'relative h-8 cursor-ew-resize border-b border-foreground/[0.06]',
    tick: 'pointer-events-none absolute bottom-0 w-px bg-foreground/20',
    label: 'pointer-events-none absolute top-1.5 -translate-x-1/2 text-[11px] font-medium tabular-nums text-muted-foreground',
    track: 'relative my-1.5 first-of-type:mt-3',
    clip: [
      'group/clip absolute inset-y-0 flex min-w-0 items-center justify-center overflow-hidden outline-none',
      'bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--clip)_78%,white),var(--clip)_55%,color-mix(in_oklab,var(--clip)_88%,black))]',
      'shadow-[inset_0_1px_0_rgb(255_255_255/0.35),inset_0_-1px_0_rgb(0_0_0/0.15),0_1px_2px_rgb(0_0_0/0.2)]',
      'transition-[scale,box-shadow,filter] duration-150',
      'data-editable:cursor-grab data-dragging:cursor-grabbing data-dragging:scale-y-[1.04] data-dragging:brightness-110',
      'focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-popover',
      'motion-reduce:transition-none',
    ],
    handle: [
      'absolute inset-y-0 z-10 w-2.5 cursor-ew-resize opacity-0 transition-opacity duration-150',
      'group-hover/clip:opacity-100 group-data-dragging/clip:opacity-100',
      "after:absolute after:inset-y-[28%] after:w-[3px] after:rounded-full after:bg-white/80 after:content-['']",
    ],
    grip: 'pointer-events-none flex h-[42%] gap-[3px] [&>span]:w-[3px] [&>span]:rounded-full [&>span]:bg-white/45',
    clipLabel: [
      'pointer-events-none relative z-10 inline-flex max-w-full items-center gap-1.5 truncate px-2 text-xs font-semibold text-(--clip-foreground,white)',
      '[text-shadow:0_1px_2px_rgb(0_0_0/0.25)] [&_svg]:size-3.5 [&_svg]:shrink-0',
    ],
    waveform: 'pointer-events-none absolute inset-x-0 inset-y-[12%] size-auto h-[76%] w-full text-white/40',
    guide: 'pointer-events-none absolute top-8 bottom-0 z-20 w-px -translate-x-1/2 bg-foreground/70',
    playhead: 'pointer-events-none absolute top-0 bottom-0 z-30 -translate-x-1/2',
    playheadLine: 'absolute top-6 bottom-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-(--playhead)',
    playheadHead: [
      'pointer-events-auto absolute top-1 left-1/2 flex h-5 min-w-5 -translate-x-1/2 cursor-ew-resize items-center justify-center rounded-md px-1.5',
      'bg-(--playhead) text-[10px] font-semibold tabular-nums text-(--playhead-foreground) shadow-sm outline-none',
      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover',
    ],
  },
  variants: {
    variant: {
      bar: { clip: 'rounded-lg' },
      block: { clip: 'rounded-[14px]' },
      media: { clip: 'rounded-xl' },
    },
    size: {
      sm: { track: 'h-6' },
      md: { track: 'h-14' },
      lg: { track: 'h-16' },
    },
  },
});

interface Span {
  start: number;
  end: number;
}

interface TimelineContextValue {
  duration: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  setZoom(zoom: number, anchor?: { time: number; x: number }): void;
  time: number;
  setTime(time: number): void;
  playing: boolean;
  setPlaying(playing: boolean): void;
  snap: boolean;
  readOnly: boolean;
  /** Every clip's span, so an edge can snap to another track's clip. */
  spans: Map<string, Span>;
  /** Where a snapped edge is, while a guide line marks it. */
  setGuide(time: number | null): void;
  viewport: RefObject<HTMLDivElement | null>;
}

const TimelineContext = createContext<TimelineContextValue | null>(null);

function useTimelineContext(part: string) {
  const context = useContext(TimelineContext);
  if (!context) throw new Error(`${part} must be used inside a <Timeline>.`);
  return context;
}

/**
 * The timeline's state, for controls of your own: a play button in a
 * toolbar, a readout, a button that zooms to fit. Use it inside `<Timeline>`.
 */
export function useTimeline() {
  const { duration, time, setTime, playing, setPlaying, zoom, setZoom, minZoom, maxZoom } =
    useTimelineContext('useTimeline');
  return { duration, time, setTime, playing, setPlaying, zoom, setZoom, minZoom, maxZoom };
}

export interface TimelineProps extends Omit<ComponentProps<'div'>, 'onChange'> {
  /** How long the timeline is, in seconds. */
  duration: number;
  /** Where the playhead is, in seconds, when the caller holds it. */
  time?: number;
  /** Where the playhead starts, when the caller does not hold it. Default 0. */
  defaultTime?: number;
  /** Called with the new time when the playhead moves: scrubbed, stepped or playing. */
  onTimeChange?: (time: number) => void;
  /** Pixels per second, when the caller holds it. */
  zoom?: number;
  /** Pixels per second to start at. Default 12. */
  defaultZoom?: number;
  /** Called with the new zoom. */
  onZoomChange?: (zoom: number) => void;
  /** The furthest out it zooms, in pixels per second. Default 2. */
  minZoom?: number;
  /** The furthest in it zooms, in pixels per second. Default 120. */
  maxZoom?: number;
  /** Whether time is running, when the caller holds it. */
  playing?: boolean;
  /** Called when playback starts or stops, including when it reaches the end. */
  onPlayingChange?: (playing: boolean) => void;
  /** Start again from the beginning on reaching the end, instead of stopping. */
  loop?: boolean;
  /** Snap clip edges to other edges, the playhead and the ends. Default true. */
  snap?: boolean;
  /** Show it without letting clips be moved or trimmed. The playhead still moves. */
  readOnly?: boolean;
}

/** Holds the time, the zoom and playback for the parts inside it. */
function TimelineRoot({
  duration,
  time: timeProp,
  defaultTime = 0,
  onTimeChange,
  zoom: zoomProp,
  defaultZoom = 12,
  onZoomChange,
  minZoom = 2,
  maxZoom = 120,
  playing: playingProp,
  onPlayingChange,
  loop = false,
  snap = true,
  readOnly = false,
  className,
  children,
  ...props
}: TimelineProps) {
  const slots = timelineVariants();
  const [innerTime, setInnerTime] = useState(defaultTime);
  const [innerZoom, setInnerZoom] = useState(defaultZoom);
  const [innerPlaying, setInnerPlaying] = useState(false);
  const [guide, setGuide] = useState<number | null>(null);
  const time = clamp(timeProp ?? innerTime, 0, duration);
  const zoom = clamp(zoomProp ?? innerZoom, minZoom, maxZoom);
  const playing = playingProp ?? innerPlaying;
  const spans = useRef(new Map<string, Span>()).current;
  const viewport = useRef<HTMLDivElement>(null);

  const live = useRef({ time, zoom, duration, loop, onTimeChange, onZoomChange, onPlayingChange, timeProp, zoomProp, playingProp });
  live.current = { time, zoom, duration, loop, onTimeChange, onZoomChange, onPlayingChange, timeProp, zoomProp, playingProp };

  const setTime = useCallback((next: number) => {
    const value = clamp(next, 0, live.current.duration);
    // Seen by the playback loop at once, so a jump back to the start is not
    // overwritten by the frame that was already on its way.
    live.current.time = value;
    if (live.current.timeProp === undefined) setInnerTime(value);
    live.current.onTimeChange?.(value);
  }, []);

  const setPlaying = useCallback((next: boolean) => {
    if (live.current.playingProp === undefined) setInnerPlaying(next);
    live.current.onPlayingChange?.(next);
  }, []);

  const setZoom = useCallback(
    (next: number, anchor?: { time: number; x: number }) => {
      const value = clamp(next, minZoom, maxZoom);
      if (live.current.zoomProp === undefined) setInnerZoom(value);
      live.current.onZoomChange?.(value);
      // Keep the moment under the pointer (or the playhead) where it was.
      const box = viewport.current;
      if (!box) return;
      const at = anchor ?? { time: live.current.time, x: GUTTER + live.current.time * live.current.zoom - box.scrollLeft };
      requestAnimationFrame(() => {
        box.scrollLeft = GUTTER + at.time * value - at.x;
      });
    },
    [minZoom, maxZoom]
  );

  // Playback: time runs on with the clock while playing.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const next = live.current.time + (now - last) / 1000;
      last = now;
      if (next >= live.current.duration) {
        if (live.current.loop) setTime(0);
        else {
          setTime(live.current.duration);
          setPlaying(false);
          return;
        }
      } else setTime(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, setTime, setPlaying]);

  const context = useMemo<TimelineContextValue>(
    () => ({
      duration,
      zoom,
      minZoom,
      maxZoom,
      setZoom,
      time,
      setTime,
      playing,
      setPlaying,
      snap,
      readOnly,
      spans,
      setGuide,
      viewport,
    }),
    [duration, zoom, minZoom, maxZoom, setZoom, time, setTime, playing, setPlaying, snap, readOnly, spans]
  );

  return (
    <TimelineContext.Provider value={context}>
      <GuideContext.Provider value={guide}>
        <div data-slot="timeline" data-playing={playing ? '' : undefined} className={slots.root({ className })} {...props}>
          {children}
        </div>
      </GuideContext.Provider>
    </TimelineContext.Provider>
  );
}
TimelineRoot.displayName = 'Timeline';

const GuideContext = createContext<number | null>(null);

export interface TimelineHeaderProps extends ComponentProps<'div'> {}

/** A row above the tracks, for a toolbar, the time and the zoom. */
function TimelineHeader({ className, ...props }: TimelineHeaderProps) {
  const slots = timelineVariants();
  return <div data-slot="timeline-header" className={slots.header({ className })} {...props} />;
}
TimelineHeader.displayName = 'Timeline.Header';

export interface TimelineTimeProps extends ComponentProps<'span'> {
  /** Show the length after the time, as `1:32 / 2:30`. Default true. */
  showDuration?: boolean;
}

/** Where the playhead is, written out, and how long the whole is. */
function TimelineTime({ showDuration = true, className, ...props }: TimelineTimeProps) {
  const { time, duration } = useTimelineContext('Timeline.Time');
  const slots = timelineVariants();
  return (
    <span data-slot="timeline-time" className={slots.time({ className })} {...props}>
      <b>{formatTime(time, true, isShort(duration))}</b>
      {showDuration ? ` / ${formatTime(duration, isShort(duration), isShort(duration))}` : null}
    </span>
  );
}
TimelineTime.displayName = 'Timeline.Time';

export interface TimelineZoomProps extends Omit<ComponentProps<'div'>, 'children'> {}

/** A line slider that zooms the timeline, with zoom out and zoom in either side. */
function TimelineZoom({ className, ...props }: TimelineZoomProps) {
  const { zoom, setZoom, minZoom, maxZoom } = useTimelineContext('Timeline.Zoom');
  const slots = timelineVariants();
  // The slider runs on a log scale, so each stretch of it zooms by the same factor.
  const toSlider = (value: number) => Math.log(value / minZoom) / Math.log(maxZoom / minZoom);
  const fromSlider = (value: number) => minZoom * Math.pow(maxZoom / minZoom, value);
  const step = 0.125;
  return (
    <div data-slot="timeline-zoom" className={slots.zoom({ className })} {...props}>
      <Slider
        variant="line"
        label="Zoom"
        min={0}
        max={1}
        step={0.001}
        value={toSlider(zoom)}
        onValueChange={(value) => setZoom(fromSlider(value))}
        format={() => `${Math.round(zoom)} pixels per second`}
      >
        <Slider.Step by={-step} aria-label="Zoom out">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M5 7h4M10.5 10.5 13.5 13.5" />
          </svg>
        </Slider.Step>
        <Slider.Step by={step} aria-label="Zoom in">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M5 7h4M7 5v4M10.5 10.5 13.5 13.5" />
          </svg>
        </Slider.Step>
      </Slider>
    </div>
  );
}
TimelineZoom.displayName = 'Timeline.Zoom';

export interface TimelineViewportProps extends ComponentProps<'div'> {}

/**
 * The part that scrolls sideways: the ruler, the tracks and the playhead go
 * in here. Pinch, or ⌘ or Ctrl with the wheel, zooms about the pointer.
 */
function TimelineViewport({ className, style, children, ...props }: TimelineViewportProps) {
  const timeline = useTimelineContext('Timeline.Viewport');
  const guide = useContext(GuideContext);
  const slots = timelineVariants();
  const { viewport, duration, zoom, setZoom } = timeline;
  const width = GUTTER * 2 + duration * zoom;

  useEffect(() => {
    const box = viewport.current;
    if (!box) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const x = event.clientX - box.getBoundingClientRect().left;
      const time = (box.scrollLeft + x - GUTTER) / live.current;
      setZoom(live.current * Math.exp(-event.deltaY * 0.01), { time, x });
    };
    box.addEventListener('wheel', onWheel, { passive: false });
    return () => box.removeEventListener('wheel', onWheel);
  }, [viewport, setZoom]);
  const live = useRef(zoom);
  live.current = zoom;

  return (
    <ScrollArea.Root data-slot="timeline-viewport" className={slots.viewport({ className })}>
      <ScrollArea.Viewport ref={viewport} className="outline-none">
        <ScrollArea.Content
          dir="ltr"
          className={slots.content()}
          style={{ ...style, width, minWidth: '100%', ['--timeline-zoom' as string]: zoom } as CSSProperties}
          {...props}
        >
          <span aria-hidden className={slots.end()} style={{ left: GUTTER + duration * zoom, right: 0 }} />
          {children}
          {guide !== null ? <span aria-hidden data-slot="timeline-guide" className={slots.guide()} style={{ left: GUTTER + guide * zoom }} /> : null}
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation="horizontal" className={slots.scrollbar()}>
        <ScrollArea.Thumb className={slots.thumb()} />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}
TimelineViewport.displayName = 'Timeline.Viewport';

/** Turns a pointer's position into a time on the timeline. */
function useTimeAt() {
  const { viewport, zoom, duration } = useTimelineContext('A timeline part');
  return useCallback(
    (clientX: number) => {
      const box = viewport.current;
      if (!box) return 0;
      const x = clientX - box.getBoundingClientRect().left + box.scrollLeft;
      return clamp((x - GUTTER) / zoom, 0, duration);
    },
    [viewport, zoom, duration]
  );
}

export interface TimelineRulerProps extends ComponentProps<'div'> {}

/** Ticks and times along the top. Pressing or dragging on it moves the playhead there. */
function TimelineRuler({ className, ...props }: TimelineRulerProps) {
  const { duration, zoom, setTime } = useTimelineContext('Timeline.Ruler');
  const slots = timelineVariants();
  const timeAt = useTimeAt();
  const step = rulerStep(zoom);
  // Minor ticks between labels, where there is room for them.
  const minor = [5, 4, 2].map((parts) => step / parts).find((each) => each * zoom >= 8) ?? step;
  const ticks: ReactNode[] = [];
  const count = Math.floor(duration / minor + 1e-6);
  for (let at = 0; at <= count; at++) {
    const t = at * minor;
    const major = Math.abs(t / step - Math.round(t / step)) < 1e-6;
    const left = GUTTER + t * zoom;
    ticks.push(<span key={`t${at}`} className={slots.tick({ className: major ? 'h-2.5' : 'h-1.5' })} style={{ left }} />);
    if (major) {
      ticks.push(
        <span key={`l${at}`} className={slots.label()} style={{ left }}>
          {formatTime(t, step < 1, isShort(duration))}
        </span>
      );
    }
  }

  const scrub = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setTime(timeAt(event.clientX));
  };

  return (
    <div
      aria-hidden
      data-slot="timeline-ruler"
      className={slots.ruler({ className })}
      onPointerDown={scrub}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) setTime(timeAt(event.clientX));
      }}
      {...props}
    >
      {ticks}
    </div>
  );
}
TimelineRuler.displayName = 'Timeline.Ruler';

interface TrackContextValue {
  /** The clips on this track, so a drag stops at its neighbours. */
  spans: Map<string, Span>;
  size: TimelineTrackSize;
}

const TrackContext = createContext<TrackContextValue | null>(null);

/** How wide the clip is on screen, so a waveform can draw bars of a fixed width. */
const ClipWidthContext = createContext<number>(0);

export interface TimelineTrackProps extends ComponentProps<'div'> {
  /** The height of the row: `sm` for bars, `md` for blocks, `lg` for media. Default `md`. */
  size?: TimelineTrackSize;
  /** What the track holds, for a screen reader: "Zooms", "Voice". */
  label?: string;
}

/** A row of clips. Clips on one track cannot overlap. */
function TimelineTrack({ size = 'md', label, className, ...props }: TimelineTrackProps) {
  const slots = timelineVariants({ size });
  const spans = useRef(new Map<string, Span>()).current;
  return (
    <TrackContext.Provider value={useMemo(() => ({ spans, size }), [spans, size])}>
      <div role="group" aria-label={label} data-slot="timeline-track" data-size={size} className={slots.track({ className })} {...props} />
    </TrackContext.Provider>
  );
}
TimelineTrack.displayName = 'Timeline.Track';

export interface TimelineClipProps extends Omit<ComponentProps<'div'>, 'onChange'> {
  /** Where it starts, in seconds. */
  start: number;
  /** Where it ends, in seconds. */
  end: number;
  /** Called with the new span while it is moved or trimmed. Without it the clip stays put. */
  onChange?: (span: { start: number; end: number }) => void;
  /** Called once a move or a trim ends. */
  onChangeEnd?: (span: { start: number; end: number }) => void;
  /** Called on Delete or Backspace while the clip has focus. */
  onRemove?: () => void;
  /** `bar`, `block` or `media`. Default: `bar` on a small track, `media` on a large one, `block` otherwise. */
  variant?: TimelineClipVariant;
  /** Its colour, from the theme. Default `primary`. */
  color?: TimelineColor;
  /** What a screen reader calls it, before its times. */
  label?: string;
}

/** One clip. With `onChange` it moves by its middle and trims by its ends. */
function TimelineClip({
  start,
  end,
  onChange,
  onChangeEnd,
  onRemove,
  variant: variantProp,
  color = 'primary',
  label,
  className,
  style,
  children,
  onKeyDown,
  ...props
}: TimelineClipProps) {
  const timeline = useTimelineContext('Timeline.Clip');
  const track = useContext(TrackContext);
  if (!track) throw new Error('Timeline.Clip must be used inside a <Timeline.Track>.');
  const variant = variantProp ?? (track.size === 'sm' ? 'bar' : track.size === 'lg' ? 'media' : 'block');
  const slots = timelineVariants({ variant });
  const id = useRef(Math.random().toString(36).slice(2)).current;
  const editable = Boolean(onChange) && !timeline.readOnly;
  const [dragging, setDragging] = useState(false);
  const { zoom, duration, spans: everyone, setGuide, time } = timeline;

  // Known to the track, for neighbours, and to the timeline, for snapping.
  track.spans.set(id, { start, end });
  everyone.set(id, { start, end });
  useEffect(
    () => () => {
      track.spans.delete(id);
      everyone.delete(id);
    },
    [track.spans, everyone, id]
  );

  const live = useRef({ start, end, onChange, onChangeEnd, time });
  live.current = { start, end, onChange, onChangeEnd, time };

  /** The room this clip has: from its left neighbour's end to its right neighbour's start. */
  const room = () => {
    let lower = 0;
    let upper = duration;
    track.spans.forEach((span, other) => {
      if (other === id) return;
      if (span.end <= live.current.start + 1e-6) lower = Math.max(lower, span.end);
      if (span.start >= live.current.end - 1e-6) upper = Math.min(upper, span.start);
    });
    return { lower, upper };
  };

  /** Moves an edge onto a nearby edge, the playhead or an end, and says where. */
  const snapEdge = (at: number): { at: number; to: number | null } => {
    if (!timeline.snap) return { at, to: null };
    const reach = SNAP / zoom;
    const targets = [0, duration, live.current.time];
    everyone.forEach((span, other) => {
      if (other !== id) targets.push(span.start, span.end);
    });
    let best: number | null = null;
    for (const target of targets) {
      if (Math.abs(target - at) <= reach && (best === null || Math.abs(target - at) < Math.abs(best - at))) best = target;
    }
    return best === null ? { at, to: null } : { at: best, to: best };
  };

  const press = (event: ReactPointerEvent<HTMLElement>, part: 'move' | 'start' | 'end') => {
    if (!editable || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).closest<HTMLElement>('[data-slot=timeline-clip]')?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    const originX = event.clientX;
    const origin = { start: live.current.start, end: live.current.end };
    const { lower, upper } = room();
    const length = origin.end - origin.start;
    const shortest = MIN_WIDTH / zoom;
    setDragging(true);
    let last = origin;

    const move = (next: PointerEvent) => {
      const delta = (next.clientX - originX) / zoom;
      let span: Span;
      let guide: number | null = null;
      if (part === 'move') {
        let from = clamp(origin.start + delta, lower, upper - length);
        // Either edge may snap; the nearer one wins.
        const head = snapEdge(from);
        const tail = snapEdge(from + length);
        if (head.to !== null && (tail.to === null || Math.abs(head.at - from) <= Math.abs(tail.at - from - length))) {
          from = clamp(head.at, lower, upper - length);
          guide = head.to;
        } else if (tail.to !== null) {
          from = clamp(tail.at - length, lower, upper - length);
          guide = tail.to;
        }
        span = { start: from, end: from + length };
      } else if (part === 'start') {
        const snapped = snapEdge(origin.start + delta);
        const from = clamp(snapped.at, lower, origin.end - shortest);
        guide = snapped.to !== null && from === snapped.at ? snapped.to : null;
        span = { start: from, end: origin.end };
      } else {
        const snapped = snapEdge(origin.end + delta);
        const to = clamp(snapped.at, origin.start + shortest, upper);
        guide = snapped.to !== null && to === snapped.at ? snapped.to : null;
        span = { start: origin.start, end: to };
      }
      setGuide(guide);
      last = span;
      live.current.onChange?.(span);
    };
    const release = () => {
      setDragging(false);
      setGuide(null);
      live.current.onChangeEnd?.(last);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
  };

  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if ((event.key === 'Delete' || event.key === 'Backspace') && onRemove && !timeline.readOnly) {
      event.preventDefault();
      onRemove();
      return;
    }
    if (!editable || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault();
    const { lower, upper } = room();
    const by = (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 1 : 0.1);
    const length = end - start;
    const from = clamp(start + by, lower, upper - length);
    const span = { start: from, end: from + length };
    onChange?.(span);
    onChangeEnd?.(span);
  };

  const left = GUTTER + start * zoom;
  const width = Math.max((end - start) * zoom, 2);
  const name = `${label ? `${label}, ` : ''}${formatTime(start, true, isShort(duration))} to ${formatTime(end, true, isShort(duration))}`;
  const roomy = width >= 40;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-roledescription="clip"
      aria-label={name}
      data-slot="timeline-clip"
      data-variant={variant}
      data-editable={editable ? '' : undefined}
      data-dragging={dragging ? '' : undefined}
      className={slots.clip({ className })}
      style={
        {
          ...style,
          left,
          width,
          '--clip': COLORS[color],
          // Text on a warning-coloured clip is dark; on the others it is white.
          ...(color === 'warning' ? { '--clip-foreground': 'rgb(0 0 0 / 0.8)' } : null),
        } as CSSProperties
      }
      onPointerDown={(event) => press(event, 'move')}
      onKeyDown={keys}
      {...props}
    >
      {variant === 'block' && roomy && !hasLabel(children) ? (
        <span aria-hidden className={slots.grip()}>
          <span />
          <span />
        </span>
      ) : null}
      <ClipWidthContext.Provider value={width}>{children}</ClipWidthContext.Provider>
      {editable && width >= 28 ? (
        <>
          <span
            aria-hidden
            data-slot="timeline-clip-handle"
            className={slots.handle({ className: 'start-0 after:start-1' })}
            onPointerDown={(event) => press(event, 'start')}
          />
          <span
            aria-hidden
            data-slot="timeline-clip-handle"
            className={slots.handle({ className: 'end-0 after:end-1' })}
            onPointerDown={(event) => press(event, 'end')}
          />
        </>
      ) : null}
    </div>
  );
}
TimelineClip.displayName = 'Timeline.Clip';

function hasLabel(children: ReactNode) {
  let found = false;
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === TimelineClipLabel) found = true;
  });
  return found;
}

export interface TimelineClipLabelProps extends ComponentProps<'span'> {}

/** Words on a clip, with an icon: its length, its speed, what it is. */
function TimelineClipLabel({ className, ...props }: TimelineClipLabelProps) {
  const slots = timelineVariants();
  return <span data-slot="timeline-clip-label" className={slots.clipLabel({ className })} {...props} />;
}
TimelineClipLabel.displayName = 'Timeline.ClipLabel';

export interface TimelineWaveformProps extends Omit<ComponentProps<'svg'>, 'children'> {
  /** Loudness along the clip, each from 0 to 1. Drawn mirrored about the middle. */
  peaks: number[];
}

/** The sound of a media clip, drawn as bars across it. */
function TimelineWaveform({ peaks, className, ...props }: TimelineWaveformProps) {
  const slots = timelineVariants();
  const width = useContext(ClipWidthContext);
  // One bar every 4 pixels at any zoom: the peaks are resampled to the room
  // there is, each bar taking the loudest of the peaks it stands for.
  const bars = Math.max(1, Math.floor((width || peaks.length * 4) / 4));
  const heights = Array.from({ length: bars }, (_, at) => {
    let loudest = 0;
    if (bars > peaks.length) {
      // More bars than peaks: blend between the two nearest, so zooming in
      // draws a curve rather than steps.
      const position = (at / Math.max(bars - 1, 1)) * (peaks.length - 1);
      const below = Math.floor(position);
      const mix = position - below;
      loudest = (peaks[below] ?? 0) * (1 - mix) + (peaks[below + 1] ?? peaks[below] ?? 0) * mix;
    } else {
      const from = Math.floor((at / bars) * peaks.length);
      const to = Math.max(from + 1, Math.floor(((at + 1) / bars) * peaks.length));
      for (let each = from; each < to && each < peaks.length; each++) loudest = Math.max(loudest, peaks[each] ?? 0);
    }
    // Rounded, so the server and the browser write the same numbers.
    return Math.round(Math.max(clamp(loudest, 0, 1) * 100, 3) * 100) / 100;
  });
  return (
    <svg
      aria-hidden
      data-slot="timeline-waveform"
      viewBox={`0 0 ${bars * 4} 100`}
      preserveAspectRatio="none"
      className={slots.waveform({ className })}
      {...props}
    >
      {heights.map((height, at) => (
        <rect
          key={at}
          x={at * 4 + 1}
          y={Math.round((50 - height / 2) * 100) / 100}
          width={2}
          height={height}
          rx={1}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
TimelineWaveform.displayName = 'Timeline.Waveform';

export interface TimelinePlayheadProps extends Omit<ComponentProps<'div'>, 'color'> {
  /** The colour of the line and its head. Default `primary`. */
  color?: TimelineColor;
  /** Write the time in the head. Default true. */
  showTime?: boolean;
}

/**
 * The line at the current time, from the ruler to the bottom. Its head can
 * be dragged, and with focus the arrow keys step it: a tenth of a second,
 * or a second with Shift.
 */
function TimelinePlayhead({ color = 'primary', showTime = true, className, style, ...props }: TimelinePlayheadProps) {
  const { time, setTime, duration, zoom, playing, setPlaying } = useTimelineContext('Timeline.Playhead');
  const slots = timelineVariants();
  const timeAt = useTimeAt();
  const left = GUTTER + time * zoom;
  const foreground = color === 'primary' ? 'var(--primary-foreground)' : color === 'warning' ? 'black' : 'white';

  return (
    <div
      data-slot="timeline-playhead"
      className={slots.playhead({ className })}
      style={{ ...style, left, ['--playhead' as string]: COLORS[color], ['--playhead-foreground' as string]: foreground } as CSSProperties}
      {...props}
    >
      <span aria-hidden className={slots.playheadLine()} />
      <div
        role="slider"
        tabIndex={0}
        aria-label="Playhead"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={Math.round(time * 10) / 10}
        aria-valuetext={formatTime(time, true, isShort(duration))}
        data-slot="timeline-playhead-head"
        className={slots.playheadHead()}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          if (playing) setPlaying(false);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) setTime(timeAt(event.clientX));
        }}
        onKeyDown={(event) => {
          const by = event.shiftKey ? 1 : 0.1;
          const moves: Record<string, number> = {
            ArrowLeft: time - by,
            ArrowRight: time + by,
            Home: 0,
            End: duration,
          };
          if (event.key === ' ') {
            event.preventDefault();
            setPlaying(!playing);
            return;
          }
          const next = moves[event.key];
          if (next === undefined) return;
          event.preventDefault();
          setTime(next);
        }}
      >
        {showTime ? formatTime(time, isShort(duration), isShort(duration)) : null}
      </div>
    </div>
  );
}
TimelinePlayhead.displayName = 'Timeline.Playhead';

export const Timeline = Object.assign(TimelineRoot, {
  Header: TimelineHeader,
  Time: TimelineTime,
  Zoom: TimelineZoom,
  Viewport: TimelineViewport,
  Ruler: TimelineRuler,
  Track: TimelineTrack,
  Clip: TimelineClip,
  ClipLabel: TimelineClipLabel,
  Waveform: TimelineWaveform,
  Playhead: TimelinePlayhead,
});

export {
  TimelineHeader,
  TimelineTime,
  TimelineZoom,
  TimelineViewport,
  TimelineRuler,
  TimelineTrack,
  TimelineClip,
  TimelineClipLabel,
  TimelineWaveform,
  TimelinePlayhead,
  timelineVariants,
};
