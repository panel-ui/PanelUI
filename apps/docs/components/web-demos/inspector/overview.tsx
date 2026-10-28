'use client';

import { ImageIcon, LayoutPanelTopIcon, MousePointer2Icon, VideoIcon, Volume2Icon } from 'lucide-react';
import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { ChoiceCards } from 'panelui-web/choice-cards';
import { Inspector } from 'panelui-web/inspector';
import { Slider } from 'panelui-web/slider';
import { Switch } from 'panelui-web/switch';
import { XYPad, type XYPadPoint } from 'panelui-web/xy-pad';

const PERCENT = { style: 'unit', unit: 'percent' } as const;
const MOTION = { overshoot: 18, settle: 320, size: 1.25 };

const POINTERS = [
  { value: 'arrow', label: 'Arrow', drawing: <path d="M14 10v26l7-6.5 4.5 10 4.5-2-4.5-9.5H35Z" /> },
  { value: 'dot', label: 'Dot', drawing: <circle cx="24" cy="24" r="7" /> },
  {
    value: 'halo',
    label: 'Halo',
    drawing: (
      <>
        <circle cx="24" cy="24" r="15" fillOpacity={0.22} stroke="none" />
        <circle cx="24" cy="24" r="6" />
      </>
    ),
  },
];

const BACKDROPS = [
  { value: 'dusk', label: 'Dusk', image: 'linear-gradient(140deg, var(--chart-1), var(--chart-4))' },
  { value: 'lagoon', label: 'Lagoon', image: 'linear-gradient(140deg, var(--chart-2), var(--chart-3))' },
  { value: 'plain', label: 'Plain', image: 'var(--foreground)' },
];

