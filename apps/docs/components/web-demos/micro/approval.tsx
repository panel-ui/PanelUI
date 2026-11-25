import { Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Micro } from 'panelui-web/micro';

const PEOPLE = [
  { name: 'Khalid Abdi', src: 'https://avatars.githubusercontent.com/u/127331761?v=4' },
  { name: 'Ines Duarte' },
  { name: 'Sam Whitlock' },
];

export default function MicroApproval() {
  return (
    <Micro>
      <Micro.Faces people={PEOPLE} />
      <Micro.Label className="text-foreground">Approved</Micro.Label>
      <HugeiconsIcon icon={Tick02Icon} className="size-4 text-success-foreground" aria-hidden="true" />
    </Micro>
  );
}
