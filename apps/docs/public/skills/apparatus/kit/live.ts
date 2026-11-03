/**
 * Making an apparatus figure move.
 *
 * Everything that changes per frame runs on the UI thread. The figure's state
 * lives in shared values, a frame callback steps the model, and each moving
 * layer reads the model in an animated style. React renders the figure once;
 * after that only the readout text re-renders, and only when the number it
 * shows changes.
 *
 * The transforms here are 2D affine maps in screen points, `[a, b, c, d, e, f]`
 * in SVG's `matrix()` order, so a part can slide along a world axis, turn about
 * an axis drawn in a face, or stretch along its own length.
 */
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import {
  runOnJS,
  useAnimatedReaction,
  useFrameCallback,
  useReducedMotion,
  type SharedValue,
} from 'react-native-reanimated';
import type { Projector } from './iso';

export type Affine = [number, number, number, number, number, number];

/* ---- Affine maps (worklets) ---- */

export const IDENTITY: Affine = [1, 0, 0, 1, 0, 0];

/** `m` then `n`: the map that applies `n` first and `m` after. */
export function compose(m: Affine, n: Affine): Affine {
  'worklet';
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export function invert(m: Affine): Affine {
  'worklet';
  const det = m[0] * m[3] - m[1] * m[2] || 1e-9;
  const a = m[3] / det;
  const b = -m[1] / det;
  const c = -m[2] / det;
  const d = m[0] / det;
  return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
}

/**
 * Turn a part by `angle` radians about the point `(s, t)` of a plane, where
 * `plane` is that plane's `planeMatrix`. The result is a screen map for the
 * layer the part is drawn in: a knob turning on a face, a lever swinging on its
 * pivot, a needle sweeping a dial.
 */
export function rotateInPlane(plane: Affine, angle: number, s = 0, t = 0): Affine {
  'worklet';
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const local: Affine = [cos, sin, -sin, cos, s - cos * s + sin * t, t - sin * s - cos * t];
  return compose(compose(plane, local), invert(plane));
}

/**
 * Stretch a part along a plane's first axis by `k`, holding `s` still: a coil
 * spring compressing against its fixed end, a bellows, a ruler extending.
 */
export function stretchInPlane(plane: Affine, k: number, s = 0): Affine {
  'worklet';
  const local: Affine = [k, 0, 0, 1, s - k * s, 0];
  return compose(compose(plane, local), invert(plane));
}

/** The style that applies an affine map to a layer. */
export function matrixStyle(m: Affine) {
  'worklet';
  return {
    transform: [{ matrix: [m[0], m[1], 0, 0, m[2], m[3], 0, 0, 0, 0, 1, 0, m[4], m[5], 0, 1] }],
  };
}

/** The style that slides a layer by a screen offset — `view.delta` of the world move. */
export function slideStyle(dx: number, dy: number) {
  'worklet';
  return { transform: [{ translateX: dx }, { translateY: dy }] };
}

/* ---- Motion (worklets) ---- */

/**
 * Move `current` towards `target`, covering the same fraction of the gap every
 * second whatever the frame rate. `rate` is how many times a second the gap
 * shrinks by e; 8 feels attentive, 3 feels heavy.
 */
export function follow(current: number, target: number, rate: number, dt: number): number {
  'worklet';
  return target + (current - target) * Math.exp(-rate * dt);
}

export interface SpringState {
  x: number;
  v: number;
}

/**
 * One step of a damped spring pulling `state.x` towards `target`, integrated
 * in small sub-steps so a stiff spring stays stable at 30 fps. The same
 * equation a spring animation solves, so a figure can show the curve a real
 * one would trace.
 */
export function springStep(
  state: SpringState,
  target: number,
  params: { stiffness: number; damping: number; mass: number },
  dt: number
): SpringState {
  'worklet';
  const steps = Math.max(1, Math.ceil(dt / 0.002));
  const h = dt / steps;
  let x = state.x;
  let v = state.v;
  for (let i = 0; i < steps; i += 1) {
    const force = -params.stiffness * (x - target) - params.damping * v;
    v += (force / params.mass) * h;
    x += v * h;
  }
  return { x, v };
}

/* ---- Hooks ---- */

/**
 * A frame loop for the model, stepped with the time since the last frame in
 * seconds. The step is capped at 1/20 s, so a figure that was paused does not
 * leap when it resumes. It runs only while `active` and the app is in the
 * foreground; tie `active` to the screen's focus.
 *
 * `step` runs on the UI thread, so it must be a worklet: start its body with
 * `'worklet';` and let it touch only shared values and other worklets.
 */
export function useFigureClock(step: (dt: number, now: number) => void, active = true) {
  const foreground = useForeground();
  const callback = useFrameCallback((frame) => {
    'worklet';
    const dt = Math.min((frame.timeSincePreviousFrame ?? 16) / 1000, 0.05);
    step(dt, frame.timestamp);
  }, false);
  useEffect(() => {
    callback.setActive(active && foreground);
  }, [active, foreground, callback]);
}

function useForeground() {
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setForeground(state === 'active');
    });
    return () => subscription.remove();
  }, []);
  return foreground;
}

/**
 * Whether the figure should hold still: the system's reduce-motion setting.
 * A still figure skips its idle tour and jumps to each new state instead of
 * travelling there. The readout still updates.
 */
export function useStillness(): boolean {
  return useReducedMotion();
}

/**
 * A model value brought to React, rounded to `quantum`, re-rendering only when
 * the rounded number changes. For the readout and the accessibility value.
 */
export function useReadout(value: SharedValue<number>, quantum = 1): number {
  const [shown, setShown] = useState(() => roundTo(value.value, quantum));
  useAnimatedReaction(
    () => Math.round(value.value / quantum) * quantum,
    (next, previous) => {
      if (next !== previous) runOnJS(setShown)(next);
    }
  );
  return shown;
}

function roundTo(value: number, quantum: number) {
  return Math.round(value / quantum) * quantum;
}

interface HapticsModule {
  selectionAsync: () => Promise<void>;
  impactAsync: (style?: unknown) => Promise<void>;
  ImpactFeedbackStyle?: Record<string, unknown>;
}

let haptics: HapticsModule | null | undefined;

/** `expo-haptics` when it is installed, or nothing. A figure is never broken by its absence. */
function loadHaptics(): HapticsModule | null {
  if (haptics !== undefined) return haptics;
  if (Platform.OS === 'web') return (haptics = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    haptics = require('expo-haptics') as HapticsModule;
  } catch {
    haptics = null;
  }
  return haptics;
}

/** A light tick, for a detent or a step. Fire-and-forget. */
export function tick() {
  loadHaptics()?.selectionAsync().catch(() => {});
}

/** A firmer knock, for a part hitting a stop or an event firing. */
export function knock() {
  const module = loadHaptics();
  module?.impactAsync(module.ImpactFeedbackStyle?.Medium).catch(() => {});
}

/**
 * Ticks each time `value` crosses a multiple of `step`: the detents of a knob,
 * the teeth of a ratchet, the marks of a scale passing a pointer.
 */
export function useDetents(value: SharedValue<number>, step: number, enabled = true) {
  useAnimatedReaction(
    () => Math.floor(value.value / step),
    (next, previous) => {
      if (enabled && previous !== null && next !== previous) runOnJS(tick)();
    }
  );
}

/** A world point on screen, through the numbers from `projector(view)`, on the UI thread. */
export function projectWith(p: Projector, x: number, y: number, z: number): [number, number] {
  'worklet';
  return [p[0] * x + p[2] * y + p[4] * z + p[6], p[1] * x + p[3] * y + p[5] * z + p[7]];
}
