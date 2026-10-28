'use client';

import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon, EyeIcon, EyeOffIcon, ImageIcon, MousePointer2Icon, SquareIcon, TypeIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { ChoiceCards } from 'panelui-web/choice-cards';
import { Frame } from 'panelui-web/frame';
import { Inspector } from 'panelui-web/inspector';
import { Slider } from 'panelui-web/slider';
import { Toolbar } from 'panelui-web/toolbar';
import { Workbench } from 'panelui-web/workbench';

const PALETTES = {
  dusk: ['var(--chart-4)', 'var(--chart-1)', 'var(--chart-5)'],
  grove: ['var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'],
  ink: ['var(--foreground)', 'var(--muted-foreground)', 'var(--chart-5)'],
};
type Palette = keyof typeof PALETTES;
type Align = 'left' | 'center' | 'right';

const LAYERS = [
  { id: 'title', name: 'Title', icon: TypeIcon },
  { id: 'dates', name: 'Dates', icon: TypeIcon },
  { id: 'sun', name: 'Sun', icon: SquareIcon },
  { id: 'hills', name: 'Hills', icon: ImageIcon },
];

export default function WorkbenchPoster() {
  const [hidden, setHidden] = useState<string[]>([]);
  const [palette, setPalette] = useState<Palette>('dusk');
  const [size, setSize] = useState(64);
  const [tracking, setTracking] = useState(-2);
  const [align, setAlign] = useState<Align>('left');
  const [deep, mid, light] = PALETTES[palette];
  const shown = (id: string) => !hidden.includes(id);

  return (
    <Workbench className="h-[640px]" inspectorWidth={300}>
      <Workbench.Bar>
        <Toolbar aria-label="Tools">
          <Toolbar.Group defaultValue="select" aria-label="Tools">
            <Toolbar.Tool value="select" label="Select" shortcut="V">
              <MousePointer2Icon />
            </Toolbar.Tool>
            <Toolbar.Tool value="text" label="Text" shortcut="T">
              <TypeIcon />
            </Toolbar.Tool>
            <Toolbar.Tool value="shape" label="Shape" shortcut="R">
              <SquareIcon />
            </Toolbar.Tool>
          </Toolbar.Group>
          <Workbench.InspectorTrigger />
        </Toolbar>
      </Workbench.Bar>

      <Workbench.Sidebar>
        <Frame className="h-full">
          <Frame.Header>
            <Frame.Title>Layers</Frame.Title>
          </Frame.Header>
          <Frame.Panel>
            {LAYERS.map(({ id, name, icon: Icon }) => (
              <Frame.Row key={id}>
                <Frame.Media className="text-muted-foreground">
                  <Icon className="size-4" />
                </Frame.Media>
                <Frame.Content>
                  <Frame.Title as="p">{name}</Frame.Title>
                </Frame.Content>
                <Frame.Actions>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={shown(id) ? `Hide ${name}` : `Show ${name}`}
                    onClick={() => setHidden((all) => (all.includes(id) ? all.filter((each) => each !== id) : [...all, id]))}
                  >
                    {shown(id) ? <EyeIcon /> : <EyeOffIcon />}
                  </Button>
                </Frame.Actions>
              </Frame.Row>
            ))}
          </Frame.Panel>
        </Frame>
      </Workbench.Sidebar>

      <Workbench.Canvas>
        <Workbench.Artboard aspect="4 / 5" className="[container-type:inline-size]">
          {/* The poster, drawn in units of its own width. */}
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${light} -20%, ${deep} 95%)` }}>
            {shown('sun') ? (
              <span
                className="absolute top-[14%] left-[56%] size-[30cqw] rounded-full"
                style={{ background: `radial-gradient(circle at 40% 35%, white, ${light} 55%, ${mid})` }}
              />
            ) : null}
            {shown('hills') ? (
              <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[42%] w-full">
                <path d="M0 22 C 18 8, 32 30, 50 18 S 82 6, 100 20 V40 H0Z" fill={mid} opacity={0.75} />
                <path d="M0 30 C 22 20, 40 36, 60 26 S 88 22, 100 30 V40 H0Z" fill={deep} />
              </svg>
            ) : null}
            <div className="absolute inset-x-[8%] bottom-[9%] flex flex-col gap-[2cqw] text-white" style={{ textAlign: align }}>
              {shown('title') ? (
                <p className="font-semibold leading-[0.9]" style={{ fontSize: `${size / 4.2}cqw`, letterSpacing: `${tracking / 100}em` }}>
                  Night
                  <br />
                  Market
                </p>
              ) : null}
              {shown('dates') ? <p className="text-[3.6cqw] font-medium opacity-85">Fridays in June · Harbour Steps</p> : null}
            </div>
          </div>
        </Workbench.Artboard>
      </Workbench.Canvas>

      <Workbench.Inspector title="Poster">
        <Inspector>
          <Inspector.Panel>
            <Inspector.Section>
              <Inspector.SectionTitle>Colour</Inspector.SectionTitle>
              <Inspector.SectionContent>
                <ChoiceCards value={palette} onValueChange={(next) => setPalette(next as Palette)} aspect="3 / 2" aria-label="Palette">
                  {(Object.keys(PALETTES) as Palette[]).map((key) => (
                    <ChoiceCards.Item key={key} value={key}>
                      <ChoiceCards.Media>
                        <span className="flex size-full">
                          {PALETTES[key].map((tone) => (
                            <span key={tone} className="flex-1" style={{ background: tone }} />
                          ))}
                        </span>
                      </ChoiceCards.Media>
                      <ChoiceCards.Label className="capitalize">{key}</ChoiceCards.Label>
                    </ChoiceCards.Item>
                  ))}
                </ChoiceCards>
              </Inspector.SectionContent>
            </Inspector.Section>
            <Inspector.Separator />
            <Inspector.Section>
              <Inspector.SectionTitle>Title</Inspector.SectionTitle>
              <Inspector.SectionAction>
                <Toolbar variant="inline" size="sm" aria-label="Alignment">
                  <Toolbar.Group value={align} onValueChange={(next) => setAlign(next as Align)} aria-label="Alignment">
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
              </Inspector.SectionAction>
              <Inspector.SectionContent>
                <Slider label="Size" min={32} max={96} value={size} onValueChange={setSize} format={(v) => `${v} pt`} />
                <Slider
                  label="Tracking"
                  origin="center"
                  min={-8}
                  max={8}
                  step={0.5}
                  value={tracking}
                  onValueChange={setTracking}
                  format={(v) => `${v > 0 ? '+' : ''}${v}%`}
                />
              </Inspector.SectionContent>
            </Inspector.Section>
          </Inspector.Panel>
        </Inspector>
      </Workbench.Inspector>
    </Workbench>
  );
}
