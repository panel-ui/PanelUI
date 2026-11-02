'use client';

import { Button } from 'panelui-web/button';
import { Toast, useToast, type ToastEffect } from 'panelui-web/toast';

const EFFECTS: { effect: ToastEffect; title: string; type: 'success' | 'info' | 'warning' | 'destructive' }[] = [
  { effect: 'type', title: 'Typed through dither', type: 'info' },
  { effect: 'materialize', title: 'Card first, then words', type: 'success' },
  { effect: 'timer', title: 'Timed by a dither bar', type: 'destructive' },
];

function Each() {
  const toast = useToast();
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {EFFECTS.map(({ effect, title, type }) => (
        <Button key={effect} variant="outline" size="sm" onClick={() => toast.add({ title, type, data: { effect } })}>
          {effect}
        </Button>
      ))}
    </div>
  );
}

export default function ToastMixed() {
  return (
    <Toast.Provider>
      <Each />
    </Toast.Provider>
  );
}
