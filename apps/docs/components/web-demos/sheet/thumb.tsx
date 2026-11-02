'use client';

import { Button } from 'panelui-web/button';
import { Field } from 'panelui-web/field';
import { Input } from 'panelui-web/input';
import { Sheet } from 'panelui-web/sheet';

export default function SheetThumb() {
  return (
    <div className="w-80 shrink-0 scale-[0.62]">
      <Sheet>
        <Sheet.Content inline>
          <Sheet.Header title="Edit profile" description="Shown on your public page." />
          <Sheet.Body>
            <Field>
              <Field.Label>Name</Field.Label>
              <Input defaultValue="Noor Haddad" tabIndex={-1} />
            </Field>
          </Sheet.Body>
          <Sheet.Footer>
            <Button size="lg" tabIndex={-1}>
              Save changes
            </Button>
          </Sheet.Footer>
        </Sheet.Content>
      </Sheet>
    </div>
  );
}
