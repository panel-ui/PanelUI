/**
 * Fig. — Human cell: how a cell gets its energy from glucose.
 *
 * A cell on a slide, cut in half. Tap to feed it: a glucose molecule comes in
 * through the transporter in the membrane, splits in two as it crosses the
 * cytoplasm — glycolysis, which nets 2 ATP on the spot — and the halves go into
 * a mitochondrion, which burns them with oxygen and releases about 28 more.
 * ATP is the one lit thing in the drawing, so the reader sees where the energy
 * is actually made.
 *
 * Built with the Apparatus kit. The section and everything moving in it are
 * drawn in the cut plane's own coordinates through one plane matrix.
 */
import { useMemo } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedProps, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { Circle, G, Path } from 'react-native-svg';
import { aspectOf, camera, fitView, type Vec2 } from '../../kit/iso';
import { FigureCanvas, Halo, IsoStage, Layer, OnPlane, Solid, Stroke, usePalette } from '../../kit/draw';
import { follow, tick, useFigureClock, useReadout, useStillness } from '../../kit/live';
import { ApparatusFrame } from '../../kit/figure';
import { shade, strokes } from '../../kit/tones';
import { PER_GLUCOSE, TRIP, TRIP_TIME, YIELD, describe } from './model';
import { EXTENT, MITOS, buildCell, capsulePath, queueAt, tripPoints } from './geometry';

const CAMERA = camera({ azimuth: 45, elevation: 32 });
const ASPECT = aspectOf(CAMERA, EXTENT);
const IDLE = 4;
/** Seconds between the figure's own feeds while nobody is touching it. */
const TOUR_GAP = 3.6;

/** Glucose on its way, and bursts of ATP, as small pools in flat arrays. */
const TRIPS = 4;
const T = { active: 0, t: 1, mito: 2, split: 3 } as const;
const TRIP_FIELDS = 4;
const BURSTS = 8;
const B = { active: 0, t: 1, s: 2, z: 3, count: 4, seed: 5 } as const;
const BURST_FIELDS = 6;
const BURST_LIFE = 1.9;

/** Every mitochondrion's trip, flattened for the worklets: 4 points of (s, z) each. */
const PATHS = MITOS.flatMap((_, m) => tripPoints(m).flat());

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface HumanCellFigureProps {
  figure?: number;
  active?: boolean;
  className?: string;
}

