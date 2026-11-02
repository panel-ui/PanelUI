/**
 * Marquee — content that travels across its container and never runs out.
 *
 * For a strip of logos, a ticker of prices, a row of testimonials: anything
 * whose job is to keep moving past a boundary rather than to be scrolled.
 *
 * ```tsx
 * <Marquee spacing={24} speed={40}>
 *   <View className="flex-row gap-6">
 *     {sponsors.map((s) => <Logo key={s.id} src={s.logo} />)}
 *   </View>
 * </Marquee>
 * ```
 *
 * ## How it loops
 *
 * The content is measured once, then laid out end to end enough times to cover
 * the container. One track holds every copy and it is that track, not the
 * copies, that moves. The track has a fixed copy budget: exceptionally short
 * content gets extra whitespace instead of multiplying its React subtree
 * hundreds of times. It travels exactly one layout period and starts over, so
 * the state it ends on is the state it began on and the seam never shows.
 *
 * The travel is a linear timing driven on the UI thread, so it costs nothing
 * per frame in JavaScript and keeps running while the thread is busy.
 *
 * ## Measurement needs room
 *
 * The copy that gets measured sits in a hidden scroller, because that is what
 * lets the content report the width it *wants* rather than the width the
 * container would give it. Content with no intrinsic size of its own — a child
 * stretched to `flex-1`, an image with no dimensions — measures as nothing and
 * the marquee will not start.
 *
 * ## Reading direction and reduced motion
 *
 * A horizontal marquee travels toward the end of the line, so it reverses in a
 * right-to-left subtree. `reverse` flips it again from wherever it landed.
 *
 * With the operating system set to reduce motion the content is rendered once
 * and held still. A ticker that never stops is the exact thing that setting is
 * there to turn off, so this is not a shorter animation — it is none.
 *
 * Screen readers get one copy. The rest are duplicates of content already
 * announced, and hearing a sponsor list four times over is not thoroughness.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewProps,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useDirectionSign } from '../../hooks/use-direction';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';
import {
  DEFAULT_MARQUEE_SPEED,
  marqueeCopyCount,
  normalizeMarqueeSpeed,
} from './marquee-math';
import { webDeps } from '../../primitives/web-deps';

export type MarqueeDirection = 'horizontal' | 'vertical';

type InertViewProps = ViewProps & { inert?: boolean };
const InertView = View as ComponentType<InertViewProps>;

export interface MarqueeProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** The content to repeat. Measured once, then tiled along the axis. */
  children: ReactNode;
  /**
   * Travel speed in points per second. 40 by default, which is slow enough
   * that a word stays readable as it crosses. The cycle time follows from this
   * and the measured content, so longer content takes proportionally longer
   * rather than moving faster.
   */
  speed?: number;
  /** Minimum gap between the end of one copy and the start of the next. */
  spacing?: number;
  /** Axis the content travels along. */
  direction?: MarqueeDirection;
  /**
   * Send it the other way: toward the start of the line, or upward. Applied
   * after the reading direction, not instead of it.
   */
  reverse?: boolean;
  /** Set false to hold the content where it is. */
  playing?: boolean;
  /**
   * Show the built-in user pause/play control while motion is enabled.
   *
   * Defaults to `true` on its own, and to `false` inside a `Marquee.Group` —
   * the group draws one control for everything in it, and a control per row is
   * how two of them end up stacked on top of each other.
   */
  showPauseControl?: boolean;
  /** Visible and spoken label for the moving state. */
  pauseLabel?: string;
  /** Visible and spoken label for the user-paused state. */
  playLabel?: string;
  /** Reports changes made by the built-in control. */
  onPlayingChange?: (playing: boolean) => void;
}

/**
 * Set by `Marquee.Group` so the marquees inside it stop drawing a pause control
 * each and take the group's instead.
 */
interface MarqueeGroupContextValue {
  /** True while the group's control is holding everything in it still. */
  paused: boolean;
  /**
   * How a marquee inside the group reports whether it has a loop to stop.
   *
   * The group draws one control for everything in it, and it should not offer
   * to pause content that never measured — the failure mode a marquee already
   * has, where a child with no intrinsic size never starts. Only the marquees
   * themselves know that, so they say so.
   */
  report: (id: string, live: boolean) => void;
}

const MarqueeGroupContext = createContext<MarqueeGroupContextValue | null>(null);

