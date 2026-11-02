/**
 * Kpi — one number, and what it is doing.
 *
 * A metric card is not a chart with a caption. The number is the message and
 * the chart is the footnote, so the parts here are sized and ordered around
 * that: a title that stays quiet, a value that does not, a trend that says
 * which way and by how much, and a sparkline that is allowed to be small
 * because nobody is reading values off it.
 *
 * ```tsx
 * <Kpi>
 *   <Kpi.Header>
 *     <Kpi.Title>Active users</Kpi.Title>
 *   </Kpi.Header>
 *   <Kpi.Content>
 *     <Kpi.Value>12,480</Kpi.Value>
 *     <Kpi.Trend value={12.4} />
 *   </Kpi.Content>
 *   <Kpi.Chart data={week} dataKey="v" />
 * </Kpi>
 * ```
 *
 * The trend is given a number rather than a written string, so the component
 * decides the direction and the colour rather than the call site remembering
 * to keep a minus sign and a red in step. Where a rise is the bad news —
 * churn, latency, cost — say so with `goodDirection="down"` and the colour
 * follows the meaning instead of the sign.
 */
import { createContext, forwardRef, useContext, useMemo, type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from '../../icons';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { type SeriesColorIndex } from '../../utils/chart';
import { LineChart, type LineChartDatum } from '../line-chart';
import { Progress } from '../progress';
import { Surface } from '../surface';
import type { ViewRef } from '../../primitives/refs';

/** Height of the sparkline when nothing else is said. */
const CHART_HEIGHT = 56;
/**
 * …and its box beside the number, which is fixed rather than shared out.
 *
 * A column of stat cards has labels of every length — "Revenue" over "New
 * customers" — and a chart taking whatever the text leaves would be a
 * different width on every card in the stack. Fixed, the shapes line up down
 * the right-hand edge and the eye can compare them, which is the only reason
 * they are there.
 */
const INLINE_CHART_WIDTH = 128;
const INLINE_CHART_HEIGHT = 56;
/** Width ÷ height of the sparkline in that box. */
const INLINE_ASPECT = 2.3;

/** The arrow in a trend badge. Small — it is a direction, not an icon. */
const TREND_ICON = 12;
const TREND_STROKE = 2.5;

const kpiVariants = tv({
  slots: {
    root: 'w-full gap-2',
    header: 'flex-row items-center gap-2',
    icon: 'h-8 w-8 items-center justify-center rounded-xl',
    title: 'text-sm font-medium text-muted-foreground',
    content: 'flex-row items-end justify-between gap-3',
    value: 'text-2xl font-bold text-foreground',
    /** The stacked title/value/trend block, tight enough to read as one thing. */
    stat: 'flex-1 gap-1',
    trend: 'flex-row items-center gap-1',
    trendLabel: 'font-medium',
    footer: 'flex-row items-center gap-2',
    separator: 'h-px w-full bg-border',
    group: 'w-full',
    groupSeparator: 'bg-border',
  },
  variants: {
    /**
     * Which way the number moved, *after* the metric's own polarity has been
     * applied — so `good` is green whether it went up or down.
     */
    tone: {
      good: { trendLabel: 'text-success', icon: 'bg-success-subtle' },
      bad: { trendLabel: 'text-destructive', icon: 'bg-destructive-subtle' },
      flat: { trendLabel: 'text-muted-foreground', icon: 'bg-muted' },
      neutral: { trendLabel: 'text-muted-foreground', icon: 'bg-secondary' },
    },
    /**
     * How the change is drawn.
     *
     * `text` is the quieter of the two and the default: a line of colour under
     * the number, which is where the eye already is. `badge` puts a pill round
     * it for a card dense enough that a bare line of colour gets lost.
     */
    trendVariant: {
      text: { trend: 'gap-0.5', trendLabel: 'text-sm' },
      badge: { trend: 'rounded-full px-2 py-0.5', trendLabel: 'text-xs' },
    },
    /** Where the chart sits relative to the number. */
    layout: {
      /** Under everything, full width. The chart is a footnote. */
      below: {},
      /**
       * Beside the number: the text takes the width and the chart takes a
       * fixed column on the end. The number is read first and the shape
       * second, which is the order they sit in — so this is the shape a stat
       * card wants, and `below` is for a chart big enough to be looked at.
       */
      inline: { content: 'items-center gap-4' },
    },
  },
  compoundVariants: [
    { trendVariant: 'badge', tone: 'good', class: { trend: 'bg-success-subtle' } },
    { trendVariant: 'badge', tone: 'bad', class: { trend: 'bg-destructive-subtle' } },
    { trendVariant: 'badge', tone: 'flat', class: { trend: 'bg-muted' } },
    { trendVariant: 'badge', tone: 'neutral', class: { trend: 'bg-muted' } },
  ],
  defaultVariants: {
    tone: 'neutral',
    trendVariant: 'text',
    layout: 'below',
  },
});

type KpiVariantProps = VariantProps<typeof kpiVariants>;

/** How a trend is coloured once the metric's polarity has been applied. */
export type KpiTone = NonNullable<KpiVariantProps['tone']>;

/** Which direction of movement is the good news for this metric. */
export type KpiGoodDirection = 'up' | 'down' | 'none';

interface KpiContextValue {
  colorIndex: SeriesColorIndex;
  goodDirection: KpiGoodDirection;
}

const KpiContext = createContext<KpiContextValue | null>(null);

/**
 * Whether the part rendering is inside `Kpi.Header`.
 *
 * `Title` is the only part that cares, and it cares a great deal. In a header
 * it is one of several things on a row and has to take the space between the
 * icon and the actions, so it grows. Written straight into the card it is one
 * of several things in a *column* — and a growing child of a column absorbs
 * the leftover height, which pushes the number under it down by however much
 * that card had spare. Three of those side by side is three numbers at three
 * different heights, which is exactly what a row of metrics must not be.
 */
const KpiHeaderContext = createContext(false);

/**
 * Whether the part rendering is inside `Kpi.Stat`.
 *
 * `Trend` is the one that cares. `self-center` on a flex child means "centre
 * on the cross axis", and the cross axis is not the same axis in the two
 * places a trend is put: in a row it is vertical, which is what a badge on the
 * end of a header wants, and in the stat column it is *horizontal* — which
 * indents the change by half whatever width it did not use, so two rows with
 * captions of different lengths start at two different places.
 */
const KpiStatContext = createContext(false);

function useKpi(part: string): KpiContextValue {
  const context = useContext(KpiContext);
  if (!context) throw new Error(`${part} must be used inside <Kpi>.`);
  return context;
}

/* ------------------------------------------------------------------ *
 * Root.
 * ------------------------------------------------------------------ */

export interface KpiProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /**
   * Which `--color-chart-*` token the sparkline and the icon take. Set on the
   * card rather than on the chart so a row of cards can be given five
   * different series colours without repeating the choice on every part.
   */
  colorIndex?: SeriesColorIndex;
  /**
   * Which way is the good news. `up` for revenue and signups, `down` for churn
   * and latency, `none` for a number that is neither — a headcount, a version.
   * Defaults to `up`.
   */
  goodDirection?: KpiGoodDirection;
  /** Draw the card on a surface. Turn off to place it in a shell of your own. */
  surface?: boolean;
  children: ReactNode;
}

