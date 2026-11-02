/**
 * SectionProgress — a floating pill saying how far through a screen you are,
 * and which part of it you are in.
 *
 * A ring filled to the scroll position, and beside it the title of the section
 * being read. Pressed, it opens into the list of sections and jumps to any of
 * them.
 *
 * ```tsx
 * const sections = useScrollSections({ ids: SECTIONS.map((s) => s.id) });
 *
 * <SectionProgress
 *   scroll={sections.scroll}
 *   value={sections.active}
 *   onValueChange={sections.scrollTo}
 * >
 *   <SectionProgress.Item value="intro">Introduction</SectionProgress.Item>
 *   <SectionProgress.Item value="setup">Setup</SectionProgress.Item>
 * </SectionProgress>
 * ```
 *
 * ## Two readings, one control
 *
 * The ring is continuous and the label is not, and that is the point: a
 * percentage says how much is left, a section name says what is being read.
 * Either on its own leaves the other question open — a bar at 60% of an
 * unfamiliar page means nothing in particular, and a heading with no sense of
 * depth is a position without a scale.
 *
 * ## It arrives, and then it stays
 *
 * Nothing is drawn on the first screen. Past `revealAt` the pill fades in and
 * remains for the rest of the scroll — it does not hide again on the way back
 * up. A label that comes and goes with the scroll direction is one the reader
 * has to catch rather than read.
 *
 * ## One surface, not a card above a button
 *
 * Open, the list and the pill are a single bordered box: the pill's row is the
 * end of the card rather than a control sitting under a panel of its own. Two
 * boxes would draw two outlines a few points apart, and the pill would read as
 * something the list had landed on top of rather than as the thing it grew
 * out of.
 *
 * The card is the only thing carrying a border, a background and a shadow.
 * Everything inside it is a row.
 *
 * ## The section, and the colour it brings
 *
 * An `Item` may carry a `color`, and the active one's colour is taken by the
 * ring, the label and a wash across the pill, crossfading as the reader moves
 * between sections. It turns the pill into a second, peripheral signal — the
 * part of the page you are in, readable without the words.
 */
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import Animated, {
  FadeIn,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import { useBackHandler } from '../../hooks/use-back-handler';
import { useScrollProgress } from '../../primitives/scroll-progress';
import { Text, textChildren } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { selectionTick } from '../../utils/haptics';
import { webDeps } from '../../primitives/web-deps';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Diameter of the ring, and the weight of its stroke. */
const RING_SIZE = 22;
const RING_STROKE = 2.5;
/**
 * How long the ring takes to reach a new scroll position.
 *
 * The position arrives from a scroll handler on the JavaScript thread, so it
 * comes in steps rather than continuously. Easing towards each step turns that
 * back into a glide — and because the easing itself runs on the UI thread, a
 * busy JavaScript thread costs the ring some lag rather than the whole motion.
 */
const PROGRESS_EASE = 160;
/** How long the pill takes to arrive, and to take on a new section's colour. */
const REVEAL_DURATION = 200;
const TINT_DURATION = 240;
/** How far the pill rises as it appears. */
const REVEAL_RISE = 10;
/**
 * How long a jump from the panel is given to arrive before section changes
 * start being felt again. Only reached when the scroll had nowhere to go.
 */
const JUMP_TIMEOUT = 900;
/** List width: a floor so one short section still reads, and a cap so long
    titles wrap instead of pushing the card across the screen. */
const LIST_MIN_WIDTH = 180;
const LIST_MAX_WIDTH = '86%' as const;
/**
 * How tall the list may grow before it scrolls: about six rows.
 *
 * A cap, and a `flexGrow: 0` beside it, because a `ScrollView` carries
 * `flexGrow: 1` in its own base style — inside a card whose height comes from
 * its contents, that is a list which fills every point the screen will give it
 * and a card stretched from edge to edge behind six rows.
 */
const LIST_MAX_HEIGHT = 260;
/**
 * The collapsed pill's height, from what it is built out of: the ring and the
 * padding either side of it.
 *
 * Halved, it is the closed corner radius — and it is a number rather than a
 * `rounded-full` because a radius of 9999 on a bordered shape draws a border
 * that thickens through the curve at each end and thins along the straight
 * top and bottom. A radius that is exactly half the height curves once.
 */
const PILL_HEIGHT = RING_SIZE + 12;
/** The card's radius once it has opened into a list. */
const CARD_RADIUS = 20;
/** How long the corner takes to round off into a card, and the list to arrive. */
const EXPAND_DURATION = 220;
const LIST_FADE = 160;
/** The border the card draws, and the radius the wash inside it takes. */
const CARD_BORDER = 1;

export type SectionProgressPlacement =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/** The colour an `Item` can bring with it. */
export type SectionProgressColor =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'foreground';

/** Which side of the pill's row the content sits on, per placement. */
const ALIGNMENT: Record<SectionProgressPlacement, string> = {
  'top-left': 'items-start',
  'top-center': 'items-center',
  'top-right': 'items-end',
  'bottom-left': 'items-start',
  'bottom-center': 'items-center',
  'bottom-right': 'items-end',
};

/**
 * The tokens, read in one call, and where each colour name sits in the result.
 *
 * One array call rather than one hook per name: an `Item`'s colour is a prop
 * on a child element, and a hook cannot be run per child without the number of
 * hooks changing with the number of sections.
 */
const COLOR_TOKENS = [
  '--color-foreground',
  '--color-primary',
  '--color-success',
  '--color-warning',
  '--color-destructive',
  '--color-info',
  '--color-muted',
];
const COLOR_INDEX: Record<SectionProgressColor, number> = {
  foreground: 0,
  primary: 1,
  success: 2,
  warning: 3,
  danger: 4,
  info: 5,
};
/** Where the track colour sits in the same result. */
const TRACK_INDEX = 6;
/** Drawn if a token cannot be resolved — a theme that has not loaded yet. */
const COLOR_FALLBACK = '#f5f5f5';
const TRACK_FALLBACK = '#3f3f46';

/**
 * Where the scroller is.
 *
 * Three values rather than one fraction, because the fraction is not the only
 * thing that is wanted: the reveal threshold is a distance in points, and a
 * distance cannot be recovered from a percentage.
 *
 * Both `useScrollSections().scroll` and the `ScrollProgress` primitive's
 * context satisfy this shape.
 */
export interface SectionProgressScroll {
  /** Distance scrolled, in points. */
  offset: SharedValue<number>;
  /** Height of the visible area. */
  viewport: SharedValue<number>;
  /** Total height of the content. */
  content: SharedValue<number>;
}

interface SectionProgressContextValue {
  value: string | undefined;
  onValueChange: (value: string) => void;
  close: () => void;
  /** The active section's colour, already resolved to something drawable. */
  tint: string;
}

const SectionProgressContext = createContext<SectionProgressContextValue | null>(null);

function useSectionProgress(component: string): SectionProgressContextValue {
  const context = useContext(SectionProgressContext);
  if (!context) {
    throw new Error(`${component} must be used within a <SectionProgress>`);
  }
  return context;
}

export interface SectionProgressProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /**
   * The scroll position the ring is filled from. `useScrollSections` returns
   * one as `scroll`; without it the component falls back to the nearest
   * `ScrollProgress`, and with neither the ring stays empty.
   */
  scroll?: SectionProgressScroll;
  /**
   * Fill the ring from a value of your own, between 0 and 1. Nothing is
   * derived when this is passed.
   */
  progress?: SharedValue<number> | number;
  /** Active section id. Controlled — usually driven by a scroll handler. */
  value?: string;
  /** Starting section when uncontrolled. */
  defaultValue?: string;
  /** Fires when a section is chosen from the panel. Scroll there. */
  onValueChange?: (value: string) => void;
  /** Controlled expansion of the panel. */
  open?: boolean;
  /** Whether the panel starts open when uncontrolled. */
  defaultOpen?: boolean;
  /** Fires when the panel opens or closes, however it was done. */
  onOpenChange?: (open: boolean) => void;
  /** Which corner or edge the pill floats in. */
  placement?: SectionProgressPlacement;
  /** Gap between the pill and the edge of the safe area. */
  offset?: number;
  /**
   * How far the reader must scroll, in points, before the pill appears. `0`
   * shows it from the first frame. It never hides again.
   */
  revealAt?: number;
  /**
   * Tick under the finger on every change of section, however it was made.
   * Nothing between a tap in the panel and its arrival counts as a change.
   * Needs the optional `expo-haptics` package; without it this does nothing.
   */
  haptics?: boolean;
  /**
   * What the pill is called to a screen reader. The section being read and
   * the percentage are announced after it, so this names the control rather
   * than describing the state.
   */
  label?: string;
  /** One `SectionProgress.Item` per section, in the order they appear. */
  children: ReactNode;
}

