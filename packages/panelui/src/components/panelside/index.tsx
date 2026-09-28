/**
 * Panelside — a navigation panel that moves the app aside instead of covering
 * it.
 *
 * ```tsx
 * <Panelside>
 *   <Panelside.Panel>
 *     <Panelside.Header title="Assistant">
 *       <Panelside.Search value={query} onChangeText={setQuery} />
 *     </Panelside.Header>
 *     <Panelside.Content>
 *       <Panelside.Group>
 *         <Panelside.GroupLabel>Recents</Panelside.GroupLabel>
 *         <Panelside.Item label="Launch thread" />
 *       </Panelside.Group>
 *     </Panelside.Content>
 *     <Panelside.Footer>
 *       <Panelside.Cta label="New chat" onPress={compose} />
 *     </Panelside.Footer>
 *   </Panelside.Panel>
 *
 *   <Panelside.Scene>
 *     <Panelside.Trigger />
 *     <Conversation />
 *   </Panelside.Scene>
 * </Panelside>
 * ```
 *
 * ## Why it is not a Drawer
 *
 * A drawer is an overlay: it mounts through a portal, lands above everything
 * and dims what it hid. That is the wrong shape here, because the whole point
 * of this pattern is that the app *stays legible* — it slides across, shrinks,
 * rounds its corners and waits, so the panel reads as a layer behind the app
 * rather than a sheet on top of it. A portal cannot do that: its content is
 * above the app content by construction, and the app content is somewhere else
 * in the tree entirely, unreachable.
 *
 * So Panelside owns both halves. It renders inline, keeps the panel and the
 * app screen as siblings under one clipping container, and gives them a single
 * `progress` value to move against. `Panelside.Scene` is the wrapper you put
 * around your own screen; without it there is nothing to push, which is why it
 * is explicit rather than inferred.
 *
 * ## The scene maths
 *
 * React Native scales a view about its centre, so a scene scaled to `s` has
 * already pulled its left edge `W * (1 - s) / 2` inward before any translation
 * is applied. Translating by the panel width alone would therefore leave a gap
 * that grows with the scale, and the panel would look mis-measured. Subtracting
 * that inset is what puts the scene's *visible* edge exactly where the panel
 * ends:
 *
 *     scale      = 1 - (1 - s) * p
 *     translateX = p * (width + gap) - W * (1 - scale) / 2
 *
 * Both are driven from one shared value, so a half-finished drag is a real
 * halfway state rather than an interpolation between two snapshots.
 *
 * ## One gesture, both directions
 *
 * A single pan opens and closes. By default it listens across the whole
 * surface, because that is the behaviour this pattern is known for: a sideways
 * drag anywhere on the app brings the panel in, from wherever your thumb
 * already was. What keeps a list usable underneath it is the pair of
 * thresholds — the drag gives itself up on twelve points of vertical travel
 * and only claims the touch at fourteen horizontal, so anything even slightly
 * vertical resolves as a scroll.
 *
 * `swipeFrom="edge"` narrows the closed-state hit area to a strip at the
 * leading screen edge instead. That is for a scene with its own use for a
 * horizontal drag — a carousel, a wide table, a pannable chart — which would
 * otherwise fight the panel and lose.
 *
 * Reanimated's default `ReduceMotion.System` applies throughout: with the
 * accessibility setting on, every spring here resolves instantly to its target
 * rather than travelling.
 */
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type PressableProps,
  type ScrollViewProps,
  type TextInputProps,
  type ViewProps,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tv } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { LinearGradient } from 'expo-linear-gradient';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react-native';
import Menu01Icon from '@hugeicons/core-free-icons/Menu01Icon';
import MoreHorizontalIcon from '@hugeicons/core-free-icons/MoreHorizontalIcon';
import Search01Icon from '@hugeicons/core-free-icons/Search01Icon';
import { IconColorProvider, useIconColor } from '../../icons';
import { Button } from '../button';
import { Menu, type MenuContentProps } from '../menu';
import { AnimatedPressable } from '../../primitives/animated-pressable';
import { Text, textChildren, type TextProps } from '../../primitives/text';
import { useBackHandler } from '../../hooks/use-back-handler';
import { useDirectionSign } from '../../hooks/use-direction';
import { cn } from '../../utils/cn';
import { selectionTick } from '../../utils/haptics';

const SPRING = { damping: 24, stiffness: 300, mass: 0.7 } as const;

/**
 * How wide the leading-edge strip that starts a swipe is, in points.
 *
 * Wider than the system's own edge gestures, because this one has to be found
 * without a bezel to feel for: a thumb reaching for the side of a phone lands
 * anywhere in the first 40-odd points, and a strip narrower than that reads as
 * a gesture that does not work rather than one that was missed.
 */
const EDGE_WIDTH = 48;
/** A drag has to clear this before releasing it changes the open state. */
const COMMIT_DISTANCE = 60;
/** A flick this fast commits regardless of how far it got. */
const COMMIT_VELOCITY = 500;
/**
 * How much travel claims the drag, and how much gives it up — different on
 * each axis, and different again depending on where the swipe may start.
 *
 * From the edge strip the horizontal claim is small and the vertical give-up
 * generous: the target is narrow, so the gesture has to win early, and nobody
 * swipes in a straight line from the side of a phone.
 *
 * From anywhere the numbers invert, because now the whole screen is competing.
 * Giving up sooner than it claims is what makes a lazy diagonal resolve as a
 * scroll rather than as the panel: a list keeps every drag that is even
 * slightly vertical, and only a deliberate sideways one opens the panel.
 */
const OFFSETS = {
  edge: { activate: 6, fail: 16 },
  anywhere: { activate: 14, fail: 12 },
} as const;
/** Below this the drag is a tap that wobbled, and velocity is not consulted. */
const MIN_OFFSET = 5;

/** Gap left between the panel's edge and the pushed scene. */
const GAP = 12;
/**
 * How small the scene gets at full travel. One, by default: it does not shrink.
 *
 * Scaling is the obvious way to make the pushed screen read as a card, and it
 * is the wrong one. A scale is applied about the centre, so it insets the
 * scene at the top and the bottom as well as the side — the screen lifts away
 * from the status bar and the home indicator, and the two strips of panel that
 * appear above and below it are strips of nothing. What the apps this pattern
 * comes from do instead is keep the screen full height, running behind the
 * status bar exactly as it did before, and let the corner radius and the dim
 * carry the whole effect. Only the *content* respects the safe area, which it
 * was already doing.
 *
 * Set it below one for the shrinking version; nothing else has to change.
 */
const SCENE_SCALE = 1;
/** The corner radius the scene picks up at full travel. */
const SCENE_RADIUS = 44;
/** How far the scene is dimmed at full travel. */
const SCENE_DIM = 0.45;
/**
 * How strongly the line along the scene's edge reads at full travel.
 *
 * One, because the token it is drawn in already carries its own alpha — 6%
 * white in a dark theme, 8% black in a light one. Holding it back further would
 * be dimming a colour that is already almost entirely transparent.
 */
const EDGE_OPACITY = 1;
/**
 * How thick that line is.
 *
 * A point rather than `StyleSheet.hairlineWidth`. A hairline is one physical
 * pixel, which is right for a divider on a flat surface and too little on a
 * corner this round — most of the line is curve, and a third of a point of
 * curve antialiases away to nothing.
 */
const EDGE_WIDTH_PT = 1;

/**
 * How far behind the scene the panel starts.
 *
 * The panel is never actually off-screen in push mode — it is simply covered.
 * Moving it a little anyway is what stops the reveal reading as a photograph
 * sliding off a poster: the two layers travel at different rates, so the panel
 * settles into place rather than having been there all along.
 */
const PARALLAX = 0.18;

/**
 * Fraction of the container the panel takes, and the cap it never passes.
 *
 * Wide on purpose. The sliver of app left showing is not a preview of it — it
 * is a handle and a reminder, and the moment it is wide enough to read as a
 * column the screen turns into a two-pane layout that neither pane fits. The
 * cap keeps that true on a tablet, where the fraction alone would produce a
 * navigation list with a field of whitespace beside it.
 */
const WIDTH_FRACTION = 0.8;
const WIDTH_MAX = 360;

/**
 * The same, for a docked panel — and nothing like it, because the job changed.
 *
 * An overlay panel can take most of the width, since the app is behind it and
 * gets it all back on close. A docked panel keeps what it takes: every point
 * of it is a point the app does not have, and 80% of the container leaves a
 * column too narrow to put anything in. A third, capped, is a sidebar.
 */
const DOCK_WIDTH_FRACTION = 0.32;
const DOCK_WIDTH_MAX = 320;

