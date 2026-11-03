/**
 * Fig. — Token hopper: how a rate limiter lets bursts through and then holds
 * to a steady rate.
 *
 * The magazine is the bucket and each ball a token. Tap the hopper to pull the
 * lever: a request. With a ball in the magazine, the bottom one drops through
 * the gate, rolls down the chute and queues on the tray, and the request goes
 * through; with none, the gate stays shut and the flag swings up. The feeder on
 * top drops a new ball in every 0.8 s while there is room, so five quick taps
 * all succeed and the sixth waits.
 *
 * Built with the Apparatus kit. Sent balls are a small pool, each with its own
 * position and speed stepped on the UI thread, so a burst puts several on the
 * chute at once and none of them jumps.
 */
import { useMemo } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { Circle, G, Path, Rect } from 'react-native-svg';
import { aspectOf, camera, fitView, projector, type Solid as SolidShape } from '../../kit/iso';
import { Dots, FigureCanvas, Fill, Halo, IsoStage, Layer, OnPlane, Solid, Stroke, usePalette } from '../../kit/draw';
import {
  follow,
  knock,
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
import { BUCKET, describe, nextIn } from './model';
import {
  BALL,
  BIN,
  CHUTE,
  EXIT_X,
  EXTENT,
  FEEDER,
  LEVER,
  TRAY,
  TRAY_SLOTS,
  TRAY_Z,
  TUBE,
  buildHopper,
  chuteZ,
  slotZ,
  trayX,
} from './geometry';

const CAMERA = camera({ azimuth: 42, elevation: 30 });
const ASPECT = aspectOf(CAMERA, EXTENT);
const IDLE = 4.5;
/** The figure's own burst: seven requests, 0.28 s apart. */
const BURST = 7;
const BURST_GAP = 0.28;

/** How long a new ball takes to fall from the feeder to the stack. */
const FALL_TIME = 0.32;
/** A sent ball is out of sight inside the gate block for this long. */
const HIDDEN = 0.22;
/** Rolling: speed down the chute builds at this rate; along the tray it brakes at this one. */
const CHUTE_ACCEL = 260;
const TRAY_BRAKE = 160;
const GRAVITY = 900;

/**
 * Where a rolling ball claims its place in the queue: as it nears the last
 * slot, not when it reaches the tray, or a full tray would stop it short of the
 * tray for good.
 */
const JOIN_AT = CHUTE.to - BALL * 3;

/** The height of a ball's centre resting at `x`, on the chute or on the tray. */
function restZ(x: number): number {
  'worklet';
  return x < CHUTE.to ? chuteZ(x) : TRAY_Z;
}

/** The pool of sent balls, and the fields each one has in the flat array. */
const POOL = 8;
const F = { kind: 0, t: 1, slot: 2, x: 3, z: 4, vx: 5, vz: 6, spin: 7, alpha: 8 } as const;
const FIELDS = 9;
/** What a ball is doing: free, on its way, waiting on the tray, dropping into the bin. */
const Kind = { free: 0, sending: 1, queued: 2, dropping: 3 } as const;

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface TokenHopperFigureProps {
  figure?: number;
  active?: boolean;
  className?: string;
}

export function TokenHopperFigure({ figure = 3, active = true, className }: TokenHopperFigureProps) {
  const still = useStillness();
  const tokens = useSharedValue<number>(BUCKET.capacity);
  const progress = useSharedValue(0);
  const falling = useSharedValue(-1);
  const settle = useSharedValue(0);
  const lever = useSharedValue(0);
  const flag = useSharedValue(0);
  const star = useSharedValue(0);
  const starTarget = useSharedValue(0);
  const refused = useSharedValue(0);
  const wait = useSharedValue(0);
  const idle = useSharedValue(0);
  const burst = useSharedValue(0);
  const burstClock = useSharedValue(0);
  const balls = useSharedValue<number[]>(new Array(POOL * FIELDS).fill(0));

  const request = () => {
    'worklet';
    idle.value = 0;
    lever.value = 1;
    if (tokens.value < 1) {
      refused.value += 1;
      flag.value = 1;
      runOnJS(knock)();
      return;
    }
    tokens.value -= 1;
    settle.value = 1;
    runOnJS(tick)();
    balls.modify((b) => {
      'worklet';
      for (let i = 0; i < POOL; i += 1) {
        const o = i * FIELDS;
        if (b[o + F.kind] !== Kind.free) continue;
        b[o + F.kind] = Kind.sending;
        b[o + F.t] = 0;
        b[o + F.slot] = -1;
        b[o + F.x] = EXIT_X;
        b[o + F.z] = chuteZ(EXIT_X);
        b[o + F.vx] = 0;
        b[o + F.vz] = 0;
        b[o + F.alpha] = 0;
        break;
      }
      return b;
    });
  };

  useFigureClock((dt) => {
    'worklet';
    // The refill: one ball per 1/rate seconds, while the magazine has room.
    const incoming = falling.value >= 0 ? 1 : 0;
    if (tokens.value + incoming < BUCKET.capacity) {
      progress.value += dt * BUCKET.rate;
      if (progress.value >= 1) {
        progress.value -= 1;
        falling.value = 0;
        starTarget.value += Math.PI / 3;
      }
    } else if (!incoming) {
      progress.value = 0;
    }
    if (falling.value >= 0) {
      falling.value += dt / FALL_TIME;
      if (falling.value >= 1) {
        falling.value = -1;
        tokens.value = Math.min(BUCKET.capacity, tokens.value + 1);
      }
    }

    balls.modify((b) => {
      'worklet';
      for (let i = 0; i < POOL; i += 1) {
        const o = i * FIELDS;
        const kind = b[o + F.kind]!;
        if (kind === Kind.free) continue;
        b[o + F.t] = b[o + F.t]! + dt;
        const x0 = b[o + F.x]!;

        if (kind === Kind.sending && b[o + F.slot]! < 0) {
          // Inside the gate block until there is room at the slot: a ball only
          // ever comes out through the slot, never over or through the block.
          if (b[o + F.t]! < HIDDEN) continue;
          if (b[o + F.alpha] === 0) {
            let room = true;
            for (let k = 0; k < POOL; k += 1) {
              const q = k * FIELDS;
              if (k === i || b[q + F.alpha] === 0 || b[q + F.kind] === Kind.free) continue;
              if (b[q + F.x]! >= EXIT_X && b[q + F.x]! < EXIT_X + BALL * 2 + 0.5) room = false;
            }
            if (!room) continue;
          }
          b[o + F.alpha] = 1;
          b[o + F.vx] = b[o + F.vx]! + CHUTE_ACCEL * dt;
          b[o + F.x] = b[o + F.x]! + b[o + F.vx]! * dt;
          if (b[o + F.x]! >= JOIN_AT) {
            // Reaching the queue. If the tray is full, the oldest rolls off into
            // the bin and the rest move up, which is what makes room for this one.
            let onTray = 0;
            for (let k = 0; k < POOL; k += 1) {
              const q = k * FIELDS;
              const waiting =
                b[q + F.kind] === Kind.queued || (b[q + F.kind] === Kind.sending && b[q + F.slot]! >= 0);
              if (waiting) onTray += 1;
            }
            if (onTray >= TRAY_SLOTS) {
              for (let k = 0; k < POOL; k += 1) {
                const q = k * FIELDS;
                const waiting =
                  b[q + F.kind] === Kind.queued || (b[q + F.kind] === Kind.sending && b[q + F.slot]! >= 0);
                if (!waiting) continue;
                if (b[q + F.slot] === 0) {
                  b[q + F.kind] = Kind.dropping;
                  b[q + F.vx] = Math.max(b[q + F.vx]!, 20);
                  b[q + F.vz] = 0;
                } else {
                  b[q + F.slot] = b[q + F.slot]! - 1;
                }
              }
              onTray -= 1;
            }
            b[o + F.slot] = onTray;
          }
          b[o + F.z] = restZ(b[o + F.x]!);
        } else if (kind === Kind.sending || kind === Kind.queued) {
          // Along the tray, braking so it stops at its place in the queue.
          const target = trayX(b[o + F.slot]!);
          const gap = Math.max(0, target - b[o + F.x]!);
          const limit = Math.sqrt(2 * TRAY_BRAKE * gap);
          b[o + F.vx] = Math.max(Math.min(b[o + F.vx]!, limit), Math.min(gap / dt, 6));
          b[o + F.x] = Math.min(target, b[o + F.x]! + b[o + F.vx]! * dt);
          b[o + F.z] = restZ(b[o + F.x]!);
          if (target - b[o + F.x]! < 0.05) {
            b[o + F.x] = target;
            b[o + F.vx] = 0;
            b[o + F.kind] = Kind.queued;
          }
        } else if (kind === Kind.dropping) {
          // Off the open end, then a fall into the bin, then gone.
          const edge = TRAY.x + TRAY.w;
          const floor = BIN.z + 1.5 + BALL;
          if (b[o + F.x]! < edge + 1 && b[o + F.z]! >= TRAY_Z) {
            b[o + F.vx] = b[o + F.vx]! + 60 * dt;
          } else {
            b[o + F.vz] = b[o + F.vz]! - GRAVITY * dt;
          }
          b[o + F.x] = Math.min(BIN.x + BIN.w - 3 - BALL, b[o + F.x]! + b[o + F.vx]! * dt);
          b[o + F.z] = Math.max(floor, b[o + F.z]! + b[o + F.vz]! * dt);
          if (b[o + F.z] === floor) {
            b[o + F.vx] = 0;
            b[o + F.alpha] = Math.max(0, b[o + F.alpha]! - dt / 0.5);
            if (b[o + F.alpha] === 0) b[o + F.kind] = Kind.free;
          }
        }
        b[o + F.spin] = b[o + F.spin]! + (b[o + F.x]! - x0);
      }

      // Balls touch: none can come closer than a diameter to the one ahead of
      // it, and one that catches up takes the slower ball's speed.
      const edge = TRAY.x + TRAY.w;
      const rolling = (q: number) =>
        (b[q + F.kind] === Kind.sending && b[q + F.alpha]! > 0) ||
        b[q + F.kind] === Kind.queued ||
        (b[q + F.kind] === Kind.dropping && b[q + F.x]! < edge);
      for (let pass = 0; pass < 2; pass += 1) {
        for (let i = 0; i < POOL; i += 1) {
          const o = i * FIELDS;
          if (!rolling(o) || b[o + F.kind] === Kind.dropping) continue;
          for (let k = 0; k < POOL; k += 1) {
            const q = k * FIELDS;
            if (k === i || !rolling(q) || b[q + F.x]! < b[o + F.x]!) continue;
            // Never back past the slot: a ball out of the gate stays out.
            const limit = Math.max(EXIT_X, b[q + F.x]! - BALL * 2 - 0.3);
            if (b[o + F.x]! > limit) {
              b[o + F.spin] = b[o + F.spin]! - (b[o + F.x]! - limit);
              b[o + F.x] = limit;
              b[o + F.vx] = Math.min(b[o + F.vx]!, b[q + F.vx]!);
              b[o + F.z] = restZ(limit);
            }
          }
        }
      }
      return b;
    });

    settle.value = follow(settle.value, 0, 16, dt);
    lever.value = follow(lever.value, 0, 7, dt);
    flag.value = follow(flag.value, 0, 1.6, dt);
    star.value = follow(star.value, starTarget.value, 12, dt);
    wait.value = nextIn(progress.value, tokens.value + incoming);

    // Left alone, it sends a burst faster than the refill, so some are refused.
    if (burst.value > 0) {
      burstClock.value -= dt;
      if (burstClock.value <= 0) {
        burst.value -= 1;
        burstClock.value = BURST_GAP;
        request();
      }
    } else {
      idle.value += dt;
      if (!still && idle.value > IDLE && tokens.value >= BUCKET.capacity) {
        burst.value = BURST;
        burstClock.value = 0;
      }
    }
  }, active);

  const shownTokens = useReadout(tokens, 1);
  const shownWait = useReadout(wait, 0.1);
  const shownRefused = useReadout(refused, 1);
  const readout = describe(shownTokens, shownWait, shownRefused);

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(400)
        .onEnd(() => {
          'worklet';
          burst.value = 0;
          request();
        }),
    // The request worklet only touches shared values, which never change identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <ApparatusFrame
      figure={figure}
      title="Token hopper"
      hint="Tap to send a request."
      readout={readout}
      className={className}
      caption="The magazine is the bucket and each ball a token. A request takes the bottom ball; with none left, the gate stays shut and the flag goes up. The feeder adds one ball every 0.8 s while there is room, so a burst of five goes straight through and anything faster waits for the feeder."
    >
      <GestureDetector gesture={tap}>
        <View
          accessible
          accessibilityRole="button"
          accessibilityLabel="Token hopper. Send a request."
          accessibilityValue={{ text: readout }}
          accessibilityActions={[{ name: 'activate', label: 'Send a request' }]}
          onAccessibilityAction={() => {
            burst.value = 0;
            if (tokens.value >= 1) {
              tokens.value -= 1;
              settle.value = 1;
            } else {
              refused.value += 1;
              flag.value = 1;
            }
          }}
        >
          <FigureCanvas aspect={ASPECT}>
            {({ width, height }) => (
              <Hopper width={width} height={height} state={{ tokens, falling, settle, lever, flag, star, balls }} />
            )}
          </FigureCanvas>
        </View>
      </GestureDetector>
    </ApparatusFrame>
  );
}

