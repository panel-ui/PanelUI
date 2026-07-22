/**
 * Tabs — segmented navigation between panels.
 *
 * The active tab is marked by one indicator that slides between measured
 * trigger positions rather than by a style on each trigger. That is what makes
 * the movement continuous: there is a single thing travelling, so a switch two
 * tabs away reads as one gesture instead of two states swapping.
 *
 * ```tsx
 * <Tabs defaultValue="account">
 *   <Tabs.List>
 *     <Tabs.Trigger value="account">Account</Tabs.Trigger>
 *     <Tabs.Trigger value="team" badge={<Badge>3</Badge>}>Team</Tabs.Trigger>
 *   </Tabs.List>
 *   <Tabs.Content value="account">…</Tabs.Content>
 * </Tabs>
 * ```
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
import {
  Pressable,
  ScrollView,
  View,
  type LayoutChangeEvent,
  type ViewProps,
} from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { tv } from 'tailwind-variants';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';

const SPRING = { damping: 24, stiffness: 300, mass: 0.7 } as const;

export type TabsVariant = 'segmented' | 'underline' | 'pill';

const tabsVariants = tv({
  slots: {
    list: 'flex-row',
    indicator: 'absolute left-0',
    trigger: 'items-center justify-center',
    label: '',
  },
  variants: {
    variant: {
      // A raised chip travelling inside a recessed track.
      segmented: {
        list: 'rounded-lg bg-muted p-1',
        indicator: 'bottom-1 top-1 rounded-md bg-popover shadow-sm',
        trigger: 'rounded-md py-1.5',
      },
      // No track at all — the indicator is a rule under the active tab, and
      // the row sits on a hairline so inactive tabs still have a baseline.
      underline: {
        list: 'gap-1 border-b border-border',
        indicator: '-bottom-px h-0.5 rounded-full bg-foreground',
        trigger: 'py-2.5',
      },
      // Filled chip on the page rather than in a track; the active label
      // inverts against it.
      pill: {
        list: 'gap-1',
        indicator: 'bottom-0 top-0 rounded-full bg-primary',
        trigger: 'rounded-full py-2',
      },
    },
    active: {
      true: { label: 'text-foreground' },
      false: { label: 'text-muted-foreground' },
    },
    disabled: {
      true: { trigger: 'opacity-[0.44]' },
    },
    /** Intrinsic width in a scroller, equal shares when the row is fixed. */
    scrollable: {
      true: { trigger: 'px-4' },
      false: { trigger: 'flex-1' },
    },
  },
  compoundVariants: [
    { variant: 'pill', active: true, class: { label: 'text-primary-foreground' } },
  ],
  defaultVariants: {
    variant: 'segmented',
    scrollable: false,
  },
});

interface TabLayout {
  x: number;
  width: number;
}

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  registerLayout: (value: string, layout: TabLayout) => void;
  layouts: Record<string, TabLayout>;
  variant: TabsVariant;
  scrollable: boolean;
  setScrollable: (scrollable: boolean) => void;
  keepMounted: boolean;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(component: string): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error(`${component} must be used within a <Tabs>`);
  }
  return context;
}

export interface TabsProps extends ViewProps {
  className?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue: string;
  /**
   * `segmented` is a chip travelling inside a recessed track, `underline` is a
   * rule under the active tab, `pill` is a filled chip on the page.
   */
  variant?: TabsVariant;
  /**
   * Keep inactive panels mounted and hidden instead of unmounting them, so a
   * scroll position or a half-filled form survives a switch away and back.
   * Costs the render of every panel up front.
   */
  keepMounted?: boolean;
  children: ReactNode;
}