/** How far above the floating footer the list starts dissolving into it. */
const FOOTER_FADE = 28;

/** Progress past which a layer is treated as fully hidden for accessibility. */
const HIDDEN_EPSILON = 0.05;

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(Math.max(value, min), max);
};

/**
 * The stroke weight the panel's glyphs are drawn at.
 *
 * A shade heavier than the icon set's own default. The panel sits over a
 * dimmed screen and its rows are quiet by design, so a hairline glyph goes
 * soft against them at the sizes used here.
 */
const GLYPH_STROKE = 1.8;

/**
 * What a glyph is drawn in when nothing has said. The same neutral the rest of
 * the chrome falls back to — visible against either theme, and never the thing
 * that decides how a panel looks, since every surface here provides a colour.
 */
const GLYPH_FALLBACK = '#737373';

/**
 * Floor for a row's action menu.
 *
 * Wide enough for a verb and its glyph with the label doing the growing. Left
 * to size itself, a menu takes its width from the one thing in each row that
 * is not flexible — the glyph — and comes up as a column of icons.
 */
const ACTIONS_MIN_WIDTH = 220;

/**
 * One of the panel's own glyphs.
 *
 * It exists to keep the colour contract the rest of the library has: an icon
 * takes an explicit colour, then the one an enclosing surface is providing,
 * and only then falls back. The drawing component underneath knows nothing
 * about that inheritance and needs the resolved value handed to it.
 */
function Glyph({
  icon,
  size = 20,
  color,
}: {
  icon: IconSvgElement;
  size?: number;
  color?: string;
}) {
  const inherited = useIconColor();

  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      color={color ?? inherited ?? GLYPH_FALLBACK}
      strokeWidth={GLYPH_STROKE}
    />
  );
}

export type PanelsideMode = 'push' | 'overlay';
export type PanelsideSwipeFrom = 'anywhere' | 'edge';
export type PanelsideItemSize = 'default' | 'sm';
export type PanelsideCtaSize = 'default' | 'lg' | 'xl';
/**
 * What a header or a footer paints behind itself.
 *
 * `transparent` paints nothing, and the list runs the full height of the panel
 * underneath it. `fade` dissolves the list into the panel background over the
 * strip above the controls. `solid` is a band with an edge on it, for a footer
 * that is a row of the layout rather than something floating over one.
 */
export type PanelsideSurface = 'transparent' | 'fade' | 'solid';
/** How the panel's small round controls are drawn: a fill, or a ring. */
export type PanelsideControlVariant = 'filled' | 'outline';

const itemVariants = tv({
  // No width: in a group it stretches on its own, and pinning it to full width
  // would stop it sharing a footer row with anything else. `shrink` because
  // React Native defaults `flexShrink` to 0 — in a footer beside a button, on a
  // panel narrow enough for the two not to fit, nothing would give way and
  // both would simply hang off the edge.
  base: 'shrink flex-row items-center rounded-xl',
  variants: {
    size: {
      default: 'gap-3 px-3 py-2.5',
      sm: 'gap-2.5 px-2.5 py-2',
    },
    active: { true: 'bg-secondary' },
    disabled: { true: 'opacity-40' },
  },
  defaultVariants: {
    size: 'default',
  },
});

const ctaVariants = tv({
  // Taller and wider than a list row's control. It is the one thing in the
  // panel you are meant to reach for without reading, so it should not be the
  // same size as the eight chat titles above it.
  //
  // It used to be 40pt, chosen to sit level with the account button beside it.
  // That is the wrong thing to size it against: the account button is a target
  // you find once, and the compose pill is the one pressed every session — at
  // matching heights the two read as a pair of equals and the pill stopped
  // being the thing the footer is for. Four points is enough to separate them
  // without making the footer taller than the panel needs.
  base: 'shrink flex-row items-center justify-center rounded-full',
  variants: {
    variant: {
      primary: 'bg-primary',
      secondary: 'bg-secondary',
    },
    size: {
      default: 'h-11 gap-2 px-6',
      lg: 'h-13 gap-2.5 px-7',
      xl: 'h-14 gap-3 px-8',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'default',
  },
});

interface PanelsideContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  /** 0 closed, 1 open. The one value every layer animates against. */
  progress: SharedValue<number>;
  /** Panel width in points. */
  width: number;
  mode: PanelsideMode;
  /** True when the panel is laid out beside the scene rather than behind it. */
  docked: boolean;
  dismissible: boolean;
  /** Scene defaults set on the root. A `Panelside.Scene` prop still wins. */
  scale?: number;
  radius?: number;
  dim?: number;
  /**
   * The page the scene is showing.
   *
   * On the root because the rows that navigate are in the panel and the pages
   * are in the scene, which are different subtrees. Anything else is one
   * `useState` every app threads through both.
   */
  route: string;
  navigate: (route: string) => void;
}

const PanelsideContext = createContext<PanelsideContextValue | null>(null);

function usePanelsideContext(component: string): PanelsideContextValue {
  const context = useContext(PanelsideContext);
  if (!context) {
    throw new Error(`${component} must be used within a <Panelside>`);
  }
  return context;
}

export interface UsePanelsideResult {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  /**
   * How far the panel has travelled, 0 to 1, on the UI thread. Read it to move
   * something of your own with the panel — a header that fades, a title that
   * slides — without a re-render per frame.
   */
  progress: SharedValue<number>;
  /** True while the panel is docked open beside the scene. */
  docked: boolean;
  /** The page the scene is showing — a `Panelside.Page`'s `value`. */
  route: string;
  /** Go to a page, closing the panel on the way. */
  navigate: (route: string) => void;
}

/**
 * The panel's state, from anywhere inside a `<Panelside>` — including your own
 * screen inside `Panelside.Scene`, which is where a custom open button usually
 * lives.
 */
export function usePanelside(): UsePanelsideResult {
  const { open, setOpen, toggle, progress, docked, route, navigate } =
    usePanelsideContext('usePanelside');

  // `navigate` closes the panel. The root cannot do it there without making
  // its own `setOpen` a dependency of the callback every row holds.
  const go = useCallback(
    (next: string) => {
      navigate(next);
      setOpen(false);
    },
    [navigate, setOpen]
  );

  return { open, setOpen, toggle, progress, docked, route, navigate: go };
}

/**
 * What the panel's own parts share: the floating footer's height, so the
 * scroller can leave room for it. The footer overlays the list rather than
 * taking a row of its own, which means nothing else can know how tall it is
 * until it has laid itself out.
 */
interface PanelsideSurfaceValue {
  footerHeight: number;
  setFooterHeight: (height: number) => void;
}

const PanelsideSurfaceContext = createContext<PanelsideSurfaceValue | null>(null);

export interface PanelsideProps {
  children: ReactNode;
  /** Open state, when you want to own it. Pair with `onOpenChange`. */
  open?: boolean;
  /** Called with the next open state, whether a gesture or you caused it. */
  onOpenChange?: (open: boolean) => void;
  /** Open state to start at when you are not controlling it. */
  defaultOpen?: boolean;
  /**
   * How the two layers relate. `push` moves the scene aside and curves it,
   * which is the point of this component. `overlay` slides the panel over a
   * scene that stays put — the same navigation, for a screen whose content
   * cannot afford to move.
   */
  mode?: PanelsideMode;
  /**
   * Panel width in points. Defaults to 80% of the container capped at 360,
   * and to a third of it capped at 320 once docked — an overlay panel gives
   * the width back when it closes and a docked one keeps it, so they are not
   * the same measurement. The caps are what stop a tablet getting a navigation
   * list with a field of whitespace beside it.
   */
  width?: number;
  /**
   * Container width at or above which the panel stops being an overlay and
   * becomes a permanent sidebar: laid out beside the scene, always open, with
   * the gesture and the trigger switched off. A docked panel also narrows to a
   * third of the container, capped at 320 — docked, every point it takes is a
   * point the app does not get back.
   *
   * Off by default, and deliberately not a guess — a large phone in landscape
   * is wider than a small tablet in portrait, so no single number is right for
   * every app. Set it high enough that what is left over is still a screen:
   * around 700 is the first width where both halves have room.
   */
  dock?: number | false;
  /** Swipe to open, and drag the scene to close. Default true. */
  swipeEnabled?: boolean;
  /**
   * Where a swipe may begin. `anywhere` is the default and the behaviour this
   * pattern is known for — a sideways drag across the app opens the panel from
   * wherever your thumb already was.
   *
   * `edge` narrows it to a strip at the leading screen edge, for a scene that
   * has its own use for a horizontal drag: a carousel, a wide table, a chart
   * you can pan. Anything like that under an `anywhere` panel will fight it,
   * and the panel usually wins.
   */
  swipeFrom?: PanelsideSwipeFrom;
  /**
   * How wide the leading-edge strip that starts a swipe is, when `swipeFrom`
   * is `edge`. Default 48 — wider than the system's own edge gestures, because
   * there is no bezel to feel for. Ignored otherwise.
   */
  edgeWidth?: number;
  /**
   * Tapping the pushed scene, or the Android back button, closes the panel.
   * Default true.
   */
  dismissible?: boolean;
  /**
   * A tick under the finger when a swipe commits to opening or closing. Off by
   * default — needs the optional `expo-haptics`, and is silent without it.
   *
   * It fires on the commit rather than during the drag: the panel following
   * your thumb is already the feedback for the drag, and a tick per frame is
   * what makes a gesture feel broken rather than responsive.
   */
  haptics?: boolean;
  /**
   * How far the scene shrinks at full open, as a scale factor. Sets the
   * default for every `Panelside.Scene` underneath; the scene's own prop still
   * wins. Here so the three numbers that describe the curve can be set once
   * where the panel is configured, rather than on a part further down.
   */
  scale?: number;
  /** The corner radius the scene reaches at full open, in points. */
  radius?: number;
  /** How far the scene is dimmed at full open, 0 to 1. */
  dim?: number;
  /**
   * Which page the scene is showing. Controlled; pair it with `onRouteChange`.
   *
   * A route is any string you choose. It is matched against
   * `Panelside.Page`'s `value` and against `Panelside.Item`'s `to`, so a row
   * marks itself as the current destination and the scene swaps to the page
   * without either being wired to the other.
   */
  route?: string;
  /** Which page the scene starts on, when the panel is not controlling `route`. */
  defaultRoute?: string;
  /** Called with the route a row navigated to. */
  onRouteChange?: (route: string) => void;
  className?: string;
}

