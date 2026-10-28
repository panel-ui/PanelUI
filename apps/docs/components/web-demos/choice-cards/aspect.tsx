'use client';

import { useState } from 'react';
import { ChoiceCards } from 'panelui-web/choice-cards';

const RATIOS = [
  { value: '16:9', label: 'Widescreen', width: 16, height: 9 },
  { value: '4:5', label: 'Portrait post', width: 4, height: 5 },
  { value: '1:1', label: 'Square', width: 1, height: 1 },
  { value: '9:16', label: 'Story', width: 9, height: 16 },
];

export default function ChoiceCardsAspect() {
  const [ratio, setRatio] = useState('16:9');
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <ChoiceCards value={ratio} onValueChange={setRatio} aria-label="Canvas size" aspect="1 / 1">
        {RATIOS.map(({ value, label, width, height }) => {
          const scale = 50 / Math.max(width, height);
          return (
            <ChoiceCards.Item key={value} value={value}>
              <ChoiceCards.Media>
                <span
                  className="rounded-md border-2 border-current bg-current/10"
                  style={{ width: width * scale, height: height * scale }}
                />
              </ChoiceCards.Media>
              <ChoiceCards.Label>{label}</ChoiceCards.Label>
              <ChoiceCards.Description className="tabular-nums">{value}</ChoiceCards.Description>
            </ChoiceCards.Item>
          );
        })}
      </ChoiceCards>
    </div>
  );
}
