'use client';

import { useState } from 'react';
import { Bookmark01Icon, Share08Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Micro } from 'panelui-web/micro';

export default function MicroActions() {
  const [saved, setSaved] = useState(false);
  return (
    <Micro>
      <Micro.Button variant="ghost" aria-label="Bookmark" aria-pressed={saved} onClick={() => setSaved(!saved)}>
        <HugeiconsIcon icon={Bookmark01Icon} />
      </Micro.Button>
      <Micro.Separator />
      <Micro.Button variant="ghost" aria-label="Share">
        <HugeiconsIcon icon={Share08Icon} />
      </Micro.Button>
    </Micro>
  );
}
