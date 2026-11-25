import {
  CalendarAdd01Icon,
  Invoice01Icon,
  Location01Icon,
  Notification01Icon,
  SplitIcon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { TapMenu } from 'panelui-web/tap-menu';

export default function TapMenuSpotlight() {
  return (
    <TapMenu variant="spotlight">
      <TapMenu.Trigger aria-label="Add" className="size-11" />
      <TapMenu.Content>
        <TapMenu.Heading>Add to the house account</TapMenu.Heading>
        <TapMenu.Item icon={<HugeiconsIcon icon={Invoice01Icon} />}>Expense</TapMenu.Item>
        <TapMenu.Item icon={<HugeiconsIcon icon={SplitIcon} />}>Split</TapMenu.Item>
        <TapMenu.Item icon={<HugeiconsIcon icon={Wallet01Icon} />}>Top up</TapMenu.Item>
        <TapMenu.Item icon={<HugeiconsIcon icon={CalendarAdd01Icon} />}>Repeat</TapMenu.Item>
        <TapMenu.Item icon={<HugeiconsIcon icon={Location01Icon} />}>Trip</TapMenu.Item>
        <TapMenu.Item icon={<HugeiconsIcon icon={Notification01Icon} />}>Reminder</TapMenu.Item>
      </TapMenu.Content>
    </TapMenu>
  );
}
