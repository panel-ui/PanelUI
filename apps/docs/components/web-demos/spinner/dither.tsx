import { Badge } from 'panelui-web/badge';
import { Spinner } from 'panelui-web/spinner';

export default function SpinnerDither() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Badge variant="info">
        <Spinner variant="dither" size="sm" label="Building" />
        Building
      </Badge>
      <Badge variant="outline">
        <Spinner variant="dither" size="sm" label="Queued" />
        Queued · 2 ahead
      </Badge>
    </div>
  );
}
