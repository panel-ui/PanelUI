/**
 * Fig. — Spring bench: how a spring animation moves a value.
 *
 * The carriage is the animated value and its rest position is the target. The
 * coil pulls it back with a force proportional to how far it is out
 * (stiffness); the oil dashpot resists how fast it moves (damping). Let go of
 * the carriage and the two decide whether it overshoots, rings or creeps home,
 * and the pen writes that history onto the paper as it feeds down — the same
 * curve a spring animation draws through time.
 *
 * Built with the Apparatus kit: static art per layer, one frame loop on the UI
 * thread stepping the model, each moving layer transformed from the model.
 */
import { useCallback, useMemo, useState } from 'react';
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
import { camera, fitView, aspectOf } from '../../kit/iso';
import { Dots, FigureCanvas, Fill, Halo, IsoStage, Layer, OnPlane, Solid, Stroke, usePalette } from '../../kit/draw';
import {
  follow,
  knock,
  matrixStyle,
  rotateInPlane,
  slideStyle,
  springStep,
  stretchInPlane,
  tick,
  useFigureClock,
  useReadout,
  useStillness,
  type Affine,
} from '../../kit/live';
import { ApparatusFrame } from '../../kit/figure';
import { strokes } from '../../kit/tones';
import { BENCH, DAMPING, STIFFNESS, SWEEP, describe, knobAngle } from './model';
import { EXTENT, PAPER, PEN, SPRING, TENSION_KNOB, VALVE_KNOB, buildBench } from './geometry';

const CAMERA = camera({ azimuth: 50, elevation: 30 });
const ASPECT = aspectOf(CAMERA, EXTENT);

/** Trace samples kept, and how often one is taken. 48 × 1/30 s ≈ 1.6 s of paper. */
const SAMPLES = 48;
const SAMPLE_DT = 1 / 30;
/** How fast the paper feeds, in world units a second: the 1.6 s fill the sheet. */
const FEED = (PEN.z - PAPER.bottom - 2) / (SAMPLES * SAMPLE_DT);
/** Seconds without a touch before the figure demonstrates itself. */
const IDLE = 4.5;

const Mode = { free: 0, carriage: 1, tension: 2, valve: 3, tour: 4 } as const;

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface SpringBenchFigureProps {
  /** The figure's number in its set. */
  figure?: number;
  /** Run the model. Tie it to the screen's focus so a hidden figure costs nothing. */
  active?: boolean;
  className?: string;
}

