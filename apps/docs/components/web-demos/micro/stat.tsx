import { Micro } from 'panelui-web/micro';

export default function MicroStat() {
  return (
    <Micro>
      <Micro.Text value="12.4k" label="listens · 30 days" />
      <Micro.Spark values={[4, 5, 4, 6, 6, 7, 6, 8, 9, 11]} tone="info" />
      <Micro.Delta value={9} />
    </Micro>
  );
}
