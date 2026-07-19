import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { Pressable, View, type ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { cn } from '../../utils/cn';
import { Text } from '../../primitives/text';

interface RadioGroupContextValue {
  value: string | undefined;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps extends ViewProps {
  className?: string;
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}

const RadioGroupRoot = forwardRef<View, RadioGroupProps>(
  ({ className, value, onValueChange, disabled, children, ...props }, ref) => {
    const context = useMemo(
      () => ({ value, onValueChange, disabled }),
      [value, onValueChange, disabled]
    );

    return (
      <RadioGroupContext.Provider value={context}>
        <View
          ref={ref}
          accessibilityRole="radiogroup"
          className={cn('gap-3', className)}
          {...props}
        >
          {children}
        </View>
      </RadioGroupContext.Provider>
    );
  }
);
RadioGroupRoot.displayName = 'RadioGroup';

export interface RadioGroupItemProps {
  className?: string;
  value: string;
  label?: string;
  disabled?: boolean;
  children?: ReactNode;
}

const RadioGroupItem = forwardRef<View, RadioGroupItemProps>(
  ({ className, value, label, disabled: itemDisabled, children }, ref) => {
    const context = useContext(RadioGroupContext);
    if (!context) {
      throw new Error('RadioGroup.Item must be used within a <RadioGroup>');
    }

    const selected = context.value === value;
    const disabled = itemDisabled || context.disabled;
    const progress = useSharedValue(selected ? 1 : 0);

    useEffect(() => {
      progress.value = selected
        ? withSpring(1, { damping: 15, stiffness: 300, mass: 0.5 })
        : withTiming(0, { duration: 120 });
    }, [selected, progress]);

    const dotStyle = useAnimatedStyle(() => ({
      opacity: progress.value,
      transform: [{ scale: progress.value }],
    }));

    return (
      <Pressable
        ref={ref}
        accessibilityRole="radio"
        accessibilityState={{ selected, disabled: !!disabled }}
        accessibilityLabel={label}
        disabled={disabled}
        onPress={() => context.onValueChange(value)}
        hitSlop={8}
        className={cn(
          'flex-row items-center gap-2.5',
          disabled && 'opacity-50',
          className
        )}
      >
        <View className="h-5 w-5 items-center justify-center rounded-full border border-input bg-background">
          <Animated.View
            style={dotStyle}
            className="h-2.5 w-2.5 rounded-full bg-primary"
          />
        </View>
        {label ? <Text className="text-sm text-foreground">{label}</Text> : children}
      </Pressable>
    );
  }
);
RadioGroupItem.displayName = 'RadioGroup.Item';

export const RadioGroup = Object.assign(RadioGroupRoot, {
  Item: RadioGroupItem,
});
