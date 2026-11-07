'use client';

import { Steps } from 'panelui-web/steps';

const STOPS = [
  { title: 'Connect', description: 'Sign in to the repository' },
  { title: 'Configure', description: 'Choose the branch and the build' },
  { title: 'Deploy', description: 'Waiting for the first build' },
  { title: 'Verify', description: 'Check the live address' },
];

export default function StepsDescriptions() {
  return (
    <Steps defaultValue={1} className="max-w-2xl">
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
