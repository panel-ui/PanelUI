'use client';

/**
 * Table — rows of records with the same columns, to be read across and compared down.
 *
 * ```tsx
 * <Table>
 *   <Table.Header>
 *     <Table.Row>
 *       <Table.Head>Invoice</Table.Head>
 *       <Table.Head align="end">Amount</Table.Head>
 *     </Table.Row>
 *   </Table.Header>
 *   <Table.Body>
 *     <Table.Row>
 *       <Table.Cell>INV-2041</Table.Cell>
 *       <Table.Cell align="end">£1,280.00</Table.Cell>
 *     </Table.Row>
 *   </Table.Body>
 * </Table>
 * ```
 *
 * ## Numbers line up
 *
 * `align="end"` on a column's head and cells right-aligns it and switches the
 * digits to equal widths, so a column of amounts lines up on its last digit
 * and can be compared at a glance. Text columns stay at the start.
 *
 * ## It scrolls inside itself
 *
 * A table wider than the page scrolls sideways inside its own box, so the
 * page around it does not. Give the table a `maxHeight` and the body scrolls
 * too, with the header row pinned above it.
 *
 * ## Density
 *
 * `density="compact"` tightens the rows for a dense admin screen; the
 * default leaves room for a second line of muted text in a cell.
 * `striped` shades every other row, which helps a reader keep their place
 * across a wide row with nothing in the middle of it.
 *
 * Every part is the native table element, so a screen reader announces the
 * row and column of each cell. For data that is a list of things rather than
 * a grid of values, Frame's rows read better.
 */
import type { ComponentProps, CSSProperties } from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

const tableVariants = tv({
  // The parts are rendered apart from the table, so the table's own settings
  // (density, stripes, pinning, framing) reach them as data attributes on
  // the container rather than as variants.
  slots: {
    container: 'relative w-full overflow-auto',
    table: 'w-full caption-bottom border-collapse text-sm',
    header: [
      // The header's line is a shadow, so it stays drawn while the row is pinned and the body scrolls under it.
      '[&_tr]:shadow-[inset_0_-1px_0_var(--border)] [&_tr]:hover:bg-transparent',
    ],
    body: '[&_tr:last-child]:border-0',
    footer: 'border-t bg-muted/40 font-medium [&>tr]:last:border-b-0',
    row: [
      'border-b border-border transition-colors',
      'hover:bg-muted/40 data-[state=selected]:bg-muted aria-selected:bg-muted',
    ],
    head: [
      'h-10 whitespace-nowrap px-3 text-start align-middle text-xs font-medium text-muted-foreground',
      'first:ps-0 last:pe-0 in-data-[framed]:first:ps-4 in-data-[framed]:last:pe-4',
    ],
    cell: 'px-3 align-middle first:ps-0 last:pe-0 in-data-[framed]:first:ps-4 in-data-[framed]:last:pe-4',
    caption: 'mt-3 text-xs text-muted-foreground',
  },
  variants: {
    align: {
      start: {},
      center: { head: 'text-center', cell: 'text-center' },
      end: { head: 'text-end', cell: 'text-end tabular-nums' },
    },
  },
  defaultVariants: { align: 'start' },
});

export type TableDensity = 'comfortable' | 'compact';
export type TableAlign = 'start' | 'center' | 'end';

export interface TableProps extends ComponentProps<'table'> {
  /** Row height. `compact` for a dense screen. Default `comfortable`. */
  density?: TableDensity;
  /** Shades every other body row. */
  striped?: boolean;
  /**
   * Draws the cells clear of the edges, for a table set inside a Card or
   * Frame panel, whose edge the first and last columns would otherwise touch.
   */
  framed?: boolean;
  /**
   * The tallest the table gets before its body scrolls, with the header
   * pinned above. Any CSS length.
   */
  maxHeight?: CSSProperties['maxHeight'];
  /** Classes for the scrolling box around the table, rather than the table. */
  containerClassName?: string;
}

/** The table, in a box that scrolls when the table is wider or taller than it. */
function TableRoot({
  density = 'comfortable',
  striped = false,
  framed = false,
  maxHeight,
  containerClassName,
  className,
  render,
  ...props
}: TableProps & RenderProp<'table'>) {
  const slots = tableVariants();
  const element = useRender({
    defaultTagName: 'table',
    render,
    props: mergeProps({ 'data-slot': 'table', className: slots.table({ className }) }, props),
  });
  return (
    <div
      data-slot="table-container"
      data-density={density}
      data-striped={striped ? '' : undefined}
      data-framed={framed ? '' : undefined}
      data-sticky={maxHeight != null ? '' : undefined}
      className={slots.container({ className: containerClassName })}
      style={maxHeight != null ? { maxHeight } : undefined}
    >
      {element}
    </div>
  );
}
TableRoot.displayName = 'Table';

