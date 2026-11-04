'use client';

import { Button } from 'panelui-web/button';
import { Usage } from 'panelui-web/usage';

const SPEND = [
  { label: 'Chat', value: 11.2 },
  { label: 'Image generation', value: 8.65 },
  { label: 'Batch jobs', value: 17.55 },
];

const DOLLARS: Intl.NumberFormatOptions = { style: 'currency', currency: 'USD', maximumFractionDigits: 2 };

export default function UsageBar() {
  return (
    <Usage limit={50} segments={SPEND} label="Credit" format={DOLLARS}>
      <Usage.Trigger variant="bar" />
      <Usage.Content side="bottom" align="center">
        <Usage.Summary label="Credit used in November" />
        <Usage.Breakdown freeLabel="Left" />
        <Usage.Footer>
          Renews on 1 December.
          <Button size="sm">Add credit</Button>
        </Usage.Footer>
      </Usage.Content>
    </Usage>
  );
}
