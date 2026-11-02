'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { Toast, useToast } from 'panelui-web/toast';

function Archive() {
  const toast = useToast();
  const [archived, setArchived] = useState(0);
  return (
    <div className="flex flex-col items-center gap-3">
      <Button
        variant="outline"
        onClick={() => {
          setArchived((count) => count + 1);
          const id = toast.add({
            title: 'Thread archived',
            description: 'Kitchen quote from Fen Lane',
            timeout: 6000,
            actionProps: {
              children: 'Undo',
              onClick: () => {
                setArchived((count) => count - 1);
                toast.close(id);
              },
            },
          });
        }}
      >
        Archive thread
      </Button>
      <p className="text-sm text-muted-foreground">Archived: {archived}</p>
    </div>
  );
}

export default function ToastAction() {
  return (
    <Toast.Provider>
      <Archive />
    </Toast.Provider>
  );
}
