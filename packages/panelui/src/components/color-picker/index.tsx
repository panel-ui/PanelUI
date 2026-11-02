/**
 * ColorPicker — a colour chosen by dragging, not by typing.
 *
 * The controls are the colour model made visible: a square where saturation
 * runs across and brightness runs up, under a hue picked on its own scale.
 * That is why the component stores hue, saturation, value and alpha rather
 * than the string it hands back — a fully black colour is `#000` whatever hue
 * and saturation produced it, so a picker that stored the output would lose
 * the thumb the moment you dragged into a corner and could not put it back.
 *
 * Nothing about a drag crosses to JavaScript. The four channels are shared
 * values; the hue behind the square, both thumb fills and the preview swatch
 * are `backgroundColor`s computed from them on the UI thread, and the
 * translucency ramp on the alpha track is a gradient used as a mask over a
 * solid fill rather than a gradient whose colours have to be re-declared from
 * React on every frame. The picked colour bridges back on change and again on
 * release, the same as any other input here.
 *
 * ```tsx
 * <ColorPicker defaultValue="#22c55e" onValueCommit={setBrand}>
 *   <ColorPicker.Area />
 *   <ColorPicker.Hue />
 *   <ColorPicker.Preview showValue />
 * </ColorPicker>
 * ```
 *
 * Composition is the API: a picker is whichever of the parts you put in it, so
 * a control with no alpha is one that has no `ColorPicker.Alpha`, not one with
 * a prop turned off.
 *
 * ## Folding it away
 *
 * A picker is a page's worth of controls in service of one value, and that
 * value is read far more often than it is changed — so `presentation` puts the
 * controls behind the row that reads it out:
 *
 * ```tsx
 * <ColorPicker value={accent} onValueChange={setAccent} presentation="popover">
 *   <ColorPicker.Trigger>
 *     <ColorPicker.Field label="Accent" />
 *   </ColorPicker.Trigger>
 *   <ColorPicker.Content>
 *     <ColorPicker.Area />
 *     <ColorPicker.Hue />
 *   </ColorPicker.Content>
 * </ColorPicker>
 * ```
 *
 * `Content` re-provides the picker's context around what it holds, because the
 * panel is portalled above the rest of the screen and is therefore no longer
 * below the picker in the tree by the time the parts inside it go looking.
 *
 * Works controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`).
 */
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Path,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { useDirectionSign } from '../../hooks/use-direction';
import { Text } from '../../primitives/text';
import {
  formatColor,
  hsvToCss,
  hsvToHex,
  parseColor,
  type ColorFormat,
  type HsvaColor,
} from '../../utils/color';
import { cn } from '../../utils/cn';
import { selectionTick } from '../../utils/haptics';
import { Popover, type PopoverContentProps } from '../popover';
import { enabledColorPickerAction } from './color-picker-accessibility';
import type { ViewRef } from '../../primitives/refs';

/** Settles a thumb that was moved by something other than a finger. */
const TIMING = { duration: 140 } as const;

/**
 * The hue scale, drawn once as a gradient rather than sampled per pixel. Six
 * stops plus the wrap back to red — fewer would bend the ramp, more would not
 * change it, because hue is piecewise linear in RGB and these are the corners.
 */
const HUE_STOPS: readonly [string, string, ...string[]] = [
  '#ff0000',
  '#ffff00',
  '#00ff00',
  '#00ffff',
  '#0000ff',
  '#ff00ff',
  '#ff0000',
];

/** The same ramp for a right-to-left picker, where hue runs the other way. */
const HUE_STOPS_FLIPPED = [...HUE_STOPS].reverse() as unknown as readonly [
  string,
  string,
  ...string[],
];

/** How far one screen-reader increment moves a channel. */
const NUDGE = 0.05;
/** How far one screen-reader increment moves the hue, in degrees. */
const HUE_NUDGE = 10;

