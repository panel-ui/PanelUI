/**
 * Frame — a widget shell: a titled surface wrapping an inset panel of rows,
 * with an optional action on the header row and a caption underneath.
 *
 * Layout follows the nested-radius rule (inner radius = outer radius minus the
 * gap between them), which is why the panel is `rounded-xl` inside a
 * `rounded-2xl` shell. Since v0.4.0 the radius scale is theme-scoped, so this
 * relationship holds while the absolute values change per theme.
 *
 * ```tsx
 * <Frame>
 *   <Frame.Header>
 *     <Frame.Title>Usage Type</Frame.Title>
 *     <Frame.Action>Amount</Frame.Action>
 *   </Frame.Header>
 *   <Frame.Panel>
 *     <Frame.Row>…</Frame.Row>
 *     <Frame.Row divided>…</Frame.Row>
 *   </Frame.Panel>
 *   <Frame.Footer>Updated 2 minutes ago</Frame.Footer>
 * </Frame>
 * ```
 */
import { forwardRef, type ReactNode } from 'react';
import { View, type Text as RNText, type ViewProps } from 'react-native';
import { Text, type TextProps } from '../../primitives/text';
import { cn } from '../../utils/cn';

export interface FrameProps extends ViewProps {
  className?: string;
}

const FrameRoot = forwardRef<View, FrameProps>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    className={cn('rounded-2xl border border-border bg-surface p-1.5', className)}
    {...props}
  />
));
FrameRoot.displayName = 'Frame';

export interface FrameHeaderProps extends FrameProps {
  children?: ReactNode;
}

/**
 * The header row: title on the left, `Frame.Action` on the right. Add
 * `className="flex-col items-start"` when you want a description underneath.
 */
const FrameHeader = forwardRef<View, FrameHeaderProps>(
  ({ className, ...props }, ref) => (
    <View
      ref={ref}
      className={cn(
        'flex-row items-center justify-between gap-3 px-3 pb-2.5 pt-2',
        className
      )}
      {...props}
    />
  )
);
FrameHeader.displayName = 'Frame.Header';

const FrameTitle = forwardRef<RNText, TextProps>(({ className, ...props }, ref) => (
  <Text
    ref={ref}
    size="base"
    weight="medium"
    className={cn('text-foreground', className)}
    {...props}
  />
));
FrameTitle.displayName = 'Frame.Title';

export interface FrameActionProps extends FrameProps {
  children?: ReactNode;
}

/**
 * Trailing slot on the header row — a column label, a count, a button, a badge.
 * Plain strings render as muted text; anything else renders as-is.
 */
const FrameAction = forwardRef<View, FrameActionProps>(
  ({ className, children, ...props }, ref) => (
    <View ref={ref} className={cn('flex-row items-center gap-2', className)} {...props}>
      {typeof children === 'string' ? (
        <Text size="base" muted>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  )
);
FrameAction.displayName = 'Frame.Action';

/** Secondary line under the title, inside a column-wrapped header. */
const FrameDescription = forwardRef<RNText, TextProps>(
  ({ className, ...props }, ref) => (
    <Text ref={ref} size="sm" muted className={className} {...props} />
  )
);
FrameDescription.displayName = 'Frame.Description';

/**
 * The inset card holding the frame's content — the raised surface sitting in
 * from the shell's edges, with its own smaller radius.
 */
const FramePanel = forwardRef<View, FrameProps>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    className={cn('overflow-hidden rounded-xl border border-border bg-card', className)}
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

export interface FrameFooterProps extends FrameProps {
  children?: ReactNode;
}

/** Muted caption under the panel. Strings are wrapped for you. */
const FrameFooter = forwardRef<View, FrameFooterProps>(
  ({ className, children, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('flex-row items-center gap-2 px-3 pb-1.5 pt-2.5', className)}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text size="sm" muted>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  )
);
FrameFooter.displayName = 'Frame.Footer';

export const Frame = Object.assign(FrameRoot, {
  Header: FrameHeader,
  Title: FrameTitle,
  Action: FrameAction,
  Description: FrameDescription,
  Panel: FramePanel,
  Row: FrameRow,
  Footer: FrameFooter,
});
