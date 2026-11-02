'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { Field } from 'panelui-web/field';
import { Input } from 'panelui-web/input';

const TAKEN = ['studio', 'admin', 'larkspur'];

export default function FieldServer() {
  const [handle, setHandle] = useState('larkspur');
  const [checked, setChecked] = useState('larkspur');
  const taken = TAKEN.includes(checked.trim().toLowerCase());

  return (
    <form
      className="flex w-full max-w-xs flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setChecked(handle);
      }}
    >
      <Field invalid={taken}>
        <Field.Label>Workspace address</Field.Label>
        <Input value={handle} onChange={(event) => setHandle(event.target.value)} />
        <Field.Description>panel.so/{handle || 'your-name'}</Field.Description>
        <Field.Error>That address is taken. Try another.</Field.Error>
      </Field>
      <Button type="submit" variant="outline">
        Check it
      </Button>
    </form>
  );
}
