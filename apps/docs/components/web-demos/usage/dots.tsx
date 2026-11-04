'use client';

import { Usage } from 'panelui-web/usage';

const CONTEXT = [
  { label: 'Instructions', value: 6_100 },
  { label: 'Attached PDF', value: 52_300 },
  { label: 'Conversation', value: 39_900 },
];

export default function UsageDots() {
  return (
    <Usage limit={128_000} segments={CONTEXT}>
      <Usage.Trigger variant="dots" />
      <Usage.Content side="bottom" align="center">
        <Usage.Summary label="Reading “Lease agreement.pdf”" unit="tokens" />
        <Usage.Breakdown />
      </Usage.Content>
    </Usage>
  );
}
