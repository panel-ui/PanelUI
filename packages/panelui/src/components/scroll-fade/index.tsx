/**
 * ScrollFade — fades the edges of a scroll container.
 *
 * The React Native equivalent of shadcn-ui/ui's `scroll-fade` utility
 * (https://ui.shadcn.com/docs/utils/scroll-fade), which is CSS `mask-image`
 * driven by a scroll timeline. React Native has neither masks nor scroll
 * timelines, so the fades are SVG gradients overlaid on each edge, with their
 * opacity following the scroll position.
 *
 * Composition follows heroui-native's ScrollShadow: wrap the scrollable and
 * let the orientation be inferred from its `horizontal` prop.
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
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewProps,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';

/** Past this many pixels from an edge, that edge's fade is fully shown. */
const FADE_IN_DISTANCE = 24;

export interface ScrollFadeProps extends ViewProps {
  className?: string;
  /** Depth of the fade in pixels. */
  size?: number;
  /** Which edges fade. */
  edges?: 'both' | 'start' | 'end';
  /**
   * Colour the fade resolves to — normally whatever sits behind the
   * scrollable. Defaults to the theme's background.
   */
  color?: string;
  children?: ReactNode;
}

interface ScrollableProps {
  horizontal?: boolean;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
}

export function ScrollFade({
  className,
  size = 48,
  edges = 'both',
  color,
  children,
  ...props
}: ScrollFadeProps) {
  const [startOpacity, setStartOpacity] = useState(0);
  const [endOpacity, setEndOpacity] = useState(0);

  const themeBackground = useCSSVariable('--color-background');
  const fadeColor =
    color ?? (typeof themeBackground === 'string' ? themeBackground : '#000000');

  const child = Children.only(children) as ReactElement<ScrollableProps>;
  const horizontal = isValidElement(child) ? !!child.props.horizontal : false;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const offset = horizontal ? contentOffset.x : contentOffset.y;
    const total = horizontal ? contentSize.width : contentSize.height;
    const visible = horizontal ? layoutMeasurement.width : layoutMeasurement.height;
    const remaining = total - visible - offset;

    // Each edge fades in over the first FADE_IN_DISTANCE px of travel, so an
    // edge with nothing past it shows nothing.
    setStartOpacity(Math.min(offset / FADE_IN_DISTANCE, 1));
    setEndOpacity(Math.min(Math.max(remaining, 0) / FADE_IN_DISTANCE, 1));

    child.props.onScroll?.(event);
  };

  const scrollable = isValidElement(child)
    ? cloneElement(child, {
        onScroll: handleScroll,
        scrollEventThrottle: child.props.scrollEventThrottle ?? 16,
      })
    : child;

  const showStart = edges !== 'end';
  const showEnd = edges !== 'start';

  return (
    <View {...props} className={className}>
      {scrollable}

      {showStart ? (
        <Fade
          color={fadeColor}
          size={size}
          horizontal={horizontal}
          opacity={startOpacity}
          edge="start"
        />
      ) : null}
      {showEnd ? (
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
  opacity: number;
  edge: 'start' | 'end';
}) {
  const isStart = edge === 'start';
  const id = `scroll-fade-${edge}-${horizontal ? 'x' : 'y'}`;

  const position = horizontal
    ? { top: 0, bottom: 0, width: size, ...(isStart ? { left: 0 } : { right: 0 }) }
    : { left: 0, right: 0, height: size, ...(isStart ? { top: 0 } : { bottom: 0 }) };

  // The gradient runs from the screen edge inwards, so it is reversed on the
  // end edge.
  const [x2, y2] = horizontal ? [1, 0] : [0, 1];

  return (
    <View pointerEvents="none" style={{ position: 'absolute', opacity, ...position }}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2={String(x2)} y2={String(y2)}>
            <Stop offset="0" stopColor={color} stopOpacity={isStart ? 1 : 0} />
            <Stop offset="1" stopColor={color} stopOpacity={isStart ? 0 : 1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
