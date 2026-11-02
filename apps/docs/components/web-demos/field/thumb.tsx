import { Field } from 'panelui-web/field';
import { Input } from 'panelui-web/input';

export default function FieldThumb() {
  return (
    <Field className="w-56">
      <Field.Label>Name</Field.Label>
      <Input defaultValue="Larkspur" />
      <Field.Description>Shown on invoices.</Field.Description>
    </Field>
  );
}