/** The header row group. Pinned while the body scrolls, when the table has a `maxHeight`. */
function TableHeader({ className, render, ...props }: ComponentProps<'thead'> & RenderProp<'thead'>) {
  const slots = tableVariants();
  return useRender({
    defaultTagName: 'thead',
    render,
    props: mergeProps(
      {
        'data-slot': 'table-header',
        className: slots.header({
          className: [
            'in-data-[sticky]:sticky in-data-[sticky]:top-0 in-data-[sticky]:z-10 in-data-[sticky]:bg-background',
            className,
          ],
        }),
      },
      props
    ),
  });
}
TableHeader.displayName = 'Table.Header';

/** The rows of data. */
function TableBody({ className, render, ...props }: ComponentProps<'tbody'> & RenderProp<'tbody'>) {
  return useRender({
    defaultTagName: 'tbody',
    render,
    props: mergeProps(
      {
        'data-slot': 'table-body',
        className: tableVariants().body({
          className: ['in-data-[striped]:[&>tr:nth-child(even)]:bg-muted/40', className],
        }),
      },
      props
    ),
  });
}
TableBody.displayName = 'Table.Body';

/** Totals under the body. */
function TableFooter({ className, render, ...props }: ComponentProps<'tfoot'> & RenderProp<'tfoot'>) {
  return useRender({
    defaultTagName: 'tfoot',
    render,
    props: mergeProps({ 'data-slot': 'table-footer', className: tableVariants().footer({ className }) }, props),
  });
}
TableFooter.displayName = 'Table.Footer';

/** One row. `aria-selected` shades it as chosen. */
function TableRow({ className, render, ...props }: ComponentProps<'tr'> & RenderProp<'tr'>) {
  return useRender({
    defaultTagName: 'tr',
    render,
    props: mergeProps({ 'data-slot': 'table-row', className: tableVariants().row({ className }) }, props),
  });
}
TableRow.displayName = 'Table.Row';

export interface TableHeadProps extends Omit<ComponentProps<'th'>, 'align'> {
  /** Where the column's content sits. `end` for numbers. Default `start`. */
  align?: TableAlign;
}

/** A column's heading. */
function TableHead({ align = 'start', className, render, ...props }: TableHeadProps & RenderProp<'th'>) {
  return useRender({
    defaultTagName: 'th',
    render,
    props: mergeProps(
      {
        'data-slot': 'table-head',
        scope: 'col',
        className: tableVariants({ align }).head({ className: ['in-data-[density=compact]:h-8', className] }),
      },
      props
    ),
  });
}
TableHead.displayName = 'Table.Head';

export interface TableCellProps extends Omit<ComponentProps<'td'>, 'align'> {
  /** Where the content sits. Match the column's head. `end` also gives the digits equal widths. Default `start`. */
  align?: TableAlign;
}

/** One cell. */
function TableCell({ align = 'start', className, render, ...props }: TableCellProps & RenderProp<'td'>) {
  return useRender({
    defaultTagName: 'td',
    render,
    props: mergeProps(
      {
        'data-slot': 'table-cell',
        className: tableVariants({ align }).cell({
          className: ['py-3 in-data-[density=compact]:py-1.5', className],
        }),
      },
      props
    ),
  });
}
TableCell.displayName = 'Table.Cell';

/** What the table is, under it. Read first by a screen reader. */
function TableCaption({ className, render, ...props }: ComponentProps<'caption'> & RenderProp<'caption'>) {
  return useRender({
    defaultTagName: 'caption',
    render,
    props: mergeProps({ 'data-slot': 'table-caption', className: tableVariants().caption({ className }) }, props),
  });
}
TableCaption.displayName = 'Table.Caption';

export const Table = Object.assign(TableRoot, {
  Header: TableHeader,
  Body: TableBody,
  Footer: TableFooter,
  Row: TableRow,
  Head: TableHead,
  Cell: TableCell,
  Caption: TableCaption,
});

export { TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption };
