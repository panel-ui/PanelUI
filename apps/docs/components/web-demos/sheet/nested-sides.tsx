'use client';

import { UsersRoundIcon } from 'lucide-react';
import { Button } from 'panelui-web/button';
import { Field } from 'panelui-web/field';
import { Input } from 'panelui-web/input';
import { Frame } from 'panelui-web/frame';
import { Sheet, type SheetSide } from 'panelui-web/sheet';

const SIDES: SheetSide[] = ['top', 'right', 'bottom', 'left'];

function Workspace({ side }: { side: SheetSide }) {
  return (
    <Sheet side={side}>
      <Sheet.Trigger render={<Button variant="outline" className="capitalize" />}>{side}</Sheet.Trigger>
      <Sheet.Content>
        <Sheet.Header title="Workspace" description="Northwind Studio · 12 members" />
        <Sheet.Body className="flex flex-col gap-6">
          <Field>
            <Field.Label>Workspace name</Field.Label>
            <Input defaultValue="Northwind Studio" />
          </Field>
          <Frame variant="plain">
            <Frame.Panel>
              <Sheet.Trigger to="invite" render={<Frame.Row chevron />}>
                <Frame.Media className="text-muted-foreground">
                  <UsersRoundIcon className="size-4" />
                </Frame.Media>
                <Frame.Content>
                  <Frame.Title as="p">Invite people</Frame.Title>
                  <Frame.Description>They join as members</Frame.Description>
                </Frame.Content>
              </Sheet.Trigger>
            </Frame.Panel>
          </Frame>
        </Sheet.Body>
        <Sheet.Footer>
          <Sheet.Close render={<Button size="lg" />}>Save</Sheet.Close>
        </Sheet.Footer>

        {/* It comes from the same edge, and the first sheet steps back. */}
        <Sheet.Next name="invite">
          <Sheet.Header title="Invite people" description="They join as members and can be promoted later." />
          <Sheet.Body>
            <Field>
              <Field.Label>Email</Field.Label>
              <Input type="email" placeholder="name@northwind.studio" />
            </Field>
          </Sheet.Body>
          <Sheet.Footer>
            <Sheet.Close render={<Button size="lg" />}>Send invite</Sheet.Close>
          </Sheet.Footer>
        </Sheet.Next>
      </Sheet.Content>
    </Sheet>
  );
}

export default function SheetNestedSides() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {SIDES.map((side) => (
        <Workspace key={side} side={side} />
      ))}
    </div>
  );
}