function PanelsideRoot({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  mode = 'push',
  width: widthProp,
  dock = false,
  swipeEnabled = true,
  swipeFrom = 'anywhere',
  edgeWidth = EDGE_WIDTH,
  dismissible = true,
  haptics = false,
  scale,
  radius,
  dim,
  route: controlledRoute,
  defaultRoute = '',
  onRouteChange,
  className,
}: PanelsideProps) {
  const { width: windowWidth } = useWindowDimensions();
  const sign = useDirectionSign();

  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const controlled = controlledOpen !== undefined;
  const open = controlled ? controlledOpen : uncontrolledOpen;
  const [uncontrolledRoute, setUncontrolledRoute] = useState(defaultRoute);
  const route = controlledRoute ?? uncontrolledRoute;

  /*
   * Navigating closes the panel, and does so here rather than at each call
   * site. The thing you just moved to would otherwise be behind the thing you
   * moved from, which is the one arrangement no app wants — and a row that has
   * to be told to close is a row every app writes the same three lines for.
   */
  const navigate = useCallback(
    (next: string) => {
      if (controlledRoute === undefined) setUncontrolledRoute(next);
      onRouteChange?.(next);
    },
    [controlledRoute, onRouteChange]
  );

  /*
   * Measured rather than taken from the window, because Panelside does not
   * have to be the whole screen — it can be one tab of a larger layout, and
   * the push distance is a fraction of whatever it actually got. The window
   * width is only the value to use until the first layout arrives.
   */
  const [containerWidth, setContainerWidth] = useState(windowWidth);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  const docked = dock !== false && containerWidth >= dock;
  const width =
    widthProp ??
    (docked
      ? Math.min(containerWidth * DOCK_WIDTH_FRACTION, DOCK_WIDTH_MAX)
      : Math.min(containerWidth * WIDTH_FRACTION, WIDTH_MAX));

  /**
   * How far the drag runs. In push mode the scene clears the gap too.
   *
   * Floored at 1 because it is a divisor: a container measured at zero — one
   * frame during a collapsed layout is enough — would otherwise make progress
   * infinite and park both layers somewhere off the screen for good.
   */
  const extent = Math.max(1, mode === 'push' ? width + GAP : width);

  const translation = useSharedValue(open ? extent : 0);
  const progress = useDerivedValue(() => translation.value / extent, [extent]);

  /*
   * Which end state a spring is already heading for, so the effect below does
   * not restart an animation the gesture just launched with velocity. Without
   * it, committing a flick re-springs from mid-flight at zero velocity, which
   * is visible as a stutter right where the motion should feel fastest.
   */
  const animatingTo = useSharedValue<'open' | 'close' | null>(null);

  const settle = useCallback(
    (next: boolean, velocity?: number) => {
      'worklet';
      const target = next ? extent : 0;
      if (translation.value === target) return;
      if (animatingTo.value === (next ? 'open' : 'close')) return;

      /*
       * A velocity pointing away from the target would fight the spring, and
       * the spring wins — so the only thing it contributes is a hitch at the
       * start. Drop it and let the spring do the whole trip.
       */
      const aligned =
        velocity !== undefined &&
        ((target > translation.value && velocity > 0) ||
          (target < translation.value && velocity < 0));

      animatingTo.value = next ? 'open' : 'close';
      translation.value = withSpring(
        target,
        { ...SPRING, velocity: aligned ? velocity : 0 },
        () => {
          animatingTo.value = null;
        }
      );
    },
    [animatingTo, extent, translation]
  );

  const setOpen = useCallback(
    (next: boolean) => {
      if (!controlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange]
  );

  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);
  const close = useCallback(() => setOpen(false), [setOpen]);

  /*
   * Wrapped so the gesture's worklet has one stable function to hand to
   * `runOnJS` — a fresh closure each render would be re-serialised on every
   * frame the pan is rebuilt.
   */
  const tick = useCallback(() => {
    if (haptics) selectionTick();
  }, [haptics]);

  useBackHandler(open && dismissible && !docked, close);

  /*
   * A docked panel is open by definition, and it must not animate there — on
   * a rotation into a docked layout the panel is already beside the scene, so
   * a spring would slide furniture that never moved.
   */
  useEffect(() => {
    if (docked) {
      translation.value = extent;
      return;
    }
    settle(open);
  }, [docked, extent, open, settle, translation]);

  const offsets = OFFSETS[swipeFrom];

  const pan = useMemo(() => {
    let gesture = Gesture.Pan()
      .enabled(swipeEnabled && !docked)
      .activeOffsetX([-offsets.activate, offsets.activate])
      // Real vertical intent hands the touch back, so a list inside the panel
      // and a scroller inside the app both keep their own drags.
      .failOffsetY([-offsets.fail, offsets.fail])
      .onChange((event) => {
        translation.value = clamp(translation.value + event.changeX * sign, 0, extent);
      })
      .onEnd((event) => {
        const distance = event.translationX * sign;
        const velocity = event.velocityX * sign;
        const decisive =
          (Math.abs(distance) > MIN_OFFSET && Math.abs(velocity) > COMMIT_VELOCITY) ||
          Math.abs(distance) > COMMIT_DISTANCE;
        // Below the threshold the drag was not an instruction: go back to
        // wherever the panel already was.
        const next = decisive ? (velocity === 0 ? distance : velocity) > 0 : open;

        // `velocity` is already in travel space; the spring runs on the same
        // axis, so it must not be converted back to screen space here.
        settle(next, velocity);
        // Only where the drag changed something. A swipe that fell short and
        // sprang back did not open or close anything, and a tick that says it
        // did is worse than no tick at all.
        if (next !== open) runOnJS(tick)();
        runOnJS(setOpen)(next);
      });

    /*
     * The strip is only ever a closed-state restriction. Open, it is dropped
     * whatever `swipeFrom` says: the panel is already out, so there is no app
     * underneath left to compete for the same horizontal swipe.
     */
    if (!open && swipeFrom === 'edge') {
      gesture = gesture.hitSlop(
        sign === 1 ? { left: 0, width: edgeWidth } : { right: 0, width: edgeWidth }
      );
    }

    return gesture;
  }, [
    docked,
    edgeWidth,
    extent,
    offsets,
    open,
    setOpen,
    settle,
    sign,
    swipeEnabled,
    swipeFrom,
    tick,
    translation,
  ]);

  const context = useMemo<PanelsideContextValue>(
    () => ({
      open,
      setOpen,
      toggle,
      progress,
      width,
      mode,
      docked,
      dismissible,
      scale,
      radius,
      dim,
      route,
      navigate,
    }),
    [
      dim,
      dismissible,
      docked,
      mode,
      navigate,
      open,
      progress,
      radius,
      route,
      scale,
      setOpen,
      toggle,
      width,
    ]
  );

  return (
    <PanelsideContext.Provider value={context}>
      <View
        onLayout={onLayout}
        // Clipping is what lets the panel sit at the edge with a parallax
        // offset without a sliver of it hanging outside the container.
        className={cn('flex-1 overflow-hidden', docked && 'flex-row', className)}
      >
        <GestureDetector gesture={pan}>
          <Animated.View className={cn('flex-1', docked && 'flex-row')}>
            {children}
          </Animated.View>
        </GestureDetector>
      </View>
    </PanelsideContext.Provider>
  );
}

