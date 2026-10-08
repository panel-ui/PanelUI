/**
 * Map — a themed vector map.
 *
 * Everything visible is built from theme tokens rather than shipped as a
 * finished style, so the map belongs to whatever theme is active instead of
 * being the one rectangle on the screen that stayed grey. See `basemap.ts` for
 * how the style is assembled; the short version is that the tiles are bought
 * and the colours are ours.
 *
 * ```tsx
 * <Map center={[-0.12, 51.5]} zoom={11}>
 *   <Map.Marker lngLat={[-0.12, 51.5]}>
 *     <Map.Popup>
 *       <Text weight="medium">Charing Cross</Text>
 *     </Map.Popup>
 *   </Map.Marker>
 *   <Map.Controls locate />
 * </Map>
 * ```
 *
 * The renderer is native and optional, so `Map` has a state no other component
 * here does: it may be unable to draw at all. It says so in place rather than
 * throwing, because the usual way to reach that state is running in a client
 * that cannot load native modules, and a screen explaining the build you need
 * is more use than a stack trace.
 *
 * `Map.Popup` reads its position from the marker it sits inside, the way a
 * frame's title reads its weight from its slot. Given a `lngLat` of its own it
 * anchors to that coordinate instead, so the same name covers both the popup
 * attached to a pin and the one floating over a place with no pin at all.
 */
import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type ViewProps } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { tv } from 'tailwind-variants';
import {
  CompassIcon,
  CrosshairIcon,
  IconColorProvider,
  MaximizeIcon,
  MinusIcon,
  PlusIcon,
} from '../../icons';
import { Text, textChildren } from '../../primitives/text';
import { cn } from '../../utils/cn';
import {
  buildBasemapStyle,
  CARTO_SOURCE,
  type BasemapSource,
  type BasemapTokens,
} from './basemap';
import {
  hasMapLibre,
  MapLibre,
  type CameraRef,
  type LngLat,
  type LngLatBounds,
  type MapRef,
  type PixelPoint,
  type StyleSpecification,
  type ViewPadding,
  type ViewState,
} from './maplibre';
import {
  describeMapFeatures,
  type MapFeatureAccessibility,
  type MapFeatureAccessibilityDescription,
} from './map-accessibility';
import { asMapLayer, partitionMapChildren } from './map-children';
import { useNativeStyle } from './native-style';

export { hasMapLibre, CARTO_SOURCE };
export type {
  BasemapSource,
  BasemapTokens,
  LngLat,
  LngLatBounds,
  PixelPoint,
  ViewPadding,
  ViewState,
};
export type { MapFeatureAccessibility } from './map-accessibility';

const mapVariants = tv({
  slots: {
    root: 'flex-1 overflow-hidden',
    controls: 'absolute gap-2',
    // A control group is one surface split by hairlines rather than separate
    // buttons: at 36pt a gap between them reads as damage, not as spacing.
    group: 'overflow-hidden rounded-xl border border-border bg-card shadow-sm',
    control: 'h-9 w-9 items-center justify-center active:bg-muted',
    popup: 'rounded-xl border border-border bg-popover px-3 py-2 shadow-lg',
    pin: 'h-3.5 w-3.5 rounded-full border-2 border-background bg-primary shadow-md',
    // Opaque enough to read over a landmass fill, with an edge and a shadow so
    // it sits on the map rather than in it. At 85% the basemap's own roads and
    // borders showed through the text.
    label: 'rounded-md border border-border bg-background/95 shadow-sm',
    labelText: 'text-foreground',
  },
  variants: {
    position: {
      'top-left': { controls: 'left-3 top-3' },
      'top-right': { controls: 'right-3 top-3' },
      'bottom-left': { controls: 'bottom-3 left-3' },
      'bottom-right': { controls: 'bottom-3 right-3' },
    },
  },
  defaultVariants: { position: 'bottom-right' },
});

/**
 * The two knobs on a label's pill.
 *
 * Lookups rather than `tv()` variants because they belong to `Map.Label`, not
 * to `Map` — a variant here would be read off the root and documented as
 * something you could pass to the map itself.
 */
const labelSize: Record<'sm' | 'md', string> = {
  sm: 'px-1.5 py-px',
  md: 'px-2 py-0.5',
};

const labelTone: Record<'default' | 'muted' | 'primary', { pill: string; text: string }> = {
  default: { pill: '', text: '' },
  muted: { pill: '', text: 'text-muted-foreground' },
  primary: {
    pill: 'border-primary/24 bg-primary',
    text: 'text-primary-foreground',
  },
};

export type MapControlsPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

/** Reads a theme token, falling back when it resolves to something unusable. */
function useToken(name: string, fallback: string): string {
  const value = useCSSVariable(name);
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/** True for a theme token name, as opposed to a literal colour. */
function isToken(value: string | undefined): value is string {
  return typeof value === 'string' && value.startsWith('--');
}

/**
 * The same colour at a given alpha, for a ramp built from one hue.
 *
 * Style expressions are handed to the renderer as strings, so this produces
 * `rgba()` rather than reaching for a colour type the layer would not accept.
 */
function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split('')
            .map((c) => c + c)
            .join('')
        : hex.slice(0, 6);
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    if (Number.isNaN(r + g + b)) return color;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const channels = color.match(/rgba?\(([^)]+)\)/)?.[1];
  if (channels) {
    const [r, g, b] = channels.split(',').map((part) => part.trim());
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return color;
}

interface MapContextValue {
  mapRef: React.RefObject<MapRef | null>;
  cameraRef: React.RefObject<CameraRef | null>;
  /** The style has loaded and the map is drawing. */
  ready: boolean;
  /** Move the camera back to where the map opened. */
  recenter(duration?: number): void;
}

interface AccessibleFeatureGroup {
  features: MapFeatureAccessibilityDescription[];
  onPress?: (feature: unknown) => void;
}

