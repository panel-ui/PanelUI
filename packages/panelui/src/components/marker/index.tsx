/**
 * Marker — an inline note in a conversation.
 *
 * Transcripts are not only messages. Between the turns sit things the
 * conversation did rather than said: a tool that ran, a file that was read, a
 * model that changed, the point where yesterday ended. Those are not messages
 * and should not look like one — a bubble implies a speaker, and none of these
 * have one. A marker is the quieter row that carries them: small, muted, and
 * aligned to the transcript rather than to a side of it.
 *
 * ```tsx
 * <Marker>
 *   <Marker.Icon><CheckIcon /></Marker.Icon>
 *   <Marker.Content>Explored 4 files</Marker.Content>
 * </Marker>
 * ```
 *
 * `shimmer` on the content is for the row that is still happening — the sweep
 * runs through the glyphs while a step is in flight, and is dropped the moment
 * it finishes.
 */
import { createContext, forwardRef, useContext, type ReactNode } from 'react';
import { View, type Text as RNText, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { IconColorProvider } from '../../icons';
import { AnimatedPressable, type AnimatedPressableProps } from '../../primitives/animated-pressable';
import { Text, type TextProps } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { Separator } from '../separator';
import { Shimmer } from '../shimmer';

type MarkerVariant = 'default' | 'border' | 'separator';

const markerVariants = tv({
  slots: {
    root: 'w-full flex-row items-center gap-2 py-1.5',
    content: 'text-sm text-muted-foreground',
  },
  variants: {
    variant: {
      /** The plain row: an icon and a line of muted text. */
      default: {},
      /** Same row, closed by a hairline — for a step that ends a section. */
      border: { root: 'border-b border-border pb-2.5' },
      /**
       * A centred label with a rule running out to each edge. The rules are
       * `Separator`s rather than borders so they follow the same token and
       * thickness as every other rule in the app.
       */
      separator: { root: 'gap-3 py-3', content: 'text-xs uppercase tracking-wider' },
    },
    disabled: {
      true: { root: 'opacity-[0.64]' },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

/** The parts read the variant rather than being told it twice. */
const MarkerContext = createContext<MarkerVariant>('default');

export interface MarkerProps
  extends Omit<AnimatedPressableProps, 'children' | 'disabled'>,
    Omit<VariantProps<typeof markerVariants>, 'disabled'> {
  className?: string;
  disabled?: boolean;
  /**
   * `default` is the inline status row. `border` closes it with a hairline.
   * `separator` centres the content between two rules — the "Yesterday"
   * divider shape.
   */
  variant?: MarkerVariant;
  children?: ReactNode;
}

/**
 * Renders as a pressable when given `onPress` and as a plain view otherwise,
 * so a marker that does nothing does not announce itself as a button.
 */
const MarkerRoot = forwardRef<View, MarkerProps>(
  ({ className, variant = 'default', disabled, children, onPress, ...props }, ref) => {
    const { root } = markerVariants({ variant, disabled: !!disabled });

    // The rules belong to the root, not the content: the content has to stay a
    // single centred child for `flex-1` on either side to split the remainder.
    const inner =
      variant === 'separator' ? (
        <>
          <Separator className="flex-1" />
          {children}
          <Separator className="flex-1" />
        </>
      ) : (
        children
      );

    const body = !onPress ? (
      <View
        ref={ref}
        accessibilityState={{ disabled: !!disabled }}
        className={root({ className })}
        {...(props as ViewProps)}
      >
        {inner}
      </View>
    ) : (
      <AnimatedPressable
        ref={ref}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={onPress}
        className={root({ className })}
        {...props}
      >
        {inner}
      </AnimatedPressable>
    );

    return <MarkerContext.Provider value={variant}>{body}</MarkerContext.Provider>;
  }
);
MarkerRoot.displayName = 'Marker';

export interface MarkerIconProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Decorative leading slot. Hidden from screen readers — the icon repeats what
 * the content already says, and announcing it twice is noise.
 */
const MarkerIcon = forwardRef<View, MarkerIconProps>(
  ({ className, children, ...props }, ref) => {
    // Icons here take the muted foreground, so a marker reads as chrome next to
    // a message rather than competing with it.
    const muted = useCSSVariable('--color-muted-foreground');

    return (
      <View
        ref={ref}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className={cn('h-4 w-4 shrink-0 items-center justify-center', className)}
        {...props}
      >
        <IconColorProvider color={typeof muted === 'string' ? muted : undefined}>
          {children}
        </IconColorProvider>
      </View>
    );
  }
);
MarkerIcon.displayName = 'Marker.Icon';

export interface MarkerContentProps extends TextProps {
  className?: string;
  /**
   * Sweep a highlight through the text, for a step that is still running.
   * Drop it when the step finishes — a marker that shimmers forever reads as
   * a stuck one.
   */
  shimmer?: boolean;
  children?: ReactNode;
}

const MarkerContent = forwardRef<RNText, MarkerContentProps>(
  ({ className, shimmer, children, ...props }, ref) => {
    const variant = useContext(MarkerContext);
    const { content } = markerVariants({ variant });

    if (shimmer) {
      // Shimmer owns the text so it can mask the sweep to the glyphs; the
      // class goes to the text inside it rather than to the wrapping view.
      return <Shimmer textClassName={content({ className })}>{children}</Shimmer>;
    }

    return (
      <Text ref={ref} className={content({ className })} {...props}>
        {children}
      </Text>
    );
  }
);
MarkerContent.displayName = 'Marker.Content';

export const Marker = Object.assign(MarkerRoot, {
  Icon: MarkerIcon,
  Content: MarkerContent,
});
