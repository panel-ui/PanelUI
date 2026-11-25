import { BellIcon, CalendarPlusIcon, MapPinIcon, ReceiptIcon, SplitIcon, WalletIcon } from 'lucide-react';
import { TapMenu } from 'panelui-web/tap-menu';

export default function TapMenuSpotlight() {
  return (
    <TapMenu variant="spotlight">
      <TapMenu.Trigger aria-label="Add" className="size-11" />
      <TapMenu.Content>
        <TapMenu.Heading>Add to the house account</TapMenu.Heading>
        <TapMenu.Item icon={<ReceiptIcon />}>Expense</TapMenu.Item>
        <TapMenu.Item icon={<SplitIcon />}>Split</TapMenu.Item>
        <TapMenu.Item icon={<WalletIcon />}>Top up</TapMenu.Item>
        <TapMenu.Item icon={<CalendarPlusIcon />}>Repeat</TapMenu.Item>
        <TapMenu.Item icon={<MapPinIcon />}>Trip</TapMenu.Item>
        <TapMenu.Item icon={<BellIcon />}>Reminder</TapMenu.Item>
      </TapMenu.Content>
    </TapMenu>
  );
}
