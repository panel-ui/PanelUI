'use client';

import { Button } from 'panelui-web/button';
import { Toast, useToast } from 'panelui-web/toast';

function Publish() {
  const toast = useToast();
  return (
    <Button
      onClick={() =>
        toast.add({
          title: 'Recipe published',
          description: 'Slow-roast tomato soup is live on your page.',
          type: 'success',
        })
      }
    >
      Publish recipe
    </Button>
  );
}

export default function ToastOverview() {
  return (
    <Toast.Provider>
      <Publish />
    </Toast.Provider>
  );
}