export interface PanelsidePanelProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

function PanelsidePanel({ className, children, style, ...props }: PanelsidePanelProps) {
  const { progress, width, mode, docked } = usePanelsideContext('Panelside.Panel');
  const [footerHeight, setFooterHeight] = useState(0);

  const animatedStyle = useAnimatedStyle(() => {
    const p = docked ? 1 : progress.value;
    const distance = mode === 'overlay' ? width : width * PARALLAX;
    return { transform: [{ translateX: -(1 - p) * distance }] };
  }, [docked, mode, width]);

  /*
   * Out of the accessibility tree until it is nearly all the way in. A panel
   * at rest is behind the app, fully covered and not a thing you can reach —
   * but nothing about being covered says that to a screen reader, which will
   * happily read out a navigation list nobody can see.
   */
  const animatedProps = useAnimatedProps<ViewProps>(() => {
    const hidden = !docked && progress.value < 1 - HIDDEN_EPSILON;
    return Platform.OS === 'android'
      ? { importantForAccessibility: hidden ? 'no-hide-descendants' : 'auto' }
      : { accessibilityElementsHidden: hidden };
  }, [docked]);

  const surface = useMemo<PanelsideSurfaceValue>(
    () => ({ footerHeight, setFooterHeight }),
    [footerHeight]
  );

  return (
    <PanelsideSurfaceContext.Provider value={surface}>
      <Animated.View
        animatedProps={animatedProps}
        className={cn(
          'bg-background',
          docked ? 'h-full border-e border-border' : 'absolute bottom-0 start-0 top-0',
          // In overlay mode the panel comes in *over* the app, but it is the
          // first child and the scene is the second — so without this it slides
          // in behind the very thing it is supposed to cover, and all you see
          // is the scrim.
          !docked && mode === 'overlay' && 'z-10 shadow-lg',
          className
        )}
        // Animated style before the caller's, so a className or style cannot
        // silently drop the transform the panel is being moved by.
        style={[{ width }, animatedStyle, style]}
        {...props}
      >
        {children}
      </Animated.View>
    </PanelsideSurfaceContext.Provider>
  );
}

export interface PanelsideHeaderProps extends ViewProps {
  className?: string;
  /** Rendered as the heading. Omit it and supply your own in `children`. */
  title?: string;
  /** A single element pinned to the trailing end of the title row. */
  action?: ReactNode;
  /**
   * What the header paints behind itself.
   *
   * `transparent` is the default and paints nothing, so the header is the
   * panel's own surface with a title on it rather than a bar sitting on top of
   * one. In the panel's normal stacking that is the whole story — the header
   * takes a row and the list starts below it.
   *
   * `fade` and `solid` are for a header the caller has lifted out of that
   * stack — `className="absolute start-0 end-0 top-0"` — so the list runs
   * underneath it. They are the two shapes `Panelside.Footer` offers, drawn
   * the other way up.
   */
  surface?: PanelsideSurface;
  /** Anything below the title row — a search field, a workspace switcher. */
  children?: ReactNode;
}