function TabsRoot({
  className,
  value,
  onValueChange,
  defaultValue,
  variant = 'segmented',
  keepMounted = false,
  children,
  ...props
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [layouts, setLayouts] = useState<Record<string, TabLayout>>({});
  // Published by the List rather than the root, because it is the List that
  // decides whether it scrolls — but the Triggers below it need to know.
  const [scrollable, setScrollable] = useState(false);
  const isControlled = value !== undefined;
  const resolvedValue = isControlled ? value : internalValue;

  const setValue = useCallback(
    (next: string) => {
      if (!isControlled) setInternalValue(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange]
  );

  const registerLayout = useCallback((tab: string, layout: TabLayout) => {
    setLayouts((current) => {
      const existing = current[tab];
      if (existing && existing.x === layout.x && existing.width === layout.width) {
        return current;
      }
      return { ...current, [tab]: layout };
    });
  }, []);

  const context = useMemo(
    () => ({
      value: resolvedValue,
      setValue,
      registerLayout,
      layouts,
      variant,
      scrollable,
      setScrollable,
      keepMounted,
    }),
    [resolvedValue, setValue, registerLayout, layouts, variant, scrollable, keepMounted]
  );

  return (
    <TabsContext.Provider value={context}>
      <View className={cn('gap-3', className)} {...props}>
        {children}
      </View>
    </TabsContext.Provider>
  );
}

function TabsIndicator() {
  const { value, layouts, variant } = useTabs('Tabs.List');
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const initialized = useSharedValue(0);

  const layout = layouts[value];
  const { indicator } = tabsVariants({ variant });

  // In an effect, not the render body: touching a shared value during render
  // is a Reanimated strict-mode violation, and the write can be lost or
  // duplicated when React re-renders.
  useEffect(() => {
    if (!layout) return;

    if (initialized.value === 0) {
      // First measurement snaps into place; there is nothing to animate from.
      x.value = layout.x;
      width.value = layout.width;
      initialized.value = 1;
    } else {
      x.value = withSpring(layout.x, SPRING);
      width.value = withSpring(layout.width, SPRING);
    }
  }, [layout?.x, layout?.width, x, width, initialized, layout]);

  const style = useAnimatedStyle(() => ({
    opacity: initialized.value,
    transform: [{ translateX: x.value }],
    width: width.value,
  }));

  return <Animated.View style={style} className={indicator()} />;
}

export interface TabsListProps extends ViewProps {
  className?: string;
  /**
   * Lay the triggers out at their natural widths inside a horizontal scroller
   * instead of splitting the row between them. For more tabs than fit — which
   * a fixed row answers by crushing every label.
   */
  scrollable?: boolean;
  children: ReactNode;
}

function TabsList({ className, scrollable = false, children, ...props }: TabsListProps) {
  const { variant, setScrollable, value, layouts } = useTabs('Tabs.List');
  const { list } = tabsVariants({ variant });
  const scroller = useRef<ScrollView>(null);

  useEffect(() => {
    setScrollable(scrollable);
  }, [scrollable, setScrollable]);

  // Bring the active tab into view when it changes from elsewhere — a
  // controlled switch, or a swipe on the panel below.
  const activeLayout = layouts[value];
  useEffect(() => {
    if (!scrollable || !activeLayout) return;
    scroller.current?.scrollTo({
      // Land the tab a little in from the edge rather than flush against it,
      // so it does not read as the last one in the row.
      x: Math.max(activeLayout.x - 24, 0),
      animated: true,
    });
  }, [scrollable, activeLayout?.x, activeLayout]);

  const row = (
    <View accessibilityRole="tablist" className={cn(list(), className)} {...props}>
      <TabsIndicator />
      {children}
    </View>
  );

  if (!scrollable) return row;

  return (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      // The row measures itself, and the indicator is positioned against it,
      // so the scroller must not stretch it to the viewport width.
      contentContainerStyle={{ flexGrow: 0 }}
    >
      {row}
    </ScrollView>
  );
}

export interface TabsTriggerProps {
  className?: string;
  value: string;
  /** Rendered before the label. */
  icon?: ReactNode;
  /** Rendered after the label — a count, a dot, a status. */
  badge?: ReactNode;
  /** Unselectable, dimmed, and announced as disabled. */
  disabled?: boolean;
  children: ReactNode;
}

function TabsTrigger({
  className,
  value,
  icon,
  badge,
  disabled = false,
  children,
}: TabsTriggerProps) {
  const context = useTabs('Tabs.Trigger');
  const active = context.value === value;
  const slots = tabsVariants({
    variant: context.variant,
    active,
    disabled,
    scrollable: context.scrollable,
  });

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      context.registerLayout(value, { x, width });
    },
    [context, value]
  );

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={() => context.setValue(value)}
      onLayout={handleLayout}
      className={cn(slots.trigger(), (icon || badge) && 'flex-row gap-1.5', className)}
    >
      {icon}
      {typeof children === 'string' ? (
        <Text size="sm" weight="medium" className={slots.label()}>
          {children}
        </Text>
      ) : (
        children
      )}
      {badge}
    </Pressable>
  );
}

export interface TabsContentProps extends ViewProps {
  className?: string;
  value: string;
  children: ReactNode;
}

function TabsContent({ className, value, children, style, ...props }: TabsContentProps) {
  const context = useTabs('Tabs.Content');
  const active = context.value === value;

  if (!active && !context.keepMounted) return null;

  /*
   * Hidden rather than unmounted under `keepMounted`, and hidden thoroughly:
   * `display: none` takes it out of layout, and the accessibility props take
   * it out of the reading order too. A screen reader walking through three
   * panels of a tab set it cannot see is worse than no tabs at all.
   */
  return (
    <Animated.View
      // Only worth animating when the panel is genuinely arriving. A kept
      // panel is already there; fading it in every time it is revealed would
      // undo the point of keeping it.
      entering={context.keepMounted ? undefined : FadeIn.duration(150)}
      style={[!active && { display: 'none' }, style]}
      pointerEvents={active ? 'auto' : 'none'}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
      className={className}
      {...props}
    >
      {children}
    </Animated.View>
  );
}

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
});
