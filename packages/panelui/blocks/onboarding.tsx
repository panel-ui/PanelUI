/**
 * Onboarding — the first three screens of an app, for a trip planner called
 * Wayfarer: what it does, where people go with it, and who you plan with.
 *
 * Each slide is an illustration made of components rather than a picture, so
 * it repaints with the theme and costs nothing to ship: a badge of text
 * turning round a compass, rows of destinations drifting past each other, and
 * a shared itinerary with the face of whoever added each entry. The illustration takes the top
 * of the screen and the words sit under it, where the eye lands after it.
 *
 * The slides are a native paging scroll rather than an animated deck, so a
 * slide follows the finger exactly and settles with the platform's own
 * deceleration instead of being thrown to the next one.
 *
 * The bottom control changes with the slide. On the first two it is a plain
 * Continue, because moving on is cheap; on the last it is a slide to start,
 * because starting is the one step that commits to something. Skip is there
 * throughout for the reader who already knows the app.
 *
 * The sample data is the constants below. Replace them with your own, or
 * lift them into props.
 */
import { useRef, useState } from 'react';
import { Pressable, ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react-native';
// Deep imports: the icon package's barrel re-exports thousands of glyphs, and
// a bundler that cannot tree-shake follows every one of them.
import Airplane01Icon from '@hugeicons/core-free-icons/Airplane01Icon';
import CheckmarkCircle02Icon from '@hugeicons/core-free-icons/CheckmarkCircle02Icon';
import CompassIcon from '@hugeicons/core-free-icons/CompassIcon';
import Location01Icon from '@hugeicons/core-free-icons/Location01Icon';
import Restaurant01Icon from '@hugeicons/core-free-icons/Restaurant01Icon';
import Train01Icon from '@hugeicons/core-free-icons/Train01Icon';
import { Avatar } from '../src/components/avatar';
import { Button } from '../src/components/button';
import { Chip } from '../src/components/chip';
import { CircularText } from '../src/components/circular-text';
import { Marquee } from '../src/components/marquee';
import { SlideButton } from '../src/components/slide-button';
import { TextAnimation } from '../src/components/text-animation';
import { ChevronLeftIcon, useIconColor } from '../src/icons';
import { Text } from '../src/primitives/text';
import { cn } from '../src/utils/cn';

/* -------------------------------------------------------------------------- */
/* Sample data                                                                */
/* -------------------------------------------------------------------------- */

const APP = { name: 'Wayfarer', badge: 'PLAN · PACK · GO · TOGETHER · ' };

/** The word that turns over in the first headline. */
const PROMISES = ['planned', 'shared', 'remembered'];

/** Three rows of places, so the drift reads as a world rather than a list. */
const PLACES = [
  ['Lisbon', 'Kyoto', 'Oaxaca', 'Tromsø', 'Hoi An', 'Valparaíso'],
  ['Cape Town', 'Tbilisi', 'Sintra', 'Hokkaido', 'Cartagena', 'Ljubljana'],
  ['Essaouira', 'Bergen', 'Luang Prabang', 'Puglia', 'Hobart', 'Cusco'],
];

const FRIENDS = [
  { name: 'Maya Lindqvist', initials: 'ML' },
  { name: 'Tomás Ferreira', initials: 'TF' },
  { name: 'Ines Moreau', initials: 'IM' },
  { name: 'Kenji Arai', initials: 'KA' },
  { name: 'Ada Okafor', initials: 'AO' },
];

/** The trip on the third slide: three entries, each added by someone different. */
const PLAN = [
  { title: 'Flight to Lisbon', when: 'Fri 08:40', by: 'ML', icon: Airplane01Icon, tilt: -2.5, inset: 0 },
  { title: 'Train to Sintra', when: 'Sat 10:15', by: 'TF', icon: Train01Icon, tilt: 1.5, inset: 18 },
  { title: 'Dinner at Taberna do Largo', when: 'Sat 20:30', by: 'IM', icon: Restaurant01Icon, tilt: -1, inset: 6 },
];

const SLIDES = [
  {
    id: 'plan',
    title: 'Every trip,',
    body: 'Flights, stays and the day-by-day in one place, ready before you leave.',
  },
  {
    id: 'discover',
    title: 'Ideas from people who went',
    body: 'Thousands of itineraries, written by travellers rather than by ads.',
  },
  {
    id: 'together',
    title: 'Plan it together',
    body: 'Invite the people you travel with. Everyone sees the same plan, and every change.',
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** A theme token, resolved for the drawing props that cannot take a class. */
function useToken(name: string, fallback: string) {
  const value = useCSSVariable(name);
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/** A glyph from the icon set, tinted by whatever surface it sits on. */
function Glyph({ icon, size = 18, color }: { icon: IconSvgElement; size?: number; color?: string }) {
  const inherited = useIconColor();
  const fallback = useToken('--color-foreground', '#262626');
  return (
    <HugeiconsIcon icon={icon} size={size} color={color ?? inherited ?? fallback} strokeWidth={1.5} />
  );
}

/* -------------------------------------------------------------------------- */
/* Illustrations                                                              */
/* -------------------------------------------------------------------------- */

/** A ring of words turning slowly round the app's mark. */
function CompassBadge() {
  const onPrimary = useToken('--color-primary-foreground', '#fafafa');
  return (
    <View className="items-center justify-center" importantForAccessibility="no-hide-descendants">
      <CircularText radius={124} textClassName="text-sm font-semibold tracking-widest text-muted-foreground">
        {APP.badge}
      </CircularText>
      <View className="absolute h-36 w-36 items-center justify-center rounded-full bg-primary">
        <Glyph icon={CompassIcon} size={64} color={onPrimary} />
      </View>
    </View>
  );
}

/**
 * Rows of destinations drifting in opposite directions.
 *
 * No pause button over them: the rows are decoration, and a button on an
 * illustration reads as something to press. Tapping the rows pauses and
 * resumes them instead, and they stand still on their own when the system
 * asks for reduced motion.
 */
function Destinations() {
  const [playing, setPlaying] = useState(true);
  return (
    // Out past the page's padding: rows that drift should run to the screen's
    // edges, not stop short of them.
    <Pressable
      onPress={() => setPlaying((current) => !current)}
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Pause the destinations' : 'Play the destinations'}
      className="-mx-6 gap-3 self-stretch"
    >
      {/* Each row is given its height and width: a marquee's track fills the
          row rather than measuring it, so a row with no size has nothing to
          fill and draws empty. */}
      <Marquee.Group playing={playing} showPauseControl={false} className="w-full gap-3">
        {PLACES.map((row, index) => (
          <Marquee
            key={row[0]}
            reverse={index % 2 === 1}
            spacing={10}
            speed={24 + index * 6}
            className="h-12 w-full"
          >
            <View className="flex-row gap-2.5">
              {row.map((place) => (
                <Chip
                  key={place}
                  size="lg"
                  variant={index === 1 ? 'primary' : 'outline'}
                  start={<Glyph icon={Location01Icon} size={16} />}
                >
                  {place}
                </Chip>
              ))}
            </View>
          </Marquee>
        ))}
      </Marquee.Group>
    </Pressable>
  );
}

/**
 * A plan three people have written: each entry is pinned at a slight angle,
 * like a note on a board, with the face of whoever added it.
 *
 * Showing the plan rather than the people is the point of the slide — what
 * "together" buys you is that the train Tomás booked is in the same place as
 * the flight Maya booked.
 */
function SharedPlan() {
  return (
    <View className="w-full max-w-sm gap-3" importantForAccessibility="no-hide-descendants">
      {PLAN.map((entry, index) => {
        const friend = FRIENDS.find((item) => item.initials === entry.by)!;
        return (
          <View
            key={entry.title}
            style={{ transform: [{ rotate: `${entry.tilt}deg` }], marginLeft: entry.inset }}
            className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
          >
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Glyph icon={entry.icon} size={20} />
            </View>
            <View className="flex-1">
              <Text weight="semibold" numberOfLines={1}>
                {entry.title}
              </Text>
              <Text size="sm" muted numberOfLines={1}>
                {entry.when} · added by {friend.name.split(' ')[0]}
              </Text>
            </View>
            <Avatar size="sm" fallback={friend.initials} />
          </View>
        );
      })}
      <View className="mt-2 flex-row items-center gap-2 self-center">
        <Avatar.Group size="sm" max={3} total={FRIENDS.length}>
          {FRIENDS.map((friend) => (
            <Avatar key={friend.initials} fallback={friend.initials} />
          ))}
        </Avatar.Group>
        <Text size="sm" muted>
          {FRIENDS.length} people on this trip
        </Text>
      </View>
    </View>
  );
}

/** Where the reader is: the current slide is a bar, the others dots. */
function PageDots({ count, index }: { count: number; index: number }) {
  const reducedMotion = useReducedMotion();
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Slide ${index + 1} of ${count}`}
      className="flex-row items-center justify-center gap-1.5"
    >
      {Array.from({ length: count }, (_, dot) => (
        <Animated.View
          key={dot}
          layout={reducedMotion ? undefined : LinearTransition.duration(220)}
          className={cn('h-1.5 rounded-full', dot === index ? 'w-6 bg-foreground' : 'w-1.5 bg-muted-foreground opacity-40')}
        />
      ))}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Block                                                                      */
/* -------------------------------------------------------------------------- */

export interface OnboardingBlockProps {
  /** Shows a back button in the header and is called when it is pressed. */
  onBack?: () => void;
  className?: string;
}

export function OnboardingBlock({ onBack, className }: OnboardingBlockProps) {
  const insets = useSafeAreaInsets();
  const success = useToken('--color-success', '#10b981');
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [pageWidth, setPageWidth] = useState(0);
  const pager = useRef<ScrollView>(null);
  const last = index === SLIDES.length - 1;

  const goTo = (page: number) => {
    pager.current?.scrollTo({ x: page * pageWidth, animated: true });
    setIndex(page);
  };

  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageWidth > 0) setIndex(Math.round(event.nativeEvent.contentOffset.x / pageWidth));
  };

  if (started) {
    return (
      <View
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}
        className={cn('flex-1 items-center justify-center gap-4 bg-background px-8', className)}
      >
        <Glyph icon={CheckmarkCircle02Icon} size={56} color={success} />
        <Text size="3xl" weight="bold" className="text-center">
          You're in
        </Text>
        <Text muted className="text-center">
          Start with a trip you already have booked, and {APP.name} fills in the rest.
        </Text>
        <Button
          variant="ghost"
          onPress={() => {
            setStarted(false);
            setIndex(0);
          }}
        >
          See the introduction again
        </Button>
      </View>
    );
  }

  return (
    <View className={cn('flex-1 bg-background', className)}>
      {/* Back and Skip */}
      <View style={{ paddingTop: insets.top + 8 }} className="flex-row items-center justify-between px-5 pb-2">
        {onBack ? (
          <Button variant="outline" size="icon" className="rounded-full" accessibilityLabel="Back" onPress={onBack}>
            <ChevronLeftIcon size={18} />
          </Button>
        ) : (
          <View />
        )}
        {last ? null : (
          <Button variant="ghost" onPress={() => goTo(SLIDES.length - 1)}>
            Skip
          </Button>
        )}
      </View>

      {/* Measured, so a page is exactly the width it is shown at — on a
          tablet in split view as much as on a phone. */}
      <View className="flex-1" onLayout={(event) => setPageWidth(event.nativeEvent.layout.width)}>
        {pageWidth > 0 ? (
          <ScrollView
            ref={pager}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={settle}
            className="flex-1"
          >
            {SLIDES.map((slide, slideIndex) => (
              <View key={slide.id} style={{ width: pageWidth }} className="flex-1 px-6">
                {/* The illustration takes the top of the screen. */}
                <View className="flex-1 items-center justify-center">
                  {slideIndex === 0 ? <CompassBadge /> : slideIndex === 1 ? <Destinations /> : <SharedPlan />}
                </View>

                <View className="w-full max-w-xl gap-3 self-center pb-6">
                  {slide.id === 'plan' ? (
                    <View>
                      <Text size="3xl" weight="bold" className="tracking-tight">
                        {slide.title}
                      </Text>
                      {/* Text props go to the words; className would only reach the box around them. */}
                      <TextAnimation.Rotating text={PROMISES} duration={2200} size="3xl" weight="bold" muted />
                    </View>
                  ) : (
                    <Text size="3xl" weight="bold" className="tracking-tight">
                      {slide.title}
                    </Text>
                  )}
                  <Text size="lg" muted>
                    {slide.body}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
      <PageDots count={SLIDES.length} index={index} />

      {/* Moving on is a button; starting is a slide. */}
      <View style={{ paddingBottom: insets.bottom + 12 }} className="px-5 pt-5">
        <View className="w-full max-w-xl self-center">
          {last ? (
            <SlideButton onComplete={() => setStarted(true)} accessibilityActionLabel={`Start using ${APP.name}`}>
              <SlideButton.Label>Slide to get started</SlideButton.Label>
            </SlideButton>
          ) : (
            <Button size="lg" fullWidth onPress={() => goTo(index + 1)}>
              Continue
            </Button>
          )}
        </View>
      </View>
    </View>
  );
}