function SectionProgressRoot({
  className,
  scroll,
  progress,
  value: valueProp,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  placement = 'bottom-center',
  offset = 16,
  revealAt = 64,
  haptics = false,
  label = 'Sections',
  children,
  ...props
}: SectionProgressProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  const [internalValue, setInternalValue] = useState(defaultValue);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = valueProp !== undefined;
  const value = isControlled ? valueProp : internalValue;
  const isOpenControlled = openProp !== undefined;
  const open = isOpenControlled ? openProp : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isOpenControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isOpenControlled, onOpenChange]
  );
  const close = useCallback(() => setOpen(false), [setOpen]);

  // The panel owns the back button while it is up — back should put the list
  // away, not leave the screen behind it.
  useBackHandler(open, close);

  /*
   * The sections, read straight off the children.
   *
   * The pill has to draw the active section's own label and colour while the
   * panel that holds the rows is closed and unmounted. Reading the elements is
   * synchronous, so the first frame is already right — a registration effect
   * would leave the pill blank until after mount, which is the frame the
   * reveal animation is playing on.
   */
  const items = useMemo(() => {
    const found: { value: string; label: ReactNode; color?: SectionProgressColor }[] = [];
    Children.forEach(children, (child) => {
      if (!isValidElement(child) || child.type !== SectionProgressItem) return;
      const itemProps = child.props as SectionProgressItemProps;
      if (typeof itemProps.value !== 'string') return;
      found.push({
        value: itemProps.value,
        label: itemProps.children,
        color: itemProps.color,
      });
    });
    return found;
  }, [children]);

  const active = items.find((item) => item.value === value) ?? items[0];

  // Narrowed on the way out because `useCSSVariable` resolves to a number for
  // any token that happens to be one.
  const tokens = useCSSVariable(COLOR_TOKENS);
  const resolved = tokens[COLOR_INDEX[active?.color ?? 'foreground']];
  const tint = typeof resolved === 'string' ? resolved : COLOR_FALLBACK;
  const trackToken = tokens[TRACK_INDEX];
  const track = typeof trackToken === 'string' ? trackToken : TRACK_FALLBACK;

  /* ------------------------------------------------------------------ *
   * The ring
   * ------------------------------------------------------------------ */

  // Called unconditionally, used only as a fallback: a hook cannot sit behind
  // a `??`, and the context returns null outside a provider anyway.
  const inherited = useScrollProgress();
  const source = scroll ?? inherited;
  const filled = useSharedValue(0);

  useAnimatedReaction(
    () => {
      if (typeof progress === 'number') return progress;
      if (progress) return progress.value;
      if (!source) return 0;
      const span = source.content.value - source.viewport.value;
      return span > 0 ? source.offset.value / span : 0;
    },
    (next) => {
      const clamped = next < 0 ? 0 : next > 1 ? 1 : next;
      filled.value = withTiming(clamped, { duration: PROGRESS_EASE });
    },
    webDeps([progress, source])
  );

  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const centre = RING_SIZE / 2;

  /*
   * A circle's stroke starts at three o'clock, so it is turned back a quarter
   * to start at twelve. An arc that begins at three reads as a gauge already
   * part-way along.
   */
  const rotate = `rotate(-90 ${centre} ${centre})`;

  /* ------------------------------------------------------------------ *
   * The reveal
   * ------------------------------------------------------------------ */

  /*
   * A React state, not only a shared value: the pill has to stop taking
   * touches while it is invisible, and `pointerEvents` is not a style. The
   * reaction fires when the threshold is crossed rather than every frame, so
   * this costs one hop to the JavaScript thread per scroll, not per event.
   */
  const [revealed, setRevealed] = useState(revealAt <= 0);
  useAnimatedReaction(
    () => (source ? source.offset.value >= revealAt : true),
    (next, previous) => {
      if (next !== previous) runOnJS(setRevealed)(next);
    },
    webDeps([revealAt, source])
  );

  const shown = useSharedValue(revealAt <= 0 ? 1 : 0);
  useEffect(() => {
    const to = revealed ? 1 : 0;
    shown.value = reduceMotion ? to : withTiming(to, { duration: REVEAL_DURATION });
  }, [revealed, reduceMotion, shown]);

  const revealStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [
      {
        translateY: interpolate(
          shown.value,
          [0, 1],
          [placement.startsWith('top') ? -REVEAL_RISE : REVEAL_RISE, 0]
        ),
      },
    ],
  }));

  /* ------------------------------------------------------------------ *
   * The colour the section brings
   * ------------------------------------------------------------------ */

  /*
   * Two colours and a scalar between them, rather than one colour swapped: a
   * section change is a change of state the reader did not ask for, and one
   * that lands instantly reads as a flicker rather than as a transition.
   */
  const [fade, setFade] = useState({ from: tint, to: tint });
  const crossfade = useSharedValue(1);
  useEffect(() => {
    setFade((current) => (current.to === tint ? current : { from: current.to, to: tint }));
  }, [tint]);
  useEffect(() => {
    if (fade.from === fade.to) return;
    crossfade.value = 0;
    crossfade.value = reduceMotion ? 1 : withTiming(1, { duration: TINT_DURATION });
  }, [fade, crossfade, reduceMotion]);

  const ringProps = useAnimatedProps(() => ({
    strokeDasharray: [circumference * filled.value, circumference],
    stroke: interpolateColor(crossfade.value, [0, 1], [fade.from, fade.to]),
  }));
  const tintStyle = useAnimatedStyle(() => ({
    color: interpolateColor(crossfade.value, [0, 1], [fade.from, fade.to]),
  }));
  /*
   * The corner, from a pill to a card.
   *
   * A number rather than `rounded-full`, because a radius far larger than the
   * shape draws a border that thickens through each curved end and thins along
   * the straight edges between them. Exactly half the height curves once, and
   * the hairline stays one weight the whole way round.
   */
  const expanded = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    const to = open ? 1 : 0;
    expanded.value = reduceMotion ? to : withTiming(to, { duration: EXPAND_DURATION });
  }, [open, reduceMotion, expanded]);

  const cardStyle = useAnimatedStyle(() => ({
    borderRadius: interpolate(expanded.value, [0, 1], [PILL_HEIGHT / 2, CARD_RADIUS]),
  }));
  const washStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(crossfade.value, [0, 1], [fade.from, fade.to]),
    // One point tighter than the card's, since it sits inside the border.
    borderRadius:
      interpolate(expanded.value, [0, 1], [PILL_HEIGHT / 2, CARD_RADIUS]) - CARD_BORDER,
  }));

  /* ------------------------------------------------------------------ *
   * Choosing a section, and feeling the ones scrolled past
   * ------------------------------------------------------------------ */

  /*
   * The section a tap asked for, while the screen is still travelling to it.
   * A jump passes every section in between, and each of those arrives here as
   * a change of section — one tap, three ticks, none of them a place the
   * reader went.
   */
  const jumpTo = useRef<string | null>(null);
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endJump = useCallback(() => {
    jumpTo.current = null;
    if (jumpTimer.current) {
      clearTimeout(jumpTimer.current);
      jumpTimer.current = null;
    }
  }, []);
  useEffect(() => () => endJump(), [endJump]);

  const handleValueChange = useCallback(
    (next: string) => {
      jumpTo.current = next;
      if (jumpTimer.current) clearTimeout(jumpTimer.current);
      // A backstop, not the usual way out: a jump to a section the scroller
      // cannot reach never arrives, and without this nothing would tick again.
      jumpTimer.current = setTimeout(endJump, JUMP_TIMEOUT);
      if (!isControlled) setInternalValue(next);
      onValueChange?.(next);
      setOpen(false);
    },
    [isControlled, onValueChange, setOpen, endJump]
  );

  /*
   * Fired from the resolved value rather than from the handler, so a section
   * arrived at by scrolling is felt as well as one that was tapped. The ref
   * skips the first run — mounting is not a change of section.
   */
  const ticked = useRef(false);
  useEffect(() => {
    if (!ticked.current) {
      ticked.current = true;
      return;
    }
    if (jumpTo.current !== null) {
      if (value !== jumpTo.current) return;
      endJump();
    }
    if (haptics) selectionTick();
  }, [value, haptics, endJump]);

  /* ------------------------------------------------------------------ *
   * What a screen reader is told
   * ------------------------------------------------------------------ */

  /*
   * Rounded to five, and pushed across only when it changes: the ring is a
   * continuous value and an announcement is not, so the number is coarse on
   * purpose rather than accurate to a percent nobody can act on.
   */
  const [percent, setPercent] = useState(0);
  useAnimatedReaction(
    () => Math.round(filled.value * 20) * 5,
    (next, previous) => {
      if (next !== previous) runOnJS(setPercent)(next);
    }
  );

  const activeLabel = typeof active?.label === 'string' ? active.label : undefined;

  const context = useMemo<SectionProgressContextValue>(
    () => ({ value: active?.value, onValueChange: handleValueChange, close, tint }),
    [active?.value, handleValueChange, close, tint]
  );

  /*
   * Where the card sits, as padding on a full-screen overlay rather than as a
   * position on the card itself.
   *
   * The overlay is what the dismiss layer needs: a press anywhere outside the
   * card has to put the list away, and "anywhere" is the whole screen. It
   * takes no touches of its own, so everything under it still scrolls.
   */
  const atTop = placement.startsWith('top');

  return (
    <SectionProgressContext.Provider value={context}>
      <View
        pointerEvents={revealed ? 'box-none' : 'none'}
        style={[
          StyleSheet.absoluteFill,
          {
            paddingTop: insets.top + offset,
            paddingBottom: insets.bottom + offset,
            paddingLeft: insets.left + offset,
            paddingRight: insets.right + offset,
            justifyContent: atTop ? 'flex-start' : 'flex-end',
          },
        ]}
        className={cn(ALIGNMENT[placement], className)}
        {...props}
      >
        {open ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={close}
            /* Outside the card's padding, so it covers the screen rather than
               the space left inside the insets. */
            style={{
              position: 'absolute',
              top: -(insets.top + offset),
              bottom: -(insets.bottom + offset),
              left: -(insets.left + offset),
              right: -(insets.right + offset),
            }}
          />
        ) : null}

        {/*
          * One box around the list and the pill.
          *
          * It carries the border, the background and the shadow; everything
          * inside it is a row. Drawn as two boxes the pill would read as a
          * control the list had landed on rather than as the thing the list
          * grew out of — and two outlines a few points apart is the seam that
          * makes a floating control look assembled.
          */}
        <Animated.View
          /*
           * No layout animation on this box, deliberately.
           *
           * A layout animation here animates every change of its size, and the
           * size changes on every change of section: the label is a different
           * word and the pill is a different width. What that draws is the
           * surface arriving at the old width and closing in on the new word
           * over a few hundred milliseconds — a band of empty card down each
           * side of the label, once per section, on a control whose entire job
           * is to be glanced at.
           *
           * The width belongs to the word, so it changes with the word. Only
           * the opening is animated, and it is animated by the parts that
           * open: the corner rounds off through `cardStyle`, and the list
           * fades in over it.
           */
          style={[
            revealStyle,
            cardStyle,
            {
              borderWidth: CARD_BORDER,
              minWidth: open ? LIST_MIN_WIDTH : undefined,
              maxWidth: LIST_MAX_WIDTH,
            },
          ]}
          className="border-border bg-popover shadow-lg"
        >
          {/* The section's colour, washed across the whole card. Inset by the
              border rather than over it, and rounded one point tighter, so the
              outline stays a single even hairline through the curves. */}
          <Animated.View
            pointerEvents="none"
            style={[washStyle, StyleSheet.absoluteFill, { opacity: 0.09 }]}
          />

          {open && !atTop ? (
            <SectionProgressList reduceMotion={reduceMotion}>{children}</SectionProgressList>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              activeLabel ? `${label}. ${activeLabel}. ${percent}% read.` : label
            }
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen(!open)}
            className="flex-row items-center gap-2.5 py-1.5 pe-4 ps-2"
          >
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Svg width={RING_SIZE} height={RING_SIZE}>
                <G>
                  <Circle
                    cx={centre}
                    cy={centre}
                    r={radius}
                    stroke={track}
                    strokeWidth={RING_STROKE}
                    fill="none"
                  />
                  <AnimatedCircle
                    animatedProps={ringProps}
                    cx={centre}
                    cy={centre}
                    r={radius}
                    strokeWidth={RING_STROKE}
                    strokeLinecap="round"
                    fill="none"
                    transform={rotate}
                  />
                </G>
              </Svg>
            </View>

            <Animated.Text
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={tintStyle}
              // No `flex-1`: the card is sized by its contents, and a flex
              // child inside an auto-width row takes a basis of zero — which
              // is a label of no width at all.
              className="text-sm font-medium"
              numberOfLines={1}
            >
              {active?.label}
            </Animated.Text>
          </Pressable>

          {open && atTop ? (
            <SectionProgressList reduceMotion={reduceMotion}>{children}</SectionProgressList>
          ) : null}
        </Animated.View>
      </View>
    </SectionProgressContext.Provider>
  );
}

