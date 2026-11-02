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
import { Text, textChildren } from '../../primitives/text';
import { requestRadioValueChange } from './radio-group-value';
import type { ViewRef } from '../../primitives/refs';

type RadioVariant = 'dot' | 'card';
type RadioOrientation = 'vertical' | 'horizontal';

const itemVariants = tv({
  slots: {
    // `self-start` matters: the group is a column, so without it Yoga stretches
    // the row to the full width and the dead space to the right of the label
    // becomes part of the target. Tapping nothing would select the option.
    row: 'min-h-12 min-w-12 flex-row items-center gap-2.5 self-start',
    indicator:
      'h-5 w-5 items-center justify-center rounded-full border border-input bg-background',
    // Half the disc it sits in, at every size.
    dot: 'h-2.5 w-2.5 rounded-full bg-primary',
    label: 'text-sm text-foreground',
    description: 'text-xs text-muted-foreground',
  },
  variants: {
    /*
     * The disc, its dot and the text beside it move together, on the same
     * steps as Checkbox so the two line up in one form. The row stays 48
     * points tall at every size, because that is the touch target.
     *
     * Listed before `variant` so the card keeps the label weight it sets.
     */
    size: {
      xs: {
        row: 'gap-2',
        indicator: 'h-3.5 w-3.5',
        dot: 'h-1.5 w-1.5',
        label: 'text-xs',
        description: 'text-[11px]',
      },
      sm: {
        row: 'gap-2',
        indicator: 'h-4 w-4',
        dot: 'h-2 w-2',
        label: 'text-[13px]',
      },
      md: {},
      lg: {
        row: 'gap-3',
        indicator: 'h-6 w-6',
        dot: 'h-3 w-3',
        label: 'text-base',
        description: 'text-sm',
      },
      xl: {
        row: 'gap-3',
        indicator: 'h-7 w-7',
        dot: 'h-3.5 w-3.5',
        label: 'text-lg',
        description: 'text-sm',
      },
    },
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
    size: 'md',
  },
});

/** How big a group's discs and labels are. */
type RadioSize = NonNullable<VariantProps<typeof itemVariants>['size']>;

interface RadioGroupContextValue {
  value: string | undefined;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  variant: RadioVariant;
  size: RadioSize;
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
   * How big every option's disc and label are. Set on the group rather than
   * per option, because options of different sizes read as though one of them
   * matters more. The row keeps a 48-point target at every size.
   */
  size?: RadioSize;
  /**
   * `horizontal` lays the options out along a row that wraps — for two or
   * three short choices, where a stacked list wastes the width and reads as
   * longer than it is.
   */
  orientation?: RadioOrientation;
  children: ReactNode;
}

const RadioGroupRoot = forwardRef<ViewRef, RadioGroupProps>(
  (
    {
      className,
      value,
      onValueChange,
      disabled,
      variant = 'dot',
      size = 'md',
      orientation = 'vertical',
      children,
      ...props
    },
    ref
  ) => {
    const context = useMemo(
      () => ({ value, onValueChange, disabled, variant, size, orientation }),
      [value, onValueChange, disabled, variant, size, orientation]
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
          {textChildren(children)}
        </View>
      </RadioGroupContext.Provider>
    );
  }
);
RadioGroupRoot.displayName = 'RadioGroup';

export interface RadioGroupItemProps {
  /**
   * Styles the pressable row — layout, border, fill. It does not reach the
   * label: text colour is not inherited from a view in React Native, so use
   * `labelClassName` for that.
   */
  className?: string;
  value: string;
  label?: string;
  /** Classes for the label text, merged over the defaults — e.g. `text-black`. */
  labelClassName?: string;
  /** Secondary line under the label. Most at home in the `card` variant. */
  description?: string;
  /** Classes for the description text, merged over the defaults. */
  descriptionClassName?: string;
  disabled?: boolean;
  /** Hide the disc entirely — for a card whose selected fill is enough. */
  hideIndicator?: boolean;
  children?: ReactNode;
}

const RadioGroupItem = forwardRef<ViewRef, RadioGroupItemProps>(
  (
    {
      className,
      value,
      label,
      labelClassName,
      description,
      descriptionClassName,
      disabled: itemDisabled,
      hideIndicator,
      children,
    },
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
      size: context.size,
      selected,
      disabled: !!disabled,
      horizontal: context.orientation === 'horizontal',
    });

    const indicator = hideIndicator ? null : (
      <View className={slots.indicator()}>
        <Animated.View style={dotStyle} className={slots.dot()} />
      </View>
    );

    // Either way the label is a string in a row that is otherwise all views,
    // so children given instead of the prop are dressed the same way rather
    // than reaching the pressable bare.
    const labelled = label ? (
      <Text className={slots.label({ className: labelClassName })}>{label}</Text>
    ) : (
      textChildren(children, (text) => (
        <Text className={slots.label({ className: labelClassName })}>{text}</Text>
      ))
    );

    // The card lays its text out first so the disc sits at the trailing edge;
    // the dot row keeps the classic disc-then-label order.
    const body =
      variant === 'card' ? (
        <>
          <View className="flex-1 gap-1">
            {labelled}
            {description ? (
              <Text className={slots.description({ className: descriptionClassName })}>
                {description}
              </Text>
            ) : null}
          </View>
          {indicator}
        </>
      ) : (
        <>
          {indicator}
          {labelled}
        </>
      );

    return (
      <Pressable
        ref={ref}
        accessibilityRole="radio"
        accessibilityState={{ selected, disabled: !!disabled }}
        accessibilityLabel={label}
        disabled={disabled}
        onPress={() =>
          requestRadioValueChange(context.value, value, context.onValueChange)
        }
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

export type { RadioVariant, RadioSize };
