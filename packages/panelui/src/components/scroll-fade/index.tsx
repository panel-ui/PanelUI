/**
 * ScrollFade — fades the edges of a scroll container.
 *
 * Content that runs past a boundary reads better fading out than being cut
 * off, and the fade doubles as an affordance: an edge that is fading is an
 * edge with more content behind it.
 *
 * Scroll position, content size and viewport size are all held in shared
 * values and consumed by `useAnimatedStyle`, so the fades track the scroll on
 * the UI thread without re-rendering React.
 *
 * ```tsx
 * <ScrollFade>
 *   <ScrollView horizontal>…</ScrollView>
 * </ScrollFade>
 * ```
 */
import {
  Children,
  cloneElement,
  isValidElement,
  useMemo,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useComposedEventHandler,
  useDerivedValue,
  useSharedValue,
  type AnimatedScrollViewProps,
  type DerivedValue,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

/** Past this many pixels from an edge, that edge's fade is fully shown. */
const DEFAULT_FADE_IN_DISTANCE = 24;

export interface ScrollFadeProps extends ViewProps {
  className?: string;
  /** Depth of the fade in pixels. */
  size?: number;
  /** Which edges fade. */
  edges?: 'both' | 'start' | 'end' | 'none';
  /**
   * Scroll axis. Inferred from the child's `horizontal` prop when omitted —
   * pass it explicitly for children that scroll horizontally without that prop
   * (a `FlatList` with `horizontal` set through `contentContainerStyle`, say).
   */
  orientation?: 'horizontal' | 'vertical';
  /**
   * Colour the fade resolves to — normally whatever sits behind the
   * scrollable. Defaults to the theme's background.
   */
  color?: string;
  /** Distance in pixels over which an edge fades from clear to full. */
  fadeInDistance?: number;
  /** Set false to render the child with no fades at all. */
  enabled?: boolean;
  children?: ReactNode;
}

interface ScrollableProps {
  horizontal?: boolean;
  onScroll?: AnimatedScrollViewProps['onScroll'];
  onLayout?: (event: LayoutChangeEvent) => void;
  onContentSizeChange?: (width: number, height: number) => void;
  scrollEventThrottle?: number;
}

export function ScrollFade({
  className,
  size = 48,
  edges = 'both',
  orientation,
  color,
  fadeInDistance = DEFAULT_FADE_IN_DISTANCE,
  enabled = true,
  children,
  ...props
}: ScrollFadeProps) {
  const offset = useSharedValue(0);
  const contentLength = useSharedValue(0);
  const viewportLength = useSharedValue(0);

  const themeBackground = useCSSVariable('--color-background');
  const fadeColor =
    color ?? (typeof themeBackground === 'string' ? themeBackground : '#000000');

  const child = Children.only(children) as ReactElement<ScrollableProps>;
  const horizontal =
    orientation !== undefined
      ? orientation === 'horizontal'
      : isValidElement(child) && !!child.props.horizontal;

  // Reanimated can only drive a scroll handler on an animated component, and
  // `Animated.ScrollView` is not necessarily what was passed in — the child may
  // be a FlatList, a SectionList or a custom scrollable. Keyed on the element
  // *type*, not the element: rebuilding the wrapper would remount the list.
  const childType = isValidElement(child)
    ? (child.type as ComponentType<ScrollableProps>)
    : null;
  const AnimatedScrollable = useMemo(
    () => (childType ? Animated.createAnimatedComponent(childType) : null),
    [childType]
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const { contentOffset, contentSize, layoutMeasurement } = event;
      offset.value = horizontal ? contentOffset.x : contentOffset.y;
      contentLength.value = horizontal ? contentSize.width : contentSize.height;
      viewportLength.value = horizontal
        ? layoutMeasurement.width
        : layoutMeasurement.height;
    },
  });

  // A consumer `onScroll` is composed rather than dropped — but because the
  // child is now an animated component it has to be an animated handler too.
  const onScroll = useComposedEventHandler([
    scrollHandler,
    (child.props.onScroll as typeof scrollHandler | undefined) ?? null,
  ]);

  // Measured up front as well as on scroll, so an end edge with content behind
  // it fades from the first frame rather than waiting for a scroll event.
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    viewportLength.value = horizontal ? width : height;
    child.props.onLayout?.(event);
  };

  const onContentSizeChange = (width: number, height: number) => {
    contentLength.value = horizontal ? width : height;
    child.props.onContentSizeChange?.(width, height);
  };

  const startOpacity = useDerivedValue(() =>
    Math.min(offset.value / fadeInDistance, 1)
  );

  const endOpacity = useDerivedValue(() => {
    // Nothing to fade towards when the content fits inside the viewport.
    const remaining = contentLength.value - viewportLength.value - offset.value;
    return Math.min(Math.max(remaining, 0) / fadeInDistance, 1);
  });

  const scrollable =
    AnimatedScrollable && isValidElement(child) ? (
      <AnimatedScrollable
        {...child.props}
        onScroll={onScroll}
        onLayout={onLayout}
        onContentSizeChange={onContentSizeChange}
        scrollEventThrottle={child.props.scrollEventThrottle ?? 16}
      />
    ) : (
      child
    );

  if (!enabled || edges === 'none') {
    return (
      <View {...props} className={className}>
        {scrollable}
      </View>
    );
  }

  return (
    <View {...props} className={className}>
      {scrollable}

      {edges !== 'end' ? (
        <Fade
          color={fadeColor}
          size={size}
          horizontal={horizontal}
          opacity={startOpacity}
          edge="start"
        />
      ) : null}
      {edges !== 'start' ? (
        <Fade
          color={fadeColor}
          size={size}
          horizontal={horizontal}
          opacity={endOpacity}
          edge="end"
        />
      ) : null}
    </View>
  );
}

ScrollFade.displayName = 'ScrollFade';

/** One edge's gradient, opaque at the edge and clear inwards. */
function Fade({
  color,
  size,
  horizontal,
  opacity,
  edge,
}: {
  color: string;
  size: number;
  horizontal: boolean;
  opacity: DerivedValue<number>;
  edge: 'start' | 'end';
}) {
  const isStart = edge === 'start';

  const position = horizontal
    ? { top: 0, bottom: 0, width: size, ...(isStart ? { left: 0 } : { right: 0 }) }
    : { left: 0, right: 0, height: size, ...(isStart ? { top: 0 } : { bottom: 0 }) };

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // The gradient runs from the edge inwards, so its stops are reversed on the
  // end edge.
  const colors: [string, string] = isStart
    ? [withAlpha(color, 1), withAlpha(color, 0)]
    : [withAlpha(color, 0), withAlpha(color, 1)];

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute' }, position, style]}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={horizontal ? { x: 1, y: 0 } : { x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

/**
 * Gradients need a transparent stop of the *same* colour — `transparent` is
 * black at zero alpha on Android, which shows as a grey smear.
 */
function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split('')
            .map((c) => c + c)
            .join('')
        : hex.slice(0, 6);
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    if (Number.isNaN(r + g + b)) return color;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const channels = color.match(/rgba?\(([^)]+)\)/)?.[1];
  if (channels) {
    const [r, g, b] = channels.split(',').map((part) => part.trim());
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return color;
}
