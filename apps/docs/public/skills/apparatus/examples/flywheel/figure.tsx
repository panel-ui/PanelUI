/**
 * Fig. — Flywheel: how a flicked list coasts to a stop.
 *
 * The wheel is the list's momentum and the strip across the top is its
 * content, ruled into rows. Flick the wheel and let go: it keeps the speed your
 * finger had and the brake takes the same share of it every millisecond, so it
 * slows quickly at first and gently at the end. Touch it while it turns and it
 * stops, the way a scroll view does. The knob on the brake post sets the rate.
 *
 * Built with the Apparatus kit: static art per layer, the wheel's face turning
 * as a layer, the strip's rows drawn per frame from the model.
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
import { aspectOf, camera, fitView } from '../../kit/iso';
import { Dots, FigureCanvas, Halo, IsoStage, Layer, OnPlane, Solid, Stroke, usePalette } from '../../kit/draw';
import {
  matrixStyle,
  projectWith,
  rotateInPlane,
  tick,
  useFigureClock,
  useReadout,
  useStillness,
  type Affine,
} from '../../kit/live';
import { ApparatusFrame } from '../../kit/figure';
import { shade, strokes } from '../../kit/tones';
import { RATE, STOP_SPEED, SWEEP, coast, describe, knobAngle } from './model';
import { EXTENT, KNOB, ROW, STRIP, WHEEL, buildFlywheel } from './geometry';

const CAMERA = camera({ azimuth: 40, elevation: 28 });
const ASPECT = aspectOf(CAMERA, EXTENT);
/** Seconds stopped before the figure flicks itself. */
const IDLE = 4.5;
/** The speed of the figure's own flick, in points per second. */
const TOUR_SPEED = 1800;

const Mode = { free: 0, wheel: 1, knob: 2 } as const;

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface FlywheelFigureProps {
  figure?: number;
  active?: boolean;
  className?: string;
}

