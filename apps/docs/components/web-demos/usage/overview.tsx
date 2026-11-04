'use client';

import { Usage, type UsageState } from 'panelui-web/usage';

/** One conversation at five points: not started, under way, getting full, nearly full, finished. */
const MOMENTS: { label: string; state: UsageState; segments: { label: string; value: number }[] }[] = [
  { label: 'New chat', state: 'idle', segments: [] },
  {
    label: 'Refactor auth',
    state: 'active',
    segments: [
      { label: 'System prompt', value: 9_400 },
      { label: 'Tools', value: 16_200 },
      { label: 'Messages', value: 58_000 },
    ],
  },
  {
    label: 'Migrate billing',
    state: 'active',
    segments: [
      { label: 'System prompt', value: 9_400 },
      { label: 'Files', value: 61_000 },
      { label: 'Messages', value: 84_000 },
    ],
  },
  {
    label: 'Audit logs',
    state: 'active',
    segments: [
      { label: 'System prompt', value: 9_400 },
      { label: 'Files', value: 92_000 },
      { label: 'Messages', value: 88_500 },
    ],
  },
  {
    label: 'Fix flaky test',
    state: 'done',
    segments: [
      { label: 'System prompt', value: 9_400 },
      { label: 'Messages', value: 31_000 },
    ],
  },
];

export default function UsageOverview() {
  return (
    <div className="flex items-center gap-3">
      {MOMENTS.map((moment) => (
        <Usage key={moment.label} limit={200_000} segments={moment.segments} state={moment.state}>
          <Usage.Trigger />
          <Usage.Content side="bottom" align="center">
            <Usage.Summary label={moment.label} unit="tokens" />
            <Usage.Breakdown />
          </Usage.Content>
        </Usage>
      ))}
    </div>
  );
}
