/**
 * Table — rows and columns that stay lined up.
 *
 * React Native has no table layout: no `<table>`, no column model, nothing that
 * makes the third cell of one row the same width as the third cell of the next.
 * A table here is therefore a stack of flex rows, and the columns exist only
 * because every row divides its width the same way.
 *
 * `columns` is the column model that closes that gap. Give the root one entry
 * per column and every `Table.Head` and `Table.Cell` takes its `flex`, `width`
 * and `align` from the entry at its own position in the row — so a column is
 * described once, at the top, and a row is just its contents. Without it the
 * sizing has to be repeated on every head and every cell, and the column drifts
 * the moment two of them disagree.
 *
 * ```tsx
 * <Table columns={[{ flex: 2 }, { align: 'end' }]}>
 * ```
 *
 * Props set on a head or a cell still win, for the one row that has to differ.
 *
 * Everything else it does own: the hairlines between rows and the missing one
 * under the last, the muted header and footer, the striping, the alignment of a
 * numeric column, and the sort arrow that turns over rather than swapping.
 *
 * ```tsx
 * <Table variant="outline" columns={[{ flex: 2 }, { align: 'end' }]}>
 *   <Table.Header>
 *     <Table.Row>
 *       <Table.Head>Invoice</Table.Head>
 *       <Table.Head sortDirection="desc" onPress={toggleSort}>Amount</Table.Head>
 *     </Table.Row>
 *   </Table.Header>
 *   <Table.Body>
 *     <Table.Row>
 *       <Table.Cell>INV-001</Table.Cell>
 *       <Table.Cell>$250.00</Table.Cell>
 *     </Table.Row>
 *   </Table.Body>
 * </Table>
 * ```
 *
 * `Table.Frame` is the same table in a widget shell, with the column headings
 * lifted onto the tray above the card. It takes the whole table and does the
 * lift itself, so the columns are still declared once.
 *
 * A table wider than the phone belongs in a horizontal scroller with a
 * `minWidth` on the table, not squeezed until the columns are unreadable — wrap
 * it in `ScrollFade` and the cut edge tells you there is more to the right.
 *
 * Long tables belong in a `FlatList` rather than in `Table.Body`, which renders
 * every row it is given. `Table.Row` takes `index` and `last` directly for that
 * case, since a virtualised row has no parent to read them from.
 */
import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { ChevronUpIcon } from '../../icons';
import {
  AnimatedPressable,
  type AnimatedPressableProps,
} from '../../primitives/animated-pressable';
import { Text, type TextProps, textChildren } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { selectionTick } from '../../utils/haptics';
import { Frame } from '../frame';
import type { TextRef, ViewRef } from '../../primitives/refs';

/** Long enough to read as the arrow turning over, short enough not to lag a tap. */
const SORT_DURATION = 160;

type TableSize = 'default' | 'sm';
type TableSection = 'header' | 'body' | 'footer';
type CellAlign = 'start' | 'center' | 'end';
export type TableSortDirection = 'asc' | 'desc';

