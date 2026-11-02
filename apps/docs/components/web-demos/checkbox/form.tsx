'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { Checkbox } from 'panelui-web/checkbox';
import { Field } from 'panelui-web/field';
import { Label } from 'panelui-web/label';

export default function CheckboxForm() {
  const [sent, setSent] = useState(false);
  return (
    <form
      className="flex w-full max-w-xs flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setSent(true);
      }}
    >
      <Field name="terms">
        <Field.Label>
          <Checkbox name="terms" required />
          <Label.Text>I have read the hire agreement</Label.Text>
        </Field.Label>
        <Field.Error match="valueMissing">Tick the box to book the van.</Field.Error>
      </Field>
      <Button type="submit">{sent ? 'Booked' : 'Book the van'}</Button>
    </form>
  );
}
