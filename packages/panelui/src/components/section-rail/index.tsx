/**
 * SectionRail — a floating navigator for a long screen.
 *
 * A stack of short bars pinned to one edge, one per section, that expands into
 * a labelled panel when you touch it. Collapsed it is a position indicator you
 * can read at a glance without giving up any content width; expanded it is a
 * list you can jump from.
 *
 * The bars are deliberately unlabelled. A permanent list of section titles
 * down the side of a phone screen is either too small to read or too wide to
 * keep — the bars carry only the two things that survive at that size, which
 * section you are in and roughly how deep it sits.
 *
 * ```tsx
 * <SectionRail value={active} onValueChange={scrollTo}>
 *   <SectionRail.Trigger>
 *     <SectionRail.Bar value="intro" />
 *     <SectionRail.Bar value="setup" level={1} />
 *   </SectionRail.Trigger>
 *   <SectionRail.Content>
 *     <SectionRail.Item value="intro">Introduction</SectionRail.Item>
 *     <SectionRail.Item value="setup" level={1}>Setup</SectionRail.Item>
 *   </SectionRail.Content>
 * </SectionRail>
 * ```
 *
 * It floats: the root is absolutely positioned and lets touches through
 * everywhere it is not drawing, so the content underneath still scrolls.
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
import { Pressable, ScrollView, View, type ViewProps } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';
import { Portal } from '../../primitives/portal';
import { Text, textChildren } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { selectionTick } from '../../utils/haptics';

const SPRING = { damping: 20, stiffness: 260, mass: 0.6 } as const;
/** Bar width at the top level, and how much each nested level takes off it. */
const BAR_WIDTH = 14;
const BAR_LEVEL_STEP = 3;
/** How much wider the active bar gets, so position is readable at a glance. */
const BAR_ACTIVE_EXTRA = 10;
/**
 * How much of that extra the bars either side of the active one keep.
 *
 * The rail is read by shape, and one long bar in a column of identical short
 * ones only says *which* one — it takes a second look to see where that is in
 * the run. A step down on each side gives the active bar a slope to sit on, so
 * position is legible from the silhouette alone.
 *
 * Only the immediate neighbours. Two steps of falloff is a taper down the whole
 * rail, which reads as a gradient the bars happen to sit in rather than as a
 * mark on one of them.
 */
const BAR_NEIGHBOUR = 0.45;
/** Opacity of a bar with nothing near it, and how much proximity adds. */
const BAR_REST_OPACITY = 0.32;
/**
 * How long a jump from the panel is given to arrive before the rail starts
 * ticking again. Long enough for a scroll across a whole screen, short enough
 * that a jump which never lands does not mute the next one.
 */
const JUMP_TIMEOUT = 900;
/**
 * How long the rail stays quiet *after* a jump has landed.
 *
 * A caller may set the value optimistically, before the scroll it triggers has
 * started — so arriving at the target is not proof the journey is over. This
 * covers the tail of the animation, in which the scroller passes through the
 * sections either side of the destination and reports each of them.
 */
const JUMP_SETTLE = 260;
/** Indent per level in the expanded panel. */
const ITEM_INDENT = 10;
/**
 * How wide the panel may grow by default. A row spends at least 40pt on
 * indent, padding and the panel's own border before any text, so a tighter cap
 * than this truncates ordinary section titles on a narrow phone.
 */
const PANEL_MAX_WIDTH = '78%' as const;
/** …and a floor, so a rail with one short section still opens a readable panel. */
const PANEL_MIN_WIDTH = 184;

export type SectionRailPlacement = 'left' | 'right';
export type SectionRailAlign = 'center' | 'top' | 'bottom';

/** Vertical position of the rail, and of the panel that opens from it. */
const ALIGNMENT: Record<SectionRailAlign, string> = {
  center: 'justify-center',
  top: 'justify-start',
  bottom: 'justify-end',
};

interface SectionRailContextValue {
  value: string | undefined;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  close: () => void;
  placement: SectionRailPlacement;
  align: SectionRailAlign;
}

const SectionRailContext = createContext<SectionRailContextValue | null>(null);

/**
 * The bars' values, in the order they are written.
 *
 * A bar knows whether it is the active one; it cannot know how far it is *from*
 * the active one, which is what the falloff either side needs. The trigger
 * reads it off its own children — the only place in the tree where the run is
 * visible at all — rather than having each bar register itself, since a
 * registration order is whatever order the rows happened to mount in and the
 * rail is drawn in the order they were written.
 */
const SectionRailBarsContext = createContext<string[]>([]);

function useSectionRail(component: string): SectionRailContextValue {
  const context = useContext(SectionRailContext);
  if (!context) {
    throw new Error(`${component} must be used within a <SectionRail>`);
  }
  return context;
}

