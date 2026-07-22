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
  createContext,
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
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';

const SPRING = { damping: 20, stiffness: 260, mass: 0.6 } as const;
/** Bar width at the top level, and how much each nested level takes off it. */
const BAR_WIDTH = 16;
const BAR_LEVEL_STEP = 4;
/** How much wider the active bar gets, so position is readable at a glance. */
const BAR_ACTIVE_EXTRA = 8;
/** Indent per level in the expanded panel. */
const ITEM_INDENT = 12;

export type SectionRailPlacement = 'left' | 'right';

interface SectionRailContextValue {
  value: string | undefined;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  close: () => void;
  placement: SectionRailPlacement;
}

const SectionRailContext = createContext<SectionRailContextValue | null>(null);

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

  // A pending close must not fire after the rail has gone.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const handleValueChange = useCallback(
    (next: string) => {
      if (!isControlled) setInternalValue(next);
      onValueChange?.(next);

      if (closeDelay <= 0) {
        setOpen(false);
        return;
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setOpen(false), closeDelay);
    },
    [isControlled, onValueChange, closeDelay, setOpen]
  );

  const context = useMemo(
    () => ({
      value,
      onValueChange: handleValueChange,
      open,
      setOpen,
      close,
      placement,
    }),
    [value, handleValueChange, open, setOpen, close, placement]
  );

  return (
    <SectionRailContext.Provider value={context}>
      <View
        // `box-none` and not `none`: the rail's own children still take
        // touches, but the empty column around them does not — otherwise a
        // strip down the side of the screen would swallow every scroll.
        pointerEvents="box-none"
        className={cn(
          'absolute justify-center',
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
        {children}
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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sections"
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen(!open)}
      // Generous padding is the hit target; the bars themselves are hairlines.
      hitSlop={8}
      className={cn(
        'gap-2 py-3',
        placement === 'right' ? 'items-end pl-6 pr-2' : 'items-start pl-2 pr-6',
        className
      )}
      {...props}
    >
      {children}
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

/** One section, drawn as a bar. Widens and brightens when it is the active one. */
function SectionRailBar({ className, value, level = 0 }: SectionRailBarProps) {
  const { value: active } = useSectionRail('SectionRail.Bar');
  const selected = active === value;

  const restColor = useCSSVariable('--color-muted-foreground');
  const activeColor = useCSSVariable('--color-foreground');

  const base = Math.max(BAR_WIDTH - level * BAR_LEVEL_STEP, 6);
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(selected ? 1 : 0, SPRING);
  }, [selected, progress]);

  const idle = typeof restColor === 'string' ? restColor : '#818181';
  const on = typeof activeColor === 'string' ? activeColor : '#f5f5f5';

  const style = useAnimatedStyle(() => ({
    width: base + progress.value * BAR_ACTIVE_EXTRA,
    // The inactive bars are dim on purpose — the rail is a position
    // indicator, so only one of them is meant to be read.
    opacity: 0.4 + progress.value * 0.6,
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
  children: ReactNode;
}

/**
 * The expanded panel. Mounted through a portal so it floats over everything,
 * and unmounted after it fades out rather than left behind hidden.
 */
function SectionRailContent({ className, children, ...props }: SectionRailContentProps) {
  const context = useSectionRail('SectionRail.Content');
  const { open, close, placement } = context;
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
          className="absolute justify-center"
          style={{
            top: insets.top,
            bottom: insets.bottom,
            [placement === 'right' ? 'right' : 'left']:
              (placement === 'right' ? insets.right : insets.left) + 12,
          }}
          pointerEvents="box-none"
        >
          <SectionRailPanel className={className} {...props}>
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
function SectionRailPanel({ className, children, ...props }: SectionRailContentProps) {
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
      style={style}
      accessibilityRole="menu"
      className={cn(
        'max-w-[60%] gap-0.5 rounded-2xl border border-border bg-popover p-2 shadow-lg',
        className
      )}
      {...props}
    >
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {children}
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
      style={{ paddingLeft: 12 + level * ITEM_INDENT }}
      className={cn(
        'rounded-lg py-2 pr-3 active:bg-accent',
        selected && 'bg-accent',
        className
      )}
    >
      <Text
        size="sm"
        weight={selected ? 'medium' : 'normal'}
        className={selected ? 'text-foreground' : 'text-muted-foreground'}
        numberOfLines={1}
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
