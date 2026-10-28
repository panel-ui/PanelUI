'use client';

import { ChoiceCards } from 'panelui-web/choice-cards';

/** Four pointer styles, drawn at the size a recording would show them. */
const POINTERS = [
  {
    value: 'arrow',
    label: 'Arrow',
    drawing: <path d="M14 10v26l7-6.5 4.5 10 4.5-2-4.5-9.5H35Z" />,
  },
  { value: 'dot', label: 'Dot', drawing: <circle cx="24" cy="24" r="7" /> },
  {
    value: 'halo',
    label: 'Halo',
    drawing: (
      <>
        <circle cx="24" cy="24" r="15" fillOpacity={0.22} stroke="none" />
        <circle cx="24" cy="24" r="6" />
      </>
    ),
  },
  {
    value: 'ring',
    label: 'Ring',
    drawing: (
      <>
        <circle cx="24" cy="24" r="11" fill="none" strokeWidth={3} className="stroke-current" />
        <circle cx="24" cy="24" r="2.5" />
      </>
    ),
  },
];

export default function ChoiceCardsOverview() {
  return (
    <ChoiceCards defaultValue="halo" aria-label="Pointer" className="max-w-md">
      {POINTERS.map(({ value, label, drawing }) => (
        <ChoiceCards.Item key={value} value={value}>
          <ChoiceCards.Media>
            <svg viewBox="0 0 48 48" className="size-12 fill-current stroke-background" strokeWidth={2}>
              {drawing}
            </svg>
          </ChoiceCards.Media>
          <ChoiceCards.Label>{label}</ChoiceCards.Label>
        </ChoiceCards.Item>
      ))}
    </ChoiceCards>
  );
}