interface InternalMapContextValue extends MapContextValue {
  registerAccessibleFeatures(id: string, group: AccessibleFeatureGroup | null): void;
}

const MapContext = createContext<InternalMapContextValue | null>(null);

/**
 * The map's camera and view state, from inside it.
 *
 * For a control, an overlay, or anything that has to move the map in response
 * to something that is not a gesture on it.
 */
export function useMap(): MapContextValue {
  const context = useContext(MapContext);
  if (!context) throw new Error('useMap must be used inside a <Map>.');
  return context;
}

/** Set by `Map.Marker`, so a popup inside one knows where it is. */
const MarkerContext = createContext<LngLat | null>(null);

/** How `fitBounds` frames its box. */
export interface MapFitBoundsOptions {
  /**
   * Points kept clear around the box. One number for every side, or per side
   * — for a sheet or a toolbar covering part of the map. Defaults to 48.
   */
  padding?: number | ViewPadding;
  /** Animation length in milliseconds. 0 jumps. Defaults to 900. */
  duration?: number;
}

export interface MapHandle {
  /** Move the camera, animating unless `duration` is 0. */
  flyTo(options: { center: LngLat; zoom?: number; duration?: number }): void;
  /**
   * Frame a bounding box, `[west, south, east, north]`. The second argument is
   * either the padding in points or a `MapFitBoundsOptions`.
   */
  fitBounds(bounds: LngLatBounds, options?: number | MapFitBoundsOptions): void;
  /**
   * Return to the opening view — the `bounds`, or `center` and `zoom`, the map
   * was mounted with. Animates unless `duration` is 0.
   */
  recenter(duration?: number): void;
  /** Where the map is looking right now. */
  getViewState(): Promise<ViewState | null>;
}

/** Expands a padding shorthand to the four sides the camera takes. */
function toViewPadding(padding: number | ViewPadding): ViewPadding {
  return typeof padding === 'number'
    ? { top: padding, right: padding, bottom: padding, left: padding }
    : padding;
}

export interface MapProps extends Omit<ViewProps, 'children'> {
  children?: ReactNode;
  /** Initial centre, `[longitude, latitude]`. */
  center?: LngLat;
  /** Initial zoom. 0 is the whole world; 18 is a building. */
  zoom?: number;
  /** Initial bearing in degrees, clockwise from north. */
  bearing?: number;
  /** Initial tilt in degrees. 0 looks straight down. */
  pitch?: number;
  /**
   * Frame these bounds instead of centring — `[west, south, east, north]`.
   * Wins over `center` and `zoom` when both are given.
   */
  bounds?: LngLatBounds;
  /**
   * Drop the basemap and keep only the ground colour. For data that carries
   * its own geography — a choropleth, an arc diagram — where streets
   * underneath are noise rather than context.
   */
  blank?: boolean;
  /**
   * Where the vector tiles come from. Defaults to CARTO, which is free for
   * non-commercial use and licensed for everything else.
   *
   * Ignored when `mapStyle` is set, because that style names its own sources.
   */
  source?: BasemapSource;
  /**
   * Use this style wholesale instead of building one from tokens — a URL, or
   * the style document itself. For a map that has to match something outside
   * the app.
   *
   * Styles written for the browser can use properties the native renderer
   * cannot parse, and it drops every layer that has one. `Map` translates
   * them to the older names the renderer does read before handing the style
   * over. To do that it fetches a URL itself, and draws nothing until the
   * style has arrived. If the fetch fails, the URL goes to the renderer
   * unchanged.
   */
  mapStyle?: string | StyleSpecification;
  /** Let the map rotate and tilt. Off by default — most maps only pan and zoom. */
  rotatable?: boolean;
  /** Turn off panning and zooming, for a map that is an illustration. */
  interactive?: boolean;
  /** Fires continuously while the map moves. */
  onViewStateChange?: (state: ViewState) => void;
  /**
   * Fires when the map is pressed somewhere that is not a feature. The second
   * argument is the same press in screen coordinates, for anchoring something
   * of your own to where the finger landed.
   */
  onPress?: (lngLat: LngLat, point: PixelPoint) => void;
  /** Fires once the style has loaded and the first frame is drawn. */
  onReady?: () => void;
}

/**
 * Shown when the renderer is missing. Deliberately explicit about the cause:
 * "map unavailable" sends people looking at their network, and the actual
 * problem is almost always a build that never included the native module.
 */
function MapUnavailable({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn(
        'flex-1 items-center justify-center gap-1 rounded-2xl border border-dashed border-border bg-muted/25 p-6',
        className
      )}
      accessibilityRole="alert"
      {...props}
    >
      <Text size="sm" weight="medium">
        Map renderer not installed
      </Text>
      <Text size="xs" muted className="text-center">
        Map needs a development build. Install
        @maplibre/maplibre-react-native, add its config plugin, and rebuild —
        it cannot run in a client that loads no native modules.
      </Text>
    </View>
  );
}

