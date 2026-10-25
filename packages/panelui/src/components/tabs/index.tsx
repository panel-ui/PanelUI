/**
 * Tabs — segmented navigation between panels.
 *
 * The active tab is marked by one indicator that slides between measured
 * trigger positions rather than by a style on each trigger. That is what makes
 * the movement continuous: there is a single thing travelling, so a switch two
 * tabs away reads as one gesture instead of two states swapping.
 *
 * ```tsx
 * <Tabs defaultValue="account">
 *   <Tabs.List>
 *     <Tabs.Trigger value="account">Account</Tabs.Trigger>
 *     <Tabs.Trigger value="team" badge={<Badge>3</Badge>}>Team</Tabs.Trigger>
 *   </Tabs.List>
 *   <Tabs.Content value="account">…</Tabs.Content>
 * </Tabs>
 * ```
 *
 * **Swiping puts the panels in a row.** With `swipeable`, the panels are laid
 * out side by side in a strip as wide as all of them, inside a viewport that
 * shows one at a time, and moving between tabs is that strip translating. The
 * neighbours are therefore already built and already the right size before the
 * finger arrives at them, which is the whole point: a panel that has to be
 * mounted and measured at the moment it becomes visible is a panel that stalls
 * there, and it stalls for exactly as long as it takes to build.
 *
 * One shared value carries the strip's position, in panels rather than points,
 * and it is the only thing that decides where the strip is. A press springs it,
 * a drag sets it, and neither waits for React: the value the tab set reports is
 * updated alongside the movement, not ahead of it.
 *
 * A swipeable tab set therefore needs a height to fill, the same as any pager.
 * Give it one — `flex-1` on the tab set, or a fixed height — or the strip has
 * nothing to lay its panels out in.
 */
