'use client';

import { PhoneIcon } from 'lucide-react';
import { Button } from 'panelui-web/button';
import { Frame } from 'panelui-web/frame';
import { Sheet } from 'panelui-web/sheet';

interface Engineer {
  name: string;
  shift: string;
  area: string;
  phone: string;
}

const ROTA: Engineer[] = [
  { name: 'Ifeoma Okafor', shift: 'Mon–Tue · 08:00–20:00', area: 'Payments API', phone: '+44 20 7946 0112' },
  { name: 'Mateo Rossi', shift: 'Wed–Thu · 08:00–20:00', area: 'Search', phone: '+44 20 7946 0347' },
  { name: 'Hana Sato', shift: 'Fri–Sat · 20:00–08:00', area: 'Storage', phone: '+44 20 7946 0581' },
  { name: 'Samir Haddad', shift: 'Sun · all day', area: 'Edge network', phone: '+44 20 7946 0926' },
];

export default function SheetPayload() {
  return (
    <Sheet>
      <Sheet.Trigger render={<Button variant="outline" />}>On call this week</Sheet.Trigger>
      <Sheet.Content>
        <Sheet.Header title="On call" description="19–25 October · four engineers" />
        <Sheet.Body>
          <Frame variant="plain">
            <Frame.Panel>
              {/* Every row opens the same sheet, filled with that row's engineer. */}
              {ROTA.map((engineer) => (
                <Sheet.Trigger key={engineer.name} to="engineer" payload={engineer} render={<Frame.Row chevron />}>
                  <Frame.Content>
                    <Frame.Title as="p">{engineer.name}</Frame.Title>
                    <Frame.Description>{engineer.shift}</Frame.Description>
                  </Frame.Content>
                </Sheet.Trigger>
              ))}
            </Frame.Panel>
          </Frame>
        </Sheet.Body>
        <Sheet.Footer />

        <Sheet.Next name="engineer">
          {(engineer: Engineer) => (
            <>
              <Sheet.Header title={engineer.name} description={engineer.area} />
              <Sheet.Body>
                <Frame variant="plain">
                  <Frame.Panel>
                    <Frame.Row>
                      <Frame.Content>
                        <Frame.Description>Shift</Frame.Description>
                        <Frame.Title as="p">{engineer.shift}</Frame.Title>
                      </Frame.Content>
                    </Frame.Row>
                    <Frame.Row>
                      <Frame.Content>
                        <Frame.Description>Phone</Frame.Description>
                        <Frame.Title as="p" className="tabular-nums">
                          {engineer.phone}
                        </Frame.Title>
                      </Frame.Content>
                      <Frame.Actions className="text-muted-foreground">
                        <PhoneIcon className="size-4" />
                      </Frame.Actions>
                    </Frame.Row>
                  </Frame.Panel>
                </Frame>
              </Sheet.Body>
              <Sheet.Footer>
                <Sheet.Close render={<Button size="lg" />}>Page {engineer.name.split(' ')[0]}</Sheet.Close>
                <Sheet.Close render={<Button size="lg" variant="ghost" />}>Ask to swap shifts</Sheet.Close>
              </Sheet.Footer>
            </>
          )}
        </Sheet.Next>
      </Sheet.Content>
    </Sheet>
  );
}
