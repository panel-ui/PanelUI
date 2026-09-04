/**
 * Fab — the floating action button: one screen, one thing it is mostly for.
 *
 * ```tsx
 * <Fab icon={<PlusIcon size={24} />} accessibilityLabel="New note" onPress={compose} />
 * ```
 *
 * ## It floats, which is the whole problem with it
 *
 * A button pinned over the content is a button covering some of it, and the
 * bottom-right corner of a scrolling list is exactly where the last row goes. So
 * a Fab is right when a screen has *one* action worth that trade and wrong when
 * it has three — a corner with three buttons in it is a toolbar that has been
 * put in the wrong place. Where a screen has several, the honest shapes are a
 * `ButtonGroup` in a bar or, if one of them really does lead, this with a
 * `Fab.Group` behind it.
 *
 * It positions itself absolutely against its nearest positioned ancestor, which
 * on a screen means the screen. Give the content below it enough bottom padding
 * to scroll clear — this cannot know how tall your list is, and a Fab sitting on
 * the last row forever is the failure people actually hit.
 *
 * ## Extended, and when to bother
 *
 * ```tsx
 * <Fab extended icon={<PencilIcon size={20} />}>Write</Fab>
 * ```
 *
 * A lone glyph is a guess unless the glyph is a plus. `extended` spells the
 * action out, costs the width, and is worth it for anything a plus would not
 * have said.
 *
 * ## The speed dial
 *
 * ```tsx
 * <Fab.Group icon={<PlusIcon size={24} />} accessibilityLabel="Add">
 *   <Fab.Action icon={<ImageIcon size={18} />} label="Photo" onPress={addPhoto} />
 *   <Fab.Action icon={<FileIcon size={18} />} label="File" onPress={addFile} />
 * </Fab.Group>
 * ```
 *
 * The actions come out of the button one after another rather than together —
 * a stagger of a few frames each, which is enough to read as a list unfolding
 * instead of a menu appearing. Every action carries its label beside it, because
 * a column of unlabelled circles is a quiz.
 *
 * ## The menu
 *
 * ```tsx
 * <Fab.Group layout="menu" glass icon={<PlusIcon size={24} />} accessibilityLabel="Add">
 *   <Fab.Action icon={<ImageIcon size={18} />} label="Photo" onPress={addPhoto} />
 *   <Fab.Action icon={<FileIcon size={18} />} label="File" onPress={addFile} />
 * </Fab.Group>
 * ```
 *
 * `layout="menu"` unfolds one panel of rows out of the button instead of a
 * column of buttons — the shape the platform's own menus take. Each row is a
 * label with its glyph, on the side the appearance puts it or `iconPlacement`
 * says, and the panel springs out of the corner the
 * trigger sits in, so it reads as the button opening rather than a sheet
 * arriving. Drawn in glass, the panel is one piece of the material; the rows
 * are content on it.
 *
 * ## Glass
 *
 * ```tsx
 * <Fab glass icon={<PlusIcon size={24} />} accessibilityLabel="New note" />
 * ```
 *
 * `glass` draws the button in the material iOS 26 uses for its own floating
 * controls, in place of the variant's fill. A control floating over content is
 * exactly what that material is for: it refracts what scrolls under it rather
 * than covering it, and lifts its own edge, so the shadow goes too.
 *
 * Every variant takes the plain material, because a tint is a dimmer: measured
 * over content, a colour laid on the glass turns it back into a fill and a
 * monochrome one only greys it. The glyph reads in the ordinary foreground
 * colour, and in red on `destructive` — the colour that carries meaning goes
 * on the glyph, where it stays legible. Pressed, it answers the way the platform's
 * own glass controls do: the material swells and brightens under the finger,
 * in place of this component's press scale. The material exists on iOS 26 and
 * above with the optional `expo-glass-effect` installed. Everywhere else — older iOS,
 * Android, web, Reduce Transparency on — the flag is inert and the button keeps
 * its ordinary fill, so nothing has to be written twice.
 *
 * Opening also drops a scrim over the screen. Not for looks: an open dial is
 * modal — the next tap either picks something or closes it — and a scrim is what
 * says so, as well as what catches the tap that closes it.
 *
 * ## Where a group has to be written
 *
 * A `Fab.Group` draws its scrim and its buttons as two absolutely positioned
 * siblings in whatever it is written inside, so put it in the screen's root
 * container. That is where its `offset` is measured from, and it is what the
 * scrim covers.
 *
 * It stays in the screen's own view tree rather than being lifted out of it,
 * which is the part that matters after navigation: pushing a screen over this
 * one hides the dial with everything else on it. A group lifted to the top of
 * the app would still be drawn over the screen that replaced it.
 */
import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type ViewProps,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { IconColorProvider } from '../../icons';
import { useBackHandler } from '../../hooks/use-back-handler';
import {
  NativeHost,
  getComposeMenu,
  getSwiftUIMenu,
  getSwiftUIModifiers,
} from '../../native';
import {
  AnimatedPressable,
  type AnimatedPressableProps,
} from '../../primitives/animated-pressable';
import { Glass, GlassContainer, useGlassMaterial } from '../../primitives/glass';
import { Scrim } from '../../primitives/scrim';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { selectionTick } from '../../utils/haptics';

/** Which corner the button sits in. */
export type FabPlacement = 'bottom-right' | 'bottom-center' | 'bottom-left';

/** How far from the edges a floating button sits, in points. */
const DEFAULT_OFFSET = 16;

/**
 * The spring the dial opens on. Underdamped enough to overshoot a little and
 * settle, which is what makes buttons read as arriving rather than being
 * placed; the stagger between actions comes from where each one reads the
 * spring, not from a delay.
 */
const OPEN_SPRING = { damping: 15, stiffness: 170, mass: 0.9 } as const;

/** How far behind the action above starts, as a share of the dial's opening. */
const STAGGER = 0.08;

/** How far an action starts below its resting place, in points. */
const ACTION_TRAVEL = 12;

/**
 * How a glass dial's action starts: nothing, sitting on the trigger, and
 * merging with it while the two are within this distance. Scale, not
 * opacity — the material survives a zero scale and not a zero opacity. Shorter than the
 * dial's gaps, so pieces at rest stay separate and only overlapping ones
 * flow together.
 */
