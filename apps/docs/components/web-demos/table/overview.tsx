import { Table } from 'panelui-web/table';

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
