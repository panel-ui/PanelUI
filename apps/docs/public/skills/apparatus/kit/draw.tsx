/**
 * Drawing an apparatus figure in React Native.
 *
 * A figure is a stack of layers. Each layer is one native SVG view filling the
 * stage, so the stack is the painter's order: what is behind a moving part goes
 * in a layer under it, what passes in front of it goes in a layer over it. The
 * art inside a layer is built once; a moving part moves because its whole layer
 * is transformed on the UI thread (see `live.ts`), which costs the same whether
 * the part is three paths or three hundred, and never re-renders anything.
 *
 * Colours come from the theme through `usePalette`, so a figure follows light
 * and dark without a colour written in it.
 */
import { createContext, useContext, useId, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import type { Solid as SolidShape, Vec2 } from './iso';
import { shade, strokes, type Palette } from './tones';

/* ---- Palette ---- */

function token(value: unknown, fallback: string) {
  return typeof value === 'string' && value.length ? value : fallback;
}

/** The theme's card, ink and accent, read live so a theme switch repaints the figure. */
export function usePalette(): Palette {
  const card = useCSSVariable('--color-card');
  const ink = useCSSVariable('--color-foreground');
  const accent = useCSSVariable('--color-primary');
  return useMemo(
    () => ({
      card: token(card, '#ffffff'),
      ink: token(ink, '#0a0a0a'),
      accent: token(accent, '#2563eb'),
    }),
    [card, ink, accent]
  );
}

interface StageContext {
  palette: Palette;
  width: number;
  height: number;
}

const Stage = createContext<StageContext | null>(null);

function useStage(name: string): StageContext {
  const stage = useContext(Stage);
  if (!stage) throw new Error(`${name} must be inside <IsoStage>.`);
  return stage;
}

/* ---- Stage and layers ---- */

export interface IsoStageProps {
  width: number;
  height: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The box a figure is drawn in. Holds the palette and the size for its layers.
 * Put the gesture detector around it, not inside: layers never take touches.
 */
export function IsoStage({ width, height, children, style }: IsoStageProps) {
  const palette = usePalette();
  const value = useMemo(() => ({ palette, width, height }), [palette, width, height]);
  return (
    <Stage.Provider value={value}>
      <View style={[{ width, height }, style]}>{children}</View>
    </Stage.Provider>
  );
}

export interface LayerProps {
  children: ReactNode;
  /** An animated style from `live.ts` that moves the whole layer. Omit for a static one. */
  style?: AnimatedStyle<ViewStyle>;
}

/**
 * One sheet of the painter's stack. Static layers need nothing else; a moving
 * one takes the animated style that moves it. Transforms are applied about the
 * stage's top-left corner, which is the SVG's origin, so a matrix built from
 * screen points lands where the points say.
 */
export function Layer({ children, style }: LayerProps) {
  const { width, height } = useStage('Layer');
  return (
    <Animated.View pointerEvents="none" style={[styles.layer, style]}>
      <Svg width={width} height={height}>
        {children}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    transformOrigin: [0, 0, 0],
  },
});

/* ---- Marks ---- */

/** A solid from `iso.ts`, shaded for the current theme, with its outline and seams. */
export function Solid({ shape, outline = true }: { shape: SolidShape; outline?: boolean }) {
  const { palette } = useStage('Solid');
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ink = strokes(palette);
  return (
    <G>
      {shape.parts.map((part, index) => {
        if (part.fill.kind === 'flat') {
          return <Path key={index} d={part.d} fill={shade(palette, shape.tone, part.fill.light)} />;
        }
        const gradient = `${id}g${index}`;
        const { from, to, stops } = part.fill;
        return (
          <G key={index}>
            <Defs>
              <LinearGradient id={gradient} gradientUnits="userSpaceOnUse" x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]}>
                {stops.map((stop, i) => (
                  <Stop key={i} offset={stop.offset} stopColor={shade(palette, shape.tone, stop.light)} />
                ))}
              </LinearGradient>
            </Defs>
            <Path d={part.d} fill={`url(#${gradient})`} />
          </G>
        );
      })}
      {shape.seams ? <Path d={shape.seams} stroke={ink.faint} strokeWidth={0.6} fill="none" /> : null}
      {outline ? (
        <>
          {shape.parts.slice(1).map((part, index) => (
            <Path key={index} d={part.d} stroke={ink.edge} strokeWidth={0.6} fill="none" strokeLinejoin="round" />
          ))}
          <Path d={shape.outline} stroke={ink.edge} strokeWidth={0.8} fill="none" strokeLinejoin="round" />
        </>
      ) : null}
    </G>
  );
}

export type StrokeKind = 'edge' | 'faint' | 'strong' | 'accent';

/** A line or group of lines: a groove, a rule, a wire, a needle, a run of ticks. */
export function Stroke({
  d,
  kind = 'edge',
  width = 0.7,
  cap = 'round',
}: {
  d: string;
  kind?: StrokeKind;
  width?: number;
  cap?: 'round' | 'butt';
}) {
  const { palette } = useStage('Stroke');
  const color = kind === 'accent' ? palette.accent : strokes(palette)[kind];
  return <Path d={d} stroke={color} strokeWidth={width} fill="none" strokeLinecap={cap} strokeLinejoin="round" />;
}

/** A flat fill in a tone: an inlay, a groove's floor, a label plate, a shadow. */
export function Fill({
  d,
  tone = 'lo',
  light = 0.5,
  opacity = 1,
}: {
  d: string;
  tone?: SolidShape['tone'];
  light?: number;
  opacity?: number;
}) {
  const { palette } = useStage('Fill');
  return <Path d={d} fill={shade(palette, tone, light)} opacity={opacity} />;
}

/** The soft shadow a machine stands in. Draw it first. */
export function Halo({ d }: { d: string }) {
  const { palette } = useStage('Halo');
  return <Path d={d} fill={palette.ink} opacity={0.05} />;
}

/** Screws, rivets and terminal dots: a filled dot with a fine ring. */
export function Dots({ points, r = 1.1, kind = 'dot' }: { points: readonly Vec2[]; r?: number; kind?: 'dot' | 'accent' }) {
  const { palette } = useStage('Dots');
  const ink = strokes(palette);
  const fill = kind === 'accent' ? palette.accent : ink.dot;
  return (
    <G>
      {points.map(([x, y], index) => (
        <Circle key={index} cx={x} cy={y} r={r} fill={fill} stroke={ink.edge} strokeWidth={0.4} />
      ))}
    </G>
  );
}

/**
 * Flat content drawn in a plane's own coordinates — a dial face, a scale, a
 * plate's rule lines. `matrix` comes from `planeMatrix` in `iso.ts`.
 */
export function OnPlane({ matrix, children }: { matrix: readonly number[]; children: ReactNode }) {
  return <G transform={`matrix(${matrix.join(' ')})`}>{children}</G>;
}

/* ---- Size ---- */

/**
 * Measures the width it is given and renders the figure at that width and
 * `width / aspect` tall. A figure is laid out from its real width, never from a
 * guess, so the same figure fills a phone and a tablet.
 */
export function FigureCanvas({
  aspect,
  children,
}: {
  aspect: number;
  children: (size: { width: number; height: number }) => ReactNode;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next !== width) setWidth(next);
  };
  const height = Math.round(width / aspect);
  return (
    <View onLayout={onLayout} style={{ width: '100%', height: height || undefined, aspectRatio: width ? undefined : aspect }}>
      {width > 0 ? children({ width, height }) : null}
    </View>
  );
}
