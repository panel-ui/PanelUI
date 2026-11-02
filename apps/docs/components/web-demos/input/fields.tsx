import { Field } from 'panelui-web/field';
import { MailIcon, SearchIcon } from 'lucide-react';
import { Input } from 'panelui-web/input';

export default function InputFields() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-5">
      <Input.Group>
        <Input.Addon>
          <SearchIcon />
        </Input.Addon>
        <Input placeholder="Search the handbook" aria-label="Search the handbook" />
        <Input.Addon align="end">
          <kbd>⌘K</kbd>
        </Input.Addon>
      </Input.Group>
      <Field>
        <Field.Label>Work email</Field.Label>
        <Input.Group>
          <Input.Addon>
            <MailIcon />
          </Input.Addon>
          <Input type="email" placeholder="you@company.com" />
        </Input.Group>
        <Field.Description>We send the receipt here.</Field.Description>
      </Field>
      <Field>
        <Field.Label>Display name</Field.Label>
        <Input defaultValue="Rosa Okafor" />
      </Field>
    </div>
  );
}
