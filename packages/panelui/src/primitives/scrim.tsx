/**
 * Scrim — the layer behind an overlay.
 *
 * An overlay needs the screen behind it to recede. There are two honest ways to
 * do that: dim it, or blur it. Dimming is free and always works; blurring reads
 * as more physical — the content behind stays legible as shape and colour while
 * losing its detail — but it needs a native view to do it.
 *
 * `expo-blur` is resolved lazily and only when `blur` is asked for, so a project
 * that never blurs anything installs nothing. When it is asked for and the
 * package is missing, this falls back to a dim rather than failing: a blur you
 * cannot draw is better shown as a darkened screen than as a crash.
 *
 * It fills its parent and does not intercept touches itself — the overlay layers
 * its own dismiss `Pressable` over it — so it is purely the visual backdrop.
 */
import { type ComponentType } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface BlurViewProps {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default' | 'systemMaterial';
  style?: unknown;
  children?: React.ReactNode;
}

/**
 * `expo-blur`'s BlurView, or null when it is not installed. Resolved once at
 * module load — the require is cheap and caching it avoids a try/catch on every
 * render.
 */
const BlurView: ComponentType<BlurViewProps> | null = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-blur');
    return (mod?.BlurView as ComponentType<BlurViewProps>) ?? null;
  } catch {
    return null;
  }
})();

/** True when a real blur can be drawn — for a caller that wants to know. */
export const hasBlur = BlurView !== null;

export interface ScrimProps extends Omit<ViewProps, 'children'> {
  /** Frost the backdrop instead of dimming it. Falls back to a dim if it can't. */
  blur?: boolean;
  /** Blur strength, 0–100. */
  intensity?: number;
  /** Which way the blur tints. */
  tint?: 'light' | 'dark' | 'default' | 'systemMaterial';
  /**
   * The dim used when not blurring — and when blurring is asked for but
   * unavailable. A popover passes a lighter one than a dialog.
   */
  dimClassName?: string;
}

export function Scrim({
  blur = false,
  intensity = 24,
  tint = 'default',
  dimClassName = 'bg-black/50',
  style,
  ...props
}: ScrimProps) {
  if (blur && BlurView) {
    return (
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(150)}
        style={[StyleSheet.absoluteFill, style]}
        {...props}
      >
        {/* A faint dim under the blur so the frost has something to sit on —
            a pure blur over a dark scene is nearly invisible. */}
        <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
        <View className="absolute inset-0 bg-black/10" />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      style={[StyleSheet.absoluteFill, style]}
      className={dimClassName}
      {...props}
    />
  );
}

Scrim.displayName = 'Scrim';
