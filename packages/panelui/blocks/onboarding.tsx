/**
 * Onboarding — the first run of an app, for a trip planner called Wayfarer:
 * two screens on what it does, one question to personalise it, and the
 * answer turned into a first plan.
 *
 * The pictures are flat shapes in a few strong colours — a sun, hills, a
 * globe, a route — drawn in SVG from the chart tokens, so each theme recolours
 * them and nothing has to be downloaded. On the two introduction screens the
 * picture fills the bottom half and runs off the edge of the screen, with the
 * title and one line at the top where the eye starts. Large, flat and
 * simple, the pictures set a mood rather than explain the interface, which is
 * the job the words do.
 *
 * The question screen hangs a coloured band with a curved edge over a short
 * list of answers. Continue waits until one is picked, because the screen
 * after it is built from the answer: a badge for the kind of trip, and a
 * first plan made for it. Asking before showing is what makes the last
 * screen feel made for the reader rather than shown to everyone.
 *
 * Every screen has one full-width pill button at the bottom. Steps move with
 * a short slide in the direction of travel, and stand still under reduced
 * motion.
 *
 * The sample data is the constants below. Replace them with your own, or
 * lift them into props.
 */
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react-native';
// Deep imports: the icon package's barrel re-exports thousands of glyphs, and
// a bundler that cannot tree-shake follows every one of them.
import Airplane01Icon from '@hugeicons/core-free-icons/Airplane01Icon';
import City01Icon from '@hugeicons/core-free-icons/City01Icon';
import CompassIcon from '@hugeicons/core-free-icons/CompassIcon';
import Home01Icon from '@hugeicons/core-free-icons/Home01Icon';
import Luggage01Icon from '@hugeicons/core-free-icons/Luggage01Icon';
import MountainIcon from '@hugeicons/core-free-icons/MountainIcon';
import { Button } from '../src/components/button';
import { RadioGroup } from '../src/components/radio-group';
import { ChevronLeftIcon } from '../src/icons';
import { Text } from '../src/primitives/text';
import { cn } from '../src/utils/cn';

/* -------------------------------------------------------------------------- */
/* Sample data                                                                */
/* -------------------------------------------------------------------------- */

/** The two screens before the question. */
const INTRO = [
  {
    id: 'plan',
    title: 'Every trip, in one place',
    body: 'Flights, stays and the day-by-day, ready before you leave.',
  },
  {
    id: 'discover',
    title: 'Ideas from people who went',
    body: 'Whole itineraries written by travellers, for over 4,000 places.',
  },
] as const;

/** The answers to the question, and the first plan each one turns into. */
const TRIPS = [
  { id: 'city', label: 'A city weekend', icon: City01Icon, plan: 'Three days in Lisbon', detail: 'Neighbourhood walks, two markets and a day trip to Sintra.' },
  { id: 'abroad', label: 'A long trip abroad', icon: Airplane01Icon, plan: 'Two weeks in Japan', detail: 'Tokyo, Kyoto and the coast, with the trains between them.' },
  { id: 'outdoors', label: 'Something outdoors', icon: MountainIcon, plan: 'Five days in the Dolomites', detail: 'Hut-to-hut hikes with a rest day in the middle.' },
  { id: 'family', label: 'Visiting family', icon: Home01Icon, plan: 'A week at home', detail: 'Travel there and back, and the days around it kept free.' },
  { id: 'unsure', label: 'Not sure yet', icon: CompassIcon, plan: 'Somewhere new', detail: 'Ten places people loved this month, to start from.' },
] as const;

