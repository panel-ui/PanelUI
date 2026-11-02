'use client';

import { useState } from 'react';
import { Checkbox } from 'panelui-web/checkbox';
import { Label } from 'panelui-web/label';

const ROOMS = [
  { value: 'kitchen', label: 'Kitchen lights' },
  { value: 'hall', label: 'Hallway lights' },
  { value: 'porch', label: 'Porch light' },
];

export default function CheckboxParent() {
  const [on, setOn] = useState(['hall']);
  return (
    <Checkbox.Group
      value={on}
      onValueChange={setOn}
      allValues={ROOMS.map((room) => room.value)}
      aria-labelledby="rooms-heading"
      className="w-full max-w-xs"
    >
      <Label id="rooms-heading">
        <Checkbox parent />
        <Label.Text>Turn off at midnight</Label.Text>
        <Label.Hint>
          {on.length} of {ROOMS.length}
        </Label.Hint>
      </Label>
      <div className="flex flex-col gap-3 ps-6">
        {ROOMS.map((room) => (
          <Label key={room.value}>
            <Checkbox value={room.value} />
            <Label.Text>{room.label}</Label.Text>
          </Label>
        ))}
      </div>
    </Checkbox.Group>
  );
}
