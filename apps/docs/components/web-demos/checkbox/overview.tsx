import { Checkbox } from 'panelui-web/checkbox';
import { Label } from 'panelui-web/label';

export default function CheckboxOverview() {
  return (
    <div className="flex w-full max-w-xs flex-col gap-3">
      <Label>
        <Checkbox defaultChecked />
        <Label.Text>Keep me signed in</Label.Text>
      </Label>
      <Label>
        <Checkbox />
        <Label.Text>Send me the monthly digest</Label.Text>
      </Label>
      <Label>
        <Checkbox disabled />
        <Label.Text>Share usage data</Label.Text>
        <Label.Hint>Admins only</Label.Hint>
      </Label>
    </div>
  );
}