export function FlywheelFigure({ figure = 2, active = true, className }: FlywheelFigureProps) {
  const still = useStillness();
  const offset = useSharedValue(0);
  const speed = useSharedValue(0);
  const rate = useSharedValue<number>(RATE.initial);
  const mode = useSharedValue<number>(Mode.free);
  const idle = useSharedValue(0);
  const start = useSharedValue<number[]>([0, 0]);

  useFigureClock((dt) => {
    'worklet';
    if (mode.value !== Mode.wheel) {
      speed.value = coast(speed.value, rate.value, dt);
      if (Math.abs(speed.value) < STOP_SPEED) speed.value = 0;
      offset.value += speed.value * dt;
    }
    idle.value = speed.value === 0 && mode.value === Mode.free ? idle.value + dt : 0;
    if (!still && idle.value > IDLE) {
      idle.value = 0;
      speed.value = TOUR_SPEED;
    }
  }, active);

  const shownSpeed = useReadout(speed, 10);
  const shownRate = useReadout(rate, RATE.step);
  const readout = useMemo(() => describe(shownSpeed, shownRate), [shownSpeed, shownRate]);

  const nudge = useCallback(
    (direction: 1 | -1) => {
      rate.value = Math.max(RATE.min, Math.min(RATE.max, rate.value + RATE.step * direction));
      tick();
    },
    [rate]
  );
  const flick = useCallback(() => {
    speed.value = TOUR_SPEED;
    idle.value = 0;
  }, [speed, idle]);

  return (
    <ApparatusFrame
      figure={figure}
      title="Flywheel"
      hint="Flick the wheel. Touch it to stop."
      readout={readout}
      className={className}
      caption="The wheel is a list's momentum and the strip is its content. Let go mid-flick and the wheel keeps your speed, then the brake takes the same share of it every millisecond. The knob on the brake post sets that share: the deceleration rate."
    >
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Flywheel"
        accessibilityHint="Swipe up or down to change the deceleration rate. Use the action to flick the wheel."
        accessibilityValue={{ text: readout }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate', label: 'Flick the wheel' }]}
        onAccessibilityAction={(event) => {
          const action = event.nativeEvent.actionName;
          if (action === 'increment') nudge(1);
          else if (action === 'decrement') nudge(-1);
          else if (action === 'activate') flick();
        }}
      >
        <FigureCanvas aspect={ASPECT}>
          {({ width, height }) => (
            <Wheel width={width} height={height} offset={offset} speed={speed} rate={rate} mode={mode} idle={idle} start={start} />
          )}
        </FigureCanvas>
      </View>
    </ApparatusFrame>
  );
}

interface WheelProps {
  width: number;
  height: number;
  offset: SharedValue<number>;
  speed: SharedValue<number>;
  rate: SharedValue<number>;
  mode: SharedValue<number>;
  idle: SharedValue<number>;
  start: SharedValue<number[]>;
}

function Wheel({ width, height, offset, speed, rate, mode, idle, start }: WheelProps) {
  const view = useMemo(() => fitView(CAMERA, EXTENT, width, height, 14), [width, height]);
  const art = useMemo(() => buildFlywheel(view), [view]);
  const lineWidth = 1 / view.scale;
  const wheelPlane = art.wheelPlane as Affine;
  const knobPlane = art.knobPlane as Affine;
  const proj = art.proj;
  const [sx, sy] = art.stripStep;

  const wheelStyle = useAnimatedStyle(() => matrixStyle(rotateInPlane(wheelPlane, -offset.value / WHEEL.r)));
  const knobStyle = useAnimatedStyle(() => matrixStyle(rotateInPlane(knobPlane, -knobAngle(rate.value))));

  // The strip's rows, drawn from the offset each frame. Every fifth is heavier,
  // so the eye can follow one past the housings.
  const rows = (major: boolean) => {
    'worklet';
    const top = STRIP.z + STRIP.h;
    const start = (((-offset.value % ROW) + ROW) % ROW) + STRIP.from + 3;
    let d = '';
    for (let x = start; x < STRIP.to - 3; x += ROW) {
      const index = Math.round((x - STRIP.from + offset.value) / ROW);
      if ((index % 5 === 0) !== major) continue;
      const a = projectWith(proj, x, STRIP.y + 3, top);
      const b = projectWith(proj, x, STRIP.y + STRIP.d - 3, top);
      d += `M${a[0].toFixed(2)} ${a[1].toFixed(2)}L${b[0].toFixed(2)} ${b[1].toFixed(2)}`;
    }
    return d || 'M0 0';
  };
  const minorRows = useAnimatedProps(() => ({ d: rows(false) }));
  const majorRows = useAnimatedProps(() => ({ d: rows(true) }));

  const pan = useMemo(() => {
    const knob = art.knobAt;
    const lengthSq = sx * sx + sy * sy || 1;
    return Gesture.Pan()
      .manualActivation(true)
      .onTouchesDown((event) => {
        'worklet';
        const touch = event.allTouches[0];
        if (!touch) return;
        start.value = [touch.x, touch.y];
        const dx = touch.x - knob[0];
        const dy = touch.y - knob[1];
        if (dx * dx + dy * dy < 30 * 30) {
          mode.value = Mode.knob;
        } else {
          // A touch stops the wheel, as a finger stops a scrolling list.
          mode.value = Mode.wheel;
          speed.value = 0;
        }
        idle.value = 0;
      })
      .onTouchesMove((event, manager) => {
        'worklet';
        if (mode.value === Mode.knob) {
          manager.activate();
          return;
        }
        // Claim only a drag along the strip; a vertical one is the page scrolling.
        const touch = event.allTouches[0];
        if (!touch) return;
        const dx = Math.abs(touch.x - start.value[0]!);
        const dy = Math.abs(touch.y - start.value[1]!);
        if (dx > 6 && dx > dy) manager.activate();
        else if (dy > 10) manager.fail();
      })
      .onChange((event) => {
        'worklet';
        if (mode.value === Mode.wheel) {
          offset.value += (event.changeX * sx + event.changeY * sy) / lengthSq;
        } else if (mode.value === Mode.knob) {
          const raw = rate.value + ((event.changeX - event.changeY) * (RATE.max - RATE.min)) / 140;
          const clamped = Math.max(RATE.min, Math.min(RATE.max, raw));
          const before = Math.round(rate.value / RATE.step);
          rate.value = clamped;
          if (Math.round(clamped / RATE.step) !== before) runOnJS(tick)();
        }
      })
      .onEnd((event) => {
        'worklet';
        if (mode.value === Mode.wheel) {
          // The finger's speed along the strip becomes the wheel's.
          speed.value = (event.velocityX * sx + event.velocityY * sy) / lengthSq;
        }
      })
      .onFinalize(() => {
        'worklet';
        if (mode.value === Mode.knob) rate.value = Math.round(rate.value / RATE.step) * RATE.step;
        mode.value = Mode.free;
        idle.value = 0;
      });
  }, [art, sx, sy, mode, speed, offset, rate, idle, start]);

  return (
    <GestureDetector gesture={pan}>
      <View>
        <IsoStage width={width} height={height}>
          <Layer>
            <Halo d={art.halo} />
            {art.back.map((shape, i) => (
              <Solid key={i} shape={shape} />
            ))}
            <Stroke d={art.backLines.faint} kind="faint" width={0.6} />
            <Dots points={art.screws} />
            {art.wheel.map((shape, i) => (
              <Solid key={i} shape={shape} />
            ))}
          </Layer>

          <Layer style={wheelStyle}>
            <OnPlane matrix={art.wheelPlane}>
              <WheelFace lineWidth={lineWidth} />
            </OnPlane>
          </Layer>

          <Layer>
            <Stroke d={art.middleLines} kind="faint" width={0.7} />
            {art.middle.map((shape, i) => (
              <Solid key={i} shape={shape} />
            ))}
            <Stroke d={art.backLines.edge} kind="edge" width={0.6} />
            <OnPlane matrix={art.knobFacePlane}>
              <KnobScale lineWidth={lineWidth} />
            </OnPlane>
            <Solid shape={art.strip} />
          </Layer>

          <Layer>
            <RowInk minor={minorRows} major={majorRows} />
          </Layer>

          <Layer>
            {art.front.map((shape, i) => (
              <Solid key={i} shape={shape} />
            ))}
            <Dots points={art.frontScrews} />
          </Layer>

          <Layer style={knobStyle}>
            <OnPlane matrix={art.knobPlane}>
              <KnobFace r={KNOB.r} lineWidth={lineWidth} />
            </OnPlane>
          </Layer>
        </IsoStage>
      </View>
    </GestureDetector>
  );
}

function RowInk({ minor, major }: { minor: object; major: object }) {
  const ink = strokes(usePalette());
  return (
    <G>
      <AnimatedPath animatedProps={minor} stroke={ink.faint} strokeWidth={0.8} strokeLinecap="round" />
      <AnimatedPath animatedProps={major} stroke={ink.strong} strokeWidth={1.2} strokeLinecap="round" />
    </G>
  );
}

/**
 * The wheel's face in its own plane: a rim, six spokes and the pockets between
 * them, cut darker. Only this turns; the disc's outline is the same at any angle.
 */
function WheelFace({ lineWidth }: { lineWidth: number }) {
  const palette = usePalette();
  const ink = strokes(palette);
  const pockets = useMemo(() => {
    const inner = 15;
    const outer = WHEEL.r - 8;
    const spokes = 6;
    const half = 0.17;
    let d = '';
    for (let i = 0; i < spokes; i += 1) {
      const a0 = (i / spokes) * Math.PI * 2 + half;
      const a1 = ((i + 1) / spokes) * Math.PI * 2 - half;
      const steps = 10;
      const outerArc: string[] = [];
      const innerArc: string[] = [];
      for (let k = 0; k <= steps; k += 1) {
        const a = a0 + ((a1 - a0) * k) / steps;
        outerArc.push(`${(Math.cos(a) * outer).toFixed(2)} ${(Math.sin(a) * outer).toFixed(2)}`);
        innerArc.unshift(`${(Math.cos(a) * (inner + 3)).toFixed(2)} ${(Math.sin(a) * (inner + 3)).toFixed(2)}`);
      }
      d += `M${outerArc.join('L')}L${innerArc.join('L')}Z`;
    }
    return d;
  }, []);
  const rim = useMemo(() => {
    const r = WHEEL.r - 4;
    let d = '';
    for (let i = 0; i <= 64; i += 1) {
      const a = (i / 64) * Math.PI * 2;
      d += `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
    }
    return d;
  }, []);
  // A balance mark on the rim: the one spot that shows how far it has turned.
  return (
    <G>
      <Path d={pockets} fill={shade(palette, 'lit', 0.15)} stroke={ink.edge} strokeWidth={lineWidth * 0.7} />
      <Path d={rim} fill="none" stroke={ink.faint} strokeWidth={lineWidth * 0.7} />
      <Circle cx={0} cy={WHEEL.r - 4} r={2.2} fill={ink.strong} />
    </G>
  );
}

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
      <Path d={`M0 ${-r * 0.15}L0 ${r * 0.8}`} stroke={ink.strong} strokeWidth={lineWidth * 1.8} strokeLinecap="round" />
      <Circle cx={0} cy={0} r={r * 0.14} fill={ink.dot} />
    </G>
  );
}

function KnobScale({ lineWidth }: { lineWidth: number }) {
  const ink = strokes(usePalette());
  const d = useMemo(() => {
    let path = '';
    const inner = KNOB.r + 1.6;
    for (let i = 0; i <= 9; i += 1) {
      const a = -SWEEP + (i / 9) * SWEEP * 2 + Math.PI / 2;
      const outer = inner + (i % 3 === 0 ? 3 : 1.8);
      path += `M${(Math.cos(a) * inner).toFixed(2)} ${(Math.sin(a) * inner).toFixed(2)}L${(Math.cos(a) * outer).toFixed(2)} ${(Math.sin(a) * outer).toFixed(2)}`;
    }
    return path;
  }, []);
  return <Path d={d} stroke={ink.edge} strokeWidth={lineWidth} />;
}
