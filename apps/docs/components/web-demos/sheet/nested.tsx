'use client';

import { ImageIcon, LogOutIcon, UsersRoundIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Frame } from 'panelui-web/frame';
import { Sheet } from 'panelui-web/sheet';

const PEOPLE = [
  { name: 'Noor Haddad', role: 'Owner' },
  { name: 'Tomás Ferreira', role: 'Can add photos' },
  { name: 'Aiko Mori', role: 'Can add photos' },
  { name: 'Kwame Asante', role: 'Can view' },
  { name: 'Lena Vogt', role: 'Can view' },
];

// Stand-ins for six photos from the album.
const COVERS = [
  'from-chart-1 to-chart-4',
  'from-chart-2 to-chart-3',
  'from-chart-3 to-chart-1',
  'from-chart-4 to-chart-5',
  'from-chart-5 to-chart-2',
  'from-muted-foreground/50 to-chart-3',
];

export default function SheetNested() {
  return (
    <Sheet>
      <Sheet.Trigger render={<Button variant="outline" />}>Album settings</Sheet.Trigger>
      <Sheet.Content>
        <Sheet.Header title="Album settings" description="Shared with five people · 214 photos" />
        <Sheet.Body className="flex flex-col gap-6">
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input defaultValue="Porto, May" />
          </Field>
          <Label className="w-full justify-between">
            Let others add photos
            <Switch defaultChecked />
          </Label>
          {/* Each row opens a sheet of its own. They sit wherever the layout wants them. */}
          <Frame variant="plain">
            <Frame.Panel>
              <Sheet.Trigger to="people" render={<Frame.Row chevron />}>
                <Frame.Media className="text-muted-foreground">
                  <UsersRoundIcon className="size-4" />
                </Frame.Media>
                <Frame.Content>
                  <Frame.Title as="p">People</Frame.Title>
                </Frame.Content>
                <Frame.Actions className="text-sm text-muted-foreground">5</Frame.Actions>
              </Sheet.Trigger>
              <Sheet.Trigger to="cover" render={<Frame.Row chevron />}>
                <Frame.Media className="text-muted-foreground">
                  <ImageIcon className="size-4" />
                </Frame.Media>
                <Frame.Content>
                  <Frame.Title as="p">Cover photo</Frame.Title>
                </Frame.Content>
              </Sheet.Trigger>
            </Frame.Panel>
          </Frame>
          <Sheet.Trigger to="leave" render={<Button variant="destructive-outline" />}>
            <LogOutIcon />
            Leave album
          </Sheet.Trigger>
        </Sheet.Body>
        <Sheet.Footer>
          <Sheet.Close render={<Button size="lg" />}>Done</Sheet.Close>
        </Sheet.Footer>

        <Sheet.Next name="people">
          <Sheet.Header title="People" description="Everyone the album is shared with." />
          <Sheet.Body>
            <Frame variant="plain">
              <Frame.Panel>
                {PEOPLE.map((person) => (
                  <Frame.Row key={person.name}>
                    <Frame.Content>
                      <Frame.Title as="p">{person.name}</Frame.Title>
                      <Frame.Description>{person.role}</Frame.Description>
                    </Frame.Content>
                  </Frame.Row>
                ))}
              </Frame.Panel>
            </Frame>
          </Sheet.Body>
          <Sheet.Footer>
            <Sheet.Close render={<Button size="lg" />}>Done</Sheet.Close>
          </Sheet.Footer>
        </Sheet.Next>

        <Sheet.Next name="cover">
          <Sheet.Header title="Cover photo" description="Shown on the album in everyone’s library." />
          <Sheet.Body>
            <div className="grid grid-cols-3 gap-2">
              {COVERS.map((tone, index) => (
                <Sheet.Close
                  key={tone}
                  render={
                    <button
                      type="button"
                      aria-label={`Photo ${index + 1}`}
                      className={`aspect-square cursor-pointer rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring bg-linear-to-br ${tone}`}
                    />
                  }
                />
              ))}
            </div>
          </Sheet.Body>
          <Sheet.Footer />
        </Sheet.Next>

        <Sheet.Next name="leave">
          <Sheet.Header
            title="Leave “Porto, May”?"
            description="The photos you added stay in the album. Anyone in it can invite you back."
          />
          <Sheet.Footer>
            <Sheet.Close render={<Button size="lg" variant="destructive" />}>Leave album</Sheet.Close>
            <Sheet.Close render={<Button size="lg" variant="ghost" />}>Stay</Sheet.Close>
          </Sheet.Footer>
        </Sheet.Next>
      </Sheet.Content>
    </Sheet>
  );
}
