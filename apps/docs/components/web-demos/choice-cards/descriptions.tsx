'use client';

import { ChoiceCards } from 'panelui-web/choice-cards';

const QUALITY = [
  { value: '720', label: 'Draft', size: '720p', description: 'About 40 MB. Quick to send for review.' },
  { value: '1080', label: 'Standard', size: '1080p', description: 'About 120 MB. Right for most sharing.' },
  { value: '2160', label: 'Master', size: '4K', description: 'About 620 MB. For editing elsewhere.' },
];

export default function ChoiceCardsDescriptions() {
  return (
    <ChoiceCards defaultValue="1080" aspect="5 / 2" color="info" aria-label="Export quality" className="max-w-lg">
      {QUALITY.map(({ value, label, size, description }) => (
        <ChoiceCards.Item key={value} value={value}>
          <ChoiceCards.Media>
            <span className="text-2xl font-semibold tracking-tight tabular-nums">{size}</span>
          </ChoiceCards.Media>
          <ChoiceCards.Label>{label}</ChoiceCards.Label>
          <ChoiceCards.Description>{description}</ChoiceCards.Description>
        </ChoiceCards.Item>
      ))}
    </ChoiceCards>
  );
}
