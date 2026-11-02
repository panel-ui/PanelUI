'use client';

import { Button } from 'panelui-web/button';
import { Field } from 'panelui-web/field';
import { Label } from 'panelui-web/label';
import { Radio, RadioGroup } from 'panelui-web/radio-group';
import { Switch } from 'panelui-web/switch';
import { Textarea } from 'panelui-web/textarea';
import { Sheet } from 'panelui-web/sheet';

export default function SheetEvent() {
  return (
    <Sheet>
      <Sheet.Trigger render={<Button variant="outline" />}>Respond to invite</Sheet.Trigger>
      <Sheet.Content>
        <Sheet.Header
          title="Design critique"
          description="Thursday 22 October · 14:00–15:00"
        />
        <Sheet.Body className="flex flex-col gap-6">
          <RadioGroup defaultValue="going" aria-label="Your answer">
            <Label>
              <Radio value="going" />
              <Label.Text>Going</Label.Text>
            </Label>
            <Label>
              <Radio value="maybe" />
              <Label.Text>Maybe</Label.Text>
            </Label>
            <Label>
              <Radio value="declined" />
              <Label.Text>Can’t make it</Label.Text>
            </Label>
          </RadioGroup>
          <Field>
            <Field.Label>Note to Noor</Field.Label>
            <Textarea placeholder="Running ten minutes late, start without me." />
          </Field>
          <Label>
            <Label.Text>Remind me 15 minutes before</Label.Text>
            <Label.Action>
              <Switch defaultChecked />
            </Label.Action>
          </Label>
        </Sheet.Body>
        <Sheet.Footer>
          <Sheet.Close render={<Button size="lg" />}>Send answer</Sheet.Close>
          <Sheet.Close render={<Button size="lg" variant="ghost" />}>Cancel</Sheet.Close>
        </Sheet.Footer>
      </Sheet.Content>
    </Sheet>
  );
}
