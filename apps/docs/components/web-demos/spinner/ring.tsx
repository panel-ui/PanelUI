import { Button } from 'panelui-web/button';
import { Spinner } from 'panelui-web/spinner';

export default function SpinnerRing() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-end gap-6 text-foreground">
        <Spinner size="sm" />
        <Spinner size="md" />
        <Spinner size="lg" />
        <Spinner className="size-9" />
      </div>
      <Button variant="outline" disabled>
        <Spinner size="sm" label="Exporting" />
        Exporting 3 of 12
      </Button>
    </div>
  );
}
