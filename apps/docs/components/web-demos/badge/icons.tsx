import { Badge } from 'panelui-web/badge';
import { LeafIcon, LockIcon, SparklesIcon } from 'lucide-react';

export default function BadgeIcons() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Badge variant="outline">
        <LockIcon />
        Private
      </Badge>
      <Badge variant="success">
        <LeafIcon />
        Low carbon
      </Badge>
      <Badge>
        <SparklesIcon />
        Pro
      </Badge>
    </div>
  );
}
