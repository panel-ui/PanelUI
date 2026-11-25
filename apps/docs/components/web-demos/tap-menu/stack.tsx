import { CheckListIcon, Mic01Icon, NoteEditIcon, ScanTextIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { TapMenu } from 'panelui-web/tap-menu';

export default function TapMenuStack() {
  return (
    <div className="flex size-full items-end justify-end p-6">
      <TapMenu variant="stack">
        <TapMenu.Trigger aria-label="New" className="size-11" />
        <TapMenu.Content>
          <TapMenu.Item icon={<HugeiconsIcon icon={NoteEditIcon} />} shortcut="⌘N">
            Note
          </TapMenu.Item>
          <TapMenu.Item icon={<HugeiconsIcon icon={CheckListIcon} />} shortcut="⌘L">
            Checklist
          </TapMenu.Item>
          <TapMenu.Item icon={<HugeiconsIcon icon={Mic01Icon} />} shortcut="⌘R">
            Voice memo
          </TapMenu.Item>
          <TapMenu.Item icon={<HugeiconsIcon icon={ScanTextIcon} />} shortcut="⌘D">
            Scan a page
          </TapMenu.Item>
        </TapMenu.Content>
      </TapMenu>
    </div>
  );
}
