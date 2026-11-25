'use client';

import { useState } from 'react';
import { Add01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Micro } from 'panelui-web/micro';

export default function MicroSegmentsDemo() {
  const [part, setPart] = useState('interview');
  return (
    <Micro>
      <Micro.Segments value={part} onValueChange={setPart} aria-label="Section">
        <Micro.Segment value="intro">Intro</Micro.Segment>
        <Micro.Segment value="interview">Interview</Micro.Segment>
        <Micro.Segment value="outro">Outro</Micro.Segment>
      </Micro.Segments>
      <Micro.Button variant="ghost" aria-label="Add a section">
        <HugeiconsIcon icon={Add01Icon} />
      </Micro.Button>
    </Micro>
  );
}