export default function InspectorOverview() {
  const [clicks, setClicks] = useState(true);
  const [lead, setLead] = useState<XYPadPoint>({ x: 0.35, y: 0.1 });
  const [motion, setMotion] = useState(MOTION);
  const changed = motion !== MOTION || lead.x !== 0.35 || lead.y !== 0.1;

  return (
    <Inspector defaultValue="pointer">
      <Inspector.Rail>
        <Inspector.Tab value="backdrop" label="Backdrop">
          <ImageIcon />
        </Inspector.Tab>
        <Inspector.Tab value="pointer" label="Pointer">
          <MousePointer2Icon />
        </Inspector.Tab>
        <Inspector.Tab value="camera" label="Camera">
          <VideoIcon />
        </Inspector.Tab>
        <Inspector.Tab value="audio" label="Audio">
          <Volume2Icon />
        </Inspector.Tab>
        <Inspector.RailSeparator />
        <Inspector.Tab value="layout" label="Layout">
          <LayoutPanelTopIcon />
        </Inspector.Tab>
      </Inspector.Rail>

      <Inspector.Panel className="h-[30rem]">
        <Inspector.Page value="pointer">
          <Inspector.Section>
            <Inspector.SectionTitle>Click sound</Inspector.SectionTitle>
            <Inspector.SectionAction>
              <Switch size="sm" label="Click sound" checked={clicks} onCheckedChange={setClicks} />
            </Inspector.SectionAction>
            <Inspector.SectionContent>
              <ChoiceCards defaultValue="halo" aspect="5 / 4" aria-label="Pointer style">
                {POINTERS.map(({ value, label, drawing }) => (
                  <ChoiceCards.Item key={value} value={value}>
                    <ChoiceCards.Media>
                      <svg viewBox="0 0 48 48" className="size-9 fill-current stroke-background" strokeWidth={2}>
                        {drawing}
                      </svg>
                    </ChoiceCards.Media>
                    <ChoiceCards.Label>{label}</ChoiceCards.Label>
                  </ChoiceCards.Item>
                ))}
              </ChoiceCards>
              <Slider label="Click volume" defaultValue={42} format={PERCENT} disabled={!clicks} />
            </Inspector.SectionContent>
          </Inspector.Section>
          <Inspector.Separator />
          <Inspector.Section>
            <Inspector.SectionTitle>Motion</Inspector.SectionTitle>
            <Inspector.SectionAction>
              <Button
                size="sm"
                variant="secondary"
                disabled={!changed}
                onClick={() => {
                  setMotion(MOTION);
                  setLead({ x: 0.35, y: 0.1 });
                }}
              >
                Reset
              </Button>
            </Inspector.SectionAction>
            <Inspector.SectionContent>
              <XYPad label="Lead" value={lead} onValueChange={setLead} aspect="16 / 9" />
              <Slider
                label="Overshoot"
                value={motion.overshoot}
                onValueChange={(overshoot) => setMotion({ ...motion, overshoot })}
                format={PERCENT}
              />
              <Slider
                label="Settle time"
                min={80}
                max={800}
                step={10}
                value={motion.settle}
                onValueChange={(settle) => setMotion({ ...motion, settle })}
                format={(v) => `${v} ms`}
              />
              <Slider
                label="Pointer size"
                min={0.5}
                max={3}
                step={0.05}
                value={motion.size}
                onValueChange={(size) => setMotion({ ...motion, size })}
                format={(v) => `${v.toFixed(2)}×`}
              />
            </Inspector.SectionContent>
          </Inspector.Section>
        </Inspector.Page>

        <Inspector.Page value="backdrop">
          <Inspector.Section>
            <Inspector.SectionTitle>Backdrop</Inspector.SectionTitle>
            <Inspector.SectionContent>
              <ChoiceCards defaultValue="lagoon" aspect="1 / 1" aria-label="Backdrop">
                {BACKDROPS.map(({ value, label, image }) => (
                  <ChoiceCards.Item key={value} value={value}>
                    <ChoiceCards.Media>
                      <span className="size-full" style={{ background: image }} />
                    </ChoiceCards.Media>
                    <ChoiceCards.Label>{label}</ChoiceCards.Label>
                  </ChoiceCards.Item>
                ))}
              </ChoiceCards>
            </Inspector.SectionContent>
          </Inspector.Section>
          <Inspector.Separator />
          <Inspector.Section>
            <Inspector.SectionTitle>Frame</Inspector.SectionTitle>
            <Inspector.SectionContent>
              <Slider label="Padding" defaultValue={12} format={PERCENT} />
              <Slider label="Corners" min={0} max={48} defaultValue={18} format={(v) => `${v} px`} />
              <Slider label="Shadow" defaultValue={60} format={PERCENT} />
            </Inspector.SectionContent>
          </Inspector.Section>
        </Inspector.Page>

        <Inspector.Page value="camera">
          <Inspector.Section>
            <Inspector.SectionTitle>Show camera</Inspector.SectionTitle>
            <Inspector.SectionAction>
              <Switch size="sm" label="Show camera" defaultChecked />
            </Inspector.SectionAction>
            <Inspector.SectionContent>
              <Slider label="Size" defaultValue={22} format={PERCENT} />
              <Slider label="Roundness" defaultValue={100} format={PERCENT} />
            </Inspector.SectionContent>
          </Inspector.Section>
        </Inspector.Page>

        <Inspector.Page value="audio">
          <Inspector.Section>
            <Inspector.SectionTitle>Levels</Inspector.SectionTitle>
            <Inspector.SectionContent>
              <Slider label="Voice" defaultValue={80} format={PERCENT} />
              <Slider label="Music" defaultValue={24} format={PERCENT} />
            </Inspector.SectionContent>
          </Inspector.Section>
          <Inspector.Separator />
          <Inspector.Section>
            <Inspector.SectionTitle>Remove background noise</Inspector.SectionTitle>
            <Inspector.SectionAction>
              <Switch size="sm" label="Remove background noise" defaultChecked />
            </Inspector.SectionAction>
          </Inspector.Section>
        </Inspector.Page>

        <Inspector.Page value="layout">
          <Inspector.Section>
            <Inspector.SectionTitle>Margins</Inspector.SectionTitle>
            <Inspector.SectionContent>
              <Slider label="Inset" defaultValue={6} format={PERCENT} />
            </Inspector.SectionContent>
          </Inspector.Section>
        </Inspector.Page>
      </Inspector.Panel>
    </Inspector>
  );
}
