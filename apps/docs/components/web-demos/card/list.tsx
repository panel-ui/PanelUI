import { Badge } from 'panelui-web/badge';
import { Card } from 'panelui-web/card';

const PROJECTS = [
  { name: 'Checkout redesign', team: 'Payments', status: 'In review', tone: 'info' as const },
  { name: 'Onboarding emails', team: 'Growth', status: 'Shipped', tone: 'success' as const },
  { name: 'Search ranking', team: 'Discovery', status: 'Blocked', tone: 'warning' as const },
];

export default function CardList() {
  return (
    <ul className="grid w-full max-w-2xl gap-3 sm:grid-cols-3">
      {PROJECTS.map((project) => (
        <Card as="li" size="sm" key={project.name}>
          <Card.Header>
            <Card.Title as="h4">{project.name}</Card.Title>
            <Card.Description>{project.team}</Card.Description>
          </Card.Header>
          <Card.Content>
            <Badge variant={project.tone}>{project.status}</Badge>
          </Card.Content>
        </Card>
      ))}
    </ul>
  );
}