const KpiRoot = forwardRef<ViewRef, KpiProps>(function KpiRoot(
  { className, colorIndex = 1, goodDirection = 'up', surface = true, children, ...props },
  ref
) {
  const { root } = kpiVariants();
  const context = useMemo(() => ({ colorIndex, goodDirection }), [colorIndex, goodDirection]);

  const body = (
    <View ref={surface ? undefined : ref} className={root({ className })} {...props}>
      {children}
    </View>
  );

  return (
    <KpiContext.Provider value={context}>
      {surface ? (
        <Surface ref={ref} variant="secondary" padding="lg" className="w-full">
          {body}
        </Surface>
      ) : (
        body
      )}
    </KpiContext.Provider>
  );
});

/* ------------------------------------------------------------------ *
 * Header, and the things that live in it.
 * ------------------------------------------------------------------ */

export interface KpiHeaderProps extends ViewProps {
  className?: string;
  children: ReactNode;
}

/** The top row: an icon, the metric's name, and anything acting on it. */
function KpiHeader({ className, children, ...props }: KpiHeaderProps) {
  const { header } = kpiVariants();
  return (
    <KpiHeaderContext.Provider value={true}>
      <View className={header({ className })} {...props}>
        {children}
      </View>
    </KpiHeaderContext.Provider>
  );
}

