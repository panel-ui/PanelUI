import { useRef, useState, type ReactNode } from "react";
import { Image, ScrollView, View } from "react-native";
import { HugeiconsIcon } from "@hugeicons/react-native";
import BedDoubleIcon from "@hugeicons/core-free-icons/BedDoubleIcon";
import Call02Icon from "@hugeicons/core-free-icons/Call02Icon";
import Coffee01Icon from "@hugeicons/core-free-icons/Coffee01Icon";
import Location01Icon from "@hugeicons/core-free-icons/Location01Icon";
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon";
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon";
import Ticket01Icon from "@hugeicons/core-free-icons/Ticket01Icon";
import Wifi01Icon from "@hugeicons/core-free-icons/Wifi01Icon";
import { Alert, Avatar, Badge, Button, Card, CheckIcon, Chip, CircularText, FlipCard, FolderIcon, Input, Item, Label, QRCode, RadioGroup, Rating, Select, SelectionMode, SectionRail, Separator, Shimmer, Skeleton, Slider, Spinner, Surface, Text, TextAnimation, ToggleButton, ToggleButtonGroup, TrashIcon, cn, hasNativeUI, useScrollSections } from "panelui-native";
import { useCSSVariable } from 'uniwind';
import type { ComponentEntry } from '../component-types';

function RadioGroupDemo() {
  const [plan, setPlan] = useState('pro');

  return (
    <RadioGroup value={plan} onValueChange={setPlan} className="w-full">
      <RadioGroup.Item value="free" label="Free — $0/month" />
      <RadioGroup.Item value="pro" label="Pro — $12/month" />
      <RadioGroup.Item value="team" label="Team — $36/month" />
    </RadioGroup>
  );
}

function RadioGroupRowDemo() {
  const [size, setSize] = useState('m');
  const [billing, setBilling] = useState('monthly');

  return (
    <View className="w-full gap-6">
      <View className="gap-2">
        <Label>Size</Label>
        {/* Short labels stacked one per line read as a longer list than they
            are. A wrapping row uses the width the choices actually need. */}
        <RadioGroup
          orientation="horizontal"
          value={size}
          onValueChange={setSize}
          className="w-full"
        >
          <RadioGroup.Item value="s" label="Small" />
          <RadioGroup.Item value="m" label="Medium" />
          <RadioGroup.Item value="l" label="Large" />
          <RadioGroup.Item value="xl" label="X-Large" />
        </RadioGroup>
      </View>

      <View className="gap-2">
        <Label>Billing</Label>
        {/* Cards share the row rather than filling it. */}
        <RadioGroup
          orientation="horizontal"
          variant="card"
          value={billing}
          onValueChange={setBilling}
          className="w-full"
        >
          <RadioGroup.Item value="monthly" label="Monthly" description="$12/mo" />
          <RadioGroup.Item value="yearly" label="Yearly" description="$120/yr" />
        </RadioGroup>
      </View>
    </View>
  );
}

function RadioGroupCardDemo() {
  const [plan, setPlan] = useState('pro');

  return (
    <RadioGroup value={plan} onValueChange={setPlan} variant="card" className="w-full">
      <RadioGroup.Item
        value="starter"
        label="Starter"
        description="For a side project — one seat, community support."
      />
      <RadioGroup.Item
        value="pro"
        label="Pro"
        description="For growing teams — five seats, priority support."
      />
      <RadioGroup.Item
        value="max"
        label="Max"
        description="Everything, uncapped — unlimited seats and SSO."
      />
    </RadioGroup>
  );
}

function RadioGroupStyledDemo() {
  const [method, setMethod] = useState('card');

  return (
    <RadioGroup
      value={method}
      onValueChange={setMethod}
      variant="card"
      orientation="horizontal"
      className="w-full"
    >
      <RadioGroup.Item
        value="card"
        label="Card"
        description="Visa, Amex"
        className="bg-white"
        labelClassName="text-black"
        descriptionClassName="text-neutral-500"
      />
      <RadioGroup.Item
        value="wallet"
        label="Wallet"
        description="Apple Pay"
        className="bg-white"
        labelClassName="text-black"
        descriptionClassName="text-neutral-500"
      />
    </RadioGroup>
  );
}

const DELIVERY_SPEEDS = [
  { value: 'standard', label: 'Standard', description: '3–5 days' },
  { value: 'express', label: 'Express', description: 'Next day' },
];

function RadioGroupSelectedLabelDemo() {
  const [speed, setSpeed] = useState('standard');

  return (
    <RadioGroup
      value={speed}
      onValueChange={setSpeed}
      variant="card"
      orientation="horizontal"
      className="w-full"
    >
      {/* The item does not restyle its label on selection, so the colour is
          worked out here from the group's value. */}
      {DELIVERY_SPEEDS.map((option) => (
        <RadioGroup.Item
          key={option.value}
          value={option.value}
          label={option.label}
          description={option.description}
          labelClassName={option.value === speed ? undefined : 'text-muted-foreground'}
        />
      ))}
    </RadioGroup>
  );
}

function SelectDemo() {
  const [fruit, setFruit] = useState<string>();

  return (
    <View className="w-full gap-1.5">
      <Label>Favorite fruit</Label>
      <Select
        value={fruit}
        onValueChange={setFruit}
        placeholder="Select a fruit"
        title="Favorite fruit"
      >
        <Select.Item value="apple" label="Apple" />
        <Select.Item value="banana" label="Banana" />
        <Select.Item value="cherry" label="Cherry" />
        <Select.Item value="mango" label="Mango" />
      </Select>
    </View>
  );
}

/** Long enough that scrolling it is not a way of finding anything. */
const TIMEZONES = [
  { value: 'utc', label: 'UTC' },
  { value: 'europe/london', label: 'London' },
  { value: 'europe/paris', label: 'Paris' },
  { value: 'europe/berlin', label: 'Berlin' },
  { value: 'europe/madrid', label: 'Madrid' },
  { value: 'europe/istanbul', label: 'Istanbul' },
  { value: 'africa/cairo', label: 'Cairo' },
  { value: 'africa/lagos', label: 'Lagos' },
  { value: 'africa/nairobi', label: 'Nairobi' },
  { value: 'asia/dubai', label: 'Dubai' },
  { value: 'asia/karachi', label: 'Karachi' },
  { value: 'asia/kolkata', label: 'Kolkata' },
  { value: 'asia/singapore', label: 'Singapore' },
  { value: 'asia/tokyo', label: 'Tokyo' },
  { value: 'australia/sydney', label: 'Sydney' },
  { value: 'america/sao_paulo', label: 'São Paulo' },
  { value: 'america/new_york', label: 'New York' },
  { value: 'america/chicago', label: 'Chicago' },
  { value: 'america/denver', label: 'Denver' },
  { value: 'america/los_angeles', label: 'Los Angeles' },
];

function SearchableSelectDemo({
  presentation = 'sheet',
}: {
  presentation?: 'sheet' | 'inline' | 'overlay';
}) {
  const [zone, setZone] = useState<string>();

  return (
    <View className="w-full gap-1.5">
      <Label>Time zone</Label>
      <Select
        searchable
        searchPlaceholder="Search cities"
        emptyMessage="No city by that name"
        presentation={presentation}
        value={zone}
        onValueChange={setZone}
        placeholder="Select a time zone"
        title="Time zone"
      >
        {TIMEZONES.map((tz) => (
          <Select.Item key={tz.value} value={tz.value} label={tz.label} />
        ))}
      </Select>
    </View>
  );
}

/** Twenty options with no filter, so the list has to be scrolled. */
function LongSelectDemo() {
  const [zone, setZone] = useState<string>();

  return (
    <View className="w-full gap-1.5">
      <Label>Time zone</Label>
      <Select
        value={zone}
        onValueChange={setZone}
        placeholder="Select a time zone"
        title="Time zone"
      >
        {TIMEZONES.map((tz) => (
          <Select.Item key={tz.value} value={tz.value} label={tz.label} />
        ))}
      </Select>
    </View>
  );
}

function DisabledOptionSelectDemo() {
  const [plan, setPlan] = useState<string>('starter');

  return (
    <View className="w-full gap-1.5">
      <Label>Plan</Label>
      <Select value={plan} onValueChange={setPlan} title="Plan">
        <Select.Item value="starter" label="Starter" />
        <Select.Item value="team" label="Team" />
        {/* Still listed, because an option that disappears reads as one that
            was never offered. */}
        <Select.Item value="enterprise" label="Enterprise — contact sales" disabled />
      </Select>
    </View>
  );
}

/**
 * Grouping is presentational — the value is still one flat string — and the
 * filter reaches through it, dropping any group the query empties rather than
 * leaving a heading standing over nothing.
 */
