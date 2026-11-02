import { forwardRef, useEffect } from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { tv, type VariantProps } from 'tailwind-variants';
import { useDirectionSign } from '../../hooks/use-direction';
import { NativeHost, getNativeUI } from '../../native';
import { selectionTick } from '../../utils/haptics';
import { useFieldLabelledBy } from '../field';
import type { ViewRef } from '../../primitives/refs';

const SPRING = { damping: 18, stiffness: 250, mass: 0.5 } as const;

const switchVariants = tv({
  slots: {
    track: 'justify-center rounded-full border border-transparent bg-input p-[3px]',
    activeTrack: 'absolute inset-0 rounded-full bg-primary',
    thumb: 'rounded-full bg-white shadow-sm',
  },
  variants: {
    // Each track is its thumb plus the 3pt of padding and 1pt of border on
    // either side, and twice as wide as it is tall. `TRAVEL` below is what is
    // left of that width once the thumb is in it.
    size: {
      xs: { track: 'h-5 w-8', thumb: 'h-3 w-3' },
      sm: { track: 'h-6 w-10', thumb: 'h-4 w-4' },
      md: { track: 'h-7 w-12', thumb: 'h-5 w-5' },
      lg: { track: 'h-8 w-14', thumb: 'h-6 w-6' },
      xl: { track: 'h-9 w-16', thumb: 'h-7 w-7' },
    },
    disabled: {
      true: { track: 'opacity-50' },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

/** How big a switch is. */
export type SwitchSize = NonNullable<VariantProps<typeof switchVariants>['size']>;

const TRAVEL: Record<SwitchSize, number> = { xs: 12, sm: 16, md: 20, lg: 24, xl: 28 };

/**
 * Room around each track so the target reaches 48dp on both axes.
 *
 * Slop rather than a bigger box, because a box is layout: a switch sized to
 * its target would stand 48dp tall in every row it has ever been placed in,
 * and the tracks are 20 to 36 tall. From `md` up the track is already 48 wide,
 * which is why only the two smallest have horizontal figures.
 */
const SWITCH_HIT_SLOP: Record<SwitchSize, { top: number; bottom: number; left: number; right: number }> = {
  xs: { top: 14, bottom: 14, left: 8, right: 8 },
  sm: { top: 12, bottom: 12, left: 4, right: 4 },
  md: { top: 10, bottom: 10, left: 0, right: 0 },
  lg: { top: 8, bottom: 8, left: 0, right: 0 },
  xl: { top: 6, bottom: 6, left: 0, right: 0 },
};

export interface SwitchProps
  extends VariantProps<typeof switchVariants>,
    Pick<PressableProps, 'accessibilityLabel' | 'accessibilityHint' | 'accessibilityLabelledBy'> {
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
  /** Names the control to assistive technology; native mode also draws it. */
  label?: string;
  /**
   * Tick the haptic engine each time the switch is flipped — a toggle you feel
   * click rather than one that merely slides. Needs the optional
   * `expo-haptics`, and is silent without it. Ignored in `native` mode, where
   * the platform control owns its own feedback.
   */
  haptics?: boolean;
}

/**
 * Animated switch. Thumb position and active-track opacity are driven on the
 * UI thread; toggling never re-renders beyond the value change itself.
 */
/**
 * The box the platform toggle is given, in points.
 *
 * Taller than either platform's switch — 31 on iOS, 32 on Android — so the
 * control is never clipped by the box it is centred in, and short enough that
 * a row built around it is still a row.
 */
const NATIVE_TOGGLE_HEIGHT = 32;

export const Switch = forwardRef<ViewRef, SwitchProps>(
  (
    {
      className,
      value,
      onValueChange,
      disabled,
      size = 'md',
      native,
      label,
      haptics,
      accessibilityLabel,
      accessibilityHint,
      accessibilityLabelledBy,
    },
    ref
  ) => {
    const progress = useSharedValue(value ? 1 : 0);
    // The track is mirrored by Yoga, but a transform is not — so "on" would
    // otherwise still be on the right in a right-to-left subtree, which reads
    // as the toggle running backwards.
    const sign = useDirectionSign();
    const nativeUI = native ? getNativeUI() : null;
    const slots = switchVariants({ size, disabled: !!disabled });
    // React Native's labelled-by relationship is Android-only. `label` or an
    // explicit accessibilityLabel remains the portable name on iOS.
    const fieldLabelledBy = useFieldLabelledBy();

    useEffect(() => {
      progress.value = withSpring(value ? 1 : 0, SPRING);
    }, [value, progress]);

    const thumbStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: interpolate(progress.value, [0, 1], [0, TRAVEL[size] * sign]) },
      ],
    }));

    const activeTrackStyle = useAnimatedStyle(() => ({
      opacity: progress.value,
    }));

    if (nativeUI) {
      const { Host, Switch: NativeSwitch } = nativeUI;
      return (
        /*
         * The height is stated; only the width is matched.
         *
         * `matchContents` hands an axis to the platform for good — the host
         * writes the measured size back into the layout every time the
         * platform's geometry changes, not once on mount — and the vertical
         * axis is the one that moves everything below it when it does. A
         * toggle's height is the one number here that does not vary, so it is
         * given rather than asked for; its width is the platform's and stays
         * the platform's.
         */
        <NativeHost
          host={Host}
          matchContents={{ horizontal: true }}
          ignoreSafeArea="keyboard"
          style={{ height: NATIVE_TOGGLE_HEIGHT }}
        >
          <NativeSwitch
            value={value}
            onValueChange={(next: boolean) => onValueChange?.(next)}
            label={label ?? accessibilityLabel}
            disabled={disabled}
          />
        </NativeHost>
      );
    }

    return (
      <Pressable
        ref={ref}
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled: !!disabled }}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        accessibilityLabelledBy={
          accessibilityLabelledBy ?? (accessibilityLabel || label ? undefined : fieldLabelledBy)
        }
        disabled={disabled}
        onPress={() => {
          if (haptics) selectionTick();
          onValueChange?.(!value);
        }}
        hitSlop={SWITCH_HIT_SLOP[size]}
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
