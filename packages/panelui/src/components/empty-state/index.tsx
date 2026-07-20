/**
 * EmptyState — the placeholder shown when a list or view has no content.
 *
 * Adapted from: cosscom/coss packages/ui/src/components/empty.tsx
 * (centered Header / Media / Title / Description / Content anatomy, and the
 * `icon` media variant that stacks two rotated ghost cards behind the icon).
 * Coss does that with CSS pseudo-elements; on native it is two absolutely
 * positioned siblings with static rotate transforms.
 */
import { forwardRef, type ReactNode } from 'react';
import { View, type Text as RNText, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { Text, type TextProps } from '../../primitives/text';

const emptyStateVariants = tv({
  slots: {
    root: 'w-full flex-1 items-center justify-center gap-6 px-6 py-12',
    header: 'w-full max-w-sm items-center gap-1',
    title: 'text-center text-xl font-semibold text-foreground',
    description: 'text-center text-sm text-muted-foreground',
    content: 'w-full max-w-sm items-center gap-3',
  },
});

const mediaVariants = tv({
  slots: {
    wrapper: 'items-center justify-center',
    card: 'h-9 w-9 shrink-0 items-center justify-center',
    ghost: 'absolute h-9 w-9 rounded-md border border-border bg-card',
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
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface EmptyStateProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

const EmptyStateRoot = forwardRef<View, EmptyStateProps>(
  ({ className, ...props }, ref) => {
    const { root } = emptyStateVariants();
    return <View ref={ref} className={root({ className })} {...props} />;
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
    const { wrapper, card, ghost } = mediaVariants({ variant });

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
  const { title } = emptyStateVariants();
  return <Text ref={ref} className={title({ className })} {...props} />;
});
EmptyStateTitle.displayName = 'EmptyState.Title';

const EmptyStateDescription = forwardRef<RNText, TextProps>(
  ({ className, ...props }, ref) => {
    const { description } = emptyStateVariants();
    return <Text ref={ref} className={description({ className })} {...props} />;
  }
);
EmptyStateDescription.displayName = 'EmptyState.Description';

/** Slot below the header, for actions such as a primary button. */
const EmptyStateContent = forwardRef<View, EmptyStateProps>(
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