import {
  Children,
  createContext,
  Fragment,
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
  Pressable,
  ScrollView,
  View,
  type LayoutChangeEvent,
  type ViewProps,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { tv } from 'tailwind-variants';
import { useDirectionSign } from '../../hooks/use-direction';
import { Text, textChildren } from '../../primitives/text';
import { cn } from '../../utils/cn';

const SPRING = { damping: 24, stiffness: 300, mass: 0.7 } as const;

/**
 * How far sideways a finger must travel before the panel takes the gesture
 * from whatever is scrolling above it, and how far up or down before it gives
 * up on it. The window between them is what lets a swipe start inside a
 * vertically scrolling panel without either gesture stealing the other.
 */
const SWIPE_ACTIVATE_X = 12;
const SWIPE_FAIL_Y = 8;

/** A swipe past this share of a panel's width changes tab on release. */
const SWIPE_DISTANCE_RATIO = 0.25;
/** …or past this speed, however short it was, in points per second. */
const SWIPE_VELOCITY = 500;

/**
 * How much of the finger's travel the strip follows at the ends of the row,
 * where there is no further panel to bring on. Everywhere else it follows all
 * of it.
 */
const SWIPE_RESISTANCE_AT_END = 0.16;

/** The spring the strip settles on, whether it was thrown or pressed. */
const ENTER_SPRING = { damping: 22, stiffness: 240, mass: 0.6 } as const;

/** How far the label's reveal is from its own width, in points — the gap after the icon. */
const LABEL_GAP = 6;

/** Points of room over the measured label, so a rounding error cannot truncate it. */
const LABEL_SLACK = 2;

/** Milliseconds for a tab to open its label, and for the one before it to close. */
const EXPAND_DURATION = 260;

/**
 * A width the ghost label is measured inside.
 *
 * A `Text` measures against the box it is in, and the box it is really in is a
 * pill whose width is the thing being measured. So the copy that gets measured
 * sits in a box wide enough not to be the constraint, and reports the width the
 * label actually wants.
 */
const MEASURE_WIDTH = 400;

export type TabsVariant = 'segmented' | 'underline' | 'pill' | 'expanding';

/** How big the triggers and their labels are. */
export type TabsSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Room above and below the two smallest sizes, so a row that is drawn 20 or 24
 * points tall is still pressed like one that is 44.
 *
 * Vertical only. The triggers sit edge to edge in a row, and slop to the side
 * would reach into the neighbouring tab and take its presses.
 */
const TRIGGER_HIT_SLOP: Partial<Record<TabsSize, { top: number; bottom: number }>> = {
  xs: { top: 12, bottom: 12 },
  sm: { top: 8, bottom: 8 },
};

/**
 * How much of an inactive panel survives a switch away from it.
 *
 * `false` unmounts it. `true` keeps it mounted.
 *
 * `'measured'` meant "keep it mounted *and* laid out at a real size", which was
 * a distinction only a tab set of separately hidden panels had to make. In a
 * swipeable tab set every panel in the strip is laid out at a real size
 * already, so it is the same as `true` there and is kept only so that passing
 * it does not break.
 *
 * @see TabsProps.keepMounted
 */
export type TabsKeepMounted = boolean | 'measured';

/**
 * `'disable-all'` turns off every animation in the tab set — the indicator, the
 * strip, and an expanding tab's reveal — including the ones its parts run
 * themselves.
 */
export type TabsAnimation = 'disable-all';

const tabsVariants = tv({
  slots: {
    list: 'flex-row',
    indicator: 'absolute left-0',
    trigger: 'items-center justify-center',
    label: '',
  },
  variants: {
    variant: {
      // A raised chip travelling inside a recessed track.
      segmented: {
        list: 'rounded-lg bg-muted p-1',
        indicator: 'bottom-1 top-1 rounded-md bg-popover shadow-sm',
        trigger: 'rounded-md py-1.5',
      },
      // No track at all — the indicator is a rule under the active tab, and
      // the row sits on a hairline so inactive tabs still have a baseline.
      underline: {
        list: 'gap-1 border-b border-border',
        indicator: '-bottom-px h-0.5 rounded-full bg-foreground',
        trigger: 'py-2.5',
      },
      // Filled chip on the page rather than in a track; the active label
      // inverts against it.
      pill: {
        list: 'gap-1',
        indicator: 'bottom-0 top-0 rounded-full bg-primary',
        trigger: 'rounded-full py-2',
      },
      /*
       * A row of icon pills, one of which is open.
       *
       * Every tab draws its own pill here, so there is no indicator to slide
       * between them — the shape that moves is the open tab itself, widening
       * to let its label out and closing again behind it. An indicator sliding
       * under pills that already have backgrounds would be invisible anyway.
       *
       * The open pill is a step further from the page than the closed ones:
       * lighter in a dark theme, darker in a light one, which is what the
       * tertiary surface token means and why it is used rather than a colour.
       */
      expanding: {
        list: 'gap-1.5',
        trigger: 'rounded-full bg-muted px-3.5 py-2.5',
      },
    },
    /*
     * The label's type size. `md` adds nothing, so it is whatever the label
     * was drawn at before sizes existed.
     *
     * How tall a trigger is depends on the variant as well, since each draws
     * its tab differently, so the padding per size is in the compound variants
     * below rather than here.
     */
    size: {
      xs: { label: 'text-xs' },
      sm: { label: 'text-[13px]' },
      md: {},
      lg: { label: 'text-base' },
      xl: { label: 'text-lg' },
    },
    active: {
      true: { label: 'text-foreground' },
      false: { label: 'text-muted-foreground' },
    },
    disabled: {
      true: { trigger: 'opacity-[0.44]' },
    },
    /** Intrinsic width in a scroller, equal shares when the row is fixed. */
    scrollable: {
      true: { trigger: 'px-4' },
      false: { trigger: 'flex-1' },
    },
  },
  compoundVariants: [
    { variant: 'pill', active: true, class: { label: 'text-primary-foreground' } },
    // A pill is as wide as what is inside it. Equal shares would give every
    // closed tab the width of the open one, which is the layout this variant
    // exists to avoid.
    { variant: 'expanding', class: { trigger: 'flex-none' } },
    { variant: 'expanding', active: true, class: { trigger: 'bg-surface-tertiary' } },
    // Half a step of padding per size, either side of the variant's own.
    { variant: 'segmented', size: 'xs', class: { trigger: 'py-0.5' } },
    { variant: 'segmented', size: 'sm', class: { trigger: 'py-1' } },
    { variant: 'segmented', size: 'lg', class: { trigger: 'py-2' } },
    { variant: 'segmented', size: 'xl', class: { trigger: 'py-2.5' } },
    { variant: 'underline', size: 'xs', class: { trigger: 'py-1.5' } },
    { variant: 'underline', size: 'sm', class: { trigger: 'py-2' } },
    { variant: 'underline', size: 'lg', class: { trigger: 'py-3' } },
    { variant: 'underline', size: 'xl', class: { trigger: 'py-3.5' } },
    { variant: 'pill', size: 'xs', class: { trigger: 'py-1' } },
    { variant: 'pill', size: 'sm', class: { trigger: 'py-1.5' } },
    { variant: 'pill', size: 'lg', class: { trigger: 'py-2.5' } },
    { variant: 'pill', size: 'xl', class: { trigger: 'py-3' } },
    { variant: 'expanding', size: 'xs', class: { trigger: 'px-2.5 py-1.5' } },
    { variant: 'expanding', size: 'sm', class: { trigger: 'px-3 py-2' } },
    { variant: 'expanding', size: 'lg', class: { trigger: 'px-4 py-3' } },
    { variant: 'expanding', size: 'xl', class: { trigger: 'px-5 py-3.5' } },
  ],
  defaultVariants: {
    variant: 'segmented',
    size: 'md',
    scrollable: false,
  },
});

interface TabLayout {
  x: number;
  width: number;
}

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  registerLayout: (value: string, layout: TabLayout) => void;
  layouts: Record<string, TabLayout>;
  variant: TabsVariant;
  size: TabsSize;
  keepMounted: TabsKeepMounted;
  /**
   * Whether the panels are in a strip rather than stacked in place.
   *
   * A panel in a strip is positioned by the strip and sized by the box it is
   * put in, so it does no hiding of its own — which is the whole difference
   * between the two modes as far as `Tabs.Content` is concerned.
   */
  pager: boolean;
  animationDisabled: boolean;
}

const TabsContext = createContext<TabsContextValue | null>(null);

