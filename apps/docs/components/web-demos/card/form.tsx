import { Button } from 'panelui-web/button';
import { Field } from 'panelui-web/field';
import { Input } from 'panelui-web/input';
import { Card } from 'panelui-web/card';

export default function CardForm() {
  return (
    <Card as="section" className="w-full max-w-sm">
      <Card.Header>
        <Card.Title>Create a workspace</Card.Title>
        <Card.Description>Start on the free plan and invite your team later.</Card.Description>
        <Card.Action>
          <Button variant="link" className="px-0">
            Sign in
          </Button>
        </Card.Action>
      </Card.Header>
      <Card.Content>
        <form id="create-workspace" className="flex flex-col gap-5">
          <Field>
            <Field.Label>Work email</Field.Label>
            <Input type="email" placeholder="you@company.com" required />
          </Field>
          <Field>
            <Field.Label>Workspace name</Field.Label>
            <Input placeholder="Northwind Studio" required />
            <Field.Description>You can change it at any time.</Field.Description>
          </Field>
        </form>
      </Card.Content>
      <Card.Footer variant="panel" className="flex-col gap-2">
        <Button type="submit" form="create-workspace" className="w-full">
          Create workspace
        </Button>
        <Button variant="outline" className="w-full">
          Continue with Google
        </Button>
      </Card.Footer>
    </Card>
  );
}
