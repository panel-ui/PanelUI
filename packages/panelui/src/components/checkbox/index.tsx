import { forwardRef, useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { CheckIcon, MinusIcon } from '../../icons';
import { Text } from '../../primitives/text';

const checkboxVariants = tv({
  slots: {
    row: 'flex-row items-center gap-2.5',
    box: 'h-5 w-5 items-center justify-center rounded-md border border-input bg-background',
    fill: 'absolute inset-0 items-center justify-center rounded-md bg-primary',
    content: 'flex-1 gap-0.5',
    label: 'text-sm text-foreground',
    description: 'text-sm text-muted-foreground',
  },
  variants: {
    variant: {
      default: {},
      /**
       * The whole surface is the target — for pickable options where the
       * checkbox is a confirmation rather than the affordance itself.
       */
      card: {
        row: 'w-full items-start gap-3 rounded-xl border border-border bg-card p-4',
        label: 'text-base font-medium',
      },
    },
    checked: {
      true: {},
    },
    disabled: {
      true: { row: 'opacity-50' },
    },
  },
  compoundVariants: [
    {
      variant: 'card',
      checked: true,
      class: { row: 'border-primary bg-accent' },
    },
  ],
  defaultVariants: {
    variant: 'default',
  },
});

export interface CheckboxProps extends VariantProps<typeof checkboxVariants> {
  className?: string;
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /**
   * A third, in-between state for a box that governs a group of others — some
   * on, some off. It fills like a checked box but shows a dash rather than a
   * tick, and announces itself as `mixed` to a screen reader. Pressing it
   * resolves the ambiguity by turning the whole group on, so the press reports
   * `true`. `indeterminate` overrides `checked` for what is drawn.
   */
  indeterminate?: boolean;
  disabled?: boolean;
  /** Optional label rendered next to the box; pressing it also toggles. */
  label?: string;
  /** Secondary line under the label, for extra context. */
  description?: string;
}

export const Checkbox = forwardRef<View, CheckboxProps>(
  (
    {
      className,
      checked,
      onCheckedChange,
      indeterminate,
      disabled,
      label,
      description,
      variant,
    },
    ref
  ) => {
    // The dash and the tick share one fill, so the box is "on" for either —
    // what changes is the glyph, not whether the fill is shown.
    const on = checked || !!indeterminate;
    const progress = useSharedValue(on ? 1 : 0);
    const slots = checkboxVariants({ variant, checked: on, disabled: !!disabled });
    const checkColor = useCSSVariable('--color-primary-foreground');

    useEffect(() => {
      progress.value = on
        ? withSpring(1, { damping: 15, stiffness: 300, mass: 0.5 })
        : withTiming(0, { duration: 120 });
    }, [on, progress]);

    const fillStyle = useAnimatedStyle(() => ({
      opacity: progress.value,
      transform: [{ scale: 0.6 + progress.value * 0.4 }],
    }));

    const glyphColor = typeof checkColor === 'string' ? checkColor : '#fff';
    const box = (
      <View className={slots.box()}>
        <Animated.View style={fillStyle} className={slots.fill()}>
          {indeterminate ? (
            <MinusIcon size={12} color={glyphColor} />
          ) : (
            <CheckIcon size={12} color={glyphColor} />
          )}
        </Animated.View>
      </View>
    );

    return (
      <Pressable
        ref={ref}
        accessibilityRole="checkbox"
        // `mixed` is the a11y state for a box that governs a partly-on group;
        // a plain boolean would tell a screen reader the group is fully one way.
        accessibilityState={{
          checked: indeterminate ? 'mixed' : checked,
          disabled: !!disabled,
        }}
        accessibilityLabel={label}
        accessibilityHint={description}
        disabled={disabled}
        // An indeterminate box resolves upward: the press turns the group on.
        onPress={() => onCheckedChange?.(indeterminate ? true : !checked)}
        hitSlop={8}
        // A description makes the row two lines tall — align the box to the
        // label rather than centring it against the whole block.
        className={slots.row({
          className:
            description && variant !== 'card'
              ? `items-start ${className ?? ''}`
              : className,
        })}
      >
        {/* The card lays out content first so the box sits top-right. */}
        {variant === 'card' ? null : box}
        {label || description ? (
          <View className={slots.content()}>
            {label ? <Text className={slots.label()}>{label}</Text> : null}
            {description ? (
              <Text className={slots.description()}>{description}</Text>
            ) : null}
          </View>
        ) : null}
        {variant === 'card' ? box : null}
      </Pressable>
    );
  }
);

Checkbox.displayName = 'Checkbox';
