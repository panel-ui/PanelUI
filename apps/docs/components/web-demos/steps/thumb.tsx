'use client';

import { Steps } from 'panelui-web/steps';

const STOPS = ['Draft', 'Review', 'Publish'];

export default function StepsThumb() {
  return (
    <Steps defaultValue={1} className="max-w-sm">
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
