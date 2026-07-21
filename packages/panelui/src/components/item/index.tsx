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
 *   <Item.Media variant="icon"><ReceiptIcon /></Item.Media>
 *   <Item.Content>
 *     <Item.Title>Invoice.pdf</Item.Title>
 *     <Item.Description>2.4 MB · Updated yesterday</Item.Description>
 *   </Item.Content>
 *   <Item.Actions><Button size="sm">Open</Button></Item.Actions>
 * </Item>
 * ```
 *
 * Two axes, and they are independent. `orientation` on the item decides
 * whether its own parts sit side by side or stack into a card; `orientation`
 * on `Item.Group` decides whether the items themselves run down the screen or
 * across it. A carousel wants both set to the non-default: a horizontal group
 * of vertical items.
 */
import { createContext, forwardRef, useContext, type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { AnimatedPressable, type AnimatedPressableProps } from '../../primitives/animated-pressable';
import { Text, type TextProps } from '../../primitives/text';
import { cn } from '../../utils/cn';

type ItemSize = 'default' | 'sm' | 'xs';
type ItemOrientation = 'horizontal' | 'vertical';

const itemVariants = tv({
  slots: {
    root: 'gap-3 rounded-xl',
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
    orientation: {
      /** Media, text and actions side by side — the list-row shape. */
      horizontal: { root: 'w-full flex-row items-center' },
      /** Stacked into a card — the shape a horizontal carousel wants. */
      vertical: { root: 'flex-col items-start' },
    },
    disabled: {
      true: { root: 'opacity-[0.64]' },
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
    orientation: 'horizontal',
  },
});

/** Sub-components inherit the row's density and axis rather than repeating them. */
const ItemContext = createContext<{ size: ItemSize; orientation: ItemOrientation }>({
  size: 'default',
  orientation: 'horizontal',
});

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
  /**
   * `horizontal` is the list row: media, text and actions side by side.
   * `vertical` stacks them into a card, which is what a horizontal carousel
   * wants — and it is also what `Item.Header` and `Item.Footer` need, since
   * both are full-width strips.
   */
  orientation?: ItemOrientation;
  children?: ReactNode;
}

/**
 * Renders as a pressable when given `onPress`, and as a plain view otherwise,
 * so a static row does not announce itself as a button.
 */
const ItemRoot = forwardRef<View, ItemProps>(
  (
    {
      className,
      variant,
      size = 'default',
      orientation = 'horizontal',
      disabled,
      children,
      onPress,
      ...props
    },
    ref
  ) => {
    const { root } = itemVariants({ variant, size, orientation, disabled: !!disabled });

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
      <ItemContext.Provider value={{ size, orientation }}>{body}</ItemContext.Provider>
    );
  }
);
ItemRoot.displayName = 'Item';

export interface ItemGroupProps extends ViewProps {
  className?: string;
  /**
   * `vertical` stacks the items — the settings-list shape. `horizontal` runs
   * them across instead, for a carousel; pair it with a scrollable and
   * `orientation="vertical"` on each item so every entry reads as a card.
   */
  orientation?: ItemOrientation;
  children?: ReactNode;
}

/** Stack of items. Pair with `Item.Separator` between them. */
const ItemGroup = forwardRef<View, ItemGroupProps>(
  ({ className, orientation = 'vertical', children, ...props }, ref) => (
    <View
      ref={ref}
      accessibilityRole="list"
      className={cn(
        orientation === 'horizontal'
          ? 'flex-row items-stretch gap-3'
          : 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </View>
  )
);
ItemGroup.displayName = 'Item.Group';

export interface ItemSeparatorProps extends ViewProps {
  className?: string;
  /** Match the group's axis: a horizontal group needs vertical hairlines. */
  orientation?: ItemOrientation;
}

/** Hairline between rows in a group. */
const ItemSeparator = forwardRef<View, ItemSeparatorProps>(
  ({ className, orientation = 'vertical', ...props }, ref) => (
    <View
      ref={ref}
      className={cn(
        orientation === 'horizontal' ? 'h-full w-px' : 'h-px w-full',
        'bg-border',
        className
      )}
      {...props}
    />
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

/**
 * The text column. In a horizontal item it takes the remaining width so the
 * actions stay pinned to the trailing edge; in a vertical one it just fills
 * the width, because there is nothing beside it to push against.
 */
const ItemContent = forwardRef<View, ItemContentProps>(
  ({ className, children, ...props }, ref) => {
    const { orientation } = useContext(ItemContext);

    return (
      <View
        ref={ref}
        className={cn(
          orientation === 'horizontal' ? 'flex-1' : 'w-full',
          'gap-0.5',
          className
        )}
        {...props}
      >
        {children}
      </View>
    );
  }
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
 * Full-width strip above the item's main content — an eyebrow label, a badge
 * row. Needs `orientation="vertical"` on the item, since a strip only makes
 * sense once the item stacks.
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
