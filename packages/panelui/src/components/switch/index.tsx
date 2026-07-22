import { forwardRef, useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { tv, type VariantProps } from 'tailwind-variants';
import { getNativeUI } from '../../native';

const SPRING = { damping: 18, stiffness: 250, mass: 0.5 } as const;

const switchVariants = tv({
  slots: {
    track: 'justify-center rounded-full border border-transparent bg-input p-[3px]',
    activeTrack: 'absolute inset-0 rounded-full bg-primary',
    thumb: 'rounded-full bg-white shadow-sm',
  },
  variants: {
    size: {
      sm: { track: 'h-6 w-10', thumb: 'h-4 w-4' },
      md: { track: 'h-7 w-12', thumb: 'h-5 w-5' },
    },
    disabled: {
      true: { track: 'opacity-50' },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const TRAVEL: Record<'sm' | 'md', number> = { sm: 16, md: 20 };

/**
 * Row height given to the native host. It is told its size rather than asked
 * to measure the platform's own content, which arrives a frame late and leaves
 * the control collapsed until something forces a second pass.
 */
const NATIVE_HEIGHT = 32;

export interface SwitchProps extends VariantProps<typeof switchVariants> {
  className?: string;
  value: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  /**
   * Render the platform's own switch instead of this one. Requires the
   * optional `@expo/ui` package; without it this prop does nothing.
   *
   * **Theme tokens do not apply** — the platform draws the control, so
   * `className` and `size` are ignored.
   */
  native?: boolean;
  /** Text label drawn beside the control. Native mode only. */
  label?: string;
}

/**
 * Animated switch. Thumb position and active-track opacity are driven on the
 * UI thread; toggling never re-renders beyond the value change itself.
 */
export const Switch = forwardRef<View, SwitchProps>(
  ({ className, value, onValueChange, disabled, size = 'md', native, label }, ref) => {
    const progress = useSharedValue(value ? 1 : 0);
    const nativeUI = native ? getNativeUI() : null;
    const slots = switchVariants({ size, disabled: !!disabled });

    useEffect(() => {
      progress.value = withSpring(value ? 1 : 0, SPRING);
    }, [value, progress]);

    const thumbStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: interpolate(progress.value, [0, 1], [0, TRAVEL[size]]) },
      ],
    }));

    const activeTrackStyle = useAnimatedStyle(() => ({
      opacity: progress.value,
    }));

    if (nativeUI) {
      const { Host, Switch: NativeSwitch } = nativeUI;
      return (
        <Host style={{ height: NATIVE_HEIGHT }}>
          <NativeSwitch
            value={value}
            onValueChange={(next: boolean) => onValueChange?.(next)}
            label={label}
            disabled={disabled}
          />
        </Host>
      );
    }

    return (
      <Pressable
        ref={ref}
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled: !!disabled }}
        disabled={disabled}
        onPress={() => onValueChange?.(!value)}
        hitSlop={8}
      >
        <View className={slots.track({ className })}>
          <Animated.View style={activeTrackStyle} className={slots.activeTrack()} />
          <Animated.View style={thumbStyle} className={slots.thumb()} />
        </View>
      </Pressable>
    );
  }
);

Switch.displayName = 'Switch';
