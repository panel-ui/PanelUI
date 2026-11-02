# Planet

The world as dots on a globe you can turn, with markers pinned to it.

```tsx
import { Planet } from "@/components/panelui/planet"
```

From npm the path is `panelui-web/planet`. Install with `npx shadcn@latest add @panelui/planet`.

## When to use it

Use it to show where things are in the world when the answer is a handful of places: the regions a service runs in, offices, where a team is this week. The land is drawn as dots and the markers are your own elements, so a marker can hold initials, an icon or a link.

Drag the globe to turn it. `Planet.Controls` adds two buttons for the same thing, and the arrow keys work when the globe has focus.

It shows that a place is somewhere, not exactly where. A marker covers a few hundred kilometres at this scale, so for anything a street address matters to, use a map.

## Usage

```tsx
<Planet defaultRotation={[60, 14]}>
  <Planet.Globe>
    <Planet.Marker lat={53.35} lng={-6.26} label="Dublin" />
    <Planet.Marker lat={-33.87} lng={151.21} label="Sydney" color="destructive" />
  </Planet.Globe>
  <Planet.Controls />
</Planet>
```

## Parts

```tsx
<Planet>
  <Planet.Globe>
    <Planet.Marker lat={…} lng={…} label="…">…</Planet.Marker>
  </Planet.Globe>
  <Planet.Controls />
</Planet>
<Planet.List>
  <Planet.ListItem />
</Planet.List>
```

- `Planet.Globe` — The sphere and its dots, with a soft light round its edge in the theme colour named by `color`. Markers go inside it.
- `Planet.Marker` — An element pinned to a latitude and longitude. Without children it is a dot in the theme colour named by `color`; with children they are drawn at the point, in a circle ringed in that colour. `label` and `count` go in a tag above it, `pulse` spreads a fading ring from it, and `onClick` makes it a button.
- `Planet.Controls` — Two buttons joined in one group that turn the globe by `step` degrees. Children are a caption between them.
- `Planet.List` — The places on the globe again, as a list in two columns, for picking one by name. Put it beside or under the globe and turn the globe to whatever is picked.
- `Planet.ListItem` — One place: a dot in the theme colour named by `color`, then its name. It is a button; `selected` marks the one that is picked.

## Props

Every part also takes the props of the element it renders, and a `className`.

#### `PlanetProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultRotation` | `PlanetRotation` | — | The coordinate facing the viewer to begin with, as `[longitude, latitude]` in degrees. Read once: turning the globe afterwards does not change it. |
| `autoRotate` | `boolean \| number` | `false` | Turn on its own, at this many degrees of longitude a second. `true` is 6. It stops while the pointer is over the globe, while it is being dragged, while it is off screen, and for anyone who has asked for reduced motion. |
| `interactive` | `boolean` | `true` | Let the globe be dragged and turned with the arrow keys. |
| `onRotationChange` | `(rotation: PlanetRotation) => void` | — | Called with the coordinate facing the viewer each time the globe comes to rest. |

#### `PlanetGlobeProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `PlanetMarkerColor` | `'primary'` | Which of the theme's roles the light round the globe is drawn in. |
| `label` | `string` | `'Globe'` | What a screen reader calls the globe. |

#### `PlanetMarkerProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `lat` | `number` | **required** | Degrees north of the equator. South is negative. |
| `lng` | `number` | **required** | Degrees east of Greenwich. West is negative. |
| `label` | `ReactNode` | — | A caption in a tag above the pin. |
| `count` | `ReactNode` | — | A figure after the label, in a quieter colour. |
| `color` | `PlanetMarkerColor` | `'primary'` | Which of the theme's roles the dot, or the ring of a pin with children, is drawn in. |
| `pulse` | `boolean` | `false` | Spreads a fading ring from the marker, for one that wants looking at. |
| `onClick` | `(event: MouseEvent<HTMLButtonElement>) => void` | — | Called when the marker is pressed. Passing this makes the marker a button: it takes focus, and Enter or Space press it. |
| `selected` | `boolean` | `false` | Draws the marker as the one that has been picked. |
| `name` | `string` | — | What a screen reader calls a marker that can be pressed. Defaults to its label. |
| `labelClassName` | `string` | — | Extra classes for the label. |

