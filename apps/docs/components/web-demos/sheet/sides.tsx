'use client';

import { Button } from 'panelui-web/button';
import { Sheet, type SheetSide } from 'panelui-web/sheet';

const SIDES: SheetSide[] = ['top', 'right', 'bottom', 'left'];

export default function SheetSides() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {SIDES.map((side) => (
        <Sheet key={side} side={side}>
          <Sheet.Trigger render={<Button variant="outline" className="capitalize" />}>{side}</Sheet.Trigger>
          <Sheet.Content>
            <Sheet.Header
              title="Edit profile"
              description="Make changes to your profile here. Save when you are done."
            />
            <Sheet.Body />
            <Sheet.Footer>
              <Sheet.Close render={<Button size="lg" />}>Save changes</Sheet.Close>
            </Sheet.Footer>
          </Sheet.Content>
        </Sheet>
      ))}
    </div>
  );
}
