import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { tv } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { CheckIcon, ChevronDownIcon } from '../../icons';
import { Text } from '../../primitives/text';
import { BottomSheet } from '../bottom-sheet';

const selectVariants = tv({
  slots: {
    trigger:
      'h-11 w-full flex-row items-center justify-between rounded-lg border border-input bg-background px-3',
    triggerLabel: 'text-base text-foreground',
    placeholder: 'text-base text-muted-foreground',
    item: 'flex-row items-center justify-between rounded-lg px-3 py-3.5',
    itemLabel: 'text-base text-foreground',
  },
  variants: {
    selected: {
      true: { item: 'bg-accent', itemLabel: 'font-medium' },
    },
    disabled: {
      true: { trigger: 'opacity-50' },
    },
  },
});

interface SelectContextValue {
  value: string | undefined;
  onSelect: (value: string) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

export interface SelectItemProps {
  value: string;
  label: string;
}

/** Declarative option. Rendered inside the picker sheet. */
function SelectItem({ value, label }: SelectItemProps) {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error('Select.Item must be used within a <Select>');
  }

  const selected = context.value === value;
  const { item, itemLabel } = selectVariants({ selected });
  const checkColor = useCSSVariable('--muted-foreground');

  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ selected }}
      onPress={() => context.onSelect(value)}
      className={item()}
    >
      <Text className={itemLabel()}>{label}</Text>
      {selected ? (
        <CheckIcon
          size={16}
          color={typeof checkColor === 'string' ? checkColor : '#737373'}
        />
      ) : null}
    </Pressable>
  );
}

export interface SelectProps {
  className?: string;
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Sheet title shown above the options. */
  title?: string;
  disabled?: boolean;
  children: ReactNode;
}

function SelectRoot({
  className,
  value,
  onValueChange,
  placeholder = 'Select an option',
  title,
  disabled,
  children,
}: SelectProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    let label: string | undefined;
    Children.forEach(children, (child) => {
      if (
        isValidElement<SelectItemProps>(child) &&
        child.props.value === value
      ) {
        label = child.props.label;
      }
    });
    return label;
  }, [children, value]);

  const context = useMemo<SelectContextValue>(
    () => ({
      value,
      onSelect: (next) => {
        onValueChange(next);
        setOpen(false);
      },
    }),
    [value, onValueChange]
  );

  const { trigger, triggerLabel, placeholder: placeholderSlot } = selectVariants({
    disabled: !!disabled,
  });
  const chevronColor = useCSSVariable('--muted-foreground');

  return (
    <SelectContext.Provider value={context}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={trigger({ className })}
      >
        {selectedLabel ? (
          <Text className={triggerLabel()}>{selectedLabel}</Text>
        ) : (
          <Text className={placeholderSlot()}>{placeholder}</Text>
        )}
        <ChevronDownIcon
          color={typeof chevronColor === 'string' ? chevronColor : '#737373'}
        />
      </Pressable>
      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheet.Content>
          {title ? (
            <Text size="lg" weight="semibold" className="mb-2 px-3">
              {title}
            </Text>
          ) : null}
          <ScrollView bounces={false} className="max-h-96">
            <View className="gap-1 pb-2">{children}</View>
          </ScrollView>
        </BottomSheet.Content>
      </BottomSheet>
    </SelectContext.Provider>
  );
}

export const Select = Object.assign(SelectRoot, {
  Item: SelectItem,
});
