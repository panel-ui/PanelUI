import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, View, type LayoutChangeEvent, type ViewProps } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';

const SPRING = { damping: 24, stiffness: 300, mass: 0.7 } as const;

interface TabLayout {
  x: number;
  width: number;
}

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  registerLayout: (value: string, layout: TabLayout) => void;
  layouts: Record<string, TabLayout>;
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
  children: ReactNode;
}

function TabsRoot({
  className,
  value,
  onValueChange,
  defaultValue,
  children,
  ...props
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [layouts, setLayouts] = useState<Record<string, TabLayout>>({});
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
    () => ({ value: resolvedValue, setValue, registerLayout, layouts }),
    [resolvedValue, setValue, registerLayout, layouts]
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
  const { value, layouts } = useTabs('Tabs.List');
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const initialized = useSharedValue(0);

  const layout = layouts[value];

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

  return (
    <Animated.View
      style={style}
      className="absolute bottom-1 top-1 left-0 rounded-md bg-popover shadow-sm"
    />
  );
}

export interface TabsListProps extends ViewProps {
  className?: string;
  children: ReactNode;
}

function TabsList({ className, children, ...props }: TabsListProps) {
  return (
    <View
      accessibilityRole="tablist"
      className={cn('flex-row rounded-lg bg-muted p-1', className)}
      {...props}
    >
      <TabsIndicator />
      {children}
    </View>
  );
}

export interface TabsTriggerProps {
  className?: string;
  value: string;
  children: ReactNode;
}

function TabsTrigger({ className, value, children }: TabsTriggerProps) {
  const context = useTabs('Tabs.Trigger');
  const active = context.value === value;

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
      accessibilityState={{ selected: active }}
      onPress={() => context.setValue(value)}
      onLayout={handleLayout}
      className={cn('flex-1 items-center justify-center rounded-md py-1.5', className)}
    >
      {typeof children === 'string' ? (
        <Text
          size="sm"
          weight="medium"
          className={active ? 'text-foreground' : 'text-muted-foreground'}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

export interface TabsContentProps extends ViewProps {
  className?: string;
  value: string;
  children: ReactNode;
}

function TabsContent({ className, value, children, ...props }: TabsContentProps) {
  const context = useTabs('Tabs.Content');
  if (context.value !== value) return null;

  return (
    <Animated.View entering={FadeIn.duration(150)} className={className} {...props}>
      {children}
    </Animated.View>
  );
}

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
});
