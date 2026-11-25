import { Camera01Icon, FolderAddIcon, ImageUpload01Icon, StickyNote01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { TapMenu } from 'panelui-web/tap-menu';

export default function TapMenuFan() {
  return (
    <div className="flex size-full items-end justify-end p-6">
      <TapMenu variant="fan">
        <TapMenu.Trigger aria-label="Add to album" className="size-12 shadow-md" />
        <TapMenu.Content>
          <TapMenu.Item icon={<HugeiconsIcon icon={Camera01Icon} />}>Take photo</TapMenu.Item>
          <TapMenu.Item icon={<HugeiconsIcon icon={ImageUpload01Icon} />}>Upload</TapMenu.Item>
          <TapMenu.Item icon={<HugeiconsIcon icon={StickyNote01Icon} />}>Add note</TapMenu.Item>
          <TapMenu.Item icon={<HugeiconsIcon icon={FolderAddIcon} />}>New album</TapMenu.Item>
        </TapMenu.Content>
      </TapMenu>
    </div>
  );
}
