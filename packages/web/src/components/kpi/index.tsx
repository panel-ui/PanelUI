'use client';

/**
 * Kpi — one number, and what it is doing.
 *
 * ```tsx
 * <Kpi>
 *   <Kpi.Header>
 *     <Kpi.Title>Subscribers</Kpi.Title>
 *   </Kpi.Header>
 *   <Kpi.Content>
 *     <Kpi.Value>18,240</Kpi.Value>
 *     <Kpi.Trend value={6.4} />
 *   </Kpi.Content>
 *   <Kpi.Chart data={month} />
 * </Kpi>
 * ```
 *
 * ## The number is the message
 *
 * A metric card is not a chart with a caption. The parts are sized and ordered
 * round the number: a title that stays quiet, a value that does not, a trend
 * that says which way and by how much, and a sparkline that is allowed to be
 * small because nobody reads values off it.
 *
 * ## The trend is given a number
 *
 * `Kpi.Trend` takes the change as a number and decides the sign and the colour
 * itself, so a minus sign and a red cannot fall out of step at the call site.
 * Where a rise is the bad news, such as churn, latency or cost, say so with
 * `goodDirection="down"` and the colour follows the meaning and not the sign.
 *
 * ## The same parts as the app
 *
 * The parts and their names are the app library's Kpi, so a metric written for
 * one reads the same in the other. Two things differ because the platform
 * does: the chart takes a plain list of numbers, and colours are named by the
 * theme's roles as everywhere in this collection.
 *
 * ## Not a client module
 *
 * It holds no state and handles no events, so there is no `'use client'` at
 * the top. A Server Component can render it, dotted parts and all, and it
 * adds nothing to the JavaScript a page sends.
 */
import type { ComponentProps, ReactNode } from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

/** Which of the theme's roles a chart or a bar is drawn in. */
export type KpiColor = 'primary' | 'info' | 'success' | 'warning' | 'destructive';

/** Which direction of movement is the good news for this metric. */
export type KpiGoodDirection = 'up' | 'down' | 'none';

/** How a part is coloured once the metric's polarity has been applied. */
export type KpiTone = 'good' | 'bad' | 'flat' | 'neutral';

const kpiVariants = tv({
  slots: {
    root: 'flex w-full flex-col gap-2 text-foreground',
    // A title in a header takes the room between the icon and the actions.
    header: 'flex items-center gap-2 [&>[data-kpi-title]]:flex-1',
    icon: 'flex size-8 shrink-0 items-center justify-center rounded-xl [&_svg]:size-4',
    title: 'min-w-0 truncate text-sm font-medium text-muted-foreground',
    actions: 'ms-auto flex shrink-0 items-center gap-2',
    content: 'flex items-end justify-between gap-3',
    // The stacked title, value and trend, tight enough to read as one thing.
    stat: 'flex min-w-0 flex-1 flex-col items-start gap-1',
    value: 'text-2xl font-bold tabular-nums tracking-tight text-foreground',
    trend: 'inline-flex shrink-0 items-center gap-1 font-medium',
    caption: 'font-normal text-muted-foreground',
    chart: 'block w-full overflow-visible',
    progress: 'flex w-full flex-col gap-2',
    progressHeader: 'flex items-baseline justify-between gap-3 text-sm',
    progressTrack: 'h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--pu-color)_16%,transparent)]',
    progressFill: 'h-full rounded-full bg-[var(--pu-color)]',
    footer: 'flex items-center gap-2 text-sm text-muted-foreground',
    separator: 'h-px w-full shrink-0 bg-border',
    group: 'flex w-full divide-border',
  },
  variants: {
    surface: {
      true: {
        root: 'rounded-3xl border bg-card p-5 text-card-foreground',
        group: 'rounded-3xl border bg-card p-5 text-card-foreground',
      },
    },
    color: {
      primary: { chart: '[--pu-color:var(--primary)]', progress: '[--pu-color:var(--primary)]' },
      info: { chart: '[--pu-color:var(--info)]', progress: '[--pu-color:var(--info)]' },
      success: { chart: '[--pu-color:var(--success)]', progress: '[--pu-color:var(--success)]' },
      warning: { chart: '[--pu-color:var(--warning)]', progress: '[--pu-color:var(--warning)]' },
      destructive: {
        chart: '[--pu-color:var(--destructive)]',
        progress: '[--pu-color:var(--destructive)]',
      },
    },
    /** Which way the number moved, after the metric's own polarity. */
    tone: {
      good: {
        trend: 'text-[var(--success)]',
        icon: 'bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[var(--success)]',
      },
      bad: {
        trend: 'text-destructive',
        icon: 'bg-[color-mix(in_oklab,var(--destructive)_14%,transparent)] text-destructive',
      },
      flat: { trend: 'text-muted-foreground', icon: 'bg-muted text-muted-foreground' },
      neutral: { trend: 'text-muted-foreground', icon: 'bg-secondary text-muted-foreground' },
    },
    /*
     * `text` is the quieter of the two and the default: a line of colour under
     * the number, which is where the eye already is. `badge` puts a pill round
     * it for a card dense enough that a bare line of colour gets lost.
     */
    trendVariant: {
      text: { trend: 'text-sm' },
      badge: { trend: 'rounded-full px-2 py-0.5 text-xs' },
    },
    /** Where the chart sits relative to the number. */
    layout: {
      below: {},
      // Beside the number: the text takes the width and the chart a fixed
      // box on the end, so charts line up down a column of cards.
      inline: { content: 'items-center gap-4' },
    },
    orientation: {
      // The padding is on the children and not the rule, so the rule reaches
      // the full height or width of the panel.
      horizontal: {
        group: 'flex-row items-stretch divide-x *:min-w-0 *:flex-1 *:px-4 *:first:ps-0 *:last:pe-0',
      },
      vertical: { group: 'flex-col divide-y *:py-4 *:first:pt-0 *:last:pb-0' },
    },
  },
  compoundVariants: [
    {
      trendVariant: 'badge',
      tone: 'good',
      class: { trend: 'bg-[color-mix(in_oklab,var(--success)_14%,transparent)]' },
    },
    {
      trendVariant: 'badge',
      tone: 'bad',
      class: { trend: 'bg-[color-mix(in_oklab,var(--destructive)_14%,transparent)]' },
    },
    { trendVariant: 'badge', tone: 'flat', class: { trend: 'bg-muted' } },
    { trendVariant: 'badge', tone: 'neutral', class: { trend: 'bg-muted' } },
  ],
  defaultVariants: { tone: 'neutral', trendVariant: 'text', layout: 'below', color: 'primary' },
});

