import { Badge } from 'panelui-web/badge';
import { Card } from 'panelui-web/card';

function Report({ size }: { size: 'default' | 'sm' }) {
  return (
    <Card size={size} className="w-full max-w-64">
      <Card.Header>
        <Card.Title>Weekly report</Card.Title>
        <Card.Description>Sent every Monday at 09:00</Card.Description>
      </Card.Header>
      <Card.Content className="flex gap-1.5">
        <Badge variant="secondary">Revenue</Badge>
        <Badge variant="secondary">Churn</Badge>
      </Card.Content>
    </Card>
  );
}

export default function CardSizes() {
  return (
    <div className="flex w-full flex-wrap items-start justify-center gap-4">
      <Report size="default" />
      <Report size="sm" />
    </div>
  );
}
