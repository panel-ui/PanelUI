/**
 * InlineSelect — a select that reveals its options next to the trigger instead
 * of taking over the screen with a sheet.
 *
 * Two presentations, because the right one depends on what surrounds it:
 *
 * - Inline (default) expands the list in normal layout flow. Everything below
 *   moves down. Fine inside a settings list where that reads as the row
 *   growing, wrong anywhere the shift is jarring.
 * - `overlay` floats the list above the page through a portal, anchored to the
 *   trigger and flipped above it when there is no room below. Nothing else on
 *   the screen moves.
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
import { Portal } from '../../primitives/portal';
import { Text } from '../../primitives/text';

const inlineSelectVariants = tv({
  slots: {
    trigger:
      'w-full flex-row items-center justify-between gap-3 rounded-2xl border border-input bg-background px-4 py-3.5',
    triggerLabel: 'flex-1 text-base font-medium text-foreground',
    placeholder: 'flex-1 text-base text-muted-foreground',
    list: 'overflow-hidden rounded-2xl border border-border bg-popover p-2 shadow-sm',
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
    presentation: {
      inline: { list: 'mt-2' },
      overlay: { list: 'shadow-lg' },
    },
  },
  defaultVariants: {
    presentation: 'inline',
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

/** Option row. */
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

/** Trigger frame in window coordinates, measured when the list opens. */
interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InlineSelectProps {
  className?: string;
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /**
   * Float the list above the page instead of expanding it in layout flow, so
   * opening the select does not push the content below it down.
   */
  overlay?: boolean;
  /**
   * Width of the floating list. `trigger` matches the trigger, `content` sizes
   * to the longest option, or pass a pixel value. Ignored without `overlay`.
   */
  overlayWidth?: 'trigger' | 'content' | number;
  /** Gap between the trigger and the floating list. Ignored without `overlay`. */
  overlayOffset?: number;
  /** Called when the list opens or closes. */
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

function InlineSelectRoot({
  className,
  value,
  onValueChange,
  placeholder = 'Select an option',
  disabled,
  overlay = false,
  overlayWidth = 'trigger',
  overlayOffset = 8,
  onOpenChange,
  children,
}: InlineSelectProps) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [listHeight, setListHeight] = useState(0);
  const triggerRef = useRef<View>(null);
  const chevron = useSharedValue(0);
  const { height: screenHeight } = useWindowDimensions();

  const selectedLabel = useMemo(() => {
    let label: string | undefined;
    Children.forEach(children, (child) => {
      if (isValidElement<InlineSelectItemProps>(child) && child.props.value === value) {
        label = child.props.label;
      }
    });
    return label;
  }, [children, value]);

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

    if (!overlay) {
      show();
      return;
    }

    // The list is positioned in window coordinates, so it has to know where
    // the trigger actually landed — not where layout said it would.
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      show();
    });
  }, [chevron, close, onOpenChange, open, overlay]);

  const context = useMemo<InlineSelectContextValue>(
    () => ({
      value,
      onSelect: (next) => {
        onValueChange(next);
        close();
      },
    }),
    [value, onValueChange, close]
  );

  const slots = inlineSelectVariants({
    disabled: !!disabled,
    presentation: overlay ? 'overlay' : 'inline',
  });
  const chevronColor = useCSSVariable('--color-muted-foreground');

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevron.value * 180}deg` }],
  }));

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

  if (!overlay) {
    return (
      <InlineSelectContext.Provider value={context}>
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
      </InlineSelectContext.Provider>
    );
  }

  // Flip above the trigger when the list would run off the bottom. listHeight
  // is 0 on the first frame, so the list opens downwards and corrects itself
  // once measured — which is invisible inside the 140ms fade.
  const spaceBelow = anchor
    ? screenHeight - (anchor.y + anchor.height) - overlayOffset
    : 0;
  const flip = !!anchor && listHeight > 0 && listHeight > spaceBelow;

  const overlayPosition = anchor
    ? {
        position: 'absolute' as const,
        left: anchor.x,
        ...(flip
          ? { bottom: screenHeight - anchor.y + overlayOffset }
          : { top: anchor.y + anchor.height + overlayOffset }),
        ...(overlayWidth === 'trigger'
          ? { width: anchor.width }
          : typeof overlayWidth === 'number'
            ? { width: overlayWidth }
            : { minWidth: anchor.width }),
        // Never collapse to nothing in a cramped viewport — the list scrolls.
        maxHeight: Math.max((flip ? anchor.y : spaceBelow) - overlayOffset, 160),
      }
    : null;

  const onListLayout = (event: LayoutChangeEvent) => {
    setListHeight(event.nativeEvent.layout.height);
  };

  return (
    <InlineSelectContext.Provider value={context}>
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
          <InlineSelectContext.Provider value={context}>
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
          </InlineSelectContext.Provider>
        </Portal>
      ) : null}
    </InlineSelectContext.Provider>
  );
}

export const InlineSelect = Object.assign(InlineSelectRoot, {
  Item: InlineSelectItem,
});
