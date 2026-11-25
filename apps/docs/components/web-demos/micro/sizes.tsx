import { Micro } from 'panelui-web/micro';

export default function MicroSizes() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Micro size="sm">
        <Micro.Ring value={64} label="Uploaded" />
        <Micro.Text value="64%" label="uploaded" />
      </Micro>
      <Micro>
        <Micro.Ring value={64} label="Uploaded" />
        <Micro.Text value="64%" label="uploaded" />
      </Micro>
    </div>
  );
}
