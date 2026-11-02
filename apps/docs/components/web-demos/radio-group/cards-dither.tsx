import { RadioGroup } from 'panelui-web/radio-group';

const REGIONS = [
  { value: 'lhr', title: 'London', description: 'eu-west · 12 ms from you', latency: '12 ms' },
  { value: 'fra', title: 'Frankfurt', description: 'eu-central · 21 ms from you', latency: '21 ms' },
  { value: 'iad', title: 'Virginia', description: 'us-east · 78 ms from you', latency: '78 ms' },
];

export default function RadioGroupCardsDither() {
  return (
    <RadioGroup defaultValue="lhr" aria-label="Region" className="w-full max-w-sm">
      {REGIONS.map((region) => (
        <RadioGroup.Card key={region.value} value={region.value} appearance="dither" color="info">
          <RadioGroup.CardBody>
            <RadioGroup.CardTitle>{region.title}</RadioGroup.CardTitle>
            <RadioGroup.CardDescription>{region.description}</RadioGroup.CardDescription>
          </RadioGroup.CardBody>
        </RadioGroup.Card>
      ))}
    </RadioGroup>
  );
}