export interface KpiProps extends ComponentProps<'div'> {
  /** Draws the metric as a card of its own. Leave it off inside a frame or a group. */
  surface?: boolean;
}

function KpiRoot({ surface = false, className, render, ...props }: KpiProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ className: kpiVariants({ surface }).root({ className }) }, props),
  });
}
KpiRoot.displayName = 'Kpi';

export interface KpiHeaderProps extends ComponentProps<'div'> {}

/** The row over the number: an icon, the title, and anything at the end. */
function KpiHeader({ className, render, ...props }: KpiHeaderProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ className: kpiVariants().header({ className }) }, props),
  });
}
KpiHeader.displayName = 'Kpi.Header';

export interface KpiIconProps extends ComponentProps<'span'> {
  /** How the tile is coloured: by good or bad news, or left neutral. */
  tone?: KpiTone;
}

/** A small tile for an icon, at the start of the header. */
function KpiIcon({ tone = 'neutral', className, render, ...props }: KpiIconProps & RenderProp<'span'>) {
  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps({ 'aria-hidden': 'true', className: kpiVariants({ tone }).icon({ className }) }, props),
  });
}
KpiIcon.displayName = 'Kpi.Icon';

export interface KpiTitleProps extends ComponentProps<'div'> {}

/** What the number measures. */
function KpiTitle({ className, render, ...props }: KpiTitleProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-kpi-title': '', className: kpiVariants().title({ className }) }, props),
  });
}
KpiTitle.displayName = 'Kpi.Title';

export interface KpiActionsProps extends ComponentProps<'div'> {}

/** Whatever belongs at the end of the header: a period, a badge, a button. */
function KpiActions({ className, render, ...props }: KpiActionsProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ className: kpiVariants().actions({ className }) }, props),
  });
}
KpiActions.displayName = 'Kpi.Actions';

export interface KpiContentProps extends ComponentProps<'div'> {
  /** `inline` puts a chart beside the number in a fixed box; `below` leaves it under everything. */
  layout?: 'below' | 'inline';
}

/** The row the number is in, with a trend or a chart at its other end. */
function KpiContent({ layout = 'below', className, render, ...props }: KpiContentProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ className: kpiVariants({ layout }).content({ className }) }, props),
  });
}
KpiContent.displayName = 'Kpi.Content';

export interface KpiStatProps extends ComponentProps<'div'> {}

/** Title, value and trend stacked as one block, for a row with a chart beside it. */
function KpiStat({ className, render, ...props }: KpiStatProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ className: kpiVariants().stat({ className }) }, props),
  });
}
KpiStat.displayName = 'Kpi.Stat';

export interface KpiValueProps extends ComponentProps<'div'> {}

/** The number. */
function KpiValue({ className, render, ...props }: KpiValueProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ className: kpiVariants().value({ className }) }, props),
  });
}
KpiValue.displayName = 'Kpi.Value';

