/**
 * Item — a row of content: media on one side, a title and description in the
 * middle, actions on the other side.
 *
 * It is the shape almost every list in an app already has — a settings row, a
 * file in a picker, a member in a team list, a tool call in a transcript — so
 * it exists as one composable primitive rather than being rebuilt per screen
 * with slightly different padding each time.
 *
 * ```tsx
 * <Item variant="outline">
 *   <Item.Media variant="icon"><FileIcon /></Item.Media>
 *   <Item.Content>
 *     <Item.Title>Invoice.pdf</Item.Title>
 *     <Item.Description>2.4 MB · Updated yesterday</Item.Description>
 *   </Item.Content>
 *   <Item.Actions><Button size="sm">Open</Button></Item.Actions>
 * </Item>
 * ```
 */
import { createContext, forwardRef, useContext, type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { AnimatedPressable, type AnimatedPressableProps } from '../../primitives/animated-pressable';
import { Text, type TextProps } from '../../primitives/text';
import { cn } from '../../utils/cn';

type ItemSize = 'default' | 'sm' | 'xs';

const itemVariants = tv({
  slots: {
    root: 'w-full flex-row items-center gap-3 rounded-xl',
    title: 'font-medium text-foreground',
    description: 'text-muted-foreground',
  },
  variants: {
    variant: {
      default: {},
      outline: { root: 'border border-border' },
      muted: { root: 'bg-muted' },
    },
    size: {
      default: { root: 'p-4', title: 'text-base', description: 'text-sm' },
      sm: { root: 'p-3', title: 'text-sm', description: 'text-xs' },
      xs: { root: 'gap-2 p-2', title: 'text-sm', description: 'text-xs' },
    },
    disabled: {
      true: { root: 'opacity-[0.64]' },
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

/** Sub-components inherit the row's density rather than repeating it. */
const ItemContext = createContext<{ size: ItemSize }>({ size: 'default' });

const mediaVariants = tv({
  base: 'shrink-0 items-center justify-center',
  variants: {
    variant: {
      /** No box — for an Avatar or anything that styles itself. */
      default: '',
      /** Rounded square tile sized for an icon. */
      icon: 'rounded-lg border border-border bg-muted',
      /** Clipped frame for an image or thumbnail. */
      image: 'overflow-hidden rounded-lg bg-muted',
    },
    size: {
      default: '',
      sm: '',
      xs: '',
    },
  },
  compoundVariants: [
    { variant: 'icon', size: 'default', class: 'h-10 w-10' },
    { variant: 'icon', size: 'sm', class: 'h-8 w-8' },
    { variant: 'icon', size: 'xs', class: 'h-6 w-6' },
    { variant: 'image', size: 'default', class: 'h-12 w-12' },
    { variant: 'image', size: 'sm', class: 'h-10 w-10' },
    { variant: 'image', size: 'xs', class: 'h-8 w-8' },
  ],
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface ItemProps
  extends Omit<AnimatedPressableProps, 'children' | 'disabled'>,
    Omit<VariantProps<typeof itemVariants>, 'disabled'> {
  className?: string;
  disabled?: boolean;
  /**
   * Row density. `Item.Media`, `Item.Title` and `Item.Description` follow it,
   * so it only needs setting here.
   */
  size?: ItemSize;
  children?: ReactNode;
}

/**
 * Renders as a pressable when given `onPress`, and as a plain view otherwise,
 * so a static row does not announce itself as a button.
 */
const ItemRoot = forwardRef<View, ItemProps>(
  ({ className, variant, size = 'default', disabled, children, onPress, ...props }, ref) => {
    const { root } = itemVariants({ variant, size, disabled: !!disabled });

    const body = !onPress ? (
      <View
        ref={ref}
        accessibilityState={{ disabled: !!disabled }}
        className={root({ className })}
        {...(props as ViewProps)}
      >
        {children}
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
        {children}
      </AnimatedPressable>
    );

    return (
      <ItemContext.Provider value={{ size }}>{body}</ItemContext.Provider>
    );
  }
);
ItemRoot.displayName = 'Item';

export interface ItemGroupProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** Stack of items. Pair with `Item.Separator` between rows. */
const ItemGroup = forwardRef<View, ItemGroupProps>(
  ({ className, children, ...props }, ref) => (
    <View
      ref={ref}
      accessibilityRole="list"
      className={cn('w-full', className)}
      {...props}
    >
      {children}
    </View>
  )
);
ItemGroup.displayName = 'Item.Group';

export interface ItemSeparatorProps extends ViewProps {
  className?: string;
}

/** Hairline between rows in a group. */
const ItemSeparator = forwardRef<View, ItemSeparatorProps>(
  ({ className, ...props }, ref) => (
    <View ref={ref} className={cn('h-px w-full bg-border', className)} {...props} />
  )
);
ItemSeparator.displayName = 'Item.Separator';

export interface ItemMediaProps
  extends ViewProps,
    VariantProps<typeof mediaVariants> {
  className?: string;
  children?: ReactNode;
}

/** Leading slot: an icon tile, a thumbnail, or an avatar passed through. */
const ItemMedia = forwardRef<View, ItemMediaProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    const item = useContext(ItemContext);

    return (
      <View
        ref={ref}
        className={mediaVariants({ variant, size: size ?? item.size, className })}
        {...props}
      >
        {children}
      </View>
    );
  }
);
ItemMedia.displayName = 'Item.Media';

export interface ItemContentProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** The text column. Takes the remaining width so actions stay pinned right. */
const ItemContent = forwardRef<View, ItemContentProps>(
  ({ className, children, ...props }, ref) => (
    <View ref={ref} className={cn('flex-1 gap-0.5', className)} {...props}>
      {children}
    </View>
  )
);
ItemContent.displayName = 'Item.Content';

export interface ItemTitleProps extends TextProps {
  className?: string;
}

const ItemTitle = forwardRef<React.ElementRef<typeof Text>, ItemTitleProps>(
  ({ className, ...props }, ref) => {
    const { size } = useContext(ItemContext);
    const { title } = itemVariants({ size });

    return <Text ref={ref} className={title({ className })} {...props} />;
  }
);
ItemTitle.displayName = 'Item.Title';

export interface ItemDescriptionProps extends TextProps {
  className?: string;
}

const ItemDescription = forwardRef<
  React.ElementRef<typeof Text>,
  ItemDescriptionProps
>(({ className, ...props }, ref) => {
  const { size } = useContext(ItemContext);
  const { description } = itemVariants({ size });

  return <Text ref={ref} className={description({ className })} {...props} />;
});
ItemDescription.displayName = 'Item.Description';

export interface ItemActionsProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** Trailing slot: buttons, a chevron, a switch. */
const ItemActions = forwardRef<View, ItemActionsProps>(
  ({ className, children, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('shrink-0 flex-row items-center gap-1.5', className)}
      {...props}
    >
      {children}
    </View>
  )
);
ItemActions.displayName = 'Item.Actions';

export interface ItemHeaderProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Full-width strip above the row's main content — an eyebrow label, a badge
 * row. Requires the item to be laid out as a column (`className="flex-col"`).
 */
const ItemHeader = forwardRef<View, ItemHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('w-full flex-row items-center justify-between gap-2', className)}
      {...props}
    >
      {children}
    </View>
  )
);
ItemHeader.displayName = 'Item.Header';

export interface ItemFooterProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** Full-width strip below the row's main content. */
const ItemFooter = forwardRef<View, ItemFooterProps>(
  ({ className, children, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('w-full flex-row items-center gap-2', className)}
      {...props}
    >
      {children}
    </View>
  )
);
ItemFooter.displayName = 'Item.Footer';

export const Item = Object.assign(ItemRoot, {
  Group: ItemGroup,
  Separator: ItemSeparator,
  Media: ItemMedia,
  Content: ItemContent,
  Title: ItemTitle,
  Description: ItemDescription,
  Actions: ItemActions,
  Header: ItemHeader,
  Footer: ItemFooter,
});
