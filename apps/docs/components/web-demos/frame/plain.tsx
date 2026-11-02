import { Badge } from 'panelui-web/badge';
import { Card } from 'panelui-web/card';
import { Frame } from 'panelui-web/frame';

const SERVICES = [
  { name: 'API', region: 'Frankfurt', status: 'Operational' },
  { name: 'Dashboard', region: 'Frankfurt', status: 'Operational' },
  { name: 'Webhooks', region: 'Dublin', status: 'Degraded' },
];

export default function FramePlain() {
  return (
    <Card size="sm" className="w-full max-w-sm">
      <Card.Header>
        <Card.Title>System status</Card.Title>
        <Card.Description>Checked a minute ago</Card.Description>
      </Card.Header>
      {/* Held 8px off the card's edge, at the card's radius less that gap. */}
      <Card.Content className="px-2 pb-2">
        <Frame variant="plain">
          <Frame.Panel className="rounded-lg shadow-none">
            {SERVICES.map((service) => (
              <Frame.Row key={service.name} className="py-2.5">
                <Frame.Content>
                  <Frame.Title as="p">{service.name}</Frame.Title>
                  <Frame.Description>{service.region}</Frame.Description>
                </Frame.Content>
                <Frame.Actions>
                  <Badge variant={service.status === 'Operational' ? 'success' : 'warning'}>{service.status}</Badge>
                </Frame.Actions>
              </Frame.Row>
            ))}
          </Frame.Panel>
        </Frame>
      </Card.Content>
    </Card>
  );
}