interface HopperState {
  tokens: SharedValue<number>;
  falling: SharedValue<number>;
  settle: SharedValue<number>;
  lever: SharedValue<number>;
  flag: SharedValue<number>;
  star: SharedValue<number>;
  balls: SharedValue<number[]>;
}

function Hopper({ width, height, state }: { width: number; height: number; state: HopperState }) {
  const { tokens, falling, settle, lever, flag, star, balls } = state;
  const view = useMemo(() => fitView(CAMERA, EXTENT, width, height, 14), [width, height]);
  const art = useMemo(() => buildHopper(view), [view]);
  const lineWidth = 1 / view.scale;
  const [ux, uy] = art.up;

  const stackStyle = useAnimatedStyle(() => {
    const lift = settle.value * BALL * 2;
    return slideStyle(ux * lift, uy * lift);
  });
  const fallStyle = useAnimatedStyle(() => {
    if (falling.value < 0) return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }] };
    const t = falling.value * falling.value;
    const top = FEEDER.z + 2;
    const landing = slotZ(Math.min(BUCKET.capacity - 1, tokens.value));
    const z = top + (landing - top) * t - slotZ(0);
    return { opacity: 1, ...slideStyle(ux * z, uy * z) };
  });
  const starStyle = useAnimatedStyle(() => matrixStyle(rotateInPlane(art.starPlane as Affine, star.value)));
  const leverStyle = useAnimatedStyle(() =>
    matrixStyle(rotateInPlane(art.leverPlane as Affine, 0.32 - lever.value * 0.75))
  );
  const flagStyle = useAnimatedStyle(() => matrixStyle(rotateInPlane(art.flagPlane as Affine, flag.value * 2.6)));

  const proj = useMemo(() => projector(view), [view]);
  const origin = useMemo(() => view.point([EXIT_X, TUBE.y, chuteZ(EXIT_X)]), [view]);
  const radius = BALL * view.scale;

  return (
    <IsoStage width={width} height={height}>
      <Layer>
        <Halo d={art.halo} />
        {art.back.map((shape, i) => (
          <Solid key={i} shape={shape} />
        ))}
        <Stroke d={art.glassBack} kind="faint" width={0.7} />
      </Layer>

      <Layer>
        {art.gate.map((shape, i) => (
          <Solid key={i} shape={shape} />
        ))}
        <Fill d={art.slotOpening} tone="lo" light={0} />
        <Dots points={art.screws} />
      </Layer>

      <Layer style={stackStyle}>
        {art.stack.map((shape, i) => (
          <Shown key={i} index={i} count={tokens} shape={shape} />
        ))}
      </Layer>

      <Layer style={fallStyle}>
        <Solid shape={art.stack[0]!} />
      </Layer>

      <Layer>
        {art.chute.map((shape, i) => (
          <Solid key={i} shape={shape} />
        ))}
      </Layer>

      {Array.from({ length: POOL }, (_, i) => (
        <SentBall key={i} index={i} balls={balls} proj={proj} origin={origin} radius={radius} shape={art.ball} />
      ))}

      <Layer>
        <Solid shape={art.nearRail} />
        {art.trayFront.map((shape, i) => (
          <Solid key={i} shape={shape} />
        ))}
        {art.binFront.map((shape, i) => (
          <Solid key={i} shape={shape} />
        ))}
        <Stroke d={art.glassFront} kind="edge" width={0.9} />
        <Stroke d={art.glassShine} kind="faint" width={1.4} />
        {art.front.map((shape, i) => (
          <Solid key={i} shape={shape} />
        ))}
      </Layer>

      <Layer style={starStyle}>
        <OnPlane matrix={art.starPlane}>
          <StarWheel lineWidth={lineWidth} />
        </OnPlane>
      </Layer>

      <Layer style={leverStyle}>
        <OnPlane matrix={art.leverPlane}>
          <LeverArm lineWidth={lineWidth} />
        </OnPlane>
      </Layer>

      <Layer style={flagStyle}>
        <OnPlane matrix={art.flagPlane}>
          <RefusalFlag lineWidth={lineWidth} />
        </OnPlane>
      </Layer>
    </IsoStage>
  );
}

