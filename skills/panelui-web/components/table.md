# Table

Rows of records with the same columns, with numbers aligned and a header that stays pinned.

```tsx
import { Table } from "@/components/panelui/table"
```

From npm the path is `panelui-web/table`. Install with `npx shadcn@latest add @panelui/table`.

## When to use it

Use a table for records that share the same columns and are compared down a column: invoices, stock, readings.

For a list of things with one or two details each, [Frame](/docs/web/components/frame) rows read better on a narrow screen.

A table wider than its container scrolls sideways inside its own box.

## Usage

```tsx
<Table>
  <Table.Header>
    <Table.Row>
      <Table.Head>Invoice</Table.Head>
      <Table.Head align="end">Amount</Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    <Table.Row>
      <Table.Cell>INV-2041</Table.Cell>
      <Table.Cell align="end">£1,280.00</Table.Cell>
    </Table.Row>
  </Table.Body>
</Table>
```

## Parts

```tsx
<Table>
  <Table.Caption />
  <Table.Header>
    <Table.Row>
      <Table.Head />
    </Table.Row>
  </Table.Header>
  <Table.Body>
    <Table.Row>
      <Table.Cell />
    </Table.Row>
  </Table.Body>
  <Table.Footer />
</Table>
```

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `TableProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `density` | `TableDensity` | `'comfortable'` | Row height. `compact` for a dense screen. Default `comfortable`. |
| `striped` | `boolean` | `false` | Shades every other body row. |
| `framed` | `boolean` | `false` | Draws the cells clear of the edges, for a table set inside a Card or Frame panel, whose edge the first and last columns would otherwise touch. |
| `maxHeight` | `CSSProperties['maxHeight']` | — | The tallest the table gets before its body scrolls, with the header pinned above. Any CSS length. |
| `containerClassName` | `string` | — | Classes for the scrolling box around the table, rather than the table. |

#### `TableHeadProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `align` | `TableAlign` | `start` | Where the column's content sits. `end` for numbers. Default `start`. |

#### `TableCellProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `align` | `TableAlign` | `start` | Where the content sits. Match the column's head. `end` also gives the digits equal widths. Default `start`. |

## In a Server Component

`Table` is a client component. A Server Component cannot read `Table.Header` off the import, so import each part by name: `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`.

## Notes

#### Numbers

`align="end"` on a column's head and cells right-aligns it and gives the digits equal widths, so amounts line up on their last digit. Set it on both.

#### Accessibility

Every part is the native table element, and `Table.Head` has `scope="col"`, so a screen reader announces each cell's column. `Table.Caption` names the table.

## Example

```tsx
import { Table } from '@/components/panelui/table';

const INVOICES = [
  { id: 'INV-2041', client: 'Larkspur Joinery', due: '4 Nov', amount: '£1,280.00' },
  { id: 'INV-2042', client: 'Harbour Bakery', due: '9 Nov', amount: '£312.50' },
  { id: 'INV-2043', client: 'Northgate Clinic', due: '12 Nov', amount: '£4,906.00' },
  { id: 'INV-2044', client: 'Fen Lane Cycles', due: '20 Nov', amount: '£86.40' },
];

export default function TableOverview() {
  return (
    <Table className="min-w-md">
      <Table.Header>
        <Table.Row>
          <Table.Head>Invoice</Table.Head>
          <Table.Head>Client</Table.Head>
          <Table.Head>Due</Table.Head>
          <Table.Head align="end">Amount</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {INVOICES.map((invoice) => (
          <Table.Row key={invoice.id}>
            <Table.Cell className="font-medium">{invoice.id}</Table.Cell>
            <Table.Cell>{invoice.client}</Table.Cell>
            <Table.Cell className="text-muted-foreground">{invoice.due}</Table.Cell>
            <Table.Cell align="end">{invoice.amount}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
```
