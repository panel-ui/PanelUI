import { Checkbox } from 'panelui-web/checkbox';

export default function CheckboxThumb() {
  return (
    <div className="flex items-center gap-4">
      <Checkbox size="lg" label="Off" />
      <Checkbox size="lg" defaultChecked label="On" />
      <Checkbox size="lg" indeterminate label="Some" />
    </div>
  );
}
