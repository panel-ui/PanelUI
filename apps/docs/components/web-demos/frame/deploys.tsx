import { GitBranchIcon, RocketIcon } from 'lucide-react';
import { Badge } from 'panelui-web/badge';
import { Frame } from 'panelui-web/frame';

const DEPLOYS = [
  { ref: 'main · a41c2e9', where: 'Production · 2 minutes ago', status: 'Ready', tone: 'success' as const, prod: true },
  { ref: 'feature/sheet · 7d02b11', where: 'Preview · 9 minutes ago', status: 'Building', tone: 'info' as const, prod: false },
  { ref: 'main · e5c90af', where: 'Production · 3 hours ago', status: 'Failed', tone: 'destructive' as const, prod: true },
  { ref: 'docs/hero · 19bf3a4', where: 'Preview · 5 hours ago', status: 'Ready', tone: 'success' as const, prod: false },
];

export default function FrameDeploys() {
  return (
    <Frame className="w-full max-w-md">
      <Frame.Header>
        <Frame.Title>Deploys</Frame.Title>
        <Frame.Action>Last 24 hours</Frame.Action>
      </Frame.Header>
      <Frame.Panel>
        {DEPLOYS.map((deploy) => (
          <Frame.Row key={deploy.ref}>
            <Frame.Media className="size-9 rounded-lg bg-muted text-muted-foreground">
              {deploy.prod ? <RocketIcon className="size-4" /> : <GitBranchIcon className="size-4" />}
            </Frame.Media>
            <Frame.Content>
              <Frame.Title as="p">{deploy.ref}</Frame.Title>
              <Frame.Description>{deploy.where}</Frame.Description>
            </Frame.Content>
            <Frame.Actions>
              <Badge variant={deploy.tone}>{deploy.status}</Badge>
            </Frame.Actions>
          </Frame.Row>
        ))}
      </Frame.Panel>
    </Frame>
  );
}
