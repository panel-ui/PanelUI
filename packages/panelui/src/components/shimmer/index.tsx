/**
 * Shimmer — an animated highlight sweeping across content.
 *
 * The React Native equivalent of shadcn-ui/ui's `shimmer` utility
 * (https://ui.shadcn.com/docs/utils/shimmer). That one is CSS:
 * `background-clip: text` with a `color-mix()` highlight. React Native has
 * neither, so the highlight is drawn as an SVG gradient band swept across an
 * overlay by Reanimated, on the UI thread.
 *
 * The visible difference: the band passes *over* the content rather than
 * being clipped to glyph shapes. On body-sized text the two read the same; on
 * very large text the web version is crisper.
 *
 * ```tsx
 * <Shimmer>
 *   <Text muted>Generating response…</Text>
 * </Shimmer>
 * ```
 */
import { useEffect, useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent, type ViewProps } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import { cn } from '../../utils/cn';

export interface ShimmerProps extends ViewProps {
  className?: string;
  /** Milliseconds for one sweep. */
  duration?: number;
  /** Sweep once instead of looping. */
  once?: boolean;
  /** Sweep right-to-left. */
  reverse?: boolean;
  /** Width of the highlight band, as a fraction of the content width. */
  spread?: number;
  /** Highlight colour. Defaults to the theme's foreground. */
  color?: string;
  /** Peak opacity of the highlight. */
  intensity?: number;
  children?: ReactNode;
}

export function Shimmer({
  className,
  duration = 2000,
  once = false,
  reverse = false,
  spread = 0.4,
  color,
  intensity = 0.45,
  children,
  ...props
}: ShimmerProps) {
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  const themeForeground = useCSSVariable('--color-foreground');
  const highlight =
    color ?? (typeof themeForeground === 'string' ? themeForeground : '#ffffff');

  useEffect(() => {
    // Respect the OS setting rather than animating regardless — the same
    // thing shadcn's utility does with prefers-reduced-motion.
    if (reducedMotion || width === 0) return;

    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.linear }),
      once ? 1 : -1,
      false
    );

    return () => cancelAnimation(progress);
  }, [duration, once, reducedMotion, width, progress]);

  const bandWidth = Math.max(width * spread, 1);

  const bandStyle = useAnimatedStyle(() => {
    // Travel from fully off one edge to fully off the other.
    const from = -bandWidth;
    const to = width;
    const x = reverse
      ? to - progress.value * (to - from)
      : from + progress.value * (to - from);
    return { transform: [{ translateX: x }] };
  });

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
    props.onLayout?.(event);
  };

  return (
    <View
      {...props}
      onLayout={onLayout}
      className={cn('overflow-hidden', className)}
    >
      {children}

      {reducedMotion || width === 0 ? null : (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', top: 0, bottom: 0, width: bandWidth },
            bandStyle,
          ]}
        >
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={highlight} stopOpacity={0} />
                <Stop offset="0.5" stopColor={highlight} stopOpacity={intensity} />
                <Stop offset="1" stopColor={highlight} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#shimmer)" />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

Shimmer.displayName = 'Shimmer';
