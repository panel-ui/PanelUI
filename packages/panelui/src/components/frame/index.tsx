import { forwardRef } from 'react';
import { View, type ViewProps } from 'react-native';
import { Text, type TextProps } from '../../primitives/text';
import { cn } from '../../utils/cn';

export interface FrameProps extends ViewProps {
  className?: string;
}

/**
 * Grouping container (Coss UI's CardFrame): a tinted, bordered surface that
 * holds one or more panels with a shared header and footer. Use it to group
 * related settings or list sections under a single title.
 */
const FrameRoot = forwardRef<View, FrameProps>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    className={cn(
      'overflow-hidden rounded-2xl border border-border bg-black/3 dark:bg-white/4',
      className
    )}
    {...props}
  />
));
FrameRoot.displayName = 'Frame';

const FrameHeader = forwardRef<View, FrameProps>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    className={cn('flex-row items-center gap-4 px-5 py-3.5', className)}
    {...props}
  />
));
FrameHeader.displayName = 'Frame.Header';

const FrameTitle = forwardRef<React.ElementRef<typeof Text>, TextProps>(
  ({ className, ...props }, ref) => (
    <Text
      ref={ref}
      size="sm"
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
 * The inset content surface inside a Frame — renders as a card-colored panel
 * with hairline separators, mirroring Coss's flattened cards-in-frame look.
 */
const FramePanel = forwardRef<View, FrameProps>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    className={cn('border-b border-border bg-card', className)}
    {...props}
  />
));
FramePanel.displayName = 'Frame.Panel';

/** A single row inside a Frame.Panel, separated from the row above it. */
const FrameRow = forwardRef<View, FrameProps>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    className={cn(
      'flex-row items-center gap-3 border-t border-border px-5 py-3.5',
      className
    )}
    {...props}
  />
));
FrameRow.displayName = 'Frame.Row';

const FrameFooter = forwardRef<View, FrameProps>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    className={cn('flex-row items-center gap-2 px-5 py-3.5', className)}
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