function PanelsideHeader({
  className,
  title,
  action,
  surface = 'transparent',
  children,
  style,
  ...props
}: PanelsideHeaderProps) {
  const insets = useSafeAreaInsets();
  const background = useCSSVariable('--color-background');
  const solid = typeof background === 'string' ? background : '#000000';

  return (
    <View
      // The panel draws behind the status bar on purpose, so it reads as a
      // full-height surface rather than a card. That makes the inset the
      // header's to clear, and it stacks with its own padding rather than
      // being maxed against it.
      style={[{ paddingTop: insets.top + 12 }, style]}
      // `px-3` matches the scroller below it, so the search field and the rows
      // share one edge. A header inset further would leave the field floating
      // a few points inside the list it filters.
      className={cn(
        'gap-3 px-3 pb-3',
        surface === 'solid' && 'border-b border-border bg-background',
        className
      )}
      {...props}
    >
      {/* The footer's fade, upside down: opaque under the title and clearing to
          nothing at the bottom edge, so a row scrolled up into the header
          dissolves rather than sliding out from under a line. */}
      {surface === 'fade' ? (
        <>
          <View
            pointerEvents="none"
            className="absolute end-0 start-0 top-0 bg-background"
            style={{ bottom: FOOTER_FADE }}
          />
          <LinearGradient
            colors={[solid, `${solid}00`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            pointerEvents="none"
            style={[styles.rise, { height: FOOTER_FADE }]}
          />
        </>
      ) : null}
      {(title || action) && (
        <View className="h-9 flex-row items-center justify-between gap-2">
          {title ? (
            <Text size="xl" weight="semibold" numberOfLines={1} className="flex-1">
              {title}
            </Text>
          ) : (
            <View className="flex-1" />
          )}
          {action}
        </View>
      )}
      {textChildren(children)}
    </View>
  );
}

export interface PanelsideSearchProps extends TextInputProps {
  className?: string;
  containerClassName?: string;
}

/**
 * A compact filter field for the panel.
 *
 * Deliberately not the library's `Input`: that field carries a label, a
 * description, an error slot and keyboard avoidance, none of which a panel
 * search row wants, and all of which would have to be switched off at every
 * call site.
 */
function PanelsideSearch({
  className,
  containerClassName,
  placeholder = 'Search',
  ...props
}: PanelsideSearchProps) {
  const placeholderTint = useCSSVariable('--color-muted-foreground');
  const textTint = useCSSVariable('--color-foreground');
  const muted = typeof placeholderTint === 'string' ? placeholderTint : undefined;

  return (
    <View
      className={cn(
        'h-10 flex-row items-center gap-2 rounded-xl bg-secondary px-3',
        containerClassName
      )}
    >
      <Glyph icon={Search01Icon} size={16} color={muted} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={muted}
        /*
         * `text-[16px]`, not `text-base`. A `text-*` step sets a size and a
         * line height together — 16px glyphs in a 24px line box — and in a
         * field of fixed height the extra leading lands above them, so the
         * text and the placeholder sit below the middle of the row. A length
         * sets the size alone and leaves the line box the font's own.
         */
        className={cn('h-full flex-1 font-normal text-[16px] text-foreground', className)}
        style={typeof textTint === 'string' ? { color: textTint } : undefined}
        accessibilityRole="search"
        returnKeyType="search"
        clearButtonMode="while-editing"
        {...props}
      />
    </View>
  );
}

export interface PanelsideContentProps extends ScrollViewProps {
  className?: string;
  contentContainerClassName?: string;
  children?: ReactNode;
}

function PanelsideContent({
  className,
  contentContainerClassName,
  contentContainerStyle,
  children,
  ...props
}: PanelsideContentProps) {
  const surface = useContext(PanelsideSurfaceContext);

  return (
    <ScrollView
      className={cn('flex-1', className)}
      contentContainerClassName={cn('gap-1 px-3 pb-3', contentContainerClassName)}
      // Room for the footer, which floats over this list rather than taking a
      // row below it — so the last item can be scrolled clear of the pill
      // instead of living permanently underneath it.
      contentContainerStyle={[{ paddingBottom: (surface?.footerHeight ?? 0) + 12 }, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...props}
    >
      {textChildren(children)}
    </ScrollView>
  );
}

export interface PanelsideGroupProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

function PanelsideGroup({ className, children, ...props }: PanelsideGroupProps) {
  return (
    <View className={cn('gap-0.5 pb-2', className)} {...props}>
      {textChildren(children)}
    </View>
  );
}

export interface PanelsideGroupLabelProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

function PanelsideGroupLabel({ className, children, ...props }: PanelsideGroupLabelProps) {
  return (
    <View
      className={cn('px-3 pb-1 pt-3', className)}
      accessibilityRole="header"
      {...props}
    >
      {textChildren(children, (text) => (
        <Text size="xs" weight="medium" muted>
          {text}
        </Text>
      ))}
    </View>
  );
}

/**
 * What a row's parts read off the row, rather than being handed it.
 *
 * A label goes medium and un-muted when the row is the current destination,
 * and an icon takes the matching tint. Passing that to every part would mean
 * `<Panelside.ItemLabel active={active}>` at every call site, with an `active`
 * that has to be kept in step with the row's own.
 */
interface PanelsideItemContextValue {
  active: boolean;
  disabled: boolean;
  size: PanelsideItemSize;
  /** The colour an icon in this row should take, resolved once by the row. */
  tint: string | undefined;
}

const PanelsideItemContext = createContext<PanelsideItemContextValue | null>(null);

function usePanelsideItem(part: string): PanelsideItemContextValue {
  const value = useContext(PanelsideItemContext);
  if (!value) throw new Error(`${part} must be used inside a <Panelside.Item>.`);
  return value;
}

export interface PanelsideItemProps extends Omit<PressableProps, 'children'> {
  className?: string;
  /**
   * Leading element — an icon, an avatar, a coloured dot. The shorthand for
   * `Panelside.ItemIcon`.
   */
  icon?: ReactNode;
  /**
   * The row's text, truncated to one line since chat titles run long. The
   * shorthand for `Panelside.ItemLabel`.
   */
  label?: string;
  /**
   * The page this row goes to — a `Panelside.Page`'s `value`.
   *
   * Pressing it sets the panel's route, and the row marks itself active while
   * that route is the current one. It also closes the panel, since the thing
   * you just moved to would otherwise be behind the thing you moved from.
   *
   * `active` and `onPress` still win where they are passed, so a row can
   * navigate and do something else as well.
   */
  to?: string;
  /** Leave the panel open after navigating. Off by default. */
  closeOnNavigate?: boolean;
  /** Marks the row as the current destination. Derived from `to` when given. */
  active?: boolean;
  /**
   * Trailing count or status. A number or string renders as a pill; anything
   * else renders as given. The shorthand for `Panelside.ItemBadge`.
   */
  badge?: ReactNode;
  disabled?: boolean;
  /**
   * Row density. `sm` tightens the padding for a panel that has to show more
   * history at once, without touching the type size — a list you can read is
   * worth more than two extra rows.
   */
  size?: PanelsideItemSize;
  /**
   * The row's contents, written out: `Panelside.ItemIcon`,
   * `Panelside.ItemLabel`, `Panelside.ItemBadge` and `Panelside.Action`, in
   * whatever order the row wants them. Anything else you draw works too.
   *
   * Children and the shorthand props compose — a row can take its label from
   * `label` and still write a trailing `Panelside.Action` as a child.
   */
  children?: ReactNode;
}

/**
 * One destination, or one conversation.
 *
 * There are two ways to fill it, and they are the same row. The shorthand —
 * `icon`, `label`, `badge` — covers the row every navigation panel has, and is
 * what most call sites should use. The parts cover everything else: two lines
 * of text, a label that is not a string, a badge before the label rather than
 * after it, a trailing control that is not an overflow menu.
 *
 * ```tsx
 * <Panelside.Item icon={<InboxIcon />} label="Inbox" badge={12} />
 *
 * <Panelside.Item active>
 *   <Panelside.ItemIcon><Avatar size="xs" src={author.avatar} /></Panelside.ItemIcon>
 *   <Panelside.ItemLabel>{thread.title}</Panelside.ItemLabel>
 *   <Panelside.ItemBadge>{thread.unread}</Panelside.ItemBadge>
 *   <Panelside.Action onPress={rename} />
 * </Panelside.Item>
 * ```
 */
function PanelsideItem({
  className,
  icon,
  label,
  to,
  closeOnNavigate = true,
  active: activeProp,
  badge,
  disabled = false,
  size = 'default',
  onPress,
  children,
  ...props
}: PanelsideItemProps) {
  const panel = useContext(PanelsideContext);
  const restTint = useCSSVariable('--color-muted-foreground');
  const activeTint = useCSSVariable('--color-foreground');

  // A row outside a `<Panelside>` still works — the parts are usable on their
  // own — it simply has no route to match against.
  const active = activeProp ?? (to !== undefined && panel?.route === to);

  const press = useCallback(
    (event: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
      onPress?.(event);
      if (to === undefined || !panel) return;
      panel.navigate(to);
      if (closeOnNavigate) panel.setOpen(false);
    },
    [closeOnNavigate, onPress, panel, to]
  );

  const tint = active
    ? typeof activeTint === 'string'
      ? activeTint
      : undefined
    : typeof restTint === 'string'
      ? restTint
      : undefined;

  const context = useMemo<PanelsideItemContextValue>(
    () => ({ active, disabled, size, tint }),
    [active, disabled, size, tint]
  );

  /*
   * The row needs something flexible in the middle or its trailing content
   * floats next to the icon instead of sitting at the end. A label supplies
   * that, and a written-out `Panelside.ItemLabel` supplies it too — so the
   * spacer is only for the row that has neither, which is a row of nothing but
   * an icon and a badge.
   *
   * And only where there is something to push. A row of nothing but an icon
   * has no trailing content, and a spacer in it is not inert: laid out against
   * the width available rather than against the row's own contents, it expands,
   * takes the space with it, and squeezes whatever shares the line — which is
   * how an icon-only row in a footer beside a compose button cropped that
   * button's label and left its own icon short of the trailing edge.
   */
  const filled = label !== undefined || children !== undefined;
  const trailing = badge !== undefined && badge !== null;

  return (
    <PanelsideItemContext.Provider value={context}>
      <AnimatedPressable
        className={itemVariants({ active, disabled, size, className })}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ selected: active, disabled }}
        accessibilityLabel={label}
        pressScale={0.985}
        onPress={to !== undefined || onPress ? press : undefined}
        {...props}
      >
        {icon ? <PanelsideItemIcon>{icon}</PanelsideItemIcon> : null}

        {label !== undefined ? <PanelsideItemLabel>{label}</PanelsideItemLabel> : null}

        {filled || !trailing ? null : <View className="flex-1" />}

        {badge !== undefined && badge !== null ? (
          <PanelsideItemBadge>{badge}</PanelsideItemBadge>
        ) : null}

        {children}
      </AnimatedPressable>
    </PanelsideItemContext.Provider>
  );
}

export interface PanelsideItemIconProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * The leading slot on a row.
 *
 * Whatever is inside it inherits the row's own tint rather than each call site
 * passing a colour that stops being right the moment the row goes active.
 */
function PanelsideItemIcon({ className, children, ...props }: PanelsideItemIconProps) {
  const { tint } = usePanelsideItem('Panelside.ItemIcon');

  // No wrapper unless one was asked for: an icon is already the right size,
  // and a `View` around it is a layout node between the row and its glyph.
  if (className === undefined && Object.keys(props).length === 0) {
    return <IconColorProvider color={tint}>{children}</IconColorProvider>;
  }

  return (
    <View className={className} {...props}>
      <IconColorProvider color={tint}>{children}</IconColorProvider>
    </View>
  );
}

export interface PanelsideItemLabelProps extends TextProps {
  className?: string;
  children?: ReactNode;
}

/**
 * The row's text. It takes the flexible middle, so a long title truncates
 * rather than pushing the badge and the action off the end of the panel.
 */
function PanelsideItemLabel({ className, children, ...props }: PanelsideItemLabelProps) {
  const { active } = usePanelsideItem('Panelside.ItemLabel');

  return (
    <Text
      size="base"
      weight={active ? 'medium' : 'normal'}
      muted={!active}
      numberOfLines={1}
      className={cn('flex-1', className)}
      {...props}
    >
      {children}
    </Text>
  );
}

export interface PanelsideItemBadgeProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * The trailing count or status on a row. Text becomes a pill; anything else is
 * drawn as given, so a dot or a chip needs no opting out of the pill.
 */
function PanelsideItemBadge({ className, children, ...props }: PanelsideItemBadgeProps) {
  usePanelsideItem('Panelside.ItemBadge');

  if (typeof children !== 'string' && typeof children !== 'number') {
    return <>{children}</>;
  }

  return (
    <View className={cn('rounded-full bg-secondary px-2 py-0.5', className)} {...props}>
      <Text size="xs" muted>
        {children}
      </Text>
    </View>
  );
}

export interface PanelsideActionProps extends Omit<PressableProps, 'children'> {
  className?: string;
  /**
   * What a screen reader announces. The default control is an unlabelled glyph,
   * so this is the only description it has.
   */
  label?: string;
  /** Replaces the default overflow glyph. */
  children?: ReactNode;
}

function PanelsideAction({
  className,
  label = 'More options',
  children,
  onPress,
  ...props
}: PanelsideActionProps) {
  const tint = useCSSVariable('--color-muted-foreground');
  const color = typeof tint === 'string' ? tint : undefined;

  return (
    <AnimatedPressable
      className={cn('h-7 w-7 items-center justify-center rounded-lg', className)}
      accessibilityRole="button"
      accessibilityLabel={label}
      // The glyph is small and sits next to a row-sized target, so it takes
      // the difference back as slop rather than as layout.
      hitSlop={8}
      // The row underneath is pressable and usually navigates. A press that
      // reached both would open the menu and leave the thing it is about.
      onPress={(event) => {
        event.stopPropagation();
        onPress?.(event);
      }}
      {...props}
    >
      {children ?? <Glyph icon={MoreHorizontalIcon} size={18} color={color} />}
    </AnimatedPressable>
  );
}

export interface PanelsideItemActionsProps {
  className?: string;
  /**
   * What a screen reader announces for the button. The control is an
   * unlabelled glyph, so this is the only description it has.
   */
  label?: string;
  /** Replaces the default overflow glyph. */
  icon?: ReactNode;
  /** Where the panel opens relative to the button. Defaults to below it. */
  placement?: MenuContentProps['placement'];
  /** How it lines up on that edge. Defaults to the button's trailing edge. */
  align?: MenuContentProps['align'];
  /**
   * Floor for the menu's width. A panel sized to its contents takes its width
   * from whatever inside it is not flexible — in a row of a flexible label and
   * a fixed glyph, that is the glyph, and the menu comes up as a column of
   * icons with the words squeezed out of it.
   */
  minWidth?: number;
  /** Passed through to the panel — `width`, `maxHeight`, `offset` and the rest. */
  contentProps?: Omit<MenuContentProps, 'children' | 'placement' | 'align' | 'minWidth'>;
  /** The rows: `Menu.Item`, `Menu.Separator`, `Menu.Label`. */
  children?: ReactNode;
}

/**
 * A row's actions, behind an overflow button at the end of it.
 *
 * ```tsx
 * <Panelside.Item label={chat.title} to={chat.id}>
 *   <Panelside.ItemActions>
 *     <Menu.Item onSelect={rename}>Rename</Menu.Item>
 *     <Menu.Separator />
 *     <Menu.Item variant="destructive" onSelect={remove}>Delete</Menu.Item>
 *   </Panelside.ItemActions>
 * </Panelside.Item>
 * ```
 *
 * The panel is anchored to the button rather than presented from the bottom of
 * the screen, so it lines up with the row it belongs to and the list it came
 * from stays readable behind it. It is also narrow: the panel it opens in is a
 * fraction of the screen, and a sheet covering that to offer four verbs costs
 * more than it says.
 *
 * Pressing the button does not press the row. A row that navigates would
 * otherwise navigate away from the thing the menu is about.
 */
function PanelsideItemActions({
  className,
  label = 'More options',
  icon,
  placement = 'bottom',
  align = 'end',
  minWidth = ACTIONS_MIN_WIDTH,
  contentProps,
  children,
}: PanelsideItemActionsProps) {
  return (
    <Menu>
      <Menu.Trigger>
        <PanelsideAction className={className} label={label}>
          {icon}
        </PanelsideAction>
      </Menu.Trigger>
      <Menu.Content
        placement={placement}
        align={align}
        width="content-fit"
        minWidth={minWidth}
        {...contentProps}
      >
        {children}
      </Menu.Content>
    </Menu>
  );
}

export interface PanelsideFooterProps extends ViewProps {
  className?: string;
  /**
   * Overlay the scrolling list instead of taking a row below it. Default true —
   * the list runs the full height of the panel behind it, and `Panelside.Content`
   * leaves exactly this footer's height of room at the end.
   */
  floating?: boolean;
  /**
   * What the footer paints behind its controls.
   *
   * `transparent` is the default and paints nothing: the list runs under the
   * controls, which is how the panel reads as one surface with two things
   * floating on it rather than as a list with a bar bolted to the bottom.
   *
   * `fade` dissolves the list into the panel background over the strip above
   * the controls. It costs a band of the panel, and buys a compose button that
   * never has a chat title running through its label — worth turning on for a
   * panel whose history is long enough that something is always underneath.
   *
   * `solid` is a band with a hairline over it, for a footer that is a row of
   * the layout. Implied by `floating={false}`, which has no list to float over.
   */
  surface?: PanelsideSurface;
  children?: ReactNode;
}

function PanelsideFooter({
  className,
  floating = true,
  surface = 'transparent',
  children,
  style,
  ...props
}: PanelsideFooterProps) {
  const insets = useSafeAreaInsets();
  const panel = useContext(PanelsideSurfaceContext);
  const setFooterHeight = panel?.setFooterHeight;
  const background = useCSSVariable('--color-background');
  const solid = typeof background === 'string' ? background : '#000000';

  // A footer in the flow has nothing to float over, so the only thing it can
  // be is the band — whatever was asked for.
  const paint = floating ? surface : 'solid';

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setFooterHeight?.(event.nativeEvent.layout.height);
    },
    [setFooterHeight]
  );

  return (
    <View
      onLayout={floating ? onLayout : undefined}
      style={[
        { paddingBottom: Math.max(insets.bottom, 12) },
        floating ? { paddingTop: paint === 'fade' ? FOOTER_FADE : 12 } : null,
        style,
      ]}
      className={cn(
        // `gap-3` and a wider inset: the compose control is the one thing in
        // the panel that is not a list row, and a native one brings its own
        // metrics — it needs room around it rather than the row spacing the
        // list uses.
        'flex-row items-center gap-3 px-4',
        floating ? 'absolute bottom-0 end-0 start-0' : 'border-t border-border bg-background pt-2',
        className
      )}
      {...props}
    >
      {/*
        The fade is two layers rather than one gradient across the whole box.
        A gradient sized to the box puts its midpoint wherever the box happens
        to be tall, which is exactly where the labels are — so the top
        `FOOTER_FADE` points are the gradient and everything below it, the band
        the controls actually sit in, is plain background.

        Both are inside the footer's own bounds, so neither depends on a parent
        that does not clip its children.
      */}
      {paint === 'fade' ? (
        <>
          <LinearGradient
            colors={[`${solid}00`, solid]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            pointerEvents="none"
            style={[styles.fade, { height: FOOTER_FADE }]}
          />
          <View
            pointerEvents="none"
            className="absolute bottom-0 end-0 start-0 bg-background"
            style={{ top: FOOTER_FADE }}
          />
        </>
      ) : null}
      {paint === 'solid' && floating ? (
        <View
          pointerEvents="none"
          className="absolute bottom-0 end-0 start-0 top-0 border-t border-border bg-background"
        />
      ) : null}
      {textChildren(children)}
    </View>
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', top: 0, left: 0, right: 0 },
  rise: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  hidden: { display: 'none' },
});

