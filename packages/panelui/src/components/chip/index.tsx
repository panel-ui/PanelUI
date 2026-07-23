/**
 * Chip — a compact, interactive token.
 *
 * Where Badge only shows and ToggleButton owns a stateful toolbar, Chip is the
 * thing in between: a small pill you can *press*, mark as *selected*, or
 * *remove*. It is the filter in a filter bar, the tag on a photo, the removable
 * recipient in a "To:" field — small, dense, and touchable.
 *
 * The close button is its own hit target nested inside the pill, so tapping the
 * ✕ removes the chip without also firing the chip's own `onPress`. That split
 * is the whole reason a removable chip needs a component and not just a styled
 * Badge.
 *
 * ```tsx
 * <Chip>Design</Chip>
 *
 * <Chip variant="info" onClose={() => remove('design')}>Design</Chip>
 *
 * <Chip selected={on} onPress={() => setOn(!on)}>
 *   <CheckIcon size={14} />
 *   <Chip.Label>Available</Chip.Label>
 * </Chip>
 * ```
 */
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { Pressable, View, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { IconColorProvider, XIcon } from '../../icons';
import {
  AnimatedPressable,
  type AnimatedPressableProps,
} from '../../primitives/animated-pressable';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { selectionTick } from '../../utils/haptics';

const chipVariants = tv({
  slots: {
    root: 'flex-row items-center self-start rounded-full border border-transparent',
    label: 'font-medium',
    close:
      'items-center justify-center rounded-full -mr-1 aspect-square opacity-70',
  },
  variants: {
    variant: {
      /** The resting tag — a quiet neutral fill. */
      default: { root: 'bg-secondary', label: 'text-secondary-foreground' },
      /** The accent fill, for the one chip that leads. */
      primary: { root: 'bg-primary', label: 'text-primary-foreground' },
      /** Just an outline — the lightest a chip gets while still being a shape. */
      outline: { root: 'border-border bg-transparent', label: 'text-foreground' },
      success: {
        root: 'bg-success-subtle',
        label: 'text-success-foreground',
      },
      warning: {
        root: 'bg-warning-subtle',
        label: 'text-warning-foreground',
      },
      info: { root: 'bg-info-subtle', label: 'text-info-foreground' },
      destructive: {
        root: 'bg-destructive-subtle',
        label: 'text-destructive-foreground',
      },
    },
    size: {
      sm: { root: 'h-6 gap-1 px-2', label: 'text-xs' },
      md: { root: 'h-7 gap-1.5 px-2.5', label: 'text-sm' },
      lg: { root: 'h-9 gap-2 px-3.5', label: 'text-base' },
    },
    /**
     * The filter "on" state — a loud accent surface that wins over the resting
     * variant, so any chip can be a filter without picking a second colour.
     */
    selected: {
      true: {
        root: 'border-primary/24 bg-accent',
        label: 'text-accent-foreground',
      },
    },
    /** Trims the trailing padding so the close target hugs the right edge. */
    closable: {
      true: { root: 'pr-1' },
    },
    disabled: {
      true: { root: 'opacity-[0.56]' },
    },
  },
  compoundVariants: [
    { size: 'sm', closable: true, class: { close: 'h-4' } },
    { size: 'md', closable: true, class: { close: 'h-5' } },
    { size: 'lg', closable: true, class: { close: 'h-6' } },
  ],
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

type ChipVariantProps = VariantProps<typeof chipVariants>;
export type ChipVariant = NonNullable<ChipVariantProps['variant']>;
export type ChipSize = NonNullable<ChipVariantProps['size']>;

/** Which foreground token each variant paints its icons and ✕ with. */
const TINT_VAR: Record<ChipVariant, string> = {
  default: '--color-secondary-foreground',
  primary: '--color-primary-foreground',
  outline: '--color-foreground',
  success: '--color-success-foreground',
  warning: '--color-warning-foreground',
  info: '--color-info-foreground',
  destructive: '--color-destructive-foreground',
};

/** The ✕ scales with the pill so it never looks stranded in a large chip. */
const CLOSE_ICON: Record<ChipSize, number> = { sm: 11, md: 13, lg: 15 };

/* -------------------------------------------------------------------------- */
/* State context                                                              */
/* -------------------------------------------------------------------------- */

interface ChipStateValue {
  selected: boolean;
  disabled: boolean;
}

interface ChipContextValue extends ChipStateValue {
  /** The label classes for this chip's variant/size, so `Chip.Label` matches. */
  labelClasses: string;
}

const ChipContext = createContext<ChipContextValue | null>(null);

/**
 * The chip's own state, for anything rendered inside it — an icon that swaps
 * when the chip is selected, a count that only shows when it is on.
 */
export function useChip(): ChipStateValue {
  const ctx = useContext(ChipContext);
  if (!ctx) {
    throw new Error('useChip must be used within a <Chip>');
  }
  return { selected: ctx.selected, disabled: ctx.disabled };
}

/* -------------------------------------------------------------------------- */
/* Chip                                                                       */
/* -------------------------------------------------------------------------- */

export interface ChipProps
  extends Omit<AnimatedPressableProps, 'children' | 'disabled'>,
    Omit<ChipVariantProps, 'selected' | 'disabled' | 'closable'> {
  children?: ReactNode;
  className?: string;
  /** Extra classes for the label when `children` is a string. */
  labelClassName?: string;
  /**
   * The filter "on" state. Setting it (even to `false`) makes the chip a
   * toggle, announced as such — pair it with `onPress` to flip it.
   */
  selected?: boolean;
  disabled?: boolean;
  /** A leading icon or avatar, before the label. */
  start?: ReactNode;
  /**
   * Shows a trailing ✕ and calls this when it is pressed. The ✕ is its own hit
   * target, so removing a chip never also fires its `onPress`.
   */
  onClose?: () => void;
  /** Accessibility label for the ✕. Defaults to "Remove". */
  closeLabel?: string;
  /**
   * A tick under the finger when the chip is pressed or removed. Off by
   * default — needs the optional `expo-haptics`, and is silent without it.
   */
  haptics?: boolean;
}

const ChipRoot = forwardRef<View, ChipProps>(
  (
    {
      children,
      className,
      labelClassName,
      variant = 'default',
      size = 'md',
      selected,
      disabled = false,
      start,
      onClose,
      closeLabel = 'Remove',
      haptics = false,
      onPress,
      ...props
    },
    ref
  ) => {
    const isToggle = selected !== undefined;
    const isSelected = selected ?? false;
    const closable = onClose !== undefined;
    // Only the whole chip becoming pressable warrants the press animation; a
    // static attribute tag stays a plain View so it does not invite a tap.
    const pressable = onPress !== undefined || isToggle;

    const slots = chipVariants({
      variant,
      size,
      selected: isSelected,
      closable,
      disabled,
    });

    // Icons and the ✕ inherit this, so they track the surface they sit on
    // instead of every caller hardcoding a hex that is wrong in one theme.
    const tint = useCSSVariable(
      isSelected ? '--color-accent-foreground' : TINT_VAR[variant]
    );

    const handlePress = useCallback<NonNullable<AnimatedPressableProps['onPress']>>(
      (event) => {
        if (haptics) selectionTick();
        onPress?.(event);
      },
      [haptics, onPress]
    );

    const handleClose = useCallback(() => {
      if (haptics) selectionTick();
      onClose?.();
    }, [haptics, onClose]);

    const labelClasses = slots.label();
    const state = useMemo(
      () => ({ selected: isSelected, disabled, labelClasses }),
      [isSelected, disabled, labelClasses]
    );

    const body = (
      <>
        {start}
        {typeof children === 'string' ? (
          <Text className={slots.label({ className: labelClassName })}>
            {children}
          </Text>
        ) : (
          children
        )}
        {closable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            // A small pill leaves little room for the ✕; the slop gives the
            // finger the target the pixels do not.
            hitSlop={8}
            disabled={disabled}
            onPress={handleClose}
            className={slots.close()}
          >
            <XIcon size={CLOSE_ICON[size]} />
          </Pressable>
        ) : null}
      </>
    );

    const sharedProps = {
      accessibilityRole: 'button' as const,
      // A toggle chip is read out as checked/unchecked; a plain pressable one
      // as a button. A static tag gets neither, so it is not announced as
      // something to press.
      accessibilityState: { disabled, ...(isToggle ? { selected: isSelected } : {}) },
      'aria-pressed': isToggle ? isSelected : undefined,
      disabled,
      className: slots.root({ className }),
    };

    return (
      <ChipContext.Provider value={state}>
        <IconColorProvider color={typeof tint === 'string' ? tint : undefined}>
          {pressable ? (
            <AnimatedPressable
              ref={ref}
              onPress={handlePress}
              {...sharedProps}
              {...props}
            >
              {body}
            </AnimatedPressable>
          ) : (
            <View ref={ref} className={slots.root({ className })} {...(props as ViewProps)}>
              {body}
            </View>
          )}
        </IconColorProvider>
      </ChipContext.Provider>
    );
  }
);
ChipRoot.displayName = 'Chip';

/* -------------------------------------------------------------------------- */
/* Chip.Label                                                                 */
/* -------------------------------------------------------------------------- */

export interface ChipLabelProps {
  className?: string;
  children: ReactNode;
}

/**
 * The label, when the chip holds more than a string — an icon beside text. It
 * reads the selected state itself, so composing the two does not mean threading
 * the colour through by hand.
 */
function ChipLabel({ className, children }: ChipLabelProps) {
  const ctx = useContext(ChipContext);
  if (!ctx) {
    throw new Error('Chip.Label must be used within a <Chip>');
  }
  return <Text className={cn(ctx.labelClasses, className)}>{children}</Text>;
}
ChipLabel.displayName = 'Chip.Label';

export const Chip = Object.assign(ChipRoot, {
  Label: ChipLabel,
});
