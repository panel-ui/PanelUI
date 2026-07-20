/**
 * Timeline — a vertical sequence of events.
 *
 * Adapted from: origin-space/originui apps/origin/registry/default/ui/timeline.tsx
 * (the Item / Indicator / Separator / Header / Date / Title / Content anatomy
 * and the completed-up-to-active state rule), shaped to match this repo's
 * `Steps` component so the two read as siblings.
 *
 * Upstream drives styling through `data-*` attributes, which React Native has
 * no equivalent for; state is resolved in JS and passed through context into
 * `tv()` variants instead.
 *
 * Vertical only — a horizontal timeline gives each item roughly a fifth of a
 * phone's width, which is not enough for a date and a title.
 *
 * ```tsx
 * <Timeline variant="icon" value={2}>
 *   <Timeline.Item step={0} tone="info">
 *     <Timeline.Aside>
 *       <Timeline.Date>09:12</Timeline.Date>
 *       <Timeline.Label>Design</Timeline.Label>
 *     </Timeline.Aside>
 *     <Timeline.Indicator><SendIcon /></Timeline.Indicator>
 *     <Timeline.Content>
 *       <Timeline.Header>
 *         <Timeline.Title>Checkout language approved</Timeline.Title>
 *         <Timeline.Trailing>10:18</Timeline.Trailing>
 *       </Timeline.Header>
 *       <Timeline.Description>…</Timeline.Description>
 *     </Timeline.Content>
 *   </Timeline.Item>
 * </Timeline>
 * ```
 */
