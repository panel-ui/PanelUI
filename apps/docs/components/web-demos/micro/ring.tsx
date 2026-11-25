import { Micro } from 'panelui-web/micro';

export default function MicroRingDemo() {
  return (
    <Micro>
      <Micro.Ring value={72} tone="info" label="Finish rate" />
      <Micro.Text value="72%" label="finish rate" />
    </Micro>
  );
}