function GroupedSelectDemo() {
  const [zone, setZone] = useState<string>();

  return (
    <View className="w-full gap-1.5">
      <Label>Time zone</Label>
      <Select
        searchable
        searchPlaceholder="Search cities"
        emptyMessage="No city by that name"
        value={zone}
        onValueChange={setZone}
        placeholder="Select a time zone"
        title="Time zone"
      >
        <Select.Group label="Europe">
          <Select.Item value="europe/london" label="London" />
          <Select.Item value="europe/paris" label="Paris" />
          <Select.Item value="europe/berlin" label="Berlin" />
        </Select.Group>
        <Select.Group label="Asia">
          <Select.Item value="asia/dubai" label="Dubai" />
          <Select.Item value="asia/tokyo" label="Tokyo" />
          <Select.Item value="asia/singapore" label="Singapore" />
        </Select.Group>
        <Select.Group label="Americas">
          <Select.Item value="america/new_york" label="New York" />
          <Select.Item value="america/los_angeles" label="Los Angeles" />
        </Select.Group>
      </Select>
    </View>
  );
}

/**
 * Wraps a native-mode demo with a note about what is actually on screen —
 * without @expo/ui installed the `native` prop is a silent no-op, which is
 * otherwise indistinguishable from it not working.
 */
function NativeDemo({ children }: { children: ReactNode }) {
  return (
    <View className="w-full gap-5">
      <Alert variant={hasNativeUI() ? 'info' : 'warning'}>
        <Alert.Content>
          <Alert.Title>
            {hasNativeUI()
              ? 'Rendering the platform control'
              : '@expo/ui not available'}
          </Alert.Title>
          <Alert.Description>
            {hasNativeUI()
              ? 'Theme tokens do not apply here — the platform draws this.'
              : 'The `native` prop is a no-op, so the styled component renders instead.'}
          </Alert.Description>
        </Alert.Content>
      </Alert>
      {/* A rule between the note and the control, so a platform button
          sitting right under the alert does not read as part of it. */}
      <Separator />
      <View className="w-full gap-4">{children}</View>
    </View>
  );
}

function NativeWheelPickerDemo() {
  const [size, setSize] = useState('m');

  return (
    <NativeDemo>
      {/* `wheel` is the always-visible rotor on iOS; elsewhere it falls back
          to the compact menu. */}
      <Select native nativeAppearance="wheel" value={size} onValueChange={setSize}>
        <Select.Item value="s" label="Small" />
        <Select.Item value="m" label="Medium" />
        <Select.Item value="l" label="Large" />
        <Select.Item value="xl" label="X-Large" />
      </Select>
      <Text size="sm" muted>
        Selected: {size}
      </Text>
    </NativeDemo>
  );
}

function NativeSelectDemo() {
  const [fruit, setFruit] = useState('apple');

  return (
    <NativeDemo>
      <Select native value={fruit} onValueChange={setFruit}>
        <Select.Item value="apple" label="Apple" />
        <Select.Item value="banana" label="Banana" />
        <Select.Item value="cherry" label="Cherry" />
      </Select>
      <Text size="sm" muted>
        Selected: {fruit}
      </Text>
    </NativeDemo>
  );
}

function RegionSelectDemo({
  presentation,
  contentWidth,
}: {
  presentation?: 'sheet' | 'inline' | 'overlay';
  contentWidth?: 'trigger' | 'content' | number;
}) {
  const [region, setRegion] = useState<string>();

  return (
    <View className="w-full gap-1.5">
      <Label>Region</Label>
      <Select
        value={region}
        onValueChange={setRegion}
        placeholder="Select a region"
        presentation={presentation}
        contentWidth={contentWidth}
      >
        <Select.Item value="us" label="United States" />
        <Select.Item value="eu" label="Europe" />
        <Select.Item value="apac" label="Asia Pacific" />
      </Select>
    </View>
  );
}

function RatingDemo() {
  const [score, setScore] = useState(3);

  return (
    <View className="w-full gap-6">
      {/* Controlled, with the caption row showing what the taps have set. */}
      <Rating
        label="Rate your stay"
        showValue
        formatValue={(v) => `${v} / 5`}
        value={score}
        onValueChange={setScore}
      />
      {/* precision={0.5} lets the left half of a star mean a half. */}
      <Rating precision={0.5} defaultValue={2.5} color="primary" />
      {/* A read-only average renders any fraction at full precision. */}
      <Rating value={4.3} precision={0.5} readOnly size="sm" />
    </View>
  );
}

/**
 * Drag across the row to feel it: a tick fires each time the drag crosses onto
 * a new star, so the value can be set without watching the stars. Paired with
 * `allowClear`, which makes a second tap on the current value reset it to zero.
 */
function RatingHapticsDemo() {
  const [score, setScore] = useState(4);

  return (
    <View className="w-full gap-6">
      <Rating
        label="Drag across the stars"
        showValue
        haptics
        allowClear
        value={score}
        onValueChange={setScore}
      />
      {/* Half steps still tick once per whole star, so the feedback stays
          countable rather than firing twice as often. */}
      <Rating
        label="Half stars, same ticks"
        showValue
        haptics
        precision={0.5}
        defaultValue={2.5}
        color="primary"
      />
    </View>
  );
}

const RAIL_SECTIONS = [
  { id: 'intro', label: 'Introduction', level: 0 },
  { id: 'install', label: 'Installation', level: 0 },
  { id: 'expo', label: 'Expo', level: 1 },
  { id: 'bare', label: 'Bare React Native', level: 1 },
  { id: 'theming', label: 'Theming', level: 0 },
  { id: 'tokens', label: 'Design tokens', level: 1 },
  { id: 'dark', label: 'Dark mode', level: 1 },
  { id: 'faq', label: 'Frequently asked', level: 0 },
];

/** Shared body for the scrolling rail demos — only the rail's corner differs. */
function SectionRailVersion({
  placement = 'right',
  align = 'center',
  haptics,
}: {
  placement?: 'left' | 'right';
  align?: 'center' | 'top' | 'bottom';
  haptics?: boolean;
}) {
  // The hook owns the offsets, the reading line and the scroll-back — and the
  // end case, where the last section's top never reaches the reading line
  // because the page runs out first.
  const sections = useScrollSections({
    ids: RAIL_SECTIONS.map((section) => section.id),
  });

  return (
    <View className="flex-1">
      <ScrollView
        ref={sections.ref}
        {...sections.scrollProps}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        {RAIL_SECTIONS.map((section) => (
          <View
            key={section.id}
            onLayout={sections.measure(section.id)}
            className="gap-3 px-6 py-10"
          >
            <Text size={section.level ? 'lg' : '2xl'} weight="semibold">
              {section.label}
            </Text>
            <Text size="sm" muted>
              Scroll and the bar for this section widens and brightens. Touch
              the rail to open the list and jump anywhere.
            </Text>
            <Skeleton className="h-24 w-full rounded-xl" />
          </View>
        ))}
      </ScrollView>

      <SectionRail
        placement={placement}
        align={align}
        haptics={haptics}
        value={sections.active}
        onValueChange={sections.scrollTo}
      >
        <SectionRail.Trigger>
          {RAIL_SECTIONS.map((section) => (
            <SectionRail.Bar key={section.id} value={section.id} level={section.level} />
          ))}
        </SectionRail.Trigger>
        <SectionRail.Content>
          {RAIL_SECTIONS.map((section) => (
            <SectionRail.Item key={section.id} value={section.id} level={section.level}>
              {section.label}
            </SectionRail.Item>
          ))}
        </SectionRail.Content>
      </SectionRail>
    </View>
  );
}

const PAGER_SECTIONS = [
  { id: 'welcome', label: 'Welcome', body: 'Swipe up to move through the deck.' },
  { id: 'tokens', label: 'Tokens', body: 'Every colour and radius comes from the theme.' },
  { id: 'motion', label: 'Motion', body: 'Animations run on the UI thread, never on JS.' },
  { id: 'native', label: 'Native', body: 'Some controls hand off to the platform entirely.' },
  { id: 'ship', label: 'Ship it', body: 'No native modules, so it runs in Expo Go.' },
];

/**
 * One section per screen. A pager needs no reading line — the active page is
 * the scroll offset over the viewport height — so this drives the rail
 * directly rather than through useScrollSections.
 */
