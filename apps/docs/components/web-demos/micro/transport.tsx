'use client';

import { useEffect, useState } from 'react';
import { GoBackward15SecIcon, GoForward15SecIcon, PauseIcon, PlayIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Micro } from 'panelui-web/micro';

const LENGTH = 52 * 60 + 10;

function clock(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function MicroTransport() {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(18 * 60 + 42);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setTime((value) => Math.min(LENGTH, value + 1)), 1000);
    return () => window.clearInterval(timer);
  }, [playing]);

  return (
    <Micro>
      <Micro.Button aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying(!playing)}>
        <HugeiconsIcon icon={playing ? PauseIcon : PlayIcon} />
      </Micro.Button>
      <Micro.Button
        variant="ghost"
        aria-label="Back 15 seconds"
        onClick={() => setTime((value) => Math.max(0, value - 15))}
      >
        <HugeiconsIcon icon={GoBackward15SecIcon} />
      </Micro.Button>
      <Micro.Button
        variant="ghost"
        aria-label="Forward 15 seconds"
        onClick={() => setTime((value) => Math.min(LENGTH, value + 15))}
      >
        <HugeiconsIcon icon={GoForward15SecIcon} />
      </Micro.Button>
      <Micro.Separator />
      <span>
        <Micro.Mono>{clock(time)}</Micro.Mono> <Micro.Mono muted>/ {clock(LENGTH)}</Micro.Mono>
      </span>
    </Micro>
  );
}