type TripId = (typeof TRIPS)[number]['id'];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** A theme token, resolved for the drawing props that cannot take a class. */
function useToken(name: string, fallback: string) {
  const value = useCSSVariable(name);
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/** The illustration palette: four chart colours, the page, and the ink. */
function usePalette() {
  return {
    blue: useToken('--color-chart-2', '#3b82f6'),
    green: useToken('--color-chart-3', '#10b981'),
    amber: useToken('--color-chart-4', '#f59e0b'),
    violet: useToken('--color-chart-5', '#8b5cf6'),
    paper: useToken('--color-card', '#ffffff'),
    ink: useToken('--color-foreground', '#262626'),
  };
}

/** A four-pointed sparkle centred on (x, y). */
function sparkle(x: number, y: number, r: number) {
  const k = r * 0.28;
  return `M ${x} ${y - r} Q ${x + k} ${y - k} ${x + r} ${y} Q ${x + k} ${y + k} ${x} ${y + r} Q ${x - k} ${y + k} ${x - r} ${y} Q ${x - k} ${y - k} ${x} ${y - r} Z`;
}

/** A soft cloud: a pill with two domes on it, its left end at (x, y). */
function Cloud({ x, y, scale = 1, fill }: { x: number; y: number; scale?: number; fill: string }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      <Rect x={0} y={0} width={110} height={40} rx={20} fill={fill} />
      <Circle cx={36} cy={4} r={24} fill={fill} />
      <Circle cx={70} cy={-2} r={30} fill={fill} />
    </G>
  );
}

/* -------------------------------------------------------------------------- */
/* Pictures                                                                   */
/* -------------------------------------------------------------------------- */

/*
 * Each picture is drawn on a 390 × 400 box and anchored to the bottom of the
 * space it is given, cropping at the sides on a wide screen rather than
 * shrinking — the hills are meant to run off the edges.
 */
const ART = { width: 390, height: 400 };

/** A sun rising behind two hills, with a plane crossing it. */
function PlanArt() {
  const c = usePalette();
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${ART.width} ${ART.height}`} preserveAspectRatio="xMidYMax slice">
      <Circle cx={250} cy={170} r={112} fill={c.amber} />
      <Path d={sparkle(70, 80, 16)} fill={c.violet} />
      <Path d={sparkle(345, 52, 11)} fill={c.blue} />
      <Path d={sparkle(118, 132, 8)} fill={c.amber} />
      {/* Clouds only where there is colour behind them: on the page they would vanish. */}
      <Cloud x={150} y={214} scale={0.8} fill={c.paper} />
      <Cloud x={292} y={150} scale={0.6} fill={c.paper} />
      {/* The plane's path, dashed, ending at the plane. */}
      <Path d="M 20 120 Q 110 60 200 92" stroke={c.ink} strokeWidth={3} strokeDasharray="2 9" strokeLinecap="round" fill="none" />
      <G transform="translate(196 70) rotate(18)">
        <Path
          d="M 0 22 L 46 22 Q 58 22 58 28 Q 58 34 46 34 L 0 34 Z M 18 22 L 32 2 L 40 2 L 34 22 Z M 18 34 L 32 54 L 40 54 L 34 34 Z M 2 22 L 8 12 L 13 12 L 12 22 Z"
          fill={c.ink}
        />
      </G>
      <Path d="M -20 262 Q 110 186 240 236 T 420 222 L 420 420 L -20 420 Z" fill={c.blue} />
      <Path d="M -20 322 Q 150 262 300 318 T 420 316 L 420 420 L -20 420 Z" fill={c.green} />
    </Svg>
  );
}

/** A globe with land on it, a dashed route across it and a pin at the end. */
function DiscoverArt() {
  const c = usePalette();
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${ART.width} ${ART.height}`} preserveAspectRatio="xMidYMax slice">
      <Path d={sparkle(58, 70, 14)} fill={c.amber} />
      <Path d={sparkle(340, 96, 12)} fill={c.violet} />
      <Circle cx={195} cy={330} r={190} fill={c.blue} />
      <Cloud x={46} y={226} scale={0.6} fill={c.paper} />
      {/* Land, as three soft blobs. */}
      <Path d="M 70 250 Q 110 200 170 222 Q 210 238 196 274 Q 176 316 120 302 Q 62 288 70 250 Z" fill={c.green} />
      <Path d="M 238 196 Q 296 182 322 222 Q 340 258 300 268 Q 262 276 246 246 Q 230 214 238 196 Z" fill={c.green} />
      <Path d="M 150 350 Q 196 324 250 342 Q 290 360 262 396 L 150 400 Q 120 376 150 350 Z" fill={c.green} />
      <Path d="M 96 262 Q 190 150 288 232" stroke={c.paper} strokeWidth={5} strokeDasharray="2 12" strokeLinecap="round" fill="none" />
      {/* The pin. */}
      <G transform="translate(268 168)">
        <Path d="M 22 0 Q 44 0 44 24 Q 44 42 22 66 Q 0 42 0 24 Q 0 0 22 0 Z" fill={c.violet} />
        <Circle cx={22} cy={23} r={9} fill={c.paper} />
      </G>
    </Svg>
  );
}

