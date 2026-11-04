'use client';

/**
 * Usage — how much of a model's context, or of a plan, has been used.
 *
 * ```tsx
 * <Usage limit={200_000} segments={segments} state="active">
 *   <Usage.Trigger />
 *   <Usage.Content>
 *     <Usage.Summary label="Context window" unit="tokens" />
 *     <Usage.Breakdown />
 *     <Usage.Section title="Plan">
 *       <Usage.Meter label="Session" value={62} limit={100} note="Resets in 2h 14m" />
 *     </Usage.Section>
 *   </Usage.Content>
 * </Usage>
 * ```
 *
 * ## An indicator that opens into the figures
 *
 * The trigger is small enough for a composer's footer or a chat header, and
 * says one thing at a glance: how full, and whether that is a problem yet.
 * Pressing it opens the figures behind it: what the space is taken up by,
 * and how much of the plan is left.
 *
 * ## Colour is the state
 *
 * The colour comes from the share used, not from the caller. Below
 * `warning` (70%) it is the info colour, from there to `critical` (90%) the
 * warning colour, and past that the destructive one. `state="idle"` greys it
 * out, for a conversation not yet started, and `state="done"` turns it to
 * the success colour, for a run that finished inside its budget.
 *
 * ## Segments
 *
 * Pass `segments` to say what the space is taken up by: the system prompt,
 * the tools, the files, the messages. The ring and the bar draw them in
 * order with a gap between each, the older ones in neutral steps and the
 * last, the one still growing, in the state's colour, so the eye goes to the
 * part that is changing. A segment's `color` overrides that.
 *
 * ## Six indicators
 *
 * `ring` is a dot inside a ring of arcs. `dots` is the same reading as
 * twelve dots round the dot. `gauge` is an open arc with the percentage in
 * it. `bar` is a short segmented bar with the percentage beside it, for a
 * footer. `cells` fills a small grid a twentieth at a time. `pill` is a
 * chip with a small ring and the count written out.
 */
import { Popover } from '@base-ui/react/popover';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { RollingNumber } from '../rolling-number';

export type UsageState = 'idle' | 'active' | 'done';
export type UsageLevel = 'idle' | 'normal' | 'warning' | 'critical' | 'done';
export type UsageVariant = 'ring' | 'dots' | 'gauge' | 'bar' | 'cells' | 'pill';

export interface UsageSegment {
  /** What takes up this share, as the breakdown names it: `System prompt`, `Messages`. */
  label: string;
  /** How much it takes up, in the same unit as `limit`. */
  value: number;
  /** A CSS colour for it, in place of the one picked from its place in the order. */
  color?: string;
}

/** Each level's colour, as the `--usage-tone` every part draws its state in. */
const TONES: Record<UsageLevel, string> = {
  idle: 'var(--muted-foreground)',
  normal: 'var(--info)',
  warning: 'var(--warning)',
  critical: 'var(--destructive)',
  done: 'var(--success)',
};

const KEYFRAMES =
  '@keyframes panelui-usage-breathe{0%,100%{transform:scale(1)}50%{transform:scale(.78)}}' +
  '@keyframes panelui-usage-glow{0%,100%{opacity:1}50%{opacity:.45}}' +
  // Reduced motion: the indicator jumps to each new reading and holds still.
  '@media (prefers-reduced-motion:reduce){[data-slot=usage-trigger] *{animation:none!important;transition:none!important}}';

const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

