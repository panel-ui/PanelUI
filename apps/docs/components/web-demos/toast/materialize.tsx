'use client';

import { Button } from 'panelui-web/button';
import { Toast, useToast } from 'panelui-web/toast';

function Copy() {
  const toast = useToast();
  return (
    <Button
      variant="outline"
      onClick={() =>
        toast.add({ title: 'Link copied', description: 'Anyone with the link can view the board.', type: 'info' })
      }
    >
      Copy share link
    </Button>
  );
}

export default function ToastMaterialize() {
  return (
    <Toast.Provider effect="materialize">
      <Copy />
    </Toast.Provider>
  );
}
