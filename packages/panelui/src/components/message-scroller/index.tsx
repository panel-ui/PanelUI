/**
 * MessageScroller — the scroll behaviour a chat transcript needs.
 *
 * A transcript is the one list where the interesting end is the bottom, the
 * content grows while you are reading it, and history is added to the top. A
 * plain scroll view gets all three wrong: it opens at the top, it stays put
 * while a reply streams in below the fold, and it jumps a screen when older
 * messages load. This owns those three behaviours so a screen does not have to
 * rebuild them.
 *
 * ```tsx
 * <MessageScroller autoScroll className="flex-1">
 *   <MessageScroller.Viewport>
 *     <MessageScroller.Content>
 *       {messages.map((m) => (
 *         <MessageScroller.Item key={m.id} messageId={m.id} scrollAnchor={m.role === 'user'}>
 *           <Message>…</Message>
 *         </MessageScroller.Item>
 *       ))}
 *     </MessageScroller.Content>
 *   </MessageScroller.Viewport>
 *   <MessageScroller.Button />
 * </MessageScroller>
 * ```
 *
 * The rule behind every part of it: **the reader's position is theirs**. New
 * content follows the bottom only while they are already at the bottom, and
 * scrolling away hands control back to them until they ask for it again.
 * Content added above them never moves what they are looking at.
 *
 * Needs a bounded height — from `flex-1` in a column, or an explicit one.
 * Given an unbounded parent it grows to fit its content and never scrolls.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { View, type LayoutChangeEvent, type ViewProps } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type AnimatedScrollViewProps,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';
import { ChevronDownIcon } from '../../icons';
import { AnimatedPressable } from '../../primitives/animated-pressable';
import { cn } from '../../utils/cn';

/** Within this many pixels of the bottom still counts as being at the bottom. */
const END_THRESHOLD = 24;
/**
 * How much of the previous turn is left showing above an anchored one. Scrolling
 * a turn flush to the top reads as content having been cut off; a sliver of the
 * message before it says "this is where you are", not "this is the beginning".
 */
const ANCHOR_PEEK = 24;

export type MessageScrollerPosition = 'start' | 'end' | 'last-anchor';

interface MessageScrollerContextValue {
  scrollRef: ReturnType<typeof useAnimatedRef<Animated.ScrollView>>;
  /** 1 while the reader is at the live edge, 0 otherwise. Drives the button. */
  atEnd: ReturnType<typeof useSharedValue<number>>;
  atEndJS: boolean;
  setAtEndJS: (atEnd: boolean) => void;
  autoScroll: boolean;
  preserveScrollOnPrepend: boolean;
  defaultScrollPosition: MessageScrollerPosition;
  /** id → y offset inside the content, written by each Item on layout. */
  itemY: React.RefObject<Map<string, number>>;
  anchors: React.RefObject<string[]>;
  /** Whether new content should pull the viewport down with it. */
  following: React.RefObject<boolean>;
  registerItem: (id: string, y: number, anchor: boolean) => void;
  unregisterItem: (id: string) => void;
  scrollToEnd: (animated?: boolean) => void;
  scrollToStart: (animated?: boolean) => void;
  scrollToMessage: (id: string, animated?: boolean) => void;
  currentAnchorId: string | null;
  setCurrentAnchorId: (id: string | null) => void;
}

const MessageScrollerContext = createContext<MessageScrollerContextValue | null>(null);

function useScroller(component: string): MessageScrollerContextValue {
  const context = useContext(MessageScrollerContext);
  if (!context) {
    throw new Error(`${component} must be used within a <MessageScroller>`);
  }
  return context;
}

/** Scroll commands, for a control that lives outside the viewport. */
export function useMessageScroller() {
  const { scrollToEnd, scrollToStart, scrollToMessage } = useScroller('useMessageScroller');
  return { scrollToEnd, scrollToStart, scrollToMessage };
}

/**
 * Where the reader is: the turn they are inside, and whether they are at the
 * live edge. Both settle after a scroll rather than updating per frame — this
 * is for a header that names the current turn, not for anything animated.
 */
export function useMessageScrollerVisibility() {
  const { currentAnchorId, atEndJS } = useScroller('useMessageScrollerVisibility');
  return { currentAnchorId, atEnd: atEndJS };
}

