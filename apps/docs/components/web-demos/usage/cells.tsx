'use client';

import { Usage } from 'panelui-web/usage';

const WHOLE: Intl.NumberFormatOptions = { maximumFractionDigits: 0 };

export default function UsageCells() {
  return (
    <Usage limit={200} value={183} label="Requests today" format={WHOLE}>
      <Usage.Trigger variant="cells" />
      <Usage.Content side="bottom" align="center">
        <Usage.Summary unit="requests" />
        <Usage.Section title="By key">
          <Usage.Meter label="Production" value={141} limit={160} />
          <Usage.Meter label="Staging" value={42} limit={40} display="42 / 40, over" note="Staging is rate-limited until midnight UTC" />
        </Usage.Section>
      </Usage.Content>
    </Usage>
  );
}