const RISE_FROM_SCALE = 0;
const DIAL_BLEND = 6;

/** How far into an action's arrival its label grows out of it, and from how far aside. */
const LABEL_AFTER = 0.45;
const LABEL_TRAVEL = 16;

/** A quarter turn on the trigger while the dial is open — a plus becomes a cross. */
const OPEN_ROTATION = 45;

/** How the menu is drawn: the platform's own shape, or rows with a glyph well. */
export type FabMenuAppearance = 'platform' | 'wells';

/** Which side of a menu row the glyph sits on. */
export type FabMenuIconPlacement = 'leading' | 'trailing';

/**
 * The metrics of each appearance, in points. Fixed rather than measured so
 * the panel's height — and with it the point it grows from — is known on the
 * first frame.
 */
interface MenuMetrics {
  width: number;
  radius: number;
  row: number;
  hairline: number;
  padding: number;
  icon: FabMenuIconPlacement;
}

const MENU_METRICS: Record<FabMenuAppearance, MenuMetrics> = {
  /* As wide and as round as the platform's own menus, with the glyph after
     the label and a hairline between rows, the way they draw it. */
  platform: { width: 250, radius: 26, row: 44, hairline: 1, padding: 6, icon: 'trailing' },
  /* Tighter, with the glyph leading in a tinted well and each row its own
     pill — the shape of a menu an app designed rather than the system. */
  wells: { width: 224, radius: 22, row: 48, hairline: 0, padding: 6, icon: 'leading' },
};

/**
 * How small the menu is once it has left the trigger, and how far into the
 * dial's spring it gets there.
 *
 * A closed panel has to be *nothing*, not something small. Resting at a
 * fraction of its size leaves a box above the trigger for as long as the
 * spring takes to satisfy its completion threshold — which is most of a
 * second, and is not a frame anyone would call an animation. So zero is where
 * it starts and ends, and the pop to `MENU_FROM_SCALE` happens over the first
 * sliver of the spring: the panel still reads as coming out of the button at a
 * size rather than growing from a point.
 */
const MENU_FROM_SCALE = 0.3;
const MENU_POP_AT = 0.06;

/** The gap between the panel and the trigger — the group's `gap-3`. */
const GROUP_GAP = 12;

/**
 * Where the menu grows from: the centre of the trigger, in the panel's own
 * coordinates.
 *
 * Not the panel's corner. The panel sits a gap above the trigger, and a panel
 * scaling from its own corner grows out of thin air just above the button.
 * Scaling about the trigger's centre — below the panel, and in from its
 * edge by half a button — is what makes it come out of the button.
 */
function menuOrigin(
  placement: FabPlacement,
  metrics: MenuMetrics,
  width: number,
  count: number,
  size: FabSize
): [number, number, number] {
  const height =
    metrics.padding * 2 + metrics.row * count + metrics.hairline * Math.max(0, count - 1);
  const half = SIZE_PX[size] / 2;
  const y = height + GROUP_GAP + half;
  if (placement === 'bottom-left') return [half, y, 0];
  if (placement === 'bottom-center') return [width / 2, y, 0];
  return [width - half, y, 0];
}

/** How the group lines its parts up under each placement. */
const GROUP_ALIGN: Record<FabPlacement, string> = {
  'bottom-right': 'items-end',
  'bottom-center': 'items-center',
  'bottom-left': 'items-start',
};

/** The diameter of each size, in points — the radius the material rounds itself to. */
const SIZE_PX = { sm: 44, md: 56, lg: 64 } as const;

const fabVariants = tv({
  slots: {
    root: 'items-center justify-center rounded-full bg-primary shadow-lg',
    content: 'flex-row items-center justify-center gap-2',
    label: 'font-medium text-primary-foreground',
  },
  variants: {
    size: {
      sm: { root: 'h-11 min-w-11', label: 'text-sm' },
      md: { root: 'h-14 min-w-14', label: 'text-base' },
      lg: { root: 'h-16 min-w-16', label: 'text-lg' },
    },
    /* An icon-only button is a circle, so its width is its height and it takes
       no padding. Extended, it is a stadium and the padding is what makes it
       one. */
    extended: {
      true: {},
      false: {},
    },
    variant: {
      primary: { root: 'bg-primary', label: 'text-primary-foreground' },
      secondary: { root: 'bg-secondary', label: 'text-secondary-foreground' },
      surface: { root: 'border border-border bg-popover', label: 'text-foreground' },
      destructive: {
        root: 'bg-destructive',
        label: 'text-destructive-solid-foreground',
      },
    },
    disabled: {
      true: { root: 'opacity-[0.64] shadow-none' },
    },
    /* The material replaces the fill, the border and the shadow: it draws its
       own edge, and a shadow under a translucent surface is a smudge behind it.
       Only set when the material is really being drawn — see `useGlassMaterial`. */
    glass: {
      true: { root: 'border-0 bg-transparent shadow-none' },
    },
  },
  compoundVariants: [
    /* A faded material stops being one, so a disabled glass button dims what
       sits on the material rather than the material itself. */
    { glass: true, disabled: true, class: { root: 'opacity-100', content: 'opacity-[0.64]' } },
    { extended: true, size: 'sm', class: { root: 'px-4' } },
    { extended: true, size: 'md', class: { root: 'px-5' } },
    { extended: true, size: 'lg', class: { root: 'px-6' } },
    { extended: false, size: 'sm', class: { root: 'w-11' } },
    { extended: false, size: 'md', class: { root: 'w-14' } },
    { extended: false, size: 'lg', class: { root: 'w-16' } },
  ],
  defaultVariants: {
    size: 'md',
    variant: 'primary',
    extended: false,
    glass: false,
  },
});

type FabVariantProps = VariantProps<typeof fabVariants>;

/** How big the button is. */
export type FabSize = NonNullable<FabVariantProps['size']>;
/** What the button is drawn in. */
export type FabVariant = NonNullable<FabVariantProps['variant']>;

/** The theme token each variant's icon reads against. */
const CONTENT_COLOR_VAR: Record<FabVariant, string> = {
  primary: '--color-primary-foreground',
  destructive: '--color-destructive-solid-foreground',
  secondary: '--color-secondary-foreground',
  surface: '--color-foreground',
};