export interface KpiTrendProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** The change. Its sign decides the direction. */
  value: number;
  /** Writes the change. Defaults to a signed percentage with one decimal: "+7.8%". */
  format?: (value: number) => string;
  /** Which direction is the good news. `down` for churn, latency, cost; `none` for no colour. */
  goodDirection?: KpiGoodDirection;
  /** `text` is a line of colour; `badge` puts a pill and an arrow round it. */
  variant?: 'text' | 'badge';
  /** Quiet words after the change: "this month". */
  caption?: string;
  /** A change this small or smaller is drawn as no change. */
  threshold?: number;
}

/**
 * The change. Colour comes from what the movement means, not from its sign: a
 * fall in churn is good news and is drawn as good news.
 */
function KpiTrend({
  value,
  format,
  goodDirection = 'up',
  variant = 'text',
  caption,
  threshold = 0,
  className,
  render,
  ...props
}: KpiTrendProps & RenderProp<'span'>) {
  const flat = Math.abs(value) <= threshold;
  const rising = value > 0;
  const tone: KpiTone = flat
    ? 'flat'
    : goodDirection === 'none'
      ? 'neutral'
      : (rising && goodDirection === 'up') || (!rising && goodDirection === 'down')
        ? 'good'
        : 'bad';
  const slots = kpiVariants({ tone, trendVariant: variant });

  const label = format
    ? format(value)
    : // A true minus sign and not a hyphen: at this size a hyphen reads as a
      // dash between two words, and the sign is half the meaning.
      `${rising ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(1)}%`;
  const spoken = `${flat ? 'No change' : rising ? 'Up' : 'Down'} ${Math.abs(value).toFixed(1)} percent${caption ? `, ${caption}` : ''}`;

  return useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps(
      {
        role: 'img',
        'aria-label': spoken,
        className: slots.trend({ className }),
        children: (
          <>
            {/* No arrow in `text`: the sign is already in front of the number. */}
            {variant === 'badge' ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3"
              >
                {flat ? (
                  <path d="M5 12h14" />
                ) : rising ? (
                  <path d="M12 19V5M5 12l7-7 7 7" />
                ) : (
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                )}
              </svg>
            ) : null}
            <span aria-hidden="true">
              {label}
              {caption ? <span className={slots.caption()}> {caption}</span> : null}
            </span>
          </>
        ),
      },
      props
    ),
  });
}
KpiTrend.displayName = 'Kpi.Trend';

export interface KpiChartProps extends Omit<ComponentProps<'svg'>, 'children' | 'color'> {
  /** The values, oldest first. */
  data: number[];
  /** Which of the theme's roles the line is drawn in. */
  color?: KpiColor;
  /** Fills under the line with a wash of the same colour. */
  filled?: boolean;
  /** How tall the chart is, in pixels. */
  height?: number;
  /**
   * A fixed box for the end of a `layout="inline"` row. Charts beside numbers
   * of different lengths are then all one width, and line up down a column.
   */
  inline?: boolean;
  /** How thick the line is, in pixels. */
  strokeWidth?: number;
}

/** The box an inline chart is given, in pixels. */
const INLINE_WIDTH = 128;
const INLINE_HEIGHT = 56;
/** The grid the line is drawn on. It is stretched to whatever size the chart is. */
const GRID_WIDTH = 100;
const GRID_HEIGHT = 40;

const round = (value: number) => Number(value.toFixed(2));

/** A smooth line through the points, as a path. */
function linePath(points: [number, number][]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  if (!first) return '';
  let path = `M${round(first[0])} ${round(first[1])}`;
  rest.forEach((point, index) => {
    const before = points[index] ?? point;
    // Control points a third of the way along, level with each end, which
    // rounds the corners without the line ever overshooting a value.
    const reach = (point[0] - before[0]) / 3;
    path += ` C${round(before[0] + reach)} ${round(before[1])} ${round(point[0] - reach)} ${round(point[1])} ${round(point[0])} ${round(point[1])}`;
  });
  return path;
}

