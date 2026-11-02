import { Radio, RadioGroup } from 'panelui-web/radio-group';

export default function RadioGroupThumb() {
  return (
    <RadioGroup orientation="horizontal" defaultValue="b" aria-label="Pick one" className="gap-4">
      <Radio value="a" size="lg" label="A" />
      <Radio value="b" size="lg" label="B" />
      <Radio value="c" size="lg" label="C" />
    </RadioGroup>
  );
}