const tableVariants = tv({
  slots: {
    root: 'w-full',
    row: 'w-full flex-row items-center',
    head: 'flex-row items-center gap-1.5',
    headLabel: 'font-medium text-muted-foreground',
    cell: 'flex-row items-center',
    cellLabel: 'text-foreground',
    caption: 'text-muted-foreground',
  },
  variants: {
    variant: {
      /** Hairlines only — the table sits directly on the page. */
      default: {},
      /** Framed and clipped, for a table that reads as its own card. */
      outline: { root: 'overflow-hidden rounded-xl border border-border' },
    },
    size: {
      default: {
        row: 'min-h-12 gap-3 px-4',
        headLabel: 'text-xs',
        cellLabel: 'text-sm',
        caption: 'text-sm',
      },
      sm: {
        row: 'min-h-10 gap-2 px-3',
        headLabel: 'text-[11px]',
        cellLabel: 'text-xs',
        caption: 'text-xs',
      },
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

const alignment: Record<CellAlign, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
};

export interface TableColumn {
  /**
   * Share of the leftover width, relative to the other columns. Defaults to 1,
   * so columns divide the row evenly.
   */
  flex?: number;
  /**
   * Fixed width in pixels, for a column that must not move — an icon, a state
   * dot. Wins over `flex`.
   */
  width?: number;
  /**
   * Which edge the column's content sits against. Use `end` for numbers: a
   * money column reads as a column only when the digits line up.
   */
  align?: CellAlign;
}

/**
 * Density, striping and the column model are set once on the root; every part
 * below reads them from here rather than being told again per row and per cell.
 */
const TableContext = createContext<{
  size: TableSize;
  striped: boolean;
  columns?: TableColumn[];
}>({
  size: 'default',
  striped: false,
});

/**
 * Which column a head or a cell is in — its position among its row's children,
 * counted by `Table.Row`. Only meaningful under a `columns` root, and the
 * counting is skipped entirely without one, so a table that sizes its cells by
 * hand pays nothing for a model it is not using.
 */
const TableColumnContext = createContext<number>(-1);

/**
 * Resolves a head's or a cell's sizing against the column it sits in. What the
 * part was given always wins: the model is the default for the column, not a
 * rule about it, so the one row that has to differ still can.
 */
function useColumn(own: TableColumn): Required<Pick<TableColumn, 'align'>> & TableColumn {
  const { columns } = useContext(TableContext);
  const index = useContext(TableColumnContext);
  const column = index >= 0 ? columns?.[index] : undefined;

  return {
    flex: own.flex ?? column?.flex,
    width: own.width ?? column?.width,
    align: own.align ?? column?.align ?? 'start',
  };
}

/**
 * Numbers a row's children so each one knows its column. Runs only when the
 * root carries a `columns` model — otherwise the children are handed straight
 * through, with no extra provider per cell on every row of the table.
 */
function useRowCells(children: ReactNode, enabled: boolean): ReactNode {
  return useMemo(() => {
    const cells = textChildren(children);
    if (!enabled) return cells;

    return Children.map(cells, (child, index) =>
      isValidElement(child) ? (
        <TableColumnContext.Provider value={index}>{child}</TableColumnContext.Provider>
      ) : (
        child
      )
    );
  }, [children, enabled]);
}

/**
 * Which band of the table a row is in, and where in that band. A row needs all
 * three: the section decides its text and its borders, the index decides
 * whether it is striped, and being last is what removes the hairline that would
 * otherwise double up with the table's own bottom edge.
 */
const TableRowContext = createContext<{
  section: TableSection;
  index: number;
  last: boolean;
}>({
  section: 'body',
  index: 0,
  last: false,
});

/**
 * Whether the row a cell is in is selected. A selected row is drawn on the
 * accent fill, so the text in its cells has to switch to the colour made to be
 * read on that fill rather than keep the table's own.
 */
const TableRowSelectedContext = createContext(false);

export interface TableProps extends ViewProps, VariantProps<typeof tableVariants> {
  className?: string;
  /**
   * Row density. `Table.Row`, `Table.Head` and `Table.Cell` follow it, so it
   * only needs setting here.
   */
  size?: TableSize;
  /**
   * Tint every other body row. Helps the eye track across a wide row; drop it
   * for a short table, where the stripes are louder than the data.
   */
  striped?: boolean;
  /**
   * The column model: one entry per column, in order. Every `Table.Head` and
   * `Table.Cell` takes its `flex`, `width` and `align` from the entry at its
   * own position in the row, so a column is described once instead of on every
   * row. Anything set on a head or a cell still wins.
   *
   * Declare it outside render — a new array each frame renumbers every cell.
   */
  columns?: TableColumn[];
  children?: ReactNode;
}

const TableRoot = forwardRef<ViewRef, TableProps>(
  (
    { className, variant, size = 'default', striped = false, columns, children, ...props },
    ref
  ) => {
    const { root } = tableVariants({ variant, size });
    const context = useMemo(() => ({ size, striped, columns }), [size, striped, columns]);

    return (
      <TableContext.Provider value={context}>
        <View ref={ref} role="table" className={root({ className })} {...props}>
          {textChildren(children)}
        </View>
      </TableContext.Provider>
    );
  }
);
TableRoot.displayName = 'Table';

/**
 * Wraps each row of a section in its position, so a row does not have to be
 * told where it sits. Wrapping rather than cloning: a row is often produced by
 * a `.map()` through a component of your own, and props set on that wrapper
 * would never reach the row itself.
 */
function useSectionRows(children: ReactNode, section: TableSection): ReactNode {
  return useMemo(() => {
    const rows = Children.toArray(children).filter((child) => isValidElement(child));

    return rows.map((child, index) => (
      <TableRowContext.Provider
        // The row's own key stays on the element; this wrapper needs its own.
        key={index}
        value={{ section, index, last: index === rows.length - 1 }}
      >
        {child}
      </TableRowContext.Provider>
    ));
  }, [children, section]);
}

export interface TableHeaderProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** The band of column headers. Draws the rule that separates it from the body. */
const TableHeader = forwardRef<ViewRef, TableHeaderProps>(
  ({ className, children, ...props }, ref) => {
    const rows = useSectionRows(children, 'header');

    return (
      <View
        ref={ref}
        role="rowgroup"
        className={cn('w-full border-b border-border', className)}
        {...props}
      >
        {rows}
      </View>
    );
  }
);
TableHeader.displayName = 'Table.Header';

export interface TableBodyProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** The data rows. Renders every child it is given — see `FlatList` for long tables. */
const TableBody = forwardRef<ViewRef, TableBodyProps>(
  ({ className, children, ...props }, ref) => {
    const rows = useSectionRows(children, 'body');

    return (
      <View ref={ref} role="rowgroup" className={cn('w-full', className)} {...props}>
        {rows}
      </View>
    );
  }
);
TableBody.displayName = 'Table.Body';

export interface TableFooterProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** Totals band. Tinted and ruled off, because a sum is not another row of data. */
const TableFooter = forwardRef<ViewRef, TableFooterProps>(
  ({ className, children, ...props }, ref) => {
    const rows = useSectionRows(children, 'footer');

    return (
      <View
        ref={ref}
        role="rowgroup"
        className={cn('w-full border-t border-border bg-muted/50', className)}
        {...props}
      >
        {rows}
      </View>
    );
  }
);
TableFooter.displayName = 'Table.Footer';

export interface TableRowProps
  extends Omit<AnimatedPressableProps, 'children' | 'disabled'> {
  className?: string;
  /** Marks the row as the chosen one — for a table you pick from. */
  selected?: boolean;
  disabled?: boolean;
  /**
   * Position in the section, for a row rendered outside `Table.Body` — a
   * `FlatList` item, say. Decides which rows a striped table tints.
   */
  index?: number;
  /**
   * Whether this is the section's final row, for a row rendered outside
   * `Table.Body`. The last row drops its hairline so it does not double up with
   * the table's own bottom edge.
   */
  last?: boolean;
  children?: ReactNode;
}

/**
 * Renders as a pressable when given `onPress`, and as a plain view otherwise,
 * so a table you only read does not announce every row as a button.
 */
const TableRow = forwardRef<ViewRef, TableRowProps>(
  ({ className, selected, disabled, index, last, children, onPress, ...props }, ref) => {
    const { size, striped, columns } = useContext(TableContext);
    const row = useContext(TableRowContext);
    const { row: rowClass } = tableVariants({ size });
    const cells = useRowCells(children, !!columns);

    const position = index ?? row.index;
    const isLast = last ?? row.last;
    // The header is one row above a rule of its own and the footer one below
    // another, so neither wants a hairline; in the body every row but the last
    // is separated from the one under it.
    const ruled = row.section === 'body' && !isLast;
    // Stripe the odd rows, so the first row of a table reads on the table's own
    // background rather than in a band.
    const striping =
      striped && row.section === 'body' && position % 2 === 1 && !selected;

    const classes = rowClass({
      className: cn(
        ruled && 'border-b border-border',
        striping && 'bg-muted/40',
        selected && 'bg-accent',
        disabled && 'opacity-[0.64]',
        className
      ),
    });

    if (!onPress) {
      return (
        <View
          ref={ref}
          {...(props as ViewProps)}
          role="row"
          accessibilityState={{ disabled: !!disabled, selected: !!selected }}
          className={classes}
        >
          <TableRowSelectedContext.Provider value={!!selected}>{cells}</TableRowSelectedContext.Provider>
        </View>
      );
    }

    return (
      <AnimatedPressable
        ref={ref}
        {...props}
        // A row you can act on is a button first: announcing it as a row would
        // hide the fact that it does anything.
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled, selected: !!selected }}
        disabled={disabled}
        onPress={onPress}
        className={classes}
      >
        <TableRowSelectedContext.Provider value={!!selected}>{cells}</TableRowSelectedContext.Provider>
      </AnimatedPressable>
    );
  }
);
TableRow.displayName = 'Table.Row';

/**
 * Column sizing, shared by a head and the cells beneath it. Written out on both
 * rather than inherited from one place, so the props table on each says what it
 * actually takes.
 */
function columnStyle({ flex, width }: { flex?: number; width?: number }) {
  if (width !== undefined) return { width, flexGrow: 0, flexShrink: 0 };
  return { flex: flex ?? 1 };
}

export interface TableHeadProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /**
   * Share of the leftover width, relative to the other cells in the row.
   * Defaults to 1, so columns divide the row evenly. Without a `columns` model
   * on the root it must match the `flex` on the cells beneath it.
   */
  flex?: number;
  /**
   * Fixed width in pixels, for a column that must not move — an icon, a state
   * dot. Without a `columns` model on the root it must match the `width` on the
   * cells beneath it.
   */
  width?: number;
  /**
   * Which edge the column's content sits against. Use `end` for numbers: a
   * money column reads as a column only when the digits line up.
   */
  align?: CellAlign;
  /**
   * Show the sort arrow without committing to a direction — the column can be
   * sorted, but is not the one being sorted by. Implied by `sortDirection`.
   */
  sortable?: boolean;
  /** The direction this column is currently sorted in. Turns the arrow over. */
  sortDirection?: TableSortDirection;
  /** Called on a tap. Supplying it makes the header a button. */
  onPress?: AnimatedPressableProps['onPress'];
  /** Styles the header's text. */
  labelClassName?: string;
  children?: ReactNode;
}

