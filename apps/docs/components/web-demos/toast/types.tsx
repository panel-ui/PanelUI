'use client';

import { Button } from 'panelui-web/button';
import { Toast, useToast, type ToastType } from 'panelui-web/toast';

const KINDS: { type: ToastType; title: string; description: string }[] = [
  { type: 'default', title: 'Draft saved', description: 'Saved to Recipes, 2 minutes ago.' },
  { type: 'success', title: 'Payment received', description: '£42.00 from Harbour Bakery.' },
  { type: 'info', title: 'New version ready', description: 'Reload to get the latest editor.' },
  { type: 'warning', title: 'Storage nearly full', description: '9.4 of 10 GB used.' },
  { type: 'destructive', title: 'Card declined', description: 'Your bank refused the charge.' },
];

function Kinds() {
  const toast = useToast();
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {KINDS.map((kind) => (
        <Button key={kind.type} variant="outline" size="sm" onClick={() => toast.add(kind)}>
          {kind.type}
        </Button>
      ))}
    </div>
  );
}

export default function ToastTypes() {
  return (
    <Toast.Provider>
      <Kinds />
    </Toast.Provider>
  );
}
