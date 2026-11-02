import { Badge } from 'panelui-web/badge';

export default function BadgeOverview() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Badge>New</Badge>
      <Badge variant="secondary">Draft</Badge>
      <Badge variant="outline">v2.4</Badge>
      <Badge variant="success" dot>
        Paid
      </Badge>
      <Badge variant="info" dot="pulse">
        Syncing
      </Badge>
      <Badge variant="warning" dot>
        Due Friday
      </Badge>
      <Badge variant="destructive" dot>
        Overdue
      </Badge>
    </div>
  );
}