export interface MessageScrollerProps extends ViewProps {
  className?: string;
  /**
   * Follow new content down as it arrives — but only while the reader is
   * already at the bottom. Scrolling up disengages it until they come back or
   * press the button.
   */
  autoScroll?: boolean;
  /**
   * Keep the reader on the same message when older ones are added above. Without
   * it, loading history throws them a screen backwards.
   */
  preserveScrollOnPrepend?: boolean;
  /**
   * Where a freshly mounted transcript opens. `last-anchor` is the one to want
   * for a saved thread: it lands on the last turn that started something,
   * rather than at the very bottom of whatever the reply happened to be.
   */
  defaultScrollPosition?: MessageScrollerPosition;
  children?: ReactNode;
}

function MessageScrollerRoot({
  className,
  autoScroll = false,
  preserveScrollOnPrepend = true,
  defaultScrollPosition = 'end',
  children,
  ...props
}: MessageScrollerProps) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const atEnd = useSharedValue(1);
  const [atEndJS, setAtEndJS] = useState(true);
  const [currentAnchorId, setCurrentAnchorId] = useState<string | null>(null);

  const itemY = useRef(new Map<string, number>());
  const anchors = useRef<string[]>([]);
  const following = useRef(autoScroll);

  const registerItem = useCallback((id: string, y: number, anchor: boolean) => {
    itemY.current.set(id, y);
    const list = anchors.current;
    if (anchor && !list.includes(id)) list.push(id);
    if (!anchor && list.includes(id)) anchors.current = list.filter((a) => a !== id);
  }, []);

  const unregisterItem = useCallback((id: string) => {
    itemY.current.delete(id);
    anchors.current = anchors.current.filter((a) => a !== id);
  }, []);

  const scrollToEnd = useCallback(
    (animated = true) => {
      following.current = true;
      scrollRef.current?.scrollToEnd({ animated });
    },
    [scrollRef]
  );

  const scrollToStart = useCallback(
    (animated = true) => {
      following.current = false;
      scrollRef.current?.scrollTo({ y: 0, animated });
    },
    [scrollRef]
  );

  const scrollToMessage = useCallback(
    (id: string, animated = true) => {
      const y = itemY.current.get(id);
      if (y === undefined) return;
      following.current = false;
      scrollRef.current?.scrollTo({ y: Math.max(0, y - ANCHOR_PEEK), animated });
    },
    [scrollRef]
  );

  const context = useMemo<MessageScrollerContextValue>(
    () => ({
      scrollRef,
      atEnd,
      atEndJS,
      setAtEndJS,
      autoScroll,
      preserveScrollOnPrepend,
      defaultScrollPosition,
      itemY,
      anchors,
      following,
      registerItem,
      unregisterItem,
      scrollToEnd,
      scrollToStart,
      scrollToMessage,
      currentAnchorId,
      setCurrentAnchorId,
    }),
    [
      scrollRef,
      atEnd,
      atEndJS,
      autoScroll,
      preserveScrollOnPrepend,
      defaultScrollPosition,
      registerItem,
      unregisterItem,
      scrollToEnd,
      scrollToStart,
      scrollToMessage,
      currentAnchorId,
    ]
  );

  return (
    <MessageScrollerContext.Provider value={context}>
      <View className={cn('relative overflow-hidden', className)} {...props}>
        {children}
      </View>
    </MessageScrollerContext.Provider>
  );
}
MessageScrollerRoot.displayName = 'MessageScroller';

/**
 * The four scroll events are owned by the component and taken off the props
 * type rather than merged with a consumer's. They are not decoration on top of
 * a scroll view — they *are* the behaviour, and a call site that quietly
 * replaced one would look like a bug in the scrolling.
 */
export interface MessageScrollerViewportProps
  extends Omit<
    AnimatedScrollViewProps,
    'onScroll' | 'onScrollEndDrag' | 'onMomentumScrollEnd' | 'onContentSizeChange'
  > {
  className?: string;
  children?: ReactNode;
}

/**
 * The scrollable itself. Owns the three behaviours, because all three are
 * reactions to scroll and content-size events and this is where they arrive.
 */