const usageVariants = tv({
  slots: {
    trigger: [
      'group/usage relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 text-foreground outline-none',
      'transition-[background-color,scale,color] duration-150 ease-out active:scale-[0.97] motion-reduce:active:scale-100',
      'focus-visible:ring-[3px] focus-visible:ring-ring/30 data-popup-open:bg-accent',
      'tabular-nums',
    ],
    positioner: 'z-50 outline-none',
    popup: [
      'w-80 max-w-[calc(100vw-1rem)] origin-(--transform-origin) overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg shadow-black/10 outline-none',
      'transition-[opacity,scale] duration-[180ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
      'data-starting-style:scale-[0.96] data-starting-style:opacity-0 data-ending-style:scale-[0.96] data-ending-style:opacity-0',
      'motion-reduce:transition-none',
    ],
    summary: 'flex flex-col gap-3 p-4',
    summaryHead: 'flex items-end justify-between gap-3',
    summaryLabel: 'text-xs text-muted-foreground',
    summaryFigure: 'flex items-baseline gap-1.5 text-foreground',
    summaryValue: 'text-2xl leading-8 font-semibold tracking-tight tabular-nums',
    summaryLimit: 'text-sm text-muted-foreground tabular-nums',
    percent: [
      'inline-flex h-6 items-center rounded-md px-1.5 text-xs font-medium tabular-nums',
      'bg-[color-mix(in_oklab,var(--usage-tone)_12%,transparent)] text-[color-mix(in_oklab,var(--usage-tone),var(--foreground)_30%)]',
    ],
    stack: 'flex h-2 w-full gap-[3px] overflow-hidden',
    stackPiece: 'h-full min-w-0 rounded-[3px] transition-[flex-grow] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
    breakdown: 'flex flex-col gap-1.5 px-4 pb-4 text-[0.8125rem]',
    breakdownRow: 'flex items-center gap-2.5',
    swatch: 'size-2 shrink-0 rounded-[3px]',
    breakdownLabel: 'min-w-0 flex-1 truncate text-muted-foreground',
    breakdownValue: 'tabular-nums text-foreground',
    breakdownShare: 'w-10 text-end tabular-nums text-muted-foreground',
    section: 'flex flex-col gap-3 border-t p-4',
    sectionHead: 'flex items-center justify-between gap-3',
    sectionTitle: 'text-xs font-medium text-muted-foreground',
    sectionAside: 'text-xs text-muted-foreground',
    meter: 'flex flex-col gap-1.5',
    meterHead: 'flex items-baseline justify-between gap-3 text-[0.8125rem]',
    meterLabel: 'text-foreground',
    meterValue: 'tabular-nums text-muted-foreground',
    ticks: 'flex h-3.5 items-stretch gap-[2px]',
    tick: 'flex-1 rounded-[1px] transition-colors duration-300',
    meterNote: 'text-xs text-muted-foreground',
    footer: 'flex items-center justify-between gap-3 border-t bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground',
  },
  variants: {
    variant: {
      ring: { trigger: 'size-8 rounded-full hover:bg-accent [&>svg]:size-[22px]' },
      dots: { trigger: 'size-8 rounded-full hover:bg-accent [&>svg]:size-[22px]' },
      gauge: { trigger: 'size-11 rounded-full hover:bg-accent [&>svg]:size-10' },
      bar: { trigger: 'h-8 rounded-full px-2.5 text-xs font-medium hover:bg-accent' },
      cells: { trigger: 'h-8 rounded-lg px-2 text-xs font-medium hover:bg-accent' },
      pill: {
        trigger:
          'h-8 rounded-full border bg-background px-2.5 text-xs font-medium shadow-xs hover:bg-accent dark:bg-input/30 [&>svg]:size-3.5',
      },
    },
  },
  defaultVariants: { variant: 'ring' },
});

/* -------------------------------------------------------------------------- */
/* Reading the figures                                                        */
/* -------------------------------------------------------------------------- */

function levelOf(ratio: number, state: UsageState, warning: number, critical: number): UsageLevel {
  if (state === 'idle') return 'idle';
  if (state === 'done') return 'done';
  if (ratio >= critical) return 'critical';
  if (ratio >= warning) return 'warning';
  return 'normal';
}

/** The older segments in neutral steps, the last in the state's colour. */
function colourOf(index: number, count: number, own?: string) {
  if (own) return own;
  if (index === count - 1) return 'var(--usage-tone)';
  const strength = Math.max(28, 78 - (count - 2 - index) * 18);
  return `color-mix(in oklab, var(--muted-foreground) ${strength}%, transparent)`;
}

interface Piece {
  label: string;
  value: number;
  share: number;
  color: string;
}

interface UsageContextValue {
  used: number;
  limit: number;
  ratio: number;
  level: UsageLevel;
  state: UsageState;
  label: string;
  pieces: Piece[];
  warning: number;
  critical: number;
  format: Intl.NumberFormatOptions;
  locales?: Intl.LocalesArgument;
}

const UsageContext = createContext<UsageContextValue | null>(null);

function useUsage(part: string) {
  const usage = useContext(UsageContext);
  if (!usage) throw new Error(`${part} must be used inside <Usage>.`);
  return usage;
}

const toneStyle = (level: UsageLevel) => ({ '--usage-tone': TONES[level] }) as CSSProperties;

