/**
 * Glass — the material iOS draws its own floating controls in.
 *
 * A control that floats over content needs to read as *over* it, and a flat
 * fill cannot say that: it either hides what is behind it or disappears into
 * it. The system material does both jobs at once — it refracts what is behind,
 * lifts its own edge, and stays legible over anything.
 *
 * ```tsx
 * <Glass radius={28} className="px-4 py-3">
 *   <Text>Over whatever is behind it.</Text>
 * </Glass>
 * ```
 *
 * ## Where it is real, and where it is not
 *
 * The material exists on iOS 26 and above. Below that, on Android, on web, and
 * for anyone who has switched Reduce Transparency on, this draws
 * `fallbackClassName` instead — a solid token surface. That is deliberate
 * rather than a gap: a hand-drawn approximation of a system material is a
 * near-miss on the one platform that has the real thing, and on Android it is
 * an iOS look pasted onto a platform that never asked for it.
 *
 * So `Glass` is not a promise that the screen will be glass. It is a promise
 * that the container will be drawn correctly either way, and callers should
 * pick a `fallbackClassName` that stands on its own.
 *
 * ## The material is a layer, not the box
 *
 * The native view is rendered as a non-interactive layer filling this
 * container, with the content above it, for the same reason `Scrim` layers a
 * blur: it keeps every layout class, every token and every touch target on an
 * ordinary `View` that behaves the way the rest of the library does.
 *
 * `radius` is a number rather than a class because the material has to round
 * its own corners — clipping a square one to a rounded parent throws away the
 * lit edge that makes it read as glass.
 *
 * `interactive` is the one exception to the layer: the platform only animates
 * the glass under a touch it can see, so with it on the material is the box
 * and the children are hosted inside it, in normal flow. Reach for it when
 * the glass *is* the button.
 *
 * ## Do not fade it
 *
 * Setting `opacity` to `0` on the material or on anything above it stops it
 * rendering at all, and it does not come back when the opacity does. Move it,
 * or unmount it; never animate it out.
 */
import { forwardRef, type ComponentType, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useThemeMode } from '../theme/use-theme';
import { cn } from '../utils/cn';
import { useReduceTransparency } from './scrim';

/** How the material treats what is behind it. */
export type GlassVariant = 'regular' | 'clear';

/**
 * Corner radius in points — one number for all four, or a top and a bottom.
 *
 * The two-sided form is for a surface with an edge that is not a real edge: a
 * sheet docked to the bottom of the screen rounds its top and leaves its
 * bottom square, because the screen edge is where it ends.
 */
export type GlassRadius = number | { top?: number; bottom?: number };

function shapeOf(radius: GlassRadius | undefined) {
  if (radius === undefined) return null;
  if (typeof radius === 'number') return { borderRadius: radius };
  return {
    borderTopLeftRadius: radius.top ?? 0,
    borderTopRightRadius: radius.top ?? 0,
    borderBottomLeftRadius: radius.bottom ?? 0,
    borderBottomRightRadius: radius.bottom ?? 0,
  };
}

interface GlassViewProps extends ViewProps {
  glassEffectStyle?: GlassVariant | 'none';
  tintColor?: string;
  isInteractive?: boolean;
  colorScheme?: 'auto' | 'light' | 'dark';
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

interface GlassContainerViewProps extends ViewProps {
  spacing?: number;
  ref?: React.Ref<View>;
}

interface GlassModule {
  GlassView: ComponentType<GlassViewProps>;
  GlassContainer: ComponentType<GlassContainerViewProps>;
}

/**
 * `expo-glass-effect`, or null when the material cannot be drawn here.
 *
 * Resolved once at module load, behind three gates that all have to pass. The
 * package is optional, so the require can fail; the API is missing from some
 * iOS 26 builds, and reaching for it there crashes; and the design itself is
 * only present when the app was compiled for it. Asking all three once is
 * cheaper than a try/catch on every render, and there is no answer that can
 * change while the process is alive.
 */
const glassModule: GlassModule | null = (() => {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-glass-effect');
    if (typeof mod?.isGlassEffectAPIAvailable === 'function' && !mod.isGlassEffectAPIAvailable()) {
      return null;
    }
    if (typeof mod?.isLiquidGlassAvailable === 'function' && !mod.isLiquidGlassAvailable()) {
      return null;
    }
    return mod?.GlassView ? (mod as GlassModule) : null;
  } catch {
    return null;
  }
})();

const GlassView = glassModule?.GlassView ?? null;
const GlassContainerView = glassModule?.GlassContainer ?? null;

/**
 * True when the real material can be drawn — for a caller that wants to know
 * before it commits to a look. It says nothing about Reduce Transparency, which
 * is a live preference and belongs to the hook.
 */
