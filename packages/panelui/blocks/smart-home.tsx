/**
 * Smart Home — one room of a house at a time: its thermostat, a row of
 * scenes, and every device in it.
 *
 * The thermostat is the centre of the screen because it is the control with
 * a number on it, and the number is what a person adjusts. It is a gauge
 * rather than a full ring — three quarters of a turn, open at the bottom, the
 * way a dial on a wall reads — and the temperature in the middle rolls digit
 * by digit as the slider under it moves. The arc takes the colour of the
 * mode: warm for heating, cool for cooling.
 *
 * Scenes are a single choice because a room is in one of them at a time.
 * Picking one sets the devices below to match it, and changing a device by
 * hand clears the scene, since the room no longer is in it. Each device is a
 * tile that toggles when pressed.
 *
 * The sample data is the constants below. Replace them with your own, or
 * lift them into props.
 */
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react-native';
// Deep imports: the icon package's barrel re-exports thousands of glyphs, and
// a bundler that cannot tree-shake follows every one of them.
import BlindsIcon from '@hugeicons/core-free-icons/BlindsIcon';
import BulbIcon from '@hugeicons/core-free-icons/BulbIcon';
import Coffee02Icon from '@hugeicons/core-free-icons/Coffee02Icon';
import Desk01Icon from '@hugeicons/core-free-icons/Desk01Icon';
import DishWasherIcon from '@hugeicons/core-free-icons/DishWasherIcon';
import DropletIcon from '@hugeicons/core-free-icons/DropletIcon';
import Fan01Icon from '@hugeicons/core-free-icons/Fan01Icon';
import FireIcon from '@hugeicons/core-free-icons/FireIcon';
import LockGlyph from '@hugeicons/core-free-icons/LockIcon';
import Moon02Icon from '@hugeicons/core-free-icons/Moon02Icon';
import Speaker01Icon from '@hugeicons/core-free-icons/Speaker01Icon';
import Sun03Icon from '@hugeicons/core-free-icons/Sun03Icon';
import SunCloud01Icon from '@hugeicons/core-free-icons/SunCloud01Icon';
import Tv01Icon from '@hugeicons/core-free-icons/Tv01Icon';
import { BarChart, type BarChartDatum } from '../src/components/bar-chart';
import { Button } from '../src/components/button';
import { Frame } from '../src/components/frame';
import { RingChart } from '../src/components/ring-chart';
import { Slider } from '../src/components/slider';
import { Tabs } from '../src/components/tabs';
import { TextAnimation } from '../src/components/text-animation';
import { ToggleButton, ToggleButtonGroup } from '../src/components/toggle-button';
import { ChevronLeftIcon, useIconColor } from '../src/icons';
import { AnimatedPressable } from '../src/primitives/animated-pressable';
import { Text } from '../src/primitives/text';
import { cn } from '../src/utils/cn';

/* -------------------------------------------------------------------------- */
/* Sample data                                                                */
/* -------------------------------------------------------------------------- */

type DeviceKind = 'light' | 'blinds' | 'media' | 'appliance';
type Mode = 'heat' | 'cool' | 'auto' | 'off';
type Scene = 'morning' | 'away' | 'movie' | 'night';

interface Device {
  id: string;
  name: string;
  kind: DeviceKind;
  icon: IconSvgElement;
  on: boolean;
}

interface Room {
  id: string;
  name: string;
  /** What the room is measured at now, and what it is set to reach. */
  current: number;
  target: number;
  mode: Mode;
  devices: Device[];
}

