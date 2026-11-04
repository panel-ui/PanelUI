'use client';

import { Input } from 'panelui-web/input';
import { Label } from 'panelui-web/label';
import { Tooltip } from 'panelui-web/tooltip';
import { InfoIcon } from 'lucide-react';

export default function TooltipOutline() {
  return (
    <Tooltip.Provider>
      <div className="flex w-72 flex-col gap-2">
        <Label htmlFor="billing-email">
          <Label.Text>Billing email</Label.Text>
          <Label.Hint>
            <Tooltip>
              <Tooltip.Trigger
                aria-label="Receipts and failed payments go here"
                className="flex text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-3.5"
              >
                <InfoIcon />
              </Tooltip.Trigger>
              <Tooltip.Content variant="outline">Receipts and failed payments go here.</Tooltip.Content>
            </Tooltip>
          </Label.Hint>
        </Label>
        <Input id="billing-email" type="email" defaultValue="accounts@northwind.studio" />
      </div>
    </Tooltip.Provider>
  );
}
