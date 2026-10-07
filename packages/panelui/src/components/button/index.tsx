import { createContext, forwardRef, useContext, type ReactNode } from 'react';
import { View } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import {
  AnimatedPressable,
  type AnimatedPressableProps,
} from '../../primitives/animated-pressable';
import { Text, textChildren } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { IconColorProvider } from '../../icons';
import { NativeHost, getNativeUI, getSwiftUIModifiers } from '../../native';
import { Spinner, type SpinnerProps } from '../spinner';

const buttonVariants = tv({
  slots: {
    root: 'flex-row items-center justify-center gap-2 rounded-lg border border-transparent',
    // Let a constrained label wrap, and centre every line of an action name.
    // An explicit Tailwind text step would also impose a fixed line height,
    // which can be shorter than the glyphs after Dynamic Type scales them.
    label: 'min-w-0 shrink text-center font-medium',
    spinner: '',
  },
  variants: {
    variant: {
      primary: {
        root: 'border-primary bg-primary shadow-sm',
        label: 'text-primary-foreground',
        spinner: 'border-primary-foreground/32 border-t-primary-foreground',
      },
      secondary: {
        root: 'bg-secondary',
        label: 'text-secondary-foreground',
        spinner: 'border-secondary-foreground/24 border-t-secondary-foreground',
      },
      outline: {
        root: 'border-input bg-popover shadow-sm',
        label: 'text-foreground',
        spinner: 'border-muted border-t-foreground',
      },
      ghost: {
        root: 'bg-transparent',
        label: 'text-foreground',
        spinner: 'border-muted border-t-foreground',
      },
      destructive: {
        root: 'border-destructive bg-destructive shadow-sm',
        label: 'text-destructive-solid-foreground',
        spinner:
          'border-destructive-solid-foreground/32 border-t-destructive-solid-foreground',
      },
      /** Neutral surface for third-party sign-in, sized for a full-width stack. */
      social: {
        root: 'border-input bg-card shadow-sm',
        label: 'text-foreground',
        spinner: 'border-muted border-t-foreground',
      },
    },
    size: {
      // These padding + intrinsic-font pairs equal the old 36/44/48dp boxes
      // at the default scale. `min-h-*`, rather than `h-*`, lets the same box
      // grow when the label's system-scaled glyphs or wrapped lines need it.
      sm: { root: 'min-h-9 min-w-9 gap-1.5 px-2.5 py-2', label: 'text-[14px]' },
      md: { root: 'min-h-11 min-w-11 px-4 py-2.5', label: 'text-[16px]' },
      lg: { root: 'min-h-12 px-6 py-2.5', label: 'text-[18px]' },
      // A step above `lg`, for the one control a screen is built around — a
      // compose button in a navigation panel, a primary action alone at the
      // bottom of a sheet. It maps onto the platform's own extra-large control
      // size under `native`, which is the size it exists to reach: below it,
      // `large` is the biggest a platform button can be asked to be.
      xl: { root: 'min-h-14 px-8 py-3', label: 'text-[18px]' },
      // Icon-only controls have no scalable label, so their square is stable.
      icon: { root: 'h-11 w-11 px-0' },
    },
    fullWidth: {
      true: { root: 'w-full' },
    },
    disabled: {
      true: { root: 'opacity-[0.64]' },
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

/** How a button looks. */
export type ButtonVariant = NonNullable<ButtonVariantProps['variant']>;
/** How big a button is. `icon` is a square. */
export type ButtonSize = NonNullable<ButtonVariantProps['size']>;

/* -------------------------------------------------------------------------- *
 * Grouping
 *
 * A button reads this; `ButtonGroup` writes it. The context lives here rather
 * than beside the group because the button is the consumer, and a component
 * should not have to import the thing that contains it to find out that it is
 * contained — which would also make the two import each other.
 * -------------------------------------------------------------------------- */

export interface ButtonGroupContextValue {
  /** Fills in for a button that did not choose one. */
  variant?: ButtonVariant;
  /** Fills in for a button that did not choose one. */
  size?: ButtonSize;
  /** The buttons are joined into one shape, so each drops its own. */
  attached: boolean;
  /** Segments share the row equally. */
  fullWidth: boolean;
}

const ButtonGroupContext = createContext<ButtonGroupContextValue | null>(null);

/** Announces to every button below it that it is part of one control. */
export function ButtonGroupProvider({
  value,
  children,
}: {
  value: ButtonGroupContextValue;
  children: ReactNode;
}) {
  return <ButtonGroupContext.Provider value={value}>{children}</ButtonGroupContext.Provider>;
}

/** The enclosing group, if there is one. `null` for a button standing alone. */
export function useButtonGroup(): ButtonGroupContextValue | null {
  return useContext(ButtonGroupContext);
}

/**
 * What an attached button gives up so the group can draw the shape once.
 *
 * The radius and the shadow go because the group owns both — a rounded,
 * shadowed segment inside a rounded, shadowed container is two shapes where
 * there should be one. The border stays but turns transparent rather than
 * being removed: it is holding a pixel of the button's height, and dropping it
 * would make an `outline` segment a hair shorter than a `ghost` one beside it.
 *
 * The press feedback changes too. A button on its own shrinks slightly when
 * pressed, which inside a joined run would pull the segment away from its
 * neighbours and show the container through the gap. A background is the same
 * signal without the movement.
 */
const ATTACHED = 'rounded-none border-transparent shadow-none active:bg-accent';

const SPINNER_SIZE = { sm: 'sm', md: 'sm', lg: 'md', xl: 'md', icon: 'sm' } as const;

/** Extra room around the styled sizes so even the compact button reaches 48dp. */
const BUTTON_HIT_SLOP = { sm: 6, md: 2, lg: 0, xl: 0, icon: 2 } as const;

/**
 * The theme token each variant's content reads against. Icons in the content
 * slots inherit the resolved value, so they follow the theme automatically.
 */
const CONTENT_COLOR_VAR: Record<NonNullable<ButtonVariantProps['variant']>, string> = {
  primary: '--color-primary-foreground',
  destructive: '--color-destructive-solid-foreground',
  secondary: '--color-secondary-foreground',
  outline: '--color-foreground',
  ghost: '--color-foreground',
  social: '--color-foreground',
};

export interface ButtonProps
  extends Omit<AnimatedPressableProps, 'children' | 'disabled'>,
    Omit<ButtonVariantProps, 'disabled'> {
  children?: ReactNode;
  disabled?: boolean;
  /** Show a spinner and block presses while an action is in flight. */
  loading?: boolean;
  /**
   * Props for the spinner `loading` shows. Leave it unset and the spinner is
   * drawn in the label's colour, at a size picked from the button's.
   *
   * `color` paints the turning arc and `trackColor` the faint ring under it —
   * any colour React Native accepts. `className` takes theme tokens instead,
   * such as `border-t-success`. On a filled button, set the track as well as
   * the arc: the default track is a tint of the label colour, and beside an
   * arc in another colour it reads as a second spinner.
   *
   * There is no `label`. The button already announces itself as busy while it
   * loads, so a label on the spinner would announce the same wait twice.
   */
  spinnerProps?: Omit<SpinnerProps, 'label'>;
  /** Content rendered before the label (replaced by the spinner while loading). */
  startContent?: ReactNode;
  /** Content rendered after the label. */
  endContent?: ReactNode;
  /** Extra classes for the label when children is a string. */
  labelClassName?: string;
  /**
   * Render the platform's own button instead of this one. Requires the
   * optional `@expo/ui` package; without it this prop does nothing.
   *
   * **Theme tokens do not apply** — the platform draws the button, so
   * `className`, `fullWidth`, `startContent`, `endContent`, `loading` and
   * `spinnerProps` are all ignored. `variant` maps onto the nearest platform style:
   * `primary`/`destructive` → filled, `outline` → outlined, everything else
   * → text; `size` sets the height.
   *
   * A native button **sizes itself to its label**, the way a platform button
   * is supposed to. It does not stretch to fill its container, and `fullWidth`
   * has no effect on it.
   *
   * **Give it a string, not elements, unless `size` is `icon`.** A string
   * becomes the platform's own label. Anything else has to be hosted inside
   * the native tree, and a hosted view only measures where something above it
   * is definite on *both* axes — which is true of an icon button, because it
   * is a square this component sizes, and false of a labelled one, whose width
   * is its text's and known to nobody in advance. Host a label without a width
   * and the two layout systems ask each other the same question until the app
   * dies, in native code, where a `try` here has nothing to catch.
   */
  native?: boolean;
  /**
   * Draw the native button in the platform's Liquid Glass material — the one
   * iOS 26 uses for its own floating controls. Requires `native`, and iOS 26 or
   * later; anywhere else it is ignored and the button keeps its ordinary
   * platform style rather than failing.
   *
   * `primary` and `destructive` take the prominent variant, which keeps the
   * accent tint a filled button is supposed to have; every other variant takes
   * the plain one. An icon button is drawn round rather than in the platform's
   * default capsule.
   */
  glass?: boolean;
  /**
   * A glyph beside the label, named from the platform's own symbol set rather
   * than passed as an element.
   *
   * This is how a labelled native button gets an icon at all. Elements have to
   * be hosted inside the native tree, and a hosted view inside a labelled
   * button has no width anything can resolve — so a name is not a shortcut
   * here, it is the only form that works. The platform draws it, at its own
   * size, in the label's colour.
   *
   * iOS only, and `native` only. Android's toolkit has no equivalent symbol
   * set, so a button there is its label alone; the drawn button takes
   * `startContent` and always did.
   */
  systemImage?: string;
}

/**
 * Height given to the platform button, matching the styled scale above.
 *
 * It goes on the host as well as on the button, and the host is the half that
 * stops the jump. `matchContents` does not mean "size the host once" — it
 * means the host keeps its React Native box equal to whatever SwiftUI most
 * recently laid out, and a button laying itself out again is what a press is.
 * So the box moved under the press, and everything below it moved with it.
 *
 * A height we already know is not a question worth asking the platform, so it
 * is not asked: the host states it, and `matchContents` is narrowed to the
 * axis that is genuinely unknown. See the host in the native branch below.
 */
const NATIVE_HEIGHT: Record<NonNullable<ButtonVariantProps['size']>, number> = {
  sm: 36,
  md: 44,
  lg: 48,
  xl: 56,
  icon: 44,
};

/**
 * Room around the glyph in a native icon button, applied to the glyph itself.
 *
 * Not to the button, and that distinction is the whole thing. SwiftUI's
 * `padding` on a Button pads *outside* its background — the chrome stays the
 * size it was and moves inward — and `frame` only sets the layout box, leaving
 * a glyph-sized background centred in a larger invisible one. Neither grows
 * the button. What the background is drawn around is the *label*, and the
 * label here is a React Native view we host ourselves, so padding it in React
 * is both the simplest lever and the only one that works.
 */
const NATIVE_ICON_PADDING = 6;

/**
 * The frame a native icon button is given, which must contain the padded glyph
 * above with room to spare.
 *
 * It exists to end a measurement, not to set a look. The chain is
 * `Host(matchContents)` → platform button → `RNHostView(matchContents)` → our
 * view: every link sized by its contents, and nothing anywhere with a size of
 * its own. Something has to be definite or the two layout systems ask each
 * other the same question forever, and that fails down in the platform, where
 * there is nothing for a JavaScript `try` to catch.
 *
 */
const NATIVE_ICON_FRAME = 44;

/**
 * Our sizes on the platform's own control scale, which is how a native button
 * is made bigger: it scales the room the style leaves around the label, and the
 * label with it.
 *
 * Only ever sent for a *string* label. A hosted label is the case that has
 * taken this app down twice, and while the cause turned out to be a missing
 * frame rather than this modifier, a labelled button has no hosted view and no
 * measurement to get wrong — so there is no reason to find out on both at once.
 */
const NATIVE_CONTROL_SIZE = {
  sm: 'small',
  md: 'regular',
  lg: 'large',
  xl: 'extraLarge',
  icon: 'regular',
} as const;


/** PanelUI variants mapped onto the platform button styles. */
const NATIVE_VARIANT: Record<
  NonNullable<ButtonVariantProps['variant']>,
  'filled' | 'outlined' | 'text'
> = {
  primary: 'filled',
  destructive: 'filled',
  secondary: 'filled',
  outline: 'outlined',
  ghost: 'text',
  social: 'outlined',
};

export const Button = forwardRef<View, ButtonProps>(
  (
    {
      children,
      className,
      labelClassName,
      variant,
      size,
      fullWidth,
      disabled,
      loading = false,
      spinnerProps,
      startContent,
      endContent,
      native,
      systemImage,
      glass = false,
      accessibilityState,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const nativeUI = native ? getNativeUI() : null;

    /*
     * A group fills in what a button did not say for itself, and never
     * overrides what it did: a run of buttons should look like one control
     * without every segment repeating the same two props, and the odd segment
     * that wants to stand out — the selected one, the destructive one — has to
     * be able to say so.
     *
     * `native` is deliberately outside all of this. The platform draws that
     * button, so it has no border, radius or shadow for a group to take over,
     * and joining several of them would produce a row of platform buttons with
     * a border drawn around it rather than a segmented control.
     */
    const group = useButtonGroup();
    const attached = !native && group?.attached === true;
    const resolvedVariant = variant ?? group?.variant;
    const resolvedSize = size ?? group?.size;

    const { root, label, spinner } = buttonVariants({
      variant: resolvedVariant,
      size: resolvedSize,
      fullWidth: fullWidth ?? (attached && group?.fullWidth),
      disabled: isDisabled,
    });

    // Icons in the content slots inherit this, so they stay legible when the
    // theme inverts the button's background. Without it every caller has to
    // hardcode a hex that is wrong in one theme or the other.
    const themedColor = useCSSVariable(CONTENT_COLOR_VAR[resolvedVariant ?? 'primary']);
    const contentColor =
      typeof themedColor === 'string' ? themedColor : undefined;

    if (nativeUI) {
      const { Host, Button: NativeButton, RNHostView } = nativeUI;
      const isStringLabel = typeof children === 'string';
      const prominent = resolvedVariant === 'primary' || resolvedVariant === 'destructive';

      /*
       * Looks the portable props cannot ask for.
       *
       * `buttonStyle` because Liquid Glass has no cross-platform variant to
       * map onto. `glassProminent` is the tinted one — it keeps the accent
       * fill a prominent button is supposed to have, which drawing the
       * material by hand over a plain button throws away. A supplied
       * `buttonStyle` replaces the one the variant would have set, so this is
       * a substitution rather than a layer on top.
       *
       * `buttonBorderShape` because an icon button is round and the platform's
       * default capsule is not — a lone glyph in a capsule reads as a text
       * button somebody forgot to label. It shapes the glass too.
       */
      const swiftUI = getSwiftUIModifiers();
      const nativeModifiers = swiftUI
        ? [
            glass ? swiftUI.buttonStyle(prominent ? 'glassProminent' : 'glass') : null,
            resolvedSize === 'icon' ? swiftUI.buttonBorderShape('circle') : null,
            isStringLabel
              ? swiftUI.controlSize(NATIVE_CONTROL_SIZE[resolvedSize ?? 'md'])
              : null,
          ].filter(Boolean)
        : [];

      /*
       * The platform paints the background, not the theme — so a hosted icon
       * cannot read its colour from a token the way it does in the styled
       * button. On a tinted button that is white, whatever the theme thinks its
       * own primary foreground is; on the rest, including plain glass, the
       * material is clear enough to leave the page's own foreground legible.
       */
      const nativeContent = prominent ? '#ffffff' : contentColor;

      /*
       * The box React Native reserves for the platform button, stated rather
       * than measured.
       *
       * An icon button is a square we chose, so both axes are known and the
       * host is asked to match nothing. A labelled button's width is its
       * text's and known only to the platform, so the height is stated and
       * only the width is matched.
       *
       * Leaving both to `matchContents` is what made the button move on its
       * first press: the host tracks SwiftUI's latest layout, and a pressed
       * button lays out again.
       */
      const hostFrame =
        resolvedSize === 'icon'
          ? { width: NATIVE_ICON_FRAME, height: NATIVE_ICON_FRAME }
          : { height: NATIVE_HEIGHT[resolvedSize ?? 'md'] };

      return (
        <NativeHost
          host={Host}
          matchContents={resolvedSize === 'icon' ? false : { horizontal: true }}
          ignoreSafeArea="keyboard"
          style={hostFrame}
        >
          <NativeButton
            label={isStringLabel ? children : undefined}
            // The platform only reads a symbol beside a label it drew itself,
            // so an icon button — which has no label — never carries one.
            systemImage={isStringLabel ? systemImage : undefined}
            variant={NATIVE_VARIANT[resolvedVariant ?? 'primary']}
            disabled={isDisabled}
            /*
             * A square for an icon button, a height for a labelled one — and
             * in both cases a definite number, which is what stops the
             * measurement chain above from having no fixed point in it.
             *
             * The frame does not decide how big the *button* looks; the padded
             * label does, because that is what the platform draws its
             * background around. The frame only has to be large enough to hold
             * the result.
             */
            style={hostFrame}
            modifiers={nativeModifiers.length ? nativeModifiers : undefined}
            onPress={props.onPress}
          >
            {/* Non-string children are React Native views, and the native
                button cannot measure those directly — they have to be hosted
                or they render outside the button's bounds. An icon beside a
                label is the common case, and the label half of it is still
                bare text once it is in there. */}
            {isStringLabel ? undefined : (
              <RNHostView matchContents>
                {/* Padding the hosted label is what grows the button, because
                    the platform draws its background around the label. The
                    centring is not redundant with it: a view lays a child out
                    from its leading edge, so an icon narrower than the line it
                    sits on ends up off to one side of a circle that is not. */}
                <View
                  style={
                    resolvedSize === 'icon'
                      ? {
                          padding: NATIVE_ICON_PADDING,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }
                      : undefined
                  }
                >
                  <IconColorProvider color={nativeContent}>
                    {textChildren(children, (text) => (
                      <Text className={label({ className: labelClassName })}>{text}</Text>
                    ))}
                  </IconColorProvider>
                </View>
              </RNHostView>
            )}
          </NativeButton>
        </NativeHost>
      );
    }

    return (
      <IconColorProvider color={contentColor}>
        <AnimatedPressable
          ref={ref}
          disabled={isDisabled}
          // Joined segments cannot borrow room from each other without making
          // two actions claim the same pixels. ButtonGroup owns that layout.
          hitSlop={attached ? undefined : BUTTON_HIT_SLOP[resolvedSize ?? 'md']}
          // Before the spread, so a caller can still ask for the scale back.
          pressScale={attached ? 1 : undefined}
          className={root({ className: cn(attached && ATTACHED, className) })}
          {...props}
          accessibilityRole="button"
          accessibilityState={{ ...accessibilityState, disabled: isDisabled, busy: loading }}
        >
          {loading ? (
            // The caller's props after the defaults, so a size they pick wins;
            // the class goes through the slot so their tokens replace the
            // variant's rather than competing with them.
            <Spinner
              size={SPINNER_SIZE[resolvedSize ?? 'md']}
              {...spinnerProps}
              className={spinner({ className: spinnerProps?.className })}
            />
          ) : (
            startContent
          )}
          {textChildren(children, (text) => (
            <Text className={label({ className: labelClassName })}>{text}</Text>
          ))}
          {endContent}
        </AnimatedPressable>
      </IconColorProvider>
    );
  }
);

Button.displayName = 'Button';