import {
  createContext,
  forwardRef,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { View, type Text as RNText, type ViewProps } from 'react-native';
import { tv } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { IconColorProvider } from '../../icons';
import { Text, type TextProps } from '../../primitives/text';

export type TimelineVariant = 'dot' | 'icon' | 'numbered' | 'card' | 'compact';
/** Semantic colour for a single event, independent of progress. */
export type TimelineTone = 'default' | 'info' | 'success' | 'warning' | 'danger';

/** Variants whose node is a filled disc rather than an outlined ring. */
const SOLID_VARIANTS: TimelineVariant[] = ['dot', 'card'];

const timelineVariants = tv({
  slots: {
    root: 'w-full flex-col',
    item: 'w-full flex-row gap-3',
    aside: 'w-20 items-end gap-0.5 pt-0.5',
    rail: 'items-center',
    // Flat discs, no ring — the same restraint Steps uses. Rings on every node
    // were most of what made the timeline read as noisy.
    indicator: 'items-center justify-center rounded-full',
    indicatorLabel: 'text-xs font-medium',
    separator: 'w-0.5 flex-1 rounded-full',
    body: 'flex-1 pb-6',
    panel: '',
    header: 'flex-row items-center gap-2',
    heading: 'flex-1 gap-0.5',
    date: 'text-xs font-medium text-muted-foreground',
    label: 'text-xs font-medium',
    meta: 'text-xs text-muted-foreground',
    title: 'text-sm font-medium text-foreground',
    trailing: 'text-xs text-muted-foreground',
    content: 'pt-1 text-sm text-muted-foreground',
    stats: 'mt-2 flex-row gap-6 rounded-xl border border-border px-3.5 py-2.5',
    statLabel: 'text-xs text-muted-foreground',
    statValue: 'text-sm font-medium text-foreground',
  },
  variants: {
    variant: {
      dot: { indicator: 'h-4 w-4' },
      icon: { indicator: 'h-8 w-8' },
      numbered: { indicator: 'h-7 w-7' },
      card: {
        indicator: 'h-4 w-4',
        // The gap stays on `body` so the connector runs through it; the card
        // chrome lives on an inner panel. Putting the border on `body` made
        // consecutive cards sit flush against each other.
        panel: 'rounded-xl border border-border bg-card p-3.5',
      },
      compact: {
        indicator: 'h-6 w-6',
        body: 'flex-1 pb-3',
        title: 'text-base',
      },
    },
    tone: {
      default: {},
      info: { label: 'text-info-foreground' },
      success: { label: 'text-success-foreground' },
      warning: { label: 'text-warning-foreground' },
      danger: { label: 'text-destructive-foreground' },
    },
    completed: {
      true: { separator: 'bg-primary' },
      false: { separator: 'bg-muted' },
    },
  },
  defaultVariants: {
    variant: 'dot',
    tone: 'default',
    completed: false,
  },
});

/*
 * Colour rule, matching the Steps component: progress is solid, event kind is
 * tinted.
 *
 * - untoned pending   → bg-muted        (Steps' inactive)
 * - untoned completed → bg-primary      (Steps' completed)
 * - toned             → bg-{tone}-soft, content in the tone's foreground
 *
 * The `-soft` fills are the same tinted tokens Alert uses, so a toned node sits
 * in the same family as the rest of the library instead of shouting in raw
 * brand colour.
 *
 * Nodes that hold something — an icon or a number — get a hairline so they read
 * as a container. The `dot` and `card` discs stay bare: at 16px an outline is
 * most of what made the original look busy. The border therefore lives on the
 * tone class rather than the shared `indicator` slot, so a solid disc cannot
 * pick one up by accident.
 */
const TONE_NODE: Record<TimelineTone, { solid: string; tinted: string }> = {
  default: { solid: 'bg-primary', tinted: 'border border-border bg-muted' },
  info: { solid: 'bg-info', tinted: 'border border-info/32 bg-info-soft' },
  success: { solid: 'bg-success', tinted: 'border border-success/32 bg-success-soft' },
  warning: { solid: 'bg-warning', tinted: 'border border-warning/32 bg-warning-soft' },
  danger: {
    solid: 'bg-destructive',
    tinted: 'border border-destructive/32 bg-destructive-soft',
  },
};

/**
 * The node an incomplete, untoned step gets — bordered when it holds an icon
 * or a number, bare when it is a status disc.
 */
const PENDING_NODE = {
  solid: 'bg-muted',
  tinted: 'border border-border bg-muted',
} as const;

/**
 * CSS variable a tinted node's contents take their colour from. The
 * `-foreground` tokens are the ones tuned to read in both light and dark,
 * which is what sits on a soft tint.
 */
const TONE_ICON_VAR: Record<TimelineTone, string> = {
  default: '--color-primary',
  info: '--color-info-foreground',
  success: '--color-success-foreground',
  warning: '--color-warning-foreground',
  danger: '--color-destructive-foreground',
};

interface TimelineContextValue {
  activeStep: number;
  variant: TimelineVariant;
}

interface TimelineItemContextValue {
  step: number;
  completed: boolean;
  tone: TimelineTone;
  /** False on the last item, so its rail does not trail into nothing. */
  showSeparator: boolean;
}

const TimelineContext = createContext<TimelineContextValue | null>(null);
const TimelineItemContext = createContext<TimelineItemContextValue | null>(null);

function useTimeline(component: string): TimelineContextValue {
  const context = useContext(TimelineContext);
  if (!context) throw new Error(`${component} must be used within a <Timeline>`);
  return context;
}

function useTimelineItem(component: string): TimelineItemContextValue {
  const context = useContext(TimelineItemContext);
  if (!context) throw new Error(`${component} must be used within a <Timeline.Item>`);
  return context;
}

export interface TimelineProps extends ViewProps {
  className?: string;
  /** Steps at or below this index render as completed. */
  value?: number;
  variant?: TimelineVariant;
  children?: ReactNode;
}

const TimelineRoot = forwardRef<View, TimelineProps>(
  ({ className, value = 0, variant = 'dot', children, ...props }, ref) => {
    const { root } = timelineVariants({ variant });
    const context = useMemo(() => ({ activeStep: value, variant }), [value, variant]);

    return (
      <TimelineContext.Provider value={context}>
        <View ref={ref} className={root({ className })} {...props}>
          {children}
        </View>
      </TimelineContext.Provider>
    );
  }
);
TimelineRoot.displayName = 'Timeline';

export interface TimelineItemProps extends ViewProps {
  className?: string;
  /** Position in the sequence, zero-based. */
  step: number;
  /** Force the completed state regardless of the timeline's value. */
  completed?: boolean;
  /** Colours the node and label — for event kind rather than progress. */
  tone?: TimelineTone;
  /** Set on the final item so its rail stops at the indicator. */
  last?: boolean;
  children?: ReactNode;
}

const TimelineItem = forwardRef<View, TimelineItemProps>(
  (
    { className, step, completed, tone = 'default', last = false, children, ...props },
    ref
  ) => {
    const { activeStep, variant } = useTimeline('Timeline.Item');
    const isCompleted = completed ?? step <= activeStep;
    const { item } = timelineVariants({ variant, tone, completed: isCompleted });

    const context = useMemo(
      () => ({ step, completed: isCompleted, tone, showSeparator: !last }),
      [step, isCompleted, tone, last]
    );

    return (
      <TimelineItemContext.Provider value={context}>
        <View ref={ref} className={item({ className })} {...props}>
          {children}
        </View>
      </TimelineItemContext.Provider>
    );
  }
);
TimelineItem.displayName = 'Timeline.Item';

/**
 * Right-aligned meta column to the left of the rail — a time, a category, a
 * person. Place it before `Timeline.Indicator`.
 */
const TimelineAside = forwardRef<View, ViewProps & { className?: string }>(
  ({ className, ...props }, ref) => {
    const { variant } = useTimeline('Timeline.Aside');
    const { aside } = timelineVariants({ variant });
    return <View ref={ref} className={aside({ className })} {...props} />;
  }
);
TimelineAside.displayName = 'Timeline.Aside';

export interface TimelineIndicatorProps extends ViewProps {
  className?: string;
  /** Replaces the default node contents — an icon, say. */
  children?: ReactNode;
}

/**
 * The node on the rail, with the connector running below it.
 *
 * Children are wrapped in an `IconColorProvider` carrying the colour that
 * reads against this node, so an icon inside follows the theme instead of
 * disappearing when the fill inverts.
 */
const TimelineIndicator = forwardRef<View, TimelineIndicatorProps>(
  ({ className, children, ...props }, ref) => {
    const { variant } = useTimeline('Timeline.Indicator');
    const { step, completed, tone, showSeparator } =
      useTimelineItem('Timeline.Indicator');
    const { rail, indicator, indicatorLabel, separator } = timelineVariants({
      variant,
      tone,
      completed,
    });

    // dot/card nodes are small discs with nothing inside, so they keep full
    // saturation — a soft tint at 16px would disappear. Nodes that hold an
    // icon or a number take the tinted fill instead.
    const isDisc = SOLID_VARIANTS.includes(variant);
    const toned = tone !== 'default';

    const fill = isDisc ? 'solid' : 'tinted';
    const nodeClass = toned
      ? TONE_NODE[tone][fill]
      : completed
        ? TONE_NODE.default.solid
        : PENDING_NODE[fill];

    // Contents sit on the tint (or on primary once complete), so they take the
    // colour tuned to read against it.
    const tintedContent = useCSSVariable(
      toned ? TONE_ICON_VAR[tone] : '--color-muted-foreground'
    );
    const solidContent = useCSSVariable('--color-primary-foreground');

    const resolved = (value: unknown) =>
      typeof value === 'string' ? value : undefined;

    const contentColor =
      !toned && completed ? resolved(solidContent) : resolved(tintedContent);

    return (
      <View className={rail()}>
        <IconColorProvider color={contentColor}>
          <View ref={ref} className={indicator({ className: `${nodeClass} ${className ?? ''}` })} {...props}>
            {variant === 'numbered' ? (
              <Text className={indicatorLabel()} style={{ color: contentColor }}>
                {step + 1}
              </Text>
            ) : variant === 'icon' || variant === 'compact' ? (
              children
            ) : null}
          </View>
        </IconColorProvider>
        {showSeparator ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className={separator()}
          />
        ) : null}
      </View>
    );
  }
);
TimelineIndicator.displayName = 'Timeline.Indicator';