/**
 * One ball of the pool, as its own layer: moved to wherever the model has it,
 * with a mark on it turning as it rolls so it reads as rolling, not sliding.
 */
function SentBall({
  index,
  balls,
  proj,
  origin,
  radius,
  shape,
}: {
  index: number;
  balls: SharedValue<number[]>;
  proj: ReturnType<typeof projector>;
  origin: readonly [number, number];
  radius: number;
  shape: SolidShape;
}) {
  const ink = strokes(usePalette());
  const o = index * FIELDS;
  const style = useAnimatedStyle(() => {
    const b = balls.value;
    if (b[o + F.kind] === Kind.free) return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }] };
    const [x, y] = projectWith(proj, b[o + F.x]!, TUBE.y, b[o + F.z]!);
    return { opacity: b[o + F.alpha]!, ...slideStyle(x - origin[0], y - origin[1]) };
  });
  const mark = useAnimatedProps(() => {
    const angle = (balls.value[o + F.spin] ?? 0) / BALL;
    return { cx: origin[0] + Math.cos(angle) * radius * 0.55, cy: origin[1] + Math.sin(angle) * radius * 0.55 };
  });
  return (
    <Layer style={style}>
      <Solid shape={shape} />
      <AnimatedCircle animatedProps={mark} r={radius * 0.16} fill={ink.edge} />
    </Layer>
  );
}