const ROOMS: Room[] = [
  {
    id: 'living',
    name: 'Living room',
    current: 20.4,
    target: 21.5,
    mode: 'heat',
    devices: [
      { id: 'ceiling', name: 'Ceiling light', kind: 'light', icon: BulbIcon, on: true },
      { id: 'lamp', name: 'Floor lamp', kind: 'light', icon: BulbIcon, on: false },
      { id: 'tv', name: 'Television', kind: 'media', icon: Tv01Icon, on: false },
      { id: 'speaker', name: 'Speaker', kind: 'media', icon: Speaker01Icon, on: true },
      { id: 'blinds', name: 'Blinds', kind: 'blinds', icon: BlindsIcon, on: true },
      { id: 'fan', name: 'Ceiling fan', kind: 'appliance', icon: Fan01Icon, on: false },
    ],
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    current: 21.8,
    target: 21,
    mode: 'auto',
    devices: [
      { id: 'pendants', name: 'Pendants', kind: 'light', icon: BulbIcon, on: true },
      { id: 'cabinet', name: 'Under-cabinet', kind: 'light', icon: BulbIcon, on: false },
      { id: 'coffee', name: 'Coffee machine', kind: 'appliance', icon: Coffee02Icon, on: false },
      { id: 'dishwasher', name: 'Dishwasher', kind: 'appliance', icon: DishWasherIcon, on: true },
    ],
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    current: 19.1,
    target: 18.5,
    mode: 'cool',
    devices: [
      { id: 'bedside', name: 'Bedside lamp', kind: 'light', icon: BulbIcon, on: false },
      { id: 'blinds', name: 'Blinds', kind: 'blinds', icon: BlindsIcon, on: false },
      { id: 'humidifier', name: 'Humidifier', kind: 'appliance', icon: DropletIcon, on: true },
      { id: 'fan', name: 'Fan', kind: 'appliance', icon: Fan01Icon, on: false },
    ],
  },
  {
    id: 'office',
    name: 'Office',
    current: 20.9,
    target: 21,
    mode: 'off',
    devices: [
      { id: 'desk', name: 'Desk lamp', kind: 'light', icon: Desk01Icon, on: true },
      { id: 'strip', name: 'Light strip', kind: 'light', icon: BulbIcon, on: true },
      { id: 'heater', name: 'Heater', kind: 'appliance', icon: FireIcon, on: false },
      { id: 'speaker', name: 'Speaker', kind: 'media', icon: Speaker01Icon, on: false },
    ],
  },
];

const OUTSIDE = { temperature: 14, summary: 'Light cloud' };

/** The range the dial covers, in degrees Celsius. */
const MIN_TEMPERATURE = 10;
const MAX_TEMPERATURE = 30;

const MODES: { id: Mode; label: string }[] = [
  { id: 'heat', label: 'Heat' },
  { id: 'cool', label: 'Cool' },
  { id: 'auto', label: 'Auto' },
  { id: 'off', label: 'Off' },
];

/** The arc takes the mode's colour, so heating and cooling read before the number does. */
const MODE_TOKEN: Record<Mode, string> = {
  heat: '--color-warning',
  cool: '--color-info',
  auto: '--color-success',
  off: '--color-muted-foreground',
};

/**
 * What each scene does to each kind of device. A kind left out is left as it
 * is — a scene about lighting has no opinion on the dishwasher.
 */
const SCENES: { id: Scene; label: string; icon: IconSvgElement; sets: Partial<Record<DeviceKind, boolean>> }[] = [
  { id: 'morning', label: 'Morning', icon: Sun03Icon, sets: { light: true, blinds: true } },
  { id: 'away', label: 'Away', icon: LockGlyph, sets: { light: false, media: false, appliance: false } },
  { id: 'movie', label: 'Movie', icon: Tv01Icon, sets: { light: false, blinds: false, media: true } },
  { id: 'night', label: 'Night', icon: Moon02Icon, sets: { light: false, blinds: false, media: false } },
];