/** Where the sun sits in the band's 220-unit height, so the glyph over it can follow. */
const BAND_SUN_Y = 118;
const BAND_HEIGHT = 220;

/** The band over the question: a curved edge, a sun, and a cloud crossing it. */
function QuestionBand() {
  const c = usePalette();
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 390 ${BAND_HEIGHT}`} preserveAspectRatio="xMidYMax slice">
      <Path d="M -10 -10 L 400 -10 L 400 168 Q 195 228 -10 168 Z" fill={c.amber} />
      <Circle cx={195} cy={BAND_SUN_Y} r={56} fill={c.paper} />
      <Path d={sparkle(96, 146, 12)} fill={c.paper} />
      <Path d={sparkle(300, 150, 9)} fill={c.violet} />
      <Cloud x={226} y={138} scale={0.5} fill={c.paper} />
    </Svg>
  );
}

/** The badge for the trip that was picked: a hexagon with the trip's glyph. */
function TripBadge({ icon }: { icon: IconSvgElement }) {
  const c = usePalette();
  const size = 220;
  const hexagon = (r: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      return `${i === 0 ? 'M' : 'L'} ${110 + r * Math.cos(angle)} ${110 + r * Math.sin(angle)}`;
    }).join(' ') + ' Z';

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} viewBox="0 0 220 220" style={{ position: 'absolute' }}>
        <Path d={hexagon(104)} fill={c.violet} />
        <Path d={hexagon(74)} fill={c.paper} />
        <Path d={sparkle(30, 40, 14)} fill={c.amber} />
        <Path d={sparkle(196, 176, 11)} fill={c.blue} />
        <Cloud x={136} y={46} scale={0.45} fill={c.paper} />
      </Svg>
      <HugeiconsIcon icon={icon} size={64} color={c.ink} strokeWidth={1.5} />
    </View>
  );
}

/** Where the reader is in the introduction. */
function PageDots({ count, index }: { count: number; index: number }) {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Screen ${index + 1} of ${count}`}
      className="flex-row items-center gap-1.5"
    >
      {Array.from({ length: count }, (_, dot) => (
        <View
          key={dot}
          className={cn('h-1.5 rounded-full', dot === index ? 'w-6 bg-foreground' : 'w-1.5 bg-muted-foreground opacity-40')}
        />
      ))}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Block                                                                      */
/* -------------------------------------------------------------------------- */

/** Introduction screens, then the question, then the result. */
const QUESTION = INTRO.length;
const RESULT = INTRO.length + 1;

export interface OnboardingBlockProps {
  /** Shows a back button on the first screen and is called when it is pressed. */
  onBack?: () => void;
  /**
   * Called with the reader's answer when they press Start planning — where an
   * app would open its first plan. Without it the introduction starts over.
   */
  onFinish?: (trip: TripId) => void;
  className?: string;
}