/**
 * Whether the row the trigger is in scrolls, published by that row.
 *
 * It is a `Tabs.List` prop and it decides a trigger's width — intrinsic in a
 * scroller, an equal share in a fixed row — so the two have to agree in the
 * commit they are laid out in. Routed through the root it arrived one commit
 * late: every trigger was measured once at its equal-share position, the
 * indicator snapped to that geometry because it was the first measurement it
 * had, and the second pass moved everything. With enough tabs to need a
 * scroller in the first place, the gap between the two geometries is most of
 * the row.
 *
 * Separate from the root's context so it can be provided by the list, and
 * defaulted so a trigger outside one still resolves.
 */
const TabsListContext = createContext(false);

function useTabs(component: string): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error(`${component} must be used within a <Tabs>`);
  }
  return context;
}

export interface TabsProps extends ViewProps {
  className?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue: string;
  /**
   * `segmented` is a chip travelling inside a recessed track, `underline` is a
   * rule under the active tab, `pill` is a filled chip on the page.
   *
   * `expanding` is a row of icon pills where only the selected one is open:
   * it widens to let its label out and closes again behind it. For a short row
   * of destinations that are recognisable by their icons, where the labels
   * would otherwise take the whole width to say things nobody rereads. Give
   * every trigger an `icon` — a closed tab has nothing else.
   */
  variant?: TabsVariant;
  /**
   * How big the triggers and their labels are. `xs` and `sm` are for a tab set
   * inside something else, such as a card or a toolbar; `lg` and `xl` are for
   * one that is the main navigation of a screen. Icons and badges you pass are
   * not resized.
   */
  size?: TabsSize;
  /**
   * Mount every panel up front instead of only the ones that have been
   * reached, so a scroll position or a half-filled form is there from the
   * start rather than from the first visit.
   *
   * Usually unnecessary. A panel that has been shown once stays mounted for
   * the life of the tab set either way, and with `swipeable` the panels on
   * each side of the active one are mounted before you get to them. What this
   * adds is the panels you have *not* been near — the fourth tab of four —
   * which costs their render at startup and buys nothing until somebody opens
   * them.
   *
   * Turn it on when a panel has to be live while it is off screen: a form that
   * must validate as another tab is edited, a chart that has to be ready to
   * print, a subscription that must not miss a message.
   */
  keepMounted?: TabsKeepMounted;
  /**
   * Move between tabs by dragging sideways on the panels, as well as by
   * pressing the triggers.
   *
   * Off by default, because a panel is allowed to contain something that
   * already wants a horizontal drag — a carousel, a slider, a row that swipes
   * open — and the two cannot both have it. Turn it on for panels of ordinary
   * scrolling content, where it is the gesture people try first.
   *
   * **It changes how the panels are laid out.** They go side by side in a strip
   * that is as wide as all of them, and the tab set shows one panel of it at a
   * time. So the panel on each side of the active one is built and sized before
   * you swipe to it, which is what stops a heavy panel — a virtualised list, a
   * chart — from stalling on the frame it becomes visible.
   *
   * **It needs a height to fill**, the same as any pager: `flex-1` on the tab
   * set, or a fixed height. Without one the strip has no room to lay its panels
   * out in, and a list inside a panel of no height renders no rows. In
   * development the tab set says so rather than rendering nothing.
   */
  swipeable?: boolean;
  /**
   * Turn the tab set's animations off — the indicator, the strip, and an
   * expanding tab's reveal.
   *
   * For a screen that is already animating something more important, and as a
   * blunt instrument on a device that cannot afford them. The system's own
   * reduce-motion setting is honoured without this.
   */
  animation?: TabsAnimation;
  children: ReactNode;
}

/**
 * Pulls the panels out of the children, keeping everything else where it was.
 *
 * A pager has to lay its panels out together, and they are written wherever
 * they read best — usually after the list, sometimes inside a fragment from a
 * `map`. So they are found rather than required to be somewhere: fragments are
 * flattened through, `Tabs.Content` elements are collected in the order they
 * appear, and every other child is left exactly where it was written.
 *
 * A panel that is *not* reachable this way — wrapped in a component of your own
 * — is not found, and the tab set falls back to showing one panel at a time.
 * Silently losing it would be worse than not paging it.
 */
function collectPanels(children: ReactNode): {
  rest: ReactNode[];
  panels: ReactElement<TabsContentProps>[];
} {
  const rest: ReactNode[] = [];
  const panels: ReactElement<TabsContentProps>[] = [];

  const walk = (nodes: ReactNode) => {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) {
        if (child !== null && child !== undefined && child !== false) rest.push(child);
        return;
      }
      if (child.type === Fragment) {
        walk((child.props as { children?: ReactNode }).children);
        return;
      }
      if (child.type === TabsContent) {
        panels.push(child as ReactElement<TabsContentProps>);
        return;
      }
      rest.push(child);
    });
  };

  walk(children);
  return { rest, panels };
}

