import { CalendarPlusIcon, FileTextIcon, SparklesIcon, UserPlusIcon } from 'lucide-react';
import { TapMenu } from 'panelui-web/tap-menu';

export default function TapMenuOverview() {
  return (
    <TapMenu>
      <TapMenu.Trigger aria-label="Create" />
      <TapMenu.Content align="center">
        <TapMenu.Item icon={<CalendarPlusIcon />}>Book a session</TapMenu.Item>
        <TapMenu.Item icon={<FileTextIcon />}>Send a quote</TapMenu.Item>
        <TapMenu.Item icon={<UserPlusIcon />}>Add a client</TapMenu.Item>
        <TapMenu.Item icon={<SparklesIcon />}>Plan with AI</TapMenu.Item>
      </TapMenu.Content>
    </TapMenu>
  );
}
