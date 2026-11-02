'use client';

import { Button } from 'panelui-web/button';
import { Toast, useToast } from 'panelui-web/toast';

function exportReport(fail: boolean) {
  return new Promise<number>((resolve, reject) =>
    setTimeout(() => (fail ? reject(new Error('Timed out')) : resolve(48)), 2200)
  );
}

function Export() {
  const toast = useToast();
  const run = (fail: boolean) =>
    toast
      .promise(exportReport(fail), {
        loading: 'Exporting October',
        success: (pages) => ({ title: 'Report exported', description: `${pages} pages, saved to Downloads.` }),
        error: { title: 'Export failed', description: 'The server took too long. Try again in a minute.' },
      })
      .catch(() => {});
  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => run(false)}>
        Export report
      </Button>
      <Button variant="ghost" onClick={() => run(true)}>
        Export, and fail
      </Button>
    </div>
  );
}

export default function ToastPromise() {
  return (
    <Toast.Provider>
      <Export />
    </Toast.Provider>
  );
}
