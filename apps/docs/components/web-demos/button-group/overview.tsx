import { ArchiveIcon, ClockIcon, FlagIcon } from 'lucide-react';
import { Button } from 'panelui-web/button';
import { ButtonGroup } from 'panelui-web/button-group';

export default function ButtonGroupOverview() {
  return (
    <ButtonGroup aria-label="Message actions">
      <Button variant="outline">
        <ArchiveIcon />
        Archive
      </Button>
      <Button variant="outline">
        <ClockIcon />
        Snooze
      </Button>
      <Button variant="outline">
        <FlagIcon />
        Report
      </Button>
    </ButtonGroup>
  );
}