export interface KpiIconProps extends ViewProps {
  className?: string;
  /** Overrides the tint the card's `colorIndex` would give it. */
  tone?: KpiTone;
  children: ReactNode;
}

/**
 * A tinted square for a glyph.
 *
 * It takes the element rather than drawing one, because a metric's icon comes
 * from whatever set the app already uses — and an icon from outside this
 * library will not read an ambient colour, so pass it one.
 */
function KpiIcon({ className, tone = 'neutral', children, ...props }: KpiIconProps) {
  const { icon } = kpiVariants({ tone });
  return (
    <View className={icon({ className })} {...props}>
      {children}
    </View>
  );
}

export interface KpiTitleProps {
  className?: string;
  children: ReactNode;
}

/** The metric's name. Quiet on purpose — the value is the thing being read. */
function KpiTitle({ className, children }: KpiTitleProps) {
  const { title } = kpiVariants();
  // Grows across a header row; never down a column — see `KpiHeaderContext`.
  const inHeader = useContext(KpiHeaderContext);
  return (
    <Text className={title({ className: cn(inHeader && 'flex-1', className) })} numberOfLines={1}>
      {children}
    </Text>
  );
}

export interface KpiStatProps extends ViewProps {
  className?: string;
  children: ReactNode;
}

/**
 * The stacked title / value / change block.
 *
 * Its own container rather than three loose children of the card, because the
 * three belong together more tightly than they belong to whatever is above or
 * below them — 4pt between the lines of one fact, and the card's own spacing
 * between facts. It also takes the width in an `inline` row, leaving the chart
 * its column on the end.
 */
function KpiStat({ className, children, ...props }: KpiStatProps) {
  const { stat } = kpiVariants();
  return (
    <KpiStatContext.Provider value={true}>
      <View className={stat({ className })} {...props}>
        {children}
      </View>
    </KpiStatContext.Provider>
  );
}

export interface KpiActionsProps extends ViewProps {
  className?: string;
  children: ReactNode;
}

