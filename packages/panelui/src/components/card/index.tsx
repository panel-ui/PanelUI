/**
 * Card — a content surface.
 *
 * ```tsx
 * <Card>
 *   <Card.Header>
 *     <Card.Title>Living room sofa</Card.Title>
 *     <Card.Description>Three seats, oat linen</Card.Description>
 *   </Card.Header>
 *   <Card.Footer>
 *     <Button fullWidth>Buy now</Button>
 *   </Card.Footer>
 * </Card>
 * ```
 *
 * All the padding lives on the slots and none of it on the root, which is why
 * a card whose media reaches its own corners needs nothing but
 * `overflow-hidden`.
 *
 * Every part is a plain view: the card draws a surface and gets out of the way,
 * and nothing here reaches for an animation driver or a native module. A card
 * that wants a decorative backing layer composes one as its first child.
 */
import { forwardRef } from 'react';
import { View, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../../utils/cn';
import { Text, type TextProps } from '../../primitives/text';

const footerVariants = tv({
  base: 'flex-row items-center gap-2',
  variants: {
    /**
     * Whether the footer draws a surface of its own.
     *
     * `plain` is part of the card: same background, padding continuing from the
     * content above it. `panel` is a band set into it — a rule across the top,
     * a step darker, and the card's own bottom corners — so the buttons read as
     * the card's actions rather than as the last thing in its body. Use it when
     * the footer is what somebody does with the card, not more of what it says.
     */
    variant: {
      plain: 'p-6 pt-0',
      panel: 'rounded-b-2xl border-t border-border bg-inset p-6',
    },
  },
  defaultVariants: {
    variant: 'plain',
  },
});

export interface CardProps extends ViewProps {
  className?: string;
}

export interface CardFooterProps
  extends CardProps,
    VariantProps<typeof footerVariants> {}

const CardRoot = forwardRef<View, CardProps>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    className={cn('rounded-2xl border border-border bg-card shadow-sm', className)}
    {...props}
  />
));
CardRoot.displayName = 'Card';

const CardHeader = forwardRef<View, CardProps>(({ className, ...props }, ref) => (
  <View ref={ref} className={cn('gap-1.5 p-6', className)} {...props} />
));
CardHeader.displayName = 'Card.Header';

const CardTitle = forwardRef<React.ElementRef<typeof Text>, TextProps>(
  ({ className, ...props }, ref) => (
    <Text
      ref={ref}
      size="lg"
      weight="semibold"
      className={cn('leading-tight text-card-foreground', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'Card.Title';

const CardDescription = forwardRef<React.ElementRef<typeof Text>, TextProps>(
  ({ className, ...props }, ref) => (
    <Text ref={ref} size="sm" muted className={className} {...props} />
  )
);
CardDescription.displayName = 'Card.Description';

const CardContent = forwardRef<View, CardProps>(({ className, ...props }, ref) => (
  <View ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'Card.Content';

const CardFooter = forwardRef<View, CardFooterProps>(
  ({ className, variant, ...props }, ref) => (
    <View ref={ref} className={cn(footerVariants({ variant }), className)} {...props} />
  )
);
CardFooter.displayName = 'Card.Footer';

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Content: CardContent,
  Footer: CardFooter,
});