/**
 * Everything to the right of the rail. Under `variant="card"` the children are
 * wrapped in the card panel, while the spacing between items stays outside it
 * so the connector runs unbroken.
 */
const TimelineContent = forwardRef<View, ViewProps & { className?: string }>(
  ({ className, children, ...props }, ref) => {
    const { variant } = useTimeline('Timeline.Content');
    const { completed, tone } = useTimelineItem('Timeline.Content');
    const { body, panel } = timelineVariants({ variant, tone, completed });

    return (
      <View ref={ref} className={body({ className })} {...props}>
        {variant === 'card' ? <View className={panel()}>{children}</View> : children}
      </View>
    );
  }
);
TimelineContent.displayName = 'Timeline.Content';

/** Title row: heading on the left, `Timeline.Trailing` on the right. */
const TimelineHeader = forwardRef<View, ViewProps & { className?: string }>(
  ({ className, ...props }, ref) => {
    const { variant } = useTimeline('Timeline.Header');
    const { header } = timelineVariants({ variant });
    return <View ref={ref} className={header({ className })} {...props} />;
  }
);
TimelineHeader.displayName = 'Timeline.Header';

/** Wraps a title and anything stacked under it inside the header row. */
const TimelineHeading = forwardRef<View, ViewProps & { className?: string }>(
  ({ className, ...props }, ref) => {
    const { variant } = useTimeline('Timeline.Heading');
    const { heading } = timelineVariants({ variant });
    return <View ref={ref} className={heading({ className })} {...props} />;
  }
);
TimelineHeading.displayName = 'Timeline.Heading';

