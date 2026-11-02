import { Badge } from 'panelui-web/badge';
import { Table } from 'panelui-web/table';

const STOCK = [
  { sku: 'OAK-12', item: 'Oak board, 12mm', bin: 'A3', qty: 148, state: 'ok' },
  { sku: 'OAK-18', item: 'Oak board, 18mm', bin: 'A4', qty: 22, state: 'low' },
  { sku: 'ASH-18', item: 'Ash board, 18mm', bin: 'B1', qty: 0, state: 'out' },
  { sku: 'BIR-09', item: 'Birch ply, 9mm', bin: 'C2', qty: 310, state: 'ok' },
  { sku: 'BIR-15', item: 'Birch ply, 15mm', bin: 'C3', qty: 64, state: 'ok' },
  { sku: 'WAL-20', item: 'Walnut slab, 20mm', bin: 'D1', qty: 7, state: 'low' },
] as const;

const STATE = {
  ok: { label: 'In stock', variant: 'success' },
  low: { label: 'Low', variant: 'warning' },
  out: { label: 'Out', variant: 'destructive' },
} as const;

export default function TableDense() {
  return (
    <Table density="compact" striped className="min-w-md">
      <Table.Header>
        <Table.Row>
          <Table.Head>SKU</Table.Head>
          <Table.Head>Item</Table.Head>
          <Table.Head>Bin</Table.Head>
          <Table.Head align="end">Qty</Table.Head>
          <Table.Head align="end">Status</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {STOCK.map((row) => (
          <Table.Row key={row.sku}>
            <Table.Cell className="font-mono text-xs">{row.sku}</Table.Cell>
            <Table.Cell>{row.item}</Table.Cell>
            <Table.Cell className="text-muted-foreground">{row.bin}</Table.Cell>
            <Table.Cell align="end">{row.qty}</Table.Cell>
            <Table.Cell align="end">
              <Badge size="sm" variant={STATE[row.state].variant}>
                {STATE[row.state].label}
              </Badge>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