function TabsRoot({
  className,
  value,
  onValueChange,
  defaultValue,
  variant = 'segmented',
  size = 'md',
  keepMounted = false,
  swipeable = false,
  animation,
  children,
  ...props
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [layouts, setLayouts] = useState<Record<string, TabLayout>>({});
  const isControlled = value !== undefined;
  const resolvedValue = isControlled ? value : internalValue;
  const animationDisabled = animation === 'disable-all';

  const setValue = useCallback(
    (next: string) => {
      if (!isControlled) setInternalValue(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange]
  );

  const registerLayout = useCallback((tab: string, layout: TabLayout) => {
    setLayouts((current) => {
      const existing = current[tab];
      if (existing && existing.x === layout.x && existing.width === layout.width) {
        return current;
      }
      return { ...current, [tab]: layout };
    });
  }, []);

  /*
   * The panels are the sequence.
   *
   * They are read straight out of the children, in the order they are written,
   * which is available on the first render and cannot disagree with what is on
   * screen. The triggers used to register themselves to build this, which meant
   * the order arrived a commit late and every mount and unmount of a trigger
   * re-rendered every panel.
   */
  const { rest, panels } = useMemo(() => collectPanels(children), [children]);
  const paged = swipeable && panels.length > 0;

  const context = useMemo(
    () => ({
      value: resolvedValue,
      setValue,
      registerLayout,
      layouts,
      variant,
      size,
      keepMounted,
      pager: paged,
      animationDisabled,
    }),
    [
      resolvedValue,
      setValue,
      registerLayout,
      layouts,
      variant,
      size,
      keepMounted,
      paged,
      animationDisabled,
    ]
  );

  return (
    <TabsContext.Provider value={context}>
      <View className={cn('gap-3', className)} {...props}>
        {textChildren(paged ? rest : children)}
        {paged ? (
          <TabsPager
            panels={panels}
            value={resolvedValue}
            setValue={setValue}
            keepMounted={!!keepMounted}
            animationDisabled={animationDisabled}
          />
        ) : null}
      </View>
    </TabsContext.Provider>
  );
}

/**
 * The panels, side by side, behind a window one panel wide.
 *
 * Everything about the movement lives on `position`, measured in panels rather
 * than points: the strip is at `-position × width`, a drag sets it, a press
 * springs it, and it is the only thing that says where the strip is. Nothing
 * here waits for React to commit before moving, which is what the old
 * arrangement did — it mounted the arriving panel and animated it in on the
 * same frame, so the movement was only as smooth as the mount was quick.
 */
function TabsPager({
  panels,
  value,
  setValue,
  keepMounted,
  animationDisabled,
}: {
  panels: ReactElement<TabsContentProps>[];
  value: string;
  setValue: (value: string) => void;
  keepMounted: boolean;
  animationDisabled: boolean;
}) {
  const sign = useDirectionSign();
  const reducedMotion = useReducedMotion();
  const still = animationDisabled || reducedMotion;

  const order = useMemo(() => panels.map((panel) => panel.props.value), [panels]);
  const count = panels.length;
  /*
   * The index of the value, or the last one that resolved.
   *
   * A value that is not among the panels is a moment rather than a state: a
   * controlled parent part-way through an update, panels rebuilt from a `map`
   * whose keys changed. Falling back to zero for that moment springs the strip
   * to the first panel and back, which is a visible flicker for something that
   * was never wrong. Holding the last index shows the panel that was already
   * there until the new one arrives.
   *
   * Zero remains the answer when nothing has ever resolved — a tab set with
   * nothing in it is a harder thing to debug than one showing the wrong tab.
   */
  const resolved = order.indexOf(value);
  const lastResolved = useRef(0);
  if (resolved >= 0) lastResolved.current = resolved;
  const active = resolved >= 0 ? resolved : Math.min(lastResolved.current, count - 1);

  const [width, setWidth] = useState(0);
  const position = useSharedValue(active);
  const widthValue = useSharedValue(0);
  const countValue = useSharedValue(count);
  const start = useSharedValue(active);
  /** 1 between a drag activating and it being finalised, 0 otherwise. */
  const dragging = useSharedValue(0);

  useEffect(() => {
    widthValue.value = width;
    countValue.value = count;
  }, [width, count, widthValue, countValue]);

  /*
   * Which panels have been built, and it only ever grows.
   *
   * A panel that has been reached stays mounted for the life of the tab set,
   * so a tab is slow at most once. That is what `keepMounted` was reached for
   * and could not deliver, because it decided mounting and hiding together and
   * the hiding took the panel's size away.
   */
  const [reached, setReached] = useState<number[]>(() => [active]);
  if (!reached.includes(active)) {
    // During render, not in an effect: a press on a far tab has to have its
    // panel in this commit, or the strip travels to an empty box.
    setReached((current) => (current.includes(active) ? current : [...current, active]));
  }

  useEffect(() => {
    const wanted = keepMounted
      ? Array.from({ length: count }, (_, index) => index)
      : [active - 1, active + 1].filter((index) => index >= 0 && index < count);

    /*
     * The neighbours arrive a tick late, on purpose.
     *
     * They are what makes a swipe cost nothing — the panel you are swiping
     * towards is already built — but mounting them in the same commit as the
     * active one puts three panels' worth of work on the frame the tab set
     * first appears. A timeout of zero is enough to let that frame out.
     */
    const timer = setTimeout(() => {
      setReached((current) => {
        const missing = wanted.filter((index) => !current.includes(index));
        return missing.length > 0 ? [...current, ...missing] : current;
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [active, count, keepMounted]);

  /*
   * Which tab the strip has already been sprung to by a swipe.
   *
   * A swipe moves the strip and *then* reports the change, so by the time the
   * value arrives the movement is under way with the flick's speed in it.
   * Springing again from the effect below would restart it from rest, which is
   * the flick visibly losing its throw halfway across.
   *
   * The index rather than a flag, so a change that never came back — a
   * controlled parent that ignored the swipe — cannot swallow the next press.
   */
  const sprungTo = useRef<number | null>(null);
  const orderRef = useRef(order);
  orderRef.current = order;
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    const already = sprungTo.current;
    sprungTo.current = null;
    if (already === active) return;

    if (still || width === 0) {
      position.value = active;
      return;
    }
    position.value = withSpring(active, ENTER_SPRING);
  }, [active, still, width, position]);

  const commit = useCallback(
    (index: number) => {
      const next = orderRef.current[index];
      if (next === undefined || next === valueRef.current) return;
      sprungTo.current = index;
      setValue(next);
    },
    [setValue]
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // Sideways past the threshold takes the gesture; any real vertical
        // travel hands it back, so a panel that scrolls still scrolls.
        .activeOffsetX([-SWIPE_ACTIVATE_X, SWIPE_ACTIVATE_X])
        .failOffsetY([-SWIPE_FAIL_Y, SWIPE_FAIL_Y])
        .onStart(() => {
          // On activation rather than on touch-down, so a tap that never
          // becomes a drag never claims a starting point. Rounded, so a drag
          // begun while the last one is still settling starts from the tab it
          // is settling on.
          dragging.value = 1;
          start.value = Math.round(position.value);
        })
        .onUpdate((event) => {
          const span = widthValue.value;
          if (span === 0) return;
          const last = countValue.value - 1;
          const raw = start.value - (event.translationX * sign) / span;

          // Past either end there is no panel to bring on, so the strip gives
          // a little and then stops, rather than pulling a blank into view.
          if (raw < 0) position.value = raw * SWIPE_RESISTANCE_AT_END;
          else if (raw > last) position.value = last + (raw - last) * SWIPE_RESISTANCE_AT_END;
          else position.value = raw;
        })
        .onEnd((event) => {
          const span = widthValue.value;
          if (span === 0) return;
          const last = countValue.value - 1;
          const from = start.value;
          const moved = position.value - from;
          // Points per second becomes panels per second, which is the unit the
          // spring that finishes the movement is working in.
          const speed = (-event.velocityX * sign) / span;

          let target = from;
          // Speed first: distance and speed can disagree, and a flick back the
          // way it came reads as a cancel however far it had already got.
          if (Math.abs(event.velocityX) > SWIPE_VELOCITY) {
            target = from + (speed > 0 ? 1 : -1);
          } else if (Math.abs(moved) > SWIPE_DISTANCE_RATIO) {
            target = from + (moved > 0 ? 1 : -1);
          }
          if (target < 0) target = 0;
          if (target > last) target = last;

          position.value = withSpring(target, { ...ENTER_SPRING, velocity: speed });
          if (target !== from) runOnJS(commit)(target);
        })
        .onFinalize((_event, success) => {
          // A cancelled gesture never reaches `onEnd`, and would otherwise
          // leave the strip wherever the finger abandoned it. Only for a drag
          // that actually started: this also runs for every touch that never
          // became one, and springing to the rounded position there would
          // interrupt a press's own movement with a tap on the panel.
          if (dragging.value === 1 && !success) {
            position.value = withSpring(start.value, ENTER_SPRING);
          }
          dragging.value = 0;
        }),
    [sign, commit, position, start, dragging, widthValue, countValue]
  );

  /*
   * The width comes in as the React value, not through `widthValue`.
   *
   * `widthValue` is mirrored from state in an effect, so it is a commit behind
   * — and the commit it is behind by is the one where the strip first appears.
   * For that frame the transform evaluated to `-position × 0`, which is panel
   * zero on screen whichever tab is active: the tab set opened on the first
   * panel and jumped to the right one. Reading `width` here re-creates the
   * style when it changes, so the first frame of the strip is already in the
   * right place. `widthValue` is still what the gesture reads, because a
   * worklet cannot see React state.
   */
  const strip = useAnimatedStyle(
    () => ({ transform: [{ translateX: -position.value * width * sign }] }),
    [width, sign]
  );

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const measured = event.nativeEvent.layout;
    if (measured.width > 0) setWidth(measured.width);

    if (__DEV__ && measured.width > 0 && measured.height === 0) {
      console.warn(
        '[PanelUI] <Tabs swipeable> has no height to fill, so its panels have nowhere ' +
          'to be laid out. Give the tab set a height — `className="flex-1"` on <Tabs>, ' +
          'or a fixed height — the same as any pager needs.'
      );
    }
  }, []);

  /*
   * A strip cannot be laid out before the width of one panel is known, so the
   * first render is the active panel on its own, filling the window. The strip
   * takes over on the next frame, and every frame after it.
   */
  if (width === 0) {
    return (
      <View style={PAGER_VIEWPORT} onLayout={onLayout}>
        {panels[active]}
      </View>
    );
  }

  return (
    <View style={PAGER_VIEWPORT} onLayout={onLayout}>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[FILL, { flexDirection: 'row', width: width * count }, strip]}
        >
          {panels.map((panel, index) => (
            <View key={order[index]} style={[FILL, { width }]}>
              {reached.includes(index) ? panel : null}
            </View>
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/**
 * Fill a height that is offered, and take the content's own when none is.
 *
 * `flexBasis: 'auto'` rather than the `0` that `flex: 1` sets, and it is on
 * every box between the tab set and a panel — viewport, strip, panel — because
 * one `flex: 1` anywhere in that chain breaks both cases at once. A `flex: 1`
 * box inside a parent of indefinite height resolves to *nothing*: its basis is
 * zero and there is no free space to grow into. So the tab set that had not
 * been given a height would collapse, and take every panel with it — which is
 * the same zero-height failure that made a kept panel useless to a list, one
 * level up.
 *
 * With `auto` the chain resolves both ways. Given a height, the panels fill it
 * and a virtualised list inside one has a real size to build against. Given
 * none, the strip is as tall as its tallest panel and every panel stretches to
 * match, so switching tabs does not change the tab set's height either.
 */
const FILL = { flexGrow: 1, flexShrink: 1, flexBasis: 'auto' } as const;

/** The window the strip moves behind, one panel wide. */
const PAGER_VIEWPORT = { ...FILL, overflow: 'hidden' } as const;

function TabsIndicator({ className }: { className?: string }) {
  const { value, layouts, variant, animationDisabled } = useTabs('Tabs.List');
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const initialized = useSharedValue(0);

  const layout = layouts[value];
  const { indicator } = tabsVariants({ variant });

  // In an effect, not the render body: touching a shared value during render
  // is a Reanimated strict-mode violation, and the write can be lost or
  // duplicated when React re-renders.
  useEffect(() => {
    if (!layout) return;

    if (initialized.value === 0 || animationDisabled) {
      // First measurement snaps into place; there is nothing to animate from.
      x.value = layout.x;
      width.value = layout.width;
      initialized.value = 1;
    } else {
      x.value = withSpring(layout.x, SPRING);
      width.value = withSpring(layout.width, SPRING);
    }
  }, [layout?.x, layout?.width, x, width, initialized, animationDisabled, layout]);

  const style = useAnimatedStyle(() => ({
    opacity: initialized.value,
    transform: [{ translateX: x.value }],
    width: width.value,
  }));

  return <Animated.View style={style} className={cn(indicator(), className)} />;
}

export interface TabsListProps extends ViewProps {
  className?: string;
  /**
   * Classes for the indicator that slides to the selected tab: the chip in
   * `segmented` and `pill`, the rule in `underline`. Use it to change the
   * indicator's colour, height or radius, for example `bg-primary`.
   *
   * `expanding` has no indicator, so this does nothing there. Style the open
   * tab with `activeClassName` on `Tabs.Trigger` instead.
   */
  indicatorClassName?: string;
  /**
   * Lay the triggers out at their natural widths inside a horizontal scroller
   * instead of splitting the row between them. For more tabs than fit — which
   * a fixed row answers by crushing every label.
   */
  scrollable?: boolean;
  children: ReactNode;
}

/**
 * Where the active tab should sit in the scroller, or null when it cannot be
 * known yet.
 *
 * A little in from the edge rather than flush against it, so the tab does not
 * read as the last one in the row.
 */
function scrollTarget(layout: TabLayout | undefined): number | null {
  if (!layout) return null;
  return Math.max(layout.x - 24, 0);
}

function TabsList({
  className,
  indicatorClassName,
  scrollable = false,
  children,
  ...props
}: TabsListProps) {
  const { variant, value, layouts } = useTabs('Tabs.List');
  const { list } = tabsVariants({ variant });
  const scroller = useRef<ScrollView>(null);

  /*
   * Where the row should be, kept as a ref rather than only applied once.
   *
   * A horizontal scroller does not always keep its offset when its content is
   * laid out again, and the row is laid out again on every switch — so the
   * scroller can be left at zero, showing the first tab, with nothing in this
   * component's state disagreeing. Re-applying the target from
   * `onContentSizeChange` puts it back where the selection says it should be.
   */
  const target = scrollTarget(layouts[value]);
  const targetRef = useRef<number | null>(target);
  targetRef.current = target;
  const settled = useRef(false);

  // Bring the active tab into view when the selection changes — a press, a
  // controlled switch, or a swipe on the panel below.
  useEffect(() => {
    if (!scrollable || target === null) return;
    scroller.current?.scrollTo({
      x: target,
      // The first measurement has nowhere to travel from: animating it is a
      // row that visibly slides into place as the screen appears.
      animated: settled.current,
    });
    settled.current = true;
  }, [scrollable, value, target]);

  const restore = useCallback(() => {
    if (!scrollable || targetRef.current === null) return;
    scroller.current?.scrollTo({ x: targetRef.current, animated: false });
  }, [scrollable]);

  const row = (
    <View {...props} accessibilityRole="tablist" className={cn(list(), className)}>
      {/* Nothing to slide: in `expanding` every tab draws its own pill, and the
          open one is the shape that moves. */}
      {variant === 'expanding' ? null : <TabsIndicator className={indicatorClassName} />}
      {textChildren(children)}
    </View>
  );

  /*
   * The triggers are told whether they are in a scroller here rather than
   * through the root, so their width and the row they are measured in belong to
   * one commit. See {@link TabsListContext}.
   */
  const scoped = <TabsListContext.Provider value={scrollable}>{row}</TabsListContext.Provider>;

  if (!scrollable) return scoped;

  return (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      // The row measures itself, and the indicator is positioned against it,
      // so the scroller must not stretch it to the viewport width.
      contentContainerStyle={{ flexGrow: 0 }}
      onContentSizeChange={restore}
    >
      {scoped}
    </ScrollView>
  );
}

export interface TabsTriggerProps {
  className?: string;
  /**
   * Classes added to the trigger while it is selected. In `expanding`, where
   * the open tab draws its own pill, this is how the pill is recoloured.
   */
  activeClassName?: string;
  /** Classes for the label in every state, for example its inactive colour. */
  labelClassName?: string;
  /**
   * Classes for the label while the tab is selected. Set it with
   * `indicatorClassName` on `Tabs.List` so the text stays readable on the new
   * indicator colour.
   */
  activeLabelClassName?: string;
  value: string;
  /**
   * Rendered before the label. Required by `variant="expanding"`, where it is
   * the only thing a closed tab has left to identify it by.
   */
  icon?: ReactNode;
  /** Rendered after the label — a count, a dot, a status. */
  badge?: ReactNode;
  /** Unselectable, dimmed, and announced as disabled. */
  disabled?: boolean;
  children: ReactNode;
}

function TabsTrigger({
  className,
  activeClassName,
  labelClassName,
  activeLabelClassName,
  value,
  icon,
  badge,
  disabled = false,
  children,
}: TabsTriggerProps) {
  const context = useTabs('Tabs.Trigger');
  const scrollable = useContext(TabsListContext);
  const active = context.value === value;
  const slots = tabsVariants({
    variant: context.variant,
    size: context.size,
    active,
    disabled,
    scrollable,
  });

  /*
   * Bound to `registerLayout` alone, which is stable for the life of the tab
   * set — not to the whole context, which is rebuilt every time any trigger
   * registers. Depending on the context made this a new function on every
   * measurement, so a layout burst handed every trigger a new `onLayout` for
   * every *other* trigger's measurement: quadratic prop updates in exactly the
   * case that has enough tabs to be slow.
   */
  const { registerLayout } = context;
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      registerLayout(value, { x, width });
    },
    [registerLayout, value]
  );

  // Last, so a caller's `text-*` or `bg-*` replaces the variant's own.
  const label = cn(slots.label(), labelClassName, active && activeLabelClassName);
  const trigger = cn(slots.trigger(), className, active && activeClassName);

  if (context.variant === 'expanding') {
    return (
      <ExpandingTrigger
        active={active}
        disabled={disabled}
        icon={icon}
        badge={badge}
        still={context.animationDisabled}
        labelClassName={label}
        className={trigger}
        onLayout={handleLayout}
        onPress={() => context.setValue(value)}
      >
        {children}
      </ExpandingTrigger>
    );
  }

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={() => context.setValue(value)}
      onLayout={handleLayout}
      hitSlop={TRIGGER_HIT_SLOP[context.size]}
      className={cn(
        slots.trigger(),
        (icon || badge) && 'flex-row gap-1.5',
        className,
        active && activeClassName
      )}
    >
      {icon}
      {textChildren(children, (text) => (
        <Text size="sm" weight="medium" className={label}>
          {text}
        </Text>
      ))}
      {badge}
    </Pressable>
  );
}

/**
 * A tab that is an icon until it is selected, and then an icon and its label.
 *
 * The label is never unmounted, only closed over. Two reasons, and both matter:
 * a screen reader walking a row of unlabelled icons has nothing to read out,
 * and a label that mounts on selection has no width to animate *from*, so the
 * pill would jump to its open size and the text would fade in inside it.
 *
 * So the width is animated instead, which needs a number — and the number is
 * the one thing that cannot be measured in place, because the box the label
 * sits in is the box being resized. A second copy, laid out once in a box wide
 * enough not to constrain it, reports the width and is never seen.
 */
function ExpandingTrigger({
  active,
  disabled,
  icon,
  badge,
  still,
  className,
  labelClassName,
  onLayout,
  onPress,
  children,
}: {
  active: boolean;
  disabled: boolean;
  icon?: ReactNode;
  badge?: ReactNode;
  still: boolean;
  className: string;
  labelClassName: string;
  onLayout: (event: LayoutChangeEvent) => void;
  onPress: () => void;
  children: ReactNode;
}) {
  const [labelWidth, setLabelWidth] = useState(0);
  const reducedMotion = useReducedMotion();
  const open = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    if (reducedMotion || still) {
      open.value = active ? 1 : 0;
      return;
    }
    /*
     * A curve, not a spring.
     *
     * This animates a *width*, so every frame of it is a layout pass — and the
     * row is centred, so every other pill moves with it. A spring overshoots
     * past its target and settles back, which on a box that is clipping text
     * means the last word slides in, out and in again, and the whole row
     * wobbles with it. The curve leaves quickly and arrives slowly, and it
     * arrives once.
     */
    open.value = withTiming(active ? 1 : 0, {
      duration: EXPAND_DURATION,
      easing: Easing.bezier(0.2, 0, 0, 1),
    });
  }, [active, reducedMotion, still, open]);

  const reveal = useAnimatedStyle(() => ({
    width: (labelWidth + LABEL_GAP) * open.value,
    /*
     * Behind the width, not ahead of it. Text drawn into a box narrower than
     * itself is text with its end cut off, and doing that on purpose for the
     * first half of the animation is the difference between a label arriving
     * and a label being wiped on.
     */
    opacity: interpolate(open.value, [0.35, 0.9], [0, 1], Extrapolation.CLAMP),
  }));

  const label = textChildren(children, (text) => (
    <Text size="sm" weight="medium" numberOfLines={1} className={labelClassName}>
      {text}
    </Text>
  ));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active, disabled }}
      // The label may be closed to nothing, and a tab announced as an unlabelled
      // icon is a tab nobody can choose.
      accessibilityLabel={typeof children === 'string' ? children : undefined}
      disabled={disabled}
      onPress={onPress}
      onLayout={onLayout}
      className={cn('flex-row items-center', className)}
    >
      {icon}
      <Animated.View style={[{ overflow: 'hidden' }, reveal]}>
        {/*
         * Pinned to the measured width so the text does not reflow as the box
         * around it closes — a label that rewraps on its way out reads as a
         * glitch rather than as a reveal.
         *
         * The gap after the icon is padding on this box, so it has to be added
         * to the width rather than taken out of it. Set to the measured width
         * alone, the padding comes off the inside and the label is handed six
         * points less than it asked for, which a single-line `Text` answers by
         * truncating: "Inbox" arrives as "Inbo…" and stays that way.
         */}
        <View style={{ width: labelWidth + LABEL_GAP, paddingStart: LABEL_GAP }}>
          {label}
        </View>
      </Animated.View>
      {/* Measured once, never seen, and out of the layout so it cannot widen
          the pill it is measuring. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', opacity: 0, width: MEASURE_WIDTH }}
      >
        <View
          style={{ alignSelf: 'flex-start' }}
          onLayout={(event: LayoutChangeEvent) => {
            /*
             * Rounded up and given a couple of points over.
             *
             * The measurement and the box it is put back into are two different
             * layout passes, and a fraction of a point between them is enough
             * for a single-line `Text` to decide it does not fit and truncate —
             * which shows up as a label permanently missing its last letter.
             */
            const measured = Math.ceil(event.nativeEvent.layout.width) + LABEL_SLACK;
            if (measured > LABEL_SLACK && measured !== labelWidth) {
              setLabelWidth(measured);
            }
          }}
        >
          {label}
        </View>
      </View>
      {badge}
    </Pressable>
  );
}

