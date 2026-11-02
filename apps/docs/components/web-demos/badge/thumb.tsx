import { Badge } from 'panelui-web/badge';

export default function BadgeThumb() {
  return (
    <div className="flex flex-col items-center gap-2">
      <Badge variant="success" dot size="lg">
        Paid
      </Badge>
      <Badge variant="info" dot="pulse" size="lg">
        Syncing
      </Badge>
    </div>
  );
}