export function HumanCellFigure({ figure = 5, active = true, className }: HumanCellFigureProps) {
  const still = useStillness();
  const trips = useSharedValue<number[]>(new Array(TRIPS * TRIP_FIELDS).fill(0));
  const bursts = useSharedValue<number[]>(new Array(BURSTS * BURST_FIELDS).fill(0));
  const glow = useSharedValue<number[]>([0, 0, 0]);
  const shift = useSharedValue(0);
  const atp = useSharedValue(0);
  const glucose = useSharedValue(0);
  const next = useSharedValue(0);
  const idle = useSharedValue(0);

  const feed = () => {
    'worklet';
    idle.value = 0;
    // Find the free slot first, then write it. A variable set inside the
    // `modify` updater would not reach this worklet: the updater gets a copy.
    const current = trips.value;
    let slot = -1;
    for (let i = 0; i < TRIPS; i += 1) {
      if (!current[i * TRIP_FIELDS + T.active]) {
        slot = i;
        break;
      }
    }
    if (slot < 0) return;
    const mito = next.value;
    trips.modify((t) => {
      'worklet';
      const o = slot * TRIP_FIELDS;
      t[o + T.active] = 1;
      t[o + T.t] = 0;
      t[o + T.mito] = mito;
      t[o + T.split] = 0;
      return t;
    });
    next.value = (next.value + 1) % MITOS.length;
    shift.value = 1;
  };

  const emit = (s: number, z: number, count: number) => {
    'worklet';
    bursts.modify((b) => {
      'worklet';
      for (let i = 0; i < BURSTS; i += 1) {
        const o = i * BURST_FIELDS;
        if (b[o + B.active]) continue;
        b[o + B.active] = 1;
        b[o + B.t] = 0;
        b[o + B.s] = s;
        b[o + B.z] = z;
        b[o + B.count] = count;
        b[o + B.seed] = (atp.value * 0.618) % (Math.PI * 2);
        break;
      }
      return b;
    });
    atp.value += count;
  };

  useFigureClock((dt) => {
    'worklet';
    const t = trips.value;
    const burning = [0, 0, 0];
    for (let i = 0; i < TRIPS; i += 1) {
      const o = i * TRIP_FIELDS;
      if (!t[o + T.active]) continue;
      const before = t[o + T.t]!;
      const now = before + dt;
      const m = t[o + T.mito]!;
      const p = m * 8;
      // Halfway across the cytoplasm the glucose splits: glycolysis, 2 ATP.
      const splitAt = TRIP.enter + TRIP.cross * 0.5;
      if (before < splitAt && now >= splitAt) {
        const s = PATHS[p + 4]! + (PATHS[p + 6]! - PATHS[p + 4]!) * 0.5;
        const z = PATHS[p + 5]! + (PATHS[p + 7]! - PATHS[p + 5]!) * 0.5;
        emit(s, z, YIELD.glycolysis);
      }
      if (now >= TRIP.enter + TRIP.cross) burning[m] = 1;
      if (now >= TRIP_TIME) {
        // Counted once its ATP is made, so the readout never claims a glucose
        // whose energy is still on its way.
        emit(PATHS[p + 6]!, PATHS[p + 7]!, YIELD.mitochondrion);
        glucose.value += 1;
        trips.modify((x) => {
          'worklet';
          x[o + T.active] = 0;
          return x;
        });
      } else {
        trips.modify((x) => {
          'worklet';
          x[o + T.t] = now;
          return x;
        });
      }
    }
    glow.modify((g) => {
      'worklet';
      for (let m = 0; m < g.length; m += 1) g[m] = burning[m] ? follow(g[m]!, 1, 10, dt) : follow(g[m]!, 0, 2.2, dt);
      return g;
    });
    bursts.modify((b) => {
      'worklet';
      for (let i = 0; i < BURSTS; i += 1) {
        const o = i * BURST_FIELDS;
        if (!b[o + B.active]) continue;
        b[o + B.t] = b[o + B.t]! + dt;
        if (b[o + B.t]! > BURST_LIFE) b[o + B.active] = 0;
      }
      return b;
    });
    shift.value = follow(shift.value, 0, 5, dt);

    idle.value += dt;
    // Left alone, it feeds itself: first after IDLE seconds, then every TOUR_GAP.
    if (!still && idle.value > (atp.value > 0 ? TOUR_GAP : IDLE)) feed();
  }, active);

  const shownAtp = useReadout(atp, 1);
  const shownGlucose = useReadout(glucose, 1);
  const readout = describe(shownAtp, shownGlucose);

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(400)
        .onEnd(() => {
          'worklet';
          feed();
        }),
    // The worklets only touch shared values, which never change identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <ApparatusFrame
      figure={figure}
      title="Human cell"
      hint="Tap to feed the cell a glucose."
      readout={readout}
      className={className}
      caption={`A glucose enters through a transporter in the membrane. Crossing the cytoplasm it splits in two, which nets 2 ATP; the halves go into a mitochondrion, which burns them with oxygen for about 28 more — about ${PER_GLUCOSE} in all. The lit specks are the ATP, shown where it is made.`}
    >
      <GestureDetector gesture={tap}>
        <View
          accessible
          accessibilityRole="button"
          accessibilityLabel="Human cell. Feed it a glucose."
          accessibilityValue={{ text: readout }}
          accessibilityActions={[{ name: 'activate', label: 'Feed a glucose' }]}
          onAccessibilityAction={() => {
            glucose.value += 1;
            atp.value += PER_GLUCOSE;
            tick();
          }}
        >
          <FigureCanvas aspect={ASPECT}>
            {({ width, height }) => (
              <Cell width={width} height={height} trips={trips} bursts={bursts} glow={glow} shift={shift} />
            )}
          </FigureCanvas>
        </View>
      </GestureDetector>
    </ApparatusFrame>
  );
}

interface CellProps {
  width: number;
  height: number;
  trips: SharedValue<number[]>;
  bursts: SharedValue<number[]>;
  glow: SharedValue<number[]>;
  shift: SharedValue<number>;
}

