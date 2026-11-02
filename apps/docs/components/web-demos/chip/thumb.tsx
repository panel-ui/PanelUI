'use client';

import { Chip } from 'panelui-web/chip';

export default function ChipThumb() {
  return (
    <Chip.Group defaultValue={['quick']} aria-label="Filter" className="justify-center">
      <Chip value="quick">Quick</Chip>
      <Chip value="easy">Easy</Chip>
    </Chip.Group>
  );
}
