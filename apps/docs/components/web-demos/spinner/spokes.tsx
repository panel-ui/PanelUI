import { Spinner } from 'panelui-web/spinner';

export default function SpinnerSpokes() {
  return (
    <p className="flex items-center gap-2.5 text-sm text-muted-foreground">
      <Spinner variant="spokes" label="Syncing" />
      Syncing library, <span className="tabular-nums">214 of 380</span> photos
    </p>
  );
}
