import { forwardRef } from 'react';
import { View, type ViewProps } from 'react-native';
import { Text, type TextProps } from '../../primitives/text';
import { cn } from '../../utils/cn';

export interface FrameProps extends ViewProps {
  className?: string;
}

/**
 * Grouping container (Coss UI's CardFrame): a tinted, rounded surface that
 * holds a header, one or more inset panels, and a footer. Use it to group
 * related settings or list sections under a single title.
 */
const FrameRoot = forwardRef<View, FrameProps>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    className={cn('gap-2 rounded-2xl border border-border bg-surface py-2', className)}
    {...props}
  />
));
FrameRoot.displayName = 'Frame';

const FrameHeader = forwardRef<View, FrameProps>(({ className, ...props }, ref) => (
  <View ref={ref} className={cn('gap-1 px-5 py-2', className)} {...props} />
));
FrameHeader.displayName = 'Frame.Header';

const FrameTitle = forwardRef<React.ElementRef<typeof Text>, TextProps>(
  ({ className, ...props }, ref) => (
    <Text
      ref={ref}
      size="base"
      weight="semibold"
      className={cn('text-foreground', className)}
      {...props}
    />
  )
);
FrameTitle.displayName = 'Frame.Title';

const FrameDescription = forwardRef<React.ElementRef<typeof Text>, TextProps>(
  ({ className, ...props }, ref) => (
    <Text ref={ref} size="sm" muted className={className} {...props} />
  )
);
FrameDescription.displayName = 'Frame.Description';

/**
 * An inset card surface inside a Frame — the raised panel that holds the
 * frame's actual content, sitting slightly in from the frame's edges.
 */
const FramePanel = forwardRef<View, FrameProps>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    className={cn(
      'mx-1.5 overflow-hidden rounded-xl border border-border bg-card',
      className
    )}
    {...props}
  />
));
FramePanel.displayName = 'Frame.Panel';

/**
 * A row inside a Frame.Panel. Pass `divided` on every row after the first to
 * draw a hairline separator above it (React Native has no :first-child).
 */
export interface FrameRowProps extends FrameProps {
  divided?: boolean;
}

const FrameRow = forwardRef<View, FrameRowProps>(
  ({ className, divided, ...props }, ref) => (
    <View
      ref={ref}
      className={cn(
        'flex-row items-center gap-3 px-4 py-3.5',
        divided && 'border-t border-border',
        className
      )}
      {...props}
    />
  )
);
FrameRow.displayName = 'Frame.Row';

const FrameFooter = forwardRef<View, FrameProps>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    className={cn('flex-row items-center gap-2 px-5 py-2', className)}
    {...props}
  />
));
FrameFooter.displayName = 'Frame.Footer';

export const Frame = Object.assign(FrameRoot, {
  Header: FrameHeader,
  Title: FrameTitle,
  Description: FrameDescription,
  Panel: FramePanel,
  Row: FrameRow,
  Footer: FrameFooter,
});
