'use client';

import { Button } from 'panelui-web/button';
import { Toast, useToast } from 'panelui-web/toast';

function Remind() {
  const toast = useToast();
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={() =>
          toast.add({ title: 'Message scheduled', description: 'Sends tomorrow at 9:00.', type: 'success', timeout: 6000 })
        }
      >
        Schedule message
      </Button>
      <Button
        variant="ghost"
        onClick={() => {
          const id = toast.add({ title: 'Reconnecting', description: 'Trying the server again.', type: 'loading', timeout: 0 });
          setTimeout(() => toast.update(id, { title: 'Back online', description: undefined, type: 'success', timeout: 3000 }), 3000);
        }}
      >
        Lose connection
      </Button>
    </div>
  );
}

export default function ToastTimer() {
  return (
    <Toast.Provider effect="timer">
      <Remind />
    </Toast.Provider>
  );
}