#### `PlanetControlsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `step` | `number` | — | Degrees of longitude one press turns the globe. |

#### `PlanetListProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultTagName` | `'ul',` | **required** | — |
| `props` | `mergeProps({ 'data-slot': 'planet-list', className: planetVariants().list({ className }) }, props),` | **required** | — |

#### `PlanetListItemProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `color` | `PlanetMarkerColor` | `'primary'` | The colour of the dot before the name. Match it to the place's marker. |
| `selected` | `boolean` | `false` | Draws the row as the one that has been picked. |

## In a Server Component

`Planet` is a client component. A Server Component cannot read `Planet.Globe` off the import, so import each part by name: `PlanetGlobe`, `PlanetMarker`, `PlanetControls`, `PlanetList`, `PlanetListItem`.

## Notes

#### Size

The globe is a square as wide as its container, up to 28rem. Set a width on `Planet` or on `Planet.Globe` with `className` to change it. The dots keep the same spacing in pixels at every size, so a small globe has fewer of them and stays crisp.

#### Colour

The dots and the shading are drawn in the text colour of the element. On a dark card the land is light, on a light card it is dark. A text colour class on `Planet.Globe`, such as `text-muted-foreground`, changes it.

`color` on `Planet.Globe` sets the light round the globe's edge, which is `primary` unless it names another of the theme's roles.

A marker's dot is the `primary` colour unless `color` names another of the theme's roles. Use the status roles when the colour means something, as the first example does for regions that are slow or down.

#### Rotation

`defaultRotation` is `[longitude, latitude]` of the point facing you, in degrees. It sets the opening view only. To move the globe afterwards, use the handle or let the reader drag it. `onRotationChange` is called each time the globe comes to rest.

The tilt stops at 60 degrees either way. Past that the far pole comes into view and the continents are seen from above, where they are hard to recognise.

#### Markers near the edge

A marker fades as its point approaches the edge of the globe and is gone when it passes behind. It stays in the page for a screen reader the whole time. Labels are not kept apart: two markers a few degrees from each other overlap, so merge nearby places into one marker with a `count`.

#### Pressing a marker

Give a marker `onClick` and it becomes a button: pressing its pin or its label calls it, it can be reached with Tab, and it grows a little under the pointer. `selected` draws it as the one that has been picked, larger and with a ring of its colour. A marker on the far side of the globe cannot be pressed or tabbed to.

A pressable marker is named for a screen reader by its `label`. Pass `name` when the label is not plain text or is only shown some of the time.

#### Touch

On a touch screen a horizontal drag turns the globe and a vertical one scrolls the page. Tilting needs a mouse, a pen or the arrow keys.

#### Keyboard and screen readers

The globe is announced as a slider whose value is the longitude facing you. Left and right turn it 15 degrees, up and down tilt it. Pass `interactive={false}` for a globe that cannot be turned, which is announced as an image.

#### The land data

The outlines are Natural Earth's 1:110m land polygons, which are in the public domain, reduced to one bit per square degree. Small islands are missing at that resolution, so a marker on one sits on open water.

## Example