export function SpringBenchFigure({ figure = 1, active = true, className }: SpringBenchFigureProps) {
  const still = useStillness();

  // The model, on the UI thread.
  const pos = useSharedValue(0);
  const vel = useSharedValue(0);
  const stiffness = useSharedValue<number>(STIFFNESS.initial);
  const damping = useSharedValue<number>(DAMPING.initial);
  const mode = useSharedValue<number>(Mode.free);
  const target = useSharedValue(0);
  const idle = useSharedValue(0);
  const sinceSample = useSharedValue(0);
  const trace = useSharedValue<number[]>(new Array(SAMPLES).fill(0));

  useFigureClock((dt) => {
    'worklet';
    const lo = BENCH.min - BENCH.rest;
    const hi = BENCH.max - BENCH.rest;

    if (mode.value === Mode.carriage) {
      const next = follow(pos.value, target.value, 28, dt);
      vel.value = (next - pos.value) / dt;
      pos.value = next;
    } else if (mode.value === Mode.tour) {
      pos.value = follow(pos.value, BENCH.tourPull, 5, dt);
      vel.value = 0;
      if (Math.abs(pos.value - BENCH.tourPull) < 0.6) mode.value = Mode.free;
    } else {
      const next = springStep(
        { x: pos.value, v: vel.value },
        0,
        { stiffness: stiffness.value, damping: damping.value, mass: BENCH.mass },
        dt
      );
      pos.value = next.x;
      vel.value = next.v;
    }

    // The stops: the carriage cannot pass them, and loses most of its speed on one.
    if (pos.value < lo || pos.value > hi) {
      pos.value = Math.max(lo, Math.min(hi, pos.value));
      if (Math.abs(vel.value) > 40) runOnJS(knock)();
      vel.value = -vel.value * 0.25;
    }

    // The paper feeds one sample at a time.
    sinceSample.value += dt;
    if (sinceSample.value >= SAMPLE_DT) {
      sinceSample.value -= SAMPLE_DT;
      const position = pos.value;
      trace.modify((samples) => {
        'worklet';
        samples.pop();
        samples.unshift(position);
        return samples;
      });
    }

    // Left alone and at rest, it pulls and lets go by itself.
    idle.value += dt;
    const resting = Math.abs(pos.value) < 0.4 && Math.abs(vel.value) < 0.4;
    if (!still && mode.value === Mode.free && resting && idle.value > IDLE) {
      idle.value = 0;
      mode.value = Mode.tour;
    }
  }, active);

  const k = useReadout(stiffness, STIFFNESS.step);
  const c = useReadout(damping, DAMPING.step);
  const readout = useMemo(() => describe(k, c), [k, c]);

  const nudge = useCallback(
    (which: 'stiffness' | 'damping', direction: 1 | -1) => {
      const value = which === 'stiffness' ? stiffness : damping;
      const range = which === 'stiffness' ? STIFFNESS : DAMPING;
      value.value = Math.max(range.min, Math.min(range.max, value.value + range.step * direction));
      tick();
    },
    [stiffness, damping]
  );

  const release = useCallback(() => {
    idle.value = 0;
    vel.value = 0;
    pos.value = BENCH.tourPull;
    mode.value = Mode.free;
  }, [idle, vel, pos, mode]);

  return (
    <ApparatusFrame
      figure={figure}
      title="Spring bench"
      hint="Drag the carriage, let go. Turn the knobs."
      readout={readout}
      className={className}
      caption="The carriage is the animated value and rest is its target. The coil is stiffness, set by the knob on the anchor; the oil dashpot is damping, set by the valve on top. The pen writes the value onto paper feeding down, so the sheet shows the curve the animation follows."
    >
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Spring bench"
        accessibilityHint="Swipe up or down to change the stiffness. Use the actions to change the damping or release the carriage."
        accessibilityValue={{ text: `Stiffness ${k}, damping ${c}. ${readout}.` }}
        accessibilityActions={[
          { name: 'increment' },
          { name: 'decrement' },
          { name: 'damping-up', label: 'More damping' },
          { name: 'damping-down', label: 'Less damping' },
          { name: 'activate', label: 'Pull and release the carriage' },
        ]}
        onAccessibilityAction={(event) => {
          const action = event.nativeEvent.actionName;
          if (action === 'increment') nudge('stiffness', 1);
          else if (action === 'decrement') nudge('stiffness', -1);
          else if (action === 'damping-up') nudge('damping', 1);
          else if (action === 'damping-down') nudge('damping', -1);
          else if (action === 'activate') release();
        }}
      >
        <FigureCanvas aspect={ASPECT}>
          {({ width, height }) => (
            <Bench
              width={width}
              height={height}
              pos={pos}
              stiffness={stiffness}
              damping={damping}
              mode={mode}
              target={target}
              idle={idle}
              trace={trace}
            />
          )}
        </FigureCanvas>
      </View>
    </ApparatusFrame>
  );
}

interface BenchProps {
  width: number;
  height: number;
  pos: SharedValue<number>;
  stiffness: SharedValue<number>;
  damping: SharedValue<number>;
  mode: SharedValue<number>;
  target: SharedValue<number>;
  idle: SharedValue<number>;
  trace: SharedValue<number[]>;
}

