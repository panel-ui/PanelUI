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
 */
import {
  createContext,
  forwardRef,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { View, type Text as RNText, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { Text, type TextProps } from '../../primitives/text';

export type TimelineVariant = 'dot' | 'icon' | 'numbered' | 'card';

const timelineVariants = tv({
  slots: {
    root: 'w-full flex-col',
    item: 'w-full flex-row gap-3',
    rail: 'items-center',
    indicator: 'items-center justify-center rounded-full border-2',
    indicatorLabel: 'text-xs font-medium',
    separator: 'w-0.5 flex-1 rounded-full',
    body: 'flex-1 pb-6',
    header: 'gap-0.5',
    date: 'text-xs font-medium text-muted-foreground',
    title: 'text-sm font-medium text-foreground',
    content: 'text-sm text-muted-foreground',
  },
  variants: {
    variant: {
      dot: { indicator: 'h-4 w-4' },
      icon: { indicator: 'h-8 w-8' },
      numbered: { indicator: 'h-7 w-7' },
      card: {
        indicator: 'h-4 w-4',
        body: 'rounded-xl border border-border bg-card p-3.5',
      },
    },
    completed: {
      true: {
        indicator: 'border-primary bg-primary',
        indicatorLabel: 'text-primary-foreground',
        separator: 'bg-primary',
      },
      false: {
        indicator: 'border-muted bg-background',
        indicatorLabel: 'text-muted-foreground',
        separator: 'bg-muted',
      },
    },
  },
  defaultVariants: {
    variant: 'dot',
    completed: false,
  },
});

interface TimelineContextValue {
  activeStep: number;
  variant: TimelineVariant;
}

interface TimelineItemContextValue {
  step: number;
  completed: boolean;
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
  /** Set on the final item so its rail stops at the indicator. */
  last?: boolean;
  children?: ReactNode;
}

const TimelineItem = forwardRef<View, TimelineItemProps>(
  ({ className, step, completed, last = false, children, ...props }, ref) => {
    const { activeStep, variant } = useTimeline('Timeline.Item');
    const isCompleted = completed ?? step <= activeStep;
    const { item } = timelineVariants({ variant, completed: isCompleted });

    const context = useMemo(
      () => ({ step, completed: isCompleted, showSeparator: !last }),
      [step, isCompleted, last]
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

export interface TimelineIndicatorProps extends ViewProps {
  className?: string;
  /** Replaces the default node contents — an icon, say. */
  children?: ReactNode;
}

/**
 * The node on the rail, with the connector running below it. Renders the step
 * number under `variant="numbered"`, its children under `variant="icon"`, and
 * a bare dot otherwise.
 */
const TimelineIndicator = forwardRef<View, TimelineIndicatorProps>(
  ({ className, children, ...props }, ref) => {
    const { variant } = useTimeline('Timeline.Indicator');
    const { step, completed, showSeparator } = useTimelineItem('Timeline.Indicator');
    const { rail, indicator, indicatorLabel, separator } = timelineVariants({
      variant,
      completed,
    });

    return (
      <View className={rail()}>
        <View ref={ref} className={indicator({ className })} {...props}>
          {variant === 'numbered' ? (
            <Text className={indicatorLabel()}>{step + 1}</Text>
          ) : variant === 'icon' ? (
            children
          ) : null}
        </View>
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

/** Everything to the right of the rail. */
const TimelineContent = forwardRef<View, ViewProps & { className?: string }>(
  ({ className, ...props }, ref) => {
    const { variant } = useTimeline('Timeline.Content');
    const { completed } = useTimelineItem('Timeline.Content');
    const { body } = timelineVariants({ variant, completed });
    return <View ref={ref} className={body({ className })} {...props} />;
  }
);
TimelineContent.displayName = 'Timeline.Content';

const TimelineHeader = forwardRef<View, ViewProps & { className?: string }>(
  ({ className, ...props }, ref) => {
    const { variant } = useTimeline('Timeline.Header');
    const { header } = timelineVariants({ variant });
    return <View ref={ref} className={header({ className })} {...props} />;
  }
);
TimelineHeader.displayName = 'Timeline.Header';

const TimelineDate = forwardRef<RNText, TextProps>(({ className, ...props }, ref) => {
  const { variant } = useTimeline('Timeline.Date');
  const { date } = timelineVariants({ variant });
  return <Text ref={ref} className={date({ className })} {...props} />;
});
TimelineDate.displayName = 'Timeline.Date';

const TimelineTitle = forwardRef<RNText, TextProps>(({ className, ...props }, ref) => {
  const { variant } = useTimeline('Timeline.Title');
  const { title } = timelineVariants({ variant });
  return <Text ref={ref} className={title({ className })} {...props} />;
});
TimelineTitle.displayName = 'Timeline.Title';

const TimelineDescription = forwardRef<RNText, TextProps>(
  ({ className, ...props }, ref) => {
    const { variant } = useTimeline('Timeline.Description');
    const { content } = timelineVariants({ variant });
    return <Text ref={ref} className={content({ className })} {...props} />;
  }
);
TimelineDescription.displayName = 'Timeline.Description';

export const Timeline = Object.assign(TimelineRoot, {
  Item: TimelineItem,
  Indicator: TimelineIndicator,
  Content: TimelineContent,
  Header: TimelineHeader,
  Date: TimelineDate,
  Title: TimelineTitle,
  Description: TimelineDescription,
});

export type TimelineVariantProps = VariantProps<typeof timelineVariants>;
