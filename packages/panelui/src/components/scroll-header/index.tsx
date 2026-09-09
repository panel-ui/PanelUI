/**
 * ScrollHeader — a screen header that hands over to a compact bar as the page
 * scrolls.
 *
 * A screen with a title has two states and every app draws both: the title
 * large, at rest, with room around it, and the title small, pinned, once you
 * are reading. Hand-rolling the change between them is where screens stop
 * matching each other — one snaps, one crossfades at a different point, one
 * forgets the bar is over a safe area — so the two states and the transit
 * between them are one component here.
 *
 * ```tsx
 * <ScrollHeader className="flex-1">
 *   <ScrollHeader.Bar>
 *     <ScrollHeader.Title>Library</ScrollHeader.Title>
 *     <ScrollHeader.Actions>
 *       <Button variant="ghost" size="icon"><SearchIcon size={18} /></Button>
 *     </ScrollHeader.Actions>
 *   </ScrollHeader.Bar>
 *   <ScrollHeader.Large>
 *     <ScrollHeader.Title>Library</ScrollHeader.Title>
 *     <ScrollHeader.Description>128 components</ScrollHeader.Description>
 *   </ScrollHeader.Large>
 *   <ScrollView>{rows}</ScrollView>
 * </ScrollHeader>
 * ```
 *
 * ## The band collapses; nothing inside it is animated up
 *
 * The header is one absolutely positioned band over the scroller, and the only
 * thing driven by the scroll is its height: `bar + max(0, large - offset)`.
 * The bar is anchored to its top and the large block to its bottom, so the
 * band shrinking is what carries the large block up and behind the bar, and
 * `overflow-hidden` is what cuts it off there.
 *
 * Driving the height rather than a `translateY` is what makes the rest fall
 * out for free. Over-scrolling makes `large - offset` larger than `large`, so
 * the band grows and a cover filling it stretches by being laid out bigger —
 * no scale transform, so a photograph stretches without going soft. And the
 * band's height is the inset the content needs, so there is one number rather
 * than two that have to agree.
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
 * point is also published to React as `collapsed`, and whichever title is not
 * being shown is hidden from accessibility. That is one re-render per crossing
 * and no more: everything that runs per frame stays in shared values.
 *
 * ## What it needs
 *
 * A height to fill, and exactly one scrollable child. The child is cloned with
 * the scroll handler and the content inset composed onto it, the same way
 * `ScrollFade` wraps one, so a `ScrollView`, a `FlatList` or a `SectionList`
 * all work unchanged.
 */
import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
  type Ref,
} from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type Text as RNText,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  interpolate,
  runOnJS,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useComposedEventHandler,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type AnimatedScrollViewProps,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { Text, textChildren, type TextProps } from '../../primitives/text';
import { cn } from '../../utils/cn';
import {
  HANDOVER_DURATION,
  bandHeight,
  collapseProgress,
  hasSpan,
  isCrossing,
  snapTarget,
} from './scroll-header-math';

/**
 * Height of the pinned bar, in points, before the device's top inset is added.
 * The platform navigation bars are 44 and 56; 48 is the target-size floor the
 * rest of the library holds compact controls to, and it sits between them.
 */
const BAR_HEIGHT = 48;

/**
 * The scrollables Reanimated already animates. Its animated components are
 * ordinary function components carrying the *inner* component's name, so there
 * is nothing on one to test — but these two are module-level constants, and
 * identity is exact.
 */
const ANIMATED_SCROLLABLES = new Set<unknown>([Animated.ScrollView, Animated.FlatList]);

const scrollHeaderVariants = tv({
  slots: {
    root: 'flex-1',
    band: 'absolute inset-x-0 top-0 overflow-hidden',
    cover: 'absolute inset-0',
    bar: 'absolute inset-x-0 top-0 flex-row items-center gap-3 px-4',
    barSurface: 'absolute inset-0',
    large: 'absolute inset-x-0 bottom-0 gap-1 px-4 pb-3',
    actions: 'ml-auto flex-row items-center gap-1',
  },
  variants: {
    /** What the bar is drawn on once it has taken over. */
    surface: {
      plain: { barSurface: 'bg-background' },
      muted: { barSurface: 'bg-card' },
      none: { barSurface: 'bg-transparent' },
    },
    divider: {
      true: { barSurface: 'border-b border-border' },
      false: {},
    },
  },
  defaultVariants: {
    surface: 'plain',
    divider: true,
  },
});