function Bench({ width, height, pos, stiffness, damping, mode, target, idle, trace }: BenchProps) {
  const view = useMemo(() => fitView(CAMERA, EXTENT, width, height, 14), [width, height]);
  const art = useMemo(() => buildBench(view), [view]);
  const lineWidth = 1 / view.scale;

  const springPlane = art.springPlane as Affine;
  const tensionPlane = art.tensionPlane as Affine;
  const valvePlane = art.valvePlane as Affine;
  const restLength = BENCH.rest - SPRING.from;
  const [stepX, stepY] = art.railStep;

  const springStyle = useAnimatedStyle(() =>
    matrixStyle(stretchInPlane(springPlane, (restLength + pos.value) / restLength, SPRING.from))
  );
  const carriageStyle = useAnimatedStyle(() => slideStyle(stepX * pos.value, stepY * pos.value));
  const tensionStyle = useAnimatedStyle(() =>
    matrixStyle(rotateInPlane(tensionPlane, -knobAngle(stiffness.value, STIFFNESS)))
  );
  const valveStyle = useAnimatedStyle(() =>
    matrixStyle(rotateInPlane(valvePlane, knobAngle(damping.value, DAMPING)))
  );

  // The trace, in the paper's own plane: across is the pen's x, up is time.
  const penX = BENCH.rest + 20;
  const traceProps = useAnimatedProps(() => {
    const samples = trace.value;
    let d = `M${(penX + pos.value).toFixed(2)} ${PEN.z}`;
    for (let i = 0; i < samples.length; i += 1) {
      d += `L${(penX + samples[i]!).toFixed(2)} ${(PEN.z - (i + 1) * SAMPLE_DT * FEED).toFixed(2)}`;
    }
    return { d };
  });

  const pan = useMemo(() => {
    const hits = art.hits;
    const reach = 30;
    const lengthSq = stepX * stepX + stepY * stepY || 1;
    return Gesture.Pan()
      .manualActivation(true)
      .onTouchesDown((event, manager) => {
        'worklet';
        const touch = event.allTouches[0];
        if (!touch) return;
        const near = (p: readonly [number, number], r: number) =>
          (touch.x - p[0]) * (touch.x - p[0]) + (touch.y - p[1]) * (touch.y - p[1]) < r * r;
        const carriage: [number, number] = [hits.carriage[0] + stepX * pos.value, hits.carriage[1] + stepY * pos.value];
        if (near(hits.tension, reach)) mode.value = Mode.tension;
        else if (near(hits.valve, reach)) mode.value = Mode.valve;
        else if (near(carriage, reach * 1.6)) {
          mode.value = Mode.carriage;
          target.value = pos.value;
        } else {
          manager.fail();
          return;
        }
        idle.value = 0;
      })
      .onTouchesMove((_event, manager) => {
        'worklet';
        // Activating on touch-down is too early: the handler has not begun yet.
        // The part was chosen on touch-down; the first movement claims the touch.
        if (mode.value !== Mode.free && mode.value !== Mode.tour) manager.activate();
      })
      .onChange((event) => {
        'worklet';
        idle.value = 0;
        if (mode.value === Mode.carriage) {
          // Only the part of the drag that runs along the rail moves the carriage.
          const along = (event.changeX * stepX + event.changeY * stepY) / lengthSq;
          const lo = BENCH.min - BENCH.rest;
          const hi = BENCH.max - BENCH.rest;
          target.value = Math.max(lo, Math.min(hi, target.value + along));
        } else if (mode.value === Mode.tension || mode.value === Mode.valve) {
          const range = mode.value === Mode.tension ? STIFFNESS : DAMPING;
          const value = mode.value === Mode.tension ? stiffness : damping;
          // A drag right or up turns the knob up; 140 points cover the whole sweep.
          const raw = value.value + ((event.changeX - event.changeY) * (range.max - range.min)) / 140;
          const clamped = Math.max(range.min, Math.min(range.max, raw));
          const before = Math.round(value.value / range.step);
          value.value = clamped;
          if (Math.round(clamped / range.step) !== before) runOnJS(tick)();
        }
      })
      .onFinalize(() => {
        'worklet';
        if (mode.value === Mode.tension) stiffness.value = Math.round(stiffness.value / STIFFNESS.step) * STIFFNESS.step;
        if (mode.value === Mode.valve) damping.value = Math.round(damping.value / DAMPING.step) * DAMPING.step;
        if (mode.value !== Mode.tour) mode.value = Mode.free;
        idle.value = 0;
      });
  }, [art, stepX, stepY, pos, mode, target, idle, stiffness, damping]);

  return (
    <GestureDetector gesture={pan}>
      <View>
        <IsoStage width={width} height={height}>
          <Layer>
            <Halo d={art.halo} />
            {art.under.map((shape, i) => (
              <Solid key={i} shape={shape} />
            ))}
            <Fill d={art.paper} tone="hi" light={0.95} />
            <Stroke d={art.paperRules} kind="faint" width={0.5} />
            <Stroke d={art.restLine} kind="faint" width={0.9} />
            {art.back.map((shape, i) => (
              <Solid key={i} shape={shape} />
            ))}
            <Stroke d={art.backLines.faint} kind="faint" width={0.6} />
            <Stroke d={art.backLines.edge} kind="edge" width={0.8} />
            <Stroke d={art.backLines.strong} kind="strong" width={1.1} />
            <Dots points={art.screws} r={1.1} />
            <TensionScale plane={art.anchorFacePlane} lineWidth={lineWidth} />
          </Layer>

          <Layer>
            <OnPlane matrix={art.paperPlane}>
              <TraceInk animatedProps={traceProps} lineWidth={lineWidth} />
            </OnPlane>
          </Layer>

          <Layer style={springStyle}>
            <Stroke d={art.spring.back} kind="edge" width={1.6} />
            <Stroke d={art.spring.front} kind="strong" width={1.6} />
            {art.springEyes.map((shape, i) => (
              <Solid key={i} shape={shape} />
            ))}
          </Layer>

          <Layer style={carriageStyle}>
            {art.carriage.map((shape, i) => (
              <Solid key={i} shape={shape} />
            ))}
            <Dots points={art.carriageScrews} r={1} />
            <Stroke d={art.pointerTip} kind="strong" width={1.2} />
          </Layer>

          <Layer>
            {art.front.map((shape, i) => (
              <Solid key={i} shape={shape} />
            ))}
            <Stroke d={art.frontLines} kind="faint" width={0.7} />
          </Layer>

          <Layer style={tensionStyle}>
            <OnPlane matrix={art.tensionPlane}>
              <KnobFace r={TENSION_KNOB.r} lineWidth={lineWidth} />
            </OnPlane>
          </Layer>

          <Layer style={valveStyle}>
            <OnPlane matrix={art.valvePlane}>
              <KnobFace r={VALVE_KNOB.r} lineWidth={lineWidth} />
            </OnPlane>
          </Layer>

        </IsoStage>
      </View>
    </GestureDetector>
  );
}

