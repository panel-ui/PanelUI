import { Table } from 'panelui-web/table';

export default function TableThumb() {
  return (
    <Table density="compact" className="w-56">
      <Table.Header>
        <Table.Row>
          <Table.Head>Item</Table.Head>
          <Table.Head align="end">Qty</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          <Table.Cell>Oak</Table.Cell>
          <Table.Cell align="end">148</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Birch</Table.Cell>
          <Table.Cell align="end">310</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  );
}
