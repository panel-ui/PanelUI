import { forwardRef, useState } from 'react';
import {
  Image,
  View,
  type ImageProps,
  type ImageSourcePropType,
  type ViewProps,
} from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { Text } from '../../primitives/text';

const avatarVariants = tv({
  slots: {
    root: 'items-center justify-center overflow-hidden rounded-full border border-border bg-black/5 dark:bg-white/10',
    image: 'absolute inset-0 h-full w-full',
    fallback: 'font-medium text-foreground/70',
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

export const Avatar = forwardRef<View, AvatarProps>(
  ({ className, size, source, fallback, imageProps, ...props }, ref) => {
    const [errored, setErrored] = useState(false);
    const { root, image, fallback: fallbackSlot } = avatarVariants({ size });
    const showImage = !!source && !errored;

    return (
      <View
        ref={ref}
        accessibilityRole="image"
        className={root({ className })}
        {...props}
      >
        {showImage ? (
          <Image
            source={source}
            onError={() => setErrored(true)}
            className={image()}
            {...imageProps}
          />
        ) : (
          <Text className={fallbackSlot()}>{fallback ?? '?'}</Text>
        )}
      </View>
    );
  }
);

Avatar.displayName = 'Avatar';
