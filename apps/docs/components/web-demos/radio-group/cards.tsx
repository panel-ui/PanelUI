import { RadioGroup } from 'panelui-web/radio-group';

const PLANS = [
  { value: 'hobby', title: 'Hobby', description: 'One project, community support', price: 'Free' },
  { value: 'studio', title: 'Studio', description: 'Ten projects, custom domains', price: '£12/mo' },
  { value: 'agency', title: 'Agency', description: 'Unlimited projects, client handover', price: '£39/mo' },
];

export default function RadioGroupCards() {
  return (
    <RadioGroup defaultValue="studio" aria-label="Plan" className="w-full max-w-sm">
      {PLANS.map((plan) => (
        <RadioGroup.Card key={plan.value} value={plan.value}>
          <RadioGroup.CardBody>
            <RadioGroup.CardTitle>{plan.title}</RadioGroup.CardTitle>
            <RadioGroup.CardDescription>{plan.description}</RadioGroup.CardDescription>
          </RadioGroup.CardBody>
          <RadioGroup.CardAside>{plan.price}</RadioGroup.CardAside>
        </RadioGroup.Card>
      ))}
    </RadioGroup>
  );
}
