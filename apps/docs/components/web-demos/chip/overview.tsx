'use client';

import { Chip } from 'panelui-web/chip';

export default function ChipOverview() {
  return (
    <Chip.Group defaultValue={['vegetarian', 'quick']} aria-label="Filter recipes">
      <Chip value="vegetarian">Vegetarian</Chip>
      <Chip value="quick">Under 30 minutes</Chip>
      <Chip value="one-pot">One pot</Chip>
      <Chip value="freezer">Freezes well</Chip>
    </Chip.Group>
  );
}
