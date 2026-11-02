import { Label } from 'panelui-web/label';
import { Radio, RadioGroup } from 'panelui-web/radio-group';

export default function RadioGroupOverview() {
  return (
    <RadioGroup defaultValue="standard" aria-label="Delivery" className="w-full max-w-xs">
      <Label>
        <Radio value="standard" />
        <Label.Text>Standard</Label.Text>
        <Label.Action>3–5 days · Free</Label.Action>
      </Label>
      <Label>
        <Radio value="express" />
        <Label.Text>Express</Label.Text>
        <Label.Action>Next day · £6</Label.Action>
      </Label>
      <Label>
        <Radio value="collect" />
        <Label.Text>Collect in store</Label.Text>
        <Label.Action>Today · Free</Label.Action>
      </Label>
    </RadioGroup>
  );
}
