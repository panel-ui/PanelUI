'use client';

import { Checkbox } from 'panelui-web/checkbox';
import { Switch } from 'panelui-web/switch';
import { Label } from 'panelui-web/label';

export default function LabelControls() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      {/* Wrapped round its control, the label reads the control's state on its own. */}
      <Label>
        <Checkbox defaultChecked />
        <Label.Text>Email me a receipt</Label.Text>
      </Label>
      <Label>
        <Checkbox disabled />
        <Label.Text>Split the bill</Label.Text>
        <Label.Hint>Two or more cards</Label.Hint>
      </Label>
      <Label>
        <Label.Text>Remember this device</Label.Text>
        <Label.Action>
          <Switch defaultChecked />
        </Label.Action>
      </Label>
    </div>
  );
}