const colorPickerVariants = tv({
  slots: {
    root: 'w-full gap-3',
    area: 'overflow-hidden rounded-2xl border border-border',
    wheel: 'overflow-hidden rounded-full border border-border',
    // Both thumbs are a white ring around a fill of the colour under them, so
    // the ring reads against the dark end of the square as well as the light.
    // Two points, not three: the ring is there to separate the fill from what
    // is behind it, and any more of it starts hiding the colour it is showing.
    thumb: 'absolute start-0 top-0 rounded-full border-2 border-white shadow-md',
    thumbFill: 'flex-1 rounded-full',
    track: 'w-full overflow-hidden rounded-full border border-border',
    swatches: 'flex-row flex-wrap items-center gap-2',
    swatch: 'items-center justify-center rounded-full',
    swatchRing: 'absolute rounded-full border-2 border-foreground',
    preview: 'flex-row items-center gap-3',
    previewSwatch: 'overflow-hidden rounded-full border border-border',
    previewValue: 'text-sm font-medium text-foreground',
    // The header strip: a name on the leading edge, the value and a swatch on
    // the trailing one.
    field: 'w-full flex-row items-center gap-3 rounded-2xl bg-surface px-4 py-3',
    fieldLabel: 'flex-1 text-base font-medium text-foreground',
    fieldValue: 'text-base font-normal text-muted-foreground',
    fieldSwatch: 'overflow-hidden rounded-full border border-border',
    // The readout above a track — the number on one side, what it names on the
    // other.
    channel: 'w-full flex-row items-center justify-between gap-3',
    channelValue: 'text-base font-normal text-muted-foreground',
    channelLabel: 'text-base font-medium text-foreground',
  },
  variants: {
    size: {
      sm: {},
      md: {},
      lg: {},
    },
    disabled: {
      true: { root: 'opacity-50' },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

type ColorPickerVariantProps = VariantProps<typeof colorPickerVariants>;
export type ColorPickerSize = NonNullable<ColorPickerVariantProps['size']>;

/** Height of the saturation/brightness square, per size. */
const AREA_HEIGHT: Record<ColorPickerSize, number> = { sm: 140, md: 180, lg: 220 };
/**
 * Height of a channel track, per size. Tall enough that the knob sits *in* the
 * track rather than on top of a hairline — a slider whose thumb overhangs a
 * thin rule reads as a control laid over a decoration.
 */
const TRACK_HEIGHT: Record<ColorPickerSize, number> = { sm: 16, md: 20, lg: 24 };
/** Thumb diameter on a channel track — wider than the track, so it reads as a knob. */
const TRACK_THUMB: Record<ColorPickerSize, number> = { sm: 22, md: 26, lg: 30 };
/** Thumb diameter on the square. */
const AREA_THUMB: Record<ColorPickerSize, number> = { sm: 20, md: 24, lg: 28 };
/** Preset swatch diameter. */
const SWATCH: Record<ColorPickerSize, number> = { sm: 26, md: 30, lg: 34 };
/** The swatch beside the value in `Preview`. */
const PREVIEW_SWATCH: Record<ColorPickerSize, number> = { sm: 28, md: 36, lg: 44 };
/** The smaller swatch on the end of the `Field` strip. */
const FIELD_SWATCH: Record<ColorPickerSize, number> = { sm: 22, md: 28, lg: 34 };
/** Diameter of the wheel, per size. */
const WHEEL_SIZE: Record<ColorPickerSize, number> = { sm: 180, md: 240, lg: 300 };

interface ColorPickerContextValue {
  hue: SharedValue<number>;
  saturation: SharedValue<number>;
  brightness: SharedValue<number>;
  opacity: SharedValue<number>;
  /** Called from a worklet with the channels that produced the change. */
  emit: (h: number, s: number, v: number, a: number, commit: boolean) => void;
  format: ColorFormat;
  disabled: boolean;
  haptics: boolean;
  size: ColorPickerSize;
}

const ColorPickerContext = createContext<ColorPickerContextValue | null>(null);

function useColorPicker(part: string) {
  const ctx = useContext(ColorPickerContext);
  if (!ctx) throw new Error(`${part} must be used inside <ColorPicker>.`);
  return ctx;
}

/** Where a picker starts when it is handed a value it cannot read. */
const FALLBACK: HsvaColor = { h: 0, s: 1, v: 1, a: 1 };

/** How the controls get onto the screen. */
export type ColorPickerPresentation = 'inline' | 'popover' | 'bottom-sheet';

/**
 * Floor for the panel's width when it takes the trigger's. A swatch row is a
 * narrow trigger, and a square you drag on is not a control that survives being
 * squeezed to match one.
 */
const CONTENT_MIN_WIDTH = 268;

export interface ColorPickerProps extends Omit<ColorPickerVariantProps, 'disabled'> {
  className?: string;
  /** Controlled colour. Leave unset and pass `defaultValue` to run uncontrolled. */
  value?: string;
  /** Starting colour when uncontrolled. */
  defaultValue?: string;
  /**
   * Fires on every frame of a drag — cheap updates only. The string is written
   * in `format`.
   */
  onValueChange?: (color: string) => void;
  /** Fires once when a drag ends. The place for expensive side effects. */
  onValueCommit?: (color: string) => void;
  /**
   * How the colour is written on the way out. `hex` gains an `#rrggbbaa` alpha
   * pair, and the other two switch to their `a` forms, only when the colour is
   * actually translucent.
   */
  format?: ColorFormat;
  disabled?: boolean;
  /**
   * A tick when a drag ends and when a preset is picked. Off by default — needs
   * the optional `expo-haptics`, and is silent without it. There is no tick
   * during a drag: a colour has no steps to cross, so a tick could only be a
   * buzz proportional to speed.
   */
  haptics?: boolean;
  /**
   * How the controls get onto the screen.
   *
   * `inline` stacks them where they are written, and is the default. The other
   * two put them behind a `ColorPicker.Trigger` and draw them in a
   * `ColorPicker.Content` — which is the arrangement a colour usually wants,
   * since a picker is a page's worth of controls in service of one value that
   * is looked at far more often than it is changed.
   */
  presentation?: ColorPickerPresentation;
  /** Controlled open state of the panel. Ignored by `inline`. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The parts, in the order they should stack. */
  children: ReactNode;
}

const ColorPickerRoot = forwardRef<ViewRef, ColorPickerProps>(
  (
    {
      className,
      value: valueProp,
      defaultValue = '#ff0000',
      onValueChange,
      onValueCommit,
      format = 'hex',
      disabled = false,
      haptics = false,
      size = 'md',
      presentation = 'inline',
      open,
      onOpenChange,
      children,
    },
    ref
  ) => {
    const slots = colorPickerVariants({ size, disabled });

    // Parsed once. After this the channels are the truth and the prop is only
    // consulted when it changes to something we did not ourselves emit.
    const initial = useMemo(
      () => parseColor(valueProp ?? defaultValue) ?? FALLBACK,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );

    const hue = useSharedValue(initial.h);
    const saturation = useSharedValue(initial.s);
    const brightness = useSharedValue(initial.v);
    const opacity = useSharedValue(initial.a);

    const changeRef = useRef(onValueChange);
    changeRef.current = onValueChange;
    const commitRef = useRef(onValueCommit);
    commitRef.current = onValueCommit;
    const formatRef = useRef(format);
    formatRef.current = format;

    /*
     * The last string this picker produced. A controlled parent hands it
     * straight back, and re-parsing it into the channels mid-drag would fight
     * the finger: the round trip is lossy at the edges of the square, so the
     * thumb would be pulled a pixel back on every frame.
     */
    const lastEmitted = useRef<string | null>(null);

    const emit = useCallback((h: number, s: number, v: number, a: number, commit: boolean) => {
      const next = formatColor({ h, s, v, a }, formatRef.current);
      lastEmitted.current = next;
      changeRef.current?.(next);
      if (commit) commitRef.current?.(next);
    }, []);

    // Keep the channels in step with a controlled value changed elsewhere. Set
    // rather than animated: an external change is not a gesture, and springing
    // the hue from 350° to 10° would run the long way round the wheel.
    useEffect(() => {
      if (valueProp === undefined) return;
      if (valueProp === lastEmitted.current) return;
      const parsed = parseColor(valueProp);
      if (!parsed) return;
      hue.value = parsed.h;
      saturation.value = parsed.s;
      brightness.value = parsed.v;
      opacity.value = parsed.a;
    }, [valueProp, hue, saturation, brightness, opacity]);

    const context = useMemo<ColorPickerContextValue>(
      () => ({
        hue,
        saturation,
        brightness,
        opacity,
        emit,
        format,
        disabled,
        haptics,
        size: size ?? 'md',
      }),
      [hue, saturation, brightness, opacity, emit, format, disabled, haptics, size]
    );

    if (presentation !== 'inline') {
      return (
        <ColorPickerContext.Provider value={context}>
          <Popover open={open} onOpenChange={onOpenChange} presentation={presentation}>
            {children}
          </Popover>
        </ColorPickerContext.Provider>
      );
    }

    return (
      <ColorPickerContext.Provider value={context}>
        <View ref={ref} className={slots.root({ className })} collapsable={false}>
          {children}
        </View>
      </ColorPickerContext.Provider>
    );
  }
);

ColorPickerRoot.displayName = 'ColorPicker';

/* ------------------------------------------------------------------ *
 * Trigger and Content — the picker folded away behind the value.
 * ------------------------------------------------------------------ */

export interface ColorPickerTriggerProps {
  /** One element, cloned with an `onPress` that opens the panel. */
  children: ReactElement<{ onPress?: (...args: unknown[]) => void }>;
}

/**
 * What you press to open the picker. `ColorPicker.Field` is the obvious child —
 * it already reads out the colour it would let you change — but anything that
 * takes an `onPress` will do.
 */
function ColorPickerTrigger({ children }: ColorPickerTriggerProps) {
  useColorPicker('ColorPicker.Trigger');
  return <Popover.Trigger>{children}</Popover.Trigger>;
}

ColorPickerTrigger.displayName = 'ColorPicker.Trigger';

export interface ColorPickerContentProps extends PopoverContentProps {}

/**
 * The panel the controls are drawn in.
 *
 * It re-provides the picker's context around its children, and has to: the
 * panel is rendered through a portal, above everything else on the screen, so
 * by the time the parts inside it look for the picker they are no longer
 * anywhere below it in the tree. Without this the first `ColorPicker.Area`
 * inside a popover would throw.
 *
 * Defaults to the trigger's width, floored, so a panel opened from a labelled
 * strip lines up under it rather than announcing itself as a different object.
 */
function ColorPickerContent({
  className,
  width = 'trigger',
  minWidth = CONTENT_MIN_WIDTH,
  children,
  ...props
}: ColorPickerContentProps) {
  const ctx = useColorPicker('ColorPicker.Content');

  return (
    <Popover.Content
      width={width}
      minWidth={minWidth}
      className={cn('gap-3', className)}
      {...props}
    >
      <ColorPickerContext.Provider value={ctx}>{children}</ColorPickerContext.Provider>
    </Popover.Content>
  );
}

ColorPickerContent.displayName = 'ColorPicker.Content';

/* ------------------------------------------------------------------ *
 * The checkerboard behind anything translucent.
 * ------------------------------------------------------------------ */

/**
 * The "nothing here" backing. A tiled SVG pattern rather than a grid of views:
 * a 340-point track at eight-point squares is 170 squares, and every one of
 * them would be a view laid out by Yoga on the frame the picker mounts.
 */
function Checkerboard({ square = 7 }: { square?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  // The pattern is themed rather than the usual grey-on-white: a checkerboard
  // is a statement that there is nothing there, and "nothing" is the page.
  const light = String(useCSSVariable('--color-background') ?? '#ffffff');
  const dark = String(useCSSVariable('--color-muted') ?? '#e5e5e5');

  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern
          id={id}
          width={square * 2}
          height={square * 2}
          patternUnits="userSpaceOnUse"
        >
          <Rect width={square * 2} height={square * 2} fill={light} />
          <Rect width={square} height={square} fill={dark} />
          <Rect x={square} y={square} width={square} height={square} fill={dark} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ *
 * Area — saturation across, brightness up.
 * ------------------------------------------------------------------ */

export interface ColorPickerAreaProps {
  className?: string;
  /** Height of the square in points. Defaults to the picker's size. */
  height?: number;
  /** Extra classes for the draggable thumb. */
  thumbClassName?: string;
}

const ColorPickerArea = forwardRef<ViewRef, ColorPickerAreaProps>(
  ({ className, height, thumbClassName }, ref) => {
    const ctx = useColorPicker('ColorPicker.Area');
    const slots = colorPickerVariants({ size: ctx.size });
    const sign = useDirectionSign();

    const boxHeight = height ?? AREA_HEIGHT[ctx.size];
    const thumbSize = AREA_THUMB[ctx.size];
    const width = useSharedValue(0);

    /*
     * The screen reader's copy of the value. Updated when a drag ends rather
     * than while it runs: a `now` that re-rendered on every frame would be a
     * hundred announcements for one gesture, and nobody is listening to the
     * middle of a drag.
     */
    const [announced, setAnnounced] = useState(() => ({
      s: ctx.saturation.value,
      v: ctx.brightness.value,
    }));

    const settle = useCallback((s: number, v: number) => {
      setAnnounced({ s, v });
    }, []);

    const apply = (x: number, y: number, commit: boolean) => {
      'worklet';
      const w = Math.max(width.value, 1);
      // `x` is measured from the physical left edge either way, so a
      // right-to-left picker counts saturation back from the far side.
      const along = sign === 1 ? x : w - x;
      const s = Math.min(Math.max(along / w, 0), 1);
      const v = 1 - Math.min(Math.max(y / boxHeight, 0), 1);
      ctx.saturation.value = s;
      ctx.brightness.value = v;
      runOnJS(ctx.emit)(ctx.hue.value, s, v, ctx.opacity.value, commit);
      if (commit) {
        runOnJS(settle)(s, v);
        if (ctx.haptics) runOnJS(selectionTick)();
      }
    };

    // Both axes belong to the square, so it takes the gesture on touch-down
    // rather than after a threshold — a pad that needed ten points of travel
    // before it responded would feel broken.
    const pan = Gesture.Pan()
      .enabled(!ctx.disabled)
      .minDistance(0)
      .shouldCancelWhenOutside(false)
      .onBegin((event) => apply(event.x, event.y, false))
      .onUpdate((event) => apply(event.x, event.y, false))
      .onFinalize((event) => apply(event.x, event.y, true));

    const hueStyle = useAnimatedStyle(() => ({
      backgroundColor: hsvToCss(ctx.hue.value, 1, 1, 1),
    }));

    const thumbStyle = useAnimatedStyle(() => {
      // A transform is not laid out, so Yoga does not mirror it — the thumb
      // has to travel the other way itself.
      const along = ctx.saturation.value * width.value - thumbSize / 2;
      return {
        transform: [
          { translateX: along * sign },
          { translateY: (1 - ctx.brightness.value) * boxHeight - thumbSize / 2 },
        ],
      };
    });

    const thumbFillStyle = useAnimatedStyle(() => ({
      backgroundColor: hsvToCss(
        ctx.hue.value,
        ctx.saturation.value,
        ctx.brightness.value,
        1
      ),
    }));

    const nudge = (channel: 'saturation' | 'brightness', dir: 1 | -1) => {
      const next = Math.min(Math.max(ctx[channel].value + dir * NUDGE, 0), 1);
      ctx[channel].value = withTiming(next, TIMING);
      const s = channel === 'saturation' ? next : ctx.saturation.value;
      const v = channel === 'brightness' ? next : ctx.brightness.value;
      settle(s, v);
      ctx.emit(ctx.hue.value, s, v, ctx.opacity.value, true);
    };

    const onAccessibilityAction = (event: AccessibilityActionEvent) => {
      const action = enabledColorPickerAction(
        event.nativeEvent.actionName,
        ctx.disabled
      );
      if (action === 'increment') nudge('saturation', 1);
      else if (action === 'decrement') nudge('saturation', -1);
      else if (action === 'brighter') nudge('brightness', 1);
      else if (action === 'darker') nudge('brightness', -1);
    };

    return (
      <GestureDetector gesture={pan}>
        {/* The outer box is not clipped, so the thumb can sit centred on a
            colour at the very edge of the square instead of being pushed
            inside it. Only the gradients below are clipped to the radius. */}
        <View
          ref={ref}
          style={{ height: boxHeight }}
          className="w-full"
          onLayout={(event: LayoutChangeEvent) => {
            width.value = event.nativeEvent.layout.width;
          }}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Saturation and brightness"
          accessibilityState={{ disabled: ctx.disabled }}
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(announced.s * 100),
            text: `${Math.round(announced.s * 100)}% saturation, ${Math.round(
              announced.v * 100
            )}% brightness`,
          }}
          accessibilityActions={[
            { name: 'increment' },
            { name: 'decrement' },
            { name: 'brighter', label: 'Brighter' },
            { name: 'darker', label: 'Darker' },
          ]}
          onAccessibilityAction={onAccessibilityAction}
        >
          <View style={StyleSheet.absoluteFill} className={slots.area({ className })}>
            <Animated.View style={[StyleSheet.absoluteFill, hueStyle]} />
            <LinearGradient
              colors={['rgba(255,255,255,1)', 'rgba(255,255,255,0)']}
              start={{ x: sign === 1 ? 0 : 1, y: 0.5 }}
              end={{ x: sign === 1 ? 1 : 0, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,1)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>

          <Animated.View
            pointerEvents="none"
            style={[thumbStyle, { width: thumbSize, height: thumbSize }]}
            className={slots.thumb({ className: thumbClassName })}
          >
            <Animated.View style={thumbFillStyle} className={slots.thumbFill()} />
          </Animated.View>
        </View>
      </GestureDetector>
    );
  }
);

ColorPickerArea.displayName = 'ColorPicker.Area';

/* ------------------------------------------------------------------ *
 * The two channel tracks share everything but what is drawn in them.
 * ------------------------------------------------------------------ */

interface ChannelTrackProps {
  /** What fills the track — a hue ramp, or a masked translucency ramp. */
  children: ReactNode;
  gesture: ReturnType<typeof Gesture.Race>;
  thumbStyle: ReturnType<typeof useAnimatedStyle<ViewStyle>>;
  thumbFillStyle: ReturnType<typeof useAnimatedStyle<ViewStyle>>;
  onLayout: (event: LayoutChangeEvent) => void;
  size: ColorPickerSize;
  className?: string;
  thumbClassName?: string;
  label: string;
  disabled: boolean;
  accessibilityValue: { min: number; max: number; now: number; text: string };
  onAccessibilityAction: (event: AccessibilityActionEvent) => void;
  innerRef: React.ForwardedRef<View>;
}

function ChannelTrack({
  children,
  gesture,
  thumbStyle,
  thumbFillStyle,
  onLayout,
  size,
  className,
  thumbClassName,
  label,
  disabled,
  accessibilityValue,
  onAccessibilityAction,
  innerRef,
}: ChannelTrackProps) {
  const slots = colorPickerVariants({ size });
  const trackHeight = TRACK_HEIGHT[size];
  const thumbSize = TRACK_THUMB[size];

  return (
    <GestureDetector gesture={gesture}>
      {/* The row is as tall as the thumb so an overhanging knob has somewhere
          to be drawn whole; the track inside it is the shorter, clipped part. */}
      <View
        ref={innerRef}
        style={{ height: thumbSize }}
        className="w-full justify-center"
        onLayout={onLayout}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        accessibilityValue={accessibilityValue}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAccessibilityAction}
      >
        <View style={{ height: trackHeight }} className={slots.track({ className })}>
          {children}
        </View>
        <Animated.View
          pointerEvents="none"
          style={[thumbStyle, { width: thumbSize, height: thumbSize }]}
          className={slots.thumb({ className: thumbClassName })}
        >
          <Animated.View style={thumbFillStyle} className={slots.thumbFill()} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

/**
 * Maps a touch anywhere on a track to a fraction of it, accounting for the
 * thumb's own width: the thumb travels between the two edges rather than off
 * them, so the usable run is the track minus one thumb.
 */
function trackFraction(x: number, width: number, thumbSize: number, sign: number) {
  'worklet';
  const along = sign === 1 ? x : width - x;
  const travel = Math.max(width - thumbSize, 1);
  return Math.min(Math.max((along - thumbSize / 2) / travel, 0), 1);
}

/* ------------------------------------------------------------------ *
 * Hue.
 * ------------------------------------------------------------------ */

export interface ColorPickerHueProps {
  className?: string;
  /** Extra classes for the draggable thumb. */
  thumbClassName?: string;
}

const ColorPickerHue = forwardRef<ViewRef, ColorPickerHueProps>(
  ({ className, thumbClassName }, ref) => {
    const ctx = useColorPicker('ColorPicker.Hue');
    const sign = useDirectionSign();
    const thumbSize = TRACK_THUMB[ctx.size];
    const width = useSharedValue(0);
    const [announced, setAnnounced] = useState(() => Math.round(ctx.hue.value));

    const settle = useCallback((h: number) => setAnnounced(Math.round(h)), []);

    const apply = (x: number, commit: boolean) => {
      'worklet';
      const h = trackFraction(x, width.value, thumbSize, sign) * 360;
      ctx.hue.value = h;
      runOnJS(ctx.emit)(
        h,
        ctx.saturation.value,
        ctx.brightness.value,
        ctx.opacity.value,
        commit
      );
      if (commit) {
        runOnJS(settle)(h);
        if (ctx.haptics) runOnJS(selectionTick)();
      }
    };

    /*
     * A thin horizontal control inside a scroller: the pan waits for six points
     * of sideways travel so a vertical flick starting on the track still
     * scrolls the page, and the tap handles the case where there was no travel
     * at all.
     */
    const pan = Gesture.Pan()
      .enabled(!ctx.disabled)
      .activeOffsetX([-6, 6])
      .shouldCancelWhenOutside(false)
      .onUpdate((event) => apply(event.x, false))
      .onFinalize((event) => apply(event.x, true));

    const tap = Gesture.Tap()
      .enabled(!ctx.disabled)
      .maxDuration(250)
      .onEnd((event) => apply(event.x, true));

    const gesture = Gesture.Race(pan, tap);

    const thumbStyle = useAnimatedStyle(() => {
      const travel = Math.max(width.value - thumbSize, 0);
      return { transform: [{ translateX: (ctx.hue.value / 360) * travel * sign }] };
    });

    const thumbFillStyle = useAnimatedStyle(() => ({
      backgroundColor: hsvToCss(ctx.hue.value, 1, 1, 1),
    }));

    const nudge = (dir: 1 | -1) => {
      const next = Math.min(Math.max(ctx.hue.value + dir * HUE_NUDGE, 0), 360);
      ctx.hue.value = withTiming(next, TIMING);
      settle(next);
      ctx.emit(next, ctx.saturation.value, ctx.brightness.value, ctx.opacity.value, true);
    };

    return (
      <ChannelTrack
        innerRef={ref}
        gesture={gesture}
        thumbStyle={thumbStyle}
        thumbFillStyle={thumbFillStyle}
        onLayout={(event) => {
          width.value = event.nativeEvent.layout.width;
        }}
        size={ctx.size}
        className={className}
        thumbClassName={thumbClassName}
        label="Hue"
        disabled={ctx.disabled}
        accessibilityValue={{ min: 0, max: 360, now: announced, text: `${announced}°` }}
        onAccessibilityAction={(event) => {
          const action = enabledColorPickerAction(
            event.nativeEvent.actionName,
            ctx.disabled
          );
          if (action === 'increment') nudge(1);
          else if (action === 'decrement') nudge(-1);
        }}
      >
        <LinearGradient
          colors={sign === 1 ? HUE_STOPS : HUE_STOPS_FLIPPED}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </ChannelTrack>
    );
  }
);

ColorPickerHue.displayName = 'ColorPicker.Hue';

/* ------------------------------------------------------------------ *
 * Alpha.
 * ------------------------------------------------------------------ */

export interface ColorPickerAlphaProps {
  className?: string;
  /** Extra classes for the draggable thumb. */
  thumbClassName?: string;
}

const ColorPickerAlpha = forwardRef<ViewRef, ColorPickerAlphaProps>(
  ({ className, thumbClassName }, ref) => {
    const ctx = useColorPicker('ColorPicker.Alpha');
    const sign = useDirectionSign();
    const thumbSize = TRACK_THUMB[ctx.size];
    const width = useSharedValue(0);
    const [announced, setAnnounced] = useState(() => Math.round(ctx.opacity.value * 100));

    const settle = useCallback((a: number) => setAnnounced(Math.round(a * 100)), []);

    const apply = (x: number, commit: boolean) => {
      'worklet';
      const a = trackFraction(x, width.value, thumbSize, sign);
      ctx.opacity.value = a;
      runOnJS(ctx.emit)(
        ctx.hue.value,
        ctx.saturation.value,
        ctx.brightness.value,
        a,
        commit
      );
      if (commit) {
        runOnJS(settle)(a);
        if (ctx.haptics) runOnJS(selectionTick)();
      }
    };

    const pan = Gesture.Pan()
      .enabled(!ctx.disabled)
      .activeOffsetX([-6, 6])
      .shouldCancelWhenOutside(false)
      .onUpdate((event) => apply(event.x, false))
      .onFinalize((event) => apply(event.x, true));

    const tap = Gesture.Tap()
      .enabled(!ctx.disabled)
      .maxDuration(250)
      .onEnd((event) => apply(event.x, true));

    const gesture = Gesture.Race(pan, tap);

    const thumbStyle = useAnimatedStyle(() => {
      const travel = Math.max(width.value - thumbSize, 0);
      return { transform: [{ translateX: ctx.opacity.value * travel * sign }] };
    });

    const solidStyle = useAnimatedStyle(() => ({
      backgroundColor: hsvToCss(
        ctx.hue.value,
        ctx.saturation.value,
        ctx.brightness.value,
        1
      ),
    }));

    const thumbFillStyle = useAnimatedStyle(() => ({
      backgroundColor: hsvToCss(
        ctx.hue.value,
        ctx.saturation.value,
        ctx.brightness.value,
        ctx.opacity.value
      ),
    }));

    const nudge = (dir: 1 | -1) => {
      const next = Math.min(Math.max(ctx.opacity.value + dir * NUDGE, 0), 1);
      ctx.opacity.value = withTiming(next, TIMING);
      settle(next);
      ctx.emit(ctx.hue.value, ctx.saturation.value, ctx.brightness.value, next, true);
    };

    return (
      <ChannelTrack
        innerRef={ref}
        gesture={gesture}
        thumbStyle={thumbStyle}
        thumbFillStyle={thumbFillStyle}
        onLayout={(event) => {
          width.value = event.nativeEvent.layout.width;
        }}
        size={ctx.size}
        className={className}
        thumbClassName={thumbClassName}
        label="Opacity"
        disabled={ctx.disabled}
        accessibilityValue={{
          min: 0,
          max: 100,
          now: announced,
          text: `${announced}%`,
        }}
        onAccessibilityAction={(event) => {
          const action = enabledColorPickerAction(
            event.nativeEvent.actionName,
            ctx.disabled
          );
          if (action === 'increment') nudge(1);
          else if (action === 'decrement') nudge(-1);
        }}
      >
        <Checkerboard />
        {/*
         * The ramp is a gradient used as a *mask* over a solid fill of the
         * current colour, not a gradient between a transparent and an opaque
         * copy of it. A gradient's colours are props, so the second form would
         * have to be re-declared from React on every frame of a drag on the
         * square above; the mask never changes, and only the fill under it does
         * — which is a `backgroundColor` the UI thread can write itself.
         */}
        <MaskedView
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
          maskElement={
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,1)']}
              start={{ x: sign === 1 ? 0 : 1, y: 0.5 }}
              end={{ x: sign === 1 ? 1 : 0, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          }
        >
          <Animated.View style={[StyleSheet.absoluteFill, solidStyle]} />
        </MaskedView>
      </ChannelTrack>
    );
  }
);

ColorPickerAlpha.displayName = 'ColorPicker.Alpha';

/* ------------------------------------------------------------------ *
 * Preview.
 * ------------------------------------------------------------------ */

export interface ColorPickerPreviewProps {
  className?: string;
  /**
   * Print the colour beside the swatch, in the picker's `format`. The string
   * is built on the UI thread and only crosses to JavaScript when it differs
   * from the last one, so a drag that is not changing the rounded value costs
   * nothing.
   */
  showValue?: boolean;
  /** Extra classes for the swatch. */
  swatchClassName?: string;
  /** Extra classes for the printed value. */
  valueClassName?: string;
  /** Anything to put after the value — a copy button, a label. */
  children?: ReactNode;
}

const ColorPickerPreview = forwardRef<ViewRef, ColorPickerPreviewProps>(
  ({ className, showValue = false, swatchClassName, valueClassName, children }, ref) => {
    const ctx = useColorPicker('ColorPicker.Preview');
    const slots = colorPickerVariants({ size: ctx.size });
    const diameter = PREVIEW_SWATCH[ctx.size];

    const [printed, setPrinted] = useState(() =>
      formatColor(
        {
          h: ctx.hue.value,
          s: ctx.saturation.value,
          v: ctx.brightness.value,
          a: ctx.opacity.value,
        },
        ctx.format
      )
    );

    const format = ctx.format;
    useAnimatedReaction(
      () =>
        formatColor(
          {
            h: ctx.hue.value,
            s: ctx.saturation.value,
            v: ctx.brightness.value,
            a: ctx.opacity.value,
          },
          format
        ),
      (current, previous) => {
        if (current !== previous) runOnJS(setPrinted)(current);
      },
      [format]
    );

    const fillStyle = useAnimatedStyle(() => ({
      backgroundColor: hsvToCss(
        ctx.hue.value,
        ctx.saturation.value,
        ctx.brightness.value,
        ctx.opacity.value
      ),
    }));

    return (
      <View ref={ref} className={slots.preview({ className })}>
        <View
          style={{ width: diameter, height: diameter }}
          className={slots.previewSwatch({ className: swatchClassName })}
        >
          <Checkerboard square={5} />
          <Animated.View style={[StyleSheet.absoluteFill, fillStyle]} />
        </View>
        {showValue ? (
          <Text className={slots.previewValue({ className: valueClassName })}>
            {printed}
          </Text>
        ) : null}
        {children}
      </View>
    );
  }
);

ColorPickerPreview.displayName = 'ColorPicker.Preview';

/* ------------------------------------------------------------------ *
 * Swatches.
 * ------------------------------------------------------------------ */

export interface ColorPickerSwatchesProps {
  className?: string;
  /** The presets, in any format `ColorPicker` can read. */
  colors: string[];
  /** Diameter of one swatch in points. Defaults to the picker's size. */
  swatchSize?: number;
  /** Extra classes for one swatch. */
  swatchClassName?: string;
}

const ColorPickerSwatches = forwardRef<ViewRef, ColorPickerSwatchesProps>(
  ({ className, colors, swatchSize, swatchClassName }, ref) => {
    const ctx = useColorPicker('ColorPicker.Swatches');
    const slots = colorPickerVariants({ size: ctx.size });
    const diameter = swatchSize ?? SWATCH[ctx.size];

    // Unreadable strings are dropped here rather than rendered as black: a row
    // of presets with a mystery black one in it is worse than a shorter row.
    const parsed = useMemo(
      () =>
        colors
          .map((raw) => ({ raw, color: parseColor(raw) }))
          .filter((entry): entry is { raw: string; color: HsvaColor } => entry.color !== null),
      [colors]
    );

    return (
      <View ref={ref} className={slots.swatches({ className })}>
        {parsed.map((entry, index) => (
          <Swatch
            key={`${entry.raw}-${index}`}
            color={entry.color}
            diameter={diameter}
            className={swatchClassName}
            ctx={ctx}
            slots={slots}
          />
        ))}
      </View>
    );
  }
);

ColorPickerSwatches.displayName = 'ColorPicker.Swatches';

function Swatch({
  color,
  diameter,
  className,
  ctx,
  slots,
}: {
  color: HsvaColor;
  diameter: number;
  className?: string;
  ctx: ColorPickerContextValue;
  slots: ReturnType<typeof colorPickerVariants>;
}) {
  const hex = hsvToHex(color.h, color.s, color.v, color.a);

  /*
   * Selected is an exact match on the written colour rather than a distance
   * between two sets of channels. A near-black has an arbitrary hue and a
   * meaningless saturation, so a per-channel comparison marks two visually
   * identical blacks as different and two different hues of black as the same.
   */
  const ringStyle = useAnimatedStyle(() => {
    const current = hsvToHex(
      ctx.hue.value,
      ctx.saturation.value,
      ctx.brightness.value,
      ctx.opacity.value
    );
    return { opacity: withTiming(current === hex ? 1 : 0, { duration: 120 }) };
  });

  const onPress = () => {
    ctx.hue.value = color.h;
    ctx.saturation.value = color.s;
    ctx.brightness.value = color.v;
    ctx.opacity.value = color.a;
    ctx.emit(color.h, color.s, color.v, color.a, true);
    if (ctx.haptics) selectionTick();
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={ctx.disabled}
      accessibilityRole="button"
      accessibilityLabel={hex}
      style={{ width: diameter, height: diameter }}
      className={slots.swatch({ className })}
    >
      <View
        style={{ width: diameter, height: diameter }}
        className="absolute overflow-hidden rounded-full"
      >
        {color.a < 1 ? <Checkerboard square={4} /> : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: hex }]} />
      </View>
      {/* The ring sits outside the fill, so a swatch the same colour as the
          page still reads as selected. */}
      <Animated.View
        pointerEvents="none"
        style={[ringStyle, { width: diameter + 6, height: diameter + 6 }]}
        className={slots.swatchRing()}
      />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ *
 * Field — the strip above the controls: what is being picked, and what
 * it currently is.
 * ------------------------------------------------------------------ */

export interface ColorPickerFieldProps {
  className?: string;
  /** What the colour is for — "Accent", "Background", a layer name. */
  label?: string;
  /**
   * Print the current colour beside the swatch, in the picker's `format`.
   * On by default: the strip exists to say what the colour *is*, and a swatch
   * alone cannot be read out, copied down or typed into a design tool.
   */
  showValue?: boolean;
  /** Extra classes for the swatch. */
  swatchClassName?: string;
  /**
   * Makes the strip pressable, and a button to a screen reader.
   *
   * Mostly you do not pass this yourself: `ColorPicker.Trigger` clones the
   * strip with one, which is what turns the row into the thing that opens the
   * picker.
   */
  onPress?: (...args: unknown[]) => void;
  /** Anything to put after the swatch — a copy button, a reset. */
  children?: ReactNode;
}

/**
 * A header for the picker below it.
 *
 * The value it prints is built on the UI thread and only crosses to
 * JavaScript when the rounded string actually changes, the same as `Preview`.
 * A drag through a hundred frames of the same hex costs one render.
 */
const ColorPickerField = forwardRef<ViewRef, ColorPickerFieldProps>(
  ({ className, label, showValue = true, swatchClassName, onPress, children }, ref) => {
    const ctx = useColorPicker('ColorPicker.Field');
    const slots = colorPickerVariants({ size: ctx.size });
    const diameter = FIELD_SWATCH[ctx.size];

    const read = useCallback(
      () =>
        formatColor(
          {
            h: ctx.hue.value,
            s: ctx.saturation.value,
            v: ctx.brightness.value,
            a: ctx.opacity.value,
          },
          ctx.format
        ),
      // Shared values are stable objects; `format` is the only real dependency.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [ctx.format]
    );

    const [printed, setPrinted] = useState(read);

    const format = ctx.format;
    useAnimatedReaction(
      () =>
        formatColor(
          {
            h: ctx.hue.value,
            s: ctx.saturation.value,
            v: ctx.brightness.value,
            a: ctx.opacity.value,
          },
          format
        ),
      (current, previous) => {
        if (current !== previous) runOnJS(setPrinted)(current);
      },
      [format]
    );

    const fillStyle = useAnimatedStyle(() => ({
      backgroundColor: hsvToCss(
        ctx.hue.value,
        ctx.saturation.value,
        ctx.brightness.value,
        ctx.opacity.value
      ),
    }));

    // Pressable only when it has somewhere to go. A row that highlights under
    // a finger and then does nothing is a worse lie than a row that does not
    // react at all.
    const Row = onPress ? Pressable : View;

    return (
      <Row
        ref={ref}
        onPress={onPress}
        disabled={onPress ? ctx.disabled : undefined}
        className={slots.field({ className })}
        // One thing being read out, not three: a label, a value and a swatch
        // announced separately are three stops that each say a third of it.
        accessible
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={label ? `${label}, ${printed}` : printed}
      >
        {label ? <Text className={slots.fieldLabel()}>{label}</Text> : null}
        {showValue ? (
          <Text className={slots.fieldValue()}>{printed.toUpperCase()}</Text>
        ) : null}
        <View
          style={{ width: diameter, height: diameter }}
          className={slots.fieldSwatch({ className: swatchClassName })}
        >
          {/* Only behind a translucent colour — a checkerboard under an opaque
              swatch is a pattern nobody can see, drawn every frame. */}
          <Checkerboard square={4} />
          <Animated.View style={[StyleSheet.absoluteFill, fillStyle]} />
        </View>
        {children}
      </Row>
    );
  }
);

ColorPickerField.displayName = 'ColorPicker.Field';

/* ------------------------------------------------------------------ *
 * Channel — the readout that names the track under it.
 * ------------------------------------------------------------------ */

/** Which channel a readout is reading. */
export type ColorPickerChannel = 'hue' | 'saturation' | 'brightness' | 'alpha';

/** What each channel is called, and how its number is written. */
const CHANNEL_LABEL: Record<ColorPickerChannel, string> = {
  hue: 'Hue',
  saturation: 'Saturation',
  brightness: 'Brightness',
  alpha: 'Opacity',
};

export interface ColorPickerChannelProps {
  className?: string;
  /** Which channel to read. */
  channel: ColorPickerChannel;
  /** Overrides the channel's own name. */
  label?: string;
  /**
   * Writes the number yourself. Receives degrees for `hue` and a percentage
   * for the other three, both already rounded.
   */
  format?: (value: number) => string;
}

/**
 * The line above a track: the number on the leading edge, what it names on the
 * trailing one.
 *
 * The number is the one thing in this component that has to reach JavaScript
 * during a drag, because text cannot be written from a worklet. It is rounded
 * first and only sent when the rounded value changes, so a slow drag across a
 * hue track sends 360 updates rather than one per frame.
 */
const ColorPickerChannelReadout = forwardRef<ViewRef, ColorPickerChannelProps>(
  ({ className, channel, label, format }, ref) => {
    const ctx = useColorPicker('ColorPicker.Channel');
    const slots = colorPickerVariants({ size: ctx.size });

    const source =
      channel === 'hue'
        ? ctx.hue
        : channel === 'saturation'
          ? ctx.saturation
          : channel === 'brightness'
            ? ctx.brightness
            : ctx.opacity;

    const [value, setValue] = useState(() =>
      Math.round(channel === 'hue' ? source.value : source.value * 100)
    );

    useAnimatedReaction(
      () => Math.round(channel === 'hue' ? source.value : source.value * 100),
      (current, previous) => {
        if (current !== previous) runOnJS(setValue)(current);
      },
      [channel]
    );

    const text = format
      ? format(value)
      : channel === 'hue'
        ? `${value}°`
        : `${value}%`;

    return (
      <View ref={ref} className={slots.channel({ className })}>
        <Text className={slots.channelValue()}>{text}</Text>
        <Text className={slots.channelLabel()}>{label ?? CHANNEL_LABEL[channel]}</Text>
      </View>
    );
  }
);

ColorPickerChannelReadout.displayName = 'ColorPicker.Channel';

/* ------------------------------------------------------------------ *
 * Brightness — the third channel, as a track.
 * ------------------------------------------------------------------ */

export interface ColorPickerBrightnessProps {
  className?: string;
  /** Extra classes for the draggable thumb. */
  thumbClassName?: string;
}

/**
 * Black to the colour at full brightness.
 *
 * The square carries saturation and brightness together, so a picker built
 * around it never needs this. A wheel carries hue and saturation instead, and
 * leaves brightness with nowhere to live — this is where it goes.
 */
const ColorPickerBrightness = forwardRef<ViewRef, ColorPickerBrightnessProps>(
  ({ className, thumbClassName }, ref) => {
    const ctx = useColorPicker('ColorPicker.Brightness');
    const sign = useDirectionSign();
    const thumbSize = TRACK_THUMB[ctx.size];
    const width = useSharedValue(0);
    const [announced, setAnnounced] = useState(() =>
      Math.round(ctx.brightness.value * 100)
    );

    const settle = useCallback((v: number) => setAnnounced(Math.round(v * 100)), []);

    /*
     * The ramp's far end is the current hue at full brightness, so it has to be
     * re-declared from React when the hue moves. Unlike the hue ramp — which is
     * every hue and therefore never changes — this one is only two colours, so
     * rebuilding it is a two-element array rather than a gradient recompile.
     */
    const [hueEnd, setHueEnd] = useState(() =>
      hsvToCss(ctx.hue.value, ctx.saturation.value, 1, 1)
    );

    useAnimatedReaction(
      () => hsvToCss(ctx.hue.value, ctx.saturation.value, 1, 1),
      (current, previous) => {
        if (current !== previous) runOnJS(setHueEnd)(current);
      }
    );

    const apply = (x: number, commit: boolean) => {
      'worklet';
      const v = trackFraction(x, width.value, thumbSize, sign);
      ctx.brightness.value = v;
      runOnJS(ctx.emit)(ctx.hue.value, ctx.saturation.value, v, ctx.opacity.value, commit);
      if (commit) {
        runOnJS(settle)(v);
        if (ctx.haptics) runOnJS(selectionTick)();
      }
    };

    const pan = Gesture.Pan()
      .enabled(!ctx.disabled)
      .activeOffsetX([-6, 6])
      .shouldCancelWhenOutside(false)
      .onUpdate((event) => apply(event.x, false))
      .onFinalize((event) => apply(event.x, true));

    const tap = Gesture.Tap()
      .enabled(!ctx.disabled)
      .maxDuration(250)
      .onEnd((event) => apply(event.x, true));

    const gesture = Gesture.Race(pan, tap);

    const thumbStyle = useAnimatedStyle(() => {
      const travel = Math.max(width.value - thumbSize, 0);
      return { transform: [{ translateX: ctx.brightness.value * travel * sign }] };
    });

    const thumbFillStyle = useAnimatedStyle(() => ({
      backgroundColor: hsvToCss(
        ctx.hue.value,
        ctx.saturation.value,
        ctx.brightness.value,
        1
      ),
    }));

    const nudge = (dir: 1 | -1) => {
      const next = Math.min(Math.max(ctx.brightness.value + dir * NUDGE, 0), 1);
      ctx.brightness.value = withTiming(next, TIMING);
      settle(next);
      ctx.emit(ctx.hue.value, ctx.saturation.value, next, ctx.opacity.value, true);
    };

    return (
      <ChannelTrack
        innerRef={ref}
        gesture={gesture}
        thumbStyle={thumbStyle}
        thumbFillStyle={thumbFillStyle}
        onLayout={(event) => {
          width.value = event.nativeEvent.layout.width;
        }}
        size={ctx.size}
        className={className}
        thumbClassName={thumbClassName}
        label="Brightness"
        disabled={ctx.disabled}
        accessibilityValue={{
          min: 0,
          max: 100,
          now: announced,
          text: `${announced}%`,
        }}
        onAccessibilityAction={(event) => {
          const action = enabledColorPickerAction(
            event.nativeEvent.actionName,
            ctx.disabled
          );
          if (action === 'increment') nudge(1);
          else if (action === 'decrement') nudge(-1);
        }}
      >
        <LinearGradient
          colors={sign === 1 ? ['#000000', hueEnd] : [hueEnd, '#000000']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </ChannelTrack>
    );
  }
);

ColorPickerBrightness.displayName = 'ColorPicker.Brightness';

/* ------------------------------------------------------------------ *
 * Wheel — hue around, saturation out.
 * ------------------------------------------------------------------ */

/**
 * How many wedges the hue ring is cut into.
 *
 * There is no conic gradient here to draw a hue ring with, so it is
 * approximated by solid wedges. Three degrees each is under a pixel of colour
 * step at any size this is drawn at, and the wedges are given a hair of
 * overlap so the seams between them cannot show as lighter lines.
 */
const WHEEL_WEDGES = 120;
const WHEEL_OVERLAP = 0.6;

/** Radius of the drawing, in the wheel's own viewBox units. */
const WHEEL_R = 50;

/** The hue ring, built once — it is the same wheel in every picker. */
const WHEEL_PATHS = Array.from({ length: WHEEL_WEDGES }, (_, index) => {
  const step = 360 / WHEEL_WEDGES;
  const from = index * step;
  const to = from + step + WHEEL_OVERLAP;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const x1 = WHEEL_R + WHEEL_R * Math.cos(rad(from));
  const y1 = WHEEL_R + WHEEL_R * Math.sin(rad(from));
  const x2 = WHEEL_R + WHEEL_R * Math.cos(rad(to));
  const y2 = WHEEL_R + WHEEL_R * Math.sin(rad(to));
  return {
    d: `M ${WHEEL_R} ${WHEEL_R} L ${x1} ${y1} A ${WHEEL_R} ${WHEEL_R} 0 0 1 ${x2} ${y2} Z`,
    fill: hsvToCss(from, 1, 1, 1),
  };
});

export interface ColorPickerWheelProps {
  className?: string;
  /** Diameter in points. Defaults to the picker's size. */
  size?: number;
  /** Extra classes for the draggable thumb. */
  thumbClassName?: string;
}

/**
 * The square, bent into a circle: hue is the angle and saturation is the
 * distance from the middle.
 *
 * It reads the same three shared values as `ColorPicker.Area`, so the two are
 * interchangeable — a picker is a wheel instead of a square, not a wheel as
 * well as one. What it does not carry is brightness, which has no third
 * dimension to occupy here; pair it with `ColorPicker.Brightness`.
 *
 * The wheel is deliberately not mirrored under RTL. A track has a start and an
 * end and so has a direction to read it in; a wheel has neither, and flipping
 * which way round the spectrum runs would only make the same colour sit
 * somewhere else.
 */
const ColorPickerWheel = forwardRef<ViewRef, ColorPickerWheelProps>(
  ({ className, size, thumbClassName }, ref) => {
    const ctx = useColorPicker('ColorPicker.Wheel');
    const slots = colorPickerVariants({ size: ctx.size });
    const gradientId = useId().replace(/[^a-zA-Z0-9]/g, '');

    const diameter = size ?? WHEEL_SIZE[ctx.size];
    const thumbSize = AREA_THUMB[ctx.size];
    const radius = diameter / 2;

    const [announced, setAnnounced] = useState(() => ({
      h: Math.round(ctx.hue.value),
      s: Math.round(ctx.saturation.value * 100),
    }));

    const settle = useCallback((h: number, s: number) => {
      setAnnounced({ h: Math.round(h), s: Math.round(s * 100) });
    }, []);

    const apply = (x: number, y: number, commit: boolean) => {
      'worklet';
      const dx = x - radius;
      const dy = y - radius;
      // Clockwise from three o'clock, which is what `atan2` already gives in a
      // coordinate space whose y runs downwards — so the wedges above and the
      // touch here agree without either of them correcting for the other.
      const degrees = (Math.atan2(dy, dx) * 180) / Math.PI;
      const h = (degrees + 360) % 360;
      // Past the rim the colour is the one on the rim, rather than nothing:
      // a finger that overshoots the edge of a disc has still chosen a hue.
      const s = Math.min(Math.sqrt(dx * dx + dy * dy) / radius, 1);

      ctx.hue.value = h;
      ctx.saturation.value = s;
      runOnJS(ctx.emit)(h, s, ctx.brightness.value, ctx.opacity.value, commit);
      if (commit) {
        runOnJS(settle)(h, s);
        if (ctx.haptics) runOnJS(selectionTick)();
      }
    };

    const pan = Gesture.Pan()
      .enabled(!ctx.disabled)
      .minDistance(0)
      .shouldCancelWhenOutside(false)
      .onBegin((event) => apply(event.x, event.y, false))
      .onUpdate((event) => apply(event.x, event.y, false))
      .onFinalize((event) => apply(event.x, event.y, true));

    const thumbStyle = useAnimatedStyle(() => {
      const angle = (ctx.hue.value * Math.PI) / 180;
      const r = ctx.saturation.value * radius;
      return {
        transform: [
          { translateX: radius + r * Math.cos(angle) - thumbSize / 2 },
          { translateY: radius + r * Math.sin(angle) - thumbSize / 2 },
        ],
      };
    });

    const thumbFillStyle = useAnimatedStyle(() => ({
      backgroundColor: hsvToCss(
        ctx.hue.value,
        ctx.saturation.value,
        ctx.brightness.value,
        1
      ),
    }));

    // Brightness is not drawn into the wheel — it darkens the whole of it,
    // which is what brightness does.
    const dimStyle = useAnimatedStyle(() => ({
      opacity: 1 - ctx.brightness.value,
    }));

    const nudge = (channel: 'hue' | 'saturation', dir: 1 | -1) => {
      if (channel === 'hue') {
        const next = (ctx.hue.value + dir * HUE_NUDGE + 360) % 360;
        ctx.hue.value = next;
        settle(next, ctx.saturation.value);
        ctx.emit(next, ctx.saturation.value, ctx.brightness.value, ctx.opacity.value, true);
        return;
      }
      const next = Math.min(Math.max(ctx.saturation.value + dir * NUDGE, 0), 1);
      ctx.saturation.value = withTiming(next, TIMING);
      settle(ctx.hue.value, next);
      ctx.emit(ctx.hue.value, next, ctx.brightness.value, ctx.opacity.value, true);
    };

    const onAccessibilityAction = (event: AccessibilityActionEvent) => {
      const action = enabledColorPickerAction(
        event.nativeEvent.actionName,
        ctx.disabled
      );
      if (action === 'increment') nudge('hue', 1);
      else if (action === 'decrement') nudge('hue', -1);
      else if (action === 'saturate') nudge('saturation', 1);
      else if (action === 'desaturate') nudge('saturation', -1);
    };

    return (
      <GestureDetector gesture={pan}>
        {/* Square box, round drawing: the thumb travels to the rim and has to
            be drawn whole when it gets there, so the box is not clipped and
            only the wheel inside it is round. */}
        <View
          ref={ref}
          style={{ width: diameter, height: diameter }}
          className="self-center"
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Hue and saturation"
          accessibilityState={{ disabled: ctx.disabled }}
          accessibilityValue={{
            min: 0,
            max: 360,
            now: announced.h,
            text: `${announced.h}°, ${announced.s}% saturation`,
          }}
          accessibilityActions={[
            { name: 'increment' },
            { name: 'decrement' },
            { name: 'saturate', label: 'More saturated' },
            { name: 'desaturate', label: 'Less saturated' },
          ]}
          onAccessibilityAction={onAccessibilityAction}
        >
          <View
            style={{ width: diameter, height: diameter }}
            className={slots.wheel({ className })}
          >
            <Svg width="100%" height="100%" viewBox="0 0 100 100">
              <Defs>
                <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#ffffff" stopOpacity={1} />
                  <Stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              {WHEEL_PATHS.map((wedge, index) => (
                <Path key={index} d={wedge.d} fill={wedge.fill} />
              ))}
              {/* White at the middle falling off to nothing at the rim — the
                  same ramp the square runs across, wrapped around a centre. */}
              <Circle cx={WHEEL_R} cy={WHEEL_R} r={WHEEL_R} fill={`url(#${gradientId})`} />
            </Svg>
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, dimStyle]}
              className="bg-black"
            />
          </View>

          <Animated.View
            pointerEvents="none"
            style={[thumbStyle, { width: thumbSize, height: thumbSize }]}
            className={slots.thumb({ className: thumbClassName })}
          >
            <Animated.View style={thumbFillStyle} className={slots.thumbFill()} />
          </Animated.View>
        </View>
      </GestureDetector>
    );
  }
);

ColorPickerWheel.displayName = 'ColorPicker.Wheel';

export const ColorPicker = Object.assign(ColorPickerRoot, {
  Trigger: ColorPickerTrigger,
  Content: ColorPickerContent,
  Field: ColorPickerField,
  Area: ColorPickerArea,
  Wheel: ColorPickerWheel,
  Channel: ColorPickerChannelReadout,
  Hue: ColorPickerHue,
  Brightness: ColorPickerBrightness,
  Alpha: ColorPickerAlpha,
  Preview: ColorPickerPreview,
  Swatches: ColorPickerSwatches,
});
