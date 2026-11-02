/**
 * useScrollSections — tracks which section of a scroll view you are reading.
 *
 * The active section is the last one whose top has passed a reading line a
 * little way down the viewport, so the heading you have just scrolled past
 * still counts as the one you are in.
 *
 * That rule alone has a hole at the end, and it is the hole every hand-rolled
 * scrollspy has: the final section's top may never reach the reading line,
 * because the content runs out first. Its bar then only lights up if you
 * over-scroll past the bottom. So being at the bottom of the scroll view is
 * treated as being in the last section outright — there is no more scrolling
 * left with which to get there.
 *
 * ```tsx
 * const sections = useScrollSections({ ids: SECTIONS.map((s) => s.id) });
 *
 * <ScrollView ref={sections.ref} {...sections.scrollProps}>
 *   {SECTIONS.map((section) => (
 *     <View key={section.id} onLayout={sections.measure(section.id)}>…</View>
 *   ))}
 * </ScrollView>
 *
 * <SectionRail value={sections.active} onValueChange={sections.scrollTo}>…</SectionRail>
 * ```
 *
 * It also publishes the scroll position itself, as `scroll`, so a component
 * that wants a percentage as well as a section name does not need a second
 * scroll listener to get one. The three values are everything a fraction is
 * made of, and they come out of the event this hook is already handling.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import type { ScrollViewRef } from '../primitives/refs';

export interface UseScrollSectionsOptions {
  /** Section ids, in the order they appear down the page. */
  ids: string[];
  /**
   * How far down the viewport the reading line sits, in pixels. Larger values
   * switch to the next section later.
   */
  offset?: number;
  /** How close to the bottom counts as "at the bottom", in pixels. */
  endThreshold?: number;
  /** Extra gap left above a section when scrolling to it. */
  scrollPadding?: number;
}

/**
 * Where the scroller is, as shared values.
 *
 * Written from the scroll handler on the JavaScript thread, which is where the
 * section tracking already runs — so they arrive at `scrollEventThrottle`
 * rather than every frame, and anything reading them should ease towards the
 * value rather than jumping to it.
 */
export interface ScrollSectionsPosition {
  /** Distance scrolled, in points. */
  offset: SharedValue<number>;
  /** Height of the visible area. */
  viewport: SharedValue<number>;
  /** Total height of the content. */
  content: SharedValue<number>;
}

export interface UseScrollSectionsResult {
  /** Attach to the ScrollView, so `scrollTo` has something to drive. */
  ref: React.RefObject<ScrollViewRef | null>;
  /** The section being read. */
  active: string | undefined;
  /**
   * The scroll position, for anything that needs how far through the page the
   * reader is rather than which part of it they are in.
   */
  scroll: ScrollSectionsPosition;
  /** Spread onto the ScrollView. */
  scrollProps: {
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    onMomentumScrollEnd: () => void;
    onLayout: (event: LayoutChangeEvent) => void;
    onContentSizeChange: (width: number, height: number) => void;
    scrollEventThrottle: number;
  };
  /** `onLayout` for a section's wrapper: `onLayout={measure(id)}`. */
  measure: (id: string) => (event: LayoutChangeEvent) => void;
  /** Scroll a section to the top. Pass straight to a rail's `onValueChange`. */
  scrollTo: (id: string) => void;
}

/**
 * How long a programmatic scroll is given to arrive before the scroll handler
 * starts believing positions again. Only reached when the scroll had nowhere to
 * go and no momentum end ever fires.
 */
const JUMP_TIMEOUT = 900;