const MapRoot = forwardRef<MapHandle, MapProps>(function MapRoot(
  {
    children,
    className,
    center,
    zoom = 2,
    bearing,
    pitch,
    bounds,
    blank = false,
    source = CARTO_SOURCE,
    mapStyle,
    rotatable = false,
    interactive = true,
    onViewStateChange,
    onPress,
    onReady,
    ...props
  },
  ref
) {
  const slots = mapVariants();
  const mapRef = useRef<MapRef | null>(null);
  const cameraRef = useRef<CameraRef | null>(null);
  const [ready, setReady] = useState(false);
  const [accessibleFeatureGroups, setAccessibleFeatureGroups] = useState(
    () => new globalThis.Map<string, AccessibleFeatureGroup>()
  );

  const registerAccessibleFeatures = useCallback(
    (id: string, group: AccessibleFeatureGroup | null) => {
      setAccessibleFeatureGroups((current) => {
        const next = new globalThis.Map(current);
        if (group?.features.length) next.set(id, group);
        else next.delete(id);
        return next;
      });
    },
    []
  );

  // Every colour the style needs, resolved from the active theme. Hooks run
  // unconditionally, so they sit above the renderer check rather than inside it.
  const tokens: BasemapTokens = {
    background: useToken('--color-background', '#ffffff'),
    water: useToken('--color-muted', 'rgba(0,0,0,0.06)'),
    land: useToken('--color-surface-secondary', 'rgba(0,0,0,0.04)'),
    building: useToken('--color-surface-tertiary', 'rgba(0,0,0,0.08)'),
    line: useToken('--color-border', 'rgba(0,0,0,0.1)'),
    label: useToken('--color-muted-foreground', '#686868'),
    labelHalo: useToken('--color-background', '#ffffff'),
  };

  const built = useMemo(
    () => (mapStyle === undefined ? buildBasemapStyle(tokens, { blank, source }) : undefined),
    // The token object is rebuilt every render, so depend on its values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      mapStyle,
      blank,
      source,
      tokens.background,
      tokens.water,
      tokens.land,
      tokens.building,
      tokens.line,
      tokens.label,
      tokens.labelHalo,
    ]
  );

  // A caller's style is translated into what the native renderer can parse
  // first. `null` means a hosted one is still being fetched — see
  // `native-style.ts`.
  const hosted = useNativeStyle(mapStyle);
  const next = built ?? hosted;

  /*
   * The last style that was ready, so switching to a hosted one keeps drawing
   * the old style until the new one arrives. Without it the map would unmount
   * for the length of the fetch and come back at its opening position.
   */
  const [shown, setShown] = useState(next);
  useEffect(() => {
    if (next) setShown(next);
  }, [next]);
  const style = next ?? shown;

  // The opening view, kept from the first render. The props describe where
  // the map starts, not where it is, so a later change to them must not move
  // the target `recenter` returns to without the caller asking.
  const initialView = useRef({ center, zoom, bearing, pitch, bounds }).current;

  const recenter = useCallback(
    (duration = 600) => {
      const camera = cameraRef.current;
      if (!camera) return;
      if (initialView.bounds) {
        camera.fitBounds(initialView.bounds, { duration });
        return;
      }
      camera.flyTo({
        center: initialView.center ?? [0, 20],
        zoom: initialView.zoom,
        bearing: initialView.bearing ?? 0,
        pitch: initialView.pitch ?? 0,
        duration,
      });
    },
    [initialView]
  );

  useImperativeHandle(
    ref,
    () => ({
      flyTo: ({ center: to, zoom: z, duration = 900 }) =>
        cameraRef.current?.flyTo({ center: to, zoom: z, duration }),
      fitBounds: (box, options) => {
        const { padding = 48, duration = 900 } =
          typeof options === 'number' ? { padding: options } : (options ?? {});
        cameraRef.current?.fitBounds(box, {
          padding: toViewPadding(padding),
          duration,
        });
      },
      recenter,
      getViewState: async () => (await mapRef.current?.getViewState()) ?? null,
    }),
    [recenter]
  );

  const context = useMemo(
    () => ({ mapRef, cameraRef, ready, recenter, registerAccessibleFeatures }),
    [ready, recenter, registerAccessibleFeatures]
  );

  if (!hasMapLibre || !MapLibre) {
    return <MapUnavailable className={className} {...props} />;
  }

  const { Map: MapLibreMap, Camera } = MapLibre;

  /*
   * Only what the renderer understands is handed to it. Controls and any other
   * chrome are drawn as a sibling above the map instead, because the native map
   * view lays its own children out and would stretch an ordinary view over the
   * whole surface — see `map-children.ts`.
   */
  const { layers, overlay } = partitionMapChildren(children);

  return (
    <MapContext.Provider value={context}>
      <View className={slots.root({ className })} {...props}>
        {/* Nothing to draw until a hosted style has arrived the first time. */}
        {style ? (
          <MapLibreMap
            ref={mapRef}
            mapStyle={style}
            style={{ flex: 1 }}
            // The library's own ornaments are turned off across the board:
            // they are drawn by the renderer in its own style and cannot be
            // themed, so `Map.Controls` replaces them with views that can.
            logo={false}
            compass={false}
            attribution={false}
            scaleBar={false}
            dragPan={interactive}
            touchZoom={interactive}
            touchRotate={rotatable}
            touchPitch={rotatable}
            accessible={false}
            importantForAccessibility="no"
            onDidFinishLoadingMap={() => {
              setReady(true);
              onReady?.();
            }}
            onRegionDidChange={
              onViewStateChange
                ? (event) => onViewStateChange(event.nativeEvent)
                : undefined
            }
            onPress={
              onPress
                ? (event) => onPress(event.nativeEvent.lngLat, event.nativeEvent.point)
                : undefined
            }
          >
            <Camera
              ref={cameraRef}
              // The opening position, and only that: this is applied on the
              // first frame and never again, so a re-render cannot pull the map
              // back to its starting point mid-gesture. Everything afterwards
              // goes through the ref.
              initialViewState={
                bounds
                  ? { bounds }
                  : { center: center ?? [0, 20], zoom, bearing, pitch }
              }
            />
            {layers}
          </MapLibreMap>
        ) : null}
        {overlay.length > 0 ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {textChildren(overlay)}
          </View>
        ) : null}
        <View
          accessibilityRole="list"
          style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}
        >
          {[...accessibleFeatureGroups].flatMap(([groupId, group]) =>
            group.features.map(({ feature, label, hint, state }, index) =>
              group.onPress ? (
                <Pressable
                  key={`${groupId}-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityHint={hint}
                  accessibilityState={state}
                  onPress={() => group.onPress?.(feature)}
                />
              ) : (
                <View
                  key={`${groupId}-${index}`}
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={label}
                  accessibilityHint={hint}
                  accessibilityState={state}
                />
              )
            )
          )}
        </View>
      </View>
    </MapContext.Provider>
  );
});
MapRoot.displayName = 'Map';

export interface MapMarkerProps
  extends Omit<PressableProps, 'children' | 'onPress' | 'style'> {
  /** Where the marker sits, `[longitude, latitude]`. */
  lngLat: LngLat;
  /**
   * Which part of the marker sits on the coordinate. A pin drawn above its
   * point wants `bottom`; a dot centred on it wants the default.
   */
  anchor?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  /** Pressing the marker. Adds a button role when given. */
  onPress?: () => void;
  /** Explicit spoken name. Other React Native accessibility props pass through too. */
  accessibilityLabel?: string;
  className?: string;
  /** Defaults to a dot. Anything else replaces it. */
  children?: ReactNode;
}

/**
 * A point on the map, drawn as React views rather than as a style layer — so
 * it can be anything the rest of the library can draw. For hundreds of points
 * use `Map.Cluster` instead: a view per marker stops being affordable long
 * before the map stops being readable.
 */
function MapMarker({
  lngLat,
  anchor = 'center',
  onPress,
  className,
  children,
  accessibilityState,
  ...props
}: MapMarkerProps) {
  const slots = mapVariants();
  const [open, setOpen] = useState(false);

  /*
   * Popups are pulled out of the marker's own children rather than drawn
   * inside it. Left in place a popup would be laid out under the pin, which
   * costs twice: it would be permanently visible instead of opening on press,
   * and — because the marker is anchored by the centre of its box — a card
   * below the pin would drag that centre downward and leave the pin sitting
   * well above the coordinate it is meant to mark.
   */
  const popups: ReactNode[] = [];
  const labels: ReactNode[] = [];
  const content: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      content.push(child);
    } else if (child.type === MapPopup) {
      popups.push(child);
    } else if (child.type === MapLabel) {
      labels.push(child);
    } else {
      content.push(child);
    }
  });

  if (!MapLibre) return null;
  const { Marker } = MapLibre;

  /*
   * Labels are counted separately from the rest of the children because they
   * are absolutely positioned, and so contribute nothing to the marker's box.
   * A marker whose only child is a label would otherwise measure 0×0 — and the
   * renderer cannot place a zero-sized annotation, so it parks it in the
   * top-left corner of the map instead of on its coordinate. Falling back to
   * the default pin keeps the box real, which is also the right drawing: a
   * label with nothing to label is a caption floating on its own.
   */
  const pressable = onPress || popups.length > 0;
  const body = (
    <View
      {...(!pressable ? props : {})}
      accessibilityState={!pressable ? accessibilityState : undefined}
      className={cn('items-center', className)}
    >
      {content.length > 0 ? content : <View className={slots.pin()} />}
      {labels}
    </View>
  );

  return (
    <MarkerContext.Provider value={lngLat}>
      <Marker lngLat={lngLat} anchor={anchor}>
        {pressable ? (
          <Pressable
            {...props}
            accessibilityRole="button"
            accessibilityState={
              popups.length > 0 ? { ...accessibilityState, expanded: open } : accessibilityState
            }
            onPress={() => {
              if (popups.length > 0) setOpen((was) => !was);
              onPress?.();
            }}
          >
            {body}
          </Pressable>
        ) : (
          body
        )}
      </Marker>
      {open ? popups : null}
    </MarkerContext.Provider>
  );
}
MapMarker.displayName = 'Map.Marker';
asMapLayer(MapMarker);

export interface MapLabelProps {
  children?: ReactNode;
  className?: string;
  /** Which side of the marker the label sits on. */
  side?: 'top' | 'bottom';
  /** `sm` for a map carrying a lot of them, where the pills start to collide. */
  size?: 'sm' | 'md';
  /**
   * How loud the label is. `muted` for codes and counts that support the map
   * without being its subject; `primary` for the one place being pointed at.
   */
  tone?: 'default' | 'muted' | 'primary';
}

/**
 * A caption pinned to a marker. Always visible, unlike a popup — for the
 * handful of places whose names are the point of the map.
 *
 * It is taken out of the marker's layout flow, which matters more than it
 * sounds: a marker sits on its coordinate by the centre of its box, so a label
 * in flow underneath the pin would pull that centre down and lift every pin
 * off the place it marks. Absolute keeps the box the size of the pin.
 *
 * The overhang on each side is what lets a long name stay centred on the pin
 * without widening the marker — a name is usually far wider than the dot it
 * belongs to, and a box sized to the name would be anchored by the name.
 */
function MapLabel({
  children,
  className,
  side = 'bottom',
  size = 'md',
  tone = 'default',
}: MapLabelProps) {
  const { label, labelText } = mapVariants();
  const shade = labelTone[tone];

  return (
    <View
      pointerEvents="none"
      className={cn(
        'absolute items-center',
        // 6pt of clearance rather than 4: the pill has a border now, and at 4
        // its edge and the pin's ring read as one smudged shape.
        side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
      )}
      style={{ left: -120, right: -120 }}
    >
      <View className={label({ className: cn(labelSize[size], shade.pill, className) })}>
        {textChildren(children, (text) => (
          <Text
            size="xs"
            weight="medium"
            numberOfLines={1}
            className={labelText({ className: shade.text })}
          >
            {text}
          </Text>
        ))}
      </View>
    </View>
  );
}
MapLabel.displayName = 'Map.Label';

export interface MapPopupProps {
  children?: ReactNode;
  className?: string;
  /** Heading above the content. Strings are wrapped for you. */
  title?: string;
  /**
   * Anchor to this coordinate instead of to an enclosing marker. Required when
   * the popup is not inside one.
   */
  lngLat?: LngLat;
}

/**
 * A card anchored to a point.
 *
 * Inside a `Map.Marker` it takes that marker's coordinate and opens when the
 * marker is pressed. Given a `lngLat` it stands alone at that coordinate — the
 * same component either way, because the difference is where it is anchored
 * rather than what it is.
 *
 * Either way it is its own annotation rather than something drawn inside the
 * marker, which is what keeps a card from dragging the pin off its coordinate.
 * Anchored by its bottom edge, so it floats above the point it describes
 * instead of covering it.
 */
function MapPopup({ children, className, title, lngLat }: MapPopupProps) {
  const slots = mapVariants();
  const markerLngLat = useContext(MarkerContext);
  const coordinate = lngLat ?? markerLngLat;

  if (!MapLibre || !coordinate) return null;
  const { Marker } = MapLibre;

  return (
    <Marker lngLat={coordinate} anchor="bottom">
      <View className={cn('mb-2 items-center', slots.popup({ className }))}>
        {title ? (
          <Text size="sm" weight="medium">
            {title}
          </Text>
        ) : null}
        {textChildren(children)}
      </View>
    </Marker>
  );
}
MapPopup.displayName = 'Map.Popup';
asMapLayer(MapPopup);

export interface MapControlsProps {
  /** Which corner the stack sits in. */
  position?: MapControlsPosition;
  /** Zoom in and out. On by default — it is the one control a map always needs. */
  zoom?: boolean;
  /** Recentre on the device's location. Needs a location permission. */
  locate?: boolean;
  /** Reset bearing and pitch to north and flat. */
  compass?: boolean;
  /**
   * Return to the view the map opened on — its `bounds`, or its `center` and
   * `zoom`. The same move as `MapHandle.recenter()`.
   */
  recenter?: boolean;
  className?: string;
  /** Called with the located coordinate, so a caller can react to it. */
  onLocate?: (lngLat: LngLat) => void;
}

function ControlButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  const slots = mapVariants();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className={slots.control()}
      onPress={onPress}
    >
      {textChildren(children)}
    </Pressable>
  );
}

/**
 * The map's own chrome, as themed views.
 *
 * The renderer draws its own zoom and compass ornaments, but in its style
 * rather than the app's, and they cannot be recoloured — so they are turned
 * off in `Map` and replaced here by buttons built from the same tokens as
 * every other control in the library.
 */
function MapControls({
  position = 'bottom-right',
  zoom = true,
  locate = false,
  compass = false,
  recenter = false,
  className,
  onLocate,
}: MapControlsProps) {
  const slots = mapVariants({ position });
  const { mapRef, cameraRef, recenter: returnToStart } = useMap();
  // Every glyph takes the theme's icon colour from here rather than from its
  // own default, which was chosen for wherever that icon first appeared — the
  // minus sign's is white, for a checked checkbox, and vanished on the card.
  const iconTint = useToken('--color-muted-foreground', '#737373');

  // Read the live zoom rather than tracking it in state: the map is moved by
  // gestures too, and a counter kept alongside it drifts on the first pinch.
  const nudgeZoom = useCallback(
    async (delta: number) => {
      const map = mapRef.current;
      const camera = cameraRef.current;
      if (!map || !camera) return;
      const [center, current] = await Promise.all([
        map.getCenter(),
        map.getZoom(),
      ]);
      camera.easeTo({
        center,
        zoom: Math.min(22, Math.max(0, current + delta)),
        duration: 250,
      });
    },
    [mapRef, cameraRef]
  );

  const handleLocate = useCallback(async () => {
    let position$: { coords: { longitude: number; latitude: number } } | null =
      null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const location = require('expo-location');
      const granted = await location.requestForegroundPermissionsAsync();
      if (!granted?.granted) return;
      position$ = await location.getCurrentPositionAsync({});
    } catch {
      return;
    }
    if (!position$) return;
    const lngLat: LngLat = [
      position$.coords.longitude,
      position$.coords.latitude,
    ];
    cameraRef.current?.flyTo({ center: lngLat, zoom: 14, duration: 900 });
    onLocate?.(lngLat);
  }, [cameraRef, onLocate]);

  const resetNorth = useCallback(async () => {
    const center = await mapRef.current?.getCenter();
    if (!center) return;
    cameraRef.current?.easeTo({ center, bearing: 0, pitch: 0, duration: 300 });
  }, [mapRef, cameraRef]);

  return (
    <IconColorProvider color={iconTint}>
      <View className={slots.controls({ className })}>
        {zoom ? (
          <View className={slots.group()}>
            <ControlButton label="Zoom in" onPress={() => nudgeZoom(1)}>
              <PlusIcon size={16} />
            </ControlButton>
            <View className="h-px bg-border" />
            <ControlButton label="Zoom out" onPress={() => nudgeZoom(-1)}>
              <MinusIcon size={16} strokeWidth={2} />
            </ControlButton>
          </View>
        ) : null}
        {recenter ? (
          <View className={slots.group()}>
            <ControlButton label="Recenter map" onPress={() => returnToStart()}>
              <MaximizeIcon size={16} />
            </ControlButton>
          </View>
        ) : null}
        {compass ? (
          <View className={slots.group()}>
            <ControlButton label="Face north" onPress={resetNorth}>
              <CompassIcon size={16} />
            </ControlButton>
          </View>
        ) : null}
        {locate ? (
          <View className={slots.group()}>
            <ControlButton label="Show my location" onPress={handleLocate}>
              <CrosshairIcon size={16} />
            </ControlButton>
          </View>
        ) : null}
      </View>
    </IconColorProvider>
  );
}
MapControls.displayName = 'Map.Controls';

/** Turns a token into a colour a style layer can use. */
function useLineColor(color?: string) {
  const fallback = useToken('--color-primary', '#262626');
  return color ?? fallback;
}

export interface MapRouteProps {
  /** The path, in order. */
  coordinates: LngLat[];
  /** Defaults to the primary token. */
  color?: string;
  /** Line thickness in points. */
  width?: number;
  /** Draw it dashed — for a leg that is planned rather than travelled. */
  dashed?: boolean;
  /** 0 is invisible, 1 is solid. */
  opacity?: number;
  id?: string;
}

/**
 * A path across the map, drawn as a style layer rather than as views — so its
 * cost does not grow with the number of points in it.
 */
function MapRoute({
  coordinates,
  color,
  width = 3,
  dashed = false,
  opacity = 1,
  id = 'route',
}: MapRouteProps) {
  const stroke = useLineColor(color);
  const data = useMemo(
    () => ({
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'LineString' as const, coordinates },
    }),
    [coordinates]
  );

  if (!MapLibre) return null;
  const { GeoJSONSource, Layer } = MapLibre;

  return (
    <GeoJSONSource id={`${id}-source`} data={data} lineMetrics>
      <Layer
        id={id}
        type="line"
        style={{
          lineColor: stroke,
          lineWidth: width,
          lineOpacity: opacity,
          lineCap: 'round',
          lineJoin: 'round',
          ...(dashed ? { lineDasharray: [2, 1.5] } : {}),
        }}
      />
    </GeoJSONSource>
  );
}
MapRoute.displayName = 'Map.Route';
asMapLayer(MapRoute);

export interface MapArcProps {
  /** Where the arc starts. */
  from: LngLat;
  /** Where it ends. */
  to: LngLat;
  /** How far it bows. 0 is a straight line; 0.2 is the default lift. */
  curvature?: number;
  color?: string;
  width?: number;
  opacity?: number;
  id?: string;
}

/**
 * A curved connection between two points.
 *
 * The curve is not geography — a great circle between two cities is not bowed
 * on a flat projection. It is there so that two arcs sharing an endpoint stay
 * tellable apart, which a bundle of straight lines through one city does not.
 */
function MapArc({
  from,
  to,
  curvature = 0.2,
  color,
  width = 2,
  opacity = 0.9,
  id = 'arc',
}: MapArcProps) {
  const stroke = useLineColor(color);

  const data = useMemo(() => {
    // A quadratic Bézier whose control point is pushed off the midpoint
    // perpendicular to the line, so the bow scales with the distance rather
    // than being a fixed lift that vanishes on long hops.
    const [x1, y1] = from;
    const [x2, y2] = to;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const controlX = midX - (y2 - y1) * curvature;
    const controlY = midY + (x2 - x1) * curvature;

    const SEGMENTS = 64;
    const coordinates: LngLat[] = [];
    for (let i = 0; i <= SEGMENTS; i += 1) {
      const t = i / SEGMENTS;
      const inv = 1 - t;
      coordinates.push([
        inv * inv * x1 + 2 * inv * t * controlX + t * t * x2,
        inv * inv * y1 + 2 * inv * t * controlY + t * t * y2,
      ]);
    }
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'LineString' as const, coordinates },
    };
  }, [from, to, curvature]);

  if (!MapLibre) return null;
  const { GeoJSONSource, Layer } = MapLibre;

  return (
    <GeoJSONSource id={`${id}-source`} data={data} lineMetrics>
      <Layer
        id={id}
        type="line"
        style={{
          lineColor: stroke,
          lineWidth: width,
          lineOpacity: opacity,
          lineCap: 'round',
        }}
      />
    </GeoJSONSource>
  );
}
MapArc.displayName = 'Map.Arc';
asMapLayer(MapArc);

export interface MapGeoJSONProps {
  /** A Feature, FeatureCollection, or the URL of one. */
  data: unknown;
  /** Fill colour for polygons. A style expression works here too. */
  fill?: string | unknown[];
  /** Outline colour. Defaults to the border token. */
  stroke?: string | unknown[];
  /** Outline thickness. */
  strokeWidth?: number;
  /** 0 is invisible, 1 is solid. */
  fillOpacity?: number;
  /** Fires with the pressed feature. */
  onPress?: (feature: unknown) => void;
  /** Describes each inline GeoJSON feature for the synchronized nonvisual list. */
  accessibility?: (feature: unknown, index: number) => MapFeatureAccessibility;
  id?: string;
}

/**
 * Arbitrary geography as a themed layer — the component behind a choropleth,
 * a coverage area, or any other shape that comes from data rather than from
 * the basemap.
 *
 * `fill` takes a style expression as well as a colour, which is what makes a
 * choropleth one layer instead of one layer per bucket.
 */
function MapGeoJSON({
  data,
  fill,
  stroke,
  strokeWidth = 1,
  fillOpacity = 0.7,
  onPress,
  accessibility,
  id = 'geojson',
}: MapGeoJSONProps) {
  const defaultFill = useToken('--color-primary', '#262626');
  const defaultStroke = useToken('--color-border', 'rgba(0,0,0,0.1)');
  useAccessibleMapFeatures(id, data, accessibility, onPress);

  if (!MapLibre) return null;
  const { GeoJSONSource, Layer } = MapLibre;

  return (
    <GeoJSONSource
      id={`${id}-source`}
      data={data}
      onPress={
        onPress
          ? (event) => onPress(event.nativeEvent.features?.[0])
          : undefined
      }
    >
      <Layer
        id={`${id}-fill`}
        type="fill"
        style={{
          fillColor: fill ?? defaultFill,
          fillOpacity,
        }}
      />
      <Layer
        id={`${id}-line`}
        type="line"
        style={{
          lineColor: stroke ?? defaultStroke,
          lineWidth: strokeWidth,
        }}
      />
    </GeoJSONSource>
  );
}
MapGeoJSON.displayName = 'Map.GeoJSON';
asMapLayer(MapGeoJSON);

export interface MapClusterProps {
  /** Point features to cluster. */
  data: unknown;
  /** Defaults to the primary token. */
  color?: string;
  /** Text colour inside a cluster bubble. */
  textColor?: string;
  /** How close two points have to be, in points, to merge. */
  radius?: number;
  /** Above this zoom every point stands alone. */
  maxZoom?: number;
  /** Fires with the pressed cluster or point. */
  onPress?: (feature: unknown) => void;
  /** Describes each source point for the synchronized nonvisual list. */
  accessibility?: (feature: unknown, index: number) => MapFeatureAccessibility;
  id?: string;
}

/**
 * Dense points, merged as they get too close to tell apart.
 *
 * This is the layer to reach for past a few dozen points: `Map.Marker` mounts
 * a React view each, which a thousand points cannot afford, and a thousand
 * overlapping pins would be unreadable even if it could.
 */
function MapCluster({
  data,
  color,
  textColor,
  radius = 50,
  maxZoom = 14,
  onPress,
  accessibility,
  id = 'cluster',
}: MapClusterProps) {
  const fill = useToken('--color-primary', '#262626');
  const onFill = useToken('--color-primary-foreground', '#fafafa');
  const bubble = color ?? fill;
  const ink = textColor ?? onFill;
  useAccessibleMapFeatures(id, data, accessibility, onPress);

  if (!MapLibre) return null;
  const { GeoJSONSource, Layer } = MapLibre;

  return (
    <GeoJSONSource
      id={`${id}-source`}
      data={data}
      cluster
      clusterRadius={radius}
      clusterMaxZoom={maxZoom}
      onPress={
        onPress
          ? (event) => onPress(event.nativeEvent.features?.[0])
          : undefined
      }
    >
      {/* Bubbles grow in steps rather than continuously: the point is to read
          "more than that one", not to estimate a count from an area. */}
      <Layer
        id={`${id}-bubble`}
        type="circle"
        filter={['has', 'point_count']}
        style={{
          circleColor: bubble,
          circleRadius: ['step', ['get', 'point_count'], 16, 25, 22, 100, 28],
          circleStrokeWidth: 2,
          circleStrokeColor: ink,
          circleStrokeOpacity: 0.25,
        }}
      />
      <Layer
        id={`${id}-count`}
        type="symbol"
        filter={['has', 'point_count']}
        style={{
          textField: ['get', 'point_count_abbreviated'],
          textSize: 12,
          textColor: ink,
        }}
      />
      <Layer
        id={`${id}-point`}
        type="circle"
        filter={['!', ['has', 'point_count']]}
        style={{
          circleColor: bubble,
          circleRadius: 6,
          circleStrokeWidth: 2,
          circleStrokeColor: ink,
          circleStrokeOpacity: 0.4,
        }}
      />
    </GeoJSONSource>
  );
}
MapCluster.displayName = 'Map.Cluster';
asMapLayer(MapCluster);

function useAccessibleMapFeatures(
  id: string,
  data: unknown,
  accessibility: MapGeoJSONProps['accessibility'],
  onPress?: (feature: unknown) => void
) {
  const registerAccessibleFeatures = useContext(MapContext)?.registerAccessibleFeatures;
  const features = useMemo(
    () => (accessibility ? describeMapFeatures(data, accessibility) : []),
    [accessibility, data]
  );

  useEffect(() => {
    if (!accessibility || !registerAccessibleFeatures) return;
    registerAccessibleFeatures(id, { features, onPress });
    return () => registerAccessibleFeatures(id, null);
  }, [accessibility, features, id, onPress, registerAccessibleFeatures]);
}

export interface MapHeatmapProps {
  /** Point features to spread. */
  data: unknown;
  /** Feature property to weight each point by. Unweighted when omitted. */
  weight?: string;
  /**
   * Base colour of the field — a theme token by name, or a literal. The ramp
   * is this colour at rising opacity, so density reads as *more of the same
   * thing* rather than as a change of subject.
   *
   * Defaults to `--color-chart-2`, which is a saturated accent in every theme.
   * It is deliberately not `--color-chart-1`: that is the series colour a chart
   * is about, and every theme starts it on something close to the foreground —
   * near-black in a light theme, near-white in a dark one — which over a
   * basemap is a smudge rather than a measurement.
   */
  color?: string;
  /**
   * Replace the derived ramp outright, coolest first. For the conventional
   * heat ramp, where the hue carries the reading as well as the opacity —
   * worth it when the field sits over varied terrain and one hue at five
   * opacities stops being separable from what is underneath it.
   *
   * The first stop is drawn at the lowest density, the last at the highest.
   * Density zero stays fully transparent either way.
   */
  colors?: string[];
  /**
   * Spread of a single point, in points, at street zoom. Larger blurs more.
   * The drawn radius shrinks as the map zooms out, so a point keeps covering
   * roughly the same ground rather than the same screen area.
   */
  radius?: number;
  /** Overall strength. Raise it when the data is sparse. */
  intensity?: number;
  /** 0 is invisible, 1 is solid. */
  opacity?: number;
  /** Above this zoom the layer fades out — see the note on the component. */
  maxZoom?: number;
  /**
   * Draw the points themselves as the field fades out, coloured from the same
   * ramp by weight. Without them, zooming past `maxZoom` leaves an empty map:
   * the layer gets out of the way, and nothing takes its place.
   */
  points?: boolean;
  id?: string;
}

/**
 * Point density as a continuous field.
 *
 * The opposite trade to `Map.Cluster`: a cluster keeps every point countable
 * and tells you nothing about the space between them, while a heatmap shows
 * the shape of the distribution and no longer lets you count anything. Reach
 * for it when the question is *where* rather than *how many*.
 *
 * It fades out past `maxZoom` on purpose. Zoomed far enough in, every point is
 * its own island and the blur says less than the points would — so the layer
 * gets out of the way rather than smearing five records across a street. Set
 * `points` and the records themselves fade in as it goes, which is the whole
 * handover: a field while the question is where, marks once it is which.
 *
 * The radius is tied to zoom for the mirror-image reason. Left as a fixed
 * number of screen points it would mean a different distance at every zoom:
 * a blur that reads as a city at street level covers half a continent once
 * the map is pulled out, and a field measured over land ends up sitting in
 * the sea. Scaling it with the projection keeps the claim the same one.
 *
 * Intensity is tied to zoom too, and in the other direction. The same points
 * are packed into fewer pixels the further out the map goes, so a constant
 * intensity saturates the whole field at world zoom and shows nothing but its
 * own ceiling.
 */
function MapHeatmap({
  data,
  weight,
  color,
  colors,
  radius = 24,
  intensity = 1,
  opacity = 0.85,
  maxZoom = 15,
  points = false,
  id = 'heatmap',
}: MapHeatmapProps) {
  const base = useToken(isToken(color) ? color : '--color-chart-2', '#3b82f6');
  const resolved = (isToken(color) ? base : color) ?? base;

  /*
   * One colour at rising opacity rather than five colours, which is how every
   * other ramp in the library is built: a sequential scale is one quantity
   * getting larger, and five hues say five categories. `colors` is there for
   * the case where that is not enough.
   */
  const ramp = colors?.length
    ? colors
    : [
        withAlpha(resolved, 0.25),
        withAlpha(resolved, 0.45),
        withAlpha(resolved, 0.7),
        withAlpha(resolved, 0.9),
        resolved,
      ];

  if (!MapLibre) return null;
  const { GeoJSONSource, Layer } = MapLibre;

  // Density zero is transparent rather than the coolest colour, so the map
  // shows through everywhere nothing was measured instead of the whole
  // viewport being tinted by the absence of data.
  const stops = ramp.flatMap((entry, index) => [
    0.15 + (0.85 * index) / Math.max(1, ramp.length - 1),
    entry,
  ]);

  return (
    <GeoJSONSource id={`${id}-source`} data={data}>
      <Layer
        id={id}
        type="heatmap"
        maxzoom={maxZoom}
        style={{
          heatmapWeight: weight
            ? ['interpolate', ['linear'], ['get', weight], 0, 0, 1, 1]
            : 1,
          heatmapIntensity: [
            'interpolate',
            ['linear'],
            ['zoom'],
            0,
            intensity * 0.6,
            maxZoom,
            intensity * 1.2,
          ],
          // `radius` is the spread at street zoom; below that it is scaled
          // down so it keeps covering the same ground rather than the same
          // number of pixels. The stops are the projection: each zoom level
          // halves the ground a pixel covers, so the radius halves with it,
          // floored so the field stays visible at world zoom.
          heatmapRadius: [
            'interpolate',
            ['exponential', 2],
            ['zoom'],
            0,
            Math.max(2, radius / 10),
            8,
            Math.max(6, radius / 1.8),
            14,
            radius,
          ],
          heatmapColor: [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(0,0,0,0)',
            ...stops,
          ],
          heatmapOpacity: [
            'interpolate',
            ['linear'],
            ['zoom'],
            maxZoom - 2,
            opacity,
            maxZoom,
            0,
          ],
        }}
      />

      {/* The handover, in the two zoom levels the field spends fading: the
          marks arrive as it leaves, so there is never a zoom with neither. */}
      {points ? (
        <Layer
          id={`${id}-points`}
          type="circle"
          minzoom={maxZoom - 2}
          style={{
            circleRadius: weight
              ? ['interpolate', ['linear'], ['get', weight], 0, 3, 1, 9]
              : 5,
            circleColor: weight
              ? [
                  'interpolate',
                  ['linear'],
                  ['get', weight],
                  0,
                  ramp[0] as string,
                  1,
                  ramp[ramp.length - 1] as string,
                ]
              : (ramp[ramp.length - 1] as string),
            circleStrokeWidth: 1,
            circleStrokeColor: 'rgba(255,255,255,0.75)',
            circleOpacity: [
              'interpolate',
              ['linear'],
              ['zoom'],
              maxZoom - 2,
              0,
              maxZoom,
              0.85,
            ],
            circleStrokeOpacity: [
              'interpolate',
              ['linear'],
              ['zoom'],
              maxZoom - 2,
              0,
              maxZoom,
              0.6,
            ],
          }}
        />
      ) : null}
    </GeoJSONSource>
  );
}
MapHeatmap.displayName = 'Map.Heatmap';
asMapLayer(MapHeatmap);

export interface MapUserLocationProps {
  /** Show which way the device is facing, not just where it is. */
  heading?: boolean;
  /** Draw the ring showing how confident the fix is. */
  accuracy?: boolean;
}

/** The device's own position, drawn by the renderer. */
function MapUserLocation({
  heading = false,
  accuracy = false,
}: MapUserLocationProps) {
  if (!MapLibre) return null;
  const { UserLocation } = MapLibre;
  return <UserLocation heading={heading} accuracy={accuracy} />;
}
MapUserLocation.displayName = 'Map.UserLocation';
asMapLayer(MapUserLocation);

export const Map = Object.assign(MapRoot, {
  Marker: MapMarker,
  Label: MapLabel,
  Popup: MapPopup,
  Controls: MapControls,
  Route: MapRoute,
  Arc: MapArc,
  GeoJSON: MapGeoJSON,
  Cluster: MapCluster,
  Heatmap: MapHeatmap,
  UserLocation: MapUserLocation,
});