/**
 * The sections.
 *
 * No rule between the list and the pill's row. The rows are already separated
 * from the row below by their own gap and by the fill on the active one, and a
 * hairline across a card this small draws a second edge a few points inside
 * the one the card already has.
 *
 * It fades in and is gone on close, with no exit animation. An exiting
 * animation keeps the view mounted as a snapshot while the card re-lays-out
 * around it — the card shrinks to the pill under a list that is still on
 * screen, so the control shifts and settles back over the following frames.
 * Closing is one change, in one frame.
 */
function SectionProgressList({
  children,
  reduceMotion,
}: {
  children: ReactNode;
  reduceMotion: boolean;
}) {
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(LIST_FADE)}
      accessibilityRole="menu"
    >
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        // The list is as tall as its rows, up to six of them. Both halves are
        // needed: `flexGrow: 0` to undo the ScrollView's own base style, and
        // the cap so a screen with twenty sections still opens a list rather
        // than a full-height column.
        style={{ flexGrow: 0, maxHeight: LIST_MAX_HEIGHT }}
        contentContainerClassName="gap-0.5 p-1.5"
      >
        {textChildren(children)}
      </ScrollView>
    </Animated.View>
  );
}


export interface SectionProgressItemProps {
  className?: string;
  /** Section this row jumps to. Matches the root's `value`. */
  value: string;
  /**
   * The colour this section brings to the pill. Left out, the section takes
   * the foreground colour like every other.
   */
  color?: SectionProgressColor;
  /** The section's title. It is what the collapsed pill shows. */
  children: ReactNode;
}

