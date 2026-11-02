import { Button } from 'panelui-web/button';
import { Switch } from 'panelui-web/switch';
import { Frame } from 'panelui-web/frame';

export default function FrameInset() {
  return (
    <Frame variant="inset" className="w-full max-w-sm">
      <Frame.Header>
        <Frame.Title>Backups</Frame.Title>
        <Frame.Action>Last run 02:00</Frame.Action>
      </Frame.Header>
      <Frame.Panel>
        <Frame.Row>
          <Frame.Content>
            <Frame.Title as="p">Back up every night</Frame.Title>
            <Frame.Description>At 02:00, while nobody is working</Frame.Description>
          </Frame.Content>
          <Frame.Actions>
            <Switch defaultChecked aria-label="Back up every night" />
          </Frame.Actions>
        </Frame.Row>
        <Frame.Row>
          <Frame.Content>
            <Frame.Title as="p">Keep copies for</Frame.Title>
            <Frame.Description>Older ones are removed</Frame.Description>
          </Frame.Content>
          <Frame.Actions className="text-sm text-muted-foreground">30 days</Frame.Actions>
        </Frame.Row>
      </Frame.Panel>
      <Frame.Footer>
        <Button variant="outline">Restore</Button>
        <Button>Back up now</Button>
      </Frame.Footer>
    </Frame>
  );
}
