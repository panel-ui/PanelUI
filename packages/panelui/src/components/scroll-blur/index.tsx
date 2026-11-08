/**
 * ScrollBlur — blurs the edges of a scroll container.
 *
 * Content that runs past a boundary reads better receding than being cut off,
 * and a receding edge doubles as an affordance: an edge that is going soft is
 * an edge with more content behind it.
 *
 * A blur says that where a fade cannot: a fade takes the content towards the
 * colour behind the scroller, so it only works where that colour is known and
 * flat. A blur takes it out of focus instead, which is true over a photograph,
 * a gradient, or a list of coloured cards. It is also what belongs under
 * something laid *over* the scroller — a button, a header, a search field —
 * because the content passing beneath stays visible as shape and colour while
 * losing the detail that would compete with the thing on top.
 *
 * ```tsx
 * <ScrollBlur>
 *   <ScrollView>…</ScrollView>
 * </ScrollBlur>
 * ```
 *
 * ## The ramp is a stack and a wash, because neither alone is smooth
 *
 * A blur that goes from nothing to full across a band needs a per-pixel blur
 * radius, and there is no such thing on either platform — a blur view has one
 * strength for its whole rectangle.
 *
 * So the ramp is built out of several of them: each layer covers a shorter
 * span than the last, measured from the edge, and each blurs what the layer
 * under it has already blurred. The spans are spaced on a curve rather than
 * evenly, which puts most of the layers in the outer third where the blur is
 * changing fastest and the steps would otherwise be widest.
 *
 * That alone is not enough. Every layer has a hard edge, and a stack of hard
 * edges is a stack of visible lines however many there are. So a gradient of
 * `color` is washed over the top — opaque at the outer edge, clear at the
 * inner one. It hides the seams, and it is what makes the band read as one
 * material rather than as a pile of rectangles: the content goes soft and
 * fades into the surface at the same time, which is what the eye expects an
 * edge to do.
 *
 * That wash is why `color` matters even when the blur is drawn. Give it the
 * surface the scrollable actually sits on — a sheet, a card, the page — or the
 * band fades towards a colour that is not there.
 *
 * ## Where it cannot blur, it fades
 *
 * A real blur needs a native view. `expo-blur` is optional, and Reduce
 * Transparency is a preference that outranks the design, so both cases fall
 * back to a gradient towards `color` — the same thing `ScrollFade` draws. A
 * blur you cannot draw is better shown as a fade than as a hard edge, and far
 * better than as a crash.
 *
 * Because of that fallback, pass `color` whenever the scroller does not sit on
 * the theme background. It is unused in the blurred case and the whole effect
 * in the other one.
 *
 * Scroll position, content size and viewport size are held in shared values
 * and read on the UI thread, so scrolling never re-renders React.
 */
import {
  Children,
  isValidElement,
  useMemo,
  useRef,
  type ComponentType,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
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
import {
  androidBlurProps,
  BlurTargetView,
  canBlurHere,
  useReduceTransparency,
} from '../../primitives/scrim';
import { useThemeMode } from '../../theme/use-theme';

/**
 * `expo-blur`'s BlurView, or null when it is not installed. Resolved once at
 * module load — the require is cheap and caching it avoids a try/catch on
 * every render.
 */
const BlurView: ComponentType<{
  intensity?: number;
  tint?: ScrollBlurTint;
  style?: unknown;
  blurMethod?: string;
  blurTarget?: RefObject<View | null>;
}> | null = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-blur');
    return (mod?.BlurView as ComponentType<{ intensity?: number }>) ?? null;
  } catch {
    return null;
  }
})();

/** Past this many pixels from an edge, that edge's band is fully drawn. */
const DEFAULT_FADE_IN_DISTANCE = 24;

/** Which way the material tints. `default` follows the app's theme. */
export type ScrollBlurTint = 'light' | 'dark' | 'default';

