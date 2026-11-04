'use client';

import { Badge } from 'panelui-web/badge';
import { Command } from 'panelui-web/command';

/** Palettes for a slide deck's cover, each as the four colours its swatch draws. */
const PALETTES = [
  { name: 'Dusk', note: 'Slate and lilac, for a talk that starts after dark.', swatch: ['#1e1b2e', '#5b5280', '#d9d3f0', '#a78bfa'], tag: 'Recent' },
  { name: 'Paper', note: 'Warm off-white surfaces and ink-black text, for reading.', swatch: ['#1c1917', '#a8a29e', '#f5f0e6', '#b45309'] },
  { name: 'Harbour', note: 'Deep navy and sea glass, calm in a dark room.', swatch: ['#0b1726', '#36597a', '#9fc2d6', '#2dd4bf'] },
  { name: 'Orchard', note: 'Leaf greens on cream, with a ripe red for danger.', swatch: ['#14290f', '#4d7c0f', '#ecf3d9', '#dc2626'], tag: 'New' },
  { name: 'Ember', note: 'Charcoal with a warm orange that glows on hover.', swatch: ['#18120e', '#57412f', '#f2d8c2', '#f97316'] },
];

function Preview({ palette }: { palette: (typeof PALETTES)[number] }) {
  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="grid h-24 grid-cols-4 overflow-hidden rounded-xl border">
        {palette.swatch.map((colour) => (
          <span key={colour} style={{ background: colour }} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold text-foreground">{palette.name}</span>
        {palette.tag ? <Badge variant={palette.tag === 'New' ? 'info' : 'outline'}>{palette.tag}</Badge> : null}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{palette.note}</p>
    </div>
  );
}

export default function CommandSplit() {
  return (
    <Command variant="split" className="max-w-3xl">
      <Command.Input placeholder="Preview a palette…" />
      <Command.List className="h-72">
        <Command.Group heading="Palettes">
          {PALETTES.map((palette) => (
            <Command.Item
              key={palette.name}
              icon={
                <span className="grid size-full grid-cols-2 overflow-hidden rounded-md border">
                  {palette.swatch.map((colour) => (
                    <span key={colour} style={{ background: colour }} />
                  ))}
                </span>
              }
              kind={palette.tag}
              preview={<Preview palette={palette} />}
            >
              {palette.name}
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Empty />
      </Command.List>
      <Command.Footer lead="5 palettes">
        <Command.FooterAction keys={['↵']}>Apply</Command.FooterAction>
      </Command.Footer>
    </Command>
  );
}