export interface TabsContentProps extends ViewProps {
  className?: string;
  value: string;
  children: ReactNode;
}

function TabsContent({ className, value, children, style, ...props }: TabsContentProps) {
  const context = useTabs('Tabs.Content');
  const active = context.value === value;

  /*
   * In a strip, a panel does no hiding and no moving.
   *
   * It is positioned by the strip and sized by the box it was put in, so all
   * that is left to it is to fill that box and to stay out of the screen
   * reader's way while it is off screen. Everything else this used to do — the
   * displacement, the fade, the gesture, the two ways of being hidden — was
   * work to make one panel stand in for a row of them, and the row is real now.
   */
  if (context.pager) {
    return (
      <View
        style={[PAGER_PANEL, style]}
        accessibilityElementsHidden={!active}
        importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
        className={className}
        {...props}
      >
        {textChildren(children)}
      </View>
    );
  }

  if (!active && !context.keepMounted) return null;

  /*
   * Hidden rather than unmounted under `keepMounted`, and hidden thoroughly:
   * it is not drawn, it takes no touches, and the accessibility props take it
   * out of the reading order too. A screen reader walking through three panels
   * of a tab set it cannot see is worse than no tabs at all.
   *
   * `display: none` takes it out of layout as well, so a kept panel costs
   * nothing to have around — and can hold nothing that needs a size while it is
   * hidden. That is what `swipeable` is for: in a strip every panel has one.
   */
  return (
    <Animated.View
      // Only worth animating when the panel is genuinely arriving. A kept panel
      // is already there; fading it in every time it is revealed would undo the
      // point of keeping it.
      entering={
        context.keepMounted || context.animationDisabled ? undefined : FadeIn.duration(150)
      }
      style={[!active && HIDDEN_PANEL, style]}
      pointerEvents={active ? 'auto' : 'none'}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
      className={className}
      {...props}
    >
      {textChildren(children)}
    </Animated.View>
  );
}

/** A panel in the strip fills the box the strip put it in. */
const PAGER_PANEL = { ...FILL, width: '100%' } as const;

/** …and one that is kept without a strip is mounted, but takes up no room. */
const HIDDEN_PANEL = { display: 'none' } as const;

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
});
