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
 * That clip follows the shell's *border box*, not the box inside its border.
 * Along the straight edges the panel is held off by the border width and the
 * edge shows through, but at the corner arcs the panel's square corner is
 * clipped to the outer radius and paints across the border. At the default
 * hairline that is a sliver nobody sees. Give the shell a thicker border and
 * the corners visibly eat it, so a Frame with `border-2` or more needs the
 * panel told where to stop:
 *
 * ```tsx
 * <Frame className="rounded-[28px] border-2 border-dashed">
 *   <Frame.Panel className="rounded-b-[26px]">…</Frame.Panel>
 * </Frame>
 * ```
 *
 * The radius to use is the shell's less its border width. It is on the caller
 * because both arrive as `className` strings, which the component cannot read.
 *
 * ```tsx
 * <Frame>
 *   <Frame.Header>
 *     <Frame.Title>Agent monitor</Frame.Title>
 *     <Frame.Action>All agents under 25% token limit</Frame.Action>
 *   </Frame.Header>
 *   <Frame.Panel>
 *     <Frame.Row>
 *       <Frame.Media><PackageIcon /></Frame.Media>
 *       <Frame.Content>
 *         <Frame.Title>opus-4.6</Frame.Title>
 *         <Frame.Description>Indexing the repository</Frame.Description>
 *       </Frame.Content>
 *       <Frame.Actions><Chip>Running</Chip></Frame.Actions>
 *     </Frame.Row>
 *   </Frame.Panel>
 * </Frame>
 * ```
 *
 * `inset` is the other way to nest the two. The panel floats clear of the
 * shell on all four sides rather than sitting flush against three, and the band
 * left around it carries `Frame.Footer`. The band is a recess: the shell is the
 * popover surface with `--color-inset` laid over it rather than a colour of its
 * own, so it always comes out darker than the panel it holds. The surface
 * ladder cannot do that job — it runs darker in a light theme and lighter in a
 * dark one, and a recess has to read the same way in both.
 *
 * There is no shadow under it. A recessed band and a drop shadow are opposite
 * claims about where a surface sits, and this one is set into the page.
 *
 * The panel draws the hairlines between its own rows. React Native has no
 * `:first-child`, so the alternative is every caller writing
 * `divided={index > 0}` on every row and getting it wrong once.
 *
 * A row is three slots, and they exist because of one React Native detail:
 * Yoga defaults `flexShrink` to `0`, the opposite of the web. A child that is
 * not told to shrink never does, so a fourth thing in a row pushes the others
 * past the edge — where the frame's `overflow-hidden` silently cuts them off
 * rather than wrapping or truncating. `Frame.Media` and `Frame.Actions` hold
 * their size, `Frame.Content` takes what is left and is allowed to shrink to
 * nothing, and the row fits at any width without the caller measuring anything.
 */
import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  type ReactNode,
} from 'react';
import {
  Pressable,
  View,
  type PressableProps,
  type Text as RNText,
  type ViewProps,
} from 'react-native';
import { tv } from 'tailwind-variants';
import { ChevronRightIcon } from '../../icons';
import { Text, type TextProps, textChildren } from '../../primitives/text';
import { cn } from '../../utils/cn';

/**
 * The `inset` shell's geometry. Numbers rather than classes, because an
 * arbitrary Tailwind value a running dev server has not already compiled turns
 * into nothing at all — no error, no warning, the corner simply squares off.
 *
 * The panel's radius is the shell's less the shell's padding, so the two curves
 * are concentric. A panel radius that ignored the band would leave a crescent
 * of shell thicker at the corners than along the sides.
 */
const SHELL_PADDING = 8;
const SHELL_RADIUS = 38;
const PANEL_RADIUS = SHELL_RADIUS - SHELL_PADDING;
const FOOTER_INSET = 26;
const FOOTER_GAP = 16;

/** What the band does to an action put in it: equal width, and a full pill. */
const FOOTER_ACTION = 'h-11 flex-1 rounded-full';

