/**
 * Accordion — collapsible sections.
 *
 * Split into Item / Trigger / Indicator / Content so a section header can hold
 * anything — a badge, a price, a second line — instead of only a string. The
 * chevron rotates rather than swapping glyphs, and the panel expands through a
 * layout transition, both on the UI thread.
 *
 * `selectionMode` decides whether opening one section closes the others, which
 * also changes the shape of `value`: a string when single, an array when
 * multiple.
 *
 * With the operating system set to reduce motion the section arrives at its new
 * height and the chevron at its new angle without travelling to either. The
 * disclosure is the point and it still happens; the movement is what goes.
 *
 * A closed section costs nothing, because its body is unmounted. That is the
 * right default and the wrong one for a body with state in it: a half-filled
 * form, a list scrolled to the middle, a video part-way through. Collapsing
 * such a section throws that away and reopening it starts over. `keepMounted`
 * is the way out — the body stays mounted and is hidden from layout instead,
 * so it takes up no room, the same layout transition carries the change, and
 * everything inside is exactly where it was left.
 */
import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Pressable,
  View,
  type PressableProps,
  type Text as RNText,
  type ViewProps,
} from 'react-native';
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { tv } from 'tailwind-variants';
import { ChevronDownIcon } from '../../icons';
import { Text, type TextProps, textChildren } from '../../primitives/text';
import type { TextRef, ViewRef } from '../../primitives/refs';

export type AccordionVariant =
  | 'default'
  | 'surface'
  | 'separated'
  | 'bordered'
  | 'ghost';

export type AccordionSelectionMode = 'single' | 'multiple';

/**
 * How long the height change and the chevron take. One constant for both, so
 * the panel and the arrow that describes it finish together.
 */
const TRANSITION_DURATION = 200;

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
  keepMounted: boolean;
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
  /**
   * Keep every body mounted while its section is closed, so state inside it —
   * a part-filled form, a scroll position, a running animation — survives being
   * collapsed. Costs the render of every section up front; set it per section
   * on `Accordion.Content` instead when only one of them needs it.
   */
  keepMounted?: boolean;
  children?: ReactNode;
}