/**
 * The token each variant's glyph reads in over the glass.
 *
 * The material is never tinted: a tint is a dimmer, and at any strength it
 * turns the glass back into a fill or greys it. So the glass is neither light
 * nor dark and the glyph reads in the ordinary foreground — except on
 * `destructive`, where the colour that carries meaning goes on the glyph
 * instead, the way a menu's destructive row is red text on the same panel.
 */
const GLASS_CONTENT_COLOR_VAR: Record<FabVariant, string> = {
  primary: '--color-foreground',
  destructive: '--color-destructive',
  secondary: '--color-foreground',
  surface: '--color-foreground',
};

/** Where a floating button parks itself, given its offset. */
function anchor(placement: FabPlacement, offset: number) {
  const base = { position: 'absolute' as const, bottom: offset };
  if (placement === 'bottom-left') return { ...base, left: offset };
  if (placement === 'bottom-center') return { ...base, alignSelf: 'center' as const };
  return { ...base, right: offset };
}

/* -------------------------------------------------------------------------- *
 * Fab
 * -------------------------------------------------------------------------- */

export interface FabProps
  extends Omit<AnimatedPressableProps, 'children' | 'style' | 'disabled'>,
    Omit<FabVariantProps, 'disabled'> {
  className?: string;
  /** The glyph. Sized by you — this is the one thing that should not guess. */
  icon?: ReactNode;
  /**
   * The label, which turns the circle into a stadium. Needs `extended`; a
   * label with nowhere to go is a label that gets clipped by the circle.
   */
  children?: ReactNode;
  /** Spell the action out beside the glyph. */
  extended?: boolean;
  /**
   * Pin it over the content, in a corner.
   *
   * Left out, it is an ordinary button in the flow — which is what you want
   * inside a `Fab.Group`, or when the screen already has somewhere for it to
   * sit.
   */
  placement?: FabPlacement;
  /** Distance from the edges when `placement` is set, in points. */
  offset?: number;
  /** Placement-aware view style. Press-state styling belongs in `className`. */
  style?: ViewProps['style'];
  disabled?: boolean;
  /**
   * A tick on press. Off by default — needs the optional `expo-haptics`, and
   * is silent without it.
   */
  haptics?: boolean;
  /**
   * Draw it in Liquid Glass — the material iOS 26 uses for its own floating
   * controls — instead of the variant's fill. Every variant takes the plain
   * material, with its glyph in the foreground colour and in red on
   * `destructive`. Pressed, the material swells and brightens the way the
   * platform's own glass controls do.
   *
   * Needs iOS 26 and the optional `expo-glass-effect`. Below that, on Android,
   * on web, or with Reduce Transparency on, it does nothing and the button
   * keeps its ordinary fill.
   */
  glass?: boolean;
  /** Required for an icon-only button. A lone glyph reads out as nothing. */
  accessibilityLabel?: string;
}

const FabRoot = forwardRef<View, FabProps>(
  (
    {
      className,
      icon,
      children,
      extended = false,
      placement,
      offset = DEFAULT_OFFSET,
      size,
      variant,
      disabled = false,
      haptics = false,
      glass = false,
      onPress,
      style,
      accessibilityState,
      ...props
    },
    ref
  ) => {
    const isDisabled = Boolean(disabled);
    // Asked for *and* drawable. Where the material cannot be drawn the flag
    // changes nothing, so the fill, border and shadow all stay.
    const material = useGlassMaterial() && glass;
    const resolvedVariant = variant ?? 'primary';
    const { root, content, label } = fabVariants({
      size,
      variant,
      extended: extended && !!children,
      disabled: isDisabled,
      glass: material,
    });

    const themed = useCSSVariable(
      (material ? GLASS_CONTENT_COLOR_VAR : CONTENT_COLOR_VAR)[resolvedVariant]
    );
    const contentColor = typeof themed === 'string' ? themed : undefined;

    const handlePress = useCallback<NonNullable<AnimatedPressableProps['onPress']>>(
      (event) => {
        if (haptics) selectionTick();
        onPress?.(event);
      },
      [haptics, onPress]
    );

    const pressable = (
      <AnimatedPressable
        ref={ref}
        {...props}
        accessibilityRole="button"
        // Whatever the caller says about the button — a group's trigger says
        // whether it is expanded — with the disabled state kept authoritative.
        accessibilityState={{ ...accessibilityState, disabled: isDisabled }}
        disabled={isDisabled}
        onPress={handlePress}
        // The platform animates the glass under a touch; a second scale on
        // top of it would fight it.
        pressScale={material ? 1 : undefined}
        className={material ? 'h-full w-full items-center justify-center' : root({ className })}
        style={material ? undefined : [placement ? anchor(placement, offset) : null, style]}
      >
        <View className={content()}>
          {icon}
          {extended && children ? (
            <Text
              className={label({
                className: material
                  ? resolvedVariant === 'destructive'
                    ? 'text-destructive'
                    : 'text-foreground'
                  : undefined,
              })}
            >
              {children}
            </Text>
          ) : null}
        </View>
      </AnimatedPressable>
    );

    /*
     * Drawn in glass, the material is the box and the pressable fills it. The
     * platform only tracks a touch that lands inside the glass view, and
     * tracking it is what makes the button swell and glow under the finger,
     * so the pressable has to be inside rather than under it. It rounds
     * itself to the button's own radius: the material clipped by a rounded
     * parent loses its lit edge.
     */
    return (
      <IconColorProvider color={contentColor}>
        {material ? (
          <Glass
            interactive
            variant="regular"
            radius={SIZE_PX[size ?? 'md'] / 2}
            className={root({ className })}
            style={[placement ? anchor(placement, offset) : null, style]}
          >
            {pressable}
          </Glass>
        ) : (
          pressable
        )}
      </IconColorProvider>
    );
  }
);

FabRoot.displayName = 'Fab';

/* -------------------------------------------------------------------------- *
 * Group — the speed dial
 * -------------------------------------------------------------------------- */

/** Whatever was written as a dial child, and the one prop a slot reaches for. */
type PressableChild = ReactElement<{ onPress?: (event: GestureResponderEvent) => void }>;

/**
 * What opens out of the trigger: a column of buttons, one panel of rows, or
 * the platform's own menu.
 */
