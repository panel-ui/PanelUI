import { Micro } from 'panelui-web/micro';

export default function MicroLive() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Micro>
        <Micro.Pulse tone="success" />
        <Micro.Mono>−14</Micro.Mono>
        <Micro.Label>LUFS</Micro.Label>
      </Micro>
      <Micro>
        <Micro.Pulse tone="warning" />
        <Micro.Mono>412 ms</Micro.Mono>
        <Micro.Delta value={9} unit=" ms" inverted />
      </Micro>
    </div>
  );
}
