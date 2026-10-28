'use client';

import { ChoiceCards } from 'panelui-web/choice-cards';

const BACKGROUNDS = [
  { value: 'dusk', label: 'Dusk', image: 'linear-gradient(140deg, var(--chart-1), var(--chart-4))' },
  { value: 'lagoon', label: 'Lagoon', image: 'linear-gradient(140deg, var(--chart-2), var(--chart-3))' },
  { value: 'ember', label: 'Ember', image: 'radial-gradient(circle at 30% 20%, var(--chart-5), var(--chart-1) 70%)' },
  { value: 'mesh', label: 'Mesh', image: 'conic-gradient(from 200deg at 60% 40%, var(--chart-3), var(--chart-5), var(--chart-2), var(--chart-3))' },
  {
    value: 'none',
    label: 'None',
    image: 'repeating-conic-gradient(var(--muted) 0 25%, transparent 0 50%) 0 0 / 12px 12px',
  },
];

export default function ChoiceCardsBackgrounds() {
  return (
    <ChoiceCards defaultValue="lagoon" columns={5} aspect="1 / 1" aria-label="Background" className="max-w-lg">
      {BACKGROUNDS.map(({ value, label, image }) => (
        <ChoiceCards.Item key={value} value={value}>
          <ChoiceCards.Media>
            <span className="size-full" style={{ background: image }} />
          </ChoiceCards.Media>
          <ChoiceCards.Label>{label}</ChoiceCards.Label>
        </ChoiceCards.Item>
      ))}
    </ChoiceCards>
  );
}
