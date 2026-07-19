import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { tv } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { CheckIcon, ChevronDownIcon } from '../../icons';
import { Text } from '../../primitives/text';

const inlineSelectVariants = tv({
  slots: {
    trigger:
      'w-full flex-row items-center justify-between gap-3 rounded-2xl border border-input bg-background px-4 py-3.5',
    triggerLabel: 'flex-1 text-base font-medium text-foreground',
    placeholder: 'flex-1 text-base text-muted-foreground',
    list: 'mt-2 overflow-hidden rounded-2xl border border-border bg-popover p-2 shadow-sm',
    item: 'flex-row items-center gap-2 rounded-xl px-3 py-3',
    itemLabel: 'flex-1 text-base font-medium text-foreground',
    itemIndicator: 'h-5 w-5 items-center justify-center',
  },
  variants: {
    selected: {
      true: { item: 'bg-accent' },
    },
    disabled: {
      true: { trigger: 'opacity-[0.64]' },
    },
  },
});

interface InlineSelectContextValue {
  value: string | undefined;
  onSelect: (value: string) => void;
}

const InlineSelectContext = createContext<InlineSelectContextValue | null>(null);

export interface InlineSelectItemProps {
  value: string;
  label: string;
}

/** Option row. Rendered inline beneath the trigger — no overlay involved. */
function InlineSelectItem({ value, label }: InlineSelectItemProps) {
  const context = useContext(InlineSelectContext);
  if (!context) {
    throw new Error('InlineSelect.Item must be used within an <InlineSelect>');
  }

  const selected = context.value === value;
  const { item, itemLabel, itemIndicator } = inlineSelectVariants({ selected });
  const checkColor = useCSSVariable('--color-muted-foreground');

  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ selected }}
      onPress={() => context.onSelect(value)}
      className={item()}
    >
      <Text className={itemLabel()}>{label}</Text>
      <View className={itemIndicator()}>
        {selected ? (
          <CheckIcon
            size={16}
            color={typeof checkColor === 'string' ? checkColor : '#737373'}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

export interface InlineSelectProps {
  className?: string;
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  children: ReactNode;
}

/**
 * A select that expands its options inline instead of opening a bottom sheet.
 * Useful inside forms and scroll views where an overlay would be disruptive.
 */
function InlineSelectRoot({
  className,
  value,
  onValueChange,
  placeholder = 'Select an option',
  disabled,
  children,
}: InlineSelectProps) {
  const [open, setOpen] = useState(false);
  const chevron = useSharedValue(0);

  const selectedLabel = useMemo(() => {
    let label: string | undefined;
    Children.forEach(children, (child) => {
      if (isValidElement<InlineSelectItemProps>(child) && child.props.value === value) {
        label = child.props.label;
      }
    });
    return label;
  }, [children, value]);

  const toggle = useCallback(() => {
    setOpen((current) => {
      chevron.value = withTiming(current ? 0 : 1, { duration: 160 });
      return !current;
    });
  }, [chevron]);

  const context = useMemo<InlineSelectContextValue>(
    () => ({
      value,
      onSelect: (next) => {
        onValueChange(next);
        chevron.value = withTiming(0, { duration: 160 });
        setOpen(false);
      },
    }),
    [value, onValueChange, chevron]
  );

  const slots = inlineSelectVariants({ disabled: !!disabled });
  const chevronColor = useCSSVariable('--color-muted-foreground');

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevron.value * 180}deg` }],
  }));

  return (
    <InlineSelectContext.Provider value={context}>
      <View className={className}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !!disabled, expanded: open }}
          disabled={disabled}
          onPress={toggle}
          className={slots.trigger()}
        >
          {selectedLabel ? (
            <Text className={slots.triggerLabel()}>{selectedLabel}</Text>
          ) : (
            <Text className={slots.placeholder()}>{placeholder}</Text>
          )}
          <Animated.View style={chevronStyle}>
            <ChevronDownIcon
              color={typeof chevronColor === 'string' ? chevronColor : '#737373'}
            />
          </Animated.View>
        </Pressable>
        {open ? (
          <Animated.View
            entering={FadeIn.duration(140)}
            exiting={FadeOut.duration(120)}
            className={slots.list()}
          >
            {children}
          </Animated.View>
        ) : null}
      </View>
    </InlineSelectContext.Provider>
  );
}

export const InlineSelect = Object.assign(InlineSelectRoot, {
  Item: InlineSelectItem,
});