/** The figure written compactly, as the trigger and the breakdown show it. */
function useFormat() {
  const { format, locales } = useUsage('Usage');
  return useMemo(() => new Intl.NumberFormat(locales, format), [format, locales]);
}

/** False for the first frame, so the arcs and bars grow in from nothing once. */
function useDrawn() {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return drawn;
}

/* -------------------------------------------------------------------------- */
/* Root                                                                       */
/* -------------------------------------------------------------------------- */

export interface UsageProps extends Omit<Popover.Root.Props, 'children'> {
  /** How much there is in all, in the unit of the values: tokens, requests, dollars. */
  limit: number;
  /** What the used space is taken up by, oldest first. Their sum is the amount used. */
  segments?: readonly UsageSegment[];
  /** The amount used, when there are no `segments` to add up. */
  value?: number;
  /** `idle` greys it out, `active` breathes, `done` turns it to the success colour. Default `active`. */
  state?: UsageState;
  /** The share, from 0 to 1, at which it turns to the warning colour. Default `0.7`. */
  warning?: number;
  /** The share, from 0 to 1, at which it turns to the destructive colour. Default `0.9`. */
  critical?: number;
  /** What is being measured, as the trigger's accessible name begins. Default `Context`. */
  label?: string;
  /** How amounts are written. Default compact, so 124000 is `124K`. */
  format?: Intl.NumberFormatOptions;
  /** The locale the amounts are written in. Default the browser's. */
  locales?: Intl.LocalesArgument;
  children?: ReactNode;
}

const COMPACT: Intl.NumberFormatOptions = { notation: 'compact', maximumFractionDigits: 1 };

/** Holds the figures, and opens the popover from its trigger. */
function UsageRoot({
  limit,
  segments,
  value,
  state = 'active',
  warning = 0.7,
  critical = 0.9,
  label = 'Context',
  format = COMPACT,
  locales,
  children,
  ...props
}: UsageProps) {
  const context = useMemo<UsageContextValue>(() => {
    const parts = segments ?? [];
    const used = parts.length > 0 ? parts.reduce((sum, part) => sum + Math.max(0, part.value), 0) : Math.max(0, value ?? 0);
    const safeLimit = Math.max(1, limit);
    const ratio = Math.min(1, used / safeLimit);
    const pieces = parts.map((part, index) => ({
      label: part.label,
      value: Math.max(0, part.value),
      share: Math.max(0, part.value) / safeLimit,
      color: colourOf(index, parts.length, part.color),
    }));
    if (pieces.length === 0 && used > 0) {
      pieces.push({ label, value: used, share: ratio, color: 'var(--usage-tone)' });
    }
    return {
      used,
      limit: safeLimit,
      ratio,
      level: levelOf(ratio, state, warning, critical),
      state,
      label,
      pieces,
      warning,
      critical,
      format,
      locales,
    };
  }, [segments, value, limit, state, warning, critical, label, format, locales]);

  return (
    <UsageContext.Provider value={context}>
      <Popover.Root {...props}>{children}</Popover.Root>
    </UsageContext.Provider>
  );
}
UsageRoot.displayName = 'Usage';

/* -------------------------------------------------------------------------- */
/* Indicators                                                                 */
/* -------------------------------------------------------------------------- */

/** A dot that shrinks and grows while the amount is still changing. */
const breathe = (on: boolean): CSSProperties | undefined =>
  on ? { animation: 'panelui-usage-breathe 1.8s ease-in-out infinite', transformBox: 'fill-box', transformOrigin: 'center' } : undefined;

/** The newest bar or cell, fading in and out while the amount is still changing. */
const glow = (on: boolean): CSSProperties | undefined =>
  on ? { animation: 'panelui-usage-glow 1.8s ease-in-out infinite' } : undefined;

/** Arcs round a circle: each piece in turn, then the free track, with a gap between each. */
function arcsOf(pieces: Piece[], ratio: number, circumference: number, gap: number) {
  const shown = pieces.filter((piece) => piece.share > 0);
  const free = Math.max(0, 1 - ratio);
  const all = [...shown.map((piece) => ({ ...piece, track: false })), ...(free > 0.001 ? [{ label: 'Free', value: 0, share: free, color: '', track: true }] : [])];
  const spacing = all.length > 1 ? gap : 0;
  let start = 0;
  return all.map((piece) => {
    const length = Math.max(0, Math.min(piece.share, 1) * circumference - spacing);
    const arc = { ...piece, start, length };
    start += Math.min(piece.share, 1) * circumference;
    return arc;
  });
}

