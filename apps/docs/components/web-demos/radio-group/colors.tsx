import { Label } from 'panelui-web/label';
import { Radio, RadioGroup } from 'panelui-web/radio-group';

export default function RadioGroupColors() {
  return (
    <div className="flex flex-col gap-5">
      <RadioGroup orientation="horizontal" defaultValue="md" aria-label="Sizes" className="items-center gap-4">
        <Radio value="sm" size="sm" label="Small" />
        <Radio value="md" size="md" label="Medium" />
        <Radio value="lg" size="lg" label="Large" />
      </RadioGroup>
      <RadioGroup defaultValue="keep" aria-label="When the trial ends">
        <Label>
          <Radio value="keep" color="success" />
          <Label.Text>Keep my workspace</Label.Text>
        </Label>
        <Label>
          <Radio value="delete" color="destructive" />
          <Label.Text>Delete everything</Label.Text>
        </Label>
      </RadioGroup>
    </div>
  );
}
