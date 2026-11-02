'use client';

import { FileTextIcon, UserPlusIcon } from 'lucide-react';
import { Button } from 'panelui-web/button';
import { Field } from 'panelui-web/field';
import { Input } from 'panelui-web/input';
import { Frame } from 'panelui-web/frame';
import { Sheet } from 'panelui-web/sheet';

const DETAILS = [
  ['Size', '18.4 MB'],
  ['Pages', '42'],
  ['Uploaded', '14 October by Ruth Adeyemi'],
  ['Folder', 'Harbour Road / Surveys'],
];

export default function SheetHeaderTrigger() {
  return (
    <Sheet>
      <Sheet.Trigger render={<Button variant="outline" />}>File details</Sheet.Trigger>
      <Sheet.Content>
        <Sheet.Header>
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <FileTextIcon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <Sheet.Title className="truncate">Site survey.pdf</Sheet.Title>
              <Sheet.Description>Only you can open it</Sheet.Description>
            </div>
            {/* A trigger in the header, beside the title. */}
            <Sheet.Trigger
              to="share"
              aria-label="Share"
              render={<Button size="icon" variant="outline" className="rounded-full" />}
            >
              <UserPlusIcon />
            </Sheet.Trigger>
          </div>
        </Sheet.Header>
        <Sheet.Body>
          <Frame variant="plain">
            <Frame.Panel>
              {DETAILS.map(([label, value]) => (
                <Frame.Row key={label}>
                  <Frame.Content>
                    <Frame.Description>{label}</Frame.Description>
                  </Frame.Content>
                  <Frame.Actions className="text-sm">{value}</Frame.Actions>
                </Frame.Row>
              ))}
            </Frame.Panel>
          </Frame>
        </Sheet.Body>
        <Sheet.Footer>
          <Sheet.Close render={<Button size="lg" />}>Open</Sheet.Close>
        </Sheet.Footer>

        <Sheet.Next name="share">
          <Sheet.Header title="Share “Site survey.pdf”" description="People you add can open and comment." />
          <Sheet.Body>
            <Field>
              <Field.Label>Email</Field.Label>
              <Input type="email" placeholder="name@harbour.works" />
            </Field>
          </Sheet.Body>
          <Sheet.Footer>
            <Sheet.Close render={<Button size="lg" />}>Share</Sheet.Close>
          </Sheet.Footer>
        </Sheet.Next>
      </Sheet.Content>
    </Sheet>
  );
}
