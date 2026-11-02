'use client';

import { Chip } from 'panelui-web/chip';

export default function ChipColors() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Chip defaultPressed>Primary</Chip>
      <Chip defaultPressed color="success">
        In stock
      </Chip>
      <Chip defaultPressed color="info">
        Ships today
      </Chip>
      <Chip defaultPressed color="warning">
        On sale
      </Chip>
      <Chip defaultPressed color="destructive">
        Discontinued
      </Chip>
    </div>
  );
}