const frameVariants = tv({
  slots: {
    root: '',
    recess: 'absolute inset-0 bg-inset',
    panel: 'overflow-hidden bg-card',
    header: 'flex-row items-center justify-between gap-3 px-4 pb-3 pt-2.5',
    footer: 'flex-row items-center gap-2 px-4 pb-3.5 pt-3',
  },
  variants: {
    variant: {
      // `overflow-hidden` is load-bearing — it is what makes the panel's
      // bottom corners take the shell's radius instead of squaring off
      // against it.
      //
      // The panel is flush left, right and bottom: no side or bottom border,
      // because the shell's own edge is already there, and no bottom radius,
      // because the shell clips it. Only the top corners and the rule under
      // the header are the panel's to draw.
      default: {
        root: 'overflow-hidden rounded-3xl border border-border bg-surface',
        panel: 'rounded-t-2xl border-t border-border',
      },
      // No shell: the panel is the whole widget. For a Frame nested inside a
      // card that already draws a border, where the shell's own edge sitting
      // just inside it reads as a double line.
      plain: {
        root: '',
        panel: 'rounded-3xl border border-border',
        // Nothing to be held in from — the footer lines up with the panel.
        footer: 'px-0',
      },
      // The panel floats inside the shell on all four sides instead of sitting
      // flush against three of them, and the band around it is a recess rather
      // than a lighter tray.
      inset: {
        root: 'overflow-hidden bg-popover',
        panel: 'bg-popover',
        header: 'px-3 pb-2.5 pt-1',
        footer: 'gap-3.5 p-0',
      },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export type FrameVariant = 'default' | 'plain' | 'inset';

/**
 * True inside a `Frame.Content`. The header's caption and a row's title are the
 * same part in two places and only the placement decides the weight: a header
 * labels the tray the card sits in, so it stays quiet, while a row title is the
 * row's subject and has to carry it.
 */
const FrameSlotContext = createContext(false);

/**
 * The root's variant, for the parts that draw differently under each one. The
 * panel, the header and the footer all need it, and none of them can be told
 * directly — a caller writes `<Frame variant="inset">` once and expects the
 * shape to follow.
 */
const FrameVariantContext = createContext<FrameVariant>('default');

export interface FrameProps extends ViewProps {
  className?: string;
}

export interface FrameRootProps extends FrameProps {
  /**
   * `plain` drops the outer shell so the panel is the widget — for a Frame
   * inside a container that already draws its own border. `inset` sets the
   * panel into a recessed band on all four sides instead, and gives
   * `Frame.Footer` somewhere to sit.
   */
  variant?: FrameVariant;
}

const FrameRoot = forwardRef<View, FrameRootProps>(
  ({ className, variant = 'default', children, style, ...props }, ref) => {
    const slots = frameVariants({ variant });
    const inset = variant === 'inset';
    return (
      <View
        {...props}
        ref={ref}
        className={slots.root({ className })}
        style={
          inset
            ? [{ borderRadius: SHELL_RADIUS, padding: SHELL_PADDING }, style]
            : style
        }
      >
        {inset ? <View pointerEvents="none" className={slots.recess()} /> : null}
        <FrameVariantContext.Provider value={variant}>
          {children}
        </FrameVariantContext.Provider>
      </View>
    );
  }
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
  ({ className, ...props }, ref) => {
    // `min-w-0` on nothing here — the title itself takes the flexible side, so
    // a long one truncates instead of shoving the action off the edge.
    //
    // The padding follows the variant: under `inset` the shell already holds
    // everything in by its own padding, so repeating the full inset here would
    // set the title further from the edge than the panel below it.
    const variant = useContext(FrameVariantContext);
    return (
      <View
        {...props}
        ref={ref}
        className={frameVariants({ variant }).header({ className })}
      />
    );
  }
);
FrameHeader.displayName = 'Frame.Header';

/**
 * Muted in a header, where it is a caption on the tray the card sits in. Inside
 * a `Frame.Content` it is the row's subject instead, so it takes the foreground
 * colour and medium weight, and truncates to one line rather than pushing the
 * row's trailing slot out of view. Pass `numberOfLines` to override either way.
 */
const FrameTitle = forwardRef<RNText, TextProps>(({ className, ...props }, ref) => {
  const inRow = useContext(FrameSlotContext);

  if (inRow) {
    return (
      <Text
        ref={ref}
        size="sm"
        weight="medium"
        numberOfLines={1}
        className={className}
        {...props}
      />
    );
  }

  return (
    <Text ref={ref} size="sm" muted className={cn('min-w-0 shrink', className)} {...props} />
  );
});
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
    <View
      ref={ref}
      className={cn('shrink-0 flex-row items-center gap-2', className)}
      {...props}
    >
      {textChildren(children, (text) => (
        <Text size="sm" muted>
          {text}
        </Text>
      ))}
    </View>
  )
);
FrameAction.displayName = 'Frame.Action';

/**
 * Secondary line under the title — in a column-wrapped header, or under a row's
 * title inside `Frame.Content`, where it drops a size and wraps to two lines.
 */
const FrameDescription = forwardRef<RNText, TextProps>(
  ({ className, ...props }, ref) => {
    const inRow = useContext(FrameSlotContext);

    return (
      <Text
        ref={ref}
        size={inRow ? 'xs' : 'sm'}
        muted
        numberOfLines={inRow ? 2 : undefined}
        className={className}
        {...props}
      />
    );
  }
);
FrameDescription.displayName = 'Frame.Description';

export interface FrameMediaProps extends FrameProps {
  children?: ReactNode;
}

/**
 * Leading slot on a row — an icon, an avatar, a status dot. Holds its size, so
 * whatever it holds is never squeezed by the text beside it.
 */
const FrameMedia = forwardRef<View, FrameMediaProps>(
  ({ className, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('shrink-0 items-center justify-center', className)}
      {...props}
    />
  )
);
FrameMedia.displayName = 'Frame.Media';

export interface FrameContentProps extends FrameProps {
  children?: ReactNode;
}

/**
 * The flexible middle of a row — usually a `Frame.Title` over a
 * `Frame.Description`. It takes whatever the media and actions leave and is
 * allowed to shrink past its content, which is what keeps a long line from
 * pushing the rest of the row off the edge.
 */
const FrameContent = forwardRef<View, FrameContentProps>(
  ({ className, children, ...props }, ref) => (
    // `min-w-0` is the whole trick: a flex child's minimum size is its content
    // unless told otherwise, so `flex-1` alone still refuses to go narrower
    // than the longest word in it.
    <View ref={ref} className={cn('min-w-0 flex-1 gap-0.5', className)} {...props}>
      <FrameSlotContext.Provider value>{children}</FrameSlotContext.Provider>
    </View>
  )
);
FrameContent.displayName = 'Frame.Content';

export interface FrameActionsProps extends FrameProps {
  children?: ReactNode;
}

/**
 * Trailing slot on a row — a chip, a value, a switch, a small button. Holds its
 * size, so it stays readable however long the content beside it runs.
 */
const FrameActions = forwardRef<View, FrameActionsProps>(
  ({ className, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('shrink-0 flex-row items-center gap-1.5', className)}
      {...props}
    />
  )
);
FrameActions.displayName = 'Frame.Actions';

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
 * with the header strip above it. Under `inset` it floats clear of all four
 * instead, at the radius that keeps it concentric with the shell.
 */
const FramePanel = forwardRef<View, FramePanelProps>(
  ({ className, dividers = true, children, style, ...props }, ref) => {
    const variant = useContext(FrameVariantContext);
    return (
      <View
        {...props}
        ref={ref}
        className={frameVariants({ variant }).panel({ className })}
        style={variant === 'inset' ? [{ borderRadius: PANEL_RADIUS }, style] : style}
      >
        {dividers ? divideChildren(children) : children}
      </View>
    );
  }
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
  /**
   * Let the row run onto a second line instead of holding one. For a cluster
   * of chips or tags, where the alternative is the last ones being clipped.
   */
  wrap?: boolean;
  /**
   * Where the row's slots sit against each other. `start` for a row two or
   * three lines tall, where centring an icon against a tall text column leaves
   * it floating in the middle.
   */
  align?: 'center' | 'start';
  children?: ReactNode;
}

/**
 * A row inside a Frame.Panel. Give it an `onPress` and it becomes a real
 * pressable — press feedback, a button role — rather than a View with a
 * handler bolted on.
 */
const FrameRow = forwardRef<View, FrameRowProps>(
  (
    { className, divided, chevron, wrap, align = 'center', children, onPress, ...props },
    ref
  ) => {
    const classes = cn(
      'flex-row gap-3 px-4 py-3.5',
      align === 'start' ? 'items-start' : 'items-center',
      wrap && 'flex-wrap',
      divided && 'border-t border-border',
      onPress && 'active:bg-muted',
      className
    );

    const body = (
      <>
        {textChildren(children)}
        {chevron ? <ChevronRightIcon size={16} /> : null}
      </>
    );

    if (!onPress) {
      return (
        <View ref={ref} {...(props as ViewProps)} className={classes}>
          {body}
        </View>
      );
    }

    return (
      <Pressable
        ref={ref}
        {...props}
        accessibilityRole="button"
        onPress={onPress}
        className={classes}
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

export interface FrameFooterProps extends FrameProps {
  children?: ReactNode;
}

/**
 * Shapes an `inset` footer's actions into the band's pills.
 *
 * The band is a row of equal decisions, so the actions are equal widths and
 * full circles rather than whatever radius each one arrived with. Doing it
 * here rather than asking every caller for three classes is the difference
 * between a variant that looks a certain way and one that can be made to.
 *
 * The caller's own `className` is merged last, so any of it can still be
 * overridden — a trailing icon button that should stay square, say.
 */
function pillChildren(children: ReactNode) {
  return Children.map(children, (child) => {
    if (!isValidElement<{ className?: string }>(child)) return child;
    return cloneElement(child, {
      className: cn(FOOTER_ACTION, child.props.className),
    });
  });
}

/**
 * The row of actions under the panel — what somebody does with the widget,
 * rather than more of what it says.
 *
 * Under `inset` it sits in the band, held further in than the panel is. A row
 * running the full width of the shell reads as another edge of it rather than
 * as things to press. Under the other two variants the panel stops being flush
 * at the bottom, which is what having a footer means there.
 */
const FrameFooter = forwardRef<View, FrameFooterProps>(
  ({ className, style, children, ...props }, ref) => {
    const variant = useContext(FrameVariantContext);
    const inset = variant === 'inset';
    return (
      <View
        {...props}
        ref={ref}
        className={frameVariants({ variant }).footer({ className })}
        style={
          inset
            ? [
                {
                  marginTop: FOOTER_GAP,
                  marginHorizontal: FOOTER_INSET - SHELL_PADDING,
                },
                style,
              ]
            : style
        }
      >
        {inset ? pillChildren(children) : children}
      </View>
    );
  }
);
FrameFooter.displayName = 'Frame.Footer';

/** Parts the panel divides. Declared after them, since it holds references. */
const DIVIDABLE = new Set<unknown>([FrameRow, FrameSection]);

export const Frame = Object.assign(FrameRoot, {
  Header: FrameHeader,
  Title: FrameTitle,
  Action: FrameAction,
  Description: FrameDescription,
  Panel: FramePanel,
  Footer: FrameFooter,
  Section: FrameSection,
  Row: FrameRow,
  Media: FrameMedia,
  Content: FrameContent,
  Actions: FrameActions,
});
