'use client';

import { Field } from 'panelui-web/field';
import { Label } from 'panelui-web/label';
import { Select } from 'panelui-web/select';
import { Switch } from 'panelui-web/switch';
import { Textarea } from 'panelui-web/textarea';

const ROOMS = [
  { value: 'studio', label: 'The studio' },
  { value: 'garden', label: 'Garden room' },
  { value: 'loft', label: 'Loft' },
];

export default function FieldControls() {
  return (
    <div className="flex w-full max-w-xs flex-col gap-5">
      <Field>
        <Field.Label>Room</Field.Label>
        <Select items={ROOMS} defaultValue="garden">
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {ROOMS.map((room) => (
              <Select.Item key={room.value} value={room.value}>
                {room.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </Field>
      <Field>
        <Field.Label>Notes for the host</Field.Label>
        <Textarea placeholder="Arriving by bike, is there a rack?" />
      </Field>
      <Field>
        <Field.Label>
          <Label.Text>Send me a reminder</Label.Text>
          <Label.Action>
            <Switch defaultChecked />
          </Label.Action>
        </Field.Label>
      </Field>
    </div>
  );
}
