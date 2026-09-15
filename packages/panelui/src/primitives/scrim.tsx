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
 * Reduce Transparency replaces the blur with an opaque, tint-aware surface.
 *
 * It fills its parent and does not intercept touches itself — the overlay layers
 * its own dismiss `Pressable` over it — so it is purely the visual backdrop.
 */
import { useEffect, useState, type ComponentType } from 'react';
import { AccessibilityInfo, StyleSheet, View, type ViewProps } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedProps,
  useAnimatedStyle,
  type DerivedValue,
} from 'react-native-reanimated';

type BlurTint = 'light' | 'dark' | 'default' | 'systemMaterial';

interface BlurViewProps {
  intensity?: number;
  tint?: BlurTint;
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

/**
 * The same view, able to take its `intensity` from the UI thread. The package
 * names the native view as the one to animate, so the radius itself moves
 * rather than a finished blur being faded in over the page.
 */
const AnimatedBlurView = BlurView
  ? Animated.createAnimatedComponent(BlurView as ComponentType<BlurViewProps>)
  : null;

type ReduceTransparencySource = {
  isReduceTransparencyEnabled?: () => Promise<boolean>;
  addEventListener?: (
    event: 'reduceTransparencyChanged',
    listener: (enabled: boolean) => void
  ) => { remove?: () => void } | undefined;
};

function observeReduceTransparency(
  source: ReduceTransparencySource,
  onChange: (enabled: boolean) => void
) {
  let active = true;
  let changed = false;
  const update = (enabled: boolean) => {
    changed = true;
    if (active) onChange(Boolean(enabled));
  };
  /*
   * A platform that cannot report the preference has no preference to respect,
   * so blur stays available. A platform that has the API and failed to answer
   * might have it switched on, and that is the case worth being careful about.
   */
  const fallback = (queryable: boolean) => () => {
    if (active && !changed) onChange(queryable);
  };

  let subscription: { remove?: () => void } | undefined;
  try {
    subscription = source.addEventListener?.('reduceTransparencyChanged', update);
  } catch {
    // Some web and test shims expose AccessibilityInfo without every event.
  }

  try {
    if (typeof source.isReduceTransparencyEnabled !== 'function') fallback(false)();
    else {
      void source.isReduceTransparencyEnabled().then((enabled) => {
        // A preference event that arrived while the query was pending is newer.
        if (active && !changed) update(enabled);
      }, fallback(true));
    }
  } catch {
    fallback(true)();
  }

  return () => {
    active = false;
    try {
      subscription?.remove?.();
    } catch {
      // Cleanup stays safe for partial platform shims.
    }
  };
}

/**
 * The last answer the platform gave, shared by every scrim in the process.
 *
 * The query is asynchronous and the preference belongs to the device, not to
 * any one overlay. Without this, each overlay opens not knowing it and draws
 * opaque until the answer arrives — a flash on every dialog for the many people
 * who have the preference off. Remembered here, only the first overlay of a
 * launch can see it.
 */
let knownReduceTransparency: boolean | null = null;

/**
 * Whether the device asks for Reduce Transparency: `true`, `false`, or `null`
 * while the platform has not answered yet. Exported because every material in
 * the library has to respect the same preference, and two copies of this would
 * be two answers.
 */
export function useReduceTransparency() {
  // Not knowing is deliberately conservative: draw opaque until the platform
  // says blur is allowed, rather than flashing blur at someone who opted out.
  const [enabled, setEnabled] = useState<boolean | null>(knownReduceTransparency);
  useEffect(
    () =>
      observeReduceTransparency(AccessibilityInfo, (next) => {
        knownReduceTransparency = next;
        setEnabled(next);
      }),
    []
  );
  return enabled;
}

type ScrimMode = 'blur' | 'dim' | 'opaque';

function scrimMode(blur: boolean, canBlur: boolean, reduceTransparency: boolean | null): ScrimMode {
  if (!blur) return 'dim';
  if (reduceTransparency !== false) return 'opaque';
  return canBlur ? 'blur' : 'dim';
}

function opaqueClassName(tint: BlurTint) {
  if (tint === 'light') return 'bg-white';
  if (tint === 'dark') return 'bg-black';
  return 'bg-background';
}

export interface ScrimProps extends Omit<ViewProps, 'children'> {
  /** Frost the backdrop instead of dimming it. Falls back to a dim if it can't. */
  blur?: boolean;
  /** Blur strength, 0–100. */
  intensity?: number;
  /** Which way the blur tints. */
  tint?: BlurTint;
  /**
   * The dim used when not blurring, when blur is unavailable, and over the
   * opaque Reduce Transparency fallback. A popover passes a lighter one than a dialog.
   */
  dimClassName?: string;
  /**
   * How far the backdrop is in, from `0` to `1`, read on the UI thread.
   *
   * For an overlay the finger can pull partway out — a viewer dragged towards
   * dismissal — where the backdrop has to follow the finger instead of running
   * its own fade. The blur's radius tracks it, and the dim and the opaque
   * fallback track it as opacity. Left out, the scrim fades itself in and out.
   */
  progress?: DerivedValue<number>;
}

export function Scrim({
  blur = false,
  intensity = 24,
  tint = 'default',
  dimClassName = 'bg-black/50',
  progress,
  style,
  ...props
}: ScrimProps) {
  const reduceTransparency = useReduceTransparency();
  const mode = scrimMode(blur, BlurView !== null, reduceTransparency);

  if (progress) {
    return (
      <ProgressScrim
        mode={mode}
        progress={progress}
        intensity={intensity}
        tint={tint}
        dimClassName={dimClassName}
        style={style}
        {...props}
      />
    );
  }

  if (mode === 'blur' && BlurView) {
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

  if (mode === 'opaque') {
    return (
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(150)}
        style={[StyleSheet.absoluteFill, style]}
        {...props}
      >
        <View
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          className={opaqueClassName(tint)}
        />
        <View pointerEvents="none" style={StyleSheet.absoluteFill} className={dimClassName} />
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

interface ProgressScrimProps extends Omit<ViewProps, 'children'> {
  mode: ScrimMode;
  progress: DerivedValue<number>;
  intensity: number;
  tint: BlurTint;
  dimClassName: string;
}

/** The scrim with its three layers driven by a shared value instead of a fade. */
function ProgressScrim({
  mode,
  progress,
  intensity,
  tint,
  dimClassName,
  style,
  ...props
}: ProgressScrimProps) {
  const blurProps = useAnimatedProps(() => ({
    intensity: Math.min(Math.max(progress.value, 0), 1) * intensity,
  }));
  const fade = useAnimatedStyle(() => ({
    opacity: Math.min(Math.max(progress.value, 0), 1),
  }));

  if (mode === 'blur' && AnimatedBlurView) {
    return (
      <View style={[StyleSheet.absoluteFill, style]} {...props}>
        <AnimatedBlurView
          tint={tint}
          animatedProps={blurProps}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, fade]}
          className="bg-black/10"
        />
      </View>
    );
  }

  return (
    <Animated.View style={[StyleSheet.absoluteFill, fade, style]} {...props}>
      {mode === 'opaque' ? (
        <View
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          className={opaqueClassName(tint)}
        />
      ) : null}
      <View pointerEvents="none" style={StyleSheet.absoluteFill} className={dimClassName} />
    </Animated.View>
  );
}
