'use client';

import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon, PlusIcon } from 'lucide-react';
import { Button } from 'panelui-web/button';
import { Inspector } from 'panelui-web/inspector';
import { Slider } from 'panelui-web/slider';
import { Switch } from 'panelui-web/switch';
import { Toolbar } from 'panelui-web/toolbar';

export default function InspectorCollapsible() {
  return (
    <Inspector>
      <Inspector.Panel className="h-[26rem]">
        <Inspector.Section collapsible>
          <Inspector.SectionTitle>Text</Inspector.SectionTitle>
          <Inspector.SectionContent>
            <Slider label="Size" min={8} max={96} defaultValue={32} format={(v) => `${v} pt`} />
            <Slider label="Line height" min={0.8} max={2} step={0.05} defaultValue={1.15} format={(v) => v.toFixed(2)} />
            <Slider label="Tracking" origin="center" min={-10} max={10} step={0.5} defaultValue={-1.5} format={(v) => `${v > 0 ? '+' : ''}${v}%`} />
            <Toolbar variant="inline" size="sm" aria-label="Alignment">
              <Toolbar.Group defaultValue="left" aria-label="Alignment">
                <Toolbar.Tool value="left" label="Align left">
                  <AlignLeftIcon />
                </Toolbar.Tool>
                <Toolbar.Tool value="center" label="Centre">
                  <AlignCenterIcon />
                </Toolbar.Tool>
                <Toolbar.Tool value="right" label="Align right">
                  <AlignRightIcon />
                </Toolbar.Tool>
              </Toolbar.Group>
            </Toolbar>
          </Inspector.SectionContent>
        </Inspector.Section>
        <Inspector.Separator />
        <Inspector.Section collapsible>
          <Inspector.SectionTitle>Fill</Inspector.SectionTitle>
          <Inspector.SectionAction>
            <Button size="icon-sm" variant="ghost" aria-label="Add a fill">
              <PlusIcon />
            </Button>
          </Inspector.SectionAction>
          <Inspector.SectionContent>
            <Slider label="Opacity" defaultValue={100} format={{ style: 'unit', unit: 'percent' }} />
          </Inspector.SectionContent>
        </Inspector.Section>
        <Inspector.Separator />
        <Inspector.Section collapsible defaultOpen={false}>
          <Inspector.SectionTitle>Shadow</Inspector.SectionTitle>
          <Inspector.SectionAction>
            <Switch size="sm" label="Shadow" />
          </Inspector.SectionAction>
          <Inspector.SectionContent>
            <Slider label="Blur" min={0} max={64} defaultValue={24} format={(v) => `${v} px`} />
            <Slider label="Distance" min={0} max={40} defaultValue={8} format={(v) => `${v} px`} />
          </Inspector.SectionContent>
        </Inspector.Section>
      </Inspector.Panel>
    </Inspector>
  );
}
