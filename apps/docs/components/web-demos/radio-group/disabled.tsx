import { Label } from 'panelui-web/label';
import { Radio, RadioGroup } from 'panelui-web/radio-group';

export default function RadioGroupDisabled() {
  return (
    <RadioGroup defaultValue="eu" aria-label="Data region" className="w-full max-w-xs">
      <Label>
        <Radio value="eu" />
        <Label.Text>Europe</Label.Text>
      </Label>
      <Label>
        <Radio value="us" />
        <Label.Text>United States</Label.Text>
      </Label>
      <Label>
        <Radio value="apac" disabled />
        <Label.Text>Asia Pacific</Label.Text>
        <Label.Hint>Coming in spring</Label.Hint>
      </Label>
    </RadioGroup>
  );
}
