'use client';

import { Usage } from 'panelui-web/usage';

export default function UsageGauge() {
  return (
    <Usage limit={100} value={64} label="Session">
      <Usage.Trigger variant="gauge" />
      <Usage.Content side="bottom" align="center">
        <Usage.Section title="Plan" aside="Team" className="border-t-0">
          <Usage.Meter label="This session" value={64} note="Resets in 2 h 14 min" />
          <Usage.Meter label="This week" value={38} note="Resets on Monday at 09:00" />
          <Usage.Meter label="Deep research" value={9} limit={10} display="9 of 10 runs" note="One run left this week" />
        </Usage.Section>
      </Usage.Content>
    </Usage>
  );
}
