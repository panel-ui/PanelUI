import { Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Micro } from 'panelui-web/micro';

export default function MicroSearch() {
  return (
    <Micro className="w-80">
      <HugeiconsIcon icon={Search01Icon} className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <Micro.Input placeholder="Find a word in this episode" aria-label="Find in episode" />
      <Micro.Kbd>⌘F</Micro.Kbd>
    </Micro>
  );
}
