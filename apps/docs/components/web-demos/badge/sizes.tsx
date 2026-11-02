import { Badge } from 'panelui-web/badge';

export default function BadgeSizes() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Badge size="sm" variant="secondary">
        Small
      </Badge>
      <Badge size="md" variant="secondary">
        Medium
      </Badge>
      <Badge size="lg" variant="secondary">
        Large
      </Badge>
    </div>
  );
}
