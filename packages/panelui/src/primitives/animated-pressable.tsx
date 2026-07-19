import { forwardRef, useCallback } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

const SPRING_CONFIG = { damping: 20, stiffness: 300, mass: 0.4 } as const;

export interface AnimatedPressableProps extends PressableProps {
  className?: string;
  /** Scale applied while pressed. Set to 1 to disable. Default 0.97. */
  pressScale?: number;
  /** Opacity applied while pressed. Set to 1 to disable. Default 1. */
  pressOpacity?: number;
}

/**
 * Pressable with UI-thread press feedback (scale/opacity via Reanimated).
 * The shared base for every interactive PanelUI component.
 */
export const AnimatedPressable = forwardRef<View, AnimatedPressableProps>(
  (
    { pressScale = 0.97, pressOpacity = 1, onPressIn, onPressOut, style, ...props },
    ref
  ) => {
    const pressed = useSharedValue(0);

    const handlePressIn = useCallback(
      (event: GestureResponderEvent) => {
        pressed.value = withTiming(1, { duration: 80 });
        onPressIn?.(event);
      },
      [onPressIn, pressed]
    );

    const handlePressOut = useCallback(
      (event: GestureResponderEvent) => {
        pressed.value = withSpring(0, SPRING_CONFIG);
        onPressOut?.(event);
      },
      [onPressOut, pressed]
    );

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: 1 + pressed.value * (pressScale - 1) }],
      opacity: 1 + pressed.value * (pressOpacity - 1),
    }));

    return (
      <AnimatedPressableBase
        ref={ref}
        style={[animatedStyle, style as never]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...props}
      />
    );
  }
);

AnimatedPressable.displayName = 'AnimatedPressable';