export type FabGroupLayout = 'dial' | 'menu' | 'native';

/**
 * How big a hosted glyph is drawn in a platform menu row, in points.
 *
 * Stated rather than measured because it has to be: anything of ours inside
 * the native tree needs a definite size on both axes above it, and an icon
 * whose box the platform is left to work out is the crash this library has
 * already paid for twice.
 */
const NATIVE_ROW_ICON = 24;

interface FabGroupContextValue {
  /** 0 closed, 1 open. Every action reads it and its own index off it. */
  progress: SharedValue<number>;
  count: number;
  size: FabSize;
  /** The trigger's material, which the actions unfold in too. */
  glass: boolean;
  layout: FabGroupLayout;
  /** The menu's appearance and where its rows put the glyph. */
  appearance: FabMenuAppearance;
  iconPlacement: FabMenuIconPlacement;
  rowClassName?: string;
  close: () => void;
}

const FabGroupContext = createContext<FabGroupContextValue | null>(null);

function useFabGroup(part: string): FabGroupContextValue {
  const ctx = useContext(FabGroupContext);
  if (!ctx) throw new Error(`${part} must be used inside <Fab.Group>.`);
  return ctx;
}

export interface FabGroupProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** The glyph on the trigger. */
  icon?: ReactNode;
  /** The trigger's label, if it should be extended while closed. */
  label?: string;
  /** `Fab.Action` children, in the order they should unfold. */
  children?: ReactNode;
  /** Controlled open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Which corner of the *screen* the whole dial parks in. */
  placement?: FabPlacement;
  /** Distance from the screen's edges, in points. Add your safe-area inset. */
  offset?: number;
  /**
   * What opens out of the trigger. `dial`, the default, is a column of round
   * buttons with their labels beside them. `menu` is one panel of rows — a
   * label with its glyph, on the side the appearance puts it — that springs
   * out of the trigger's corner, the way the platform's own menus do.
   * `native` hands the menu to the platform: SwiftUI on iOS, Jetpack Compose
   * on Android.
   *
   * A native menu is drawn by the platform, so `className` and the theme
   * tokens do not reach it, and the rows take `label` and `systemImage` rather
   * than an `icon` element. `blur` still applies: the scrim behind the menu is
   * ours, so the page recedes the way it does behind the dial and the panel.
   *
   * On iOS the platform owns the menu's open state, so `open` and
   * `onOpenChange` do nothing there. Android's menu is controlled and honours
   * both.
   *
   * Where the platform menu cannot be drawn — on the web, or without
   * `@expo/ui` installed — this falls back to `menu`.
   */
  layout?: FabGroupLayout;
  /**
   * How a menu is drawn. `platform`, the default, is the shape the platform's
   * own menus take: a hairline between rows and the glyph after the label.
   * `wells` is tighter, with the glyph leading in a tinted well and each row
   * its own pill — a menu the app designed rather than the system.
   *
   * Menu layout only.
   */
  appearance?: FabMenuAppearance;
  /** Which side of a menu row the glyph sits on. Each appearance has its own default. */
  iconPlacement?: FabMenuIconPlacement;
  /** The menu panel's width in points. Each appearance has its own default. */
  menuWidth?: number;
  /** The menu panel's corner radius in points. Each appearance has its own default. */
  menuRadius?: number;
  /** Extra classes for the menu panel. */
  menuClassName?: string;
  /** Extra classes for every menu row. A row's own `className` comes after. */
  rowClassName?: string;
  size?: FabSize;
  variant?: FabVariant;
  disabled?: boolean;
  haptics?: boolean;
  /**
   * Draw the trigger and its actions in Liquid Glass. The same flag as on
   * `Fab`, with the same floor: iOS 26 and `expo-glass-effect`, inert
   * elsewhere.
   */
  glass?: boolean;
  /** Frost the screen behind the open dial instead of dimming it. */
  blur?: boolean;
  /** Required — the trigger is a lone glyph until it is opened. */
  accessibilityLabel?: string;
  /**
   * Turn the trigger's glyph a quarter circle while the dial is open.
   *
   * On by default, and it is doing real work when the glyph is a plus: the
   * same mark becomes a cross, which says "this closes now" without a second
   * icon that has to be swapped in. Turn it off for a glyph that means
   * something at one angle only.
   */
  rotateOnOpen?: boolean;
}

/**
 * A trigger with actions behind it.
 *
 * The scrim and the dial are two absolutely positioned siblings written into
 * the group's own parent — the scrim first, so the dial is drawn over it. Both
 * are laid out against that parent, which is why a group belongs in the
 * screen's root container: it is what `offset` is measured from and what the
 * scrim covers.
 */
