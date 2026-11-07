'use client';

import { Steps } from 'panelui-web/steps';

const STOPS = ['Basket', 'Delivery', 'Payment', 'Review'];

export default function StepsOverview() {
  return (
    <Steps defaultValue={1} className="max-w-lg">
      {STOPS.map((title, at) => (
        <Steps.Item key={title} step={at}>
          <Steps.Trigger>
            <Steps.Indicator />
            <Steps.Title>{title}</Steps.Title>
          </Steps.Trigger>
        </Steps.Item>
      ))}
    </Steps>
  );
}