/** The sparkline: the shape of the number over time, with no axis and no values. */
function KpiChart({
  data,
  color = 'primary',
  filled = false,
  height,
  inline = false,
  strokeWidth = 2,
  className,
  style,
  render,
  ...props
}: KpiChartProps & RenderProp<'svg'>) {
  const slots = kpiVariants({ color });
  const low = Math.min(...data);
  const high = Math.max(...data);
  const span = high - low || 1;
  // A little room top and bottom, so the line's own thickness is not cut off
  // at its highest and lowest values.
  const pad = 3;
  const points: [number, number][] = data.map((value, index) => [
    data.length === 1 ? GRID_WIDTH / 2 : (index / (data.length - 1)) * GRID_WIDTH,
    pad + (1 - (value - low) / span) * (GRID_HEIGHT - pad * 2),
  ]);
  const line = linePath(points);

  return useRender({
    defaultTagName: 'svg',
    render,
    props: mergeProps(
      {
        role: 'img',
        'aria-label': 'Trend',
        viewBox: `0 0 ${GRID_WIDTH} ${GRID_HEIGHT}`,
        preserveAspectRatio: 'none',
        className: slots.chart({ className }),
        style: {
          height: height ?? (inline ? INLINE_HEIGHT : 56),
          ...(inline ? { width: INLINE_WIDTH, flex: 'none' } : null),
          ...style,
        },
        children: (
          <>
            {filled && line ? (
              <path
                d={`${line} L${GRID_WIDTH} ${GRID_HEIGHT} L0 ${GRID_HEIGHT} Z`}
                fill="var(--pu-color)"
                opacity="0.12"
              />
            ) : null}
            <path
              d={line}
              fill="none"
              stroke="var(--pu-color)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              // The grid is stretched to the chart's size. Without this the line
              // would be stretched with it, thick across and thin up and down.
              vectorEffect="non-scaling-stroke"
            />
          </>
        ),
      },
      props
    ),
  });
}
KpiChart.displayName = 'Kpi.Chart';

export interface KpiProgressProps extends Omit<ComponentProps<'div'>, 'children' | 'color'> {
  /** How far along. */
  value: number;
  /** What `value` is out of. */
  maxValue?: number;
  /** Words at the start of the row over the bar: "of 5,000". */
  label?: ReactNode;
  /** Writes the percentage at the end of the row over the bar. */
  showValueLabel?: boolean;
  /** Which of the theme's roles the bar is drawn in. */
  color?: KpiColor;
}

/** Progress towards a target, under the number. */
function KpiProgress({
  value,
  maxValue = 100,
  label,
  showValueLabel = false,
  color = 'primary',
  className,
  render,
  ...props
}: KpiProgressProps & RenderProp<'div'>) {
  const slots = kpiVariants({ color });
  const share = Math.min(1, Math.max(0, maxValue === 0 ? 0 : value / maxValue));
  const percent = Math.round(share * 100);
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        className: slots.progress({ className }),
        children: (
          <>
            {label !== undefined || showValueLabel ? (
              <div className={slots.progressHeader()}>
                <span className="font-medium">{label}</span>
                {showValueLabel ? <span className="text-muted-foreground">{percent}%</span> : null}
              </div>
            ) : null}
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={maxValue}
              aria-valuenow={value}
              aria-label={typeof label === 'string' ? label : 'Progress'}
              className={slots.progressTrack()}
            >
              <div className={slots.progressFill()} style={{ width: `${percent}%` }} />
            </div>
          </>
        ),
      },
      props
    ),
  });
}
KpiProgress.displayName = 'Kpi.Progress';

export interface KpiFooterProps extends ComponentProps<'div'> {}

/** A quiet line under everything: when it was measured, how long is left. */
function KpiFooter({ className, render, ...props }: KpiFooterProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ className: kpiVariants().footer({ className }) }, props),
  });
}
KpiFooter.displayName = 'Kpi.Footer';

export interface KpiSeparatorProps extends ComponentProps<'div'> {}

/** A rule between two parts of one card. */
function KpiSeparator({ className, render, ...props }: KpiSeparatorProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ role: 'separator', className: kpiVariants().separator({ className }) }, props),
  });
}
KpiSeparator.displayName = 'Kpi.Separator';

export interface KpiGroupProps extends ComponentProps<'div'> {
  /** Side by side with upright rules, or stacked with level ones. */
  orientation?: 'horizontal' | 'vertical';
  /** Draws the group as a card of its own, for a group not already inside one. */
  surface?: boolean;
}

/** Several metrics as one panel, with a rule between each and the next. */
function KpiGroup({
  orientation = 'horizontal',
  surface = false,
  className,
  render,
  ...props
}: KpiGroupProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ className: kpiVariants({ orientation, surface }).group({ className }) }, props),
  });
}
KpiGroup.displayName = 'Kpi.Group';

export const Kpi = Object.assign(KpiRoot, {
  Header: KpiHeader,
  Icon: KpiIcon,
  Title: KpiTitle,
  Actions: KpiActions,
  Content: KpiContent,
  Stat: KpiStat,
  Value: KpiValue,
  Trend: KpiTrend,
  Chart: KpiChart,
  Progress: KpiProgress,
  Footer: KpiFooter,
  Separator: KpiSeparator,
  Group: KpiGroup,
});

export {
  KpiHeader,
  KpiIcon,
  KpiTitle,
  KpiActions,
  KpiContent,
  KpiStat,
  KpiValue,
  KpiTrend,
  KpiChart,
  KpiProgress,
  KpiFooter,
  KpiSeparator,
  KpiGroup,
};
