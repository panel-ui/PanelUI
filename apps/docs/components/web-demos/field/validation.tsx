'use client';

import { Button } from 'panelui-web/button';
import { Field } from 'panelui-web/field';
import { Input } from 'panelui-web/input';

export default function FieldValidation() {
  return (
    <form className="flex w-full max-w-xs flex-col gap-5" onSubmit={(event) => event.preventDefault()}>
      <Field name="email">
        <Field.Label required>Billing email</Field.Label>
        <Input type="email" required placeholder="accounts@company.com" />
        <Field.Description>Leave the field to check it.</Field.Description>
        <Field.Error match="valueMissing">Enter an email address.</Field.Error>
        <Field.Error match="typeMismatch">That is not an email address.</Field.Error>
      </Field>
      <Field name="vat">
        <Field.Label optional>VAT number</Field.Label>
        <Input minLength={9} placeholder="GB123456789" />
        <Field.Error match="tooShort">A VAT number is at least nine characters.</Field.Error>
      </Field>
      <Button type="submit">Save details</Button>
    </form>
  );
}