export interface ScrollBlurProps extends ViewProps {
  className?: string;
  /** Depth of the blurred band in pixels. */
  size?: number;
  /** Which edges blur. */
  edges?: 'both' | 'start' | 'end' | 'none';
  /**
   * Scroll axis. Inferred from the child's `horizontal` prop when omitted —
   * pass it explicitly for children that scroll horizontally without that prop
   * (a `FlatList` with `horizontal` set through `contentContainerStyle`, say).
   */
  orientation?: 'horizontal' | 'vertical';
  /**
   * How many blur views make up the ramp. More is smoother and costs more; the
   * band shows visible steps below four, and past eight nobody can tell.
   */
  layers?: number;
  /** Blur strength at the very edge, 0–100. The layers share it between them. */
  intensity?: number;
  /**
   * Which way the material tints. Defaults to the app's theme rather than the
   * phone's, so an app running dark on a light phone does not blur light.
   */
  material?: ScrollBlurTint;
  /**
   * The colour the band fades towards — washed over the blur, and the whole
   * effect where there is no blur to draw.
   *
   * Defaults to the theme's background. Pass the surface the scrollable
   * actually sits on, or the band fades towards a colour that is not there.
   */
  color?: string;
  /**
   * How opaque that wash gets at the outer edge, 0 to 1. Lower it to let more
   * of the content show through the far end of the band; `0` leaves the blur
   * bare, along with the seams between its layers.
   */
  tint?: number;
  /** Distance in pixels over which an edge comes in from clear to full. */
  fadeInDistance?: number;
  /** Set false to render the child with no bands at all. */
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

export function ScrollBlur({
  className,
  size = 80,
  edges = 'both',
  orientation,
  layers = 8,
  intensity = 56,
  material = 'default',
  tint = 0.95,
  color,
  fadeInDistance = DEFAULT_FADE_IN_DISTANCE,
  enabled = true,
  children,
  ...props
}: ScrollBlurProps) {
  const offset = useSharedValue(0);
  const contentLength = useSharedValue(0);
  const viewportLength = useSharedValue(0);

  const reduceTransparency = useReduceTransparency();
  const { mode } = useThemeMode();
  /*
   * Not knowing yet counts as "do not blur": the answer is asynchronous and
   * arriving a frame late costs nothing, while a blur flashed at somebody who
   * switched Reduce Transparency on is the whole thing that setting is for.
   */
  const blurring = canBlurHere && BlurView !== null && reduceTransparency === false;
  // Android blurs only a view it is pointed at, so the scroller is wrapped in a
  // target when there is a blur to draw over it.
  const targetRef = useRef<View>(null);
  const wantsTarget = blurring && BlurTargetView !== null;
  const materialTint: ScrollBlurTint = material === 'default' ? mode : material;

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
  // it is drawn from the first frame rather than waiting for a scroll event.
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
    // Nothing to blur towards when the content fits inside the viewport.
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

  const edgeProps = {
    blurTarget: wantsTarget ? targetRef : null,
    size,
    horizontal,
    layers: Math.max(1, Math.round(layers)),
    intensity,
    material: materialTint,
    tint: Math.max(0, Math.min(1, tint)),
    blurring,
    color: fadeColor,
  };

  return (
    <View {...props} className={className}>
      {wantsTarget && BlurTargetView ? (
        <BlurTargetView ref={targetRef} collapsable={false} style={{ flex: 1 }}>
          {scrollable}
        </BlurTargetView>
      ) : (
        scrollable
      )}

      {edges !== 'end' ? (
        <Edge {...edgeProps} opacity={startOpacity} edge="start" />
      ) : null}
      {edges !== 'start' ? (
        <Edge {...edgeProps} opacity={endOpacity} edge="end" />
      ) : null}
    </View>
  );
}

ScrollBlur.displayName = 'ScrollBlur';

/** One edge's band: the stack of blur views, and the wash that joins them up. */
function Edge({
  blurTarget,
  size,
  horizontal,
  layers,
  intensity,
  material,
  tint,
  blurring,
  color,
  opacity,
  edge,
}: {
  blurTarget: RefObject<View | null> | null;
  size: number;
  horizontal: boolean;
  layers: number;
  intensity: number;
  material: ScrollBlurTint;
  tint: number;
  blurring: boolean;
  color: string;
  opacity: DerivedValue<number>;
  edge: 'start' | 'end';
}) {
  const isStart = edge === 'start';

  const position = horizontal
    ? { top: 0, bottom: 0, width: size, ...(isStart ? { left: 0 } : { right: 0 }) }
    : { left: 0, right: 0, height: size, ...(isStart ? { top: 0 } : { bottom: 0 }) };

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  /** How opaque the wash gets at the outer edge. Without a blur it is all of it. */
  const full = blurring ? tint : 1;

  const steps = useMemo(
    () =>
      Array.from({ length: layers }, (_unused, index) => {
        /*
         * Spans on a curve rather than evenly spaced. The blur's strength grows
         * fastest near the edge, so that is where the steps between layers
         * would be widest — squaring the fraction crowds most of the layers
         * into the outer third and spreads the rest thin across the inner
         * two, which is where nothing much is happening anyway.
         */
        const fraction = (layers - index) / layers;
        return {
          key: index,
          // Cubed rather than squared: with eight layers a square curve still
          // leaves the outermost two nearly the same width, and two layers of
          // the same width are one layer at twice the cost.
          span: size * fraction * fraction * fraction,
          /*
           * The widest layer is the faintest, so the band starts from nothing
           * instead of stepping up at its inner boundary. Squared, so the
           * fade-in is gentle where the layers are widest and the eye has the
           * most room to notice one arriving.
           */
          opacity: ((index + 1) / layers) ** 2,
        };
      }),
    [layers, size]
  );

  const along = (span: number) =>
    horizontal
      ? { top: 0, bottom: 0, width: span, ...(isStart ? { left: 0 } : { right: 0 }) }
      : { left: 0, right: 0, height: span, ...(isStart ? { top: 0 } : { bottom: 0 }) };

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', overflow: 'hidden' }, position, style]}
    >
      {blurring && BlurView
        ? steps.map((step) => (
            <View
              key={step.key}
              style={[{ position: 'absolute', opacity: step.opacity }, along(step.span)]}
            >
              <BlurView
                // Elsewhere each layer blurs the layers under it, so the
                // strength adds up towards the edge. Android's layers each
                // blur the scroller itself, so each carries its own share.
                intensity={
                  blurTarget ? (intensity * (step.key + 1)) / layers : intensity / layers
                }
                tint={material}
                style={StyleSheet.absoluteFill}
                {...androidBlurProps(blurTarget)}
              />
            </View>
          ))
        : null}

      {/*
        The wash. Over the blur it hides the seam every layer's hard edge
        leaves and carries the content into the surface; without a blur to draw
        it is the whole band, which is the fade this degrades to.
      */}
      {tint > 0 || !blurring ? (
        /*
         * Three stops, not two. A straight line from opaque to clear spends
         * half its length at alphas high enough to read as a flat panel, then
         * gives out all at once — the band gets an edge of its own, which is
         * the thing it exists to remove. The middle stop at just over a third
         * of the full alpha, placed past the halfway point, bends it into the
         * long tail an edge is supposed to have.
         */
        <LinearGradient
          colors={
            isStart
              ? [
                  withAlpha(color, full),
                  withAlpha(color, full * 0.36),
                  withAlpha(color, 0),
                ]
              : [
                  withAlpha(color, 0),
                  withAlpha(color, full * 0.36),
                  withAlpha(color, full),
                ]
          }
          locations={isStart ? [0, 0.55, 1] : [0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={horizontal ? { x: 1, y: 0 } : { x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </Animated.View>
  );
}

/**
 * Gradients need a transparent stop of the *same* colour — `transparent` is
 * black at zero alpha on Android, which shows as a grey smear.
 *
 * Written out here rather than shared with `ScrollFade`, because each of these
 * components is also copied into a project on its own and a helper reached for
 * across two of them would arrive as a file nobody asked for.
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
