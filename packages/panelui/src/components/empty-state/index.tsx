/**
 * EmptyState — the placeholder shown when a list or view has no content.
 *
 * Centred Header / Media / Title / Description / Content, with an `icon` media
 * variant that stacks two rotated ghost cards behind the icon. On the web that
 * is a pair of CSS pseudo-elements; React Native has none, so it is two
 * absolutely positioned siblings with static rotate transforms.
 */
import { createContext, forwardRef, useContext, type ReactNode } from 'react';
import { View, type Text as RNText, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { Text, type TextProps } from '../../primitives/text';

type EmptyStateSize = 'sm' | 'default' | 'lg';

/** Sub-components read the size so the title, description and media scale with the root. */
const EmptyStateContext = createContext<{ size: EmptyStateSize }>({ size: 'default' });

const emptyStateVariants = tv({
  slots: {
    root: 'w-full items-center justify-center',
    header: 'w-full max-w-sm items-center gap-1',
    title: 'text-center font-semibold text-foreground',
    description: 'text-center text-muted-foreground',
    content: 'w-full max-w-sm items-center gap-3',
  },
  variants: {
    variant: {
      // Fills whatever space it is given — a whole screen, or a flex parent.
      default: { root: 'flex-1' },
      // A self-contained block that sits inside content rather than filling a
      // screen: bordered, on the card fill, sized to its contents.
      card: { root: 'rounded-2xl border border-border bg-card' },
    },
    size: {
      sm: { root: 'gap-4 px-4 py-8', title: 'text-base', description: 'text-sm' },
      default: { root: 'gap-6 px-6 py-12', title: 'text-xl', description: 'text-sm' },
      lg: { root: 'gap-6 px-6 py-16', title: 'text-2xl', description: 'text-base' },
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

const mediaVariants = tv({
  slots: {
    wrapper: 'items-center justify-center',
    card: 'shrink-0 items-center justify-center',
    ghost: 'absolute rounded-md border border-border bg-card',
  },
  variants: {
    variant: {
      default: {
        card: 'bg-transparent',
        ghost: 'hidden',
      },
      icon: {
        card: 'rounded-md border border-border bg-card',
      },
    },
    size: {
      sm: { card: 'h-8 w-8', ghost: 'h-8 w-8' },
      default: { card: 'h-9 w-9', ghost: 'h-9 w-9' },
      lg: { card: 'h-11 w-11', ghost: 'h-11 w-11' },
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface EmptyStateProps
  extends ViewProps,
    VariantProps<typeof emptyStateVariants> {
  className?: string;
  /**
   * `default` fills its parent — a whole screen, or a flex slot. `card` is a
   * self-contained bordered block for an empty state that sits inside content
   * rather than owning the screen.
   */
  variant?: 'default' | 'card';
  /** Scales the padding, media, title and description together. */
  size?: EmptyStateSize;
  children?: ReactNode;
}

const EmptyStateRoot = forwardRef<View, EmptyStateProps>(
  ({ className, variant, size = 'default', ...props }, ref) => {
    const { root } = emptyStateVariants({ variant, size });
    return (
      <EmptyStateContext.Provider value={{ size }}>
        <View ref={ref} className={root({ className })} {...props} />
      </EmptyStateContext.Provider>
    );
  }
);
EmptyStateRoot.displayName = 'EmptyState';

/** Groups Media, Title and Description into one centered column. */
const EmptyStateHeader = forwardRef<View, EmptyStateProps>(
  ({ className, ...props }, ref) => {
    const { header } = emptyStateVariants();
    return <View ref={ref} className={header({ className })} {...props} />;
  }
);
EmptyStateHeader.displayName = 'EmptyState.Header';

export interface EmptyStateMediaProps
  extends ViewProps,
    VariantProps<typeof mediaVariants> {
  className?: string;
  children?: ReactNode;
}

/**
 * Visual anchor above the title. `variant="icon"` frames the child in a small
 * card with two rotated ghost cards fanned out behind it.
 */
const EmptyStateMedia = forwardRef<View, EmptyStateMediaProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const { size } = useContext(EmptyStateContext);
    const { wrapper, card, ghost } = mediaVariants({ variant, size });

    return (
      <View ref={ref} className={wrapper({ className: `mb-4 ${className ?? ''}` })} {...props}>
        {variant === 'icon' ? (
          <>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className={`${ghost()} -translate-x-2 -rotate-[10deg] scale-90`}
            />
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className={`${ghost()} translate-x-2 rotate-[10deg] scale-90`}
            />
          </>
        ) : null}
        <View className={card()}>{children}</View>
      </View>
    );
  }
);
EmptyStateMedia.displayName = 'EmptyState.Media';

const EmptyStateTitle = forwardRef<RNText, TextProps>(({ className, ...props }, ref) => {
  const { size } = useContext(EmptyStateContext);
  const { title } = emptyStateVariants({ size });
  return <Text ref={ref} className={title({ className })} {...props} />;
});
EmptyStateTitle.displayName = 'EmptyState.Title';

const EmptyStateDescription = forwardRef<RNText, TextProps>(
  ({ className, ...props }, ref) => {
    const { size } = useContext(EmptyStateContext);
    const { description } = emptyStateVariants({ size });
    return <Text ref={ref} className={description({ className })} {...props} />;
  }
);
EmptyStateDescription.displayName = 'EmptyState.Description';

/** Slot below the header, for actions such as a primary button. */
const EmptyStateContent = forwardRef<View, ViewProps & { className?: string }>(
  ({ className, ...props }, ref) => {
    const { content } = emptyStateVariants();
    return <View ref={ref} className={content({ className })} {...props} />;
  }
);
EmptyStateContent.displayName = 'EmptyState.Content';

export const EmptyState = Object.assign(EmptyStateRoot, {
  Header: EmptyStateHeader,
  Media: EmptyStateMedia,
  Title: EmptyStateTitle,
  Description: EmptyStateDescription,
  Content: EmptyStateContent,
});
