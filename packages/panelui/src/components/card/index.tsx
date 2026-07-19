import { forwardRef } from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '../../utils/cn';
import { Text, type TextProps } from '../../primitives/text';

export interface CardProps extends ViewProps {
  className?: string;
}

const CardRoot = forwardRef<View, CardProps>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    className={cn('rounded-xl border border-border bg-card shadow-sm', className)}
    {...props}
  />
));
CardRoot.displayName = 'Card';

const CardHeader = forwardRef<View, CardProps>(({ className, ...props }, ref) => (
  <View ref={ref} className={cn('gap-1.5 p-4', className)} {...props} />
));
CardHeader.displayName = 'Card.Header';

const CardTitle = forwardRef<React.ElementRef<typeof Text>, TextProps>(
  ({ className, ...props }, ref) => (
    <Text
      ref={ref}
      size="lg"
      weight="semibold"
      className={cn('text-card-foreground', className)}
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
  <View ref={ref} className={cn('p-4 pt-0', className)} {...props} />
));
CardContent.displayName = 'Card.Content';

const CardFooter = forwardRef<View, CardProps>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    className={cn('flex-row items-center gap-2 p-4 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'Card.Footer';

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Content: CardContent,
  Footer: CardFooter,
});
