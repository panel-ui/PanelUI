# Map

Vector map whose basemap is drawn from your theme tokens.
> **Alpha.** This API is still moving.


```tsx
import { Map } from 'panelui-native';
// Copied into the project with the CLI instead:
// import { Map } from '@/components/ui/map';
```

### Anatomy

```tsx
<Map>
  <Map.Marker lngLat={[…]}>
    <Map.Label>…</Map.Label>
    <Map.Popup>…</Map.Popup>
  </Map.Marker>
  <Map.Route coordinates={[…]} />
  <Map.Arc from={[…]} to={[…]} />
  <Map.GeoJSON data={…} />
  <Map.Cluster data={…} />
  <Map.Heatmap data={…} />
  <Map.UserLocation />
  <Map.Controls />
</Map>
```

### Variants

- **position** — `top-left`, `top-right`, `bottom-left`, `bottom-right` *(default)*

### Parts

- `Map.Marker` — A point drawn as React views, so it can hold anything the rest of the library can draw.
- `Map.Label` — A caption pinned to a marker and always visible, unlike a popup. `size` and `tone` are for maps carrying a lot of them at once.
- `Map.Popup` — A card anchored to a point — to the marker it sits inside, or to a coordinate of its own.
- `Map.Controls` — Zoom, compass and locate, as themed views rather than the renderer's own ornaments.
- `Map.Route` — A path across the map, drawn as a style layer so its cost does not grow with its length.
- `Map.Arc` — A curved connection between two points, bowed so arcs sharing an endpoint stay tellable apart.
- `Map.GeoJSON` — Arbitrary geography as a themed layer. `fill` takes a style expression, which is what makes a choropleth one layer instead of one per bucket.
- `Map.Cluster` — Dense points merged as they get too close to tell apart — the layer to reach for past a few dozen.
- `Map.Heatmap` — Point density as a continuous field — the layer for *where*, once the points are too many to count. `points` hands over to the records themselves as it fades out past `maxZoom`, so no zoom level shows neither.
- `Map.UserLocation` — The device's own position, drawn by the renderer.

### Props

#### `MapProps`

Extends `Omit<ViewProps, 'children'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | — |
| `center` | `LngLat` | — | Initial centre, `[longitude, latitude]`. |
| `zoom` | `number` | `2` | Initial zoom. 0 is the whole world; 18 is a building. |
| `bearing` | `number` | — | Initial bearing in degrees, clockwise from north. |
| `pitch` | `number` | — | Initial tilt in degrees. 0 looks straight down. |
| `bounds` | `LngLatBounds` | — | Frame these bounds instead of centring — `[west, south, east, north]`. Wins over `center` and `zoom` when both are given. |
| `blank` | `boolean` | `false` | Drop the basemap and keep only the ground colour. For data that carries its own geography — a choropleth, an arc diagram — where streets underneath are noise rather than context. |
| `source` | `BasemapSource` | — | Where the vector tiles come from. Defaults to CARTO, which is free for non-commercial use and licensed for everything else. Ignored when `mapStyle` is set, because that style names its own sources. |
| `mapStyle` | `string \| StyleSpecification` | — | Use this style wholesale instead of building one from tokens — a URL, or the style document itself. For a map that has to match something outside the app. Styles written for the browser can use properties the native renderer cannot parse, and it drops every layer that has one. `Map` translates them to the older names the renderer does read before handing the style over. To do that it fetches a URL itself, and draws nothing until the style has arrived. If the fetch fails, the URL goes to the renderer unchanged. |
| `rotatable` | `boolean` | `false` | Let the map rotate and tilt. Off by default — most maps only pan and zoom. |
| `interactive` | `boolean` | `true` | Turn off panning and zooming, for a map that is an illustration. |
| `onViewStateChange` | `(state: ViewState) => void` | — | Fires continuously while the map moves. |
| `onPress` | `(lngLat: LngLat, point: PixelPoint) => void` | — | Fires when the map is pressed somewhere that is not a feature. The second argument is the same press in screen coordinates, for anchoring something of your own to where the finger landed. |
| `onReady` | `() => void` | — | Fires once the style has loaded and the first frame is drawn. |

#### `MapMarkerProps`

Extends `Omit<PressableProps, 'children' \| 'onPress' \| 'style'>`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `lngLat` | `LngLat` | **required** | Where the marker sits, `[longitude, latitude]`. |
| `anchor` | `'center' \| 'top' \| 'bottom' \| 'left' \| 'right'` | `center` | Which part of the marker sits on the coordinate. A pin drawn above its point wants `bottom`; a dot centred on it wants the default. |
| `onPress` | `() => void` | — | Pressing the marker. Adds a button role when given. |
| `accessibilityLabel` | `string` | — | Explicit spoken name. Other React Native accessibility props pass through too. |
| `className` | `string` | — | — |
| `children` | `ReactNode` | — | Defaults to a dot. Anything else replaces it. |

#### `MapLabelProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | — |
| `className` | `string` | — | — |
| `side` | `'top' \| 'bottom'` | `bottom` | Which side of the marker the label sits on. |
| `size` | `'sm' \| 'md'` | `md` | `sm` for a map carrying a lot of them, where the pills start to collide. |
| `tone` | `'default' \| 'muted' \| 'primary'` | `default` | How loud the label is. `muted` for codes and counts that support the map without being its subject; `primary` for the one place being pointed at. |

