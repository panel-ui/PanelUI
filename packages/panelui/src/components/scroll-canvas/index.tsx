/**
 * ScrollCanvas — an image frame whose contents move as you scroll past it.
 *
 * The counterpart to `ScrollText`: same scrubbed reveal, applied to a picture
 * instead of a sentence. The frame stays where the layout puts it and the image
 * moves *inside* it, which is what separates a parallax from a thing sliding
 * about the page.
 *
 * ```tsx
 * <ScrollProgress>
 *   <ScrollView>
 *     <ScrollCanvas source={{ uri }} effect="parallax" />
 *   </ScrollView>
 * </ScrollProgress>
 * ```
 *
 * Four effects, and they are four different jobs:
 *
 * - **`parallax`** — the image drifts against the scroll, so the frame reads as
 *   a window onto something further away.
 * - **`zoom`** — it settles from slightly oversized to its natural size.
 * - **`reveal`** — a wipe uncovers it from the bottom edge up.
 * - **`sequence`** — the scroll position picks a frame out of a series, so the
 *   reader scrubs an animation with their thumb.
 *
 * "Canvas" here is the frame the pictures move behind, not a drawing surface —
 * nothing is rasterised, and there is no `<canvas>` anywhere near it.
 */
import { Image, View, type ImageSourcePropType, type ViewProps } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  type SharedValue,
} from 'react-native-reanimated';
import { useRevealProgress } from '../../hooks/use-reveal-progress';
import { cn } from '../../utils/cn';

const AnimatedImage = Animated.createAnimatedComponent(Image);

/**
 * How much taller than the frame a parallaxing image is drawn.
 *
 * The image has to be oversized or drifting it exposes an edge. This is the
 * budget the drift is spent out of, so the two are set together — raising
 * `distance` past what this affords is what puts a bare strip on screen.
 */
const PARALLAX_OVERSCAN = 1.25;

/** How far a parallaxing image drifts, as a fraction of the frame's height. */
const PARALLAX_TRAVEL = 0.1;

export type ScrollCanvasEffect = 'parallax' | 'zoom' | 'reveal' | 'sequence';

export interface ScrollCanvasProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** The image. Ignored by `sequence`, which reads `sources` instead. */
  source?: ImageSourcePropType;
  /**
   * The frames a `sequence` scrubs through, in order. Keep it to a couple of
   * dozen — every frame is a decoded bitmap held in memory for the whole time
   * the canvas is mounted.
   */
  sources?: ImageSourcePropType[];
  /** Which of the four scroll effects to apply. */
  effect?: ScrollCanvasEffect;
  /** Width ÷ height of the frame. */
  aspectRatio?: number;
  /** Multiplier on how far the effect travels. */
  distance?: number;
  /**
   * Where down the viewport the frame's top sits when the effect starts, as a
   * fraction of the viewport height.
   */
  start?: number;
  /** Where its bottom sits when the effect completes. Smaller is a longer scrub. */
  end?: number;
  /** Drive the effect from a value of your own rather than from scroll. */
  progress?: SharedValue<number>;
  /** Set false to render the image plainly. */
  enabled?: boolean;
  /** Extra classes for the image itself, rather than the frame around it. */
  imageClassName?: string;
}

export function ScrollCanvas({
  className,
  imageClassName,
  source,
  sources,
  effect = 'parallax',
  aspectRatio = 16 / 10,
  distance = 1,
  start = 1,
  end = 0.3,
  progress: external,
  enabled = true,
  style,
  ...props
}: ScrollCanvasProps) {
  const reducedMotion = useReducedMotion();
  const active = enabled && !reducedMotion;

  const { ref, progress } = useRevealProgress({
    start,
    end,
    progress: external,
    enabled: active,
  });

  const frames = sources ?? (source ? [source] : []);

  const imageStyle = useAnimatedStyle(() => {
    const p = progress.value;

    if (effect === 'zoom') {
      return { transform: [{ scale: interpolate(p, [0, 1], [1 + 0.12 * distance, 1]) }] };
    }
    if (effect === 'parallax') {
      // Centred at half travel, so the drift is symmetric about the frame and
      // the overscan is spent evenly at both ends instead of all at one.
      const travel = PARALLAX_TRAVEL * distance * 100;
      // A percentage of the image's own height, so the drift stays in
      // proportion to the overscan whatever size the frame ends up.
      return {
        transform: [{ translateY: `${interpolate(p, [0, 1], [travel, -travel])}%` }],
      };
    }
    return {};
  });

  // A wipe rather than a fade: the frame keeps its shape while it fills, so the
  // layout never moves. Implemented as a cover that retreats, because animating
  // a height would relayout the image inside it every frame.
  const coverStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: `${-progress.value * 100}%` }],
  }));

  return (
    <View
      {...props}
      ref={ref}
      style={[{ aspectRatio }, style]}
      className={cn('w-full overflow-hidden rounded-2xl bg-muted', className)}
    >
      {effect === 'sequence' ? (
        frames.map((frame, index) => (
          <SequenceFrame
            key={index}
            source={frame}
            index={index}
            count={frames.length}
            progress={progress}
            className={imageClassName}
          />
        ))
      ) : (
        <AnimatedImage
          source={frames[0]!}
          resizeMode="cover"
          className={cn('h-full w-full', imageClassName)}
          style={[
            // Only the parallax is oversized. Growing the others would crop
            // them for no reason — nothing is drifting to expose an edge.
            effect === 'parallax'
              ? { height: `${PARALLAX_OVERSCAN * 100}%`, top: `${(1 - PARALLAX_OVERSCAN) * 50}%` }
              : null,
            imageStyle,
          ]}
        />
      )}

      {effect === 'reveal' ? (
        <Animated.View
          pointerEvents="none"
          className="absolute inset-0 bg-background"
          style={coverStyle}
        />
      ) : null}
    </View>
  );
}

ScrollCanvas.displayName = 'ScrollCanvas';

/**
 * One frame of a sequence.
 *
 * Every frame is mounted and its opacity switched, rather than one image whose
 * source is swapped. A swap crosses back into JS for each step and then waits
 * on a decode, so a fast scrub shows the previous frame or nothing at all;
 * mounted frames scrub on the UI thread with no decode left to do.
 */
function SequenceFrame({
  source,
  index,
  count,
  progress,
  className,
}: {
  source: ImageSourcePropType;
  index: number;
  count: number;
  progress: SharedValue<number>;
  className?: string;
}) {
  const style = useAnimatedStyle(() => {
    // The frame that owns this slice of the scroll is the visible one. Hard
    // steps, not a crossfade — two frames of an animation overlaid at half
    // opacity is a double exposure, not a tween.
    const current = Math.min(count - 1, Math.floor(progress.value * count));
    return { opacity: current === index ? 1 : 0 };
  });

  return (
    <Animated.View className="absolute inset-0" style={style}>
      <Image source={source} resizeMode="cover" className={cn('h-full w-full', className)} />
    </Animated.View>
  );
}
