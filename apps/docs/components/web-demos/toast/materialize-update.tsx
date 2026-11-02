'use client';

import { Button } from 'panelui-web/button';
import { Toast, useToast, type ToastType } from 'panelui-web/toast';

const STEPS: { title: string; description: string; type: ToastType }[] = [
  { title: 'Uploading photos', description: '12 images from the shoot', type: 'loading' },
  { title: 'Building gallery', description: 'Making thumbnails and captions', type: 'loading' },
  { title: 'Gallery published', description: 'Live at larkspur.co/autumn', type: 'success' },
];

function Publish() {
  const toast = useToast();
  const run = () => {
    const [first, ...rest] = STEPS;
    const id = toast.add({ ...first!, timeout: 0 });
    rest.forEach((step, index) => {
      const last = index === rest.length - 1;
      setTimeout(() => toast.update(id, { ...step, timeout: last ? 4000 : 0 }), (index + 1) * 2200);
    });
  };
  return <Button onClick={run}>Publish gallery</Button>;
}

export default function ToastMaterializeUpdate() {
  return (
    <Toast.Provider effect="materialize">
      <Publish />
    </Toast.Provider>
  );
}
