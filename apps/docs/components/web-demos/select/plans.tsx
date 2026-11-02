'use client';

import { Field } from 'panelui-web/field';
import { Select } from 'panelui-web/select';

const PLANS = [
  { value: 'solo', label: 'Solo', price: 'Free, one editor' },
  { value: 'team', label: 'Team', price: '$12 per editor a month' },
  { value: 'studio', label: 'Studio', price: '$29 per editor a month' },
  { value: 'enterprise', label: 'Enterprise', price: 'Priced with you' },
];

export default function SelectPlans() {
  return (
    <Field className="w-full max-w-xs">
      <Field.Label>Plan</Field.Label>
      <Select items={PLANS} defaultValue="team">
        <Select.Trigger>
          <Select.Value placeholder="Pick a plan" />
        </Select.Trigger>
        <Select.Content>
          {PLANS.map((plan) => (
            <Select.Item key={plan.value} value={plan.value} description={plan.price}>
              {plan.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
      <Field.Description>You can change plan at the end of any month.</Field.Description>
    </Field>
  );
}