/** A ball shown only while there are more than `index` of them. */
function Shown({ index, count, shape }: { index: number; count: SharedValue<number>; shape: SolidShape }) {
  const props = useAnimatedProps(() => ({ opacity: count.value > index ? 1 : 0 }));
  return (
    <AnimatedG animatedProps={props}>
      <Solid shape={shape} />
    </AnimatedG>
  );
}

/** The feeder's star wheel: six teeth, one for each ball let through. */
function StarWheel({ lineWidth }: { lineWidth: number }) {
  const palette = usePalette();
  const ink = strokes(palette);
  const d = useMemo(() => {
    const points: string[] = [];
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      const r = i % 2 === 0 ? 8 : 4.6;
      points.push(`${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`);
    }
    return `M${points.join('L')}Z`;
  }, []);
  return (
    <G>
      <Path d={d} fill={shade(palette, 'hi', 0.7)} stroke={ink.edge} strokeWidth={lineWidth * 0.8} strokeLinejoin="round" />
      <Circle cx={0} cy={0} r={1.6} fill={ink.dot} />
    </G>
  );
}

/** The request lever, drawn pointing out from its pivot. */
function LeverArm({ lineWidth }: { lineWidth: number }) {
  const palette = usePalette();
  const ink = strokes(palette);
  const length = LEVER.length;
  return (
    <G>
      <Path d={`M0 0L${length} 0`} stroke={ink.edge} strokeWidth={4.6} strokeLinecap="round" />
      <Path d={`M0 0L${length} 0`} stroke={shade(palette, 'hi', 0.75)} strokeWidth={3.4} strokeLinecap="round" />
      <Circle cx={length} cy={0} r={4.4} fill={shade(palette, 'hi', 0.9)} stroke={ink.edge} strokeWidth={lineWidth * 0.8} />
      <Circle cx={0} cy={0} r={1.4} fill={ink.dot} />
    </G>
  );
}

/** The flag that swings up when a request is refused. */
function RefusalFlag({ lineWidth }: { lineWidth: number }) {
  const ink = strokes(usePalette());
  return (
    <G>
      <Path d="M0 0L0 -11" stroke={ink.edge} strokeWidth={1.4} strokeLinecap="round" />
      <Rect x={-0.2} y={-11} width={6.5} height={4.2} fill={ink.strong} stroke={ink.edge} strokeWidth={lineWidth * 0.6} />
    </G>
  );
}
