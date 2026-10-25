'use client';

import { CalendarClockIcon, ChevronDownIcon, FileTextIcon, GitMergeIcon } from 'lucide-react';
import { Button } from 'panelui-web/button';
import { ButtonGroup } from 'panelui-web/button-group';
import { Menu } from 'panelui-web/menu';

export default function ButtonGroupSplit() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <ButtonGroup aria-label="Merge">
        <Button>
          <GitMergeIcon />
          Merge
        </Button>
        <ButtonGroup.Separator />
        <Menu>
          <Menu.Trigger render={<Button size="icon" aria-label="More ways to merge" />}>
            <ChevronDownIcon />
          </Menu.Trigger>
          <Menu.Content align="end">
            <Menu.Item>Squash and merge</Menu.Item>
            <Menu.Item>Rebase and merge</Menu.Item>
          </Menu.Content>
        </Menu>
      </ButtonGroup>
      <ButtonGroup aria-label="Publish">
        <Button variant="secondary">Publish</Button>
        <ButtonGroup.Separator />
        <Menu>
          <Menu.Trigger render={<Button variant="secondary" size="icon" aria-label="More ways to publish" />}>
            <ChevronDownIcon />
          </Menu.Trigger>
          <Menu.Content align="end">
            <Menu.Item>
              <CalendarClockIcon />
              Schedule
            </Menu.Item>
            <Menu.Item>
              <FileTextIcon />
              Save as draft
            </Menu.Item>
          </Menu.Content>
        </Menu>
      </ButtonGroup>
    </div>
  );
}
