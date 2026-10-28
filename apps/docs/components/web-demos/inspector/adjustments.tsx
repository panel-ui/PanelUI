'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { Inspector } from 'panelui-web/inspector';
import { Slider } from 'panelui-web/slider';

const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}`;

const LIGHT = { exposure: 0, contrast: 0, highlights: 0, shadows: 0 };
const COLOUR = { warmth: 0, tint: 0, vibrance: 0 };

export default function InspectorAdjustments() {
  const [light, setLight] = useState({ ...LIGHT, exposure: 12, shadows: 28 });
  const [colour, setColour] = useState({ ...COLOUR, warmth: 18 });
  const row = <T extends Record<string, number>>(values: T, set: (next: T) => void, key: keyof T & string, color?: 'warning' | 'success' | 'info') => (
    <Slider
      key={key}
      label={key[0]!.toUpperCase() + key.slice(1)}
      origin="center"
      min={-100}
      max={100}
      value={values[key]!}
      onValueChange={(value) => set({ ...values, [key]: value })}
      format={signed}
      color={color}
    />
  );
  const untouched = (values: Record<string, number>) => Object.values(values).every((value) => value === 0);

  return (
    <Inspector>
      <Inspector.Panel className="h-[26rem]">
        <Inspector.Section>
          <Inspector.SectionTitle>Light</Inspector.SectionTitle>
          <Inspector.SectionAction>
            <Button size="sm" variant="secondary" disabled={untouched(light)} onClick={() => setLight(LIGHT)}>
              Reset
            </Button>
          </Inspector.SectionAction>
          <Inspector.SectionContent>
            {(['exposure', 'contrast', 'highlights', 'shadows'] as const).map((key) => row(light, setLight, key))}
          </Inspector.SectionContent>
        </Inspector.Section>
        <Inspector.Separator />
        <Inspector.Section>
          <Inspector.SectionTitle>Colour</Inspector.SectionTitle>
          <Inspector.SectionAction>
            <Button size="sm" variant="secondary" disabled={untouched(colour)} onClick={() => setColour(COLOUR)}>
              Reset
            </Button>
          </Inspector.SectionAction>
          <Inspector.SectionContent>
            {row(colour, setColour, 'warmth', 'warning')}
            {row(colour, setColour, 'tint', 'success')}
            {row(colour, setColour, 'vibrance', 'info')}
          </Inspector.SectionContent>
        </Inspector.Section>
      </Inspector.Panel>
    </Inspector>
  );
}
