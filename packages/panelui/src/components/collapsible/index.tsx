/**
 * Collapsible — one section of content that a header shows and hides.
 *
 * ```tsx
 * <Collapsible variant="surface">
 *   <Collapsible.Trigger>
 *     Delivery options
 *     <Collapsible.Indicator />
 *   </Collapsible.Trigger>
 *   <Collapsible.Content>
 *     <Text>Anything, of any height.</Text>
 *   </Collapsible.Content>
 * </Collapsible>
 * ```
 *
 * ## Why this and not a one-item Accordion
 *
 * The two look the same and differ in what happens to the body when it closes.
 * An accordion unmounts it, which is right when a closed section should cost
 * nothing and there is nothing inside worth keeping.
 *
 * This one keeps the body mounted and animates its height, so what is inside
 * survives being closed — a part-filled form still has what was typed into it,
 * a list is still scrolled to where it was, a video is still part-way through.
 * That is the case this component exists for; reach for `Accordion` when
 * sections are mutually exclusive or the body is expensive and rarely opened.
 *
 * ## The body is mounted whether or not it is open
 *
 * A height cannot be animated from `auto`, so the content has to be measured
 * before it can be travelled to, and measuring it means rendering it. There is
 * no lazy version of that: a body that has never been opened has still been
 * rendered once. For a body heavy enough that this matters, an `Accordion` with
 * a single item unmounts it instead.
 *
 * ## Reduced motion
 *
 * With the operating system set to reduce motion the panel snaps between its
 * two states and the chevron turns without travelling. The disclosure still
 * happens — it is the movement that is dropped, not the change.
 */
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { tv } from 'tailwind-variants';
import { ChevronDownIcon } from '../../icons';
import { Collapse } from '../../primitives/collapse';
import { Text, type TextProps, textChildren } from '../../primitives/text';
import type { TextRef, ViewRef } from '../../primitives/refs';

export type CollapsibleVariant = 'default' | 'surface' | 'ghost';

/** Matches the chevron in `Accordion`, so the two read as the same control. */
const INDICATOR_DURATION = 200;

const collapsibleVariants = tv({
  slots: {
    root: 'w-full flex-col',
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
        root: 'overflow-hidden rounded-2xl border border-border bg-surface',
        trigger: 'px-4',
        content: 'px-4',
      },
      ghost: { trigger: 'px-0', content: 'px-0' },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

interface CollapsibleContextValue {
  open: boolean;
  toggle: () => void;
  isDisabled: boolean;
  variant: CollapsibleVariant;
}

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null);

function useCollapsible(component: string): CollapsibleContextValue {
  const context = useContext(CollapsibleContext);
  if (!context) throw new Error(`${component} must be used within a <Collapsible>`);
  return context;
}

export interface CollapsibleProps extends ViewProps {
  className?: string;
  variant?: CollapsibleVariant;
  /** Whether the body is showing, controlled. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Stops the trigger opening or closing it, and marks it disabled to a screen reader. */
  isDisabled?: boolean;
  children?: ReactNode;
}

const CollapsibleRoot = forwardRef<ViewRef, CollapsibleProps>(
  (
    {
      className,
      variant = 'default',
      open,
      defaultOpen = false,
      onOpenChange,
      isDisabled = false,
      children,
      ...props
    },
    ref
  ) => {
    const [internal, setInternal] = useState(defaultOpen);
    const isControlled = open !== undefined;
    const isOpen = isControlled ? open : internal;

    const toggle = useCallback(() => {
      const next = !isOpen;
      if (!isControlled) setInternal(next);
      onOpenChange?.(next);
    }, [isOpen, isControlled, onOpenChange]);

    const context = useMemo(
      () => ({ open: isOpen, toggle, isDisabled, variant }),
      [isOpen, toggle, isDisabled, variant]
    );

    const { root } = collapsibleVariants({ variant });

    return (
      <CollapsibleContext.Provider value={context}>
        <View ref={ref} className={root({ className })} {...props}>
          {children}
        </View>
      </CollapsibleContext.Provider>
    );
  }
);
CollapsibleRoot.displayName = 'Collapsible';

export interface CollapsibleTriggerProps extends Omit<PressableProps, 'children'> {
  className?: string;
  children?: ReactNode;
}

/** The pressable header row. Bare strings are wrapped in the title style. */
const CollapsibleTrigger = forwardRef<ViewRef, CollapsibleTriggerProps>(
  ({ className, children, onPress, ...props }, ref) => {
    const { open, toggle, isDisabled, variant } = useCollapsible('Collapsible.Trigger');
    const { trigger, title } = collapsibleVariants({ variant });

    return (
      <Pressable
        ref={ref}
        {...props}
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled: isDisabled }}
        disabled={isDisabled}
        className={trigger({ className })}
        onPress={(event) => {
          onPress?.(event);
          toggle();
        }}
      >
        {textChildren(children, (text) => (
          <Text className={title()}>{text}</Text>
        ))}
      </Pressable>
    );
  }
);
CollapsibleTrigger.displayName = 'Collapsible.Trigger';

const CollapsibleTitle = forwardRef<TextRef, TextProps>(({ className, ...props }, ref) => {
  const { variant } = useCollapsible('Collapsible.Title');
  const { title } = collapsibleVariants({ variant });
  return <Text ref={ref} className={title({ className })} {...props} />;
});
CollapsibleTitle.displayName = 'Collapsible.Title';

export interface CollapsibleIndicatorProps extends ViewProps {
  className?: string;
  /** Replaces the default chevron. */
  children?: ReactNode;
}

/** Chevron that rotates 180° while the body is open. */
const CollapsibleIndicator = forwardRef<ViewRef, CollapsibleIndicatorProps>(
  ({ className, children, ...props }, ref) => {
    const { open, variant } = useCollapsible('Collapsible.Indicator');
    const { indicator } = collapsibleVariants({ variant });
    const reducedMotion = useReducedMotion();
    const progress = useSharedValue(open ? 1 : 0);

    useEffect(() => {
      progress.value = reducedMotion
        ? open
          ? 1
          : 0
        : withTiming(open ? 1 : 0, { duration: INDICATOR_DURATION });
    }, [open, reducedMotion, progress]);

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
CollapsibleIndicator.displayName = 'Collapsible.Indicator';

export interface CollapsibleContentProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * The body, opened and closed by animating its own height.
 *
 * It stays mounted while closed, which is the point of the component — see the
 * note at the top of the file. A closed body is hidden from the accessibility
 * tree as well as from the eye, because a screen reader reading out a section
 * that is not on screen is worse than one that skips it.
 */
const CollapsibleContent = forwardRef<ViewRef, CollapsibleContentProps>(
  ({ className, children, ...props }, ref) => {
    const { open, variant } = useCollapsible('Collapsible.Content');
    const { content, contentText } = collapsibleVariants({ variant });

    return (
      <Collapse open={open} className={content({ className })}>
        <View
          ref={ref}
          accessibilityElementsHidden={!open}
          importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
          {...props}
        >
          {textChildren(children, (text) => (
            <Text className={contentText()}>{text}</Text>
          ))}
        </View>
      </Collapse>
    );
  }
);
CollapsibleContent.displayName = 'Collapsible.Content';

export const Collapsible = Object.assign(CollapsibleRoot, {
  Trigger: CollapsibleTrigger,
  Title: CollapsibleTitle,
  Indicator: CollapsibleIndicator,
  Content: CollapsibleContent,
});