function RingIndicator({ compact = false }: { compact?: boolean }) {
  const { pieces, ratio, level, state } = useUsage('Usage.Trigger');
  const drawn = useDrawn();
  const radius = compact ? 9.5 : 9.25;
  const circumference = 2 * Math.PI * radius;
  const arcs = arcsOf(pieces, ratio, circumference, compact ? 2.6 : 2.4);
  const done = level === 'done';
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" overflow="visible">
      <g
        style={{
          transformOrigin: '12px 12px',
          transform: done ? 'scale(0.55)' : 'scale(1)',
          opacity: done ? 0 : 1,
          transition: `transform 320ms ${EASE}, opacity 220ms ease-out`,
        }}
      >
        {arcs.map((arc, index) => (
          <circle
            key={index}
            cx="12"
            cy="12"
            r={radius}
            stroke={arc.track ? 'color-mix(in oklab, var(--muted-foreground) 20%, transparent)' : arc.color}
            strokeWidth={compact ? 3.5 : 3}
            strokeDasharray={`${drawn ? arc.length : 0} ${circumference}`}
            strokeDashoffset={-arc.start}
            transform="rotate(-90 12 12)"
            style={{ transition: `stroke-dasharray 600ms ${EASE}, stroke-dashoffset 600ms ${EASE}, stroke 300ms ease` }}
          />
        ))}
      </g>
      {compact ? null : (
        <circle
          cx="12"
          cy="12"
          r="5"
          fill="var(--usage-tone)"
          style={{
            transformOrigin: '12px 12px',
            transform: done ? 'scale(1.6)' : 'scale(1)',
            transition: `transform 320ms ${EASE}, fill 300ms ease`,
            ...breathe(state === 'active' && !done),
          }}
        />
      )}
    </svg>
  );
}

function DotsIndicator() {
  const { ratio, level, state } = useUsage('Usage.Trigger');
  const lit = level === 'done' ? 12 : Math.round(ratio * 12);
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * Math.PI * 2 - Math.PI / 2;
        const on = index < lit;
        return (
          <circle
            key={index}
            cx={12 + Math.cos(angle) * 9.5}
            cy={12 + Math.sin(angle) * 9.5}
            r={on ? 1.6 : 1.2}
            fill={on ? 'var(--usage-tone)' : 'color-mix(in oklab, var(--muted-foreground) 30%, transparent)'}
            style={{ transition: `r 300ms ${EASE}, fill 300ms ease`, transitionDelay: `${index * 25}ms` }}
          />
        );
      })}
      <circle cx="12" cy="12" r="4" fill="var(--usage-tone)" style={breathe(state === 'active' && level !== 'done')} />
    </svg>
  );
}