function MessageScrollerViewport({
  className,
  children,
  ...props
}: MessageScrollerViewportProps) {
  const {
    scrollRef,
    atEnd,
    setAtEndJS,
    autoScroll,
    preserveScrollOnPrepend,
    defaultScrollPosition,
    itemY,
    anchors,
    following,
    scrollToEnd,
    scrollToMessage,
    setCurrentAnchorId,
  } = useScroller('MessageScroller.Viewport');

  const contentHeight = useRef(0);
  const previousY = useRef(new Map<string, number>());
  const opened = useRef(false);
  /*
   * The live scroll offset, written on the UI thread and read straight from JS
   * when the prepend correction needs it. A shared value rather than a ref
   * updated through `runOnJS`: this is read a few times a second and written
   * sixty, so the cheap side should be the write.
   */
  const offsetY = useSharedValue(0);

  /*
   * The at-end test runs per frame on the UI thread, but it only ever produces
   * a boolean — so JS is told about it when the boolean flips, not when the
   * offset changes. A transcript scrolls constantly; re-rendering on every
   * frame of it would be the most expensive thing on the screen.
   */
  const publishAtEnd = useCallback(
    (next: boolean) => {
      following.current = autoScroll && next;
      setAtEndJS(next);
    },
    [autoScroll, following, setAtEndJS]
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const { contentOffset, contentSize, layoutMeasurement } = event;
      offsetY.value = contentOffset.y;

      const distance = contentSize.height - layoutMeasurement.height - contentOffset.y;
      const next = distance <= END_THRESHOLD ? 1 : 0;
      if (next !== atEnd.value) {
        atEnd.value = next;
        runOnJS(publishAtEnd)(next === 1);
      }
    },
  });

  /**
   * Which turn the reader is inside: the last anchor that has passed the top of
   * the viewport. Settled after a scroll rather than tracked per frame — the
   * answer is for a header, and a header that changes mid-flick is worse than
   * one that changes when the flick lands.
   */
  const settleAnchor = () => {
    let current: string | null = null;
    let bestY = -Infinity;
    for (const id of anchors.current) {
      const y = itemY.current.get(id);
      if (y === undefined) continue;
      if (y <= offsetY.value + ANCHOR_PEEK && y > bestY) {
        bestY = y;
        current = id;
      }
    }
    setCurrentAnchorId(current);
  };

  const onContentSizeChange = (_width: number, height: number) => {
    const previousHeight = contentHeight.current;
    contentHeight.current = height;

    // The very first measurement is the transcript opening, not new content.
    if (!opened.current) {
      opened.current = true;
      previousY.current = new Map(itemY.current);
      openAt(defaultScrollPosition);
      return;
    }

    const grew = height - previousHeight;

    if (grew > 0) {
      if (following.current) {
        scrollToEnd(true);
      } else if (preserveScrollOnPrepend) {
        // Content that appeared *above* the reader pushes everything down by
        // the same amount. Measuring that shift on a message they can already
        // see — rather than trusting the height delta — is what makes this
        // correct when a message is prepended and another edits itself in the
        // same commit.
        const shift = topmostShift(previousY.current, itemY.current);
        if (shift > 0.5) {
          scrollRef.current?.scrollTo({ y: offsetY.value + shift, animated: false });
        }
      }
    }

    previousY.current = new Map(itemY.current);
    settleAnchor();
  };

  const openAt = (position: MessageScrollerPosition) => {
    if (position === 'start') return;
    if (position === 'end') {
      scrollToEnd(false);
      return;
    }
    const last = anchors.current[anchors.current.length - 1];
    if (last) scrollToMessage(last, false);
    else scrollToEnd(false);
  };

  useEffect(() => {
    following.current = autoScroll && atEnd.value === 1;
  }, [autoScroll, following, atEnd]);

  return (
    <Animated.ScrollView
      ref={scrollRef}
      accessibilityRole="list"
      accessibilityLabel="Messages"
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      className={cn('flex-1', className)}
      {...props}
      // After the spread: these four are the component's reason to exist, and
      // silently losing one of them to a passed-through prop would look like a
      // bug in the scrolling rather than in the call site.
      onScroll={scrollHandler}
      onScrollEndDrag={settleAnchor}
      onMomentumScrollEnd={settleAnchor}
      onContentSizeChange={onContentSizeChange}
    >
      {children}
    </Animated.ScrollView>
  );
}
MessageScrollerViewport.displayName = 'MessageScroller.Viewport';

/**
 * How far the transcript shifted, measured on the message closest to the top
 * that was there before and is still there.
 */
function topmostShift(before: Map<string, number>, after: Map<string, number>): number {
  let bestY = Infinity;
  let shift = 0;
  for (const [id, y] of before) {
    const now = after.get(id);
    if (now === undefined || y >= bestY) continue;
    bestY = y;
    shift = now - y;
  }
  return shift;
}

