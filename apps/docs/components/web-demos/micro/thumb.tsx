import { Micro } from 'panelui-web/micro';

export default function MicroThumb() {
  return (
    <div className="flex scale-90 flex-col items-center gap-2" aria-hidden="true">
      <Micro size="sm">
        <Micro.Text value="12.4k" label="listens" />
        <Micro.Spark values={[4, 5, 4, 6, 7, 8, 11]} tone="info" height={16} />
        <Micro.Delta value={9} />
      </Micro>
      <Micro size="sm">
        <Micro.Ring value={72} tone="info" />
        <Micro.Text value="72%" label="finish rate" />
      </Micro>
    </div>
  );
}
