/**
 * Frame — a widget shell: a card of rows sitting in a tray, with the tray's
 * one exposed strip along the top carrying the title.
 *
 * The two surfaces are nested rather than stacked, and only one edge of the
 * outer one is ever visible. The panel is flush to the shell's left, right and
 * bottom, so the shell reads as something the card is *sitting in* rather than
 * as a border around it — and the strip left at the top is the header, which
 * is why the header needs no rule under it and no background of its own.
 *
 * The shell's radius is the larger of the two, and the panel's top corners are
 * tighter. That is the reverse of the usual nested-radius rule, and it is
 * deliberate: with only the top corners free, matching them would make the two
 * surfaces read as one misdrawn shape. The panel's bottom corners are not set
 * at all — the shell clips them, so they take its radius exactly.
 *
 * ```tsx
 * <Frame>
 *   <Frame.Header>
 *     <Frame.Title>Agent monitor</Frame.Title>
 *     <Frame.Action>All agents under 25% token limit</Frame.Action>
 *   </Frame.Header>
 *   <Frame.Panel>
 *     <Frame.Row>…</Frame.Row>
 *     <Frame.Row>…</Frame.Row>
 *   </Frame.Panel>
 * </Frame>
 * ```
 *
 * The panel draws the hairlines between its own rows. React Native has no
 * `:first-child`, so the alternative is every caller writing
 * `divided={index > 0}` on every row and getting it wrong once.
 */
import { Children, cloneElement, forwardRef, isValidElement, type ReactNode } from 'react';
import {
  Pressable,
  View,
  type PressableProps,
  type Text as RNText,
  type ViewProps,
} from 'react-native';
import { tv } from 'tailwind-variants';
import { ChevronRightIcon } from '../../icons';
import { Text, type TextProps } from '../../primitives/text';
import { cn } from '../../utils/cn';

