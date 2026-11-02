import { Checkbox } from 'panelui-web/checkbox';
import { Label } from 'panelui-web/label';

export default function CheckboxColors() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Checkbox size="sm" defaultChecked label="Small" />
        <Checkbox size="md" defaultChecked label="Medium" />
        <Checkbox size="lg" defaultChecked label="Large" />
        <Checkbox size="lg" indeterminate label="Some" />
      </div>
      <Label>
        <Checkbox color="success" defaultChecked />
        <Label.Text>Mark as reviewed</Label.Text>
      </Label>
      <Label>
        <Checkbox color="destructive" />
        <Label.Text>Delete the old exports too</Label.Text>
      </Label>
    </div>
  );
}
