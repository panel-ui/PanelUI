import { forwardRef, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
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
import { useResolveClassNames } from 'uniwind';
import type { ViewRef } from './refs';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

const SPRING_CONFIG = { damping: 20, stiffness: 300, mass: 0.4 } as const;

export interface AnimatedPressableProps extends PressableProps {
  className?: string;
  /** Scale applied while pressed. Set to 1 to disable. Default 0.97. */
  pressScale?: number;
  /**
   * Opacity applied while pressed, as a fraction of the resting opacity. Set
   * to 1 to disable. Default 1.
   */
  pressOpacity?: number;
}

/**
 * Pressable with UI-thread press feedback (scale/opacity via Reanimated).
 * The shared base for every interactive PanelUI component.
 *
 * The animated style is applied after the `className` styles, so any key it
 * writes beats the same key from a class. That is why it writes `opacity` only
 * when the press actually fades: a component that dims itself when disabled
 * (`opacity-[0.64]`, or a caller's `disabled:opacity-50`) does it through the
 * class, and an animated `opacity: 1` at rest would undo it on every render.
 *
 * A pressable that does fade owns its opacity outright, so it reads the
 * resting value from `style` or `className` and fades from there rather than
 * from 1. Keep `pressOpacity` either 1 or not for the life of a component:
 * the style's keys follow it.
 */
export const AnimatedPressable = forwardRef<ViewRef, AnimatedPressableProps>(
  (
    {
      pressScale = 0.97,
      pressOpacity = 1,
      onPressIn,
      onPressOut,
      style,
      className,
      ...props
    },
    ref
  ) => {
    const pressed = useSharedValue(0);
    const fades = pressOpacity !== 1;

    // Only resolved when the press fades; an empty class resolves to nothing.
    const classStyle = useResolveClassNames(fades ? (className ?? '') : '');
    const ownStyle = typeof style === 'function' ? undefined : StyleSheet.flatten(style);
    const restingOpacity =
      typeof ownStyle?.opacity === 'number'
        ? ownStyle.opacity
        : typeof classStyle.opacity === 'number'
          ? classStyle.opacity
          : 1;

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

    const animatedStyle = useAnimatedStyle(() => {
      const transform = [{ scale: 1 + pressed.value * (pressScale - 1) }];
      return fades
        ? { transform, opacity: restingOpacity * (1 + pressed.value * (pressOpacity - 1)) }
        : { transform };
    });

    return (
      <AnimatedPressableBase
        ref={ref}
        className={className}
        style={[animatedStyle, style as never]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...props}
      />
    );
  }
);

AnimatedPressable.displayName = 'AnimatedPressable';
