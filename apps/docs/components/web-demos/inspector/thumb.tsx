'use client';

import { ImageIcon, MousePointer2Icon, Volume2Icon } from 'lucide-react';
import { Inspector } from 'panelui-web/inspector';
import { Slider } from 'panelui-web/slider';
import { Switch } from 'panelui-web/switch';

export default function InspectorThumb() {
  return (
    <Inspector defaultValue="pointer">
      <Inspector.Rail>
        <Inspector.Tab value="backdrop" label="Backdrop">
          <ImageIcon />
        </Inspector.Tab>
        <Inspector.Tab value="pointer" label="Pointer">
          <MousePointer2Icon />
        </Inspector.Tab>
        <Inspector.Tab value="audio" label="Audio">
          <Volume2Icon />
        </Inspector.Tab>
      </Inspector.Rail>
      <Inspector.Panel className="w-56">
        <Inspector.Page value="pointer">
          <Inspector.Section>
            <Inspector.SectionTitle>Click sound</Inspector.SectionTitle>
            <Inspector.SectionAction>
              <Switch size="sm" label="Click sound" defaultChecked />
            </Inspector.SectionAction>
            <Inspector.SectionContent>
              <Slider size="sm" label="Volume" defaultValue={42} />
              <Slider size="sm" label="Size" defaultValue={64} />
            </Inspector.SectionContent>
          </Inspector.Section>
        </Inspector.Page>
      </Inspector.Panel>
    </Inspector>
  );
}
