import { TapMenu } from 'panelui-web/tap-menu';

export default function TapMenuThumb() {
  return (
    <TapMenu>
      <TapMenu.Trigger aria-label="Create" tabIndex={-1} className="size-12" />
    </TapMenu>
  );
}
