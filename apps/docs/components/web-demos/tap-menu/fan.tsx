import { CameraIcon, FolderPlusIcon, ImageUpIcon, StickyNoteIcon } from 'lucide-react';
import { TapMenu } from 'panelui-web/tap-menu';

export default function TapMenuFan() {
  return (
    <div className="flex size-full items-end justify-end p-6">
      <TapMenu variant="fan">
        <TapMenu.Trigger aria-label="Add to album" className="size-12 shadow-md" />
        <TapMenu.Content>
          <TapMenu.Item icon={<CameraIcon />}>Take photo</TapMenu.Item>
          <TapMenu.Item icon={<ImageUpIcon />}>Upload</TapMenu.Item>
          <TapMenu.Item icon={<StickyNoteIcon />}>Add note</TapMenu.Item>
          <TapMenu.Item icon={<FolderPlusIcon />}>New album</TapMenu.Item>
        </TapMenu.Content>
      </TapMenu>
    </div>
  );
}