export interface SectionRailProps extends ViewProps {
  className?: string;
  /** Which edge the rail sits against. */
  placement?: SectionRailPlacement;
  /**
   * Where along that edge it sits. `bottom` puts it in a corner, out of the
   * way of the text — the panel then opens upward from the rail rather than
   * centred on the screen.
   */
  align?: SectionRailAlign;
  /**
   * Tick under the finger on every change of section, however it was made —
   * tapped in the panel, or scrolled past. Needs the optional `expo-haptics`
   * package; without it this does nothing.
   */
  haptics?: boolean;
  /** Active section id. Controlled — usually driven by a scroll handler. */
  value?: string;
  /** Starting section when uncontrolled. */
  defaultValue?: string;
  /** Fires when a section is chosen from the expanded panel. */
  onValueChange?: (value: string) => void;
  /** Controlled expansion. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * How long the panel stays up after a choice, so a mis-tap can be corrected
   * without opening it again. Set 0 to close immediately.
   */
  closeDelay?: number;
  /** Gap between the rail and the edge of the safe area. */
  offset?: number;
  children: ReactNode;
}

function SectionRailRoot({
  className,
  placement = 'right',
  align = 'center',
  haptics = false,
  value: valueProp,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  closeDelay = 300,
  offset = 12,
  children,
  ...props
}: SectionRailProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const insets = useSafeAreaInsets();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isControlled = valueProp !== undefined;
  const value = isControlled ? valueProp : internalValue;
  const isOpenControlled = openProp !== undefined;
  const open = isOpenControlled ? openProp : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      if (!isOpenControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isOpenControlled, onOpenChange]
  );

  const close = useCallback(() => setOpen(false), [setOpen]);

  // A pending close, or a jump still being waited on, must not fire after the
  // rail has gone.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (jumpTimer.current) clearTimeout(jumpTimer.current);
    },
    []
  );

  /*
   * The section a tap asked for, while the screen is still travelling to it.
   *
   * A jump is animated, so the scroll handler driving `value` reports every
   * section the screen passes on the way — each of which is a change of section
   * as far as the tick below can tell. One tap became two or three ticks, and
   * the panel lit up a row nobody chose. Nothing between the tap and the
   * arrival is a section the reader went to, so nothing between them ticks.
   */
  const jumpTo = useRef<{ target: string; landed: boolean } | null>(null);

  const endJump = useCallback(() => {
    jumpTo.current = null;
    if (jumpTimer.current) {
      clearTimeout(jumpTimer.current);
      jumpTimer.current = null;
    }
  }, []);

  const handleValueChange = useCallback(
    (next: string) => {
      jumpTo.current = { target: next, landed: false };
      if (jumpTimer.current) clearTimeout(jumpTimer.current);
      /*
       * A backstop, not the normal way out. A jump to a section the scroller
       * cannot reach — the last one on a screen shorter than the viewport —
       * never arrives, and without this the rail would stay silent for good.
       */
      jumpTimer.current = setTimeout(endJump, JUMP_TIMEOUT);

      if (!isControlled) setInternalValue(next);
      onValueChange?.(next);

      if (closeDelay <= 0) {
        setOpen(false);
        return;
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setOpen(false), closeDelay);
    },
    [isControlled, onValueChange, closeDelay, setOpen, endJump]
  );

  /*
   * Fired from the resolved value rather than from the change handler, so a
   * section arrived at by scrolling ticks as well as one that was tapped —
   * "every change" means every change. The ref skips the first run, since
   * mounting is not a change of section.
   */
  const ticked = useRef(false);
  useEffect(() => {
    if (!ticked.current) {
      ticked.current = true;
      return;
    }

    const jump = jumpTo.current;
    if (jump !== null) {
      // Still on the way. Nothing the screen passes through is a section the
      // reader went to, so nothing between the tap and the arrival ticks.
      if (value !== jump.target) return;

      // Arrived — worth feeling, once. The window stays armed a moment longer
      // rather than closing here, because a caller that sets the value
      // optimistically hands it to us *before* the scroll starts: closing on
      // the first match would disarm the rail for the whole animation, which
      // is the entire journey it was there to cover. Every section the screen
      // then passed lit a row and fired a tick of its own, several of them
      // inside a few hundred milliseconds.
      if (jump.landed) return;
      jump.landed = true;
      if (jumpTimer.current) clearTimeout(jumpTimer.current);
      jumpTimer.current = setTimeout(endJump, JUMP_SETTLE);
    }

    if (haptics) selectionTick();
  }, [value, haptics, endJump]);

  const context = useMemo(
    () => ({
      value,
      onValueChange: handleValueChange,
      open,
      setOpen,
      close,
      placement,
      align,
    }),
    [value, handleValueChange, open, setOpen, close, placement, align]
  );

  return (
    <SectionRailContext.Provider value={context}>
      <View
        // `box-none` and not `none`: the rail's own children still take
        // touches, but the empty column around them does not — otherwise a
        // strip down the side of the screen would swallow every scroll.
        pointerEvents="box-none"
        className={cn(
          'absolute',
          ALIGNMENT[align],
          placement === 'right' ? 'right-0' : 'left-0',
          className
        )}
        style={{
          top: insets.top,
          bottom: insets.bottom,
          [placement === 'right' ? 'right' : 'left']:
            (placement === 'right' ? insets.right : insets.left) + offset,
        }}
        {...props}
      >
        {textChildren(children)}
      </View>
    </SectionRailContext.Provider>
  );
}

