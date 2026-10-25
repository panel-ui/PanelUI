'use client';

import { MinusIcon, PlusIcon } from 'lucide-react';
import { Button } from 'panelui-web/button';
import { ButtonGroup } from 'panelui-web/button-group';
import { Input } from 'panelui-web/input';
import { useState } from 'react';

export default function ButtonGroupText() {
  const [seats, setSeats] = useState(4);
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4">
      <ButtonGroup aria-label="Site address" className="w-full">
        <ButtonGroup.Text>https://</ButtonGroup.Text>
        <Input placeholder="your-team" aria-label="Subdomain" />
        <ButtonGroup.Text>.panelui.dev</ButtonGroup.Text>
      </ButtonGroup>
      <ButtonGroup aria-label="Seats">
        <Button
          variant="outline"
          size="icon"
          aria-label="Remove a seat"
          disabled={seats <= 1}
          onClick={() => setSeats((n) => n - 1)}
        >
          <MinusIcon />
        </Button>
        <ButtonGroup.Text className="min-w-24 justify-center tabular-nums text-foreground" aria-live="polite">
          {seats} {seats === 1 ? 'seat' : 'seats'}
        </ButtonGroup.Text>
        <Button
          variant="outline"
          size="icon"
          aria-label="Add a seat"
          disabled={seats >= 20}
          onClick={() => setSeats((n) => n + 1)}
        >
          <PlusIcon />
        </Button>
      </ButtonGroup>
    </div>
  );
}