/** `6` as `06:00`. */
function clockHour(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`;
}

/** Energy used by the whole house today, hour by hour, in kWh. */
const ENERGY = [0.3, 0.2, 0.2, 0.2, 0.3, 0.6, 0.9, 1.1, 0.7, 0.5, 0.4, 0.5, 0.6, 0.4, 0.4, 0.5, 0.7, 0.9].map(
  (kwh, hour) => ({ hour: clockHour(hour), until: clockHour(hour + 1), kwh })
);
const ENERGY_TODAY = ENERGY.reduce((sum, row) => sum + row.kwh, 0);
/** Percentage change on the same hours yesterday. */
const ENERGY_TREND = -12.4;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** A theme token, resolved for the drawing props that cannot take a class. */
function useToken(name: string, fallback: string) {
  const value = useCSSVariable(name);
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/** A glyph from the icon set, tinted by whatever surface it sits on. */
function Glyph({ icon, size = 18, color }: { icon: IconSvgElement; size?: number; color?: string }) {
  const inherited = useIconColor();
  const fallback = useToken('--color-foreground', '#262626');
  return (
    <HugeiconsIcon icon={icon} size={size} color={color ?? inherited ?? fallback} strokeWidth={1.75} />
  );
}

/** What a device's switch means, in words. */
function stateOf(device: Device) {
  if (device.kind === 'blinds') return device.on ? 'Open' : 'Closed';
  if (device.kind === 'media') return device.on ? 'Playing' : 'Off';
  return device.on ? 'On' : 'Off';
}

/* -------------------------------------------------------------------------- */
/* Parts                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The dial: an open ring showing where the target sits in the range, with the
 * target itself in the middle.
 *
 * The number is drawn over the ring rather than by the ring's own centre
 * readout, so it can roll digit by digit as the slider moves.
 */
function Thermostat({ room, onChange }: { room: Room; onChange: (patch: Partial<Room>) => void }) {
  const tint = useToken(MODE_TOKEN[room.mode], '#f59e0b');
  const size = 232;
  const off = room.mode === 'off';
  const heading =
    off
      ? 'Heating and cooling are off'
      : room.current < room.target - 0.2
        ? `Heating to ${room.target.toFixed(1)}°`
        : room.current > room.target + 0.2
          ? `Cooling to ${room.target.toFixed(1)}°`
          : 'Holding temperature';

  return (
    <Frame className="w-full">
      <Frame.Header>
        <Frame.Title>Climate</Frame.Title>
        <Frame.Action>{`Now ${room.current.toFixed(1)}°`}</Frame.Action>
      </Frame.Header>
      <Frame.Panel>
        {/* The dial is open at the bottom, so the slider tucks up into the gap. */}
        <View className="-mb-6 items-center pt-5">
          <View style={{ width: size, height: size }}>
            <RingChart
              data={[{ label: 'Target', value: room.target - MIN_TEMPERATURE, maxValue: MAX_TEMPERATURE - MIN_TEMPERATURE }]}
              size={size}
              strokeWidth={20}
              startAngle={-135}
              endAngle={135}
            >
              <RingChart.Ring index={0} color={tint} trackOpacity={0.12} />
            </RingChart>
            <View
              pointerEvents="none"
              className="absolute inset-0 items-center justify-center"
              accessible
              accessibilityLabel={`Target ${room.target.toFixed(1)} degrees. ${heading}.`}
            >
              <Text size="sm" muted>
                {off ? 'Off' : 'Target'}
              </Text>
              <View className={cn('flex-row items-start', off && 'opacity-40')}>
                <TextAnimation.Sliding value={room.target} decimals={1} textClassName="text-6xl font-bold" />
                <Text weight="bold" className="text-3xl">
                  °
                </Text>
              </View>
              <Text size="sm" muted>
                {heading}
              </Text>
            </View>
          </View>
        </View>

        <View className="px-4 pb-4">
          <Slider
            label="Target temperature"
            min={MIN_TEMPERATURE}
            max={MAX_TEMPERATURE}
            step={0.5}
            value={room.target}
            onValueChange={(target) => onChange({ target })}
            disabled={off}
          />
        </View>
      </Frame.Panel>
      <Frame.Footer>
        <ToggleButtonGroup
          selectionMode="single"
          value={[room.mode]}
          onValueChange={(value) => {
            const next = value[0] as Mode | undefined;
            if (next) onChange({ mode: next });
          }}
          className="w-full"
        >
          {MODES.map((mode) => (
            <ToggleButton key={mode.id} id={mode.id} className="flex-1">
              {mode.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Frame.Footer>
    </Frame>
  );
}

/**
 * One device. The whole tile is the control: pressing it turns the device on
 * or off, and an on tile is drawn inverted, in the primary colour, so the
 * state reads from across the room rather than from a switch in its corner.
 */
function DeviceTile({ device, onToggle }: { device: Device; onToggle: (on: boolean) => void }) {
  const primary = useToken('--color-primary', '#262626');
  const muted = useToken('--color-muted-foreground', '#737373');

  return (
    <AnimatedPressable
      onPress={() => onToggle(!device.on)}
      accessibilityRole="switch"
      accessibilityLabel={device.name}
      accessibilityState={{ checked: device.on }}
      accessibilityValue={{ text: stateOf(device) }}
      className={cn(
        'flex-1 gap-5 rounded-3xl border p-4',
        device.on ? 'border-primary bg-primary' : 'border-border bg-card'
      )}
    >
      <View
        className={cn(
          'h-11 w-11 items-center justify-center rounded-full',
          device.on ? 'bg-primary-foreground' : 'bg-muted'
        )}
      >
        <Glyph icon={device.icon} size={20} color={device.on ? primary : muted} />
      </View>
      <View>
        <Text weight="semibold" numberOfLines={1} className={cn(device.on && 'text-primary-foreground')}>
          {device.name}
        </Text>
        <Text size="sm" muted={!device.on} className={cn(device.on && 'text-primary-foreground opacity-70')}>
          {stateOf(device)}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

/* -------------------------------------------------------------------------- */
/* Block                                                                      */
/* -------------------------------------------------------------------------- */

export interface SmartHomeBlockProps {
  /** Shows a back button in the header and is called when it is pressed. */
  onBack?: () => void;
  className?: string;
}

export function SmartHomeBlock({ onBack, className }: SmartHomeBlockProps) {
  const insets = useSafeAreaInsets();
  const sky = useToken('--color-foreground', '#262626');
  const [rooms, setRooms] = useState(ROOMS);
  const [roomId, setRoomId] = useState(ROOMS[0]!.id);
  const [scenes, setScenes] = useState<Record<string, Scene | undefined>>({});
  const [hour, setHour] = useState<BarChartDatum | null>(null);

  const room = rooms.find((item) => item.id === roomId) ?? rooms[0]!;
  const scene = scenes[room.id];
  const onCount = rooms.reduce((sum, item) => sum + item.devices.filter((device) => device.on).length, 0);

  const patchRoom = (patch: Partial<Room>) =>
    setRooms((current) => current.map((item) => (item.id === room.id ? { ...item, ...patch } : item)));

  const setDevice = (id: string, on: boolean) => {
    patchRoom({ devices: room.devices.map((device) => (device.id === id ? { ...device, on } : device)) });
    // The room is no longer in the scene once something in it is changed by hand.
    setScenes((current) => ({ ...current, [room.id]: undefined }));
  };

  const applyScene = (id: Scene | undefined) => {
    setScenes((current) => ({ ...current, [room.id]: id }));
    if (!id) return;
    const { sets } = SCENES.find((item) => item.id === id)!;
    patchRoom({
      devices: room.devices.map((device) =>
        sets[device.kind] === undefined ? device : { ...device, on: sets[device.kind]! }
      ),
    });
  };

  // Two columns of tiles; an odd one out keeps its width rather than stretching.
  const rows: Device[][] = [];
  for (let index = 0; index < room.devices.length; index += 2) rows.push(room.devices.slice(index, index + 2));

  return (
    <View className={cn('flex-1 bg-background', className)}>
      <View style={{ paddingTop: insets.top + 8 }} className="px-5 pb-3">
        <View className="w-full max-w-xl flex-row items-center gap-3 self-center">
          {onBack ? (
            <Button variant="outline" size="icon" className="rounded-full" accessibilityLabel="Back" onPress={onBack}>
              <ChevronLeftIcon size={18} />
            </Button>
          ) : null}
          <View className="flex-1">
            <Text size="lg" weight="semibold">
              Home
            </Text>
            <Text size="sm" muted>
              {rooms.length} rooms · {onCount} devices on
            </Text>
          </View>
          <View
            accessible
            accessibilityLabel={`${OUTSIDE.temperature} degrees outside, ${OUTSIDE.summary.toLowerCase()}`}
            className="flex-row items-center gap-1.5 rounded-full bg-muted px-3 py-1.5"
          >
            <Glyph icon={SunCloud01Icon} size={16} color={sky} />
            <Text size="sm" weight="semibold" className="tabular-nums">
              {OUTSIDE.temperature}°
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        contentContainerClassName="px-5 pt-2"
      >
        <View className="w-full max-w-xl gap-6 self-center">
          {/* One room at a time */}
          <Tabs variant="pill" defaultValue={ROOMS[0]!.id} value={room.id} onValueChange={setRoomId}>
            <Tabs.List scrollable>
              {rooms.map((item) => (
                <Tabs.Trigger key={item.id} value={item.id}>
                  {item.name}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs>

          <Thermostat room={room} onChange={patchRoom} />

          {/* Scenes */}
          <View className="gap-3">
            <Text size="sm" weight="semibold" muted>
              Scenes
            </Text>
            <ToggleButtonGroup
              selectionMode="single"
              size="sm"
              value={scene ? [scene] : []}
              onValueChange={(value) => applyScene(value[0] as Scene | undefined)}
              className="w-full gap-2"
            >
              {SCENES.map((item) => (
                <ToggleButton key={item.id} id={item.id} className="h-auto flex-1 flex-col gap-1.5 py-3">
                  <Glyph icon={item.icon} size={20} />
                  <ToggleButton.Label>{item.label}</ToggleButton.Label>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </View>

          {/* Devices */}
          <View className="gap-3">
            <Text size="sm" weight="semibold" muted>
              Devices
            </Text>
            {rows.map((row) => (
              <View key={row.map((device) => device.id).join()} className="flex-row gap-3">
                {row.map((device) => (
                  <DeviceTile key={device.id} device={device} onToggle={(on) => setDevice(device.id, on)} />
                ))}
                {row.length === 1 ? <View className="flex-1" /> : null}
              </View>
            ))}
          </View>

          {/* The whole house */}
          <Frame className="w-full">
            <Frame.Header>
              <Frame.Title>Energy today</Frame.Title>
              <Frame.Action>Whole house</Frame.Action>
            </Frame.Header>
            <Frame.Panel>
              <BarChart
                data={ENERGY}
                xDataKey="hour"
                aspectRatio={2}
                onActiveIndexChange={(_index, datum) => setHour(datum)}
              >
                <BarChart.Header
                  className="px-4 pt-3.5"
                  value={`${(hour ? Number(hour.kwh) : ENERGY_TODAY).toFixed(1)} kWh`}
                  caption={
                    hour
                      ? `${hour.hour}–${hour.until}`
                      : `${ENERGY_TREND}% on the same hours yesterday`
                  }
                />
                <BarChart.Grid />
                <BarChart.Bar dataKey="kwh" />
                {/* Two digits: a full `06:00` is wider than an hour's bar. */}
                <BarChart.XAxis ticks={4} format={(datum) => String(datum.hour).slice(0, 2)} />
                <BarChart.Tooltip />
              </BarChart>
            </Frame.Panel>
          </Frame>
        </View>
      </ScrollView>
    </View>
  );
}
