'use client';

import { useEffect, useState } from 'react';
import { PauseIcon, PlayIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Micro } from 'panelui-web/micro';

export default function MicroProgressDemo() {
  const [running, setRunning] = useState(true);
  const [done, setDone] = useState(5);
  const finished = done >= 12;

  useEffect(() => {
    if (!running || finished) return;
    const timer = window.setTimeout(() => setDone((value) => value + 1), 1500);
    return () => window.clearTimeout(timer);
  }, [running, finished, done]);

  return (
    <Micro className="w-64">
      <Micro.Progress
        label={finished ? 'Exported' : 'Exporting'}
        value={done}
        max={12}
        tone="info"
        className="flex-1"
      />
      <Micro.Button
        aria-label={finished ? 'Export again' : running ? 'Pause export' : 'Resume export'}
        onClick={() => (finished ? setDone(0) : setRunning(!running))}
      >
        <HugeiconsIcon icon={finished ? Tick02Icon : running ? PauseIcon : PlayIcon} />
      </Micro.Button>
    </Micro>
  );
}
