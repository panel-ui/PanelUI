'use client';

import { ChoiceCards } from 'panelui-web/choice-cards';

export default function ChoiceCardsThumb() {
  return (
    <ChoiceCards defaultValue="lagoon" aspect="1 / 1" aria-label="Background" className="w-64">
      {[
        ['dusk', 'linear-gradient(140deg, var(--chart-1), var(--chart-4))'],
        ['lagoon', 'linear-gradient(140deg, var(--chart-2), var(--chart-3))'],
        ['ember', 'radial-gradient(circle at 30% 20%, var(--chart-5), var(--chart-1) 70%)'],
      ].map(([value, image]) => (
        <ChoiceCards.Item key={value} value={value!}>
          <ChoiceCards.Media>
            <span className="size-full" style={{ background: image }} />
          </ChoiceCards.Media>
          <ChoiceCards.Label className="capitalize">{value}</ChoiceCards.Label>
        </ChoiceCards.Item>
      ))}
    </ChoiceCards>
  );
}
