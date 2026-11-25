'use client';

import { useState } from 'react';
import { Micro } from 'panelui-web/micro';

export default function MicroToggle() {
  const [on, setOn] = useState(true);
  return (
    <Micro>
      <Micro.Text value="Remove noise" label="this episode only" />
      <Micro.Switch checked={on} onCheckedChange={setOn} label="Remove noise" color="info" />
    </Micro>
  );
}