export interface MessageScrollerContentProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** The transcript column. Announces additions rather than the whole list. */
function MessageScrollerContent({
  className,
  children,
  ...props
}: MessageScrollerContentProps) {
  return (
    <View
      accessibilityLiveRegion="polite"
      // Extra room at the foot so the last turn clears the floating jump
      // button instead of scrolling under it.
      className={cn('gap-3 p-4 pb-16', className)}
      {...props}
    >
      {children}
    </View>
  );
}
MessageScrollerContent.displayName = 'MessageScroller.Content';

export interface MessageScrollerItemProps extends ViewProps {
  className?: string;
  /** Stable id for this turn. `scrollToMessage` takes the same value. */
  messageId: string;
  /**
   * Marks this row as the start of a turn. `defaultScrollPosition="last-anchor"`
   * opens on the last one, and it is what a saved thread should land on — the
   * question, not the tail of the answer to it.
   */
  scrollAnchor?: boolean;
  children?: ReactNode;
}

/**
 * One row of the transcript. It exists to be measured: without a boundary per
 * turn there is nothing to scroll *to*, and nothing to measure the prepend
 * shift against.
 */
function MessageScrollerItem({
  className,
  messageId,
  scrollAnchor = false,
  children,
  ...props
}: MessageScrollerItemProps) {
  const { registerItem, unregisterItem } = useScroller('MessageScroller.Item');

  const onLayout = (event: LayoutChangeEvent) => {
    registerItem(messageId, event.nativeEvent.layout.y, scrollAnchor);
    props.onLayout?.(event);
  };

  useEffect(() => () => unregisterItem(messageId), [messageId, unregisterItem]);

  return (
    <View className={className} {...props} onLayout={onLayout}>
      {children}
    </View>
  );
}
MessageScrollerItem.displayName = 'MessageScroller.Item';

export interface MessageScrollerButtonProps extends ViewProps {
  className?: string;
  /** `end` jumps to the newest message, `start` to the beginning of the thread. */
  target?: 'start' | 'end';
  accessibilityLabel?: string;
  children?: ReactNode;
}

/**
 * The way back to the live edge, shown only when there is one to go back to.
 *
 * Its visibility is driven from the same shared value the scroll handler
 * writes, so it fades on the UI thread while the transcript is still moving.
 */
function MessageScrollerButton({
  className,
  target = 'end',
  accessibilityLabel,
  children,
  ...props
}: MessageScrollerButtonProps) {
  const { atEnd, scrollToEnd, scrollToStart } = useScroller('MessageScroller.Button');
  const tint = useCSSVariable('--color-foreground');

  // Shown when away from the edge the button points at.
  const shown = useDerivedValue(() =>
    withTiming(target === 'end' ? 1 - atEnd.value : atEnd.value, { duration: 160 })
  );

  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: (1 - shown.value) * 8 }, { scale: 0.92 + 0.08 * shown.value }],
  }));

  const [interactive, setInteractive] = useState(false);
  useDerivedValue(() => {
    const next = shown.value > 0.5;
    if (next !== interactive) runOnJS(setInteractive)(next);
  });

  return (
    <Animated.View
      // Never a focus stop while it is invisible — a screen reader landing on
      // a button nobody can see is worse than not having one.
      pointerEvents={interactive ? 'auto' : 'none'}
      accessibilityElementsHidden={!interactive}
      importantForAccessibility={interactive ? 'auto' : 'no-hide-descendants'}
      style={style}
      className={cn('absolute bottom-6 self-center', className)}
      {...props}
    >
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={
          accessibilityLabel ??
          (target === 'end' ? 'Jump to the latest message' : 'Jump to the start')
        }
        onPress={() => (target === 'end' ? scrollToEnd(true) : scrollToStart(true))}
        className="h-10 w-10 items-center justify-center rounded-full border border-border bg-surface shadow-lg"
      >
        {children ?? (
          <ChevronDownIcon
            size={18}
            color={typeof tint === 'string' ? tint : undefined}
            style={target === 'start' ? { transform: [{ rotate: '180deg' }] } : undefined}
          />
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}
MessageScrollerButton.displayName = 'MessageScroller.Button';

export const MessageScroller = Object.assign(MessageScrollerRoot, {
  Viewport: MessageScrollerViewport,
  Content: MessageScrollerContent,
  Item: MessageScrollerItem,
  Button: MessageScrollerButton,
});
