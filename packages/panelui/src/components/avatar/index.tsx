import { forwardRef, useState, type ReactNode } from 'react';
import {
  Image,
  View,
  type ImageProps,
  type ImageSourcePropType,
  type ViewProps,
} from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';

const avatarVariants = tv({
  slots: {
    root: 'items-center justify-center overflow-hidden rounded-full border border-border bg-muted',
    image: 'absolute inset-0 h-full w-full',
    fallback: 'font-medium text-muted-foreground',
  },
  variants: {
    size: {
      sm: { root: 'h-8 w-8', fallback: 'text-xs' },
      md: { root: 'h-10 w-10', fallback: 'text-sm' },
      lg: { root: 'h-14 w-14', fallback: 'text-lg' },
      xl: { root: 'h-20 w-20', fallback: 'text-2xl' },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface AvatarProps extends ViewProps, VariantProps<typeof avatarVariants> {
  className?: string;
  /** Image source; falls back to initials when missing or on load error. */
  source?: ImageSourcePropType;
  /** Fallback text, e.g. initials ("KA"). */
  fallback?: string;
  imageProps?: Omit<ImageProps, 'source'>;
}

const AvatarRoot = forwardRef<View, AvatarProps>(
  ({ className, size, source, fallback, imageProps, children, ...props }, ref) => {
    const [errored, setErrored] = useState(false);
    const { root, image, fallback: fallbackSlot } = avatarVariants({ size });
    const showImage = !!source && !errored;

    const face = showImage ? (
      <Image
        source={source}
        onError={() => setErrored(true)}
        className={image()}
        {...imageProps}
      />
    ) : (
      <Text className={fallbackSlot()}>{fallback ?? '?'}</Text>
    );

    // The plain avatar is a single clipped node.
    if (!children) {
      return (
        <View
          ref={ref}
          accessibilityRole="image"
          className={root({ className })}
          {...props}
        >
          {face}
        </View>
      );
    }

    // With an overlay it needs two: the face keeps overflow-hidden to round
    // the image, which would otherwise cut a corner badge in half, so the
    // overlay hangs off an unclipped wrapper around it.
    return (
      <View ref={ref} className={cn('self-start', className)} {...props}>
        <View accessibilityRole="image" className={root()}>
          {face}
        </View>
        {children}
      </View>
    );
  }
);
AvatarRoot.displayName = 'Avatar';

export interface AvatarBadgeProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Overlay pinned to the avatar's top-right — an unread count, a presence dot.
 *
 * The ring is `border-background` so the badge separates from the image
 * whatever surface the avatar sits on.
 */
const AvatarBadge = forwardRef<View, AvatarBadgeProps>(
  ({ className, children, ...props }, ref) => (
    <View
      ref={ref}
      className={cn(
        'absolute -right-1 -top-1 rounded-full border-2 border-background',
        className
      )}
      {...props}
    >
      {children}
    </View>
  )
);
AvatarBadge.displayName = 'Avatar.Badge';

export const Avatar = Object.assign(AvatarRoot, {
  Badge: AvatarBadge,
});
