/**
 * ToggleButton — a button that stays down.
 *
 * The difference from Button is the whole point: a button does something and
 * springs back, a toggle button *is* something afterwards. So the selected
 * state is the loud one — a filled accent surface — and the resting state is
 * quiet, either a soft fill or nothing at all.
 *
 * ```tsx
 * <ToggleButton defaultSelected>Like</ToggleButton>
 *
 * <ToggleButton iconOnly accessibilityLabel="Bold">
 *   <BoldIcon size={16} />
 * </ToggleButton>
 * ```
 *
 * `ToggleButtonGroup` takes over the state for a set of them — a segmented
 * toolbar in `multiple` mode, an either-or choice in `single`. Inside a group
 * each button needs an `id`, which is the value the group reports.
 *
 * ```tsx
 * <ToggleButtonGroup selectionMode="multiple" value={marks} onValueChange={setMarks}>
 *   <ToggleButton id="bold" iconOnly accessibilityLabel="Bold">…</ToggleButton>
 *   <ToggleButton id="italic" iconOnly accessibilityLabel="Italic">…</ToggleButton>
 * </ToggleButtonGroup>
 * ```
 */
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { View, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { IconColorProvider } from '../../icons';
import {
  AnimatedPressable,
  type AnimatedPressableProps,
} from '../../primitives/animated-pressable';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';

const toggleVariants = tv({
  slots: {
    root: 'flex-row items-center justify-center gap-2 rounded-lg border border-transparent',
    label: 'font-medium',
  },
  variants: {
    variant: {
      /** A soft fill at rest, so the control is visible before you touch it. */
      default: { root: 'bg-secondary' },
      /** Nothing at rest — for a dense toolbar where six fills would be noise. */
      ghost: { root: 'bg-transparent' },
    },
    size: {
      sm: { root: 'h-9 gap-1.5 px-2.5', label: 'text-sm' },
      md: { root: 'h-11 px-4', label: 'text-base' },
      lg: { root: 'h-12 px-6', label: 'text-lg' },
    },
    selected: {
      true: { root: 'border-primary/24 bg-accent', label: 'text-accent-foreground' },
      false: { label: 'text-muted-foreground' },
    },
    iconOnly: {
      true: { root: 'px-0' },
    },
    disabled: {
      true: { root: 'opacity-[0.64]' },
    },
  },
  compoundVariants: [
    // Square, and sized from the height so the icon sits in the middle.
    { iconOnly: true, size: 'sm', class: { root: 'w-9' } },
    { iconOnly: true, size: 'md', class: { root: 'w-11' } },
    { iconOnly: true, size: 'lg', class: { root: 'w-12' } },
  ],
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

type ToggleVariantProps = VariantProps<typeof toggleVariants>;
export type ToggleButtonSize = NonNullable<ToggleVariantProps['size']>;
export type ToggleButtonVariant = NonNullable<ToggleVariantProps['variant']>;
export type ToggleSelectionMode = 'single' | 'multiple';

/* -------------------------------------------------------------------------- */
/* Group                                                                      */
/* -------------------------------------------------------------------------- */

interface ToggleGroupContextValue {
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  disabled: boolean;
  variant?: ToggleButtonVariant;
  size?: ToggleButtonSize;
}

const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null);

export interface ToggleButtonGroupProps extends ViewProps {
  className?: string;
  /**
   * `multiple` is a set of independent marks — bold *and* italic. `single` is
   * an either-or choice where picking one clears the last.
   */
  selectionMode?: ToggleSelectionMode;
  /** Selected ids. Controlled — pair with `onValueChange`. */
  value?: string[];
  /** Starting selection when uncontrolled. */
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Disables every button in the group. */
  disabled?: boolean;
  /** Applied to every button that does not set its own. */
  variant?: ToggleButtonVariant;
  size?: ToggleButtonSize;
  children: ReactNode;
}

const ToggleButtonGroup = forwardRef<View, ToggleButtonGroupProps>(
  (
    {
      className,
      selectionMode = 'multiple',
      value,
      defaultValue = [],
      onValueChange,
      disabled = false,
      variant,
      size,
      children,
      ...props
    },
    ref
  ) => {
    const isControlled = value !== undefined;
    const [internal, setInternal] = useState<string[]>(defaultValue);
    const selection = isControlled ? value : internal;

    const toggle = useCallback(
      (id: string) => {
        const has = selection.includes(id);
        const next =
          selectionMode === 'single'
            ? // Pressing the selected one again clears it. A toolbar filter you
              // cannot turn off is a trap.
              has
              ? []
              : [id]
            : has
              ? selection.filter((item) => item !== id)
              : [...selection, id];

        if (!isControlled) setInternal(next);
        onValueChange?.(next);
      },
      [selection, selectionMode, isControlled, onValueChange]
    );

    const context = useMemo<ToggleGroupContextValue>(
      () => ({
        isSelected: (id) => selection.includes(id),
        toggle,
        disabled,
        variant,
        size,
      }),
      [selection, toggle, disabled, variant, size]
    );

    return (
      <ToggleGroupContext.Provider value={context}>
        <View
          ref={ref}
          // `radiogroup` for an either-or choice, `toolbar` for a set of
          // independent marks — the two are read out differently, and which
          // one applies is exactly what selectionMode says.
          accessibilityRole={selectionMode === 'single' ? 'radiogroup' : 'toolbar'}
          className={cn('flex-row items-center gap-1.5', className)}
          {...props}
        >
          {children}
        </View>
      </ToggleGroupContext.Provider>
    );
  }
);
ToggleButtonGroup.displayName = 'ToggleButtonGroup';

/* -------------------------------------------------------------------------- */
/* Button                                                                     */
/* -------------------------------------------------------------------------- */

interface ToggleStateValue {
  selected: boolean;
  disabled: boolean;
}

const ToggleStateContext = createContext<ToggleStateValue | null>(null);

/**
 * The toggle's own state, for anything rendered inside it — an icon that
 * changes shape when selected, a count that only shows when it is on.
 */
export function useToggleButton(): ToggleStateValue {
  const state = useContext(ToggleStateContext);
  if (!state) {
    throw new Error('useToggleButton must be used within a <ToggleButton>');
  }
  return state;
}

export interface ToggleButtonProps
  extends Omit<AnimatedPressableProps, 'children' | 'disabled'>,
    Omit<ToggleVariantProps, 'selected' | 'disabled' | 'iconOnly'> {
  children?: ReactNode;
  className?: string;
  /** Extra classes for the label when children is a string. */
  labelClassName?: string;
  /** Identifies this button within a `ToggleButtonGroup`. Required there. */
  id?: string;
  /** Controlled selection. Ignored inside a group, which owns the state. */
  selected?: boolean;
  /** Starting state when uncontrolled and outside a group. */
  defaultSelected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  disabled?: boolean;
  /** Square, with no horizontal padding — for a single icon. */
  iconOnly?: boolean;
  /** Extra classes applied only while selected. */
  selectedClassName?: string;
  /** Extra classes applied only while unselected. */
  unselectedClassName?: string;
}

const ToggleButtonRoot = forwardRef<View, ToggleButtonProps>(
  (
    {
      children,
      className,
      labelClassName,
      id,
      selected: selectedProp,
      defaultSelected = false,
      onSelectedChange,
      disabled,
      variant,
      size,
      iconOnly = false,
      selectedClassName,
      unselectedClassName,
      onPress,
      ...props
    },
    ref
  ) => {
    const group = useContext(ToggleGroupContext);
    const [internal, setInternal] = useState(defaultSelected);

    /*
     * Three sources of truth, in order: the group owns it if there is one,
     * then a `selected` prop, then local state. The group comes first because
     * a button inside one that also took a `selected` prop would fight it, and
     * the group is the thing that knows about the other buttons.
     */
    const selected = group && id ? group.isSelected(id) : (selectedProp ?? internal);
    const isDisabled = disabled || (group?.disabled ?? false);

    const slots = toggleVariants({
      variant: variant ?? group?.variant,
      size: size ?? group?.size,
      selected,
      iconOnly,
      disabled: isDisabled,
    });

    // Icons inside inherit this, so they follow the surface they sit on
    // instead of every caller hardcoding a hex that is wrong in one theme.
    const onColor = useCSSVariable('--color-accent-foreground');
    const offColor = useCSSVariable('--color-muted-foreground');
    const tint = selected ? onColor : offColor;

    const handlePress = useCallback<NonNullable<AnimatedPressableProps['onPress']>>(
      (event) => {
        onPress?.(event);
        if (group && id) {
          group.toggle(id);
          return;
        }
        const next = !selected;
        if (selectedProp === undefined) setInternal(next);
        onSelectedChange?.(next);
      },
      [onPress, group, id, selected, selectedProp, onSelectedChange]
    );

    const state = useMemo(
      () => ({ selected, disabled: isDisabled }),
      [selected, isDisabled]
    );

    return (
      <ToggleStateContext.Provider value={state}>
        <IconColorProvider color={typeof tint === 'string' ? tint : undefined}>
          <AnimatedPressable
            ref={ref}
            accessibilityRole="button"
            // `checked` is what a screen reader reads out as "on"/"off"; the
            // selected state is the entire point of this control, so it is
            // not left to be inferred from the colour.
            accessibilityState={{ checked: selected, disabled: isDisabled, selected }}
            aria-pressed={selected}
            disabled={isDisabled}
            onPress={handlePress}
            className={cn(
              slots.root({ className }),
              selected ? selectedClassName : unselectedClassName
            )}
            {...props}
          >
            {typeof children === 'string' ? (
              <Text className={slots.label({ className: labelClassName })}>
                {children}
              </Text>
            ) : (
              children
            )}
          </AnimatedPressable>
        </IconColorProvider>
      </ToggleStateContext.Provider>
    );
  }
);
ToggleButtonRoot.displayName = 'ToggleButton';

export interface ToggleButtonLabelProps {
  className?: string;
  children: ReactNode;
}

/**
 * The label, when the button holds more than a string — an icon beside text.
 * It reads the selected state itself, so composing the two does not mean
 * threading the colour through by hand.
 */
function ToggleButtonLabel({ className, children }: ToggleButtonLabelProps) {
  const { selected } = useToggleButton();

  return (
    <Text
      className={cn(
        'font-medium',
        selected ? 'text-accent-foreground' : 'text-muted-foreground',
        className
      )}
    >
      {children}
    </Text>
  );
}
ToggleButtonLabel.displayName = 'ToggleButton.Label';

export const ToggleButton = Object.assign(ToggleButtonRoot, {
  Label: ToggleButtonLabel,
});

export { ToggleButtonGroup };
