'use client';

import { Steps } from 'panelui-web/steps';

const STOPS = ['Choose files', 'Upload', 'Process', 'Done'];

export default function StepsLoading() {
  return (
    <Steps defaultValue={1} className="max-w-xl">
      {STOPS.map((title, at) => (
        <Steps.Item key={title} step={at} loading={at === 1}>
          <Steps.Trigger>
            <Steps.Indicator />
            <Steps.Title>{title}</Steps.Title>
            <Steps.Description>
              {at === 0 ? '3 files' : at === 1 ? 'Uploading 12 of 38' : at === 2 ? 'Not started' : '—'}
            </Steps.Description>
          </Steps.Trigger>
        </Steps.Item>
      ))}
    </Steps>
  );
}
