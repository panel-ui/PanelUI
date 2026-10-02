/**
 * The Map blocks — seven worked screens, one per full-page demo.
 *
 * Each is a whole screen rather than a snippet, because that is the only
 * honest way to show a map: squeezed into a section between two dividers it
 * demonstrates nothing except that it does not fit. They live here rather than
 * in `components.tsx` so the demo index stays a list of demos instead of a
 * thousand lines of dashboard.
 *
 * Every one of them is built from the same components the library ships. There
 * is no map-specific styling anywhere below — the point of a token-built
 * basemap is that the map and the cards over it are already the same material.
 */
import { useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ChevronLeftIcon,
  Chip,
  CompassIcon,
  Frame,
  Input,
  Item,
  Map,
  Progress,
  Separator,
  StarIcon,
  Text,
  XIcon,
  type LngLat,
  type MapHandle,
} from 'panelui-native';
import { useCSSVariable } from 'uniwind';
import { EUROPE_CODES, europeFeatures } from '../data/europe-outlines';

/** Reads a theme token for the style expressions the layers take. */
function useToken(name: string, fallback: string) {
  const value = useCSSVariable(name);
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/**
 * Deterministic pseudo-random numbers.
 *
 * The demos need figures that look measured rather than typed, but a real
 * random would reshuffle on every render and make the map twitch. Seeding it
 * from the key means the same country gets the same number every time.
 */
function seeded(key: string, min: number, max: number) {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const unit = Math.abs(Math.sin(hash)) % 1;
  return Math.round(min + unit * (max - min));
}

const EUROPE_BOUNDS: [number, number, number, number] = [-11, 35, 31, 63];

/* -------------------------------------------------------------------------- */
/* 1. Places                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The shape everyone already knows: a street map filling the screen, a search
 * field floating over it, pins you can press, and a card at the bottom for
 * whatever is selected.
 *
 * Nothing here is a chart. The other blocks put a map inside a dashboard, and
 * the honest thing to show first is a map that is the screen — with the search,
 * the locate button and the details card sitting *over* it, because on a map
 * every point of chrome is a point of geography you cannot see.
 */
const PLACES = [
  {
    id: 'nat',
    name: 'Natural History Museum',
    category: 'Museum',
    rating: 4.7,
    reviews: '92k',
    minutes: 14,
    open: 'Closes 17:50',
    lngLat: [-0.1763, 51.4967] as LngLat,
  },
  {
    id: 'vna',
    name: 'V&A',
    category: 'Museum',
    rating: 4.8,
    reviews: '61k',
    minutes: 12,
    open: 'Closes 17:45',
    lngLat: [-0.1719, 51.4966] as LngLat,
  },
  {
    id: 'hyde',
    name: 'Hyde Park',
    category: 'Park',
    rating: 4.7,
    reviews: '140k',
    minutes: 9,
    open: 'Open until midnight',
    lngLat: [-0.1657, 51.5073] as LngLat,
  },
  {
    id: 'harr',
    name: 'Harrods',
    category: 'Department store',
    rating: 4.4,
    reviews: '73k',
    minutes: 7,
    open: 'Closes 21:00',
    lngLat: [-0.1633, 51.4994] as LngLat,
  },
];

/** Where "you" are, so a distance and a route have somewhere to start. */
const HERE: LngLat = [-0.1622, 51.4936];

export function PlacesBlock() {
  const [selected, setSelected] = useState<(typeof PLACES)[number] | null>(null);
  const [directions, setDirections] = useState(false);
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();
  const map = useRef<MapHandle>(null);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return PLACES.filter(
      (place) =>
        place.name.toLowerCase().includes(needle) ||
        place.category.toLowerCase().includes(needle)
    );
  }, [query]);

  const select = (place: (typeof PLACES)[number]) => {
    setSelected(place);
    setDirections(false);
    setQuery('');
    // Through the ref, not through `center`: driving the camera from state
    // would undo the user's own panning on the next render.
    map.current?.flyTo({ center: place.lngLat, zoom: 15 });
  };

  return (
    <View className="flex-1">
      <Map ref={map} center={HERE} zoom={14}>
        {PLACES.map((place) => (
          <Map.Marker key={place.id} lngLat={place.lngLat} onPress={() => select(place)}>
            <View
              className={
                place.id === selected?.id
                  ? 'h-6 w-6 rounded-full border-[3px] border-background bg-primary shadow-md'
                  : 'h-4 w-4 rounded-full border-2 border-background bg-muted-foreground'
              }
            />
            {/* Only the selected pin is labelled. Four names at once is a map
                with the labels of everything on it and the shape of nothing. */}
            {place.id === selected?.id ? (
              <Map.Label side="top" size="sm" tone="primary">
                {place.name}
              </Map.Label>
            ) : null}
          </Map.Marker>
        ))}

        <Map.Marker lngLat={HERE}>
          <View className="h-4 w-4 rounded-full border-2 border-background bg-info" />
        </Map.Marker>

        {directions && selected ? (
          <Map.Route coordinates={[HERE, selected.lngLat]} width={5} />
        ) : null}

        <Map.Controls locate position="top-right" className="mt-32" />
      </Map>

      {/*
       * Over the map, not above it: a search bar in a header would take a strip
       * of geography away for the whole life of the screen.
       *
       * The safe-area inset is applied here rather than by the route. This demo
       * is full-bleed, which means it gets the screen with no header on it and
       * no back-swipe either — iOS claims the same edge for popping the stack
       * and wins — so the status bar and the way out are both this block's to
       * deal with.
       */}
      <View className="absolute start-4 end-4" style={{ top: insets.top + 8 }}>
        <Card>
          <Card.Content className="flex-row items-center gap-2 p-2">
            <Button
              size="icon"
              variant="ghost"
              accessibilityLabel="Back"
              onPress={() => router.back()}
            >
              <ChevronLeftIcon size={18} />
            </Button>
            {/* A real field. The bordered variants would draw a second edge
                inside the card that already has one, so this is the plain one
                with the card's own padding around it. */}
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Search here"
              containerClassName="flex-1"
              className="border-0 bg-transparent px-0"
              size="sm"
              returnKeyType="search"
              onSubmitEditing={() => matches[0] && select(matches[0])}
            />
            {query.length > 0 ? (
              <Button
                size="icon"
                variant="ghost"
                accessibilityLabel="Clear search"
                onPress={() => setQuery('')}
              >
                <XIcon size={16} />
              </Button>
            ) : (
              <Avatar size="sm" fallback="K" />
            )}
          </Card.Content>
        </Card>

        {/* Results replace the category chips rather than stacking under them:
            once you have typed, the chips are a second way to do the thing you
            are already doing. */}
        {query.trim() ? (
          <Card className="mt-2">
            {matches.length === 0 ? (
              <Card.Content className="p-3">
                <Text size="sm" muted>
                  Nothing here matches “{query.trim()}”.
                </Text>
              </Card.Content>
            ) : (
              matches.map((place) => (
                <Item key={place.id} size="sm" onPress={() => select(place)}>
                  <Item.Media variant="icon">
                    <CompassIcon size={16} />
                  </Item.Media>
                  <Item.Content>
                    <Item.Title>{place.name}</Item.Title>
                    <Item.Description>
                      {place.category} · {place.minutes} min walk
                    </Item.Description>
                  </Item.Content>
                </Item>
              ))
            )}
          </Card>
        ) : (
          <View className="mt-2 flex-row gap-2">
            {['Restaurants', 'Museums', 'Parks'].map((label) => (
              <Chip key={label} size="sm" onPress={() => setQuery(label.slice(0, -1))}>
                {label}
              </Chip>
            ))}
          </View>
        )}
      </View>

      {/* The details card. Absent until something is selected, because an
          empty one is a strip of map traded for nothing. */}
      {selected ? (
        <View
          className="absolute start-4 end-4"
          style={{ bottom: insets.bottom + 16 }}
        >
          <Card>
            <Card.Content className="gap-3 p-4">
              <View className="flex-row items-start gap-3">
                <View className="min-w-0 flex-1 gap-0.5">
                  <Text weight="semibold" numberOfLines={1}>
                    {selected.name}
                  </Text>
                  <View className="flex-row items-center gap-1.5">
                    <Text size="sm" weight="medium">
                      {selected.rating}
                    </Text>
                    <StarIcon size={12} filled />
                    <Text size="sm" muted numberOfLines={1}>
                      ({selected.reviews}) · {selected.category}
                    </Text>
                  </View>
                  <Text size="sm" muted numberOfLines={1}>
                    {selected.open} · {selected.minutes} min walk
                  </Text>
                </View>
                <Button
                  size="icon"
                  variant="ghost"
                  accessibilityLabel="Close"
                  onPress={() => setSelected(null)}
                >
                  <XIcon size={16} />
                </Button>
              </View>

              <View className="flex-row gap-2">
                <Button
                  className="flex-1"
                  size="sm"
                  onPress={() => setDirections((current) => !current)}
                >
                  {directions ? 'Hide route' : 'Directions'}
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Save
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Choropleth                                                              */
/* -------------------------------------------------------------------------- */

const METRICS = [
  { id: 'revenue', label: 'Revenue', unit: '€', min: 40, max: 9800 },
  { id: 'customers', label: 'Customers', unit: '', min: 12, max: 4200 },
  { id: 'churn', label: 'Churn', unit: '%', min: 1, max: 14 },
] as const;

export function ChoroplethBlock() {
  const [metric, setMetric] = useState<(typeof METRICS)[number]>(METRICS[0]);
  const muted = useToken('--color-muted', 'rgba(0,0,0,0.06)');
  const primary = useToken('--color-primary', '#262626');

  const { data, peak } = useMemo(() => {
    const values = Object.fromEntries(
      EUROPE_CODES.map((code) => [code, seeded(metric.id + code, metric.min, metric.max)])
    );
    return { data: europeFeatures(values), peak: Math.max(...Object.values(values)) };
  }, [metric]);

  return (
    <View className="flex-1">
      <View className="gap-3 p-4">
        <View className="gap-1">
          <Text size="lg" weight="semibold">{metric.label} by country</Text>
          <Text size="sm" muted>
            One layer, shaded by a style expression — not one layer per bucket.
          </Text>
        </View>
        <View className="flex-row gap-2">
          {METRICS.map((option) => (
            <Chip
              key={option.id}
              selected={option.id === metric.id}
              onPress={() => setMetric(option)}
            >
              {option.label}
            </Chip>
          ))}
        </View>
      </View>

      <View className="flex-1">
        <Map blank bounds={EUROPE_BOUNDS}>
          <Map.GeoJSON
            data={data}
            fill={['interpolate', ['linear'], ['get', 'value'], 0, muted, peak, primary]}
            fillOpacity={0.9}
            accessibility={(feature) => {
              const country = feature as (typeof data.features)[number];
              const suffix = metric.id === 'churn' ? '%' : '';
              const value = `${metric.unit}${country.properties.value.toLocaleString()}${suffix}`;
              return {
                label: `${country.properties.name}: ${value}`,
              };
            }}
          />
          {/* No position: the default corner, which nothing else on this
              screen is using. Recenter brings Europe back after a pan. */}
          <Map.Controls recenter />
        </Map>
      </View>

      {/* The ramp, as the thing it actually is: a strip of the same colours the
          layer uses, with only its ends labelled. */}
      <View className="gap-2 p-4">
        <View className="h-2 flex-row overflow-hidden rounded-full">
          {Array.from({ length: 12 }, (_, i) => (
            <View
              key={i}
              className="flex-1"
              style={{ backgroundColor: i === 0 ? muted : primary, opacity: 0.15 + (i / 11) * 0.85 }}
            />
          ))}
        </View>
        <View className="flex-row justify-between">
          <Text size="xs" muted>{metric.unit}0</Text>
          <Text size="xs" muted>
            {metric.unit}
            {peak.toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Heatmap                                                                 */
/* -------------------------------------------------------------------------- */

/** Clustered around real city centres, so the density has somewhere to be. */
const HOTSPOTS: LngLat[] = [
  [-0.128, 51.507], [2.352, 48.857], [13.405, 52.520],
  [4.895, 52.370], [12.496, 41.903], [-3.703, 40.417],
];

function scatter() {
  const points: { lngLat: LngLat; weight: number }[] = [];
  HOTSPOTS.forEach(([lng, lat], city) => {
    const count = 40 + city * 8;
    for (let i = 0; i < count; i += 1) {
      const key = `${city}-${i}`;
      points.push({
        lngLat: [
          lng + (seeded(`x${key}`, -140, 140) / 100) * 0.9,
          lat + (seeded(`y${key}`, -140, 140) / 100) * 0.5,
        ],
        weight: seeded(`w${key}`, 10, 100) / 100,
      });
    }
  });
  return {
    type: 'FeatureCollection' as const,
    features: points.map((p, i) => ({
      type: 'Feature' as const,
      id: i,
      properties: { weight: p.weight },
      geometry: { type: 'Point' as const, coordinates: p.lngLat },
    })),
  };
}

/**
 * The conventional heat ramp, passed in rather than derived.
 *
 * The derived default is one colour at rising opacity, which is right for a
 * field over an empty ground. Over streets and coastline the opacity alone
 * stops being separable from what is underneath it, and the hue has to carry
 * part of the reading — which is the whole reason every heatmap ever drawn
 * looks like this one.
 */
const HEAT_RAMP = ['#fff7bc', '#fee391', '#fec44f', '#fe9929', '#d7301f'];

/** The ramp as a row of blocks, which is the only thing that makes it legible. */
function HeatLegend() {
  return (
    <Card>
      <Card.Content className="gap-2 p-3">
        <Text size="xs" weight="medium">
          Reports per square kilometre
        </Text>
        <View className="h-2 flex-row overflow-hidden rounded-full">
          {HEAT_RAMP.map((color) => (
            <View key={color} className="flex-1" style={{ backgroundColor: color }} />
          ))}
        </View>
        <View className="flex-row justify-between">
          <Text size="xs" muted>
            Low
          </Text>
          <Text size="xs" muted>
            High
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
}

export function HeatmapBlock() {
  const data = useMemo(scatter, []);

  return (
    <View className="flex-1">
      <View className="gap-1 p-4">
        <Text size="lg" weight="semibold">Reported outages</Text>
        <Text size="sm" muted>
          Where, rather than how many. Zoom in and the field hands over to the
          reports it was made of.
        </Text>
      </View>
      <View className="flex-1">
        <Map bounds={[-10, 38, 20, 56]}>
          <Map.Heatmap
            data={data}
            weight="weight"
            radius={28}
            colors={HEAT_RAMP}
            // The handover: past `maxZoom - 2` the field fades and the points
            // it was made of fade in, so no zoom level shows neither.
            points
            maxZoom={9}
          />
          <Map.Controls position="top-right" />
        </Map>
        <View className="absolute bottom-4 start-4 end-4">
          <HeatLegend />
        </View>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Delivery tracker                                                        */
/* -------------------------------------------------------------------------- */

const LEG_DONE: LngLat[] = [
  [-0.128, 51.507], [-0.09, 51.52], [-0.02, 51.54], [0.09, 51.56],
];
// Starts where the driven leg ends, so the join is a change of style rather
// than a gap.
const LEG_LEFT: LngLat[] = [
  [0.09, 51.56], [0.22, 51.575], [0.36, 51.585],
];

/** Each stop sits on the route rather than near it — the line joins them. */
const STOPS: {
  id: string; name: string; time: string; done: boolean; lngLat: LngLat;
}[] = [
  { id: '1', name: 'Depot — Southwark', time: '08:12', done: true, lngLat: [-0.128, 51.507] },
  { id: '2', name: 'Shoreditch High St', time: '09:40', done: true, lngLat: [-0.02, 51.54] },
  { id: '3', name: 'Hackney Wick', time: '10:25', done: true, lngLat: [0.09, 51.56] },
  { id: '4', name: 'Stratford', time: '11:05', done: false, lngLat: [0.22, 51.575] },
  { id: '5', name: 'Ilford', time: '11:50', done: false, lngLat: [0.36, 51.585] },
];

export function DeliveryTrackerBlock() {
  const done = STOPS.filter((s) => s.done).length;

  return (
    <View className="flex-1">
      <View className="flex-[3]">
        <Map center={[0.02, 51.545]} zoom={10.5}>
          <Map.Route id="done" coordinates={LEG_DONE} width={4} />
          <Map.Route id="left" coordinates={LEG_LEFT} width={4} dashed opacity={0.5} />
          {STOPS.map((stop) => (
            <Map.Marker key={stop.id} lngLat={stop.lngLat}>
              <View
                className={
                  stop.done
                    ? 'h-3 w-3 rounded-full border-2 border-background bg-primary'
                    : 'h-3 w-3 rounded-full border-2 border-background bg-muted-foreground'
                }
              />
            </Map.Marker>
          ))}
          <Map.Controls position="top-right" />
        </Map>
      </View>

      <Card className="max-h-[62%] rounded-b-none">
        <Card.Content className="gap-4 p-4">
          <View className="flex-row items-center gap-3">
            <Avatar size="sm" fallback="RA" />
            <View className="min-w-0 flex-1">
              <Text weight="medium" numberOfLines={1}>Rana A.</Text>
              <Text size="xs" muted numberOfLines={1}>Van 12 · LX21 KTF</Text>
            </View>
            <Badge>ETA 11:50</Badge>
          </View>

          <View className="gap-1.5">
            <View className="flex-row justify-between">
              <Text size="xs" muted>{done} of {STOPS.length} stops</Text>
              <Text size="xs" muted>{Math.round((done / STOPS.length) * 100)}%</Text>
            </View>
            <Progress value={(done / STOPS.length) * 100} />
          </View>

          <Separator />

          <ScrollView contentContainerClassName="gap-2">
            {STOPS.map((stop) => (
              <View key={stop.id} className="flex-row items-center gap-3">
                <View
                  className={
                    stop.done ? 'h-2 w-2 rounded-full bg-primary' : 'h-2 w-2 rounded-full bg-border'
                  }
                />
                <Text size="sm" className="min-w-0 flex-1" muted={!stop.done} numberOfLines={1}>
                  {stop.name}
                </Text>
                <Text size="xs" muted>{stop.time}</Text>
              </View>
            ))}
          </ScrollView>
        </Card.Content>
      </Card>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Store locator                                                           */
/* -------------------------------------------------------------------------- */

const STORES = [
  { id: 'sh', name: 'Shoreditch', address: '14 Rivington St', lngLat: [-0.081, 51.526] as LngLat, open: true },
  { id: 'so', name: 'Soho', address: '9 Berwick St', lngLat: [-0.135, 51.513] as LngLat, open: true },
  { id: 'kx', name: 'King’s Cross', address: 'Unit 3, Coal Drops', lngLat: [-0.126, 51.535] as LngLat, open: false },
  { id: 'br', name: 'Brixton', address: '22 Atlantic Rd', lngLat: [-0.114, 51.463] as LngLat, open: true },
];

export function StoreLocatorBlock() {
  const [selected, setSelected] = useState(STORES[0]);
  const map = useRef<MapHandle>(null);

  /*
   * `center` only seeds the camera — driving it from state would fight the
   * user's own panning, since every gesture would be undone on the next
   * render. Selecting a store is an explicit request to go somewhere, so it
   * goes through the ref instead.
   */
  const select = (store: (typeof STORES)[number]) => {
    setSelected(store);
    map.current?.flyTo({ center: store.lngLat, zoom: 14 });
  };

  return (
    <View className="flex-1">
      {/* Split by ratio rather than letting the list size itself: a list that
          grows with its content eventually pushes the map off the screen. */}
      <View className="flex-[3]">
        <Map ref={map} center={selected.lngLat} zoom={14}>
          {STORES.map((store) => (
            <Map.Marker
              key={store.id}
              lngLat={store.lngLat}
              onPress={() => select(store)}
            >
              <View
                className={
                  store.id === selected.id
                    ? 'h-5 w-5 rounded-full border-2 border-background bg-primary shadow-md'
                    : 'h-3.5 w-3.5 rounded-full border-2 border-background bg-muted-foreground'
                }
              />
            </Map.Marker>
          ))}
          <Map.Controls locate position="top-right" />
        </Map>
      </View>

      <View className="flex-[2]">
        <ScrollView contentContainerClassName="gap-2 p-4">
          {STORES.map((store) => (
            <Item
              key={store.id}
              onPress={() => select(store)}
              className={store.id === selected.id ? 'border-primary' : undefined}
            >
              <Item.Content>
                <Item.Title>{store.name}</Item.Title>
                <Item.Description>{store.address}</Item.Description>
              </Item.Content>
              <Item.Actions>
                <Chip size="sm" variant={store.open ? 'success' : 'outline'}>
                  {store.open ? 'Open' : 'Closed'}
                </Chip>
              </Item.Actions>
            </Item>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Logistics network                                                       */
/* -------------------------------------------------------------------------- */

const HUBS: { id: string; name: string; lngLat: LngLat; tier: 'hub' | 'spoke' }[] = [
  { id: 'ams', name: 'Amsterdam', lngLat: [4.895, 52.37], tier: 'hub' },
  { id: 'lon', name: 'London', lngLat: [-0.128, 51.507], tier: 'hub' },
  { id: 'ber', name: 'Berlin', lngLat: [13.405, 52.52], tier: 'spoke' },
  { id: 'par', name: 'Paris', lngLat: [2.352, 48.857], tier: 'spoke' },
  { id: 'mad', name: 'Madrid', lngLat: [-3.703, 40.417], tier: 'spoke' },
  { id: 'mil', name: 'Milan', lngLat: [9.19, 45.464], tier: 'spoke' },
  { id: 'cph', name: 'Copenhagen', lngLat: [12.568, 55.676], tier: 'spoke' },
];

const LANES = [
  { from: 'ams', to: 'ber' }, { from: 'ams', to: 'cph' },
  { from: 'ams', to: 'mil' }, { from: 'lon', to: 'par' },
  { from: 'lon', to: 'mad' }, { from: 'lon', to: 'ams' },
];

export function LogisticsNetworkBlock() {
  const [origin, setOrigin] = useState<string | null>(null);
  const byId = useMemo(() => Object.fromEntries(HUBS.map((h) => [h.id, h])), []);
  const lanes = origin ? LANES.filter((l) => l.from === origin || l.to === origin) : LANES;

  return (
    <View className="flex-1">
      <View className="gap-3 p-4">
        <View className="gap-1">
          <Text size="lg" weight="semibold">Network</Text>
          <Text size="sm" muted>
            {lanes.length} lanes across {HUBS.length} sites.
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            <Chip selected={origin === null} onPress={() => setOrigin(null)}>
              All
            </Chip>
            {HUBS.filter((h) => h.tier === 'hub').map((hub) => (
              <Chip
                key={hub.id}
                selected={origin === hub.id}
                onPress={() => setOrigin(hub.id)}
              >
                {hub.name}
              </Chip>
            ))}
          </View>
        </ScrollView>
      </View>

      <View className="flex-1">
        <Map bounds={[-12, 36, 26, 60]}>
          {lanes.map((lane) => (
            <Map.Arc
              key={`${lane.from}-${lane.to}`}
              id={`${lane.from}-${lane.to}`}
              from={byId[lane.from].lngLat}
              to={byId[lane.to].lngLat}
              curvature={0.18}
              opacity={0.8}
            />
          ))}
          {HUBS.map((site) => (
            <Map.Marker key={site.id} lngLat={site.lngLat}>
              <View
                className={
                  site.tier === 'hub'
                    ? 'h-3.5 w-3.5 rounded-full border-2 border-background bg-primary'
                    : 'h-2.5 w-2.5 rounded-full border-2 border-background bg-muted-foreground'
                }
              />
              {/* The hubs are named at full strength and the spokes quietly,
                  so the network's shape survives fourteen labels at once. */}
              <Map.Label size="sm" tone={site.tier === 'hub' ? 'default' : 'muted'}>
                {site.name}
              </Map.Label>
            </Map.Marker>
          ))}
        </Map>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. Uptime monitor                                                          */
/* -------------------------------------------------------------------------- */

const NODES: {
  id: string; city: string; lngLat: LngLat; state: 'up' | 'slow' | 'down'; ms: number;
}[] = [
  { id: 'lhr', city: 'London', lngLat: [-0.128, 51.507], state: 'up', ms: 24 },
  { id: 'fra', city: 'Frankfurt', lngLat: [8.682, 50.11], state: 'up', ms: 31 },
  { id: 'iad', city: 'Ashburn', lngLat: [-77.487, 39.043], state: 'slow', ms: 186 },
  { id: 'sfo', city: 'San Francisco', lngLat: [-122.419, 37.775], state: 'up', ms: 42 },
  { id: 'sin', city: 'Singapore', lngLat: [103.82, 1.352], state: 'down', ms: 0 },
  { id: 'syd', city: 'Sydney', lngLat: [151.209, -33.868], state: 'up', ms: 88 },
];

const NODE_CHIP = {
  up: 'success',
  slow: 'warning',
  down: 'destructive',
} as const;

export function UptimeMonitorBlock() {
  const down = NODES.filter((n) => n.state !== 'up').length;

  return (
    <View className="flex-1">
      <View className="flex-1">
        <Map center={[0, 25]} zoom={1.1}>
          {NODES.map((node) => (
            <Map.Marker key={node.id} lngLat={node.lngLat}>
              <View
                className={
                  node.state === 'up'
                    ? 'h-3 w-3 rounded-full border-2 border-background bg-success'
                    : node.state === 'slow'
                      ? 'h-3 w-3 rounded-full border-2 border-background bg-warning'
                      : 'h-3 w-3 rounded-full border-2 border-background bg-destructive'
                }
              />
              {/* The dot already carries the state in its colour; the code is
                  only there to say which node it is. */}
              <Map.Label size="sm" tone="muted">
                {node.id.toUpperCase()}
              </Map.Label>
            </Map.Marker>
          ))}
        </Map>
      </View>

      <Frame className="rounded-b-none">
        <Frame.Header>
          <Frame.Title>Edge nodes</Frame.Title>
          <Frame.Action>
            <Chip size="sm" variant={down ? 'warning' : 'success'}>
              {down ? `${down} degraded` : 'All healthy'}
            </Chip>
          </Frame.Action>
        </Frame.Header>
        <Frame.Panel className="rounded-b-none">
          <ScrollView className="max-h-56">
            {NODES.map((node) => (
              <Frame.Row key={node.id}>
                <Frame.Content>
                  <Frame.Title>{node.city}</Frame.Title>
                  <Frame.Description>{node.id.toUpperCase()}</Frame.Description>
                </Frame.Content>
                <Frame.Actions>
                  <Text size="xs" muted>
                    {node.state === 'down' ? '—' : `${node.ms}ms`}
                  </Text>
                  <Chip size="sm" variant={NODE_CHIP[node.state]}>
                    {node.state}
                  </Chip>
                </Frame.Actions>
              </Frame.Row>
            ))}
          </ScrollView>
        </Frame.Panel>
      </Frame>
    </View>
  );
}
