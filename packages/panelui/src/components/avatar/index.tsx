import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  Image,
  View,
  type ImageProps,
  type ImageSourcePropType,
  type ViewProps,
} from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { Text, textChildren } from '../../primitives/text';
import { cn } from '../../utils/cn';
import {
  avatarGroupCount,
  avatarGroupOverlap,
  type AvatarSizeName,
} from './avatar-group';
import { avatarSourceIdentity } from './avatar-source';

const avatarVariants = tv({
  slots: {
    /*
     * An opaque fill, not `bg-muted`. Muted is a translucent tint in every
     * theme, which is right for a surface and wrong for an object: in a group
     * each face slides over the next, and a translucent face lets the one
     * underneath show through it.
     */
    root: 'items-center justify-center overflow-hidden rounded-full border border-border bg-surface-secondary',
    /*
     * Rounded itself, not only clipped by the circle around it.
     *
     * The root carries a hairline border, and an absolutely positioned child
     * is laid out inside it — so the parent clips to the *outer* radius while
     * the image keeps square corners a border-width further in. What shows is
     * a sliver of the photo's corner at each of the four diagonals, which
     * reads as the picture being bent out of the circle.
     */
    image: 'absolute inset-0 h-full w-full rounded-full',
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
    const [failedSource, setFailedSource] = useState<string>();
    const { root, image, fallback: fallbackSlot } = avatarVariants({ size });
    const sourceIdentity = avatarSourceIdentity(source);
    const showImage = !!source && failedSource !== sourceIdentity;

    const face = showImage ? (
      <Image
        className={image()}
        {...imageProps}
        source={source}
        onError={(event) => {
          setFailedSource(sourceIdentity);
          imageProps?.onError?.(event);
        }}
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
        {textChildren(children)}
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
        'absolute -end-1 -top-1 rounded-full border-2 border-background',
        className
      )}
      {...props}
    >
      {textChildren(children)}
    </View>
  )
);
AvatarBadge.displayName = 'Avatar.Badge';

export interface AvatarGroupProps extends ViewProps {
  className?: string;
  /** Size for every avatar in the stack. A child's own `size` still wins. */
  size?: AvatarSizeName;
  /**
   * How many faces to show. The rest are counted into a trailing `+N`.
   *
   * It caps the faces, not the row: `max={3}` with five people shows three
   * avatars and a `+2`.
   */
  max?: number;
  /**
   * How many people there are, when the children are only the first few of
   * them. The count is measured against this instead of against the number of
   * children, so a stack of three out of forty reads `+37`.
   */
  total?: number;
  /** Points each avatar slides under the one before it. Defaults to a third of the size. */
  overlap?: number;
}

/**
 * A row of avatars, each overlapping the one after it, with the people who did
 * not fit counted at the end.
 *
 * The faces stay in logical child order for assistive traversal. Explicit
 * z-indices, rather than a reversed render/layout order, put the first face on
 * top while the overflow count remains the final list item.
 *
 * Each face gets a ring in the page background so it separates from the one
 * underneath whatever surface the stack sits on.
 *
 * ```tsx
 * <Avatar.Group max={3} total={members.length}>
 *   {members.map((member) => (
 *     <Avatar key={member.id} source={{ uri: member.avatarUrl }} fallback={member.initials} />
 *   ))}
 * </Avatar.Group>
 * ```
 */
const AvatarGroup = forwardRef<View, AvatarGroupProps>(
  ({ className, size = 'md', max, total, overlap, children, ...props }, ref) => {
    const faces = Children.toArray(children).filter(isValidElement) as ReactElement<AvatarProps>[];
    const { visible, overflow } = avatarGroupCount(faces.length, max, total);
    const slide = avatarGroupOverlap(size, overlap);

    // Logical reading order: visible people first, then the overflow summary.
    // Painting order is independent and applied to each wrapper below.
    const stack: { key: string; node: ReactNode }[] = [];

    for (let index = 0; index < visible; index += 1) {
      const face = faces[index]!;
      stack.push({
        key: String(face.key ?? index),
        node: cloneElement(face, {
          size: face.props.size ?? size,
          className: cn('border-2 border-background', face.props.className),
        }),
      });
    }

    if (overflow > 0) {
      stack.push({
        key: 'overflow',
        node: (
          <AvatarRoot
            size={size}
            fallback={`+${overflow}`}
            accessibilityLabel={`${overflow} more`}
            className="border-2 border-background"
          />
        ),
      });
    }

    return (
      <View
        ref={ref}
        className={cn('flex-row self-start', className)}
        {...props}
        accessibilityRole="list"
      >
        {stack.map((entry, index) => (
          <View
            key={entry.key}
            role="listitem"
            style={{
              zIndex: stack.length - index,
              marginStart: index === 0 ? 0 : -slide,
            }}
          >
            {entry.node}
          </View>
        ))}
      </View>
    );
  }
);
AvatarGroup.displayName = 'Avatar.Group';

export const Avatar = Object.assign(AvatarRoot, {
  Badge: AvatarBadge,
  Group: AvatarGroup,
});

export {
  AVATAR_GROUP_OVERLAP_RATIO,
  AVATAR_SIZE_POINTS,
  avatarGroupCount,
  avatarGroupOverlap,
  type AvatarGroupCount,
  type AvatarSizeName,
} from './avatar-group';
