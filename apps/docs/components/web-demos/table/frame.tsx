import { Frame } from 'panelui-web/frame';
import { Table } from 'panelui-web/table';

const TEAM = [
  { name: 'Ife Adeyemi', role: 'Owner', seats: 'All projects', last: 'Now' },
  { name: 'Tomás Mendes', role: 'Editor', seats: '3 projects', last: '2 h ago' },
  { name: 'Hana Kato', role: 'Viewer', seats: '1 project', last: 'Yesterday' },
];

export default function TableFrame() {
  return (
    <Frame className="w-full max-w-lg">
      <Frame.Header>
        <Frame.Title>Members</Frame.Title>
        <Frame.Action>3 of 5 seats</Frame.Action>
      </Frame.Header>
      <Frame.Panel className="p-0">
        <Table framed>
          <Table.Header>
            <Table.Row>
              <Table.Head>Name</Table.Head>
              <Table.Head>Role</Table.Head>
              <Table.Head>Access</Table.Head>
              <Table.Head align="end">Last seen</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {TEAM.map((person) => (
              <Table.Row key={person.name}>
                <Table.Cell className="font-medium">{person.name}</Table.Cell>
                <Table.Cell>{person.role}</Table.Cell>
                <Table.Cell className="text-muted-foreground">{person.seats}</Table.Cell>
                <Table.Cell align="end" className="text-muted-foreground">
                  {person.last}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Frame.Panel>
    </Frame>
  );
}
