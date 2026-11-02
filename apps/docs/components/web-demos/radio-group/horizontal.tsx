import { Label } from 'panelui-web/label';
import { Radio, RadioGroup } from 'panelui-web/radio-group';

export default function RadioGroupHorizontal() {
  return (
    <RadioGroup orientation="horizontal" defaultValue="monthly" aria-label="Billing" className="gap-5">
      <Label className="w-auto">
        <Radio value="monthly" />
        <Label.Text>Monthly</Label.Text>
      </Label>
      <Label className="w-auto">
        <Radio value="yearly" />
        <Label.Text>Yearly</Label.Text>
      </Label>
    </RadioGroup>
  );
}
