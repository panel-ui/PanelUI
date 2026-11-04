import { Spinner } from 'panelui-web/spinner';

export default function SpinnerThumb() {
  return (
    <div className="flex items-center gap-6 text-foreground">
      <Spinner size="lg" />
      <Spinner variant="orbit" size="lg" />
      <Spinner variant="dither" size="lg" />
    </div>
  );
}