function GaugeIndicator() {
  const { ratio, state, level } = useUsage('Usage.Trigger');
  const drawn = useDrawn();
  const radius = 15;
  const sweep = 0.75;
  const circumference = 2 * Math.PI * radius;
  const full = circumference * sweep;
  const shown = drawn ? full * ratio : 0;
  const endAngle = ((135 + 270 * ratio) * Math.PI) / 180;
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" fill="none">
      <circle
        cx="20"
        cy="20"
        r={radius}
        stroke="color-mix(in oklab, var(--muted-foreground) 20%, transparent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${full} ${circumference}`}
        transform="rotate(135 20 20)"
      />
      <circle
        cx="20"
        cy="20"
        r={radius}
        stroke="var(--usage-tone)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${shown} ${circumference}`}
        transform="rotate(135 20 20)"
        style={{ transition: `stroke-dasharray 600ms ${EASE}, stroke 300ms ease` }}
      />
      {state === 'active' && level !== 'done' && ratio > 0 ? (
        <circle
          cx={20 + Math.cos(endAngle) * radius}
          cy={20 + Math.sin(endAngle) * radius}
          r="1.5"
          fill="var(--background)"
          style={breathe(true)}
        />
      ) : null}
      <text
        x="20"
        y="20"
        dy="0.35em"
        textAnchor="middle"
        fill="currentColor"
        style={{ fontSize: 10, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
      >
        {Math.round(ratio * 100)}
      </text>
    </svg>
  );
}

function BarIndicator() {
  const { pieces, ratio, state, level } = useUsage('Usage.Trigger');
  const drawn = useDrawn();
  const shown = pieces.filter((piece) => piece.share > 0);
  return (
    <>
      <span aria-hidden="true" className="flex h-1.5 w-12 gap-[2px]">
        {shown.map((piece, index) => (
          <span
            key={piece.label}
            className="rounded-full"
            style={{
              flexGrow: drawn ? piece.share : 0,
              flexBasis: 0,
              background: piece.color,
              transition: `flex-grow 600ms ${EASE}, background-color 300ms ease`,
              ...glow(state === 'active' && level !== 'done' && index === shown.length - 1),
            }}
          />
        ))}
        <span
          className="rounded-full"
          style={{
            flexGrow: drawn ? Math.max(0, 1 - ratio) : 1,
            flexBasis: 0,
            background: 'color-mix(in oklab, var(--muted-foreground) 20%, transparent)',
            transition: `flex-grow 600ms ${EASE}`,
          }}
        />
      </span>
      <span>{Math.round(ratio * 100)}%</span>
    </>
  );
}

function CellsIndicator() {
  const { used, ratio, state, level } = useUsage('Usage.Trigger');
  const formatter = useFormat();
  const count = 20;
  const lit = ratio * count;
  return (
    <>
      <span aria-hidden="true" className="grid grid-flow-col grid-rows-2 gap-[2px]">
        {Array.from({ length: count }, (_, index) => {
          // Filled column by column, top then bottom, like reading a meter.
          const column = Math.floor(index / 2);
          const order = column * 2 + (index % 2);
          const fill = Math.max(0, Math.min(1, lit - order));
          const last = order === Math.ceil(lit) - 1;
          return (
            <span
              key={index}
              className="size-[5px] rounded-[1.5px]"
              style={{
                // A cell part-way full is the tone at part strength, by opacity, so
                // the colour itself never has to be mixed.
                background: fill > 0 ? 'var(--usage-tone)' : 'color-mix(in oklab, var(--muted-foreground) 22%, transparent)',
                opacity: fill > 0 ? 0.35 + fill * 0.65 : 1,
                transition: 'background-color 300ms ease, opacity 300ms ease',
                ...glow(state === 'active' && level !== 'done' && last),
              }}
            />
          );
        })}
      </span>
      <span>{formatter.format(used)}</span>
    </>
  );
}

function PillIndicator() {
  const { used, limit } = useUsage('Usage.Trigger');
  const formatter = useFormat();
  return (
    <>
      <RingIndicator compact />
      <span>
        {formatter.format(used)}
        <span className="text-muted-foreground"> / {formatter.format(limit)}</span>
      </span>
    </>
  );
}

const INDICATORS: Record<UsageVariant, () => ReactNode> = {
  ring: () => <RingIndicator />,
  dots: () => <DotsIndicator />,
  gauge: () => <GaugeIndicator />,
  bar: () => <BarIndicator />,
  cells: () => <CellsIndicator />,
  pill: () => <PillIndicator />,
};

export interface UsageTriggerProps extends Omit<Popover.Trigger.Props, 'children'> {
  /** The indicator: `ring`, `dots`, `gauge`, `bar`, `cells` or `pill`. Default `ring`. */
  variant?: UsageVariant;
  className?: string;
  children?: ReactNode;
}

/** The indicator, and the button that opens the figures. Its accessible name says the share used. */
function UsageTrigger({ variant = 'ring', className, style, children, ...props }: UsageTriggerProps) {
  const usage = useUsage('Usage.Trigger');
  const percent = Math.round(usage.ratio * 100);
  const name =
    usage.level === 'idle'
      ? `${usage.label}: not started`
      : `${usage.label}: ${percent}% used${usage.level === 'done' ? ', finished' : ''}`;
  return (
    <Popover.Trigger
      data-slot="usage-trigger"
      data-variant={variant}
      data-level={usage.level}
      aria-label={name}
      className={usageVariants({ variant }).trigger({ className })}
      style={{ ...toneStyle(usage.level), ...(style as CSSProperties) }}
      {...props}
    >
      <style>{KEYFRAMES}</style>
      {INDICATORS[variant]()}
      {children}
    </Popover.Trigger>
  );
}
UsageTrigger.displayName = 'Usage.Trigger';

/* -------------------------------------------------------------------------- */
/* The popover                                                                */
/* -------------------------------------------------------------------------- */

export interface UsageContentProps extends Popover.Popup.Props {
  /** Which side of the trigger it opens on. Default `top`, since the trigger usually sits low in a composer. */
  side?: Popover.Positioner.Props['side'];
  /** How it lines up with the trigger along that side. Default `start`. */
  align?: Popover.Positioner.Props['align'];
  /** The gap between the trigger and the popover, in pixels. Default `8`. */
  sideOffset?: number;
  /** Where in the document it is put. Default `document.body`. */
  container?: Popover.Portal.Props['container'];
  className?: string;
}

/** The figures, in a layer that grows out of the trigger. */
function UsageContent({ side = 'top', align = 'start', sideOffset = 8, container, className, style, ...props }: UsageContentProps) {
  const usage = useUsage('Usage.Content');
  const slots = usageVariants();
  return (
    <Popover.Portal container={container}>
      <Popover.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={slots.positioner()}
      >
        <Popover.Popup
          data-slot="usage-content"
          className={slots.popup({ className })}
          style={{ ...toneStyle(usage.level), ...(style as CSSProperties) }}
          {...props}
        />
      </Popover.Positioner>
    </Popover.Portal>
  );
}
UsageContent.displayName = 'Usage.Content';

export interface UsageSummaryProps extends ComponentProps<'div'> {
  /** What is being measured, over the figure. Default the root's `label`. */
  label?: ReactNode;
  /** The unit after the limit: `tokens`. */
  unit?: ReactNode;
}

/** The amount used written large, with the limit, the share, and the segments as one bar. */
function UsageSummary({ label, unit, className, ...props }: UsageSummaryProps) {
  const usage = useUsage('Usage.Summary');
  const formatter = useFormat();
  const drawn = useDrawn();
  const slots = usageVariants();
  const shown = usage.pieces.filter((piece) => piece.share > 0);
  return (
    <div data-slot="usage-summary" className={slots.summary({ className })} {...props}>
      <div className={slots.summaryHead()}>
        <div className="flex flex-col gap-0.5">
          <span className={slots.summaryLabel()}>{label ?? usage.label}</span>
          <span className={slots.summaryFigure()}>
            <RollingNumber value={usage.used} format={usage.format} locales={usage.locales} className={slots.summaryValue()} />
            <span className={slots.summaryLimit()}>
              / {formatter.format(usage.limit)}
              {unit ? <> {unit}</> : null}
            </span>
          </span>
        </div>
        {usage.level === 'idle' ? null : <span className={slots.percent()}>{Math.round(usage.ratio * 100)}%</span>}
      </div>
      <div aria-hidden="true" className={slots.stack()}>
        {shown.map((piece) => (
          <span
            key={piece.label}
            className={slots.stackPiece()}
            style={{ flexGrow: drawn ? piece.share : 0, flexBasis: 0, background: piece.color }}
          />
        ))}
        <span
          className={slots.stackPiece()}
          style={{
            flexGrow: drawn ? Math.max(0, 1 - usage.ratio) : 1,
            flexBasis: 0,
            background: 'color-mix(in oklab, var(--muted-foreground) 16%, transparent)',
          }}
        />
      </div>
    </div>
  );
}
UsageSummary.displayName = 'Usage.Summary';

export interface UsageBreakdownProps extends ComponentProps<'ul'> {
  /** What the unused space is called in the last row. Pass `null` for no such row. Default `Free`. */
  freeLabel?: ReactNode;
}

/** One row per segment, in the colour the ring and the bar draw it in, with what is left last. */
function UsageBreakdown({ freeLabel = 'Free', className, ...props }: UsageBreakdownProps) {
  const usage = useUsage('Usage.Breakdown');
  const formatter = useFormat();
  const slots = usageVariants();
  const free = Math.max(0, usage.limit - usage.used);
  const share = (value: number) => `${Math.round((value / usage.limit) * 100)}%`;
  return (
    <ul data-slot="usage-breakdown" className={slots.breakdown({ className })} {...props}>
      {usage.pieces.map((piece) => (
        <li key={piece.label} className={slots.breakdownRow()}>
          <span aria-hidden="true" className={slots.swatch()} style={{ background: piece.color }} />
          <span className={slots.breakdownLabel()}>{piece.label}</span>
          <span className={slots.breakdownValue()}>{formatter.format(piece.value)}</span>
          <span className={slots.breakdownShare()}>{share(piece.value)}</span>
        </li>
      ))}
      {freeLabel === null ? null : (
        <li className={slots.breakdownRow()}>
          <span
            aria-hidden="true"
            className={slots.swatch()}
            style={{ background: 'color-mix(in oklab, var(--muted-foreground) 16%, transparent)' }}
          />
          <span className={slots.breakdownLabel()}>{freeLabel}</span>
          <span className={slots.breakdownValue()}>{formatter.format(free)}</span>
          <span className={slots.breakdownShare()}>{share(free)}</span>
        </li>
      )}
    </ul>
  );
}
UsageBreakdown.displayName = 'Usage.Breakdown';

export interface UsageSectionProps extends Omit<ComponentProps<'section'>, 'title'> {
  /** The section's heading: `Plan`, `This month`. */
  title?: ReactNode;
  /** Something at the far end of the heading, such as the plan's name. */
  aside?: ReactNode;
}

/** A block of figures under a rule, with a heading. */
function UsageSection({ title, aside, className, children, ...props }: UsageSectionProps) {
  const slots = usageVariants();
  return (
    <section data-slot="usage-section" className={slots.section({ className })} {...props}>
      {title || aside ? (
        <div className={slots.sectionHead()}>
          {title ? <h3 className={slots.sectionTitle()}>{title}</h3> : <span />}
          {aside ? <span className={slots.sectionAside()}>{aside}</span> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
UsageSection.displayName = 'Usage.Section';

export interface UsageMeterProps extends ComponentProps<'div'> {
  /** What it measures: `Session`, `This week`. */
  label: ReactNode;
  /** How much is used. */
  value: number;
  /** How much there is. Default `100`, for a value that is already a percentage. */
  limit?: number;
  /** A line under the bar: when it resets, what happens at the limit. */
  note?: ReactNode;
  /** How the value is written beside the label. Default `value / limit` in the root's format, or a percentage when `limit` is 100. */
  display?: ReactNode;
}

/** One limit as a row of ticks lit up to the share used, in the colour of its own level. */
function UsageMeter({ label, value, limit = 100, note, display, className, style, ...props }: UsageMeterProps) {
  const usage = useUsage('Usage.Meter');
  const formatter = useFormat();
  const slots = usageVariants();
  const ratio = Math.min(1, Math.max(0, value / Math.max(1, limit)));
  const level = levelOf(ratio, usage.state === 'idle' ? 'idle' : 'active', usage.warning, usage.critical);
  const lit = Math.round(ratio * 32);
  const shown = display ?? (limit === 100 ? `${Math.round(value)}%` : `${formatter.format(value)} / ${formatter.format(limit)}`);
  return (
    <div
      data-slot="usage-meter"
      data-level={level}
      className={slots.meter({ className })}
      style={{ ...toneStyle(level), ...style }}
      {...props}
    >
      <div className={slots.meterHead()}>
        <span className={slots.meterLabel()}>{label}</span>
        <span className={slots.meterValue()}>{shown}</span>
      </div>
      <div
        role="meter"
        aria-label={typeof label === 'string' ? label : undefined}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={value}
        className={slots.ticks()}
      >
        {Array.from({ length: 32 }, (_, index) => (
          <span
            key={index}
            className={slots.tick()}
            style={{
              background:
                index < lit ? 'var(--usage-tone)' : 'color-mix(in oklab, var(--muted-foreground) 18%, transparent)',
              transitionDelay: `${index * 12}ms`,
            }}
          />
        ))}
      </div>
      {note ? <span className={slots.meterNote()}>{note}</span> : null}
    </div>
  );
}
UsageMeter.displayName = 'Usage.Meter';

export interface UsageFooterProps extends ComponentProps<'div'> {}

/** A band at the foot of the popover, for a note and an action. */
function UsageFooter({ className, ...props }: UsageFooterProps) {
  return <div data-slot="usage-footer" className={usageVariants().footer({ className })} {...props} />;
}
UsageFooter.displayName = 'Usage.Footer';

export const Usage = Object.assign(UsageRoot, {
  Trigger: UsageTrigger,
  Content: UsageContent,
  Summary: UsageSummary,
  Breakdown: UsageBreakdown,
  Section: UsageSection,
  Meter: UsageMeter,
  Footer: UsageFooter,
});

export { UsageTrigger, UsageContent, UsageSummary, UsageBreakdown, UsageSection, UsageMeter, UsageFooter };
