/**
 * Accordion — collapsible sections.
 *
 * Adapted from: heroui-inc/heroui-native src/components/accordion/
 * (the Item / Trigger / Indicator / Content anatomy, single vs multiple
 * selection, the rotating chevron indicator, and layout-transition expand).
 *
 * Upstream ships `default` and `surface`; the extra variants here follow the
 * same slot structure.
 */
import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, View, type Text as RNText, type ViewProps } from 'react-native';
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { tv } from 'tailwind-variants';
import { ChevronDownIcon } from '../../icons';
import { Text, type TextProps } from '../../primitives/text';

export type AccordionVariant =
  | 'default'
  | 'surface'
  | 'separated'
  | 'bordered'
  | 'ghost';

export type AccordionSelectionMode = 'single' | 'multiple';

const accordionVariants = tv({
  slots: {
    root: 'w-full flex-col overflow-hidden',
    separator: 'h-px bg-border',
    item: 'flex-col overflow-hidden',
    trigger: 'flex-row items-center justify-between gap-4 py-4',
    title: 'flex-1 text-base font-medium text-foreground',
    indicator: 'items-center justify-center',
    content: 'pb-4',
    contentText: 'text-sm text-muted-foreground',
  },
  variants: {
    variant: {
      default: { trigger: 'px-1', content: 'px-1' },
      surface: {
        root: 'rounded-2xl border border-border bg-surface',
        separator: 'mx-4',
        trigger: 'px-4',
        content: 'px-4',
      },
      separated: {
        root: 'gap-2.5 overflow-visible',
        separator: 'hidden',
        item: 'rounded-xl border border-border bg-card',
        trigger: 'px-4',
        content: 'px-4',
      },
      bordered: {
        separator: 'hidden',
        item: 'mb-2 rounded-xl border border-border',
        trigger: 'px-4',
        content: 'px-4',
      },
      ghost: {
        separator: 'hidden',
        trigger: 'px-0',
        content: 'px-0',
      },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

interface AccordionContextValue {
  expanded: string[];
  toggle: (value: string) => void;
  variant: AccordionVariant;
}

interface AccordionItemContextValue {
  value: string;
  isExpanded: boolean;
  isDisabled: boolean;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);
const AccordionItemContext = createContext<AccordionItemContextValue | null>(null);

function useAccordion(component: string): AccordionContextValue {
  const context = useContext(AccordionContext);
  if (!context) throw new Error(`${component} must be used within an <Accordion>`);
  return context;
}

function useAccordionItem(component: string): AccordionItemContextValue {
  const context = useContext(AccordionItemContext);
  if (!context) throw new Error(`${component} must be used within an <Accordion.Item>`);
  return context;
}

export interface AccordionProps extends ViewProps {
  className?: string;
  variant?: AccordionVariant;
  /** `single` collapses the open item when another opens. */
  selectionMode?: AccordionSelectionMode;
  /** Expanded item value(s), controlled. */
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  /** Hide the hairlines drawn between items. */
  hideSeparator?: boolean;
  children?: ReactNode;
}

const toArray = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const AccordionRoot = forwardRef<View, AccordionProps>(
  (
    {
      className,
      variant = 'default',
      selectionMode = 'single',
      value,
      defaultValue,
      onValueChange,
      hideSeparator = false,
      children,
      ...props
    },
    ref
  ) => {
    const [internal, setInternal] = useState<string[]>(() => toArray(defaultValue));
    const isControlled = value !== undefined;
    const expanded = isControlled ? toArray(value) : internal;

    const toggle = useCallback(
      (itemValue: string) => {
        const isOpen = expanded.includes(itemValue);
        const next =
          selectionMode === 'single'
            ? isOpen
              ? []
              : [itemValue]
            : isOpen
              ? expanded.filter((entry) => entry !== itemValue)
              : [...expanded, itemValue];

        if (!isControlled) setInternal(next);
        // Hand back the shape the caller gave us.
        onValueChange?.(selectionMode === 'single' ? (next[0] ?? '') : next);
      },
      [expanded, selectionMode, isControlled, onValueChange]
    );

    const context = useMemo(
      () => ({ expanded, toggle, variant }),
      [expanded, toggle, variant]
    );

    const { root, separator } = accordionVariants({ variant });
    const items = Children.toArray(children).filter(isValidElement);

    return (
      <AccordionContext.Provider value={context}>
        <Animated.View
          ref={ref}
          layout={LinearTransition.duration(200)}
          className={root({ className })}
          {...props}
        >
          {items.map((child, index) => (
            <View key={child.key ?? index}>
              {child}
              {!hideSeparator && index < items.length - 1 ? (
                <View className={separator()} />
              ) : null}
            </View>
          ))}
        </Animated.View>
      </AccordionContext.Provider>
    );
  }
);
AccordionRoot.displayName = 'Accordion';

export interface AccordionItemProps extends ViewProps {
  className?: string;
  /** Identifies this item in the accordion's value. */
  value: string;
  isDisabled?: boolean;
  children?: ReactNode;
}

const AccordionItem = forwardRef<View, AccordionItemProps>(
  ({ className, value, isDisabled = false, children, ...props }, ref) => {
    const { expanded, variant } = useAccordion('Accordion.Item');
    const isExpanded = expanded.includes(value);
    const { item } = accordionVariants({ variant });

    const context = useMemo(
      () => ({ value, isExpanded, isDisabled }),
      [value, isExpanded, isDisabled]
    );

    return (
      <AccordionItemContext.Provider value={context}>
        <Animated.View
          ref={ref}
          layout={LinearTransition.duration(200)}
          className={item({ className })}
          {...props}
        >
          {children}
        </Animated.View>
      </AccordionItemContext.Provider>
    );
  }
);
AccordionItem.displayName = 'Accordion.Item';

export interface AccordionTriggerProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** The pressable header row. Bare strings are wrapped in the title style. */
const AccordionTrigger = forwardRef<View, AccordionTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { toggle, variant } = useAccordion('Accordion.Trigger');
    const { value, isExpanded, isDisabled } = useAccordionItem('Accordion.Trigger');
    const { trigger, title } = accordionVariants({ variant });

    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded, disabled: isDisabled }}
        disabled={isDisabled}
        onPress={() => toggle(value)}
        className={trigger({ className })}
        {...props}
      >
        {typeof children === 'string' ? (
          <Text className={title()}>{children}</Text>
        ) : (
          children
        )}
      </Pressable>
    );
  }
);
AccordionTrigger.displayName = 'Accordion.Trigger';