export interface SectionRailTriggerProps extends ViewProps {
  className?: string;
  children: ReactNode;
}

/**
 * The collapsed rail. Wraps the bars and opens the panel on press — one target
 * over the whole stack rather than one per bar, because a 3px bar is not
 * something anyone can hit.
 */
function SectionRailTrigger({ className, children, ...props }: SectionRailTriggerProps) {
  const { open, setOpen, placement } = useSectionRail('SectionRail.Trigger');

  /*
   * The run of bars, read off the children. Only the values are taken, so a bar
   * wrapped in anything of the caller's is simply not found and falls back to
   * drawing itself from `selected` alone.
   */
  const values = useMemo(() => {
    const found: string[] = [];
    Children.forEach(children, (child) => {
      if (isValidElement(child) && child.type === SectionRailBar) {
        const value = (child.props as SectionRailBarProps).value;
        if (typeof value === 'string') found.push(value);
      }
    });
    return found;
  }, [children]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sections"
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen(!open)}
      // Generous padding is the hit target; the bars themselves are hairlines.
      hitSlop={10}
      className={cn(
        'gap-1.5 py-2.5',
        placement === 'right' ? 'items-end ps-5 pe-2' : 'items-start ps-2 pe-5',
        className
      )}
      {...props}
    >
      <SectionRailBarsContext.Provider value={values}>
        {textChildren(children)}
      </SectionRailBarsContext.Provider>
    </Pressable>
  );
}

export interface SectionRailBarProps {
  className?: string;
  /** Section this bar stands for. Matches the root's `value`. */
  value: string;
  /** Nesting depth. Deeper levels draw a shorter bar. */
  level?: number;
}

/**
 * One section, drawn as a bar.
 *
 * Three lengths rather than two: the active bar is longest and brightest, the
 * bars either side of it keep a share of that, and everything further away sits
 * at the resting length. What the reader gets from the extra step is *where* in
 * the run they are without counting bars — the slope points at the middle of it.
 */