export interface PanelsideCtaProps extends Omit<PressableProps, 'children'> {
  className?: string;
  /** The button's text. */
  label?: string;
  /** Leading element, usually an icon. */
  icon?: ReactNode;
  /** `primary` is the filled accent pill; `secondary` is the quiet one. */
  variant?: 'primary' | 'secondary';
  /**
   * How tall the pill is. `default` is 44pt — a step above the account button
   * beside it, so the footer reads as one primary control and one secondary
   * one. `lg` is 52pt, for a panel where the call to action is the only thing
   * in the row, and `xl` is 56pt.
   *
   * Ignored under `native` — the platform sizes its own button, and asks for a
   * control size rather than a height. The three steps reach the platform's
   * regular, large and extra-large controls.
   */
  size?: PanelsideCtaSize;
  /**
   * Render the platform's own button instead of the pill. Requires the
   * optional `@expo/ui` package; without it this prop does nothing.
   *
   * **Theme tokens do not apply** — the platform draws the button, so
   * `className` and `icon` are ignored and it sizes itself to `label`.
   */
  native?: boolean;
  /**
   * Draw the native button in the platform's Liquid Glass material. Requires
   * `native`, and iOS 26 or later; ignored anywhere else.
   */
  glass?: boolean;
  children?: ReactNode;
}

