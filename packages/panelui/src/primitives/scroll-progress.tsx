/**
 * ScrollProgress — publishes a scroll container's position so children can
 * animate against it.
 *
 * Scroll-driven effects all need the same two numbers: where the scroller is,
 * and how tall its viewport is. Every component that wanted them measuring for
 * itself would mean one scroll listener per effect and one measurement pass per
 * effect per frame, for two values that are the same for all of them.
 *
 * It wraps the scroll view you already have rather than replacing it — the
 * child is cloned with an animated scroll handler composed onto it, the same
 * way `ScrollFade` does — so a `FlatList`, a `SectionList` or your own
 * scrollable all work, and nothing has to be rewritten to adopt it.
 *
 * ```tsx
 * <ScrollProgress>
 *   <ScrollView>
 *     <ScrollText>…</ScrollText>
 *   </ScrollView>
 * </ScrollProgress>
 * ```
 *
 * Both values are shared values, so the whole chain from scroll event to
 * animated style stays on the UI thread and nothing re-renders as you scroll.
 */
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useMemo,
  useRef,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from 'react';
import { View, type LayoutChangeEvent, type ViewProps } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useComposedEventHandler,
  useSharedValue,
  type AnimatedScrollViewProps,
  type SharedValue,
} from 'react-native-reanimated';

export interface ScrollProgressValue {
  /** Distance scrolled, in pixels. */
  offset: SharedValue<number>;
  /** Height of the visible area. */
  viewport: SharedValue<number>;
  /** Total height of the content. */
  content: SharedValue<number>;
  /**
   * Window-space top edge of the scroller. What turns an element's measured
   * `pageY` into a position inside *this* viewport rather than the screen's —
   * they differ by whatever sits above the scroller, and assuming they do not
   * is why scroll effects drift under a header.
   */
  top: SharedValue<number>;
}

const ScrollProgressContext = createContext<ScrollProgressValue | null>(null);

/**
 * The nearest enclosing scroll container's position, or `null` outside one.
 *
 * It returns null rather than throwing because every consumer of this also
 * takes an explicit `progress` prop — a component that can be driven by hand
 * should not insist on a provider it does not need.
 */
export function useScrollProgress(): ScrollProgressValue | null {
  return useContext(ScrollProgressContext);
}

interface ScrollableProps {
  onScroll?: AnimatedScrollViewProps['onScroll'];
  onLayout?: (event: LayoutChangeEvent) => void;
  onContentSizeChange?: (width: number, height: number) => void;
  scrollEventThrottle?: number;
}

export interface ScrollProgressProps extends ViewProps {
  className?: string;
  /** Exactly one scrollable — a ScrollView, FlatList, or anything like them. */
  children?: ReactNode;
}

export function ScrollProgress({ className, children, ...props }: ScrollProgressProps) {
  const offset = useSharedValue(0);
  const viewport = useSharedValue(0);
  const content = useSharedValue(0);
  const top = useSharedValue(0);
  const hostRef = useRef<View>(null);

  const child = Children.only(children) as ReactElement<ScrollableProps>;

  // Reanimated can only drive a scroll handler on an animated component, and
  // what was passed in is not necessarily `Animated.ScrollView`. Keyed on the
  // element *type*, not the element: rebuilding the wrapper would remount the
  // list and lose its scroll position.
  const childType = isValidElement(child)
    ? (child.type as ComponentType<ScrollableProps>)
    : null;
  const AnimatedScrollable = useMemo(
    () => (childType ? Animated.createAnimatedComponent(childType) : null),
    [childType]
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      offset.value = event.contentOffset.y;
      viewport.value = event.layoutMeasurement.height;
      content.value = event.contentSize.height;
    },
  });

  // A consumer's own `onScroll` is composed rather than dropped — but since the
  // child is now an animated component, it has to be an animated handler too.
  const onScroll = useComposedEventHandler([
    scrollHandler,
    (child.props.onScroll as typeof scrollHandler | undefined) ?? null,
  ]);

  // Taken up front as well as on scroll, so anything already on screen animates
  // from the first frame instead of waiting for the first scroll event.
  const onLayout = (event: LayoutChangeEvent) => {
    viewport.value = event.nativeEvent.layout.height;
    // A frame later than onLayout on both platforms, because measureInWindow
    // is only meaningful once the view is attached and positioned.
    requestAnimationFrame(() => {
      hostRef.current?.measureInWindow((_x, y) => {
        if (y >= 0) top.value = y;
      });
    });
    child.props.onLayout?.(event);
  };

  const onContentSizeChange = (width: number, height: number) => {
    content.value = height;
    child.props.onContentSizeChange?.(width, height);
  };

  const value = useMemo<ScrollProgressValue>(
    () => ({ offset, viewport, content, top }),
    [offset, viewport, content, top]
  );

  return (
    <ScrollProgressContext.Provider value={value}>
      <View {...props} ref={hostRef} className={className}>
        {AnimatedScrollable && isValidElement(child) ? (
          <AnimatedScrollable
            {...child.props}
            onScroll={onScroll}
            onLayout={onLayout}
            onContentSizeChange={onContentSizeChange}
            scrollEventThrottle={child.props.scrollEventThrottle ?? 16}
          />
        ) : (
          child
        )}
      </View>
    </ScrollProgressContext.Provider>
  );
}

ScrollProgress.displayName = 'ScrollProgress';
