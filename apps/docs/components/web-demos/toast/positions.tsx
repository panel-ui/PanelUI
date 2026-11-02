'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { Toast, useToast, type ToastPosition } from 'panelui-web/toast';

const POSITIONS: ToastPosition[] = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];

function Corner({ onPick }: { onPick: (position: ToastPosition) => void }) {
  const toast = useToast();
  return (
    <div className="grid grid-cols-3 gap-2">
      {POSITIONS.map((position) => (
        <Button
          key={position}
          variant="outline"
          size="sm"
          onClick={() => {
            onPick(position);
            toast.add({ title: `Pinned ${position.replace('-', ' ')}`, type: 'info' });
          }}
        >
          {position}
        </Button>
      ))}
    </div>
  );
}

export default function ToastPositions() {
  const [position, setPosition] = useState<ToastPosition>('bottom-right');
  return (
    <Toast.Provider position={position}>
      <Corner onPick={setPosition} />
    </Toast.Provider>
  );
}