/** The trailing end of the header — a menu trigger, a filter, a link. */
function KpiActions({ className, children, ...props }: KpiActionsProps) {
  return (
    <View className={cn('flex-row items-center gap-1', className)} {...props}>
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * The number, and what it is doing.
 * ------------------------------------------------------------------ */

export interface KpiContentProps extends ViewProps {
  className?: string;
  /** `inline` puts the chart beside the value instead of under everything. */
  layout?: NonNullable<KpiVariantProps['layout']>;
  children: ReactNode;
}

/** The row the value and the trend share. */
function KpiContent({
  className,
  layout = 'below',
  children,
  ...props
}: KpiContentProps) {
  const { content } = kpiVariants({ layout });
  return (
    <View className={content({ className })} {...props}>
      {children}
    </View>
  );
}

export interface KpiValueProps {
  className?: string;
  children: ReactNode;
}

/**
 * The number.
 *
 * Formatted by the caller, not here: thousands separators, currency symbols
 * and units are locale decisions, and a component that guessed them would be
 * wrong in a way that is hard to notice and impossible to override.
 */
function KpiValue({ className, children }: KpiValueProps) {
  const { value } = kpiVariants();
  return (
    <Text className={value({ className })} numberOfLines={1}>
      {children}
    </Text>
  );
}

export interface KpiTrendProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /**
   * How much it moved, as a percentage. The sign carries the direction, so
   * `-4.2` is a fall of 4.2%; there is no separate direction prop to keep in
   * step with it.
   */
  value: number;
  /**
   * Writes the number yourself. Receives the raw value, sign and all. The
   * default prints one decimal place with an explicit `+` or `−`.
   */
  format?: (value: number) => string;
  /** Overrides the card's own `goodDirection` for this one figure. */
  goodDirection?: KpiGoodDirection;
  /**
   * `text` is a line of colour under the number — the default, and what a
   * stat card usually wants. `badge` puts a pill round it, with an arrow, for
   * a card busy enough that a bare line of colour is lost in it.
   */
  variant?: NonNullable<KpiVariantProps['trendVariant']>;
  /** What it is being compared against — "last 30d", "vs last week". */
  caption?: string;
  /** Anything after the number, when a caption is not enough. */
  children?: ReactNode;
  /** Below which a movement counts as no movement. Defaults to `0`. */
  threshold?: number;
}

/**
 * The change.
 *
 * Colour comes from what the movement *means*, not from its sign: a fall in
 * churn is good news and is drawn as good news. That is the whole reason this
 * takes a number rather than a string — a caller writing "−4.2%" into a green
 * label has to remember to change the colour when the metric changes, and
 * nobody does.
 */
function KpiTrend({
  className,
  value,
  format,
  goodDirection,
  variant = 'text',
  caption,
  threshold = 0,
  children,
  ...props
}: KpiTrendProps) {
  const context = useKpi('Kpi.Trend');
  const polarity = goodDirection ?? context.goodDirection;

  const flat = Math.abs(value) <= threshold;
  const rising = value > 0;
  const tone: KpiTone = flat
    ? 'flat'
    : polarity === 'none'
      ? 'neutral'
      : (rising && polarity === 'up') || (!rising && polarity === 'down')
        ? 'good'
        : 'bad';

  // Down a column it starts at the leading edge, level with the title and the
  // number above it; across a row it centres against them — see `KpiStatContext`.
  const inStat = useContext(KpiStatContext);
  const { trend, trendLabel } = kpiVariants({ tone, trendVariant: variant });

  // The arrow's colour, resolved so it matches the label beside it. An icon
  // from outside this library does not inherit a text colour.
  const goodTint = useCSSVariable('--color-success');
  const badTint = useCSSVariable('--color-destructive');
  const mutedTint = useCSSVariable('--color-muted-foreground');
  const raw = tone === 'good' ? goodTint : tone === 'bad' ? badTint : mutedTint;
  const tint = typeof raw === 'string' ? raw : '#737373';

  const Arrow = flat ? MinusIcon : rising ? ArrowUpIcon : ArrowDownIcon;

  const label = format
    ? format(value)
    : // A true minus sign rather than a hyphen: at this size a hyphen reads as
      // a dash between two words, and the sign is half the meaning.
      `${rising ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(1)}%`;

  return (
    <View
      className={trend({ className: cn(inStat ? 'self-start' : 'self-center', className) })}
      accessible
      accessibilityLabel={`${flat ? 'No change' : rising ? 'Up' : 'Down'} ${Math.abs(
        value
      ).toFixed(1)} percent${caption ? `, ${caption}` : ''}`}
      {...props}
    >
      {/* No arrow in `text`: the sign is already in front of the number, and
          drawing both says the same thing twice in the same three points. */}
      {variant === 'badge' ? (
        <Arrow size={TREND_ICON} strokeWidth={TREND_STROKE} color={tint} />
      ) : null}
      <Text className={trendLabel()}>
        {label}
        {/* One Text, not two: a caption in its own element wraps onto its own
            line the moment the card gets narrow, which reads as a second fact
            rather than the rest of this one. */}
        {caption ? <Text className="text-muted-foreground"> {caption}</Text> : null}
      </Text>
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * The chart, and the bar.
 * ------------------------------------------------------------------ */

export interface KpiSparklineProps {
  className?: string;
  /** The rows. One point each, in order. */
  data: LineChartDatum[];
  /** Key holding the y values. */
  dataKey: string;
  /** Overrides the card's `colorIndex`. */
  colorIndex?: SeriesColorIndex;
  /**
   * Fill under the line. Off beside the number, where the chart is a gesture
   * and a fill would make it a second block competing with the value; on when
   * it has the full width under everything and is being looked at properly.
   */
  filled?: boolean;
  /** Height in points. */
  height?: number;
  /**
   * Put it beside the number, taking whatever width the text leaves rather
   * than a column of its own. Pair with `layout="inline"` on the content row.
   */
  inline?: boolean;
  strokeWidth?: number;
}

/**
 * The sparkline.
 *
 * A line chart with the axis padding dropped, which is what `compact` on the
 * chart itself means — there is no grid, no axis and no crosshair here, so
 * every point of padding is a point the shape is not using. Nobody reads a
 * value off one of these; they read whether it is going up.
 */
function KpiSparkline({
  className,
  data,
  dataKey,
  colorIndex,
  filled,
  height,
  inline = false,
  strokeWidth = 2,
}: KpiSparklineProps) {
  const context = useKpi('Kpi.Chart');
  const index = colorIndex ?? context.colorIndex;
  const fill = filled ?? !inline;

  return (
    <View
      className={cn(inline ? '' : 'w-full', className)}
      style={
        inline
          ? { width: INLINE_CHART_WIDTH, height: height ?? INLINE_CHART_HEIGHT }
          : { height: height ?? CHART_HEIGHT }
      }
    >
      <LineChart data={data} compact aspectRatio={inline ? INLINE_ASPECT : 4}>
        {fill ? <LineChart.Area dataKey={dataKey} colorIndex={index} /> : null}
        <LineChart.Line dataKey={dataKey} colorIndex={index} strokeWidth={strokeWidth} />
      </LineChart>
    </View>
  );
}

export interface KpiProgressProps {
  className?: string;
  /** Where it has got to. */
  value: number;
  /** The value at which the bar reads as full. Defaults to `100`. */
  maxValue?: number;
  /** A caption above the bar. */
  label?: string;
  /** Print the percentage on the right of the caption row. */
  showValueLabel?: boolean;
}

/** Progress towards a target, for a metric that has one. */
function KpiProgressBar({
  className,
  value,
  maxValue = 100,
  label,
  showValueLabel,
}: KpiProgressProps) {
  return (
    <Progress
      className={className}
      value={value}
      maxValue={maxValue}
      label={label}
      showValueLabel={showValueLabel}
      size="sm"
    />
  );
}

/* ------------------------------------------------------------------ *
 * Footer and separator.
 * ------------------------------------------------------------------ */

export interface KpiFooterProps extends ViewProps {
  className?: string;
  children: ReactNode;
}

/** The bottom strip — a comparison period, a caveat, a link. */
function KpiFooter({ className, children, ...props }: KpiFooterProps) {
  const { footer } = kpiVariants();
  return (
    <View className={footer({ className })} {...props}>
      {children}
    </View>
  );
}

export interface KpiSeparatorProps extends ViewProps {
  className?: string;
}

/** A hairline across the card. */
function KpiSeparator({ className, ...props }: KpiSeparatorProps) {
  const { separator } = kpiVariants();
  return <View className={separator({ className })} {...props} />;
}

/* ------------------------------------------------------------------ *
 * Group.
 * ------------------------------------------------------------------ */

export type KpiGroupOrientation = 'horizontal' | 'vertical';

export interface KpiGroupProps extends ViewProps {
  className?: string;
  /** `horizontal` splits the row between the cards; `vertical` stacks them. */
  orientation?: KpiGroupOrientation;
  /**
   * Draw a hairline between the cards rather than spacing them apart. Several
   * metrics separated by a rule read as one panel; several spaced apart read
   * as several panels that happen to be adjacent.
   */
  separated?: boolean;
  children: ReactNode;
}

/**
 * Several metrics, laid out as one panel.
 *
 * The separators are inserted between the children rather than written by the
 * caller, because "between" is the one thing a list of siblings cannot express
 * — a trailing rule after the last card is the mistake this exists to prevent.
 */
const KpiGroup = forwardRef<ViewRef, KpiGroupProps>(function KpiGroup(
  { className, orientation = 'horizontal', separated = true, children, ...props },
  ref
) {
  const { group, groupSeparator } = kpiVariants();
  const horizontal = orientation === 'horizontal';

  const items = Array.isArray(children) ? children.flat() : [children];
  const visible = items.filter(Boolean);

  return (
    <View
      ref={ref}
      className={cn(
        group(),
        horizontal ? 'flex-row items-stretch' : 'flex-col',
        separated ? '' : 'gap-3',
        className
      )}
      {...props}
    >
      {visible.map((child, index) => (
        <View
          key={index}
          className={cn(
            horizontal ? 'flex-1' : 'w-full',
            // The padding is on the children rather than the rule, so the rule
            // reaches the full height or width of the panel.
            separated && horizontal && index > 0 && 'ps-4',
            separated && horizontal && index < visible.length - 1 && 'pe-4',
            separated && !horizontal && index > 0 && 'pt-4',
            separated && !horizontal && index < visible.length - 1 && 'pb-4'
          )}
        >
          {separated && index > 0 ? (
            <View
              className={cn(
                groupSeparator(),
                // Absolute on both axes, and on the *edge* of the padded box.
                // In normal flow the rule lands after this cell's leading
                // padding rather than on the boundary, which reads as a gap
                // above the rule and none below it.
                horizontal
                  ? 'absolute bottom-0 start-0 top-0 w-px'
                  : 'absolute end-0 start-0 top-0 h-px'
              )}
              // A rule between panels is decoration; announcing it puts an
              // unlabelled stop between two metrics.
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          ) : null}
          {child}
        </View>
      ))}
    </View>
  );
});

KpiRoot.displayName = 'Kpi';
KpiHeader.displayName = 'Kpi.Header';
KpiIcon.displayName = 'Kpi.Icon';
KpiTitle.displayName = 'Kpi.Title';
KpiStat.displayName = 'Kpi.Stat';
KpiActions.displayName = 'Kpi.Actions';
KpiContent.displayName = 'Kpi.Content';
KpiValue.displayName = 'Kpi.Value';
KpiTrend.displayName = 'Kpi.Trend';
KpiSparkline.displayName = 'Kpi.Chart';
KpiProgressBar.displayName = 'Kpi.Progress';
KpiFooter.displayName = 'Kpi.Footer';
KpiSeparator.displayName = 'Kpi.Separator';
KpiGroup.displayName = 'Kpi.Group';

export const Kpi = Object.assign(KpiRoot, {
  Header: KpiHeader,
  Icon: KpiIcon,
  Title: KpiTitle,
  Stat: KpiStat,
  Actions: KpiActions,
  Content: KpiContent,
  Value: KpiValue,
  Trend: KpiTrend,
  Chart: KpiSparkline,
  Progress: KpiProgressBar,
  Footer: KpiFooter,
  Separator: KpiSeparator,
  Group: KpiGroup,
});