```tsx
'use client';

import { useRef, useState } from 'react';
import { Planet, type PlanetHandle, type PlanetMarkerColor } from '@/components/panelui/planet';
import { Frame } from '@/components/panelui/frame';
import { Stat } from '@/components/panelui/stat';

type Health = 'healthy' | 'slow' | 'down';

/** The data centres a service runs in, and how each is answering. */
const REGIONS: { city: string; lat: number; lng: number; health: Health; ms: number | null }[] = [
  { city: 'Dublin', lat: 53.35, lng: -6.26, health: 'healthy', ms: 38 },
  { city: 'Warsaw', lat: 52.23, lng: 21.01, health: 'healthy', ms: 44 },
  { city: 'Johannesburg', lat: -26.2, lng: 28.05, health: 'slow', ms: 412 },
  { city: 'Mumbai', lat: 19.08, lng: 72.88, health: 'healthy', ms: 61 },
  { city: 'Singapore', lat: 1.35, lng: 103.82, health: 'healthy', ms: 52 },
  { city: 'Sydney', lat: -33.87, lng: 151.21, health: 'down', ms: null },
  { city: 'Seoul', lat: 37.57, lng: 126.98, health: 'healthy', ms: 47 },
  { city: 'São Paulo', lat: -23.55, lng: -46.63, health: 'healthy', ms: 73 },
  { city: 'Montreal', lat: 45.5, lng: -73.57, health: 'healthy', ms: 41 },
  { city: 'Portland', lat: 45.52, lng: -122.68, health: 'slow', ms: 286 },
];

const COLOUR: Record<Health, PlanetMarkerColor> = {
  healthy: 'success',
  slow: 'warning',
  down: 'destructive',
};

const SAYS: Record<Health, string> = {
  healthy: 'Answering normally',
  slow: 'Answering slowly',
  down: 'Not answering',
};

export default function PlanetRegions() {
  const planet = useRef<PlanetHandle>(null);
  const [picked, setPicked] = useState('Singapore');
  const region = REGIONS.find((entry) => entry.city === picked) ?? REGIONS[0];
  const healthy = REGIONS.filter((entry) => entry.health === 'healthy').length;

  const pick = (city: string) => {
    const next = REGIONS.find((entry) => entry.city === city);
    if (!next) return;
    setPicked(city);
    // Turned so the region faces you, a little short of its latitude so a
    // place far north or south is seen from the side.
    planet.current?.rotateTo([next.lng, next.lat * 0.5]);
  };

  return (
    <Frame variant="band" className="w-full max-w-2xl">
      <Frame.Header>
        <Frame.Title>Regions</Frame.Title>
        <Frame.Action>{healthy} of {REGIONS.length} healthy</Frame.Action>
      </Frame.Header>

      {/* The globe beside the list on a wide screen, over it on a narrow one. */}
      <Frame.Panel className="grid gap-5 p-5 sm:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] sm:items-center">
        <Planet ref={planet} defaultRotation={[103.82, 4]} className="mx-auto max-w-64 gap-3">
          <Planet.Globe label="Regions" color="info">
            {REGIONS.map((entry) => (
              <Planet.Marker
                key={entry.city}
                lat={entry.lat}
                lng={entry.lng}
                color={COLOUR[entry.health]}
                pulse={entry.health !== 'healthy'}
                selected={entry.city === picked}
                label={entry.city === picked ? entry.city : undefined}
                name={entry.city}
                onClick={() => pick(entry.city)}
              />
            ))}
          </Planet.Globe>
          <Planet.Controls />
        </Planet>

        <div className="flex min-w-0 flex-col gap-3">
          <Stat aria-live="polite">
            <Stat.Content>
              <Stat.Label>{region.city}</Stat.Label>
              <Stat.Description>{SAYS[region.health]}</Stat.Description>
            </Stat.Content>
            <Stat.Value size="md">
              {region.ms === null ? '\u2014' : region.ms}
              {region.ms === null ? null : <Stat.Unit>ms</Stat.Unit>}
            </Stat.Value>
          </Stat>

          <Planet.List>
            {REGIONS.map((entry) => (
              <Planet.ListItem
                key={entry.city}
                color={COLOUR[entry.health]}
                selected={entry.city === picked}
                onClick={() => pick(entry.city)}
              >
                {entry.city}
              </Planet.ListItem>
            ))}
          </Planet.List>
        </div>
      </Frame.Panel>
    </Frame>
  );
}
```
