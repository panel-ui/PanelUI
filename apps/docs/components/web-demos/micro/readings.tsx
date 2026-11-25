import { Micro } from 'panelui-web/micro';

export default function MicroReadings() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Micro>
        <Micro.Text value="1,284" label="sign-ups · 7 days" />
        <Micro.Spark values={[12, 15, 11, 18, 21, 19, 26]} tone="success" />
        <Micro.Delta value={18} />
      </Micro>
      <Micro>
        <Micro.Pulse tone="warning" />
        <Micro.Mono>412 ms</Micro.Mono>
        <Micro.Delta value={9} unit=" ms" inverted />
      </Micro>
      <Micro>
        <Micro.Ring value={38} tone="warning" label="Storage used" />
        <Micro.Text value="38 GB" label="of 100 GB" />
      </Micro>
    </div>
  );
}
