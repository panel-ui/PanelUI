'use client';

import { MicIcon, MonitorIcon, MousePointer2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet } from 'panelui-web/sheet';

const CAPTURED = [
  { icon: MonitorIcon, title: 'The window you choose', detail: 'Nothing outside it is recorded.' },
  { icon: MicIcon, title: 'Your microphone', detail: 'Only while the red dot shows.' },
  { icon: MousePointer2Icon, title: 'Pointer and clicks', detail: 'So the edit can zoom where you click.' },
];

export default function SheetNoClose() {
  return (
    <Sheet dismissible={false}>
      <Sheet.Trigger render={<Button variant="outline" />}>Start recording</Sheet.Trigger>
      {/* No close button, no swipe, no click outside: the footer is the only way out. */}
      <Sheet.Content showClose={false}>
        <Sheet.Header title="Before you record" description="This recording keeps three things." />
        <Sheet.Body>
          <ul className="flex flex-col gap-4">
            {CAPTURED.map(({ icon: Icon, title, detail }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <Icon className="size-4.5" />
                </span>
                <span className="flex flex-col">
                  <span className="text-[15px] font-medium">{title}</span>
                  <span className="text-sm text-muted-foreground">{detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </Sheet.Body>
        <Sheet.Footer>
          <Sheet.Close render={<Button size="lg" />}>Allow and record</Sheet.Close>
          <Sheet.Close render={<Button size="lg" variant="ghost" />}>Not now</Sheet.Close>
        </Sheet.Footer>
      </Sheet.Content>
    </Sheet>
  );
}