function MarqueeRoot({
  className,
  children,
  speed: speedProp = DEFAULT_MARQUEE_SPEED,
  spacing = 0,
  direction = 'horizontal',
  reverse = false,
  playing = true,
  showPauseControl,
  pauseLabel = 'Pause',
  playLabel = 'Play',
  onPlayingChange,
  style,
  onLayout,
  ...props
}: MarqueeProps) {
  const horizontal = direction === 'horizontal';
  const reducedMotion = useReducedMotion();
  // Only the horizontal axis has a reading direction to follow; up is up.
  const sign = useDirectionSign();
  const flip = horizontal ? sign : 1;

  const [viewport, setViewport] = useState(0);
  const [content, setContent] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const speed = normalizeMarqueeSpeed(speedProp);

  // A group's pause is the same instruction as this one's, so it is read here
  // rather than pushed down as a `playing` prop — a caller who set `playing`
  // themselves should not have it overwritten by the container.
  const group = useContext(MarqueeGroupContext);
  const showControl = showPauseControl ?? group === null;
  const moving = playing && !userPaused && !(group?.paused ?? false);

  // The distance from one copy to the same point on the next, and therefore
  // both the layout step and the exact loop length. They are the same number
  // on purpose: taking the gap from anywhere else is how a seam appears.
  const layout = useMemo(
    () => marqueeCopyCount(viewport, content, spacing),
    [viewport, content, spacing]
  );
  const { period } = layout;

  const copies = useMemo(() => {
    // Enough to span the container, plus one trailing into view and one
    // already past it — the two the travel consumes before the loop restarts.
    return Array.from({ length: layout.count }, (_, index) => index);
  }, [layout.count]);

  const offset = useSharedValue(0);

  /*
   * A re-measure is the only thing allowed to move the content back to the
   * start. The loop length has changed, so an offset taken against the old one
   * no longer means anything.
   */
  useEffect(() => {
    cancelAnimation(offset);
    offset.value = 0;
  }, [offset, period]);

  /*
   * Pausing freezes where it is. `cancelAnimation` already leaves the shared
   * value at whatever it had reached, so stopping is simply not starting again
   * — the content stays exactly where the reader stopped it, which is the
   * whole point of a pause control on something they are trying to read.
   *
   * Resuming picks up from there. The first leg is shortened to the distance
   * actually left, or the lap after a pause would run at a fraction of the
   * speed every other lap runs at.
   */
  useEffect(() => {
    cancelAnimation(offset);
    if (reducedMotion || !moving || period <= 0 || speed <= 0) return undefined;

    const cycle = (period / speed) * 1000;
    const from = ((offset.value % period) + period) % period;
    const remaining = period - from;

    offset.value = from;
    offset.value = withSequence(
      withTiming(period, { duration: cycle * (remaining / period), easing: Easing.linear }),
      // Back to the seam in no time at all. The state at `period` is the state
      // at `0`, so this is a bookkeeping step rather than a visible one.
      withTiming(0, { duration: 0 }),
      withRepeat(withTiming(period, { duration: cycle, easing: Easing.linear }), -1, false)
    );

    return () => cancelAnimation(offset);
  }, [offset, period, moving, reducedMotion, speed]);

  const trackStyle = useAnimatedStyle(() => {
    const travel = (reverse ? offset.value : -offset.value) * flip;
    return {
      transform: [horizontal ? { translateX: travel } : { translateY: travel }],
    };
  }, webDeps([horizontal, reverse, flip]));

  // The container's own measurement is what sizes the loop, so an `onLayout`
  // passed in is called alongside it rather than replacing it.
  const onContainerLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport(horizontal ? width : height);
    onLayout?.(event);
  };

  const onContentLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContent(horizontal ? width : height);
  };

  /*
   * Whether there is motion here at all: copies on screen, a speed to travel
   * them at, and a `playing` that has not already stopped it from outside. A
   * control offering to pause a still marquee is the same lie as a disabled
   * button with no reason on it.
   *
   * The copy count, not the period. Content that measured while its container
   * did not has a period — it is the content's own length — and no copies to
   * draw, because there is no width to lay them across. Asking the period
   * meant a row that renders nothing still reported itself live, and a group
   * drew a pause control for it: a marquee that is one button and no content,
   * which is the shape of the bug this replaced.
   */
  const live = playing && !reducedMotion && layout.count > 0 && speed > 0;

  // Reported to the group, if there is one, so its single control can be
  // decided the same way this one's is.
  const id = useId();
  const report = group?.report;
  useEffect(() => {
    if (!report) return undefined;
    report(id, live);
    return () => report(id, false);
  }, [report, id, live]);

  // Nothing to loop, so nothing to clip or clone: render the content plainly
  // and let it sit where it falls.
  if (reducedMotion) {
    return (
      <View
        className={cn('overflow-hidden', className)}
        style={style}
        onLayout={onLayout}
        {...props}
      >
        {children}
      </View>
    );
  }

  return (
    <View className={cn('gap-3', className)} style={style} onLayout={onLayout} {...props}>
      {/* The track, and only the track. The control below it is not clipped by
          this and does not travel with it. */}
      <View className="flex-1 overflow-hidden" onLayout={onContainerLayout}>
        {/* Measured, never seen. A scroller on this axis is what frees the
            content to report its own size instead of the container's. */}
        <ScrollView
          horizontal={horizontal}
          scrollEnabled={false}
          style={styles.measure}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <InertView
            inert={Platform.OS === 'web' ? true : undefined}
            onLayout={onContentLayout}
          >
            {children}
          </InertView>
        </ScrollView>

        <Animated.View style={[StyleSheet.absoluteFill, trackStyle]} pointerEvents="box-none">
          {copies.map((index) => {
            // Index 1 is the copy that starts flush with the container's edge,
            // and it is the one a screen reader is given.
            const spoken = index === 1;
            const at = (index - 1) * period;
            return (
              <InertView
                key={index}
                style={[styles.copy, horizontal ? { left: at } : { top: at }]}
                pointerEvents={spoken ? 'box-none' : 'none'}
                inert={Platform.OS === 'web' && !spoken ? true : undefined}
                aria-hidden={!spoken}
                accessibilityElementsHidden={!spoken}
                importantForAccessibility={spoken ? 'auto' : 'no-hide-descendants'}
              >
                {children}
              </InertView>
            );
          })}
        </Animated.View>
      </View>
      {showControl && live ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={userPaused ? playLabel : pauseLabel}
          /*
           * Below the content, in flow, the way a group's control already is.
           * Floating over the track it was clipped by the track's own
           * `overflow-hidden` — a 48pt target on a strip of badges half that
           * tall — and it covered the content it was there to let you read.
           */
          className="min-h-12 self-end items-center justify-center rounded-full border border-border bg-background px-4"
          onPress={() => {
            const next = !userPaused;
            setUserPaused(next);
            onPlayingChange?.(!next);
          }}
        >
          <Text className="text-xs font-medium text-foreground">
            {userPaused ? playLabel : pauseLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export interface MarqueeGroupProps extends ViewProps {
  className?: string;
  /** Set false to hold every marquee in the group where it is. */
  playing?: boolean;
  /** Show the group's pause/play control. */
  showPauseControl?: boolean;
  /** Visible and spoken label for the moving state. */
  pauseLabel?: string;
  /** Visible and spoken label for the user-paused state. */
  playLabel?: string;
  /** Reports changes made by the group's control. */
  onPlayingChange?: (playing: boolean) => void;
  children?: ReactNode;
}

/**
 * Rows of travelling content that stop and start together, under one control.
 *
 * Moving content needs a way to stop it, so a marquee draws its own pause
 * button. Stacked — two rows of logos travelling against each other — that is
 * one button per row, each pinned to its own bottom corner, and the upper one
 * lands on top of the row beneath it. Two buttons for one piece of motion, and
 * one of them covering the content it belongs to.
 *
 * A group is the answer to both: the marquees inside it stop drawing their own
 * control, and the group draws a single one below them rather than over them.
 *
 * ```tsx
 * <Marquee.Group>
 *   <Marquee>{topRow}</Marquee>
 *   <Marquee reverse>{bottomRow}</Marquee>
 * </Marquee.Group>
 * ```
 *
 * Each marquee keeps its own `playing` prop. The group's pause is an additional
 * hold, not a replacement — a row already held still stays still.
 */
function MarqueeGroup({
  className,
  children,
  playing = true,
  showPauseControl = true,
  pauseLabel = 'Pause',
  playLabel = 'Play',
  onPlayingChange,
  ...props
}: MarqueeGroupProps) {
  const [userPaused, setUserPaused] = useState(false);
  const [liveRows, setLiveRows] = useState<ReadonlySet<string>>(() => new Set());
  const reducedMotion = useReducedMotion();

  // Each marquee inside says whether it has a loop to stop, and the group's
  // control is drawn only if at least one of them does.
  const report = useCallback((id: string, live: boolean) => {
    setLiveRows((current) => {
      if (current.has(id) === live) return current;
      const next = new Set(current);
      if (live) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ paused: userPaused, report }), [userPaused, report]);

  // Nothing is moving, so there is nothing to stop. The control is not hidden
  // to save space — offering to pause content that is already still is the
  // same lie as a disabled button with no reason on it.
  const showControl = showPauseControl && playing && !reducedMotion && liveRows.size > 0;

  return (
    <MarqueeGroupContext.Provider value={value}>
      <View {...props} className={cn('w-full gap-3', className)}>
        {children}
        {showControl ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={userPaused ? playLabel : pauseLabel}
            // In flow and at the end, not floating over the last row. The
            // control belongs to the group, and a group's control that covers
            // one of its members is describing itself as part of that member.
            className="min-h-12 self-end items-center justify-center rounded-full border border-border bg-background px-4"
            onPress={() => {
              const next = !userPaused;
              setUserPaused(next);
              onPlayingChange?.(!next);
            }}
          >
            <Text className="text-xs font-medium text-foreground">
              {userPaused ? playLabel : pauseLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </MarqueeGroupContext.Provider>
  );
}
MarqueeGroup.displayName = 'Marquee.Group';

MarqueeRoot.displayName = 'Marquee';

export const Marquee = Object.assign(MarqueeRoot, {
  Group: MarqueeGroup,
});

const styles = StyleSheet.create({
  /* Laid out so it measures, hidden so it does not draw, and behind everything
     so it can never intercept anything. */
  measure: { opacity: 0, zIndex: -1 },
  copy: { position: 'absolute' },
});