function PanelsideCta({
  className,
  label,
  icon,
  variant = 'primary',
  size = 'default',
  native = false,
  glass = false,
  disabled,
  children,
  ...props
}: PanelsideCtaProps) {
  const primaryTint = useCSSVariable('--color-primary-foreground');
  const secondaryTint = useCSSVariable('--color-secondary-foreground');
  const raw = variant === 'primary' ? primaryTint : secondaryTint;
  const tint = typeof raw === 'string' ? raw : undefined;

  /*
   * Delegated to Button rather than reaching for the native bridge here.
   * Button already resolves the package lazily, maps the variant onto the
   * platform's own style and falls back when it is missing — reimplementing
   * that would be a second copy to keep in step with the first.
   */
  if (native) {
    return (
      <Button
        native
        glass={glass}
        // The platform sizes a native button from its label, so a height means
        // nothing here — the step is asked for as a control size instead.
        size={size === 'default' ? 'md' : size}
        variant={variant}
        accessibilityLabel={label}
        // Pressable allows `null` for disabled; Button does not.
        disabled={disabled ?? undefined}
        {...props}
      >
        {/*
          A plain string, not a hosted view.

          An icon button pads its glyph in React, because the glyph *is* a
          React Native view and the platform draws the background around it.
          That works because an icon button is a square this component sizes,
          so the hosted view has a fixed reference to measure against. A label
          has neither half of that: a string is the platform's own text with no
          React view in it to pad, and hosting one to get a view leaves a width
          nothing knows in advance.

          So this one is sized rather than padded — the size reaches the
          platform as a control size, which scales the room the style leaves
          around the label and the label with it.
        */}
        {label ?? children}
      </Button>
    );
  }

  return (
    <AnimatedPressable
      className={ctaVariants({ variant, size, className })}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      {...props}
    >
      <IconColorProvider color={tint}>
        {icon}
        {label ? (
          <Text
            size={size === 'lg' ? 'lg' : 'base'}
            weight="medium"
            // The pill gives way before the panel does, so the label has to be
            // able to end somewhere rather than pushing the button off the edge.
            numberOfLines={1}
            className={cn(
              'shrink',
              variant === 'primary' ? 'text-primary-foreground' : 'text-secondary-foreground'
            )}
          >
            {label}
          </Text>
        ) : null}
        {textChildren(children)}
      </IconColorProvider>
    </AnimatedPressable>
  );
}

export interface PanelsideSceneProps extends ViewProps {
  className?: string;
  /**
   * How small the scene gets at full travel. Default 1 — the screen keeps its
   * full height and stays behind the status bar, and the radius and dim do the
   * work. Below one it shrinks about its centre, which insets it top and bottom
   * as well as at the side.
   *
   * Falls back to the same prop on the `Panelside` root, so the three numbers
   * that describe the curve can be set once where the panel is configured.
   */
  scale?: number;
  /** The corner radius the scene reaches at full travel. Default 44. */
  radius?: number;
  /** How far the scene dims at full travel, 0 to 1. Default 0.45. */
  dim?: number;
  /**
   * Styles the layer that dims the scene. Its opacity is `dim`'s to set, so
   * this is for the colour — a scrim that is not black, for a light theme
   * where black at 45% reads as a hole rather than as shade.
   */
  scrimClassName?: string;
  children?: ReactNode;
}

function PanelsideScene({
  className,
  scale: scaleProp,
  radius: radiusProp,
  dim: dimProp,
  scrimClassName,
  children,
  style,
  ...props
}: PanelsideSceneProps) {
  const {
    progress,
    width,
    mode,
    docked,
    dismissible,
    open,
    setOpen,
    scale: rootScale,
    radius: rootRadius,
    dim: rootDim,
  } = usePanelsideContext('Panelside.Scene');

  // The part's own prop, then the root's, then the constant. Three levels
  // because the root's is a default for every scene under it and the part's is
  // a statement about this one.
  const scale = scaleProp ?? rootScale ?? SCENE_SCALE;
  const radius = radiusProp ?? rootRadius ?? SCENE_RADIUS;
  const dim = dimProp ?? rootDim ?? SCENE_DIM;
  const [sceneWidth, setSceneWidth] = useState(0);
  const sign = useDirectionSign();
  /*
   * The same border token every other edge in the library is drawn in, so this
   * one belongs to the same set rather than being a line of its own invention.
   * It already inverts with the theme — white at 6% in a dark one, black at 8%
   * in a light one — which is what makes it read on both sides of a boundary
   * between two surfaces of the same colour.
   *
   * It only failed to show before because it was drawn *under* the scrim. Above
   * it, at a full point, the token is enough on its own.
   */
  const edge = useCSSVariable('--color-border');
  const edgeColor = typeof edge === 'string' ? edge : undefined;

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setSceneWidth(event.nativeEvent.layout.width);
  }, []);

  const close = useCallback(() => setOpen(false), [setOpen]);

  /*
   * `pushes` rather than a branch inside the worklet, so the style always
   * returns the same set of properties. Reanimated keeps a property it has
   * seen once; dropping it from a later frame leaves the last value applied
   * instead of resetting it.
   */
  const pushes = mode === 'push' && !docked;

  const animatedStyle = useAnimatedStyle(() => {
    const p = pushes ? progress.value : 0;
    const s = 1 - (1 - scale) * p;
    return {
      transform: [
        // Subtracting the inset a centre-origin scale already applied is what
        // lands the scene's visible edge on the panel's, rather than near it.
        { translateX: sign * (p * (width + GAP) - (sceneWidth * (1 - s)) / 2) },
        { scale: s },
      ],
      borderRadius: p * radius,
    };
  }, [pushes, radius, scale, sceneWidth, sign, width]);

  const scrimStyle = useAnimatedStyle(() => {
    const p = docked ? 0 : progress.value;
    return { opacity: p * dim };
  }, [dim, docked]);

  /*
   * The edge is drawn as its own layer rather than as a border on the scene.
   * A border is a layout property: put one on the scene itself and it insets
   * everything inside by its width for the whole life of the screen, open or
   * shut, to show a line that is only wanted while the panel is out. A ring
   * over the top costs nothing when it is invisible.
   */
  const ringStyle = useAnimatedStyle(() => {
    const p = docked ? 0 : progress.value;
    return { opacity: p * EDGE_OPACITY, borderRadius: p * radius };
  }, [docked, radius]);

  const animatedProps = useAnimatedProps<ViewProps>(() => {
    const hidden = !docked && progress.value > 1 - HIDDEN_EPSILON;
    return Platform.OS === 'android'
      ? { importantForAccessibility: hidden ? 'no-hide-descendants' : 'auto' }
      : { accessibilityElementsHidden: hidden };
  }, [docked]);

  return (
    <Animated.View
      onLayout={onLayout}
      className={cn('flex-1 overflow-hidden bg-background', className)}
      style={[animatedStyle, style]}
      {...props}
    >
      <Animated.View animatedProps={animatedProps} className="flex-1">
        {children}
      </Animated.View>

      {/* Layered over the scene rather than under it, so it dims the app and
          catches the tap in the scene's own space — which means it inherits
          the corner radius instead of having to reproduce it.

          `pointerEvents` is a prop driven by state, not an animated style.
          A view at zero opacity still takes touches, so getting this wrong
          does not look like anything — it silently eats every tap on the app,
          including the one on the button that opens the panel. */}
      <Animated.View
        pointerEvents={open && !docked ? 'auto' : 'none'}
        className={cn('absolute bottom-0 end-0 start-0 top-0 bg-black', scrimClassName)}
        style={scrimStyle}
      >
        {dismissible ? (
          <Pressable
            onPress={close}
            className="flex-1"
            accessibilityRole="button"
            accessibilityLabel="Close navigation panel"
          />
        ) : null}
      </Animated.View>

      {/* A hairline where the scene meets the panel. Without it two surfaces
          of the same colour meet at a corner and the radius is the only thing
          saying they are separate — which reads as a rendering artefact rather
          than as an edge. */}
      {edgeColor ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { borderWidth: EDGE_WIDTH_PT, borderColor: edgeColor },
            ringStyle,
          ]}
        />
      ) : null}
    </Animated.View>
  );
}

export interface PanelsidePagesProps extends ViewProps {
  className?: string;
  /** `Panelside.Page` elements. Anything else is rendered as given. */
  children?: ReactNode;
}

/**
 * The pages the panel navigates between.
 *
 * Put it inside `Panelside.Scene` and give each page a `value` that a row's
 * `to` matches. Nothing is wired between the two: the row sets the panel's
 * route, and the page whose value equals it is the one shown.
 *
 * ```tsx
 * <Panelside.Scene>
 *   <Panelside.Pages>
 *     <Panelside.Page value="inbox"><Inbox /></Panelside.Page>
 *     <Panelside.Page value="drafts"><Drafts /></Panelside.Page>
 *   </Panelside.Pages>
 * </Panelside.Scene>
 * ```
 *
 * A page is mounted the first time it is visited and stays mounted after
 * that, hidden rather than removed. Going back to one is then a style change
 * rather than a mount: its list does not rebuild, its scroll position is where
 * you left it, and whatever it was fetching is already there. A page whose
 * contents go stale — or whose data is large enough that keeping it is worse
 * than fetching it again — takes `keepAlive={false}`.
 */