/** The pen's line, in the strong ink. */
function TraceInk({ animatedProps, lineWidth }: { animatedProps: object; lineWidth: number }) {
  const palette = usePalette();
  return (
    <AnimatedPath
      animatedProps={animatedProps}
      stroke={strokes(palette).strong}
      strokeWidth={lineWidth * 1.4}
      fill="none"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  );
}

/** A knob's face in its own plane: a grip ring of knurls and the index line. */
function KnobFace({ r, lineWidth }: { r: number; lineWidth: number }) {
  const palette = usePalette();
  const ink = strokes(palette);
  const knurls = useMemo(() => {
    let d = '';
    for (let i = 0; i < 20; i += 1) {
      const a = (i / 20) * Math.PI * 2;
      d += `M${(Math.cos(a) * (r - 1.4)).toFixed(2)} ${(Math.sin(a) * (r - 1.4)).toFixed(2)}L${(Math.cos(a) * (r - 0.2)).toFixed(2)} ${(Math.sin(a) * (r - 0.2)).toFixed(2)}`;
    }
    return d;
  }, [r]);
  return (
    <G>
      <Path d={knurls} stroke={ink.faint} strokeWidth={lineWidth * 0.8} />
      <Path d={`M0 ${-r * 0.15}L0 ${r * 0.8}`} stroke={palette.accent} strokeWidth={lineWidth * 1.8} strokeLinecap="round" />
      <Circle cx={0} cy={0} r={r * 0.14} fill={ink.dot} />
    </G>
  );
}

/** The engraved scale around the tension knob, on the anchor's face. */
function TensionScale({ plane, lineWidth }: { plane: readonly number[]; lineWidth: number }) {
  const palette = usePalette();
  const ink = strokes(palette);
  const d = useMemo(() => {
    let path = '';
    const inner = TENSION_KNOB.r + 1.6;
    for (let i = 0; i <= 8; i += 1) {
      const a = -SWEEP + (i / 8) * SWEEP * 2 + Math.PI / 2;
      const outer = inner + (i % 4 === 0 ? 3 : 1.8);
      path += `M${(Math.cos(a) * inner).toFixed(2)} ${(Math.sin(a) * inner).toFixed(2)}L${(Math.cos(a) * outer).toFixed(2)} ${(Math.sin(a) * outer).toFixed(2)}`;
    }
    return path;
  }, []);
  return (
    <OnPlane matrix={plane}>
      <Path d={d} stroke={ink.edge} strokeWidth={lineWidth} />
    </OnPlane>
  );
}