/** A hexagon — a sugar ring — at a point, as a path, on the UI thread. */
function hexagon(s: number, z: number, r: number): string {
  'worklet';
  let d = '';
  for (let k = 0; k < 6; k += 1) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
    d += `${k ? 'L' : 'M'}${(s + r * Math.cos(a)).toFixed(2)} ${(z + r * Math.sin(a)).toFixed(2)}`;
  }
  return `${d}Z`;
}

function Cell({ width, height, trips, bursts, glow, shift }: CellProps) {
  const view = useMemo(() => fitView(CAMERA, EXTENT, width, height, 12), [width, height]);
  const art = useMemo(() => buildCell(view), [view]);
  const unit = 1 / view.scale;

  return (
    <IsoStage width={width} height={height}>
      <Layer>
        <Halo d={art.halo} />
        <Solid shape={art.slide} />
        <Solid shape={art.dome} />
        <Stroke d={art.domeLines} kind="faint" width={0.6} />
        <OnPlane matrix={art.cutPlane}>
          <Section art={art.section} unit={unit} />
        </OnPlane>
      </Layer>

      <Layer>
        <OnPlane matrix={art.cutPlane}>
          {MITOS.map((_, m) => (
            <Glow key={m} index={m} glow={glow} />
          ))}
          <Queue shift={shift} unit={unit} />
          {Array.from({ length: TRIPS }, (_, i) => (
            <Trip key={i} index={i} trips={trips} unit={unit} />
          ))}
          {Array.from({ length: BURSTS }, (_, i) => (
            <Burst key={i} index={i} bursts={bursts} />
          ))}
        </OnPlane>
      </Layer>
    </IsoStage>
  );
}

/** The cut face: cytoplasm, membrane, nucleus, organelles. */
function Section({ art, unit }: { art: ReturnType<typeof buildCell>['section']; unit: number }) {
  const palette = usePalette();
  const ink = strokes(palette);
  return (
    <G>
      <Path d={art.cytoplasm} fill={shade(palette, 'hi', 0.75)} />
      <Path d={art.er} stroke={ink.faint} strokeWidth={unit * 1.6} fill="none" strokeLinecap="round" />
      <Path d={art.golgi} stroke={ink.edge} strokeWidth={unit * 1.4} fill="none" strokeLinecap="round" />
      <Path d={art.vesicles} fill={shade(palette, 'mid', 0.6)} stroke={ink.edge} strokeWidth={unit * 0.6} />
      <Path d={art.nucleus} fill={shade(palette, 'mid', 0.45)} stroke={ink.edge} strokeWidth={unit * 0.9} />
      <Path d={art.envelope} fill="none" stroke={ink.faint} strokeWidth={unit * 0.7} />
      {art.pores.map(([s, z], i) => (
        <Circle key={i} cx={s} cy={z} r={0.9} fill={shade(palette, 'hi', 0.75)} />
      ))}
      {art.chromatin.map(([s, z], i) => (
        <Circle key={i} cx={s} cy={z} r={0.7} fill={shade(palette, 'mid', 0.15)} />
      ))}
      <Path d={art.nucleolus} fill={shade(palette, 'lo', 0.35)} stroke={ink.edge} strokeWidth={unit * 0.6} />
      {art.mitos.map((d, i) => (
        <Path key={i} d={d} fill={shade(palette, 'hi', 0.5)} stroke={ink.edge} strokeWidth={unit * 0.9} />
      ))}
      <Path d={art.cristae} stroke={ink.edge} strokeWidth={unit * 0.8} fill="none" strokeLinejoin="round" />
      <Path d={art.transporter} fill={shade(palette, 'mid', 0.3)} stroke={ink.edge} strokeWidth={unit * 0.7} />
      <Path d={art.membrane} stroke={ink.strong} strokeWidth={unit * 0.9} fill="none" />
    </G>
  );
}

/** A mitochondrion lit while it burns. */
function Glow({ index, glow }: { index: number; glow: SharedValue<number[]> }) {
  const palette = usePalette();
  const d = useMemo(() => capsulePath(MITOS[index]!), [index]);
  const props = useAnimatedProps(() => ({ fillOpacity: (glow.value[index] ?? 0) * 0.55 }));
  return <AnimatedPath animatedProps={props} d={d} fill={palette.accent} />;
}