/**
 * One section: a row in the panel, and the label the pill shows while that
 * section is the one being read.
 */
function SectionProgressItem({ className, value, children }: SectionProgressItemProps) {
  const { value: active, onValueChange, tint } = useSectionProgress('SectionProgress.Item');
  const selected = active === value;

  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ selected }}
      onPress={() => onValueChange(value)}
      className={cn('flex-row items-center gap-3 rounded-xl px-3 py-2 active:bg-accent', selected && 'bg-accent', className)}
    >
      {/* The dot is the position marker the pill's ring cannot be at this
          size — filled and in the section's own colour when it is the one
          being read, a hairline dot otherwise. */}
      <View
        style={selected ? { backgroundColor: tint } : undefined}
        className={cn('h-1.5 w-1.5 rounded-full', !selected && 'bg-muted-foreground/40')}
      />
      <Text
        size="sm"
        weight={selected ? 'medium' : 'normal'}
        className={selected ? 'text-foreground' : 'text-muted-foreground'}
        // Two lines rather than one: an ellipsis in a navigator hides the very
        // word that says which section the row would jump to.
        numberOfLines={2}
      >
        {children}
      </Text>
    </Pressable>
  );
}

SectionProgressRoot.displayName = 'SectionProgress';
SectionProgressItem.displayName = 'SectionProgress.Item';

export const SectionProgress = Object.assign(SectionProgressRoot, {
  Item: SectionProgressItem,
});