const frameVariants = tv({
  slots: {
    root: '',
    // Flush left, right and bottom: no side or bottom border, because the
    // shell's own edge is already there, and no bottom radius, because the
    // shell clips it. Only the top corners and the rule under the header are
    // the panel's to draw.
    panel: 'overflow-hidden rounded-t-2xl border-t border-border bg-card',
  },
  variants: {
    variant: {
      // `overflow-hidden` is load-bearing — it is what makes the panel's
      // bottom corners take the shell's radius instead of squaring off
      // against it.
      default: {
        root: 'overflow-hidden rounded-3xl border border-border bg-surface',
      },
      // No shell: the panel is the whole widget. For a Frame nested inside a
      // card that already draws a border, where the shell's own edge sitting
      // just inside it reads as a double line.
      plain: { root: '', panel: 'rounded-3xl border border-border' },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export type FrameVariant = 'default' | 'plain';

export interface FrameProps extends ViewProps {
  className?: string;
}

export interface FrameRootProps extends FrameProps {
  /**
   * `plain` drops the outer shell so the panel is the widget — for a Frame
   * inside a container that already draws its own border.
   */
  variant?: FrameVariant;
}

const FrameRoot = forwardRef<View, FrameRootProps>(
  ({ className, variant, ...props }, ref) => (
    <View ref={ref} className={frameVariants({ variant }).root({ className })} {...props} />
  )
);
FrameRoot.displayName = 'Frame';

export interface FrameHeaderProps extends FrameProps {
  children?: ReactNode;
}

/**
 * The header row — the strip of shell left exposed above the panel. Title on
 * the left, `Frame.Action` on the right. Add `className="flex-col items-start"`
 * when you want a description underneath.
 */
const FrameHeader = forwardRef<View, FrameHeaderProps>(
  ({ className, ...props }, ref) => (
    <View
      ref={ref}
      className={cn(
        'flex-row items-center justify-between gap-3 px-4 pb-3 pt-2.5',
        className
      )}
      {...props}
    />
  )
);
FrameHeader.displayName = 'Frame.Header';

/**
 * Muted by default. The header is a caption on the tray the card sits in, not
 * a heading over a section — the card's own rows carry the weight.
 */
const FrameTitle = forwardRef<RNText, TextProps>(({ className, ...props }, ref) => (
  <Text ref={ref} size="sm" muted className={className} {...props} />
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
        <Text size="sm" muted>
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
 * Marks the parts that take part in the panel's own divider bookkeeping —
 * a Row draws a line above itself, a Section draws one above its heading.
 * Anything else the panel is given is left alone.
 */
interface Dividable {
  divided?: boolean;
}

/**
 * Draws the hairline above every child but the first. An explicit `divided`
 * on a child wins, so a row can still opt out or force one.
 */
function divideChildren(children: ReactNode) {
  let seen = 0;
  return Children.map(children, (child) => {
    if (!isValidElement<Dividable>(child)) return child;
    if (!DIVIDABLE.has(child.type)) return child;

    const index = seen++;
    if (child.props.divided !== undefined) return child;
    return cloneElement(child, { divided: index > 0 });
  });
}

export interface FramePanelProps extends FrameProps {
  /**
   * Set false to place the hairlines by hand instead — for a panel whose rows
   * are generated somewhere the divider order is not obvious.
   */
  dividers?: boolean;
  children?: ReactNode;
}

/**
 * The card holding the frame's content — flush to the shell on three sides,
 * with the header strip above it.
 */
const FramePanel = forwardRef<View, FramePanelProps>(
  ({ className, dividers = true, children, ...props }, ref) => (
    <View ref={ref} className={frameVariants().panel({ className })} {...props}>
      {dividers ? divideChildren(children) : children}
    </View>
  )
);
FramePanel.displayName = 'Frame.Panel';

export interface FrameRowProps extends Omit<PressableProps, 'children'>, Dividable {
  className?: string;
  /**
   * Draw a hairline above this row. `Frame.Panel` sets it for you; pass it
   * explicitly to override the panel's decision either way.
   */
  divided?: boolean;
  /** Trailing chevron marking the row as leading somewhere. */
  chevron?: boolean;
  children?: ReactNode;
}

/**
 * A row inside a Frame.Panel. Give it an `onPress` and it becomes a real
 * pressable — press feedback, a button role — rather than a View with a
 * handler bolted on.
 */
const FrameRow = forwardRef<View, FrameRowProps>(
  ({ className, divided, chevron, children, onPress, ...props }, ref) => {
    const classes = cn(
      'flex-row items-center gap-3 px-4 py-3.5',
      divided && 'border-t border-border',
      onPress && 'active:bg-muted',
      className
    );

    const body = (
      <>
        {children}
        {chevron ? <ChevronRightIcon size={16} /> : null}
      </>
    );

    if (!onPress) {
      return (
        <View ref={ref} className={classes} {...(props as ViewProps)}>
          {body}
        </View>
      );
    }

    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        onPress={onPress}
        className={classes}
        {...props}
      >
        {body}
      </Pressable>
    );
  }
);
FrameRow.displayName = 'Frame.Row';

export interface FrameSectionProps extends FrameProps, Dividable {
  /** Heading above the rows. Strings are wrapped for you. */
  title?: ReactNode;
  divided?: boolean;
  children?: ReactNode;
}

/**
 * A labelled cluster of rows inside a Panel, for a widget holding more than
 * one group. It divides its own rows the way the panel does, so the two nest
 * without either having to know about the other.
 */
const FrameSection = forwardRef<View, FrameSectionProps>(
  ({ className, title, divided, children, ...props }, ref) => (
    <View
      ref={ref}
      className={cn(divided && 'border-t border-border', className)}
      {...props}
    >
      {title ? (
        <View className="bg-muted/40 px-4 pb-1.5 pt-2.5">
          {typeof title === 'string' ? (
            <Text size="xs" weight="medium" muted className="uppercase tracking-wider">
              {title}
            </Text>
          ) : (
            title
          )}
        </View>
      ) : null}
      {divideChildren(children)}
    </View>
  )
);
FrameSection.displayName = 'Frame.Section';

/** Parts the panel divides. Declared after them, since it holds references. */
const DIVIDABLE = new Set<unknown>([FrameRow, FrameSection]);

export const Frame = Object.assign(FrameRoot, {
  Header: FrameHeader,
  Title: FrameTitle,
  Action: FrameAction,
  Description: FrameDescription,
  Panel: FramePanel,
  Section: FrameSection,
  Row: FrameRow,
});