function SectionRailPagerVersion() {
  const [page, setPage] = useState(0);
  const scroller = useRef<ScrollView>(null);

  /*
   * The page height is the scroll view's own, measured — not the window's.
   * Anything above the pager (a header, a caption) makes the viewport shorter
   * than the screen, and window-height pages then sit a little further out of
   * alignment with each snap position than the last, until one of them lands
   * entirely between two and never shows.
   */
  const [pageHeight, setPageHeight] = useState(0);
  // The page a tap asked for, while the scroller is still travelling to it.
  const jumping = useRef<number | null>(null);

  return (
    <View className="flex-1">
      <ScrollView
        ref={scroller}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onLayout={(event) => setPageHeight(event.nativeEvent.layout.height)}
        onScroll={(event) => {
          // Muted while a jump is travelling: a paged scroll passes every page
          // between here and there, and reporting each one is a rail lighting
          // up rows nobody chose.
          if (jumping.current !== null) return;
          const { contentOffset, layoutMeasurement } = event.nativeEvent;
          if (!layoutMeasurement.height) return;
          const next = Math.round(contentOffset.y / layoutMeasurement.height);
          if (next !== page) setPage(next);
        }}
        onMomentumScrollEnd={() => {
          jumping.current = null;
        }}
      >
        {PAGER_SECTIONS.map((section, index) => (
          <View
            key={section.id}
            // Nothing to lay out until the viewport has been measured; a page
            // of the wrong height would scroll to the wrong place first.
            style={{ height: pageHeight || undefined }}
            className="justify-center gap-4 px-8"
          >
            <Text size="sm" muted>
              {index + 1} of {PAGER_SECTIONS.length}
            </Text>
            <Text size="3xl" weight="semibold">
              {section.label}
            </Text>
            <Text size="base" muted>
              {section.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      <SectionRail
        placement="left"
        align="bottom"
        haptics
        value={PAGER_SECTIONS[page]?.id}
        onValueChange={(next) => {
          const index = PAGER_SECTIONS.findIndex((section) => section.id === next);
          if (index < 0 || !pageHeight) return;
          jumping.current = index;
          setPage(index);
          scroller.current?.scrollTo({ y: index * pageHeight, animated: true });
        }}
      >
        <SectionRail.Trigger>
          {PAGER_SECTIONS.map((section) => (
            <SectionRail.Bar key={section.id} value={section.id} />
          ))}
        </SectionRail.Trigger>
        <SectionRail.Content>
          {PAGER_SECTIONS.map((section) => (
            <SectionRail.Item key={section.id} value={section.id}>
              {section.label}
            </SectionRail.Item>
          ))}
        </SectionRail.Content>
      </SectionRail>
    </View>
  );
}

const price = (value: number) => `$${value.toFixed(2)}`;

/**
 * A replay control, because an animation nobody can re-trigger demonstrates
 * itself once and is then a screenshot. Remounting the subtree is the honest
 * way to do it: every part starts from its own beginning rather than from
 * whatever it happened to be showing.
 */
function Replay({ children }: { children: (run: number) => ReactNode }) {
  const [run, setRun] = useState(0);

  return (
    <View className="w-full items-center gap-4">
      {children(run)}
      <Button variant="outline" size="sm" onPress={() => setRun((n) => n + 1)}>
        Play again
      </Button>
    </View>
  );
}

function TypingDemo() {
  return (
    <Replay>
      {(run) => (
        // A fixed height, because a line that grows as it types pushes the
        // button under it down the screen on every keystroke.
        <View key={run} className="h-16 w-full justify-center">
          <TextAnimation.Typing
            text="Everything ships with its accessibility wiring already done."
            size="lg"
            weight="medium"
            caret
          />
        </View>
      )}
    </Replay>
  );
}

function TypingCycleDemo() {
  return (
    <View className="h-16 w-full justify-center">
      <TextAnimation.Typing
        text={['fast by default', 'native where it counts', 'yours to change']}
        size="lg"
        weight="medium"
        caret
        loop
      />
    </View>
  );
}

function RotatingDemo() {
  return (
    <View className="w-full flex-row items-center justify-center gap-2">
      <Text size="xl" weight="semibold">
        Built for
      </Text>
      <TextAnimation.Rotating
        text={['Expo', 'React Native', 'you']}
        size="xl"
        weight="semibold"
        className="text-info-foreground"
      />
    </View>
  );
}

function CountingDemo() {
  return (
    <Replay>
      {(run) => (
        <View key={run} className="w-full flex-row justify-around">
          <View className="items-center gap-1">
            <TextAnimation.Counting value={2048} size="3xl" weight="semibold" />
            <Text size="sm" muted>
              Installs
            </Text>
          </View>
          <View className="items-center gap-1">
            <TextAnimation.Counting
              value={99.4}
              decimals={1}
              size="3xl"
              weight="semibold"
              formatOptions={{ style: 'percent', maximumFractionDigits: 1 }}
            />
            <Text size="sm" muted>
              Uptime
            </Text>
          </View>
        </View>
      )}
    </Replay>
  );
}

/** The odometer, driven by a real value rather than by a timer. */
function SlidingDemo() {
  const [total, setTotal] = useState(1024);

  return (
    <View className="w-full items-center gap-4">
      <TextAnimation.Sliding
        value={total}
        thousandSeparator=","
        size="3xl"
        weight="semibold"
      />
      <View className="flex-row gap-2">
        <Button
          variant="outline"
          size="sm"
          onPress={() => setTotal((n) => Math.max(0, n - 137))}
        >
          −137
        </Button>
        <Button variant="outline" size="sm" onPress={() => setTotal((n) => n + 137)}>
          +137
        </Button>
        <Button variant="outline" size="sm" onPress={() => setTotal(1024)}>
          Reset
        </Button>
      </View>
    </View>
  );
}

function SlidingPriceDemo() {
  const [price, setPrice] = useState(24.99);

  return (
    <View className="w-full items-center gap-4">
      <View className="flex-row items-center">
        <Text size="2xl" weight="semibold">
          $
        </Text>
        <TextAnimation.Sliding value={price} decimals={2} size="2xl" weight="semibold" />
        <Text size="sm" muted className="ms-2">
          /month
        </Text>
      </View>
      <ToggleButtonGroup
        selectionMode="single"
        value={[price === 24.99 ? 'monthly' : 'yearly']}
        onValueChange={(next) => setPrice(next[0] === 'yearly' ? 19.16 : 24.99)}
      >
        <ToggleButton id="monthly">Monthly</ToggleButton>
        <ToggleButton id="yearly">Yearly</ToggleButton>
      </ToggleButtonGroup>
    </View>
  );
}

function ScrollingDemo() {
  return (
    <Replay>
      {(run) => (
        <View key={run} className="w-full items-center gap-3">
          {/* The band and the edge fade are what make it a picker rather than
              a list of five numbers with no answer in it. The fade is painted,
              so it has to be told what is behind the window. */}
          <TextAnimation.Scrolling
            value={120}
            step={10}
            size="2xl"
            weight="semibold"
            highlight
            className="w-28"
          />
          <Text size="sm" muted>
            Minutes this week
          </Text>
        </View>
      )}
    </Replay>
  );
}

/** Three parts under one root, configured once. */
function TextAnimationGroupDemo() {
  return (
    <Replay>
      {(run) => (
        <TextAnimation key={run} duration={900} delay={200} className="gap-2">
          <TextAnimation.Counting value={48} size="2xl" weight="semibold" />
          <Text size="2xl" weight="semibold">
            of
          </Text>
          <TextAnimation.Counting value={60} size="2xl" weight="semibold" />
          <Text size="2xl" muted>
            done
          </Text>
        </TextAnimation>
      )}
    </Replay>
  );
}

/**
 * The catalogue, A–Z.
 *
 * Sorted here rather than kept in order above, because the array above is five
 * thousand lines of demo code and a new component is always appended to the end
 * of it. Every list that was alphabetical by hand has stopped being — this one
 * had charts filed under L and Item under O — so the order is derived from the
 * names the list prints and cannot drift again.
 */
/* -------------------------------------------------------------------------- *
 * SelectionMode
 * -------------------------------------------------------------------------- */

const SELECTION_MESSAGES = [
  { id: 'm1', name: 'Design review', preview: 'Shipping the new empty states today' },
  { id: 'm2', name: 'Rosa Delgado', preview: 'Sent over the updated figures' },
  { id: 'm3', name: 'Weekend plans', preview: 'Anyone free on Saturday?' },
  { id: 'm4', name: 'Ade Okafor', preview: 'Thanks — that fixed it' },
  { id: 'm5', name: 'Release notes', preview: 'Draft is ready for a read' },
];

const SELECTION_PEOPLE = [
  { id: 'p1', name: 'Rosa Delgado', handle: '@rosa' },
  { id: 'p2', name: 'Ade Okafor', handle: '@ade' },
  { id: 'p3', name: 'Mei Lin', handle: '@mei' },
  { id: 'p4', name: 'Tomas Novak', handle: '@tomas' },
  { id: 'p5', name: 'Priya Raman', handle: '@priya' },
];

/*
 * Twelve rather than six, because six fit on the row and a strip that does not
 * scroll demonstrates nothing that a grid would not have done better. It also
 * gives "All" and the count in the header something to be about.
 */
const SELECTION_COLORS = [
  { id: 'c1', name: 'Lilac', hex: '#a78bfa' },
  { id: 'c2', name: 'Sky', hex: '#38bdf8' },
  { id: 'c3', name: 'Mint', hex: '#34d399' },
  { id: 'c4', name: 'Amber', hex: '#fbbf24' },
  { id: 'c5', name: 'Coral', hex: '#fb7185' },
  { id: 'c6', name: 'Slate', hex: '#94a3b8' },
  { id: 'c7', name: 'Indigo', hex: '#818cf8' },
  { id: 'c8', name: 'Teal', hex: '#2dd4bf' },
  { id: 'c9', name: 'Lime', hex: '#a3e635' },
  { id: 'c10', name: 'Rose', hex: '#f472b6' },
  { id: 'c11', name: 'Rust', hex: '#f97316' },
  { id: 'c12', name: 'Stone', hex: '#d6d3d1' },
];

function SelectionModeDemo() {
  const [selected, setSelected] = useState<string[]>([]);
  const [gone, setGone] = useState<string[]>([]);
  const messages = SELECTION_MESSAGES.filter((message) => !gone.includes(message.id));

  return (
    <View style={{ height: 380 }} className="w-full overflow-hidden rounded-xl border border-border">
      <SelectionMode
        values={messages.map((message) => message.id)}
        selected={selected}
        onSelectedChange={setSelected}
      >
        <SelectionMode.Header title="Choose" />
        <ScrollView contentContainerClassName="py-2 pb-24">
          {messages.map((message) => (
            <SelectionMode.Item key={message.id} value={message.id}>
              <Item>
                <Item.Media>
                  <Avatar fallback={message.name.slice(0, 2).toUpperCase()} />
                </Item.Media>
                <Item.Content>
                  <Item.Title>{message.name}</Item.Title>
                  <Item.Description>{message.preview}</Item.Description>
                </Item.Content>
              </Item>
            </SelectionMode.Item>
          ))}
          {messages.length === 0 ? (
            <Text size="sm" muted className="p-6 text-center">
              All gone. Reopen the demo to bring them back.
            </Text>
          ) : null}
        </ScrollView>

        <SelectionMode.Bar>
          <SelectionMode.Action icon={<CheckIcon size={20} />} exitOnPress onPress={() => {}}>
            Read
          </SelectionMode.Action>
          <SelectionMode.Action icon={<FolderIcon size={20} />} exitOnPress onPress={() => {}}>
            Archive
          </SelectionMode.Action>
          <SelectionMode.Action
            icon={<TrashIcon size={20} />}
            destructive
            exitOnPress
            onPress={(ids) => setGone((current) => [...current, ...ids])}
          >
            Delete
          </SelectionMode.Action>
        </SelectionMode.Bar>
      </SelectionMode>
    </View>
  );
}

function SelectionModeSheetPeopleDemo() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(['p2']);

  return (
    <View className="w-full gap-3">
      <Button onPress={() => setOpen(true)}>
        {selected.length > 0 ? `Share with ${selected.length}` : 'Share with…'}
      </Button>

      <SelectionMode
        values={SELECTION_PEOPLE.map((person) => person.id)}
        selected={selected}
        onSelectedChange={setSelected}
      >
        <SelectionMode.Sheet open={open} onOpenChange={setOpen} title="Share with">
          <SelectionMode.Group>
            {SELECTION_PEOPLE.map((person) => (
              <SelectionMode.Item key={person.id} value={person.id}>
                <Item>
                  <Item.Media>
                    <Avatar fallback={person.name.slice(0, 2).toUpperCase()} />
                  </Item.Media>
                  <Item.Content>
                    <Item.Title>{person.name}</Item.Title>
                    <Item.Description>{person.handle}</Item.Description>
                  </Item.Content>
                </Item>
              </SelectionMode.Item>
            ))}
          </SelectionMode.Group>
          <SelectionMode.Bar>
            <SelectionMode.Action
              icon={<CheckIcon size={20} />}
              onPress={() => setOpen(false)}
            >
              Send
            </SelectionMode.Action>
          </SelectionMode.Bar>
        </SelectionMode.Sheet>
      </SelectionMode>
    </View>
  );
}

/**
 * A sheet of small things picked by sight, with a second control under them.
 *
 * The swatches run sideways rather than wrapping: a strip costs one row
 * whatever the count, so what follows it stays on the sheet instead of being
 * pushed off by a grid claiming as many rows as it needs.
 */
function SelectionModeSheetColorsDemo() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(['c1', 'c3']);
  const [opacity, setOpacity] = useState(80);

  return (
    <View className="w-full gap-3">
      <Button variant="secondary" onPress={() => setOpen(true)}>
        Pick colours
      </Button>

      <SelectionMode
        values={SELECTION_COLORS.map((color) => color.id)}
        selected={selected}
        onSelectedChange={setSelected}
      >
        <SelectionMode.Sheet open={open} onOpenChange={setOpen} title="Palette">
          <SelectionMode.Group horizontal label="Colour" itemWidth={44} gap={14}>
            {SELECTION_COLORS.map((color) => (
              <SelectionMode.Item key={color.id} value={color.id} indicator="ring">
                <View
                  style={{ backgroundColor: color.hex, aspectRatio: 1 }}
                  className="w-full rounded-full"
                />
              </SelectionMode.Item>
            ))}
          </SelectionMode.Group>

          <Slider
            label="Opacity"
            showValue
            value={opacity}
            onValueChange={setOpacity}
            formatValue={(value) => `${Math.round(value)}%`}
          />

          <SelectionMode.Bar>
            <SelectionMode.Action
              icon={<CheckIcon size={20} />}
              onPress={() => setOpen(false)}
            >
              Apply
            </SelectionMode.Action>
          </SelectionMode.Bar>
        </SelectionMode.Sheet>
      </SelectionMode>
    </View>
  );
}

function SelectionModeAlwaysOnDemo() {
  const [selected, setSelected] = useState<string[]>(['m2']);

  return (
    <View style={{ height: 300 }} className="w-full overflow-hidden rounded-xl border border-border">
      <SelectionMode
        defaultActive
        max={3}
        values={SELECTION_MESSAGES.map((message) => message.id)}
        selected={selected}
        onSelectedChange={setSelected}
      >
        <SelectionMode.Header title="Attach" />
        <ScrollView contentContainerClassName="py-2">
          {SELECTION_MESSAGES.map((message) => (
            <SelectionMode.Item key={message.id} value={message.id}>
              <Item>
                <Item.Content>
                  <Item.Title>{message.name}</Item.Title>
                </Item.Content>
              </Item>
            </SelectionMode.Item>
          ))}
        </ScrollView>
      </SelectionMode>
    </View>
  );
}

/**
 * The seal: a full turn at the default speed.
 *
 * The separator between the two halves of the phrase is doing real work — a
 * ring with no break in it reads as one continuous word, because the place a
 * sentence ends is the one thing a circle cannot show.
 */
function CircularTextSealVersion() {
  return (
    <View className="flex-1 items-center justify-center">
      <View className="items-center justify-center">
        <CircularText radius={110} textClassName="text-base font-bold tracking-[0.2em]">
          PANELUI · COMPONENTS FOR REACT NATIVE ·
        </CircularText>
        {/* Stacked, not nested: the ring leaves its centre empty and turns,
            and a mark passed inside it would turn with it. */}
        <Text size="3xl" weight="bold" className="absolute">
          P
        </Text>
      </View>
    </View>
  );
}

/** Two rings turning against each other, which is what `reverse` is for. */
function CircularTextRingsVersion() {
  return (
    <View className="flex-1 items-center justify-center">
      <View className="items-center justify-center">
        <CircularText radius={130} textClassName="text-base font-bold tracking-[0.25em]">
          OUTER RING · OUTER RING · OUTER RING ·
        </CircularText>
        <View className="absolute">
          <CircularText
            reverse
            radius={86}
            spinDuration={14000}
            textClassName="text-sm font-medium tracking-widest"
          >
            INNER · INNER · INNER ·
          </CircularText>
        </View>
      </View>
    </View>
  );
}

/**
 * Less than a full turn.
 *
 * An arc has two ends, and the text reaches both of them rather than stopping
 * short of the second — which is the one thing that separates an arc from a
 * ring that happens to be missing some of its characters.
 */
function CircularTextArcVersion() {
  return (
    <View className="flex-1 items-center justify-center gap-10">
      <CircularText
        radius={100}
        spread={200}
        startAngle={-100}
        textClassName="text-lg font-semibold tracking-wider"
      >
        ARRIVING SHORTLY
      </CircularText>
    </View>
  );
}

/**
 * The ring at badge size.
 *
 * Small enough to sit beside something rather than be the thing you are
 * looking at, which is most of what a ring of text is actually for — a count
 * with its own label wrapped round it, on a card or a header.
 */
function CircularTextBadgeVersion() {
  return (
    <View className="flex-1 items-center justify-center">
      <View className="items-center justify-center">
        <CircularText radius={62} spinDuration={16000} textClassName="text-[10px] font-bold tracking-[0.18em]">
          NEW THIS WEEK ·
        </CircularText>
        <Text size="2xl" weight="bold" className="absolute">
          12
        </Text>
      </View>
    </View>
  );
}

/**
 * A ring around a spinner.
 *
 * The two motions are deliberately different speeds. Matched, they read as one
 * object that failed to line up; a slow ring around a quick spinner reads as
 * what it is — a label on something that is working.
 */
function CircularTextLoadingVersion() {
  return (
    <View className="flex-1 items-center justify-center">
      <View className="items-center justify-center">
        <CircularText radius={78} spinDuration={9000} textClassName="text-xs font-semibold tracking-[0.3em]">
          GENERATING · GENERATING ·
        </CircularText>
        <View className="absolute">
          <Spinner size="lg" label="Generating" />
        </View>
      </View>
    </View>
  );
}

/** Held where it is, and carrying on from there. */
function CircularTextPausedDemo() {
  const [paused, setPaused] = useState(false);

  return (
    <View className="w-full items-center gap-4">
      <CircularText paused={paused} radius={82} textClassName="text-sm font-semibold tracking-widest">
        HOLD TO STOP · HOLD TO STOP ·
      </CircularText>
      <Button variant="outline" onPress={() => setPaused((value) => !value)}>
        {paused ? 'Resume' : 'Pause'}
      </Button>
    </View>
  );
}


/**
 * The card that made this component worth building.
 *
 * The number, the holder and the expiry are on the front and the stripe and
 * the code are on the back, because that is where they are on the object —
 * which is the whole test for whether something should be a flip card at all.
 *
 * Placeholder digits, and visibly so: 4242 is the test number every payment
 * processor documents, and nobody has to wonder whether a real card went into
 * a demo.
 */
function FlipCardBankDemo() {
  /*
   * The mark is tinted rather than swapped, because the face it sits on is
   * `bg-primary` in every theme and the token that reads against that is
   * `--color-primary-foreground` — the same one the text on this face uses.
   * Picking a light or a dark file by theme would be answering a different
   * question, and would get the named themes wrong.
   */
  const tint = useCSSVariable('--color-primary-foreground');

  return (
    <FlipCard className="h-[200px] w-full">
      <FlipCard.Front className="h-full justify-between rounded-2xl bg-primary p-5">
        <View className="flex-row items-center justify-between">
          <Text size="sm" weight="medium" className="text-primary-foreground">
            PanelUI Bank
          </Text>
          <Image
            source={require('../../../assets/logo-dark.png')}
            style={{
              width: 26,
              height: 26,
              tintColor: typeof tint === 'string' ? tint : undefined,
            }}
            resizeMode="contain"
            accessibilityLabel="PanelUI"
          />
        </View>
        <Text size="xl" className="tracking-[3px] text-primary-foreground">
          4242 4242 4242 4242
        </Text>
        <View className="flex-row justify-between">
          <Text size="sm" className="text-primary-foreground/80">
            K. ABDI
          </Text>
          <Text size="sm" className="text-primary-foreground/80">
            09/29
          </Text>
        </View>
      </FlipCard.Front>
      <FlipCard.Back className="h-full justify-start rounded-2xl bg-surface-secondary py-5">
        <View className="h-10 w-full bg-foreground/80" />
        <View className="mt-5 flex-row items-center justify-end gap-3 px-5">
          <Text size="sm" muted>
            CVC
          </Text>
          <View className="rounded-md bg-background px-3 py-1">
            <Text className="font-mono">829</Text>
          </View>
        </View>
      </FlipCard.Back>
    </FlipCard>
  );
}

/**
 * Top over bottom, for a card that sits in a column of others.
 *
 * The two faces are not styled alike. Identical faces make the turn ambiguous —
 * a reader cannot tell the card moved from the value merely changing — and one
 * surface carrying the colour answers that without a caption.
 */
function FlipCardVerticalDemo() {
  return (
    <FlipCard direction="vertical" className="h-[140px] w-full">
      <FlipCard.Front className="h-full items-center justify-center gap-0.5 rounded-2xl border border-border bg-card">
        <Text size="3xl" weight="bold">
          37°
        </Text>
        <Text size="sm" muted>
          Celsius
        </Text>
      </FlipCard.Front>
      <FlipCard.Back className="h-full items-center justify-center gap-0.5 rounded-2xl bg-primary">
        <Text size="3xl" weight="bold" className="text-primary-foreground">
          99°
        </Text>
        <Text size="sm" className="text-primary-foreground/70">
          Fahrenheit
        </Text>
      </FlipCard.Back>
    </FlipCard>
  );
}

/** The card turned from a control that is not the card. */
function FlipCardControlledDemo() {
  const [flipped, setFlipped] = useState(false);

  return (
    <View className="w-full gap-3">
      <FlipCard flipped={flipped} trigger="none" className="h-[140px] w-full">
        <FlipCard.Front className="h-full items-center justify-center gap-1.5 rounded-2xl border border-border bg-card px-6">
          <Text size="xs" weight="medium" muted>
            QUESTION
          </Text>
          <Text size="lg" weight="medium">
            Which ocean is the deepest?
          </Text>
        </FlipCard.Front>
        <FlipCard.Back className="h-full items-center justify-center gap-1.5 rounded-2xl bg-primary px-6">
          <Text size="xs" weight="medium" className="text-primary-foreground/60">
            ANSWER
          </Text>
          <Text size="lg" weight="medium" className="text-primary-foreground">
            The Pacific
          </Text>
        </FlipCard.Back>
      </FlipCard>
      <Button variant="outline" onPress={() => setFlipped((on) => !on)}>
        {flipped ? 'Back to the question' : 'Show the answer'}
      </Button>
    </View>
  );
}

/** Turned with the finger, and settled on whichever face is nearer. */
function FlipCardDragDemo() {
  const muted = useTint('--color-muted-foreground');
  const onPrimary = useTint('--color-primary-foreground');

  return (
    <FlipCard trigger="drag" className="h-[140px] w-full">
      <FlipCard.Front className="h-full items-center justify-center gap-2 rounded-2xl border border-border bg-card">
        <HugeiconsIcon icon={RefreshIcon} size={20} color={muted} />
        <Text size="sm" muted>
          Drag across it
        </Text>
      </FlipCard.Front>
      <FlipCard.Back className="h-full items-center justify-center gap-2 rounded-2xl bg-primary">
        <CheckIcon size={20} color={onPrimary} />
        <Text size="sm" className="text-primary-foreground/80">
          Let go and it settles
        </Text>
      </FlipCard.Back>
    </FlipCard>
  );
}

/*
 * The glyphs in the versions below come from a package that takes a colour
 * rather than a class, so their tokens have to be resolved rather than named.
 * `useCSSVariable` subscribes to the theme, so this re-runs on a switch — which
 * a value read once at module scope would not.
 */
function useTint(name: string): string | undefined {
  const value = useCSSVariable(name);
  return typeof value === 'string' ? value : undefined;
}

const HOTEL_ROOMS = [
  { name: 'Harbour double', sleeps: 'Sleeps 2 · sea view', price: '$180' },
  { name: 'Courtyard twin', sleeps: 'Sleeps 2 · quiet side', price: '$165' },
  { name: 'Loft suite', sleeps: 'Sleeps 4 · terrace', price: '$260' },
];

const HOTEL_AMENITIES = [
  { label: 'Wi-Fi', icon: Wifi01Icon },
  { label: 'Breakfast', icon: Coffee01Icon },
  { label: 'Late check-out', icon: BedDoubleIcon },
];

const PRODUCT_SIZES = [
  { label: 'S', soldOut: false },
  { label: 'M', soldOut: false },
  { label: 'L', soldOut: true },
  { label: 'XL', soldOut: false },
];

/* The swatches are the garment's real colours, which is the one thing a
   photograph of a plain tee would have said that its name does not. */
const PRODUCT_COLOURS = [
  { name: 'Bone', swatch: '#E7E1D5' },
  { name: 'Slate', swatch: '#5A6470' },
  { name: 'Moss', swatch: '#6B7355' },
];

const TICKET_FIELDS = [
  { label: 'GATE', value: 'C' },
  { label: 'ROW', value: '14' },
  { label: 'SEAT', value: '22' },
];

const PROFILE_STATS = [
  { value: '12 yrs', label: 'Experience' },
  { value: 'Lisbon', label: 'UTC+1' },
  { value: '4', label: 'Reports' },
];

const PROFILE_SKILLS = ['Build systems', 'Gradle', 'Xcode', 'CI', 'Release'];

const PROFILE_CONTACTS = [
  { icon: Mail01Icon, value: 'rosa@example.com' },
  { icon: Call02Icon, value: '+351 21 555 0134' },
];

/**
 * A hint drawn on the card itself.
 *
 * A flip card that looks like an ordinary card is a card nobody turns over, and
 * the whole of the back is hidden behind knowing it is there. Every version
 * below carries one, in the corner the eye reaches last.
 */
function TurnHint({
  label = 'Tap to turn',
  onPrimary = false,
}: {
  label?: string;
  /** Set on a `bg-primary` face, where the muted token has no contrast left. */
  onPrimary?: boolean;
}) {
  const mutedTint = useTint('--color-muted-foreground');
  const primaryTint = useTint('--color-primary-foreground');

  return (
    <View className="flex-row items-center gap-1.5">
      <HugeiconsIcon
        icon={RefreshIcon}
        size={13}
        color={onPrimary ? primaryTint : mutedTint}
      />
      <Text size="xs" muted={!onPrimary} className={cn(onPrimary && 'text-primary-foreground/70')}>
        {label}
      </Text>
    </View>
  );
}

/**
 * A room, and what it costs.
 *
 * The front is the decision — where it is, how it is rated, what it starts at.
 * The back is the detail somebody wants only once they are interested. Nothing
 * on the front is repeated on the back and nothing on the back has to be
 * compared with the front, which is the test for whether a flip card is the
 * right shape at all.
 *
 * There is no photograph, and no grey rectangle standing in for one either: a
 * placeholder with an icon in the middle of it reads as an image that failed to
 * load. The band carries the name instead, which is what a photograph would
 * have had text over anyway.
 */
function FlipCardHotelVersion() {
  const muted = useTint('--color-muted-foreground');
  const onPrimary = useTint('--color-primary-foreground');

  return (
    <View className="flex-1 justify-center px-5">
      <FlipCard className="h-[340px] w-full">
        <FlipCard.Front className="h-full">
          {/* One field of colour, not a coloured band over a white body. The
              split reads as two cards glued together at this size, and the
              hierarchy it was drawing is available from one foreground token
              at four opacities. */}
          <Card className="h-full justify-between overflow-hidden bg-primary p-5">
            <View className="gap-4">
              <View className="flex-row items-start justify-between">
                {/* The `subtle` ramps are a tint of the accent computed for a
                    light surface — 8% green over #262626 is black, and the
                    matching label is #047857. On a dark face the badge has to
                    go solid: `bg-success` and its solid foreground are the same
                    pair in every theme. */}
                <Badge
                  variant="success"
                  className="bg-success"
                  labelClassName="text-success-solid-foreground"
                >
                  9.1 · Excellent
                </Badge>
              </View>
              <View className="gap-1">
                <Text size="2xl" weight="semibold" className="text-primary-foreground">
                  The Wharf House
                </Text>
                <View className="flex-row items-center gap-1.5">
                  <HugeiconsIcon icon={Location01Icon} size={13} color={onPrimary} />
                  <Text size="sm" className="text-primary-foreground/80">
                    Old Town · 400m from the harbour
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                <Rating value={4.5} readOnly size="sm" />
                <Text size="xs" className="text-primary-foreground/60">
                  128 reviews
                </Text>
              </View>
            </View>

            {/* The rule anchors the footer, so the space above it reads as
                deliberate rather than as a card that ran out of content. */}
            <View className="gap-3">
              <View className="border-t border-primary-foreground/15" />
              <Text size="sm" className="text-primary-foreground/70">
                Free cancellation until 24 hours before
              </Text>
              <View className="flex-row items-end justify-between">
                <View className="flex-row items-baseline gap-1.5">
                  <Text size="2xl" weight="semibold" className="text-primary-foreground">
                    $180
                  </Text>
                  <Text size="sm" className="text-primary-foreground/60">
                    a night
                  </Text>
                </View>
                <TurnHint label="Rooms" onPrimary />
              </View>
            </View>
          </Card>
        </FlipCard.Front>

        <FlipCard.Back className="h-full">
          <Card className="h-full justify-between p-5">
            <Text size="lg" weight="semibold">
              Rooms
            </Text>

            <View>
              {HOTEL_ROOMS.map((room, index) => (
                <View
                  key={room.name}
                  className={cn(
                    'flex-row items-center justify-between gap-3 py-3',
                    index > 0 && 'border-t border-border'
                  )}
                >
                  <View className="shrink gap-0.5">
                    <Text size="sm" weight="medium">
                      {room.name}
                    </Text>
                    <Text size="xs" muted>
                      {room.sleeps}
                    </Text>
                  </View>
                  <Text size="sm" weight="semibold">
                    {room.price}
                  </Text>
                </View>
              ))}
            </View>

            <View className="gap-3">
              <View className="flex-row flex-wrap gap-2">
                {HOTEL_AMENITIES.map((amenity) => (
                  <Chip
                    key={amenity.label}
                    size="sm"
                    start={<HugeiconsIcon icon={amenity.icon} size={13} color={muted} />}
                  >
                    {amenity.label}
                  </Chip>
                ))}
              </View>
              <Button fullWidth onPress={() => {}}>
                Book from $180
              </Button>
            </View>
          </Card>
        </FlipCard.Back>
      </FlipCard>
    </View>
  );
}

/**
 * The thing, and its particulars.
 *
 * A shop's grid has room for a name and a price; the fabric, the sizes left and
 * the delivery are what decide the sale, and they are normally a page away.
 *
 * The band at the top is the garment's colours rather than a picture of it —
 * real information, and the one thing a photograph of a plain tee would have
 * told you that the name does not.
 *
 * `direction="vertical"` because a card in a grid has neighbours either side of
 * it: a horizontal turn sweeps its near edge out over them, and a vertical one
 * stays inside its own column.
 */
function FlipCardProductVersion() {
  return (
    <View className="flex-1 justify-center px-5">
      <FlipCard direction="vertical" className="h-[340px] w-full">
        <FlipCard.Front className="h-full">
          {/* The colours are a line of names, not three floating circles. The
              swatches read as a control you cannot press, and a shop grid does
              not decide anything with them — the name, the price and how many
              are left are what it has room for. */}
          <Card className="h-full justify-between overflow-hidden bg-primary p-5">
            <View className="flex-row items-start justify-between gap-3">
              <View className="shrink gap-1">
                <Text size="xs" weight="medium" className="text-primary-foreground/60">
                  {PRODUCT_COLOURS.map((colour) => colour.name).join(' · ')}
                </Text>
                <Text size="2xl" weight="semibold" className="text-primary-foreground">
                  Heavyweight Tee
                </Text>
                <Text size="sm" className="text-primary-foreground/70">
                  Organic cotton, boxy fit
                </Text>
              </View>
              <Badge
                variant="warning"
                className="bg-warning"
                labelClassName="text-warning-solid-foreground"
              >
                3 left
              </Badge>
            </View>

            <View className="gap-3">
              <View className="border-t border-primary-foreground/15" />
              <Text size="sm" className="text-primary-foreground/70">
                Ships in two days
              </Text>
              <View className="flex-row items-end justify-between">
                <Text size="2xl" weight="semibold" className="text-primary-foreground">
                  $48
                </Text>
                <TurnHint label="Sizes" onPrimary />
              </View>
            </View>
          </Card>
        </FlipCard.Front>

        <FlipCard.Back className="h-full">
          <Card className="h-full justify-between p-5">
            <View className="gap-1">
              <Text size="lg" weight="semibold">
                Heavyweight Tee
              </Text>
              <Text size="sm" muted>
                280gsm combed cotton, pre-shrunk, with a ribbed collar that keeps its
                shape.
              </Text>
            </View>

            <View className="gap-2">
              <Text size="xs" weight="medium" muted>
                SIZE
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {PRODUCT_SIZES.map((size) => (
                  <Chip key={size.label} size="sm" disabled={size.soldOut}>
                    {size.soldOut ? `${size.label} — sold out` : size.label}
                  </Chip>
                ))}
              </View>
            </View>

            <View className="gap-3">
              <View className="flex-row items-center justify-between border-t border-border pt-3">
                <Text size="sm" muted>
                  Delivery
                </Text>
                <Text size="sm" weight="medium">
                  Two days, free
                </Text>
              </View>
              <Button fullWidth onPress={() => {}}>
                Add to bag · $48
              </Button>
            </View>
          </Card>
        </FlipCard.Back>
      </FlipCard>
    </View>
  );
}

/**
 * The strongest case after a bank card: the code really is on the back.
 *
 * A ticket is read by a person on the front and by a scanner on the back, and
 * the two are never needed at once. Turning it over is what somebody does at
 * the door anyway.
 *
 * The dashed rule is where a paper ticket tears. It is doing real work here —
 * it separates what you read walking in from what you read looking for your
 * seat, and it is the line that says "ticket" before any of the words do.
 */
function FlipCardTicketVersion() {
  const onPrimary = useTint('--color-primary-foreground');

  return (
    <View className="flex-1 justify-center px-5">
      <FlipCard className="h-[320px] w-full">
        <FlipCard.Front className="h-full justify-between rounded-2xl bg-primary p-6">
          <View className="flex-row items-start justify-between gap-3">
            <View className="shrink gap-1">
              <Text size="xs" weight="medium" className="text-primary-foreground/70">
                SAT 14 SEPTEMBER · 20:00
              </Text>
              <Text size="2xl" weight="semibold" className="text-primary-foreground">
                Night Signal
              </Text>
              <Text size="sm" className="text-primary-foreground/80">
                The Foundry, Manchester
              </Text>
            </View>
            <HugeiconsIcon icon={Ticket01Icon} size={24} color={onPrimary} />
          </View>

          <View className="gap-5">
            <View className="border-t border-dashed border-primary-foreground/30" />
            <View className="flex-row justify-between">
              {TICKET_FIELDS.map((field) => (
                <View key={field.label} className="gap-1">
                  <Text size="xs" className="text-primary-foreground/60">
                    {field.label}
                  </Text>
                  <Text size="xl" weight="semibold" className="text-primary-foreground">
                    {field.value}
                  </Text>
                </View>
              ))}
            </View>
            <View className="flex-row items-center gap-1.5">
              <HugeiconsIcon icon={RefreshIcon} size={13} color={onPrimary} />
              <Text size="xs" className="text-primary-foreground/70">
                Tap for the code
              </Text>
            </View>
          </View>
        </FlipCard.Front>

        <FlipCard.Back className="h-full items-center justify-between rounded-2xl border border-border bg-card p-6">
          <Text size="xs" weight="medium" muted>
            NIGHT SIGNAL · GATE C
          </Text>
          {/* The canvas on its own: a frame, a title and a caption around it
              would be a second card inside the one already being turned. */}
          <QRCode value="https://panelui.dev/t/NS-8842-14C" size="md">
            <QRCode.Canvas />
          </QRCode>
          <View className="items-center gap-1">
            <Text size="sm" weight="medium" className="font-mono">
              NS-8842-14C
            </Text>
            <Text size="xs" muted>
              Show this at the door
            </Text>
          </View>
        </FlipCard.Back>
      </FlipCard>
    </View>
  );
}

/**
 * A face, and the person behind it.
 *
 * A directory is a grid of names, and everything worth knowing about somebody
 * is on the page you have to leave the grid for. The card carries it instead,
 * and the grid keeps its shape.
 *
 * Left-aligned rather than centred. A centred avatar over a centred name in a
 * box this size is a memorial plaque; ranged left with the detail under it, it
 * is a directory entry.
 */
function FlipCardProfileVersion() {
  const muted = useTint('--color-muted-foreground');

  return (
    <View className="flex-1 justify-center px-5">
      <FlipCard className="h-[320px] w-full">
        <FlipCard.Front className="h-full">
          {/* A white card with grey type on it is a directory entry with the
              directory taken away. The face carries the colour and the back
              carries the detail, which is also the turn this card is for. */}
          <Card className="h-full justify-between bg-primary p-6">
            <View className="gap-4">
              <Avatar size="lg" fallback="RM" className="border-primary-foreground/20" />
              <View className="gap-2">
                <View className="gap-1">
                  <Text size="2xl" weight="semibold" className="text-primary-foreground">
                    Rosa Marín
                  </Text>
                  <Text size="sm" className="text-primary-foreground/70">
                    Staff Engineer · Platform
                  </Text>
                </View>
                <Badge
                  variant="success"
                  className="bg-success"
                  labelClassName="text-success-solid-foreground"
                >
                  Available
                </Badge>
              </View>
            </View>

            <View className="gap-4">
              <View className="flex-row">
                {PROFILE_STATS.map((stat, index) => (
                  <View
                    key={stat.label}
                    className={cn(
                      'flex-1 gap-0.5',
                      index > 0 && 'border-l border-primary-foreground/20 pl-4'
                    )}
                  >
                    <Text size="lg" weight="semibold" className="text-primary-foreground">
                      {stat.value}
                    </Text>
                    <Text size="xs" className="text-primary-foreground/60">
                      {stat.label}
                    </Text>
                  </View>
                ))}
              </View>
              <TurnHint onPrimary />
            </View>
          </Card>
        </FlipCard.Front>

        <FlipCard.Back className="h-full">
          <Card className="h-full justify-between p-6">
            <View className="gap-2">
              <Text size="lg" weight="semibold">
                Rosa Marín
              </Text>
              <Text size="sm" muted>
                Twelve years on build tooling. Currently pulling the mobile release
                pipeline apart so it can be put back together in under ten minutes.
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {PROFILE_SKILLS.map((skill) => (
                <Chip key={skill} size="sm">
                  {skill}
                </Chip>
              ))}
            </View>

            <View className="gap-3">
              {PROFILE_CONTACTS.map((contact) => (
                <View key={contact.value} className="flex-row items-center gap-2.5">
                  <HugeiconsIcon icon={contact.icon} size={15} color={muted} />
                  <Text size="sm">{contact.value}</Text>
                </View>
              ))}
            </View>
          </Card>
        </FlipCard.Back>
      </FlipCard>
    </View>
  );
}

export const ENTRIES: ComponentEntry[] = [
{
    slug: 'radio-group',
    name: 'RadioGroup',
    summary: 'Single-select list of options',
    demos: [
      { label: 'Plans', render: () => <RadioGroupDemo /> },
      { label: 'Horizontal', render: () => <RadioGroupRowDemo /> },
      { label: 'Cards', render: () => <RadioGroupCardDemo /> },
      { label: 'Styled labels', render: () => <RadioGroupStyledDemo /> },
      { label: 'Colouring the selected label', render: () => <RadioGroupSelectedLabelDemo /> },
      {
        label: 'In a card',
        render: () => (
          <Card className="w-full">
            <Card.Header>
              <Card.Title>Delivery speed</Card.Title>
              <Card.Description>Choose how fast you need it.</Card.Description>
            </Card.Header>
            <Card.Content>
              <RadioGroupDemo />
            </Card.Content>
          </Card>
        ),
      },
    ],
  },
{
    slug: 'rating',
    name: 'Rating',
    summary: 'A row of stars to read or set a score',
    demos: [
      { label: 'Interactive', render: () => <RatingDemo /> },
      { label: 'Haptics', render: () => <RatingHapticsDemo /> },
      {
        label: 'Half stars',
        render: () => (
          <View className="w-full gap-5">
            <Rating precision={0.5} defaultValue={3.5} />
            <Rating precision={0.5} defaultValue={2.5} color="primary" />
          </View>
        ),
      },
      {
        label: 'Colors',
        render: () => (
          <View className="w-full gap-4">
            <Rating defaultValue={4} color="warning" />
            <Rating defaultValue={4} color="success" />
            <Rating defaultValue={4} color="destructive" />
            <Rating defaultValue={4} color="info" />
            <Rating defaultValue={4} color="foreground" />
          </View>
        ),
      },
      {
        label: 'Sizes',
        render: () => (
          <View className="w-full gap-4">
            <Rating defaultValue={3} size="sm" />
            <Rating defaultValue={3} size="md" />
            <Rating defaultValue={3} size="lg" />
          </View>
        ),
      },
      {
        label: 'Read-only & disabled',
        render: () => (
          <View className="w-full gap-4">
            <Rating value={4.3} precision={0.5} readOnly />
            <Rating max={10} defaultValue={7} size="sm" />
            <Rating defaultValue={3} disabled />
          </View>
        ),
      },
    ],
  },
{
    slug: 'section-rail',
    name: 'SectionRail',
    summary: 'Floating section navigator for a long screen',
    demos: [
      {
        label: 'Bottom right',
        id: 'bottom-right',
        fullPage: true,
        description:
          'Out of the corner, clear of the text, with the panel opening upward. Haptics on.',
        render: () => <SectionRailVersion align="bottom" haptics />,
      },
      {
        label: 'Bottom left',
        id: 'bottom-left',
        fullPage: true,
        description: 'The same corner treatment against the other edge.',
        render: () => <SectionRailVersion placement="left" align="bottom" haptics />,
      },
      {
        label: 'Pager',
        id: 'pager',
        fullPage: true,
        description:
          'One section per screen. Swipe up and the rail in the bottom-left tracks the page.',
        render: () => <SectionRailPagerVersion />,
      },
      {
        label: 'Centred on the edge',
        id: 'side',
        fullPage: true,
        description:
          'The original placement — halfway down the right edge, over the content it indexes.',
        render: () => <SectionRailVersion />,
      },
    ],
  },
{
    slug: 'selection-mode',
    name: 'SelectionMode',
    summary: 'Pick several rows out of a list, with a count and a bar of actions',
    demos: [
      { label: 'Long press to start', render: () => <SelectionModeDemo /> },
      { label: 'In a sheet — people', render: () => <SelectionModeSheetPeopleDemo /> },
      { label: 'In a sheet — colours', render: () => <SelectionModeSheetColorsDemo /> },
      { label: 'Always selecting, capped at three', render: () => <SelectionModeAlwaysOnDemo /> },
    ],
  },
{
    slug: 'select',
    name: 'Select',
    summary: 'Picker shown in a sheet, in place, or floating over the page',
    demos: [
      { label: 'Sheet (default)', render: () => <SelectDemo /> },
      { label: 'Sheet — a long list', render: () => <LongSelectDemo /> },
      {
        label: 'Inline — the row grows',
        render: () => (
          <View className="w-full gap-4">
            <RegionSelectDemo presentation="inline" />
            <Text size="sm" muted>
              The list expands in layout flow, so this paragraph is pushed down
              by its height. Right inside a settings list, where that reads as
              the row growing.
            </Text>
          </View>
        ),
      },
      {
        label: 'Overlay — nothing below moves',
        render: () => (
          <View className="w-full gap-4">
            <RegionSelectDemo presentation="overlay" />
            <Text size="sm" muted>
              This paragraph stays exactly where it is when the list above
              opens. With `inline` it would be pushed down by the height of the
              list.
            </Text>
            <Button variant="outline" fullWidth>
              And so does this button
            </Button>
          </View>
        ),
      },
      {
        label: 'Overlay width',
        render: () => (
          <View className="w-full gap-4">
            <RegionSelectDemo presentation="overlay" contentWidth="content" />
            <RegionSelectDemo presentation="overlay" contentWidth={220} />
          </View>
        ),
      },
      {
        label: 'In a form',
        render: () => (
          <Card className="w-full">
            <Card.Content className="gap-4 p-4">
              <Input label="Full name" placeholder="Khalid Abdi" />
              <SelectDemo />
              <RegionSelectDemo presentation="overlay" />
            </Card.Content>
          </Card>
        ),
      },
      {
        label: 'Searchable',
        render: () => (
          <View className="w-full gap-4">
            <SearchableSelectDemo />
            <Text size="sm" muted>
              Twenty cities. The filter matches any part of a label, so “lo”
              finds both London and Los Angeles.
            </Text>
          </View>
        ),
      },
      {
        label: 'Searchable — overlay',
        render: () => <SearchableSelectDemo presentation="overlay" />,
      },
      {
        label: 'Grouped options',
        render: () => (
          <View className="w-full gap-4">
            <GroupedSelectDemo />
            <Text size="sm" muted>
              Filter for “lo” and Asia disappears with its heading — a heading
              over no options reads as a section that failed to load.
            </Text>
          </View>
        ),
      },
      { label: 'Disabled option', render: () => <DisabledOptionSelectDemo /> },
      { label: 'Native — menu', render: () => <NativeSelectDemo /> },
      { label: 'Native — wheel', render: () => <NativeWheelPickerDemo /> },
    ],
  },
{
    slug: 'surface',
    name: 'Surface',
    summary: 'Elevated container with a variant ladder',
    demos: [
      {
        label: 'Nested hierarchy',
        render: () => (
          <Surface className="w-full">
            <Text weight="medium">Account</Text>
            <Surface variant="secondary" className="mt-3">
              <Text size="sm" muted>
                Signed in as khalid@example.com
              </Text>
              <Surface variant="tertiary" className="mt-3">
                <Text size="xs" muted>
                  Session expires in 12 days
                </Text>
              </Surface>
            </Surface>
          </Surface>
        ),
      },
      {
        label: 'Variants',
        render: () => (
          <View className="w-full gap-3">
            {(['default', 'secondary', 'tertiary', 'transparent'] as const).map(
              (variant) => (
                <Surface key={variant} variant={variant}>
                  <Text size="sm">{variant}</Text>
                </Surface>
              )
            )}
          </View>
        ),
      },
      {
        label: 'Bordered and elevated',
        render: () => (
          <View className="w-full gap-3">
            {/* A hairline for a surface the same colour as the page. */}
            <Surface bordered>
              <Text size="sm">bordered — reads against a same-colour page</Text>
            </Surface>
            {/* A soft shadow lifts it off the page. */}
            <Surface elevated>
              <Text size="sm">elevated — a soft shadow</Text>
            </Surface>
            <Surface bordered elevated>
              <Text size="sm">both</Text>
            </Surface>
          </View>
        ),
      },
      {
        label: 'Padding scale',
        render: () => (
          <View className="w-full gap-3">
            {(['none', 'sm', 'default', 'lg'] as const).map((padding) => (
              <Surface key={padding} variant="secondary" padding={padding} bordered>
                <View className="rounded-lg bg-primary/10 px-2 py-1">
                  <Text size="xs" muted>
                    padding={padding}
                  </Text>
                </View>
              </Surface>
            ))}
          </View>
        ),
      },
      {
        label: 'As a stat card',
        render: () => (
          <View className="w-full flex-row gap-3">
            {[
              { label: 'Revenue', value: '$24.8k' },
              { label: 'Active', value: '1,204' },
            ].map((stat) => (
              <Surface key={stat.label} bordered padding="lg" className="flex-1">
                <Text size="xs" muted className="uppercase tracking-wider">
                  {stat.label}
                </Text>
                <Text size="xl" weight="semibold" className="mt-1">
                  {stat.value}
                </Text>
              </Surface>
            ))}
          </View>
        ),
      },
    ],
  },
{
    slug: 'shimmer',
    name: 'Shimmer',
    summary: 'Animated highlight sweeping across content',
    demos: [
      {
        label: 'Thinking text',
        render: () => (
          <View className="w-full gap-4">
            <Shimmer>Generating response…</Shimmer>
            <Shimmer duration={1400} textClassName="text-lg font-medium">
              Thinking…
            </Shimmer>
            <Shimmer duration={2400} textClassName="text-2xl font-semibold">
              Searching the web
            </Shimmer>
          </View>
        ),
      },
      {
        label: 'Modes',
        render: () => (
          <View className="w-full gap-4">
            <Shimmer mode="ping-pong" duration={1600}>
              Ping-pong sweep
            </Shimmer>
            <Shimmer reverse>Right to left</Shimmer>
            <Shimmer spread={4} duration={2600}>
              A wider, slower band
            </Shimmer>
            <Shimmer enabled={false}>Disabled — renders statically</Shimmer>
          </View>
        ),
      },
      {
        label: 'Custom colours',
        render: () => (
          <View className="w-full gap-4">
            <Shimmer baseColor="#3f3f46" shimmerColor="#fafafa">
              Neutral on dark
            </Shimmer>
            <Shimmer
              baseColor="#1e3a8a"
              shimmerColor="#93c5fd"
              textClassName="text-lg font-semibold"
            >
              Tinted blue
            </Shimmer>
          </View>
        ),
      },
      {
        label: 'Masking a subtree',
        render: () => (
          <Shimmer as="view" className="w-full rounded-xl">
            <View className="gap-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </View>
          </Shimmer>
        ),
      },
    ],
  },
{
    slug: 'text-animation',
    name: 'TextAnimation',
    summary: 'Five ways a piece of text or a number arrives',
    demos: [
      { label: 'Typing', render: () => <TypingDemo /> },
      { label: 'Typing a cycle', render: () => <TypingCycleDemo /> },
      { label: 'Rotating', render: () => <RotatingDemo /> },
      { label: 'Counting', render: () => <CountingDemo /> },
      { label: 'Sliding', render: () => <SlidingDemo /> },
      { label: 'Sliding a price', render: () => <SlidingPriceDemo /> },
      { label: 'Scrolling', render: () => <ScrollingDemo /> },
      { label: 'Shared configuration', render: () => <TextAnimationGroupDemo /> },
    ],
  },

{
    slug: 'flip-card',
    name: 'FlipCard',
    summary: 'Two faces of one card, and a turn between them',
    demos: [
      {
        label: 'A hotel room',
        id: 'hotel',
        fullPage: true,
        description: 'The listing on the front, the rooms and their prices on the back.',
        render: () => <FlipCardHotelVersion />,
      },
      {
        label: 'A product',
        id: 'product',
        fullPage: true,
        description: 'What a shop grid has room for, and what it does not.',
        render: () => <FlipCardProductVersion />,
      },
      {
        label: 'An event ticket',
        id: 'ticket',
        fullPage: true,
        description: 'Read by a person on the front and by a scanner on the back.',
        render: () => <FlipCardTicketVersion />,
      },
      {
        label: 'A profile',
        id: 'profile',
        fullPage: true,
        description: 'A face in a directory, and the person behind it.',
        render: () => <FlipCardProfileVersion />,
      },
      { label: 'A bank card', render: () => <FlipCardBankDemo /> },
      { label: 'Turning it the other way', render: () => <FlipCardVerticalDemo /> },
      { label: 'Flipped from somewhere else', render: () => <FlipCardControlledDemo /> },
      { label: 'Turning it with a finger', render: () => <FlipCardDragDemo /> },
    ],
  },
{
    slug: 'circular-text',
    name: 'CircularText',
    summary: 'Text set around a circle, turning',
    demos: [
      {
        label: 'A seal',
        id: 'seal',
        fullPage: true,
        description: 'A full turn, with a mark stacked in the centre the ring leaves empty.',
        render: () => <CircularTextSealVersion />,
      },
      {
        label: 'Two rings',
        id: 'rings',
        fullPage: true,
        description: 'An outer ring and an inner one turning against each other.',
        render: () => <CircularTextRingsVersion />,
      },
      {
        label: 'An arc',
        id: 'arc',
        fullPage: true,
        description: 'Less than a full turn, starting where you put it.',
        render: () => <CircularTextArcVersion />,
      },
      {
        label: 'A badge',
        id: 'badge',
        fullPage: true,
        description: 'The ring at badge size, wrapped round a count.',
        render: () => <CircularTextBadgeVersion />,
      },
      {
        label: 'A loading ring',
        id: 'loading',
        fullPage: true,
        description: 'A slow ring of text around a spinner that is not slow.',
        render: () => <CircularTextLoadingVersion />,
      },
      { label: 'Holding it still', render: () => <CircularTextPausedDemo /> },
    ],
  }
];
export const ENTRIES_BY_SLUG = Object.fromEntries(ENTRIES.map((entry) => [entry.slug, entry]));
