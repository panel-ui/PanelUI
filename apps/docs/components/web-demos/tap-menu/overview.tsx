import { CalendarAdd01Icon, FileEditIcon, SparklesIcon, UserAdd01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { TapMenu } from 'panelui-web/tap-menu';

export default function TapMenuOverview() {
  return (
    <TapMenu>
      <TapMenu.Trigger aria-label="Create" />
      <TapMenu.Content align="center">
        <TapMenu.Item icon={<HugeiconsIcon icon={CalendarAdd01Icon} />}>Book a session</TapMenu.Item>
        <TapMenu.Item icon={<HugeiconsIcon icon={FileEditIcon} />}>Send a quote</TapMenu.Item>
        <TapMenu.Item icon={<HugeiconsIcon icon={UserAdd01Icon} />}>Add a client</TapMenu.Item>
        <TapMenu.Item icon={<HugeiconsIcon icon={SparklesIcon} />}>Plan with AI</TapMenu.Item>
      </TapMenu.Content>
    </TapMenu>
  );
}
