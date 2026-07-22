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
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';

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

export interface UseScrollSectionsResult {
  /** Attach to the ScrollView, so `scrollTo` has something to drive. */
  ref: React.RefObject<ScrollView | null>;
  /** The section being read. */
  active: string | undefined;
  /** Spread onto the ScrollView. */
  scrollProps: {
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    scrollEventThrottle: number;
  };
  /** `onLayout` for a section's wrapper: `onLayout={measure(id)}`. */
  measure: (id: string) => (event: LayoutChangeEvent) => void;
  /** Scroll a section to the top. Pass straight to a rail's `onValueChange`. */
  scrollTo: (id: string) => void;
}

export function useScrollSections({
  ids,
  offset = 120,
  endThreshold = 24,
  scrollPadding = 0,
}: UseScrollSectionsOptions): UseScrollSectionsResult {
  const ref = useRef<ScrollView | null>(null);
  const offsets = useRef<Record<string, number>>({});
  const [active, setActive] = useState<string | undefined>(ids[0]);

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

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
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
    [offset, endThreshold]
  );

  const scrollTo = useCallback(
    (id: string) => {
      const top = offsets.current[id];
      if (top === undefined) return;
      setActive(id);
      ref.current?.scrollTo({ y: Math.max(top - scrollPadding, 0), animated: true });
    },
    [scrollPadding]
  );

  const scrollProps = useMemo(
    () => ({ onScroll, scrollEventThrottle: 16 }),
    [onScroll]
  );

  return { ref, active, scrollProps, measure, scrollTo };
}
