import { Field } from 'panelui-web/field';
import { Input } from 'panelui-web/input';

export default function FieldOverview() {
  return (
    <Field className="max-w-xs">
      <Field.Label>Company name</Field.Label>
      <Input placeholder="Larkspur Joinery" />
      <Field.Description>Printed on every invoice you send.</Field.Description>
    </Field>
  );
}