#### `MapPopupProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | — |
| `className` | `string` | — | — |
| `title` | `string` | — | Heading above the content. Strings are wrapped for you. |
| `lngLat` | `LngLat` | — | Anchor to this coordinate instead of to an enclosing marker. Required when the popup is not inside one. |

#### `MapControlsProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `position` | `MapControlsPosition` | `bottom-right` | Which corner the stack sits in. |
| `zoom` | `boolean` | `2` | Zoom in and out. On by default — it is the one control a map always needs. |
| `locate` | `boolean` | `false` | Recentre on the device's location. Needs a location permission. |
| `compass` | `boolean` | `false` | Reset bearing and pitch to north and flat. |
| `recenter` | `boolean` | `false` | Return to the view the map opened on — its `bounds`, or its `center` and `zoom`. The same move as `MapHandle.recenter()`. |
| `className` | `string` | — | — |
| `onLocate` | `(lngLat: LngLat) => void` | — | Called with the located coordinate, so a caller can react to it. |

#### `MapRouteProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `coordinates` | `LngLat[]` | **required** | The path, in order. |
| `color` | `string` | — | Defaults to the primary token. |
| `width` | `number` | `3` | Line thickness in points. |
| `dashed` | `boolean` | `false` | Draw it dashed — for a leg that is planned rather than travelled. |
| `opacity` | `number` | `1` | 0 is invisible, 1 is solid. |
| `id` | `string` | `route` | — |

#### `MapArcProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `from` | `LngLat` | **required** | Where the arc starts. |
| `to` | `LngLat` | **required** | Where it ends. |
| `curvature` | `number` | `0.2` | How far it bows. 0 is a straight line; 0.2 is the default lift. |
| `color` | `string` | — | — |
| `width` | `number` | `3` | — |
| `opacity` | `number` | `1` | — |
| `id` | `string` | `route` | — |

#### `MapGeoJSONProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `unknown` | **required** | A Feature, FeatureCollection, or the URL of one. |
| `fill` | `string \| unknown[]` | — | Fill colour for polygons. A style expression works here too. |
| `stroke` | `string \| unknown[]` | — | Outline colour. Defaults to the border token. |
| `strokeWidth` | `number` | `1` | Outline thickness. |
| `fillOpacity` | `number` | `0.7` | 0 is invisible, 1 is solid. |
| `onPress` | `(feature: unknown) => void` | — | Fires with the pressed feature. |
| `accessibility` | `(feature: unknown, index: number) => MapFeatureAccessibility` | — | Describes each inline GeoJSON feature for the synchronized nonvisual list. |
| `id` | `string` | `route` | — |

#### `MapClusterProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `unknown` | **required** | Point features to cluster. |
| `color` | `string` | — | Defaults to the primary token. |
| `textColor` | `string` | — | Text colour inside a cluster bubble. |
| `radius` | `number` | `50` | How close two points have to be, in points, to merge. |
| `maxZoom` | `number` | `14` | Above this zoom every point stands alone. |
| `onPress` | `(feature: unknown) => void` | — | Fires with the pressed cluster or point. |
| `accessibility` | `(feature: unknown, index: number) => MapFeatureAccessibility` | — | Describes each source point for the synchronized nonvisual list. |
| `id` | `string` | `route` | — |

#### `MapHeatmapProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `data` | `unknown` | **required** | Point features to spread. |
| `weight` | `string` | — | Feature property to weight each point by. Unweighted when omitted. |
| `color` | `string` | — | Base colour of the field — a theme token by name, or a literal. The ramp is this colour at rising opacity, so density reads as *more of the same thing* rather than as a change of subject. Defaults to `--color-chart-2`, which is a saturated accent in every theme. It is deliberately not `--color-chart-1`: that is the series colour a chart is about, and every theme starts it on something close to the foreground — near-black in a light theme, near-white in a dark one — which over a basemap is a smudge rather than a measurement. |
| `colors` | `string[]` | — | Replace the derived ramp outright, coolest first. For the conventional heat ramp, where the hue carries the reading as well as the opacity — worth it when the field sits over varied terrain and one hue at five opacities stops being separable from what is underneath it. The first stop is drawn at the lowest density, the last at the highest. Density zero stays fully transparent either way. |
| `radius` | `number` | `50` | Spread of a single point, in points, at street zoom. Larger blurs more. The drawn radius shrinks as the map zooms out, so a point keeps covering roughly the same ground rather than the same screen area. |
| `intensity` | `number` | `1` | Overall strength. Raise it when the data is sparse. |
| `opacity` | `number` | `1` | 0 is invisible, 1 is solid. |
| `maxZoom` | `number` | `14` | Above this zoom the layer fades out — see the note on the component. |
| `points` | `boolean` | `false` | Draw the points themselves as the field fades out, coloured from the same ramp by weight. Without them, zooming past `maxZoom` leaves an empty map: the layer gets out of the way, and nothing takes its place. |
| `id` | `string` | `route` | — |

