import { Badge } from 'panelui-web/badge';
import { Button } from 'panelui-web/button';
import { Card } from 'panelui-web/card';

export default function CardImage() {
  return (
    // `overflow-hidden` is all the picture needs: the padding is on the parts.
    <Card as="article" className="w-full max-w-xs overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?auto=format&fit=crop&w=720&q=70"
        alt="A silver rangefinder camera on a table beside a stack of prints"
        className="aspect-[4/3] w-full object-cover"
      />
      <Card.Header>
        <Card.Title>Silver rangefinder, 23 mm lens</Card.Title>
        <Card.Description>Used for one season · Lisbon</Card.Description>
        <Card.Action>
          <Badge variant="secondary">£640</Badge>
        </Card.Action>
      </Card.Header>
      <Card.Footer>
        <Button className="w-full">Message the seller</Button>
      </Card.Footer>
    </Card>
  );
}
