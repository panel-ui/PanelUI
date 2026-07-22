/**
 * RadioGroup — one choice from a set.
 *
 * The group owns the value and hands each item its selected state through
 * context, so an item is a thin pressable that reports its own value up and
 * reads selection back down.
 *
 * Two shapes, chosen on the group and inherited by every item: `dot` is the
 * classic label-beside-a-disc row; `card` turns the whole surface into the
 * target — for pickable options where the disc is a confirmation rather than
 * the thing you aim at. The card is the same treatment `Checkbox` offers, so a
 * form mixing single- and multi-select choices reads as one family.
 *
 * ```tsx
 * <RadioGroup value={plan} onValueChange={setPlan} variant="card">
 *   <RadioGroup.Item value="pro" label="Pro" description="For growing teams" />
 *   <RadioGroup.Item value="max" label="Max" description="Everything, uncapped" />
 * </RadioGroup>
 * ```
 */
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { Pressable, View, type ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../../utils/cn';
import { Text } from '../../primitives/text';

type RadioVariant = 'dot' | 'card';
type RadioOrientation = 'vertical' | 'horizontal';

const itemVariants = tv({
  slots: {
    // `self-start` matters: the group is a column, so without it Yoga stretches
    // the row to the full width and the dead space to the right of the label
    // becomes part of the target. Tapping nothing would select the option.
    row: 'flex-row items-center gap-2.5 self-start',
    indicator:
      'h-5 w-5 items-center justify-center rounded-full border border-input bg-background',
    label: 'text-sm text-foreground',
    description: 'text-xs text-muted-foreground',
  },
  variants: {
    variant: {
      dot: {},
      card: {
        // The whole surface is the target; the disc moves to the trailing edge
        // as a confirmation of the row, not the affordance for it. Here the
        // full width is deliberate, so it takes `self-stretch` back.
        row: 'w-full self-stretch items-start justify-between gap-3 rounded-xl border border-border bg-card p-4',
        label: 'text-base font-medium',
      },
    },
    selected: {
      true: {},
    },
    disabled: {
      true: { row: 'opacity-50' },
    },
    /**
     * A card in a row shares the width rather than filling it, so two or three
     * options sit side by side instead of each taking the whole line.
     */
    horizontal: {
      true: {},
    },
  },
  compoundVariants: [
    { variant: 'card', selected: true, class: { row: 'border-primary bg-accent' } },
    // Share the row instead of filling it, keeping the disc on the trailing
    // edge of each narrower card.
    { variant: 'card', horizontal: true, class: { row: 'w-auto flex-1' } },
  ],
  defaultVariants: {
    variant: 'dot',
  },
});

interface RadioGroupContextValue {
  value: string | undefined;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  variant: RadioVariant;
  orientation: RadioOrientation;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps extends ViewProps {
  className?: string;
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  /**
   * `dot` is the label-beside-a-disc row. `card` makes the whole surface the
   * target and highlights the selected option — for a plan picker or a
   * settings choice where each option carries a description.
   */
  variant?: RadioVariant;
  /**
   * `horizontal` lays the options out along a row that wraps — for two or
   * three short choices, where a stacked list wastes the width and reads as
   * longer than it is.
   */
  orientation?: RadioOrientation;
  children: ReactNode;
}

const RadioGroupRoot = forwardRef<View, RadioGroupProps>(
  (
    {
      className,
      value,
      onValueChange,
      disabled,
      variant = 'dot',
      orientation = 'vertical',
      children,
      ...props
    },
    ref
  ) => {
    const context = useMemo(
      () => ({ value, onValueChange, disabled, variant, orientation }),
      [value, onValueChange, disabled, variant, orientation]
    );

    return (
      <RadioGroupContext.Provider value={context}>
        <View
          ref={ref}
          accessibilityRole="radiogroup"
          className={cn(
            orientation === 'horizontal'
              ? // Wrapping, not scrolling: a choice that runs off the edge is
                // a choice nobody knows is there. The cross-axis gap is
                // smaller because wrapped rows already read as separate.
                'flex-row flex-wrap items-stretch gap-x-5 gap-y-3'
              : 'gap-3',
            className
          )}
          {...props}
        >
          {children}
        </View>
      </RadioGroupContext.Provider>
    );
  }
);
RadioGroupRoot.displayName = 'RadioGroup';

export interface RadioGroupItemProps {
  className?: string;
  value: string;
  label?: string;
  /** Secondary line under the label. Most at home in the `card` variant. */
  description?: string;
  disabled?: boolean;
  /** Hide the disc entirely — for a card whose selected fill is enough. */
  hideIndicator?: boolean;
  children?: ReactNode;
}

const RadioGroupItem = forwardRef<View, RadioGroupItemProps>(
  (
    { className, value, label, description, disabled: itemDisabled, hideIndicator, children },
    ref
  ) => {
    const context = useContext(RadioGroupContext);
    if (!context) {
      throw new Error('RadioGroup.Item must be used within a <RadioGroup>');
    }

    const selected = context.value === value;
    const disabled = itemDisabled || context.disabled;
    const variant = context.variant;
    const progress = useSharedValue(selected ? 1 : 0);

    useEffect(() => {
      progress.value = selected
        ? withSpring(1, { damping: 15, stiffness: 300, mass: 0.5 })
        : withTiming(0, { duration: 120 });
    }, [selected, progress]);

    const dotStyle = useAnimatedStyle(() => ({
      opacity: progress.value,
      transform: [{ scale: progress.value }],
    }));

    const slots = itemVariants({
      variant,
      selected,
      disabled: !!disabled,
      horizontal: context.orientation === 'horizontal',
    });

    const indicator = hideIndicator ? null : (
      <View className={slots.indicator()}>
        <Animated.View style={dotStyle} className="h-2.5 w-2.5 rounded-full bg-primary" />
      </View>
    );

    // The card lays its text out first so the disc sits at the trailing edge;
    // the dot row keeps the classic disc-then-label order.
    const body =
      variant === 'card' ? (
        <>
          <View className="flex-1 gap-1">
            {label ? <Text className={slots.label()}>{label}</Text> : children}
            {description ? (
              <Text className={slots.description()}>{description}</Text>
            ) : null}
          </View>
          {indicator}
        </>
      ) : (
        <>
          {indicator}
          {label ? <Text className={slots.label()}>{label}</Text> : children}
        </>
      );

    return (
      <Pressable
        ref={ref}
        accessibilityRole="radio"
        accessibilityState={{ selected, disabled: !!disabled }}
        accessibilityLabel={label}
        disabled={disabled}
        onPress={() => context.onValueChange(value)}
        hitSlop={variant === 'card' ? undefined : 8}
        className={slots.row({ className })}
      >
        {body}
      </Pressable>
    );
  }
);
RadioGroupItem.displayName = 'RadioGroup.Item';

export const RadioGroup = Object.assign(RadioGroupRoot, {
  Item: RadioGroupItem,
});

export type { RadioVariant };