type ScrollHeaderVariantProps = VariantProps<typeof scrollHeaderVariants>;

/** What the bar is drawn on once the large block has gone. */
export type ScrollHeaderSurface = NonNullable<ScrollHeaderVariantProps['surface']>;

/** Which half of the header a part is standing in. */
export type ScrollHeaderSlot = 'bar' | 'large';

interface ScrollHeaderContextValue {
  /** 0 while the large block is whole, 1 once the bar has taken over. */
  progress: SharedValue<number>;
  /** Distance scrolled, in points. Negative while the finger pulls down. */
  offset: SharedValue<number>;
  /** Measured height of the large block. */
  largeHeight: SharedValue<number>;
  /** The crossing point, published to React for accessibility. */
  collapsed: boolean;
  measureLarge: (event: LayoutChangeEvent) => void;
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

interface ScrollableProps {
  onScroll?: AnimatedScrollViewProps['onScroll'];
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollIndicatorInsets?: { top?: number; bottom?: number; left?: number; right?: number };
  scrollEventThrottle?: number;
  contentInsetAdjustmentBehavior?: AnimatedScrollViewProps['contentInsetAdjustmentBehavior'];
  ref?: Ref<unknown>;
}

export interface ScrollHeaderProps extends ViewProps {
  className?: string;
  /**
   * Height of the pinned bar in points, before the device's top inset. The
   * inset is added on top of this rather than taken out of it, so the bar's
   * contents keep this much room on every device.
   */
  barHeight?: number;
  /**
   * How much of the large block has to leave before the bar has fully taken
   * over, as a fraction of its height. Below 1 the crossing happens early,
   * which suits a tall block whose last few points are not worth waiting for.
   */
  threshold?: number;
  /**
   * Settle a part-scrolled band open or closed when the finger lifts, rather
   * than leaving the header half-collapsed.
   */
  snap?: boolean;
  /**
   * Let the band grow past its resting height when the scroller is pulled
   * down. A cover fills the band, so this is what stretches it. Off under
   * Reduce Motion.
   */
  stretch?: boolean;
  /** Add the device's top inset above the bar. Off inside a screen that already has one. */
  inset?: boolean;
  /**
   * Called as the bar takes over, and again when the large block comes back.
   * Fires on the crossing, not on every frame.
   */
  onCollapsedChange?: (collapsed: boolean) => void;
  /**
   * A shared value to mirror the collapse into, 0 to 1, for animating
   * something outside the header against the same transition.
   */
  progress?: SharedValue<number>;
  /** The parts, and exactly one scrollable. */
  children?: ReactNode;
}

/**
 * The band, and the scroller it sits over. Everything that is not a part is
 * treated as the scrollable child.
 */
const ScrollHeaderRoot = forwardRef<View, ScrollHeaderProps>(
  (
    {
      className,
      barHeight = BAR_HEIGHT,
      threshold = 1,
      snap = true,
      stretch = true,
      inset = true,
      onCollapsedChange,
      progress: externalProgress,
      children,
      ...props
    },
    ref
  ) => {
    const insets = useSafeAreaInsets();
    const reducedMotion = useReducedMotion();
    const insetTop = inset ? insets.top : 0;
    const barBand = insetTop + barHeight;

    const offset = useSharedValue(0);
    const largeHeight = useSharedValue(0);
    const [largeSize, setLargeSize] = useState(0);
    const [collapsed, setCollapsed] = useState(false);

    const scrollRef = useAnimatedRef<Animated.ScrollView>();

    // Measured into both a shared value, for the band's height, and React
    // state, for the content inset — the inset is a resting number that only
    // changes when the block is re-laid-out, so paying a render for it costs
    // nothing per frame and keeps the scroller's props stable.
    const measureLarge = useCallback((event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      largeHeight.value = height;
      setLargeSize((previous) => (Math.abs(previous - height) < 0.5 ? previous : height));
    }, [largeHeight]);

    const progress = useDerivedValue(() => {
      const next = collapseProgress(offset.value, largeHeight.value, threshold);
      // A header with a block hands over across that block's height, and the
      // finger sets the pace. One without has no distance to interpolate over,
      // so the step is timed rather than instant — the alternative is a bar
      // whose surface appears between one frame and the next.
      const value = hasSpan(largeHeight.value)
        ? next
        : withTiming(next, { duration: HANDOVER_DURATION });
      if (externalProgress) externalProgress.value = value;
      return value;
    }, [threshold, externalProgress]);

    // The one thing the transition tells React about. `collapsed` gates the
    // accessibility of the two titles and is what `onCollapsedChange` reports;
    // the reaction fires on the crossing, not on the frames either side of it.
    const cross = useCallback(
      (next: boolean) => {
        setCollapsed(next);
        onCollapsedChange?.(next);
      },
      [onCollapsedChange]
    );

    useAnimatedReaction(
      () => progress.value >= 1,
      (isCollapsed, was) => {
        if (!isCrossing(isCollapsed, was)) return;
        runOnJS(cross)(isCollapsed);
      },
      [cross]
    );

    const settle = useCallback(
      (velocity: number) => {
        'worklet';
        if (!snap) return;
        const target = snapTarget(offset.value, largeHeight.value, velocity);
        if (target === null) return;
        scrollTo(scrollRef, 0, target, true);
      },
      [snap, largeHeight, offset, scrollRef]
    );

    const { parts, scrollable } = useMemo(() => splitChildren(children), [children]);

    const childType = isValidElement(scrollable)
      ? (scrollable.type as ComponentType<ScrollableProps>)
      : null;
    // Keyed on the element type rather than the element: rebuilding the
    // wrapper would remount the list and lose its scroll position. A child
    // that is animated already is used as it stands — wrapping one twice is
    // unsupported, and there is no marker on them to test for, so the two
    // that exist are recognised by identity.
    const AnimatedScrollable = useMemo(() => {
      if (!childType) return null;
      if (ANIMATED_SCROLLABLES.has(childType)) return childType;
      return Animated.createAnimatedComponent(childType);
    }, [childType]);

    const childProps = (isValidElement(scrollable) ? scrollable.props : {}) as ScrollableProps;
    const childOnScroll = childProps.onScroll;

    /*
     * A consumer's own `onScroll` is kept, whichever of the two kinds it is,
     * because silently dropping one looks like a bug in the scrolling rather
     * than in the call site.
     *
     * `useEvent` returns an object wearing a function's type, so the two are
     * told apart by what they actually are: an object is a Reanimated handler
     * and composes onto ours, staying on the UI thread. A plain function
     * cannot — `useComposedEventHandler` keeps only worklet handlers and drops
     * anything else without a word — so it is called across the bridge
     * instead, which is the cost of asking for JavaScript on every frame.
     */
    const workletOnScroll = typeof childOnScroll === 'function' ? null : childOnScroll ?? null;
    const plainOnScroll = typeof childOnScroll === 'function' ? childOnScroll : null;

    // Rebuilt only when the callback itself changes, so the worklet below is
    // not rebuilt on every render of the child.
    const forwardScroll = useCallback(
      (native: NativeScrollEvent) => {
        // Only the scroll geometry survives the crossing. It is what a scroll
        // callback reads, and the rest of a synthetic event is a live object
        // that cannot be sent.
        plainOnScroll?.({ nativeEvent: native } as NativeSyntheticEvent<NativeScrollEvent>);
      },
      [plainOnScroll]
    );
    const forwards = plainOnScroll !== null;

    const scrollHandler = useAnimatedScrollHandler(
      {
        onScroll: (event) => {
          offset.value = event.contentOffset.y;
          if (forwards) {
            runOnJS(forwardScroll)({
              contentOffset: event.contentOffset,
              contentSize: event.contentSize,
              layoutMeasurement: event.layoutMeasurement,
              contentInset: event.contentInset,
              zoomScale: event.zoomScale,
            } as NativeScrollEvent);
          }
        },
        onEndDrag: (event) => {
          settle(event.velocity?.y ?? 0);
        },
        onMomentumEnd: () => {
          settle(0);
        },
      },
      [settle, forwards, forwardScroll]
    );

    const onScroll = useComposedEventHandler([
      scrollHandler,
      (workletOnScroll as typeof scrollHandler | null) ?? null,
    ]);

    const headerHeight = barBand + largeSize;

    const bandStyle = useAnimatedStyle(
      () => ({
        height: bandHeight(barBand, largeHeight.value, offset.value, stretch && !reducedMotion),
      }),
      [barBand, stretch, reducedMotion]
    );

    const metrics = useMemo<BandMetrics>(
      () => ({ barBand, insetTop }),
      [barBand, insetTop]
    );

    const context = useMemo<ScrollHeaderContextValue>(
      () => ({ progress, offset, largeHeight, collapsed, measureLarge }),
      [progress, offset, largeHeight, collapsed, measureLarge]
    );

    const { root, band } = scrollHeaderVariants();

    return (
      <ScrollHeaderContext.Provider value={context}>
        <View {...props} ref={ref} className={root({ className })}>
          {AnimatedScrollable && isValidElement(scrollable) ? (
            <AnimatedScrollable
              {...childProps}
              ref={composeRefs(scrollRef, childProps.ref)}
              onScroll={onScroll}
              scrollEventThrottle={childProps.scrollEventThrottle ?? 16}
              // The band is the inset. iOS would otherwise add one of its own
              // on top of it, for a header it cannot see.
              contentInsetAdjustmentBehavior={
                childProps.contentInsetAdjustmentBehavior ?? 'never'
              }
              contentContainerStyle={[
                { paddingTop: headerHeight },
                childProps.contentContainerStyle,
              ]}
              scrollIndicatorInsets={{ top: barBand, ...childProps.scrollIndicatorInsets }}
            />
          ) : (
            scrollable
          )}

          <Animated.View
            pointerEvents="box-none"
            style={[bandStyle, Platform.OS === 'android' ? styles.lift : null]}
            className={band()}
          >
            <BandMetricsContext.Provider value={metrics}>
              {/* Draw order, not writing order: the cover is behind the block,
                  and the bar is over both so it covers the block on its way
                  past rather than being crossed by it. */}
              {parts.cover}
              {parts.large}
              {parts.bar}
            </BandMetricsContext.Provider>
          </Animated.View>
        </View>
      </ScrollHeaderContext.Provider>
    );
  }
);
ScrollHeaderRoot.displayName = 'ScrollHeader';

interface BandMetrics {
  /** Height of the pinned band, inset included. */
  barBand: number;
  /** How much of it is safe area. */
  insetTop: number;
}

const BandMetricsContext = createContext<BandMetrics>({ barBand: BAR_HEIGHT, insetTop: 0 });

export interface ScrollHeaderBarProps extends ViewProps {
  className?: string;
  /**
   * What the bar is drawn on once it has taken over. `none` leaves it clear,
   * for a bar over a cover that should stay visible.
   */
  surface?: ScrollHeaderSurface;
  /** A hairline under the bar, drawn with its surface. */
  divider?: boolean;
  children?: ReactNode;
}

/**
 * The pinned bar. Its contents never move; its surface fades in as the large
 * block leaves, which is what makes the change read as one crossfade rather
 * than two things happening at once.
 */
const ScrollHeaderBar = forwardRef<View, ScrollHeaderBarProps>(
  (
    {
      className,
      surface = 'plain',
      divider = true,
      children,
      ...props
    },
    ref
  ) => {
    const { progress } = useScrollHeader('ScrollHeader.Bar');
    const { barBand, insetTop } = useContext(BandMetricsContext);
    const { bar, barSurface } = scrollHeaderVariants({ surface, divider });

    const surfaceStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

    return (
      <View
        {...props}
        ref={ref}
        // The bar owns only its own band. `box-none` above it lets a pull
        // land on the scroller rather than on the header covering it.
        style={{ height: barBand, paddingTop: insetTop }}
        className={bar({ className })}
      >
        <Animated.View
          pointerEvents="none"
          style={surfaceStyle}
          className={barSurface()}
        />
        <ScrollHeaderSlotContext.Provider value="bar">
          {textChildren(children)}
        </ScrollHeaderSlotContext.Provider>
      </View>
    );
  }
);
ScrollHeaderBar.displayName = 'ScrollHeader.Bar';

export interface ScrollHeaderLargeProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * The expanded block. Its measured height is the distance the header
 * collapses over, so whatever is put in it — a title, a search field, a row of
 * chips — sets the scroll distance rather than a prop having to agree with it.
 */
const ScrollHeaderLarge = forwardRef<View, ScrollHeaderLargeProps>(
  ({ className, onLayout, children, ...props }, ref) => {
    const { progress, measureLarge, collapsed } = useScrollHeader('ScrollHeader.Large');
    const { large } = scrollHeaderVariants();

    const style = useAnimatedStyle(() => ({
      opacity: interpolate(progress.value, [0, 1], [1, 0], 'clamp'),
    }));

    // The measurement is this block's whole job, so it is taken first and a
    // consumer's own `onLayout` runs after it rather than instead of it.
    const measure = useCallback(
      (event: LayoutChangeEvent) => {
        measureLarge(event);
        onLayout?.(event);
      },
      [measureLarge, onLayout]
    );

    return (
      <Animated.View
        {...props}
        ref={ref}
        onLayout={measure}
        // Behind the bar and faded out by the time it gets there, so it must
        // not keep taking touches that belong to the content underneath.
        pointerEvents={collapsed ? 'none' : 'box-none'}
        accessibilityElementsHidden={collapsed}
        importantForAccessibility={collapsed ? 'no-hide-descendants' : 'auto'}
        style={style}
        className={large({ className })}
      >
        <ScrollHeaderSlotContext.Provider value="large">
          {textChildren(children)}
        </ScrollHeaderSlotContext.Provider>
      </Animated.View>
    );
  }
);
ScrollHeaderLarge.displayName = 'ScrollHeader.Large';

/**
 * The screen's title. Written in both halves and styled from whichever it is
 * in: large and at rest in the block, compact and fading in on the bar.
 */
const ScrollHeaderTitle = forwardRef<RNText, TextProps>(({ className, ...props }, ref) => {
  const { progress, collapsed } = useScrollHeader('ScrollHeader.Title');
  const slot = useContext(ScrollHeaderSlotContext);

  const style = useAnimatedStyle(() => ({ opacity: progress.value }));

  if (slot === 'large') {
    return (
      <Text
        {...props}
        ref={ref}
        size="3xl"
        weight="bold"
        accessibilityRole="header"
        className={cn('text-foreground', className)}
      />
    );
  }

  return (
    <Animated.View
      style={style}
      // The large title is the one being read until the bar has taken over.
      // Both are in the tree the whole time, and only one of them should be.
      accessibilityElementsHidden={!collapsed}
      importantForAccessibility={collapsed ? 'auto' : 'no-hide-descendants'}
      className="flex-1"
    >
      <Text
        {...props}
        ref={ref}
        size="base"
        weight="semibold"
        numberOfLines={props.numberOfLines ?? 1}
        accessibilityRole="header"
        className={cn('text-foreground', className)}
      />
    </Animated.View>
  );
});
ScrollHeaderTitle.displayName = 'ScrollHeader.Title';

/** The quiet line under the title — a count, a byline, a date. */
const ScrollHeaderDescription = forwardRef<RNText, TextProps>(({ className, ...props }, ref) => (
  <Text {...props} ref={ref} size="sm" muted className={className} />
));
ScrollHeaderDescription.displayName = 'ScrollHeader.Description';

export interface ScrollHeaderActionsProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * The controls at the trailing end of the bar. They stay put and stay
 * reachable — only the bar's surface and title are part of the transition.
 */
const ScrollHeaderActions = forwardRef<View, ScrollHeaderActionsProps>(
  ({ className, children, ...props }, ref) => {
    const { actions } = scrollHeaderVariants();
    return (
      <View {...props} ref={ref} className={actions({ className })}>
        {textChildren(children)}
      </View>
    );
  }
);
ScrollHeaderActions.displayName = 'ScrollHeader.Actions';

export interface ScrollHeaderCoverProps extends ViewProps {
  className?: string;
  /** A picture behind the header. Laid out to fill the band, so it stretches with it. */
  source?: ImageSourcePropType;
  /**
   * The gradient drawn when there is no picture, or under one that has not
   * loaded. Defaults to two of the theme's series tokens, so an app that puts
   * its charts on brand puts this on brand with them.
   */
  colors?: [string, string, ...string[]];
  /** A wash over the cover, so a title stays legible on a bright picture. */
  scrim?: boolean;
  children?: ReactNode;
}

/**
 * A picture or a gradient filling the band. It has no height of its own — the
 * band's height is its height, which is why it stretches on an over-scroll by
 * being laid out larger rather than by being scaled up and going soft.
 */
const ScrollHeaderCover = forwardRef<View, ScrollHeaderCoverProps>(
  (
    {
      className,
      source,
      colors,
      scrim = true,
      children,
      ...props
    },
    ref
  ) => {
    const { cover } = scrollHeaderVariants();
    const seriesOne = useCSSVariable('--color-chart-1');
    const seriesTwo = useCSSVariable('--color-chart-2');

    const ramp: [string, string, ...string[]] = colors ?? [
      typeof seriesOne === 'string' ? seriesOne : '#6366f1',
      typeof seriesTwo === 'string' ? seriesTwo : '#8b5cf6',
    ];

    return (
      <View {...props} ref={ref} pointerEvents="none" className={cover({ className })}>
        <LinearGradient colors={ramp} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {source ? (
          <Image source={source} resizeMode="cover" style={StyleSheet.absoluteFill} />
        ) : null}
        {scrim ? <View className="absolute inset-0 bg-black/25" /> : null}
        {children}
      </View>
    );
  }
);
ScrollHeaderCover.displayName = 'ScrollHeader.Cover';

/**
 * Sort the children into the three band slots and the one scrollable. Sorting
 * by component rather than by order is what lets the example above read
 * top-down — bar, block, list — while the band still draws the cover first.
 */
function splitChildren(children: ReactNode): {
  parts: { cover: ReactNode; large: ReactNode; bar: ReactNode };
  scrollable: ReactNode;
} {
  let cover: ReactNode = null;
  let large: ReactNode = null;
  let bar: ReactNode = null;
  let scrollable: ReactNode = null;

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === ScrollHeaderCover) cover = child;
    else if (child.type === ScrollHeaderLarge) large = child;
    else if (child.type === ScrollHeaderBar) bar = child;
    else if (!scrollable) scrollable = child;
  });

  return { parts: { cover, large, bar }, scrollable };
}

/** Point several refs at one node, skipping the ones that were not given. */
function composeRefs(...refs: (Ref<unknown> | undefined)[]) {
  return (node: unknown) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node);
      else if (ref && typeof ref === 'object') {
        (ref as { current: unknown }).current = node;
      }
    }
  };
}

const styles = StyleSheet.create({
  // Android draws by elevation before z-order, so a band with none of its own
  // ends up under the scroller's own background.
  lift: { elevation: 4 },
});

export const ScrollHeader = Object.assign(ScrollHeaderRoot, {
  Bar: ScrollHeaderBar,
  Large: ScrollHeaderLarge,
  Title: ScrollHeaderTitle,
  Description: ScrollHeaderDescription,
  Actions: ScrollHeaderActions,
  Cover: ScrollHeaderCover,
});