function PanelsidePages({ className, children, ...props }: PanelsidePagesProps) {
  const { route } = usePanelsideContext('Panelside.Pages');

  /*
   * Which pages have ever been the route.
   *
   * A `Set` in state rather than a ref: mounting a page for the first time has
   * to be a render, and the ref would not cause one. It only ever grows, and
   * only by one entry per page, so the identity change per first visit costs
   * nothing after the pages have all been seen once.
   */
  const [visited, setVisited] = useState<readonly string[]>(() => [route]);

  useEffect(() => {
    setVisited((current) => (current.includes(route) ? current : [...current, route]));
  }, [route]);

  return (
    <View className={cn('flex-1', className)} {...props}>
      {Children.map(children, (child) => {
        if (!isValidElement<PanelsidePageProps>(child) || child.type !== PanelsidePage) {
          return child;
        }

        const { value, keepAlive = true } = child.props;
        const current = value === route;
        if (!current && (!keepAlive || !visited.includes(value))) return null;

        return cloneElement(child, { hidden: !current });
      })}
    </View>
  );
}

export interface PanelsidePageProps extends ViewProps {
  className?: string;
  /** What a row's `to` has to equal for this page to be the one shown. */
  value: string;
  /**
   * Keep the page mounted once it has been visited. Default true, which is
   * what makes going back to it instant. Off, it is torn down on the way out
   * and rebuilt on the way in.
   */
  keepAlive?: boolean;
  /**
   * Set by `Panelside.Pages`. A hidden page is laid out by nobody, is not in
   * the accessibility tree, and takes no touches — but it is still mounted,
   * which is the whole point of it.
   */
  hidden?: boolean;
  children?: ReactNode;
}

/** One page. Only meaningful inside `Panelside.Pages`. */
function PanelsidePage({
  className,
  value,
  keepAlive,
  hidden = false,
  children,
  style,
  ...props
}: PanelsidePageProps) {
  // `display: none` rather than unmounting, and rather than opacity: it takes
  // the page out of layout entirely, so a hidden page costs no measurement,
  // while its component tree — and everything it is holding — stays.
  return (
    <View
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      pointerEvents={hidden ? 'none' : 'auto'}
      style={[hidden ? styles.hidden : null, style]}
      className={cn('flex-1', className)}
      {...props}
    >
      {textChildren(children)}
    </View>
  );
}

export interface PanelsideTriggerProps extends Omit<PressableProps, 'children'> {
  className?: string;
  /** What a screen reader announces. */
  label?: string;
  /**
   * A single pressable element to use instead of the default button. Its own
   * `onPress` still runs.
   */
  children?: ReactElement<{ onPress?: (...args: unknown[]) => void }>;
}

function PanelsideTrigger({
  className,
  label = 'Open navigation panel',
  children,
  onPress,
  ...props
}: PanelsideTriggerProps) {
  const { toggle, docked } = usePanelsideContext('Panelside.Trigger');
  const tint = useCSSVariable('--color-foreground');
  const color = typeof tint === 'string' ? tint : undefined;

  // A docked panel is already open and cannot be closed, so a control for it
  // would be a button that does nothing.
  if (docked) return null;

  if (children && isValidElement(children)) {
    return cloneElement(children, {
      onPress: (...args: unknown[]) => {
        children.props.onPress?.(...args);
        onPress?.(...(args as Parameters<NonNullable<PressableProps['onPress']>>));
        toggle();
      },
    });
  }

  return (
    <AnimatedPressable
      {...props}
      onPress={(event) => {
        onPress?.(event);
        toggle();
      }}
      className={cn('h-10 w-10 items-center justify-center rounded-full', className)}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Glyph icon={Menu01Icon} size={20} color={color} />
    </AnimatedPressable>
  );
}

/* ------------------------------------------------------------------ *
 * Search.
 *
 * On a phone, search is a button in the header rather than a field. The panel
 * is most of the screen and a field is 40 points of it, so results would have
 * to push the history down — and the field would be at the far end of the
 * screen from the keyboard.
 *
 * The button draws the control and nothing else. What it opens — a page, a
 * sheet, a screen on the app's own stack — is the app's to decide.
 *
 * `Panelside.Search`, the inline field, suits a docked panel on a tablet,
 * where there is width for a field and no keyboard covering half the screen.
 * ------------------------------------------------------------------ */

export interface PanelsideSearchTriggerProps extends Omit<PressableProps, 'children'> {
  className?: string;
  /** What a screen reader announces. */
  label?: string;
  /**
   * `filled` is the default: a circle in the secondary surface, which is what
   * a control sitting alone on the panel's own surface needs to read as one.
   *
   * `outline` is a ring and no fill, for a panel whose other controls are
   * outlined too — a filled circle among them is the only thing on the screen
   * claiming to be a second primary.
   *
   * Ignored under `native`, where the platform owns the button's chrome.
   */
  variant?: PanelsideControlVariant;
  /** Replaces the default magnifier. */
  children?: ReactNode;
  /**
   * Render the platform's own button instead of the circle. Requires the
   * optional `@expo/ui` package; without it this prop does nothing.
   */
  native?: boolean;
  /**
   * Draw the native button in the platform's Liquid Glass material. Requires
   * `native`, and iOS 26 or later; ignored anywhere else.
   */
  glass?: boolean;
}

/**
 * The search button. Goes in `Panelside.Header`'s `action` slot.
 *
 * It draws the control and nothing else: a circle, or the platform's own
 * button under `native`, with the magnifier already in it. What pressing it
 * opens is `onPress`'s to decide — a page the scene navigates to, a sheet, a
 * screen pushed onto the app's own stack.
 *
 * That is the same arrangement `Panelside.Trigger` has, and it is here for the
 * same reason: where search goes is a decision about the app, and a component
 * that answers it for you is one you have to work around the first time the
 * answer is different.
 */
function PanelsideSearchTrigger({
  className,
  label = 'Search',
  variant = 'filled',
  children,
  native = false,
  glass = false,
  onPress,
  ...props
}: PanelsideSearchTriggerProps) {
  const tint = useCSSVariable('--color-foreground');
  const color = typeof tint === 'string' ? tint : undefined;

  const open = onPress;

  const glyph = children ?? <Glyph icon={Search01Icon} size={18} color={native ? color : undefined} />;

  if (native) {
    return (
      <Button
        native
        glass={glass}
        size="icon"
        variant="ghost"
        accessibilityLabel={label}
        onPress={open}
      >
        {glyph}
      </Button>
    );
  }

  return (
    <AnimatedPressable
      {...props}
      onPress={open}
      className={cn(
        'h-10 w-10 items-center justify-center rounded-full',
        // Filled by default. It sits on the panel's own surface with nothing
        // else on that row, so an outline at this size reads as an empty
        // circle before it reads as a control — which stops being true the
        // moment the rest of the screen's controls are outlined as well.
        variant === 'outline' ? 'border border-border' : 'bg-secondary',
        className
      )}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <IconColorProvider color={color}>{glyph}</IconColorProvider>
    </AnimatedPressable>
  );
}

PanelsidePanel.displayName = 'Panelside.Panel';
PanelsideHeader.displayName = 'Panelside.Header';
PanelsideSearch.displayName = 'Panelside.Search';
PanelsideContent.displayName = 'Panelside.Content';
PanelsideGroup.displayName = 'Panelside.Group';
PanelsideGroupLabel.displayName = 'Panelside.GroupLabel';
PanelsideItem.displayName = 'Panelside.Item';
PanelsideItemIcon.displayName = 'Panelside.ItemIcon';
PanelsideItemLabel.displayName = 'Panelside.ItemLabel';
PanelsideItemBadge.displayName = 'Panelside.ItemBadge';
PanelsideAction.displayName = 'Panelside.Action';
PanelsideItemActions.displayName = 'Panelside.ItemActions';
PanelsideFooter.displayName = 'Panelside.Footer';
PanelsideCta.displayName = 'Panelside.Cta';
PanelsideScene.displayName = 'Panelside.Scene';
PanelsidePages.displayName = 'Panelside.Pages';
PanelsidePage.displayName = 'Panelside.Page';
PanelsideTrigger.displayName = 'Panelside.Trigger';
PanelsideSearchTrigger.displayName = 'Panelside.SearchTrigger';

export const Panelside = Object.assign(PanelsideRoot, {
  Panel: PanelsidePanel,
  Header: PanelsideHeader,
  Search: PanelsideSearch,
  Content: PanelsideContent,
  Group: PanelsideGroup,
  GroupLabel: PanelsideGroupLabel,
  Item: PanelsideItem,
  ItemIcon: PanelsideItemIcon,
  ItemLabel: PanelsideItemLabel,
  ItemBadge: PanelsideItemBadge,
  Action: PanelsideAction,
  ItemActions: PanelsideItemActions,
  Footer: PanelsideFooter,
  Cta: PanelsideCta,
  Scene: PanelsideScene,
  Pages: PanelsidePages,
  Page: PanelsidePage,
  Trigger: PanelsideTrigger,
  SearchTrigger: PanelsideSearchTrigger,
});
