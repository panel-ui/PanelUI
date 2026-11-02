'use client';

import { useEffect } from 'react';
import { Toast, useToast } from 'panelui-web/toast';

function Raise() {
  const toast = useToast();
  useEffect(() => {
    const id = toast.add({ title: 'Recipe published', description: 'Live on your page.', type: 'success', timeout: 0 });
    return () => toast.close(id);
    // Once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function ToastThumb() {
  return (
    <div className="w-[22rem] shrink-0 scale-[0.8]">
      <Toast.Provider inline>
        <Raise />
      </Toast.Provider>
    </div>
  );
}
