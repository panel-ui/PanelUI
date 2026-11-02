import { RadioGroup } from 'panelui-web/radio-group';

const SLOTS = [
  { value: 'morning', title: 'Morning', description: '8:00 – 12:00', note: '3 left' },
  { value: 'afternoon', title: 'Afternoon', description: '12:00 – 17:00', note: '1 left' },
  { value: 'evening', title: 'Evening', description: '17:00 – 20:00', note: 'Full' },
];

export default function RadioGroupCardsFilled() {
  return (
    <RadioGroup defaultValue="morning" aria-label="Delivery slot" orientation="horizontal" className="grid w-full max-w-lg grid-cols-3">
      {SLOTS.map((slot) => (
        <RadioGroup.Card
          key={slot.value}
          value={slot.value}
          appearance="filled"
          color="success"
          disabled={slot.note === 'Full'}
          className="flex-col"
        >
          <RadioGroup.CardBody>
            <RadioGroup.CardTitle>{slot.title}</RadioGroup.CardTitle>
            <RadioGroup.CardDescription>{slot.description}</RadioGroup.CardDescription>
            <RadioGroup.CardDescription>{slot.note}</RadioGroup.CardDescription>
          </RadioGroup.CardBody>
        </RadioGroup.Card>
      ))}
    </RadioGroup>
  );
}
