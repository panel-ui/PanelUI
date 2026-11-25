import { ListChecksIcon, MicIcon, NotebookPenIcon, ScanLineIcon } from 'lucide-react';
import { TapMenu } from 'panelui-web/tap-menu';

export default function TapMenuStack() {
  return (
    <div className="flex size-full items-end justify-end p-6">
      <TapMenu variant="stack">
        <TapMenu.Trigger aria-label="New" className="size-11" />
        <TapMenu.Content>
          <TapMenu.Item icon={<NotebookPenIcon />} shortcut="⌘N">
            Note
          </TapMenu.Item>
          <TapMenu.Item icon={<ListChecksIcon />} shortcut="⌘L">
            Checklist
          </TapMenu.Item>
          <TapMenu.Item icon={<MicIcon />} shortcut="⌘R">
            Voice memo
          </TapMenu.Item>
          <TapMenu.Item icon={<ScanLineIcon />} shortcut="⌘D">
            Scan a page
          </TapMenu.Item>
        </TapMenu.Content>
      </TapMenu>
    </div>
  );
}
