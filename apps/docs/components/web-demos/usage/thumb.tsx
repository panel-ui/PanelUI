'use client';

import { Usage } from 'panelui-web/usage';

export default function UsageThumb() {
  return (
    <div className="flex items-center gap-3">
      <Usage limit={200_000} segments={[{ label: 'System prompt', value: 9_400 }, { label: 'Messages', value: 78_000 }]}>
        <Usage.Trigger />
      </Usage>
      <Usage limit={200_000} segments={[{ label: 'Files', value: 92_000 }, { label: 'Messages', value: 60_000 }]}>
        <Usage.Trigger variant="pill" />
      </Usage>
      <Usage limit={100} value={93} label="Session">
        <Usage.Trigger variant="gauge" />
      </Usage>
    </div>
  );
}
