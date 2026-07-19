import { forwardRef, useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { tv, type VariantProps } from 'tailwind-variants';
import { CheckIcon } from '../../icons';
import { Text } from '../../primitives/text';

const checkboxVariants = tv({
  slots: {
    row: 'flex-row items-center gap-2.5',
    box: 'h-5 w-5 items-center justify-center rounded-md border border-input bg-background',
    fill: 'absolute inset-0 items-center justify-center rounded-md bg-primary',
    label: 'text-sm text-foreground',
  },
  variants: {
    disabled: {
      true: { row: 'opacity-50' },
    },
  },
});

export interface CheckboxProps extends VariantProps<typeof checkboxVariants> {
  className?: string;
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** Optional label rendered next to the box; pressing it also toggles. */
  label?: string;
}

export const Checkbox = forwardRef<View, CheckboxProps>(
  ({ className, checked, onCheckedChange, disabled, label }, ref) => {
    const progress = useSharedValue(checked ? 1 : 0);
    const slots = checkboxVariants({ disabled: !!disabled });

    useEffect(() => {
      progress.value = checked
        ? withSpring(1, { damping: 15, stiffness: 300, mass: 0.5 })
        : withTiming(0, { duration: 120 });
    }, [checked, progress]);

    const fillStyle = useAnimatedStyle(() => ({
      opacity: progress.value,
      transform: [{ scale: 0.6 + progress.value * 0.4 }],
    }));

    return (
      <Pressable
        ref={ref}
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled: !!disabled }}
        accessibilityLabel={label}
        disabled={disabled}
        onPress={() => onCheckedChange?.(!checked)}
        hitSlop={8}
        className={slots.row({ className })}
      >
        <View className={slots.box()}>
          <Animated.View style={fillStyle} className={slots.fill()}>
            <CheckIcon size={12} />
          </Animated.View>
        </View>
        {label ? <Text className={slots.label()}>{label}</Text> : null}
      </Pressable>
    );
  }
);

Checkbox.displayName = 'Checkbox';
