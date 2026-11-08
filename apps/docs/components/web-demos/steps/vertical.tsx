'use client';

import { Steps } from 'panelui-web/steps';

const STOPS = [
  { title: 'Order placed', description: '14 March, 09:12' },
  { title: 'Packed', description: '14 March, 16:40' },
  { title: 'On its way', description: 'Out for delivery today' },
  { title: 'Delivered', description: 'Signature required' },
];

export default function StepsVertical() {
  return (
    <Steps defaultValue={2} orientation="vertical" className="max-w-sm">
      {STOPS.map((stop, at) => (
        <Steps.Item key={stop.title} step={at}>
          <Steps.Trigger>
            <Steps.Indicator />
            <Steps.Title>{stop.title}</Steps.Title>
            <Steps.Description>{stop.description}</Steps.Description>
          </Steps.Trigger>
        </Steps.Item>
      ))}
    </Steps>
  );
}
