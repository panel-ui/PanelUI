'use client';

import { CropIcon, MousePointer2Icon, StickerIcon, TypeIcon } from 'lucide-react';
import { useState } from 'react';
import { Inspector } from 'panelui-web/inspector';
import { Slider } from 'panelui-web/slider';
import { Switch } from 'panelui-web/switch';
import { Toolbar } from 'panelui-web/toolbar';
import { Workbench } from 'panelui-web/workbench';

const PERCENT = { style: 'unit', unit: 'percent' } as const;

export default function WorkbenchNarrow() {
  const [warmth, setWarmth] = useState(24);
  const [vignette, setVignette] = useState(true);
  return (
    <div className="w-full max-w-[380px]">
      <Workbench className="h-[600px]">
        <Workbench.Bar>
          <Toolbar size="sm" aria-label="Tools">
            <Toolbar.Group defaultValue="select" aria-label="Tools">
              <Toolbar.Tool value="select" label="Select">
                <MousePointer2Icon />
              </Toolbar.Tool>
              <Toolbar.Tool value="crop" label="Crop">
                <CropIcon />
              </Toolbar.Tool>
              <Toolbar.Tool value="text" label="Text">
                <TypeIcon />
              </Toolbar.Tool>
              <Toolbar.Tool value="sticker" label="Sticker">
                <StickerIcon />
              </Toolbar.Tool>
            </Toolbar.Group>
            <Toolbar.Separator />
            {/* Only there while the inspector is a sheet. */}
            <Workbench.InspectorTrigger className="size-7 rounded-lg" />
          </Toolbar>
        </Workbench.Bar>
        <Workbench.Canvas>
          <Workbench.Artboard aspect="9 / 16">
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(170deg, color-mix(in oklab, var(--chart-3) ${warmth}%, var(--chart-5)), var(--chart-4))`,
              }}
            >
              {vignette ? <span className="absolute inset-0 bg-[radial-gradient(circle,transparent_45%,rgb(0_0_0/0.45))]" /> : null}
              <span className="absolute inset-x-[10%] bottom-[12%] h-[5%] rounded-full bg-white/85" />
              <span className="absolute inset-x-[10%] right-[35%] bottom-[20%] h-[3%] rounded-full bg-white/60" />
            </div>
          </Workbench.Artboard>
        </Workbench.Canvas>
        <Workbench.Inspector title="Adjust">
          <Inspector>
            <Inspector.Panel>
              <Inspector.Section>
                <Inspector.SectionTitle>Light</Inspector.SectionTitle>
                <Inspector.SectionContent>
                  <Slider label="Warmth" value={warmth} onValueChange={setWarmth} format={PERCENT} color="warning" />
                  <Slider label="Grain" defaultValue={12} format={PERCENT} />
                </Inspector.SectionContent>
              </Inspector.Section>
              <Inspector.Separator />
              <Inspector.Section>
                <Inspector.SectionTitle>Vignette</Inspector.SectionTitle>
                <Inspector.SectionAction>
                  <Switch size="sm" label="Vignette" checked={vignette} onCheckedChange={setVignette} />
                </Inspector.SectionAction>
              </Inspector.Section>
            </Inspector.Panel>
          </Inspector>
        </Workbench.Inspector>
      </Workbench>
    </div>
  );
}