export function useScrollSections({
  ids,
  offset = 120,
  endThreshold = 24,
  scrollPadding = 0,
}: UseScrollSectionsOptions): UseScrollSectionsResult {
  const ref = useRef<ScrollViewRef | null>(null);
  const offsets = useRef<Record<string, number>>({});
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [active, setActive] = useState<string | undefined>(ids[0]);

  const scrollOffset = useSharedValue(0);
  const viewport = useSharedValue(0);
  const content = useSharedValue(0);

  // Read inside the scroll handler, which must not be re-created on every
  // render — a new handler each frame would defeat the throttle.
  const idsRef = useRef(ids);
  idsRef.current = ids;

  const measure = useCallback(
    (id: string) => (event: LayoutChangeEvent) => {
      offsets.current[id] = event.nativeEvent.layout.y;
    },
    []
  );

  /*
   * The section a `scrollTo` is travelling to, while it is still travelling.
   *
   * An animated scroll passes every section between here and there, and the
   * scroll handler cannot tell those apart from sections the reader arrived at
   * themselves — so it reported each one as active in turn. Downstream that is
   * a real change of section every 16ms: a rail lighting up rows nobody chose,
   * a haptic for each, and a jump that ends somewhere the reader watched it
   * pass through. None of it happened; the reader asked for one section.
   */
  const jumpingTo = useRef<string | null>(null);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;

      /*
       * The position is published before the jump guard, not after it.
       *
       * A jump is still travel: the page really is moving under the reader, and
       * a progress indicator that froze for the length of the animation would
       * be reporting something that is not true. What the guard protects is the
       * *section*, which the reader chose and which should not flicker through
       * every heading the scroll passes on the way there.
       */
      scrollOffset.value = contentOffset.y;
      viewport.value = layoutMeasurement.height;
      content.value = contentSize.height;

      // Mid-jump, the position is the animation's and not the reader's.
      if (jumpingTo.current !== null) return;

      const list = idsRef.current;
      if (!list.length) return;

      const atEnd =
        contentOffset.y + layoutMeasurement.height >= contentSize.height - endThreshold;
      if (atEnd) {
        setActive(list[list.length - 1]);
        return;
      }

      const line = contentOffset.y + offset;
      let current = list[0];
      for (const id of list) {
        const top = offsets.current[id];
        if (top !== undefined && top <= line) current = id;
      }
      setActive(current);
    },
    [offset, endThreshold, scrollOffset, viewport, content]
  );

  /*
   * Seeded at layout as well as on scroll, so a page that has not been touched
   * yet still reports a viewport and a content height. Without these the
   * fraction is zero over zero until the first scroll event, and anything
   * drawing it starts by being wrong rather than by being empty.
   */
  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewport.value = event.nativeEvent.layout.height;
    },
    [viewport]
  );

  const onContentSizeChange = useCallback(
    (_width: number, height: number) => {
      content.value = height;
    },
    [content]
  );

  const scrollTo = useCallback(
    (id: string) => {
      const top = offsets.current[id];
      if (top === undefined) return;
      jumpingTo.current = id;
      if (settle.current) clearTimeout(settle.current);
      /*
       * A backstop, not the normal way out. `onMomentumScrollEnd` does not fire
       * for a scroll that had nowhere to go — a jump to the section already on
       * screen — and without this the handler would stay muted for good.
       */
      settle.current = setTimeout(() => {
        jumpingTo.current = null;
      }, JUMP_TIMEOUT);
      setActive(id);
      ref.current?.scrollTo({ y: Math.max(top - scrollPadding, 0), animated: true });
    },
    [scrollPadding]
  );

  const onMomentumScrollEnd = useCallback(() => {
    if (settle.current) {
      clearTimeout(settle.current);
      settle.current = null;
    }
    jumpingTo.current = null;
  }, []);

  useEffect(
    () => () => {
      if (settle.current) clearTimeout(settle.current);
    },
    []
  );

  const scrollProps = useMemo(
    () => ({
      onScroll,
      onMomentumScrollEnd,
      onLayout,
      onContentSizeChange,
      scrollEventThrottle: 16,
    }),
    [onScroll, onMomentumScrollEnd, onLayout, onContentSizeChange]
  );

  const scroll = useMemo<ScrollSectionsPosition>(
    () => ({ offset: scrollOffset, viewport, content }),
    [scrollOffset, viewport, content]
  );

  return { ref, active, scroll, scrollProps, measure, scrollTo };
}
