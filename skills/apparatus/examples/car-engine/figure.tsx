/**
 * Fig. — Engine: how a four-stroke engine turns fuel into rotation.
 *
 * An inline four cut open down its cylinders. Each piston draws air in, squeezes
 * it, is driven down by the burn and pushes the exhaust out — four strokes over
 * two turns of the crankshaft — and the four cylinders take turns at the power
 * stroke in the order 1, 3, 4, 2. The burn is the one lit thing in the drawing.
 * Drag sideways to turn the crankshaft by hand; the knob on the throttle sets
 * the speed.
 *
 * Built with the Apparatus kit. Everything that moves comes from one number,
 * the crank's angle through the 720° cycle: the pistons as layers, the rods,
 * throws and valves as paths drawn on the UI thread each frame.
 */
import { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { Circle, G, Path } from 'react-native-svg';
import { aspectOf, camera, fitView, type Projector } from '../../kit/iso';
import { Dots, FigureCanvas, Halo, IsoStage, Layer, OnPlane, Solid, Stroke, usePalette } from '../../kit/draw';
import {
  follow,
  matrixStyle,
  projectWith,
  rotateInPlane,
  slideStyle,
  tick,
  useFigureClock,
  useReadout,
  useStillness,
  type Affine,
} from '../../kit/live';
import { ApparatusFrame } from '../../kit/figure';
import { shade, strokes } from '../../kit/tones';
import { CRANK, THROTTLE, burn, crownHeight, describe, phaseOf, strokeOf, valveLift } from './model';
import { BORE, BORES, CUT, EXTENT, KNOB, TDC, VALVE, Z, buildEngine } from './geometry';

const CAMERA = camera({ azimuth: 28, elevation: 26 });
const ASPECT = aspectOf(CAMERA, EXTENT);
/** Degrees of crank per point dragged, turning by hand. */
const HAND = 2.2;
const SWEEP = (135 * Math.PI) / 180;

const Mode = { free: 0, hand: 1, knob: 2 } as const;

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface CarEngineFigureProps {
  figure?: number;
  active?: boolean;
  className?: string;
}

export function CarEngineFigure({ figure = 4, active = true, className }: CarEngineFigureProps) {
  const still = useStillness();
  const cycle = useSharedValue(30);
  const rpm = useSharedValue<number>(still ? 0 : THROTTLE.initial);
  const speed = useSharedValue<number>(still ? 0 : THROTTLE.initial);
  const mode = useSharedValue<number>(Mode.free);
  const stroke = useSharedValue(0);
  const start = useSharedValue<number[]>([0, 0]);

  useFigureClock((dt) => {
    'worklet';
    // The engine spins up and down to the throttle rather than jumping to it.
    speed.value = follow(speed.value, mode.value === Mode.hand ? 0 : rpm.value, 3, dt);
    cycle.value = (cycle.value + (speed.value / 60) * 360 * dt) % 720;
    stroke.value = strokeOf(phaseOf(cycle.value, 0));
  }, active);

  const shownRpm = useReadout(speed, THROTTLE.step);
  const shownStroke = useReadout(stroke, 1);
  const readout = describe(shownRpm, shownStroke);

  const nudge = useCallback(
    (direction: 1 | -1) => {
      rpm.value = Math.max(THROTTLE.min, Math.min(THROTTLE.max, rpm.value + THROTTLE.step * direction));
      tick();
    },
    [rpm]
  );
  const turn = useCallback(() => {
    cycle.value = (cycle.value + 180) % 720;
  }, [cycle]);

  return (
    <ApparatusFrame
      figure={figure}
      title="Four-stroke engine"
      hint="Drag sideways to turn it. Knob: throttle."
      readout={readout}
      className={className}
      caption="Each cylinder takes two turns of the crankshaft to draw air in, squeeze it, burn it and push it out. The four take turns at the power stroke in the order 1, 3, 4, 2, so one of them is always driving the crank. Pistons 1 and 4 rise together, as do 2 and 3, half a cycle apart in what they are doing."
    >
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Four-stroke engine"
        accessibilityHint="Swipe up or down to change the throttle. Use the action to turn the crankshaft half a turn."
        accessibilityValue={{ text: readout }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate', label: 'Turn half a turn' }]}
        onAccessibilityAction={(event) => {
          const action = event.nativeEvent.actionName;
          if (action === 'increment') nudge(1);
          else if (action === 'decrement') nudge(-1);
          else if (action === 'activate') turn();
        }}
      >
        <FigureCanvas aspect={ASPECT}>
          {({ width, height }) => (
            <Engine width={width} height={height} cycle={cycle} rpm={rpm} mode={mode} start={start} />
          )}
        </FigureCanvas>
      </View>
    </ApparatusFrame>
  );
}

interface EngineProps {
  width: number;
  height: number;
  cycle: SharedValue<number>;
  rpm: SharedValue<number>;
  mode: SharedValue<number>;
  start: SharedValue<number[]>;
}

/** The crank pin and piston pin of cylinder `i`, on screen, at a cycle angle. */
function joints(proj: Projector, cycle: number, i: number) {
  'worklet';
  const phase = phaseOf(cycle, i);
  const a = (phase * Math.PI) / 180;
  const x = BORES[i]!;
  const pinY = CUT + CRANK.throw * Math.sin(a);
  const pinZ = Z.crank + CRANK.throw * Math.cos(a);
  const crown = Z.crank + crownHeight(phase);
  return {
    phase,
    crown,
    axis: projectWith(proj, x, CUT, Z.crank),
    pin: projectWith(proj, x, pinY, pinZ),
    counter: projectWith(proj, x, CUT - CRANK.throw * 0.9 * Math.sin(a), Z.crank - CRANK.throw * 0.9 * Math.cos(a)),
    wrist: projectWith(proj, x, CUT, crown - CRANK.pinToCrown),
  };
}

const seg = (a: [number, number], b: [number, number]) => {
  'worklet';
  return `M${a[0].toFixed(2)} ${a[1].toFixed(2)}L${b[0].toFixed(2)} ${b[1].toFixed(2)}`;
};

function Engine({ width, height, cycle, rpm, mode, start }: EngineProps) {
  const view = useMemo(() => fitView(CAMERA, EXTENT, width, height, 14), [width, height]);
  const art = useMemo(() => buildEngine(view), [view]);
  const proj = art.proj;
  const lineWidth = 1 / view.scale;
  const [ax, ay] = art.along;
  const [ux, uy] = useMemo(() => view.delta([0, 0, 1]), [view]);

  // Crank throws and counterweights, then the rods: one path each for all four.
  const throws = () => {
    'worklet';
    let d = '';
    for (let i = 0; i < 4; i += 1) {
      const j = joints(proj, cycle.value, i);
      d += seg(j.counter, j.pin);
    }
    return d;
  };
  const rods = () => {
    'worklet';
    let d = '';
    for (let i = 0; i < 4; i += 1) {
      const j = joints(proj, cycle.value, i);
      d += seg(j.pin, j.wrist);
    }
    return d;
  };
  const throwEdge = useAnimatedProps(() => ({ d: throws() }));
  const throwFill = useAnimatedProps(() => ({ d: throws() }));
  const rodEdge = useAnimatedProps(() => ({ d: rods() }));
  const rodFill = useAnimatedProps(() => ({ d: rods() }));

  // Valves: a stem and a head each, dropping open through their stroke.
  const valves = (part: 'stem' | 'head') => {
    'worklet';
    let d = '';
    for (let i = 0; i < 4; i += 1) {
      const phase = phaseOf(cycle.value, i);
      for (const [side, which] of [
        [-1, 'intake'],
        [1, 'exhaust'],
      ] as const) {
        const x = BORES[i]! + side * VALVE.offset;
        const seat = Z.deck - 0.6 - valveLift(phase, which) * VALVE.lift;
        if (part === 'stem') {
          d += seg(projectWith(proj, x, CUT, seat), projectWith(proj, x, CUT, seat + VALVE.stem));
        } else {
          d += seg(projectWith(proj, x - 4, CUT, seat), projectWith(proj, x + 4, CUT, seat));
        }
      }
    }
    return d;
  };
  const stems = useAnimatedProps(() => ({ d: valves('stem') }));
  const heads = useAnimatedProps(() => ({ d: valves('head') }));

  const pulleyStyle = useAnimatedStyle(() =>
    matrixStyle(rotateInPlane(art.pulleyPlane as Affine, -(cycle.value * Math.PI) / 180))
  );
  const knobStyle = useAnimatedStyle(() =>
    matrixStyle(rotateInPlane(art.knobPlane as Affine, -SWEEP + (rpm.value / THROTTLE.max) * SWEEP * 2))
  );

  const pan = useMemo(() => {
    const knob = art.knobAt;
    const lengthSq = ax * ax + ay * ay || 1;
    return Gesture.Pan()
      .manualActivation(true)
      .onTouchesDown((event) => {
        'worklet';
        const touch = event.allTouches[0];
        if (!touch) return;
        start.value = [touch.x, touch.y];
        const dx = touch.x - knob[0];
        const dy = touch.y - knob[1];
        mode.value = dx * dx + dy * dy < 30 * 30 ? Mode.knob : Mode.hand;
      })
      .onTouchesMove((event, manager) => {
        'worklet';
        const touch = event.allTouches[0];
        if (!touch) return;
        if (mode.value === Mode.knob) {
          manager.activate();
          return;
        }
        // Turning by hand is a sideways drag; an upright one scrolls the page.
        const dx = Math.abs(touch.x - start.value[0]!);
        const dy = Math.abs(touch.y - start.value[1]!);
        if (dx > 6 && dx > dy) manager.activate();
        else if (dy > 10) manager.fail();
      })
      .onChange((event) => {
        'worklet';
        if (mode.value === Mode.hand) {
          const along = (event.changeX * ax + event.changeY * ay) / lengthSq;
          cycle.value = (((cycle.value + along * HAND) % 720) + 720) % 720;
        } else if (mode.value === Mode.knob) {
          const raw = rpm.value + ((event.changeX - event.changeY) * (THROTTLE.max - THROTTLE.min)) / 140;
          const clamped = Math.max(THROTTLE.min, Math.min(THROTTLE.max, raw));
          const before = Math.round(rpm.value / THROTTLE.step);
          rpm.value = clamped;
          if (Math.round(clamped / THROTTLE.step) !== before) runOnJS(tick)();
        }
      })
      .onFinalize(() => {
        'worklet';
        if (mode.value === Mode.knob) rpm.value = Math.round(rpm.value / THROTTLE.step) * THROTTLE.step;
        mode.value = Mode.free;
      });
  }, [art, ax, ay, mode, cycle, rpm, start]);

  return (
    <GestureDetector gesture={pan}>
      <View>
        <IsoStage width={width} height={height}>
          <Layer>
            <Halo d={art.halo} />
            {art.back.map((shape, i) => (
              <Solid key={i} shape={shape} />
            ))}
            <Stroke d={art.flywheelLines} kind="faint" width={0.7} />
            <OnPlane matrix={art.cutPlane}>
              <CutFace hatch={art.hatch} cavities={art.cavities} boreLines={art.boreLines} lineWidth={lineWidth} />
            </OnPlane>
            <Solid shape={art.journal} />
          </Layer>

          <Layer>
            <Linkage throwEdge={throwEdge} throwFill={throwFill} rodEdge={rodEdge} rodFill={rodFill} scale={view.scale} />
          </Layer>

          {art.pistons.map((shape, i) => (
            <PistonLayer key={i} index={i} shape={shape} rings={art.pistonRings[i]!} cycle={cycle} up={[ux, uy]} />
          ))}

          <Layer>
            {BORES.map((_, i) => (
              <Burn key={i} index={i} cycle={cycle} proj={proj} />
            ))}
            <ValveInk stems={stems} heads={heads} scale={view.scale} />
            {art.plugs.map((shape, i) => (
              <Solid key={i} shape={shape} />
            ))}
            {BORES.map((_, i) => (
              <Spark key={i} index={i} cycle={cycle} proj={proj} scale={view.scale} />
            ))}
          </Layer>

          <Layer>
            {art.front.map((shape, i) => (
              <Solid key={i} shape={shape} />
            ))}
            <Dots points={art.frontScrews} />
          </Layer>

          <Layer style={pulleyStyle}>
            <OnPlane matrix={art.pulleyPlane}>
              <Mark r={11} lineWidth={lineWidth} />
            </OnPlane>
          </Layer>

          <Layer style={knobStyle}>
            <OnPlane matrix={art.knobPlane}>
              <Mark r={KNOB.r} lineWidth={lineWidth} />
            </OnPlane>
          </Layer>
        </IsoStage>
      </View>
    </GestureDetector>
  );
}

/** The cut face in its own plane: hatched metal, hollow bores and crankcase. */
function CutFace({ hatch, cavities, boreLines, lineWidth }: { hatch: string; cavities: string; boreLines: string; lineWidth: number }) {
  const palette = usePalette();
  const ink = strokes(palette);
  return (
    <G>
      <Path d={hatch} stroke={ink.faint} strokeWidth={lineWidth * 0.7} />
      <Path d={cavities} fill={shade(palette, 'lo', 0)} stroke={ink.edge} strokeWidth={lineWidth * 0.8} />
      <Path d={boreLines} stroke={shade(palette, 'lo', 0.6)} strokeWidth={lineWidth * 0.8} />
    </G>
  );
}

function Linkage({
  throwEdge,
  throwFill,
  rodEdge,
  rodFill,
  scale,
}: {
  throwEdge: object;
  throwFill: object;
  rodEdge: object;
  rodFill: object;
  scale: number;
}) {
  const palette = usePalette();
  const ink = strokes(palette);
  return (
    <G>
      <AnimatedPath animatedProps={throwEdge} stroke={ink.edge} strokeWidth={10 * scale + 1.2} strokeLinecap="round" />
      <AnimatedPath animatedProps={throwFill} stroke={shade(palette, 'mid', 0.55)} strokeWidth={10 * scale} strokeLinecap="round" />
      <AnimatedPath animatedProps={rodEdge} stroke={ink.edge} strokeWidth={4.4 * scale + 1.2} strokeLinecap="round" />
      <AnimatedPath animatedProps={rodFill} stroke={shade(palette, 'hi', 0.7)} strokeWidth={4.4 * scale} strokeLinecap="round" />
    </G>
  );
}

/** One piston, moved as a layer to the height the crank puts it at. */
function PistonLayer({
  index,
  shape,
  rings,
  cycle,
  up,
}: {
  index: number;
  shape: Parameters<typeof Solid>[0]['shape'];
  rings: string;
  cycle: SharedValue<number>;
  up: [number, number];
}) {
  const style = useAnimatedStyle(() => {
    const drop = Z.crank + crownHeight(phaseOf(cycle.value, index)) - TDC;
    return slideStyle(up[0] * drop, up[1] * drop);
  });
  return (
    <Layer style={style}>
      <Solid shape={shape} />
      <Stroke d={rings} kind="faint" width={0.6} />
    </Layer>
  );
}

/** The burn above one piston, in the accent: bright at the spark, fading through the power stroke. */
function Burn({ index, cycle, proj }: { index: number; cycle: SharedValue<number>; proj: Projector }) {
  const palette = usePalette();
  const props = useAnimatedProps(() => {
    const phase = phaseOf(cycle.value, index);
    const crown = Z.crank + crownHeight(phase);
    const x = BORES[index]!;
    const a = projectWith(proj, x - BORE + 0.6, CUT, crown);
    const b = projectWith(proj, x + BORE - 0.6, CUT, crown);
    const c = projectWith(proj, x + BORE - 0.6, CUT, Z.deck - 0.4);
    const d = projectWith(proj, x - BORE + 0.6, CUT, Z.deck - 0.4);
    return {
      d: `M${a[0]} ${a[1]}L${b[0]} ${b[1]}L${c[0]} ${c[1]}L${d[0]} ${d[1]}Z`,
      fillOpacity: burn(phase) * 0.9,
    };
  });
  return <AnimatedPath animatedProps={props} fill={palette.accent} />;
}

/** The spark at a plug's tip, for the instant before the power stroke. */
function Spark({ index, cycle, proj, scale }: { index: number; cycle: SharedValue<number>; proj: Projector; scale: number }) {
  const palette = usePalette();
  const at = projectWith(proj, BORES[index]!, CUT, Z.deck + 1);
  const props = useAnimatedProps(() => {
    const phase = phaseOf(cycle.value, index);
    return { opacity: phase > 708 || phase < 10 ? 1 : 0 };
  });
  return <AnimatedCircle animatedProps={props} cx={at[0]} cy={at[1]} r={3 * scale} fill={palette.accent} />;
}

function ValveInk({ stems, heads, scale }: { stems: object; heads: object; scale: number }) {
  const palette = usePalette();
  const ink = strokes(palette);
  return (
    <G>
      <AnimatedPath animatedProps={stems} stroke={ink.strong} strokeWidth={1.4 * scale} strokeLinecap="round" />
      <AnimatedPath animatedProps={heads} stroke={shade(palette, 'hi', 0.9)} strokeWidth={2.4 * scale} strokeLinecap="round" />
    </G>
  );
}

/** An index line and a hub: what shows a round part turning. */
function Mark({ r, lineWidth }: { r: number; lineWidth: number }) {
  const ink = strokes(usePalette());
  return (
    <G>
      <Path d={`M0 ${r * 0.2}L0 ${r * 0.9}`} stroke={ink.strong} strokeWidth={lineWidth * 1.8} strokeLinecap="round" />
      <Circle cx={0} cy={0} r={r * 0.16} fill={ink.dot} />
    </G>
  );
}