function SectionRailBar({ className, value, level = 0 }: SectionRailBarProps) {
  const { value: active } = useSectionRail('SectionRail.Bar');
  const values = useContext(SectionRailBarsContext);
  const selected = active === value;

  const restColor = useCSSVariable('--color-muted-foreground');
  const activeColor = useCSSVariable('--color-foreground');

  /*
   * How near this bar is to the one that is active: 1 for the active bar itself,
   * a share of it for its neighbours, 0 for the rest. A bar the trigger did not
   * find — one the caller wrapped in something of their own — has no position to
   * measure from, so it falls back to the plain selected-or-not it always had.
   */
  const index = values.indexOf(value);
  const activeIndex = active === undefined ? -1 : values.indexOf(active);
  const proximity =
    index < 0 || activeIndex < 0
      ? selected
        ? 1
        : 0
      : Math.abs(index - activeIndex) === 0
        ? 1
        : Math.abs(index - activeIndex) === 1
          ? BAR_NEIGHBOUR
          : 0;

  const base = Math.max(BAR_WIDTH - level * BAR_LEVEL_STEP, 6);
  const progress = useSharedValue(proximity);

  useEffect(() => {
    progress.value = withSpring(proximity, SPRING);
  }, [proximity, progress]);

  const idle = typeof restColor === 'string' ? restColor : '#818181';
  const on = typeof activeColor === 'string' ? activeColor : '#f5f5f5';

  const style = useAnimatedStyle(() => ({
    width: base + progress.value * BAR_ACTIVE_EXTRA,
    // The far bars are dim on purpose — the rail is a position indicator, so
    // only the part of it the reader is in is meant to be read.
    opacity: BAR_REST_OPACITY + progress.value * (1 - BAR_REST_OPACITY),
    backgroundColor: interpolateColor(progress.value, [0, 1], [idle, on]),
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={style}
      className={cn('h-0.5 rounded-full', className)}
    />
  );
}

export interface SectionRailContentProps extends ViewProps {
  className?: string;
  /**
   * How wide the panel may grow, as a fraction of the screen or a point width.
   * The default leaves room for the rail and the edge it is anchored to; raise
   * it for a screen whose section titles are long enough to be worth wrapping
   * rather than truncating.
   */
  maxWidth?: number | `${number}%`;
  children: ReactNode;
}

/**
 * The expanded panel. Mounted through a portal so it floats over everything,
 * and unmounted after it fades out rather than left behind hidden.
 */
function SectionRailContent({
  className,
  maxWidth = PANEL_MAX_WIDTH,
  children,
  ...props
}: SectionRailContentProps) {
  const context = useSectionRail('SectionRail.Content');
  const { open, close, placement, align } = context;
  const insets = useSafeAreaInsets();

  if (!open) return null;

  return (
    <Portal>
      {/* A press anywhere else puts it away. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={close}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <SectionRailContext.Provider value={context}>
        <Animated.View
          entering={FadeIn.duration(140)}
          exiting={FadeOut.duration(120)}
          // Aligned the same way the rail is, so a panel opened from a corner
          // unfolds out of that corner instead of appearing across the middle
          // of the screen away from the thing that was pressed.
          className={cn('absolute', ALIGNMENT[align])}
          style={{
            top: insets.top,
            bottom: insets.bottom,
            [placement === 'right' ? 'right' : 'left']:
              (placement === 'right' ? insets.right : insets.left) + 12,
          }}
          pointerEvents="box-none"
        >
          <SectionRailPanel className={className} maxWidth={maxWidth} {...props}>
            {children}
          </SectionRailPanel>
        </Animated.View>
      </SectionRailContext.Provider>
    </Portal>
  );
}

/**
 * Split out from Content so the slide-in animated style is not on the same
 * view as the entering/exiting fade — Reanimated will let a layout animation
 * overwrite an animated style that touches the same property.
 */
function SectionRailPanel({
  className,
  maxWidth = PANEL_MAX_WIDTH,
  children,
  ...props
}: SectionRailContentProps) {
  const { placement } = useSectionRail('SectionRail.Content');
  const slide = useSharedValue(0);

  useEffect(() => {
    slide.value = withTiming(1, { duration: 180 });
  }, [slide]);

  // Arrives from the edge it is anchored to, so it reads as the rail
  // unfolding rather than as a panel appearing over it.
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: (1 - slide.value) * (placement === 'right' ? 16 : -16) },
    ],
  }));

  return (
    <Animated.View
      // The cap is a style rather than a class so it can be a prop: a screen
      // whose sections are called "Shipping and returns" needs more room than
      // one whose sections are called "Specs", and a `className` override would
      // be fighting the class already here rather than replacing it.
      style={[style, { maxWidth, minWidth: PANEL_MIN_WIDTH }]}
      accessibilityRole="menu"
      className={cn(
        'gap-0.5 rounded-xl border border-border bg-popover p-1.5 shadow-lg',
        className
      )}
      {...props}
    >
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {textChildren(children)}
      </ScrollView>
    </Animated.View>
  );
}

export interface SectionRailItemProps {
  className?: string;
  /** Section this row jumps to. Matches the root's `value`. */
  value: string;
  /** Nesting depth. Indents the row to match its bar. */
  level?: number;
  children: ReactNode;
}

/** A labelled row in the expanded panel. */
function SectionRailItem({ className, value, level = 0, children }: SectionRailItemProps) {
  const { value: active, onValueChange } = useSectionRail('SectionRail.Item');
  const selected = active === value;

  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ selected }}
      onPress={() => onValueChange?.(value)}
      // `paddingStart`, not `paddingLeft`: the indent has to fall on the same
      // side as the bar it belongs to, which is the trailing edge under RTL.
      style={{ paddingStart: 10 + level * ITEM_INDENT }}
      className={cn(
        'rounded-lg py-1.5 pe-2 active:bg-accent',
        selected && 'bg-accent',
        className
      )}
    >
      <Text
        size="sm"
        weight={selected ? 'medium' : 'normal'}
        className={selected ? 'text-accent-foreground' : 'text-muted-foreground'}
        // Two lines rather than one: a long section title is worth wrapping,
        // and an ellipsis in a navigator hides the very word that tells you
        // which section you are about to jump to.
        numberOfLines={2}
      >
        {children}
      </Text>
    </Pressable>
  );
}

export const SectionRail = Object.assign(SectionRailRoot, {
  Trigger: SectionRailTrigger,
  Bar: SectionRailBar,
  Content: SectionRailContent,
  Item: SectionRailItem,
});
