/**
 * Shimmer — a highlight that sweeps *through* content rather than over it.
 *
 * The content is used as a mask, and a gradient band is swept behind it on the
 * UI thread. Because the content is the mask, the highlight is clipped to the
 * glyph shapes: text reads as though the letters themselves are catching a
 * light, which is the "thinking…" treatment familiar from AI chat interfaces.
 *
 * ```tsx
 * <Shimmer>Thinking…</Shimmer>
 * ```
 *
 * Set `as="view"` to shimmer arbitrary children (skeleton blocks, cards) — the
 * mask is then the rendered subtree's alpha instead of a line of text.
 */
import { useEffect, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewProps,
} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';

export interface ShimmerProps extends ViewProps {
  className?: string;
  /**
   * `text` renders `children` as a single styled string and masks the sweep to
   * the glyphs. `view` masks the sweep to whatever subtree you pass.
   */
  as?: 'text' | 'view';
  /** Milliseconds for one sweep. */
  duration?: number;
  /** Width of the highlight band, as a multiple of the content width. */
  spread?: number;
  /** Colour of the content at rest. Defaults to the theme's muted foreground. */
  baseColor?: string;
  /** Colour at the centre of the sweep. Defaults to the theme's foreground. */
  shimmerColor?: string;
  /** `loop` restarts from the left; `ping-pong` reverses on each pass. */
  mode?: 'loop' | 'ping-pong';
  /** Sweep once instead of repeating. */
  once?: boolean;
  /** Sweep right-to-left. */
  reverse?: boolean;
  /** Set false to render the content statically without animating. */
  enabled?: boolean;
  /** Extra classes for the text when `as="text"`. */
  textClassName?: string;
  /** Extra styles for the text when `as="text"`. */
  textStyle?: StyleProp<TextStyle>;
  /**
   * @deprecated Use `shimmerColor`.
   */
  color?: string;
  /**
   * Peak opacity of the highlight.
   * @deprecated Set `shimmerColor` to a colour with the alpha you want.
   */
  intensity?: number;
  children?: ReactNode;
}

export function Shimmer({
  className,
  as = 'text',
  duration = 2000,
  spread = 2,
  baseColor,
  shimmerColor,
  mode = 'loop',
  once = false,
  reverse = false,
  enabled = true,
  textClassName,
  textStyle,
  color,
  intensity,
  children,
  ...props
}: ShimmerProps) {
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  const themeMuted = useCSSVariable('--color-muted-foreground');
  const themeForeground = useCSSVariable('--color-foreground');

  const base =
    baseColor ?? (typeof themeMuted === 'string' ? themeMuted : '#a1a1aa');
  const highlight =
    shimmerColor ??
    color ??
    (typeof themeForeground === 'string' ? themeForeground : '#ffffff');

  // The band is wider than the content so the highlight ramps in and out
  // instead of appearing at full strength against the edge.
  const bandWidth = Math.max(width * spread, 1);
  const animating = enabled && !reducedMotion && width > 0;

  useEffect(() => {
    if (!animating) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }

    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.linear }),
      once ? 1 : -1,
      mode === 'ping-pong'
    );

    return () => cancelAnimation(progress);
  }, [animating, duration, mode, once, progress]);

  const sweepStyle = useAnimatedStyle(() => {
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

  const content =
    as === 'text' ? (
      <Text className={textClassName} style={[{ color: base }, textStyle]}>
        {children}
      </Text>
    ) : (
      children
    );

  // Without a measured width there is nothing to sweep across, and masking an
  // unmeasured subtree just costs a layer — render the content plainly.
  if (!animating) {
    return (
      <View {...props} onLayout={onLayout} className={className}>
        {content}
      </View>
    );
  }

  const highlightWithAlpha =
    intensity !== undefined ? withAlpha(highlight, intensity) : highlight;

  return (
    <View {...props} onLayout={onLayout} className={cn('overflow-hidden', className)}>
      <MaskedView maskElement={<View>{content}</View>}>
        {/* The mask only exposes the glyphs, so this layer is what they are
            painted with: flat base colour, plus a moving gradient band. */}
        <View style={{ backgroundColor: base }}>
          <View style={{ opacity: 0 }}>{content}</View>
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { width: bandWidth, left: 0, right: undefined },
              sweepStyle,
            ]}
          >
            <LinearGradient
              colors={[base, highlightWithAlpha, base]}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      </MaskedView>
    </View>
  );
}

Shimmer.displayName = 'Shimmer';

/** Applies an alpha to a `#rgb`/`#rrggbb`/`rgb()` colour. Supports `intensity`. */
function withAlpha(color: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));

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
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
  }

  const channels = color.match(/rgba?\(([^)]+)\)/)?.[1];
  if (channels) {
    const [r, g, b] = channels.split(',').map((part) => part.trim());
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
  }

  return color;
}
