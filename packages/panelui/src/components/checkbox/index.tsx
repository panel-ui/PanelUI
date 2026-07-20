import { forwardRef, useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { CheckIcon } from '../../icons';
import { Text } from '../../primitives/text';

const checkboxVariants = tv({
  slots: {
    row: 'flex-row items-center gap-2.5',
    box: 'h-5 w-5 items-center justify-center rounded-md border border-input bg-background',
    fill: 'absolute inset-0 items-center justify-center rounded-md bg-primary',
    content: 'flex-1 gap-0.5',
    label: 'text-sm text-foreground',
    description: 'text-sm text-muted-foreground',
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
  /** Secondary line under the label, for extra context. */
  description?: string;
}

export const Checkbox = forwardRef<View, CheckboxProps>(
  ({ className, checked, onCheckedChange, disabled, label, description }, ref) => {
    const progress = useSharedValue(checked ? 1 : 0);
    const slots = checkboxVariants({ disabled: !!disabled });
    const checkColor = useCSSVariable('--color-primary-foreground');

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
        accessibilityHint={description}
        disabled={disabled}
        onPress={() => onCheckedChange?.(!checked)}
        hitSlop={8}
        // A description makes the row two lines tall — align the box to the
        // label rather than centring it against the whole block.
        className={slots.row({ className: description ? `items-start ${className ?? ''}` : className })}
      >
        <View className={slots.box()}>
          <Animated.View style={fillStyle} className={slots.fill()}>
            <CheckIcon
              size={12}
              color={typeof checkColor === 'string' ? checkColor : '#fff'}
            />
          </Animated.View>
        </View>
        {label || description ? (
          <View className={slots.content()}>
            {label ? <Text className={slots.label()}>{label}</Text> : null}
            {description ? (
              <Text className={slots.description()}>{description}</Text>
            ) : null}
          </View>
        ) : null}
      </Pressable>
    );
  }
);

Checkbox.displayName = 'Checkbox';
