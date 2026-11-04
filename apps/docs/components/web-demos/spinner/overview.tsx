import { Spinner } from 'panelui-web/spinner';

export default function SpinnerOverview() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-10 text-foreground">
      <Spinner variant="ring" size="lg" />
      <Spinner variant="spokes" size="lg" />
      <Spinner variant="dots" size="lg" />
      <Spinner variant="orbit" size="lg" />
      <Spinner variant="pulse" size="lg" />
      <Spinner variant="dither" size="lg" />
    </div>
  );
}
