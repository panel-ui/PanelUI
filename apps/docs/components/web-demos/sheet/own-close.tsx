'use client';

import { Button } from '@/components/ui/button';
import { Sheet } from 'panelui-web/sheet';

const GROUPS = [
  { label: 'Orientation', options: ['Any', 'Landscape', 'Portrait', 'Square'] },
  { label: 'Taken', options: ['Any time', 'This week', 'This month', 'This year'] },
  { label: 'Camera', options: ['Any', 'Phone', 'Mirrorless', 'Film scan'] },
];

export default function SheetOwnClose() {
  return (
    <Sheet side="left">
      <Sheet.Trigger render={<Button variant="outline" />}>Filter photos</Sheet.Trigger>
      <Sheet.Content>
        <Sheet.Header>
          {/* Written first, so it stands before the title instead of in the corner. */}
          <Sheet.Close />
          <Sheet.Title>Filters</Sheet.Title>
          <Sheet.Description>1,284 photos match</Sheet.Description>
        </Sheet.Header>
        <Sheet.Body className="flex flex-col gap-6 pt-2">
          {GROUPS.map((group) => (
            <fieldset key={group.label} className="flex flex-col gap-2.5">
              <legend className="mb-2.5 text-sm font-medium">{group.label}</legend>
              <div className="flex flex-wrap gap-2">
                {group.options.map((option, at) => (
                  <label
                    key={option}
                    className="cursor-pointer rounded-full bg-muted px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground has-checked:bg-foreground has-checked:text-background"
                  >
                    <input type="radio" name={group.label} defaultChecked={at === 0} className="sr-only" />
                    {option}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </Sheet.Body>
        <Sheet.Footer>
          <Sheet.Close render={<Button size="lg" />}>Show 1,284 photos</Sheet.Close>
        </Sheet.Footer>
      </Sheet.Content>
    </Sheet>
  );
}
