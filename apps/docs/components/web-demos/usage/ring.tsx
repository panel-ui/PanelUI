'use client';

import { Button } from 'panelui-web/button';
import { Usage } from 'panelui-web/usage';

const CONTEXT = [
  { label: 'System prompt', value: 9_400 },
  { label: 'Tools', value: 16_200 },
  { label: 'Files', value: 41_800 },
  { label: 'Messages', value: 56_600 },
];

export default function UsageRing() {
  return (
    <Usage limit={200_000} segments={CONTEXT}>
      <Usage.Trigger />
      <Usage.Content side="right" align="center">
        <Usage.Summary label="Context window" unit="tokens" />
        <Usage.Breakdown />
        <Usage.Footer>
          Older messages are summarised at 90%.
          <Button size="sm" variant="outline">
            Compact now
          </Button>
        </Usage.Footer>
      </Usage.Content>
    </Usage>
  );
}