const TimelineDate = forwardRef<RNText, TextProps>(({ className, ...props }, ref) => {
  const { variant } = useTimeline('Timeline.Date');
  const { date } = timelineVariants({ variant });
  return <Text ref={ref} className={date({ className })} {...props} />;
});
TimelineDate.displayName = 'Timeline.Date';

/** Category line in the aside, coloured by the item's tone. */
const TimelineLabel = forwardRef<RNText, TextProps>(({ className, ...props }, ref) => {
  const { variant } = useTimeline('Timeline.Label');
  const { tone } = useTimelineItem('Timeline.Label');
  const { label } = timelineVariants({ variant, tone });
  return <Text ref={ref} className={label({ className })} {...props} />;
});
TimelineLabel.displayName = 'Timeline.Label';

/** Muted supporting line — a person's name, a source. */
const TimelineMeta = forwardRef<RNText, TextProps>(({ className, ...props }, ref) => {
  const { variant } = useTimeline('Timeline.Meta');
  const { meta } = timelineVariants({ variant });
  return <Text ref={ref} className={meta({ className })} {...props} />;
});
TimelineMeta.displayName = 'Timeline.Meta';

const TimelineTitle = forwardRef<RNText, TextProps>(({ className, ...props }, ref) => {
  const { variant } = useTimeline('Timeline.Title');
  const { title } = timelineVariants({ variant });
  return <Text ref={ref} className={title({ className })} {...props} />;
});
TimelineTitle.displayName = 'Timeline.Title';

/** Right-hand slot in the header row — a timestamp, usually. */
const TimelineTrailing = forwardRef<RNText, TextProps>(
  ({ className, ...props }, ref) => {
    const { variant } = useTimeline('Timeline.Trailing');
    const { trailing } = timelineVariants({ variant });
    return <Text ref={ref} className={trailing({ className })} {...props} />;
  }
);
TimelineTrailing.displayName = 'Timeline.Trailing';

const TimelineDescription = forwardRef<RNText, TextProps>(
  ({ className, ...props }, ref) => {
    const { variant } = useTimeline('Timeline.Description');
    const { content } = timelineVariants({ variant });
    return <Text ref={ref} className={content({ className })} {...props} />;
  }
);
TimelineDescription.displayName = 'Timeline.Description';

/** Bordered strip of label/value pairs under a title. */
const TimelineStats = forwardRef<View, ViewProps & { className?: string }>(
  ({ className, ...props }, ref) => {
    const { variant } = useTimeline('Timeline.Stats');
    const { stats } = timelineVariants({ variant });
    return <View ref={ref} className={stats({ className })} {...props} />;
  }
);
TimelineStats.displayName = 'Timeline.Stats';

export interface TimelineStatProps extends ViewProps {
  className?: string;
  label: string;
  value: string;
}

const TimelineStat = forwardRef<View, TimelineStatProps>(
  ({ className, label, value, ...props }, ref) => {
    const { variant } = useTimeline('Timeline.Stat');
    const { statLabel, statValue } = timelineVariants({ variant });
    return (
      <View ref={ref} className={className} {...props}>
        <Text className={statLabel()}>{label}</Text>
        <Text className={statValue()}>{value}</Text>
      </View>
    );
  }
);
TimelineStat.displayName = 'Timeline.Stat';

export const Timeline = Object.assign(TimelineRoot, {
  Item: TimelineItem,
  Aside: TimelineAside,
  Indicator: TimelineIndicator,
  Content: TimelineContent,
  Header: TimelineHeader,
  Heading: TimelineHeading,
  Date: TimelineDate,
  Label: TimelineLabel,
  Meta: TimelineMeta,
  Title: TimelineTitle,
  Trailing: TimelineTrailing,
  Description: TimelineDescription,
  Stats: TimelineStats,
  Stat: TimelineStat,
});