export const hasGlass = GlassView !== null;

/**
 * Whether the material will actually be drawn right now: the API is present
 * *and* the user has not switched Reduce Transparency on.
 *
 * For a component that changes shape around the material — dropping a fill, a
 * border or a shadow the glass replaces — so that it makes the same decision
 * `Glass` makes and never strips the fill while leaving nothing behind it.
 */
export function useGlassMaterial(): boolean {
  const reduceTransparency = useReduceTransparency();
  // Not knowing yet counts as "do not draw it": the material arriving a frame
  // late is invisible, and one flashing at somebody who opted out is not.
  return hasGlass && reduceTransparency === false;
}

export interface GlassProps extends ViewProps {
  /**
   * How much of what is behind shows through. `regular` is the everyday
   * material; `clear` is thinner, for something over its own artwork.
   */
  variant?: GlassVariant;
  /** Tints the material. Takes a colour, not a token name. */
  tint?: string;
  /**
   * Corner radius in points. The material rounds itself to this, so give it
   * the same shape the container is drawn with — clipping a square material
   * to a rounded parent throws away the lit edge that makes it read as glass.
   */
  radius?: GlassRadius;
  /**
   * Let the material answer touch the way the platform's own controls do:
   * it brightens and swells under the finger and the highlight follows it.
   *
   * For a material that *is* a button. The platform only tracks touches that
   * land inside the glass view, so with this on the content is hosted inside
   * the material rather than above it — a pressable written as a child still
   * gets its press, and the glass reacts to the same touch.
   */
  interactive?: boolean;
  /** Applied only when the material cannot be drawn. Give it a real surface. */
  fallbackClassName?: string;
  className?: string;
}

export function Glass({
  variant = 'regular',
  tint,
  radius,
  interactive = false,
  fallbackClassName = 'bg-card',
  className,
  children,
  style,
  ...props
}: GlassProps) {
  /*
   * Which appearance the material is drawn in, from the app's theme rather
   * than the phone's.
   *
   * The material's own default follows the system, so an app running a dark
   * theme on a phone set to light draws light glass over dark content — and a
   * theme changed at runtime leaves it where it was, because the system
   * appearance never moved.
   */
  const { mode } = useThemeMode();
  const material = useGlassMaterial();
  const shape = shapeOf(radius);

  /*
   * Interactive, the material is the box rather than a layer in it. The
   * platform only tracks a touch that lands inside the glass view, so the
   * content has to be hosted in it — and hosted in normal flow, so that a
   * box sized by its content still is. A layer pinned to the box's edges
   * could not size it, and a button as wide as its label would collapse to
   * its minimum. The classes go on a view inside, because the native view is
   * not a styled one; only the positional style stays on the outside.
   */
  if (material && GlassView && interactive) {
    return (
      <GlassView
        glassEffectStyle={variant}
        tintColor={tint}
        isInteractive
        colorScheme={mode}
        style={[shape, style]}
        {...props}
      >
        <View className={className}>{children}</View>
      </GlassView>
    );
  }

  return (
    <View
      className={cn('overflow-hidden', material ? null : fallbackClassName, className)}
      style={[shape, style]}
      {...props}
    >
      {material && GlassView ? (
        <GlassView
          glassEffectStyle={variant}
          tintColor={tint}
          colorScheme={mode}
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, shape]}
        />
      ) : null}
      {children}
    </View>
  );
}

Glass.displayName = 'Glass';

export interface GlassContainerProps extends ViewProps {
  /**
   * How close two pieces of glass have to be before they merge, in points.
   * Inside it their edges flow into one another; a piece moving past
   * another blends with it and pulls free as it leaves.
   */
  spacing?: number;
  className?: string;
}

/**
 * Lets the glass inside it merge.
 *
 * On its own each piece of the material is a separate object with its own
 * lit edge. Inside a container, pieces within `spacing` of each other flow
 * together — which is what makes a button that opens into other buttons look
 * like one thing dividing rather than several things arriving. A plain view
 * wherever the material is not drawn, so it can be written unconditionally.
 */
export const GlassContainer = forwardRef<View, GlassContainerProps>(
  ({ spacing, className, style, children, ...props }, ref) => {
    const material = useGlassMaterial();
    if (material && GlassContainerView) {
      // The native container is not a styled view, so the classes go on a
      // view inside it and only the positional style stays on the outside.
      return (
        <GlassContainerView ref={ref} spacing={spacing} style={style} {...props}>
          <View className={className}>{children}</View>
        </GlassContainerView>
      );
    }
    return (
      <View ref={ref} className={className} style={style} {...props}>
        {children}
      </View>
    );
  }
);

GlassContainer.displayName = 'GlassContainer';
