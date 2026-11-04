import { Spinner } from 'panelui-web/spinner';

export default function SpinnerColours() {
  return (
    <div className="flex items-center gap-8">
      <Spinner size="lg" className="text-foreground" />
      <Spinner size="lg" className="text-muted-foreground" />
      <Spinner size="lg" className="text-info" />
      <Spinner size="lg" className="text-success" />
      <Spinner size="lg" className="text-warning" />
      <Spinner size="lg" className="text-destructive" />
    </div>
  );
}
