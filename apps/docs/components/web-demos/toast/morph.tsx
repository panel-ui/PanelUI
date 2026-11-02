'use client';

import { Button } from 'panelui-web/button';
import { Toast, useToast } from 'panelui-web/toast';

const STEPS = [
  { title: 'Building site', type: 'loading' },
  { title: 'Uploading assets', type: 'loading' },
  { title: 'Warming the cache', type: 'loading' },
  { title: 'Live on larkspur.co', type: 'success' },
] as const;

function Deploy() {
  const toast = useToast();
  const run = () => {
    const id = toast.add({ title: STEPS[0].title, type: STEPS[0].type, timeout: 0 });
    STEPS.slice(1).forEach((step, index) => {
      setTimeout(() => {
        const last = index === STEPS.length - 2;
        toast.update(id, { title: step.title, type: step.type, timeout: last ? 4000 : 0 });
      }, (index + 1) * 1600);
    });
  };
  return (
    <Button variant="outline" onClick={run}>
      Deploy
    </Button>
  );
}

export default function ToastMorph() {
  return (
    <Toast.Provider>
      <Deploy />
    </Toast.Provider>
  );
}
