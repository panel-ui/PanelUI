'use client';

import { Usage } from 'panelui-web/usage';

const CONTEXT = [
  { label: 'System prompt', value: 4_800 },
  { label: 'Repository map', value: 22_000 },
  { label: 'Open files', value: 37_500 },
  { label: 'Messages', value: 29_200 },
];

export default function UsagePill() {
  return (
    <Usage limit={128_000} segments={CONTEXT}>
      <Usage.Trigger variant="pill" />
      <Usage.Content side="bottom" align="center">
        <Usage.Summary label="Context" unit="tokens" />
        <Usage.Breakdown />
      </Usage.Content>
    </Usage>
  );
}