export function OnboardingBlock({ onBack, onFinish, className }: OnboardingBlockProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [trip, setTrip] = useState<TripId | null>(null);
  const picked = TRIPS.find((item) => item.id === trip);
  const ink = useToken('--color-foreground', '#262626');
  const bandHeight = insets.top + 200;

  const go = (target: number) => {
    setDirection(target > step ? 1 : -1);
    setStep(target);
  };

  const back = step > 0 ? () => go(step - 1) : onBack;
  // Each step enters from the side the reader is travelling towards.
  const entering = (direction === 1 ? FadeInRight : FadeInLeft).duration(260);

  const primary =
    step < QUESTION
      ? { label: 'Continue', onPress: () => go(step + 1), disabled: false }
      : step === QUESTION
        ? { label: 'Continue', onPress: () => go(RESULT), disabled: !trip }
        : {
            label: 'Start planning',
            onPress: () => {
              if (onFinish && trip) onFinish(trip);
              else {
                setTrip(null);
                go(0);
              }
            },
            disabled: false,
          };

  return (
    <View className={cn('flex-1 bg-background', className)}>
      {/* The band sits behind the header, so it reaches the top of the screen. */}
      {step === QUESTION ? (
        <View
          className="absolute inset-x-0 top-0"
          style={{ height: bandHeight }}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          <QuestionBand />
          {/* The suitcase on the sun. The band is scaled to its height, so the
              sun's height in the drawing is the same fraction of this one. */}
          <View
            className="absolute inset-x-0 items-center"
            style={{ top: (bandHeight * BAND_SUN_Y) / BAND_HEIGHT - 26 }}
          >
            <HugeiconsIcon icon={Luggage01Icon} size={52} color={ink} strokeWidth={1.5} />
          </View>
        </View>
      ) : null}

      <View style={{ paddingTop: insets.top + 8 }} className="flex-row items-center justify-between px-5 pb-2">
        {back ? (
          <Button variant="outline" size="icon" className="rounded-full bg-card" accessibilityLabel="Back" onPress={back}>
            <ChevronLeftIcon size={18} />
          </Button>
        ) : (
          <View className="h-11" />
        )}
        {step < QUESTION ? (
          <Button variant="ghost" onPress={() => go(QUESTION)}>
            Skip
          </Button>
        ) : null}
      </View>

      <Animated.View key={step} entering={entering} className="flex-1">
        {step < QUESTION ? (
          <View className="flex-1">
            <View className="w-full max-w-xl gap-3 self-center px-6 pt-4">
              <Text size="3xl" weight="bold" className="tracking-tight">
                {INTRO[step]!.title}
              </Text>
              <Text size="lg" muted>
                {INTRO[step]!.body}
              </Text>
              <View className="pt-2">
                <PageDots count={INTRO.length} index={step} />
              </View>
            </View>
            {/* The picture runs off the bottom and the sides. */}
            <View className="mt-6 flex-1" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
              {step === 0 ? <PlanArt /> : <DiscoverArt />}
            </View>
          </View>
        ) : step === QUESTION ? (
          <View className="w-full max-w-xl flex-1 gap-6 self-center px-5" style={{ paddingTop: 150 }}>
            <View className="items-center gap-1.5">
              <Text size="2xl" weight="bold" className="text-center">
                What kind of trip is next?
              </Text>
              <Text muted className="text-center">
                Your first plan starts from the answer.
              </Text>
            </View>
            <RadioGroup variant="card" value={trip ?? ''} onValueChange={(value) => setTrip(value as TripId)}>
              {TRIPS.map((item) => (
                <RadioGroup.Item key={item.id} value={item.id} label={item.label} className="rounded-2xl" />
              ))}
            </RadioGroup>
          </View>
        ) : picked ? (
          <View className="w-full max-w-xl flex-1 items-center justify-center gap-6 self-center px-6">
            <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
              <TripBadge icon={picked.icon} />
            </View>
            <View className="items-center gap-2">
              <Text muted>Your first plan is ready</Text>
              <Text size="3xl" weight="bold" className="text-center tracking-tight">
                {picked.plan}
              </Text>
              <Text muted className="text-center">
                {picked.detail}
              </Text>
            </View>
          </View>
        ) : null}
      </Animated.View>

      <View style={{ paddingBottom: insets.bottom + 12 }} className="gap-2 px-5 pt-3">
        <View className="w-full max-w-xl gap-2 self-center">
          <Button size="lg" fullWidth className="rounded-full" disabled={primary.disabled} onPress={primary.onPress}>
            {primary.label}
          </Button>
          {step === RESULT ? (
            <Button variant="ghost" fullWidth onPress={() => go(QUESTION)}>
              Choose a different trip
            </Button>
          ) : null}
        </View>
      </View>
    </View>
  );
}