const FabGroup = forwardRef<View, FabGroupProps>(
  (
    {
      className,
      icon,
      label,
      children,
      open: openProp,
      onOpenChange,
      placement = 'bottom-right',
      offset = DEFAULT_OFFSET,
      layout = 'dial',
      appearance = 'platform',
      iconPlacement,
      menuWidth,
      menuRadius,
      menuClassName,
      rowClassName,
      size = 'md',
      variant,
      disabled = false,
      haptics = false,
      glass = false,
      blur = false,
      rotateOnOpen = true,
      accessibilityLabel,
      style,
      ...props
    },
    ref
  ) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const open = openProp ?? internalOpen;
    // Asked for *and* drawable, decided once here so the trigger, the actions
    // and their motion all agree; where the material cannot be drawn the flag
    // is inert everywhere rather than in the trigger alone.
    const material = useGlassMaterial() && glass;

    const setOpen = useCallback(
      (next: boolean) => {
        if (openProp === undefined) setInternalOpen(next);
        onOpenChange?.(next);
      },
      [openProp, onOpenChange]
    );

    const actions = Children.toArray(children).filter(isValidElement) as PressableChild[];
    /*
     * The count, pulled out as a plain number before any worklet sees it.
     *
     * A worklet captures every variable it *references*, whole — so reading
     * `actions.length` inside one would drag the array of React elements onto
     * the UI thread with it, and an element holds a fibre, which cannot be
     * serialised. The error that produces names neither this file nor this
     * line, so: never reach through an object into a worklet.
     */
    const actionCount = actions.length;

    /*
     * The platform's menu, when one was asked for and the toolkit is there.
     *
     * Resolved before anything below reads `layout`, because a native menu
     * that cannot be drawn is not an error — it falls back to the panel, and
     * every decision after this one has to be made against the layout that is
     * really being drawn rather than the one that was requested.
     */
    const swiftMenu = layout === 'native' ? getSwiftUIMenu() : null;
    const composeMenu = layout === 'native' && !swiftMenu ? getComposeMenu() : null;
    const resolvedLayout: FabGroupLayout =
      layout === 'native' && !swiftMenu && !composeMenu ? 'menu' : layout;

    /*
     * One shared value for the whole dial rather than one per action.
     *
     * The stagger is a function of the action's index, applied on the UI
     * thread inside each action's own style — so opening is a single timing
     * driving every row, and there is no chain of JavaScript timeouts to get
     * out of step with itself when the dial is closed halfway through opening.
     */
    /*
     * The actions stay mounted while the spring runs back down, so closing is
     * the opening in reverse rather than a cut. `closing` is set the moment
     * `open` drops and cleared by the spring when it comes to rest; the
     * mounted-only-while-open rule below still holds once it has.
     */
    const [closing, setClosing] = useState(false);
    // Noted during render rather than in an effect: an effect lands a frame
    // after the render that dropped `open`, and that frame would have no
    // actions in it — a blink, and a remount of the material mid-flight.
    const [wasOpen, setWasOpen] = useState(open);
    if (wasOpen !== open) {
      setWasOpen(open);
      if (!open) setClosing(true);
    }
    const settle = useCallback(() => setClosing(false), []);
    const progress = useDerivedValue<number>(
      () =>
        withSpring(open ? 1 : 0, OPEN_SPRING, (finished) => {
          if (finished && !open) runOnJS(settle)();
        }),
      [open, settle]
    );
    const present = open || closing;

    const rotation = useAnimatedStyle(() => ({
      transform: [
        { rotate: `${interpolate(progress.value, [0, 1], [0, OPEN_ROTATION])}deg` },
      ],
    }));

    const close = useCallback(() => setOpen(false), [setOpen]);

    const context = useMemo<FabGroupContextValue>(
      () => ({
        progress,
        count: actionCount,
        size,
        glass: material,
        layout: resolvedLayout,
        appearance,
        iconPlacement: iconPlacement ?? MENU_METRICS[appearance].icon,
        rowClassName,
        close,
      }),
      [progress, actionCount, size, material, resolvedLayout, appearance, iconPlacement, rowClassName, close]
    );

    const toggle = useCallback(() => {
      if (haptics) selectionTick();
      setOpen(!open);
    }, [haptics, open, setOpen]);

    // An open dial owns the back button: back should shut it, not leave it
    // standing over the screen underneath.
    useBackHandler(open, close);

    const themedDestructive = useCSSVariable('--color-destructive');

    const Group = material && resolvedLayout === 'dial' ? GlassContainer : View;

    /*
     * The trigger as the platform hosts it.
     *
     * Sized here rather than left to the platform, on both axes where both are
     * known. An axis handed to `matchContents` is written back to for good, and
     * a hosted view with nothing definite above it is the crash this library
     * has already paid for twice — so a circle states its diameter, and only an
     * extended button's width, which is its label's, is the platform's to
     * measure.
     */
    const triggerSize = SIZE_PX[size];
    const triggerExtended = !!label;
    const triggerFrame = triggerExtended
      ? { height: triggerSize }
      : { width: triggerSize, height: triggerSize };

    const nativeTrigger = (
      <View
        // On iOS the menu owns the tap: a pressable in front of it would eat
        // the touch and the menu would never open. Android's is controlled, so
        // there the button is what opens it.
        pointerEvents={swiftMenu ? 'none' : 'auto'}
        style={triggerFrame}
      >
        <FabRoot
          icon={icon}
          extended={triggerExtended}
          size={size}
          variant={variant}
          disabled={disabled}
          glass={glass}
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ disabled, expanded: open }}
          onPress={composeMenu ? toggle : undefined}
        >
          {label}
        </FabRoot>
      </View>
    );

    /*
     * The screen behind an open platform menu, frosted the way it is behind
     * the dial and the panel — the page is what recedes, and a native menu
     * over an untouched page reads as a control belonging to something else.
     *
     * It closes on a tap, which is the safety net rather than the mechanism.
     * The platform dismisses its own menu from its own window, so this never
     * sees that tap and never competes for it; what it catches is the next
     * one. Menu content is not promised an `onDisappear`, and a frosted page
     * with no way back would be worse than no scrim at all.
     */
    const nativeScrim = open ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={close}
        style={StyleSheet.absoluteFill}
      >
        <Scrim blur={blur} dimClassName="bg-black/32" />
      </Pressable>
    ) : null;

    /*
     * SwiftUI's menu. The trigger goes through the `label` slot, which takes a
     * view as readily as a string — so the button stays ours and only the menu
     * is the platform's.
     *
     * The open state is not passed and cannot be: SwiftUI owns it. `open` and
     * `onOpenChange` are inert on this path, which is stated on the prop.
     */
    if (swiftMenu) {
      const { Host, RNHostView, Menu, Button } = swiftMenu;
      const swiftModifiers = getSwiftUIModifiers();

      /*
       * What each row carries beyond its label.
       *
       * The first one also carries the menu's open state. SwiftUI's menu owns
       * that state and reports nothing about it, but it builds its content
       * only when it presents it — so the first row appearing is the menu
       * appearing, and that is what puts the screen behind it under the
       * scrim.
       */
      const itemModifiers = (item: Partial<FabActionProps>, index: number) => {
        const list: unknown[] = [];
        if (item.disabled && swiftModifiers?.disabled) {
          list.push(swiftModifiers.disabled(true));
        }
        if (index === 0 && swiftModifiers?.onAppear) {
          list.push(swiftModifiers.onAppear(() => setOpen(true)));
        }
        /*
         * Every row carries the teardown, not just the first.
         *
         * The one that reports the menu opening is enough to raise the scrim,
         * but taking it down cannot rest on a single view: whichever row
         * SwiftUI tears down first has to be able to say so, or a menu
         * dismissed from anywhere else leaves the page frosted behind it.
         */
        if (swiftModifiers?.onDisappear) {
          list.push(swiftModifiers.onDisappear(() => setOpen(false)));
        }
        return list.length > 0 ? list : undefined;
      };

      return (
        <>
          {nativeScrim}
          <NativeHost
            host={Host}
            matchContents={triggerExtended ? { horizontal: true } : false}
            ignoreSafeArea="keyboard"
            style={[anchor(placement, offset), triggerFrame, style]}
            {...props}
          >
            <Menu label={<RNHostView matchContents>{nativeTrigger}</RNHostView>}>
              {actions.map((action, index) => {
                const item = action.props as Partial<FabActionProps>;
                return (
                  <Button
                    key={index}
                    label={item.label ?? ''}
                    systemImage={item.systemImage}
                    role={item.destructive ? 'destructive' : 'default'}
                    // Picking a row closes the menu, so the scrim has to come
                    // down with it rather than waiting to be told the content
                    // went away.
                    onPress={
                      item.disabled
                        ? undefined
                        : () => {
                            close();
                            item.onPress?.();
                          }
                    }
                    modifiers={itemModifiers(item, index)}
                  />
                );
              })}
            </Menu>
          </NativeHost>
        </>
      );
    }

    /*
     * Compose's dropdown menu — the same instruction, a different control.
     *
     * This one takes the open state rather than owning it, so the group's own
     * state drives it and `open`/`onOpenChange` work here. Its rows take a text
     * slot rather than a label prop, and a glyph of ours goes in the leading
     * slot at a stated size.
     */
    if (composeMenu) {
      const {
        Host,
        RNHostView,
        Text: ComposeText,
        DropdownMenu,
        DropdownMenuItem,
      } = composeMenu;
      const destructiveColor =
        typeof themedDestructive === 'string' ? themedDestructive : undefined;

      return (
        <>
          {nativeScrim}
          <NativeHost
            host={Host}
            matchContents={triggerExtended ? { horizontal: true } : false}
            ignoreSafeArea="keyboard"
            style={[anchor(placement, offset), triggerFrame, style]}
            {...props}
          >
            <DropdownMenu expanded={open} onDismissRequest={close}>
              <DropdownMenu.Trigger>
                <RNHostView matchContents>{nativeTrigger}</RNHostView>
              </DropdownMenu.Trigger>
              <DropdownMenu.Items>
                {actions.map((action, index) => {
                  const item = action.props as Partial<FabActionProps>;
                  return (
                    <DropdownMenuItem
                      key={index}
                      enabled={!item.disabled}
                      elementColors={
                        item.destructive && destructiveColor
                          ? { textColor: destructiveColor }
                          : undefined
                      }
                      onClick={() => {
                        close();
                        item.onPress?.();
                      }}
                    >
                      {item.icon ? (
                        <DropdownMenuItem.LeadingIcon>
                          <RNHostView
                            matchContents
                            style={{ width: NATIVE_ROW_ICON, height: NATIVE_ROW_ICON }}
                          >
                            <View
                              style={{
                                width: NATIVE_ROW_ICON,
                                height: NATIVE_ROW_ICON,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {item.icon}
                            </View>
                          </RNHostView>
                        </DropdownMenuItem.LeadingIcon>
                      ) : null}
                      <DropdownMenuItem.Text>
                        <ComposeText>{item.label ?? ''}</ComposeText>
                      </DropdownMenuItem.Text>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenu.Items>
            </DropdownMenu>
          </NativeHost>
        </>
      );
    }

    /*
     * Two absolutely positioned siblings, scrim first, both in the group's own
     * parent — which is why a group belongs in the screen's root container.
     *
     * This used to go through a portal, and the portal was the bug. Portalled
     * content is mounted at the app root, above the router, and is removed only
     * when the component that declared it unmounts. A stack keeps the screen
     * you pushed from mounted, so a group declared on that screen carried on
     * drawing over every screen after it — open or closed, since the trigger
     * travelled through the portal too.
     *
     * Ordering is the reason the portal was reached for in the first place: a
     * scrim that covers the screen must not cover the dial it belongs to. As
     * siblings it comes out right for free — the scrim is written first and the
     * dial after it, and the later sibling draws on top.
     *
     * Nothing remounts when the dial opens. The trigger is in the same place in
     * the tree either way, so opening adds the scrim and the actions and leaves
     * the button alone.
     */
    return (
      <>
        {open ? (
          // Catches the tap that closes the dial, and says it is modal.
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={close}
            style={StyleSheet.absoluteFill}
          >
            <Scrim blur={blur} dimClassName="bg-black/32" />
          </Pressable>
        ) : null}

        <FabGroupContext.Provider value={context}>
          {/* A glass dial's pieces merge while they overlap — the actions are
              one blob with the trigger until they rise clear of it. */}
          <Group
            ref={ref}
            spacing={material && resolvedLayout === 'dial' ? DIAL_BLEND : undefined}
            className={cn(
              resolvedLayout === 'menu' ? GROUP_ALIGN[placement] : 'items-end',
              'gap-3',
              className
            )}
            style={[anchor(placement, offset), style]}
            {...props}
          >
            {/* Mounted only while open, and while closing: a column of
                actions kept alive behind the trigger would still be in the
                accessibility tree, and a screen reader would walk into four
                buttons nobody can see. */}
            {present && resolvedLayout === 'menu' ? (
              <FabMenu
                progress={progress}
                placement={placement}
                size={size}
                glass={material}
                appearance={appearance}
                width={menuWidth}
                radius={menuRadius}
                className={menuClassName}
              >
                {actions}
              </FabMenu>
            ) : null}
            {present && resolvedLayout === 'dial'
              ? actions.map((action, index) => (
                  <FabActionSlot key={index} index={index}>
                    {action}
                  </FabActionSlot>
                ))
              : null}

            <FabRoot
              icon={
                rotateOnOpen ? (
                  <Animated.View style={rotation}>{icon}</Animated.View>
                ) : (
                  icon
                )
              }
              extended={!!label && !open}
              size={size}
              variant={variant}
              disabled={disabled}
              glass={glass}
              accessibilityLabel={accessibilityLabel}
              accessibilityState={{ disabled, expanded: open }}
              onPress={toggle}
            >
              {label}
            </FabRoot>
          </Group>
        </FabGroupContext.Provider>
      </>
    );
  }
);

FabGroup.displayName = 'Fab.Group';

/**
 * The menu panel: one surface, springing out of the trigger's corner.
 *
 * It scales up from that corner rather than fading in, and the two are not
 * interchangeable: the material cannot be faded — at zero it stops drawing
 * and does not come back — and a panel growing out of the button is what
 * says the button opened. The rows inside fade in on the dial's own stagger,
 * nearest the trigger first.
 */
function FabMenu({
  progress,
  placement,
  size,
  glass,
  appearance,
  width: widthProp,
  radius: radiusProp,
  className,
  children,
}: {
  /** The dial's own 0-to-1, so the panel and its unmount cannot disagree. */
  progress: SharedValue<number>;
  placement: FabPlacement;
  size: FabSize;
  glass: boolean;
  appearance: FabMenuAppearance;
  width?: number;
  radius?: number;
  className?: string;
  children: PressableChild[];
}) {
  const metrics = MENU_METRICS[appearance];
  const width = widthProp ?? metrics.width;
  const radius = radiusProp ?? metrics.radius;

  /*
   * The panel rides the group's own spring rather than one of its own.
   *
   * It used to run a second, faster spring, and closing raced it against the
   * one that decides when the panel unmounts: the panel reached its collapsed
   * scale early and then sat there, a small box above the trigger, until the
   * slower spring came to rest and took it away. One value cannot race
   * itself, so the panel is gone exactly when the dial says it is.
   *
   * Scale and not opacity, for the same reason the dial's actions are: the
   * material survives a zero scale and does not come back from a zero
   * opacity.
   */
  const style = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          progress.value,
          [0, MENU_POP_AT, 1],
          [0, MENU_FROM_SCALE, 1],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  return (
    <Animated.View
      style={[
        style,
        { transformOrigin: menuOrigin(placement, metrics, width, children.length, size) },
      ]}
    >
      <Glass
        radius={radius}
        // Without the material the panel is the same surface a popover is.
        fallbackClassName="border border-border bg-popover shadow-lg"
        className={cn(appearance === 'wells' ? 'p-1.5' : 'py-1.5', glass ? null : 'shadow-lg', className)}
        style={{ width }}
      >
        {children.map((action, index) => (
          <FabActionSlot key={index} index={index} separator={metrics.hairline > 0 && index > 0}>
            {action}
          </FabActionSlot>
        ))}
      </Glass>
    </Animated.View>
  );
}

/**
 * How far along its own arrival an action is, from the dial's one progress.
 *
 * The stagger runs bottom-up: the action nearest the trigger arrives first,
 * which is the order a hand travelling away from the button meets them in.
 */
function slotProgress(progress: number, count: number, index: number): number {
  'worklet';
  // A short lag per action rather than a full turn each: the actions leave
  // the trigger nearly together and settle nearly together, so a later one
  // does not rise through a slot an earlier one is already sitting in.
  const from = (count - 1 - index) * STAGGER;
  const to = from + 1 - STAGGER * Math.max(0, count - 1);
  // The spring's overshoot past its target is passed on to every action, so
  // a button arrives with a little bounce rather than stopping dead. It is
  // added on top of the clamped window rather than read through it: a window
  // that ends before the dial's does would otherwise leave its action past
  // its slot for good.
  const within = interpolate(progress, [from, Math.min(1, to)], [0, 1], Extrapolation.CLAMP);
  return within + Math.max(0, progress - 1);
}

/** The same progress, decelerating into 1 and never past it — for size and opacity. */
function settled(t: number): number {
  'worklet';
  return Easing.out(Easing.cubic)(Math.min(1, Math.max(0, t)));
}

/** Which slot an action is in — what it needs to know to animate itself. */
const FabSlotContext = createContext<number>(0);

/**
 * One action's slot in the unfolding.
 *
 * The stagger runs bottom-up: the action nearest the trigger arrives first,
 * which is the order a hand travelling away from the button meets them in.
 */
function FabActionSlot({
  index,
  separator = false,
  children,
}: {
  index: number;
  /** A hairline above the slot — a menu row's, never a dial button's. */
  separator?: boolean;
  children: PressableChild;
}) {
  const { progress, count, glass, layout, close } = useFabGroup('Fab.Action');
  // A menu's rows are content on one panel, not glass of their own, so they
  // may fade; a dial's actions are each their own material.
  const material = glass && layout === 'dial';

  /*
   * Whatever is in the slot closes the dial when it is pressed.
   *
   * `Fab.Action` does this itself, but a plain `Fab` written as a child is a
   * perfectly reasonable thing to reach for and knows nothing about the dial it
   * is in. Left alone it runs its action — navigating, usually — with the dial
   * still open behind it. Wrapping the handler here covers both, and closing
   * twice is closing once.
   */
  const { onPress } = children.props;
  const child = onPress
    ? cloneElement(children, {
        onPress: (event: GestureResponderEvent) => {
          close();
          onPress(event);
        },
      })
    : children;

  /*
   * A glass action never fades. The material stops drawing under an ancestor
   * at zero opacity and does not come back when the opacity does, so a fade
   * from zero is a button that sometimes never appears — whichever ones got
   * their first frame at zero. A glass dial's action animates its own parts
   * instead, rising out of the trigger; see `Fab.Action`. The slot only
   * fades a plain action, where it reads better on a flat surface.
   */
  const style = useAnimatedStyle(() => {
    if (material) return {};
    const t = slotProgress(progress.value, count, index);
    return {
      opacity: settled(t),
      transform: [{ translateY: interpolate(t, [0, 1], [ACTION_TRAVEL, 0]) }],
    };
  });

  return (
    <FabSlotContext.Provider value={index}>
      <Animated.View style={style}>
        {separator ? <View className="mx-4 h-px bg-border" /> : null}
        {child}
      </Animated.View>
    </FabSlotContext.Provider>
  );
}

/* -------------------------------------------------------------------------- *
 * Action
 * -------------------------------------------------------------------------- */

export interface FabActionProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** The glyph. */
  icon?: ReactNode;
  /**
   * The glyph for a native menu row, as an SF Symbol name.
   *
   * `layout="native"` only, and iOS only — SwiftUI names its symbols rather
   * than taking a view for them, so `icon` cannot cross over. Ignored
   * everywhere else, so a group can carry both and be right on either path.
   */
  systemImage?: string;
  /** What it does, beside the glyph. A column of unlabelled circles is a quiz. */
  label?: string;
  onPress?: () => void;
  disabled?: boolean;
  /** Draws it in the destructive colour, for the one that removes something. */
  destructive?: boolean;
  /** Extra classes for the label — the chip in a dial, the row's text in a menu. */
  labelClassName?: string;
}

/**
 * One choice in an open dial: a small round button with its name beside it.
 *
 * The label is a chip of its own rather than text on the background, because
 * the background is whatever the screen behind the scrim happens to be and
 * plain text over it is legible on some screens and not others.
 *
 * Pressing one closes the dial before running the action. Leaving it open over
 * whatever the action just did is the wrong default: the dial is a menu, and a
 * menu that stays up after a choice reads as the choice not having registered.
 */
const FabAction = forwardRef<View, FabActionProps>(
  (
    {
      className,
      icon,
      // Read off the element by a native group, never rendered here.
      systemImage: _systemImage,
      label,
      onPress,
      disabled = false,
      destructive = false,
      labelClassName,
      ...props
    },
    ref
  ) => {
    const { progress, count, size, glass, layout, appearance, iconPlacement, rowClassName, close } =
      useFabGroup('Fab.Action');
    const index = useContext(FabSlotContext);
    const [pressed, setPressed] = useState(false);

    /*
     * A glass dial's action rises out of the trigger.
     *
     * It starts small and sitting on the button, and springs up to its slot
     * on the dial's stagger; inside the group's glass container the two
     * materials are one blob until it pulls free. The distance is known from
     * the fixed sizes, so nothing is measured. The label follows once the
     * button is most of the way there, sliding in from the button's side —
     * it is glass too, so it moves rather than fades.
     */
    const actionSize: FabSize = size === 'lg' ? 'md' : 'sm';
    const rise =
      (count - 1 - index) * (SIZE_PX[actionSize] + GROUP_GAP) +
      GROUP_GAP +
      SIZE_PX[size] / 2 +
      SIZE_PX[actionSize] / 2;
    // Travel follows the spring, overshoot and all; size settles without it.
    const buttonStyle = useAnimatedStyle(() => {
      const t = slotProgress(progress.value, count, index);
      return {
        transform: [
          { translateY: interpolate(t, [0, 1], [rise, 0]) },
          { scale: interpolate(settled(t), [0, 1], [RISE_FROM_SCALE, 1]) },
        ],
      };
    });
    const chipStyle = useAnimatedStyle(() => {
      const t = slotProgress(progress.value, count, index);
      // Rides up with its button, then grows out of it once the button is
      // most of the way to its slot.
      const late = settled(interpolate(t, [LABEL_AFTER, 1], [0, 1], 'clamp'));
      return {
        transform: [
          { translateY: interpolate(t, [0, 1], [rise, 0]) },
          { translateX: interpolate(late, [0, 1], [LABEL_TRAVEL, 0]) },
          { scale: interpolate(late, [0, 1], [RISE_FROM_SCALE, 1]) },
        ],
      };
    });

    const handlePress = useCallback(() => {
      close();
      onPress?.();
    }, [close, onPress]);

    const themedRow = useCSSVariable(destructive ? '--color-destructive' : '--color-foreground');
    const rowColor = typeof themedRow === 'string' ? themedRow : undefined;

    /*
     * In a menu the action is a row on the panel. The press tints the row
     * rather than scaling it — a row that shrinks inside a panel that does
     * not looks detached from it — and the tint is React state rather than a
     * worklet because it is a colour toggle, not a curve.
     */
    if (layout === 'menu') {
      const wells = appearance === 'wells';
      const glyph = wells ? (
        <View
          className={cn(
            'h-8 w-8 items-center justify-center rounded-full',
            destructive ? 'bg-destructive/15' : 'bg-foreground/10'
          )}
        >
          {icon}
        </View>
      ) : (
        icon
      );
      return (
        <IconColorProvider color={rowColor}>
          <AnimatedPressable
            ref={ref}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={handlePress}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            pressScale={1}
            className={cn(
              'flex-row items-center gap-3',
              wells ? 'h-12 rounded-2xl px-2' : 'h-11 px-4',
              iconPlacement === 'trailing' ? 'justify-between' : null,
              pressed && 'bg-foreground/10',
              disabled && 'opacity-40',
              rowClassName,
              className
            )}
            {...props}
          >
            {iconPlacement === 'leading' ? glyph : null}
            <Text
              className={cn('shrink', destructive ? 'text-destructive' : 'text-foreground', labelClassName)}
              numberOfLines={1}
            >
              {label}
            </Text>
            {iconPlacement === 'trailing' ? glyph : null}
          </AnimatedPressable>
        </IconColorProvider>
      );
    }

    return (
      <View className="flex-row items-center justify-end gap-3" {...props}>
        {label ? (
          // The chip is in the same material as the button beside it, so a
          // glass dial is glass all the way across and not glass with paper
          // labels. Without the material it is the popover surface it was.
          glass ? (
            <Animated.View style={chipStyle}>
              <Glass radius={8} fallbackClassName="bg-popover shadow-sm" className="px-2.5 py-1">
                <Text size="sm" className={cn('text-foreground', labelClassName)}>
                  {label}
                </Text>
              </Glass>
            </Animated.View>
          ) : (
            <View className="rounded-lg bg-popover px-2.5 py-1 shadow-sm">
              <Text size="sm" className={cn('text-foreground', labelClassName)}>
                {label}
              </Text>
            </View>
          )
        ) : null}
        <Animated.View style={glass ? buttonStyle : undefined}>
          <FabRoot
            ref={ref}
            icon={icon}
            // A step down from the trigger, so the trigger stays the one that
            // leads even while the dial it opened is on screen.
            size={actionSize}
            variant={destructive ? 'destructive' : 'surface'}
            disabled={disabled}
            glass={glass}
            accessibilityLabel={label}
            onPress={handlePress}
            className={className}
          />
        </Animated.View>
      </View>
    );
  }
);

FabAction.displayName = 'Fab.Action';

export const Fab = Object.assign(FabRoot, {
  Group: FabGroup,
  Action: FabAction,
});