export interface AccordionIndicatorProps extends ViewProps {
  className?: string;
  /** Replaces the default chevron. */
  children?: ReactNode;
}

/** Chevron that rotates 180° while the item is open. */
const AccordionIndicator = forwardRef<View, AccordionIndicatorProps>(
  ({ className, children, ...props }, ref) => {
    const { variant } = useAccordion('Accordion.Indicator');
    const { isExpanded } = useAccordionItem('Accordion.Indicator');
    const { indicator } = accordionVariants({ variant });

    const rotation = useDerivedValue(
      () => withTiming(isExpanded ? 180 : 0, { duration: 200 }),
      [isExpanded]
    );
    const style = useAnimatedStyle(() => ({
      transform: [{ rotate: `${rotation.value}deg` }],
    }));

    return (
      <Animated.View style={style}>
        <View ref={ref} className={indicator({ className })} {...props}>
          {children ?? <ChevronDownIcon size={18} />}
        </View>
      </Animated.View>
    );
  }
);
AccordionIndicator.displayName = 'Accordion.Indicator';

export interface AccordionContentProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * The collapsible body. Unmounts when closed, per the repo's convention for
 * conditionally shown content — the layout transition on the item animates
 * the height change.
 */
const AccordionContent = forwardRef<View, AccordionContentProps>(
  ({ className, children, ...props }, ref) => {
    const { variant } = useAccordion('Accordion.Content');
    const { isExpanded } = useAccordionItem('Accordion.Content');
    const { content, contentText } = accordionVariants({ variant });

    if (!isExpanded) return null;

    return (
      <View ref={ref} className={content({ className })} {...props}>
        {typeof children === 'string' ? (
          <Text className={contentText()}>{children}</Text>
        ) : (
          children
        )}
      </View>
    );
  }
);
AccordionContent.displayName = 'Accordion.Content';

const AccordionTitle = forwardRef<RNText, TextProps>(({ className, ...props }, ref) => {
  const { variant } = useAccordion('Accordion.Title');
  const { title } = accordionVariants({ variant });
  return <Text ref={ref} className={title({ className })} {...props} />;
});
AccordionTitle.displayName = 'Accordion.Title';

export const Accordion = Object.assign(AccordionRoot, {
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Title: AccordionTitle,
  Indicator: AccordionIndicator,
  Content: AccordionContent,
});