/** Glucose waiting outside the transporter, moving up as one goes in. */
function Queue({ shift, unit }: { shift: SharedValue<number>; unit: number }) {
  const palette = usePalette();
  const ink = strokes(palette);
  const front = useAnimatedProps(() => {
    let d = '';
    for (let k = 0; k < 2; k += 1) {
      const [s, z] = queueAt(k + shift.value);
      d += hexagon(s, z, 3.6);
    }
    return { d };
  });
  const back = useAnimatedProps(() => {
    const [s, z] = queueAt(2 + shift.value);
    return { d: hexagon(s, z, 3.6), opacity: 1 - shift.value };
  });
  return (
    <G>
      <AnimatedPath animatedProps={front} fill={shade(palette, 'hi', 0.95)} stroke={ink.edge} strokeWidth={unit * 0.8} />
      <AnimatedPath animatedProps={back} fill={shade(palette, 'hi', 0.95)} stroke={ink.edge} strokeWidth={unit * 0.8} />
    </G>
  );
}

/** One glucose on its way in: whole until it splits, then two halves, shrinking as it burns. */
function Trip({ index, trips, unit }: { index: number; trips: SharedValue<number[]>; unit: number }) {
  const palette = usePalette();
  const ink = strokes(palette);
  const o = index * TRIP_FIELDS;
  const props = useAnimatedProps(() => {
    const t = trips.value;
    if (!t[o + T.active]) return { d: 'M0 0', opacity: 0 };
    const time = t[o + T.t]!;
    const p = t[o + T.mito]! * 8;
    const point = (k: number): Vec2 => [PATHS[p + k * 2]!, PATHS[p + k * 2 + 1]!];
    let s: number;
    let z: number;
    if (time < TRIP.enter) {
      // Through the transporter: out, in the channel, inside.
      const f = time / TRIP.enter;
      const leg = f < 0.5 ? 0 : 1;
      const g = f < 0.5 ? f * 2 : (f - 0.5) * 2;
      const a = point(leg);
      const b = point(leg + 1);
      s = a[0] + (b[0] - a[0]) * g;
      z = a[1] + (b[1] - a[1]) * g;
    } else {
      const f = Math.min(1, (time - TRIP.enter) / TRIP.cross);
      const eased = f * f * (3 - 2 * f);
      const a = point(2);
      const b = point(3);
      s = a[0] + (b[0] - a[0]) * eased;
      z = a[1] + (b[1] - a[1]) * eased;
    }
    const split = time >= TRIP.enter + TRIP.cross * 0.5;
    const burn = Math.max(0, (time - TRIP.enter - TRIP.cross) / TRIP.burn);
    const r = 3.6 * (1 - burn * 0.75);
    const d = split ? hexagon(s - 2.6, z, r * 0.72) + hexagon(s + 2.6, z, r * 0.72) : hexagon(s, z, r);
    return { d, opacity: 1 - burn * 0.6 };
  });
  return <AnimatedPath animatedProps={props} fill={shade(palette, 'hi', 0.95)} stroke={ink.edge} strokeWidth={unit * 0.8} />;
}

/** A burst of ATP specks spreading from where it was made, then fading. */
function Burst({ index, bursts }: { index: number; bursts: SharedValue<number[]> }) {
  const palette = usePalette();
  const o = index * BURST_FIELDS;
  const props = useAnimatedProps(() => {
    const b = bursts.value;
    if (!b[o + B.active]) return { d: 'M0 0', opacity: 0 };
    const t = b[o + B.t]!;
    const spread = 1 - Math.pow(1 - Math.min(1, t / 1.1), 3);
    let d = '';
    const count = b[o + B.count]!;
    for (let k = 0; k < count; k += 1) {
      const a = b[o + B.seed]! + k * 2.39996;
      const reach = (5 + ((k * 7) % 11)) * spread + 1;
      const s = b[o + B.s]! + Math.cos(a) * reach;
      const z = b[o + B.z]! + Math.sin(a) * reach * 0.8;
      d += `M${(s - 1.1).toFixed(2)} ${z.toFixed(2)}a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0`;
    }
    return { d, opacity: t < 1.2 ? 1 : Math.max(0, 1 - (t - 1.2) / (BURST_LIFE - 1.2)) };
  });
  return <AnimatedPath animatedProps={props} fill={palette.accent} />;
}
