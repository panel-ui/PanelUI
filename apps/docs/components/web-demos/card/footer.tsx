import { Button } from 'panelui-web/button';
import { Input } from 'panelui-web/input';
import { Card } from 'panelui-web/card';

export default function CardFooterVariants() {
  return (
    <div className="flex w-full flex-wrap items-stretch justify-center gap-4">
      <Card className="w-full max-w-72">
        <Card.Header>
          <Card.Title>Invite a teammate</Card.Title>
          <Card.Description>They join as a member.</Card.Description>
        </Card.Header>
        <Card.Content>
          <Input type="email" placeholder="name@northwind.studio" aria-label="Email" />
        </Card.Content>
        <Card.Footer>
          <Button className="w-full">Send invite</Button>
        </Card.Footer>
      </Card>
      <Card className="w-full max-w-72">
        <Card.Header>
          <Card.Title>Delete workspace</Card.Title>
          <Card.Description>Projects and files go with it. This cannot be undone.</Card.Description>
        </Card.Header>
        <Card.Footer variant="panel" className="justify-end">
          <Button variant="ghost">Cancel</Button>
          <Button variant="destructive">Delete</Button>
        </Card.Footer>
      </Card>
    </div>
  );
}
