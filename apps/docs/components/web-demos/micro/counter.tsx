import { Clock01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Micro } from 'panelui-web/micro';

export default function MicroCounter() {
  return (
    <Micro>
      <HugeiconsIcon icon={Clock01Icon} className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <Micro.Mono>3,180</Micro.Mono>
      <Micro.Label>minutes left</Micro.Label>
    </Micro>
  );
}
