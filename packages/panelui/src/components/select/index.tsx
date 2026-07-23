/**
 * Select — a picker with one trigger and three ways of showing its options.
 *
 * Which one is right depends on what surrounds the trigger, not on what the
 * options are, which is why it is a prop rather than three components:
 *
 * - `sheet` (default) takes the bottom of the screen. Best for a long list, or
 *   on a small screen where an anchored panel would cover the thing you are
 *   choosing for.
 * - `inline` expands the list in normal layout flow. Everything below moves
 *   down. Right inside a settings list, where that reads as the row growing;
 *   wrong anywhere the shift is jarring.
 * - `overlay` floats the list above the page through a portal, anchored to the
 *   trigger and flipped above it when there is no room below. Nothing else on
 *   the screen moves.
 *
 * ```tsx
 * <Select value={region} onValueChange={setRegion} presentation="overlay">
 *   <Select.Item value="us" label="United States" />
 *   <Select.Item value="eu" label="Europe" />
 * </Select>
 * ```
 */
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
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
import { getNativeUI } from '../../native';
import { Portal } from '../../primitives/portal';
import { Text } from '../../primitives/text';
import { BottomSheet } from '../bottom-sheet';

const selectVariants = tv({
  slots: {
    // `rounded-lg`, the same radius Button and Input use — a select sitting in
    // a form beside either of them should read as the same family of control.
    trigger:
      'w-full flex-row items-center justify-between gap-3 rounded-lg border border-input bg-background px-4 py-3.5',
    triggerLabel: 'flex-1 text-base font-medium text-foreground',
    placeholder: 'flex-1 text-base text-muted-foreground',
    list: 'overflow-hidden rounded-xl border border-border bg-popover p-2 shadow-sm',
    item: 'flex-row items-center gap-2 rounded-lg px-3 py-3',
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
    presentation: {
      sheet: {},
      inline: { list: 'mt-2' },
      overlay: { list: 'shadow-lg' },
    },
  },
  defaultVariants: {
    presentation: 'sheet',
  },
});

export type SelectPresentation = 'sheet' | 'inline' | 'overlay';

interface SelectContextValue {
  value: string | undefined;
  onSelect: (value: string) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

export interface SelectItemProps {
  value: string;
  label: string;
}

/** Declarative option. Rendered inside whichever surface is presenting. */
function SelectItem({ value, label }: SelectItemProps) {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error('Select.Item must be used within a <Select>');
  }

  const selected = context.value === value;
  const { item, itemLabel, itemIndicator } = selectVariants({ selected });
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

/** Trigger frame in window coordinates, measured when the list opens. */
interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectProps {
  className?: string;
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /**
   * Where the options appear. `sheet` takes the bottom of the screen, `inline`
   * expands the list in layout flow, `overlay` floats it above the page
   * anchored to the trigger.
   */
  presentation?: SelectPresentation;
  /** Sheet title shown above the options. `sheet` presentation only. */
  title?: string;
  /**
   * Width of the floating list. `trigger` matches the trigger, `content` sizes
   * to the longest option, or pass a pixel value. `overlay` only.
   */
  contentWidth?: 'trigger' | 'content' | number;
  /** Gap between the trigger and the floating list. `overlay` only. */
  offset?: number;
  /** Called when the options open or close. */
  onOpenChange?: (open: boolean) => void;
  /**
   * Render the platform's own picker instead of the trigger-and-list pair.
   * Requires the optional `@expo/ui` package; without it this prop does
   * nothing.
   *
   * **Theme tokens do not apply** — the platform draws the picker, so
   * `className`, `title` and `presentation` are ignored. `Select.Item`
   * children still declare the options.
   */
  native?: boolean;
  /**
   * Native picker style. `menu` is a compact button opening a dropdown;
   * `wheel` is an always-visible rotor (iOS; falls back to `menu` elsewhere).
   */
  nativeAppearance?: 'menu' | 'wheel';
  children: ReactNode;
}

function SelectRoot({
  className,
  value,
  onValueChange,
  placeholder = 'Select an option',
  disabled,
  presentation = 'sheet',
  title,
  contentWidth = 'trigger',
  offset = 8,
  onOpenChange,
  native,
  nativeAppearance = 'menu',
  children,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [listHeight, setListHeight] = useState(0);
  const triggerRef = useRef<View>(null);
  const chevron = useSharedValue(0);
  const { height: screenHeight } = useWindowDimensions();
  const nativeUI = native ? getNativeUI() : null;

  const options = useMemo(() => {
    const collected: SelectItemProps[] = [];
    Children.forEach(children, (child) => {
      if (isValidElement<SelectItemProps>(child)) {
        collected.push({ value: child.props.value, label: child.props.label });
      }
    });
    return collected;
  }, [children]);

  const selectedLabel = useMemo(
    () => options.find((option) => option.value === value)?.label,
    [options, value]
  );

  const close = useCallback(() => {
    chevron.value = withTiming(0, { duration: 160 });
    setOpen(false);
    onOpenChange?.(false);
  }, [chevron, onOpenChange]);

  const toggle = useCallback(() => {
    if (open) {
      close();
      return;
    }

    const show = () => {
      chevron.value = withTiming(1, { duration: 160 });
      setOpen(true);
      onOpenChange?.(true);
    };

    if (presentation !== 'overlay') {
      show();
      return;
    }

    // The floating list is positioned in window coordinates, so it has to know
    // where the trigger actually landed — not where layout said it would.
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      show();
    });
  }, [chevron, close, onOpenChange, open, presentation]);