#### `MapUserLocationProps`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `heading` | `boolean` | `false` | Show which way the device is facing, not just where it is. |
| `accuracy` | `boolean` | `false` | Draw the ring showing how confident the fix is. |

### Example — Markers and popups

A popup inside a marker anchors to it and opens when it is pressed. Given a `lngLat` of its own it stands alone at that coordinate instead — the same component either way, because the difference is where it hangs rather than what it is.

```tsx
<Map center={[-74.006, 40.713]} zoom={11}>
  {offices.map((office) => (
    <Map.Marker
      key={office.id}
      lngLat={office.lngLat}
      accessibilityLabel={office.name}
      accessibilityHint="Show office details"
    >
      <Map.Popup title={office.name}>
        <Text size="xs" muted>{office.headcount} people</Text>
      </Map.Popup>
    </Map.Marker>
  ))}
</Map>
```

### Notes

### Why the basemap is assembled rather than downloaded

A hosted style ships its colours baked in, which gives you exactly two maps. Everything here is built from the same tokens as the rest of the library, so `moon`, `grass` and anything you add later get a basemap that matches them without a designer redrawing one per theme.

The layer list is deliberately short. A full street style runs to ninety-odd layers separating tunnel casings from bridge casings across eleven zoom stops; almost none of that survives being recoloured down to five greys, and every layer is another thing to keep in step with the tokens. What is there is the set that still reads as a map at any zoom: ground, water, green space, buildings, roads, boundaries, and the labels that make them findable.

Pass `mapStyle` to skip all of it and use a style wholesale, for a map that has to match something outside the app. See *Using a hosted style* above.

### Tile licensing

`Map` defaults to CARTO's street tiles, which are free for non-commercial use and require a licence from CARTO for commercial use. That is a decision about your project rather than about this component, so `source` takes any provider serving the OpenMapTiles schema.

### Controls and anything else you draw over the map

`Map.Controls` — and any view of your own written as a child of `Map` — is drawn above the map rather than inside the renderer. The renderer's own view lays its children out itself, so a view handed to it arrives stretched to the full size of the map and covering it. Splitting them means `position` lands where it says it does, and a control group written to sit in a corner sits in that corner.

What that leaves for you: put layers — `Map.Marker`, `Map.Route`, `Map.Arc`, `Map.GeoJSON`, `Map.Cluster`, `Map.Heatmap`, `Map.UserLocation` — inside `Map` and they reach the renderer. Everything else inside `Map` floats over it, positioned by your own classes, with touches passing through wherever it is not drawing.

### Moving the map from code

A ref on `Map` is a `MapHandle`:

| Method | What it does |
| --- | --- |
| `flyTo({ center, zoom?, duration? })` | Moves to a point. |
| `fitBounds(bounds, padding \| { padding?, duration? })` | Frames a box. Padding is one number, or `{ top, right, bottom, left }`. |
| `recenter(duration?)` | Returns to the view the map opened on. |
| `getViewState()` | Resolves to where the map is looking now. |

The `center`, `zoom` and `bounds` props set the opening view only. Changing them later does not move the map, so a re-render cannot pull it back mid-gesture. Use the ref to move it. For a control drawn inside the map, `useMap()` returns the same `recenter`.

### Markers or clusters

`Map.Marker` is a React view, which is what lets it hold an avatar, a chip, or anything else the library draws. That also means a marker costs what a view costs. Past a few dozen points use `Map.Cluster`, which draws in a style layer and merges points as they crowd — by the time markers become expensive they have also become unreadable, so the two limits arrive together.

### Labels on a crowded map

`Map.Label` is out of the marker's layout flow, and deliberately so: a marker sits on its coordinate by the centre of its box, so a label in flow beneath the pin would drag that centre down and lift every pin off the place it marks. The pill overhangs the marker by a wide margin on both sides, which is what lets a long name stay centred over a small dot without the marker being anchored by the name instead.

What that does not solve is a map with a dozen of them. `size="sm"` tightens the pill, and `tone="muted"` drops the text to the muted colour — together they are the difference between a network map and a wall of chips. The rule of thumb: label at `default` only the places the map is *about*, and let everything else support at `muted`. `tone="primary"` inverts the pill for the single place being pointed at.

---

Full page, with every example: https://panelui.dev/docs/components/map