const toArray = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const AccordionRoot = forwardRef<ViewRef, AccordionProps>(
  (
    {
      className,
      variant = 'default',
      selectionMode = 'single',
      value,
      defaultValue,
      onValueChange,
      hideSeparator = false,
      keepMounted = false,
      children,
      ...props
    },
    ref
  ) => {
    const reducedMotion = useReducedMotion();
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
      () => ({ expanded, toggle, variant, keepMounted }),
      [expanded, toggle, variant, keepMounted]
    );

    const { root, separator } = accordionVariants({ variant });
    const items = Children.toArray(children).filter(isValidElement);

    return (
      <AccordionContext.Provider value={context}>
        <Animated.View
          ref={ref}
          // Dropping the layout animation is what honours Reduce Motion here:
          // the section still opens, it just arrives at its new height rather
          // than travelling to it.
          layout={reducedMotion ? undefined : LinearTransition.duration(TRANSITION_DURATION)}
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

const AccordionItem = forwardRef<ViewRef, AccordionItemProps>(
  ({ className, value, isDisabled = false, children, ...props }, ref) => {
    const { expanded, variant } = useAccordion('Accordion.Item');
    const reducedMotion = useReducedMotion();
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
          layout={reducedMotion ? undefined : LinearTransition.duration(TRANSITION_DURATION)}
          className={item({ className })}
          {...props}
        >
          {textChildren(children)}
        </Animated.View>
      </AccordionItemContext.Provider>
    );
  }
);
AccordionItem.displayName = 'Accordion.Item';

export interface AccordionTriggerProps extends Omit<PressableProps, 'children'> {
  className?: string;
  children?: ReactNode;
}

/** The pressable header row. Bare strings are wrapped in the title style. */
const AccordionTrigger = forwardRef<ViewRef, AccordionTriggerProps>(
  ({ className, children, onPress, disabled = false, ...props }, ref) => {
    const { toggle, variant } = useAccordion('Accordion.Trigger');
    const { value, isExpanded, isDisabled } = useAccordionItem('Accordion.Trigger');
    const { trigger, title } = accordionVariants({ variant });
    const triggerDisabled = Boolean(isDisabled || disabled);

    return (
      <Pressable
        ref={ref}
        {...props}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded, disabled: triggerDisabled }}
        disabled={triggerDisabled}
        className={trigger({ className })}
        onPress={(event) => {
          onPress?.(event);
          toggle(value);
        }}
      >
        {textChildren(children, (text) => (
          <Text className={title()}>{text}</Text>
        ))}
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
const AccordionIndicator = forwardRef<ViewRef, AccordionIndicatorProps>(
  ({ className, children, ...props }, ref) => {
    const { variant } = useAccordion('Accordion.Indicator');
    const { isExpanded } = useAccordionItem('Accordion.Indicator');
    const { indicator } = accordionVariants({ variant });
    const reducedMotion = useReducedMotion();
    const progress = useSharedValue(isExpanded ? 1 : 0);
    const first = useRef(true);

    useEffect(() => {
      // There is nothing to travel on mount: the item is already open or shut,
      // and the chevron already points that way. Animating anyway would
      // schedule a 0-to-0 timing per indicator, and a screen that mounts a list
      // of them pays for every one before it can draw. The angle is assigned
      // rather than assumed — a plain number registers no animation, and an
      // indicator left at the wrong angle stays wrong for as long as it lives.
      if (first.current) {
        first.current = false;
        progress.value = isExpanded ? 1 : 0;
        return;
      }
      progress.value = reducedMotion
        ? isExpanded
          ? 1
          : 0
        : withTiming(isExpanded ? 1 : 0, { duration: TRANSITION_DURATION });
    }, [isExpanded, reducedMotion, progress]);

    const style = useAnimatedStyle(() => ({
      transform: [{ rotate: `${progress.value * 180}deg` }],
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
  /**
   * Stay mounted while closed instead of unmounting, so state inside the body
   * survives the section being collapsed. Overrides the accordion's own
   * setting, either way round.
   */
  keepMounted?: boolean;
  children?: ReactNode;
}

/**
 * The collapsible body. Unmounts when closed, per the repo's convention for
 * conditionally shown content — the layout transition on the item animates
 * the height change.
 *
 * `keepMounted` swaps the unmount for `display: 'none'`, which is the one way
 * to hide a view that also takes it out of Yoga's layout. That matters twice
 * over: the item's height changes by exactly as much as it would have on an
 * unmount, so the same layout transition plays and the two modes are
 * indistinguishable to look at — and everything inside stays mounted, so a
 * text field keeps what was typed into it. A hidden subtree is still in the
 * accessibility tree, though, so it is explicitly taken out of that too;
 * otherwise a screen reader would read out a section the eye cannot see.
 */
const AccordionContent = forwardRef<ViewRef, AccordionContentProps>(
  ({ className, keepMounted, children, ...props }, ref) => {
    const { variant, keepMounted: keepMountedDefault } = useAccordion('Accordion.Content');
    const { isExpanded } = useAccordionItem('Accordion.Content');
    const { content, contentText } = accordionVariants({ variant });

    const stayMounted = keepMounted ?? keepMountedDefault;
    if (!isExpanded && !stayMounted) return null;

    const isHidden = !isExpanded;

    return (
      <View
        ref={ref}
        style={isHidden ? { display: 'none' } : undefined}
        accessibilityElementsHidden={isHidden}
        importantForAccessibility={isHidden ? 'no-hide-descendants' : 'auto'}
        className={content({ className })}
        {...props}
      >
        {textChildren(children, (text) => (
          <Text className={contentText()}>{text}</Text>
        ))}
      </View>
    );
  }
);
AccordionContent.displayName = 'Accordion.Content';

const AccordionTitle = forwardRef<TextRef, TextProps>(({ className, ...props }, ref) => {
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