/**
 * A column header. Given `onPress` it becomes the handle for sorting by that
 * column, and the arrow rotates between the two directions rather than being
 * replaced, so it is clear it is the same arrow pointing the other way.
 *
 * The sorted column is stated twice — a full-strength arrow *and* a label that
 * takes the foreground colour and a heavier weight. One signal at the size of a
 * sort arrow is too quiet to notice: a press that only nudges a dim 14px chevron
 * reads as a press that did nothing, even when the rows behind it did move.
 *
 * The component never sorts. It renders the direction it is told and reports
 * the press; which column, which way and in what order stay with the caller,
 * because the data being sorted is theirs.
 */
const TableHead = forwardRef<ViewRef, TableHeadProps>(
  (
    {
      className,
      labelClassName,
      align: ownAlign,
      sortable,
      sortDirection,
      onPress,
      flex: ownFlex,
      width: ownWidth,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const { size } = useContext(TableContext);
    const { flex, width, align } = useColumn({
      flex: ownFlex,
      width: ownWidth,
      align: ownAlign,
    });
    const { head, headLabel } = tableVariants({ size });
    const arrowColor = useCSSVariable('--color-muted-foreground');
    const activeArrowColor = useCSSVariable('--color-foreground');

    const showArrow = sortable || !!sortDirection;
    const turn = useSharedValue(sortDirection === 'desc' ? 1 : 0);

    useEffect(() => {
      turn.value = withTiming(sortDirection === 'desc' ? 1 : 0, {
        duration: SORT_DURATION,
      });
    }, [sortDirection, turn]);

    const arrowStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${turn.value * 180}deg` }],
    }));

    const classes = head({ className: cn(alignment[align], className) });
    const label = (
      <>
        {textChildren(children, (text) => (
          <Text
            className={headLabel({
              className: cn(sortDirection && 'font-semibold text-foreground', labelClassName),
            })}
          >
            {text}
          </Text>
        ))}
        {showArrow ? (
          <Animated.View
            // Dimmed until this is the column being sorted by: the arrow is an
            // affordance first and an answer second. Far enough down that the
            // two states are not mistaken for each other at a glance.
            style={[arrowStyle, sortDirection ? undefined : { opacity: 0.35 }]}
          >
            <ChevronUpIcon
              size={sortDirection ? 16 : 14}
              color={
                sortDirection
                  ? typeof activeArrowColor === 'string'
                    ? activeArrowColor
                    : '#0a0a0a'
                  : typeof arrowColor === 'string'
                    ? arrowColor
                    : '#737373'
              }
            />
          </Animated.View>
        ) : null}
      </>
    );

    if (!onPress) {
      return (
        <View
          ref={ref}
          role="columnheader"
          className={classes}
          style={[columnStyle({ flex, width }), style]}
          {...props}
        >
          {label}
        </View>
      );
    }

    return (
      <AnimatedPressable
        ref={ref}
        accessibilityRole="button"
        accessibilityState={{ selected: !!sortDirection }}
        accessibilityHint={
          sortDirection === 'asc'
            ? 'Sorts this column in descending order'
            : sortDirection === 'desc'
              ? 'Sorts this column in ascending order'
              : 'Sorts the table by this column'
        }
        onPress={(event) => {
          // The rows re-order under the finger; the tick is what ties that to
          // the press, on the frame of the press rather than after the sort.
          selectionTick();
          onPress?.(event);
        }}
        className={classes}
        style={[columnStyle({ flex, width }), style]}
        {...props}
      >
        {label}
      </AnimatedPressable>
    );
  }
);
TableHead.displayName = 'Table.Head';

export interface TableCellProps extends ViewProps {
  className?: string;
  /**
   * Share of the leftover width, relative to the other cells in the row.
   * Defaults to 1. Without a `columns` model on the root it must match the
   * `flex` on the head above it.
   */
  flex?: number;
  /**
   * Fixed width in pixels, for a column that must not move. Without a `columns`
   * model on the root it must match the `width` on the head above it.
   */
  width?: number;
  /**
   * Which edge the cell's content sits against. Without a `columns` model on
   * the root, match the head above it.
   */
  align?: CellAlign;
  /** Styles the cell's text. */
  labelClassName?: string;
  children?: ReactNode;
}

/**
 * One cell of a row. Bare text is wrapped in the cell's own type style, so a
 * row of strings needs no `Text` around each one; anything else — a Badge, an
 * Avatar, a Button — is rendered as given.
 */
const TableCell = forwardRef<ViewRef, TableCellProps>(
  (
    {
      className,
      labelClassName,
      align: ownAlign,
      flex: ownFlex,
      width: ownWidth,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const { size } = useContext(TableContext);
    const { flex, width, align } = useColumn({
      flex: ownFlex,
      width: ownWidth,
      align: ownAlign,
    });
    const rowSelected = useContext(TableRowSelectedContext);
    const { cell, cellLabel } = tableVariants({ size });

    return (
      <View
        ref={ref}
        role="cell"
        className={cell({ className: cn(alignment[align], className) })}
        style={[columnStyle({ flex, width }), style]}
        {...props}
      >
        {textChildren(children, (text) => (
          <Text
            className={cellLabel({
              className: cn(rowSelected && 'text-accent-foreground', labelClassName),
            })}
          >
            {text}
          </Text>
        ))}
      </View>
    );
  }
);
TableCell.displayName = 'Table.Cell';

export interface TableCaptionProps extends TextProps {
  className?: string;
}

/**
 * A line about the table as a whole — what it counts, when it was last read.
 * Place it after the body: a caption read before the columns is a heading, and
 * a heading is not this component's job.
 */
const TableCaption = forwardRef<TextRef, TableCaptionProps>(
  ({ className, ...props }, ref) => {
    const { size } = useContext(TableContext);
    const { caption } = tableVariants({ size });

    return <Text ref={ref} className={caption({ className })} {...props} />;
  }
);
TableCaption.displayName = 'Table.Caption';

export interface TableEmptyProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Stands in for the body when there is nothing to show. A table with a header
 * and no rows under it looks broken rather than empty, and the header is worth
 * keeping: it says what would be there.
 */
const TableEmpty = forwardRef<ViewRef, TableEmptyProps>(
  ({ className, children, ...props }, ref) => {
    const { size } = useContext(TableContext);
    const { caption } = tableVariants({ size });

    return (
      <View
        ref={ref}
        role="row"
        className={cn('w-full items-center justify-center px-4 py-8', className)}
        {...props}
      >
        {textChildren(children, (text) => (
          <Text className={caption()}>{text}</Text>
        ))}
      </View>
    );
  }
);
TableEmpty.displayName = 'Table.Empty';

export interface TableFrameProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /** Caption on the tray, above the column headings. */
  title?: ReactNode;
  /** Trailing slot on the title row — a button, a badge, a menu. */
  action?: ReactNode;
  /** A line under the title, for what the table is counting. */
  description?: ReactNode;
  /** Row density, as on `Table`. */
  size?: TableSize;
  /** Tint every other body row, as on `Table`. */
  striped?: boolean;
  /** The column model, as on `Table`. */
  columns?: TableColumn[];
  children?: ReactNode;
}

/**
 * The table in a widget shell: column headings on the tray, rows in the card
 * below.
 *
 * The headings are lifted out of the card because they are not data. Sitting on
 * the tray they read as the label for the block, the way the muted caption above
 * any other panel does, and the card underneath holds nothing but rows — so the
 * first row is a row rather than the thing after the header.
 *
 * The lift is done here rather than by the caller because the alternative is
 * declaring every column twice: a heading row outside the table and a body
 * inside it, with `flex` and `width` kept in agreement across the gap by hand.
 * Given the whole table, this can take the `Table.Header` out of it and leave
 * everything measuring against the same padding.
 *
 * ```tsx
 * <Table.Frame title="Invoices" action={<Badge>5</Badge>}>
 *   <Table.Header>
 *     <Table.Row>
 *       <Table.Head flex={2}>Invoice</Table.Head>
 *       <Table.Head align="end">Amount</Table.Head>
 *     </Table.Row>
 *   </Table.Header>
 *   <Table.Body>…</Table.Body>
 * </Table.Frame>
 * ```
 */
const TableFrame = forwardRef<ViewRef, TableFrameProps>(
  (
    {
      className,
      title,
      action,
      description,
      size = 'default',
      striped = false,
      columns,
      children,
      ...props
    },
    ref
  ) => {
    const context = useMemo(() => ({ size, striped, columns }), [size, striped, columns]);

    const { heading, body } = useMemo(() => {
      let found: ReactElement<TableHeaderProps> | null = null;
      const remaining: ReactNode[] = [];

      for (const child of Children.toArray(children)) {
        if (!found && isValidElement(child) && child.type === TableHeader) {
          // The tray already draws the rule the panel's top border is, so the
          // header's own would double it.
          found = cloneElement(child as ReactElement<TableHeaderProps>, {
            className: cn('border-b-0', (child.props as TableHeaderProps).className),
          });
          continue;
        }
        remaining.push(child);
      }

      return { heading: found, body: remaining };
    }, [children]);

    const captioned = title !== undefined || description !== undefined || !!action;

    return (
      <TableContext.Provider value={context}>
        <Frame ref={ref} role="table" className={className} {...props}>
          {captioned ? (
            <Frame.Header className={cn('items-start', heading && 'pb-1.5')}>
              <View className="min-w-0 flex-1 gap-0.5">
                {textChildren(title, (text) => (
                  <Frame.Title>{text}</Frame.Title>
                ))}
                {textChildren(description, (text) => (
                  <Frame.Description>{text}</Frame.Description>
                ))}
              </View>
              {action ? <Frame.Action>{action}</Frame.Action> : null}
            </Frame.Header>
          ) : null}

          {heading ? (
            // No horizontal padding of its own: `Table.Row` brings the same
            // `px-4` the rows in the panel do, which is the whole reason the
            // headings still line up with their cells from out here.
            <View className={cn('pb-2', captioned ? 'pt-0' : 'pt-2.5')}>{heading}</View>
          ) : null}

          <Frame.Panel dividers={false}>{body}</Frame.Panel>
        </Frame>
      </TableContext.Provider>
    );
  }
);
TableFrame.displayName = 'Table.Frame';

export const Table = Object.assign(TableRoot, {
  Frame: TableFrame,
  Header: TableHeader,
  Body: TableBody,
  Footer: TableFooter,
  Row: TableRow,
  Head: TableHead,
  Cell: TableCell,
  Caption: TableCaption,
  Empty: TableEmpty,
});