  const context = useMemo<SelectContextValue>(
    () => ({
      value,
      onSelect: (next) => {
        onValueChange(next);
        close();
      },
    }),
    [value, onValueChange, close]
  );

  const slots = selectVariants({ disabled: !!disabled, presentation });
  const chevronColor = useCSSVariable('--color-muted-foreground');

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevron.value * 180}deg` }],
  }));

  if (nativeUI) {
    const { Host, Picker } = nativeUI;
    // The native picker has no empty state, so an unset value shows the first
    // option rather than the placeholder.
    return (
      // A picker fills the width of the row it sits in and reports its own
      // height — a menu is a compact button, a wheel a full rotor, and the
      // platform is the only thing that knows which by how much.
      <Host matchContents={{ vertical: true }}>
        <Picker
          selectedValue={value ?? options[0]?.value ?? ''}
          onValueChange={(next: string) => onValueChange(next)}
          appearance={nativeAppearance}
          enabled={!disabled}
        >
          {options.map((option) => (
            <Picker.Item key={option.value} label={option.label} value={option.value} />
          ))}
        </Picker>
      </Host>
    );
  }

  const trigger = (
    <Pressable
      ref={triggerRef}
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
  );

  if (presentation === 'sheet') {
    return (
      <SelectContext.Provider value={context}>
        <View className={className}>{trigger}</View>
        {/* The sheet only ever reports a close — it is opened from the
            trigger — and close() has the chevron to put back. */}
        <BottomSheet
          open={open}
          onOpenChange={(next) => {
            if (!next) close();
          }}
        >
          <BottomSheet.Content>
            {/* BottomSheet.Content portals its children out of this subtree —
                re-provide the select context so Select.Item keeps working. */}
            <SelectContext.Provider value={context}>
              {title ? (
                <Text size="lg" weight="semibold" className="mb-2 px-3">
                  {title}
                </Text>
              ) : null}
              <ScrollView bounces={false} className="max-h-96">
                <View className="gap-1 pb-2">{children}</View>
              </ScrollView>
            </SelectContext.Provider>
          </BottomSheet.Content>
        </BottomSheet>
      </SelectContext.Provider>
    );
  }

  if (presentation === 'inline') {
    return (
      <SelectContext.Provider value={context}>
        <View className={className}>
          {trigger}
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
      </SelectContext.Provider>
    );
  }

  // Flip above the trigger when the list would run off the bottom. listHeight
  // is 0 on the first frame, so the list opens downwards and corrects itself
  // once measured — which is invisible inside the 140ms fade.
  const spaceBelow = anchor ? screenHeight - (anchor.y + anchor.height) - offset : 0;
  const flip = !!anchor && listHeight > 0 && listHeight > spaceBelow;

  const overlayPosition = anchor
    ? {
        position: 'absolute' as const,
        left: anchor.x,
        ...(flip
          ? { bottom: screenHeight - anchor.y + offset }
          : { top: anchor.y + anchor.height + offset }),
        ...(contentWidth === 'trigger'
          ? { width: anchor.width }
          : typeof contentWidth === 'number'
            ? { width: contentWidth }
            : { minWidth: anchor.width }),
        // Never collapse to nothing in a cramped viewport — the list scrolls.
        maxHeight: Math.max((flip ? anchor.y : spaceBelow) - offset, 160),
      }
    : null;

  const onListLayout = (event: LayoutChangeEvent) => {
    setListHeight(event.nativeEvent.layout.height);
  };

  return (
    <SelectContext.Provider value={context}>
      <View className={className}>{trigger}</View>

      {open && overlayPosition ? (
        <Portal>
          {/* Full-screen catcher so a press anywhere else dismisses the list. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={close}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <SelectContext.Provider value={context}>
            <Animated.View
              entering={FadeIn.duration(140)}
              exiting={FadeOut.duration(120)}
              onLayout={onListLayout}
              style={overlayPosition}
              className={slots.list()}
            >
              <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                {children}
              </ScrollView>
            </Animated.View>
          </SelectContext.Provider>
        </Portal>
      ) : null}
    </SelectContext.Provider>
  );
}

export const Select = Object.assign(SelectRoot, {
  Item: SelectItem,
});
